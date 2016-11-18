"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var httpHelpers = require('@sage/syracuse-core').http;
var find = helpers.object.find;
var forEachKey = helpers.object.forEachKey;
var flows = require('streamline-runtime').flows;
var pluralize = helpers.string.pluralize;
var capitalize = helpers.string.capitalize;
var locale = require('streamline-locale');
var resourceProxy = require('@sage/syracuse-core').resource.proxy;
var globals = require('streamline-runtime').globals;
var factory = require("./factory");
var types = require('@sage/syracuse-core').types;
var sys = require("util");

var queryRepr = ["$query", "$lookup", "$search", "$select", "$bulk"]; // query like facets

function _getTranslatedString(stringResources, parts, combineParts) {
	if (!stringResources || !parts || !parts.length) return "";
	for (var i = 0; i < (combineParts ? parts.length : 1); i++) {
		var str = stringResources[parts.slice(i).join(".")];
		//console.log("resource for : "+parts.slice(i).join(".")+"="+str);
		if (str) return str;
	}
}

function _defineProperty(constr, writable, name, wrapProp, obsoleteMsg) {
	var desc = {
		enumerable: true
	};
	desc.get = function() {
		obsoleteMsg && console.error(obsoleteMsg + "\n" + _getStack());
		return this[wrapProp];
	};
	if (writable) desc.set = function(val) {
		obsoleteMsg && console.error(obsoleteMsg + "\n" + _getStack());
		this[wrapProp] = val;
	};
	constr.prototype[name] === undefined && Object.defineProperty(constr.prototype, name, desc);
}

function _copyConstraints(src, dst) {
	['$pattern', '$patternMessage', '$patternModifiers', '$minLength', '$maxLength', '$minimum', '$maximum', '$maximumCanEqual', '$minimumCanEqual', //
		'$isUnique', '$isNullable', '$isMandatory', '$isDefined', //
		'$isReadOnly', '$isDisabled', '$scale', '$precision'
	].forEach(function(key) {
		if ((src[key] !== undefined) && (src[key] !== "function")) dst[key] = src[key];
	});
}

function _copyIfStatic(src, dest, name) {
	if (src[name] && (typeof src[name] !== "function")) dest[name] = src[name];
}

function _normalizeCapabilities(prop, facetName, isChild) {
	var cap = (prop.$capabilities && prop.$capabilities.split(",")) || [];
	var i_add = cap.indexOf("insert");
	var i_app = cap.indexOf("append");
	var i_del = cap.indexOf("delete");
	var i_reo = cap.indexOf("reorder");
	var i_loc = cap.indexOf("localize");
	// ad standard caps only if the class caps is not defined
	if (prop.$capabilities == null) {
		if (!prop.$compute && (cap.indexOf("sort") < 0)) cap.push("sort");
		if (facetName === "$edit") {
			if (prop.$isArray || prop.isPlural) {
				// only allow insert if we can reorder, it's append only otherwise
				if (i_add < 0 && (cap.indexOf("reorder") >= 0)) cap.push("insert");
				if ((i_add < 0) && prop._$isChild) cap.push("append");
				if ((i_add < 0) && prop.$isArray) cap.push("append");
				if (i_del < 0) cap.push("delete");
			}
			// by default no reorder
			//			if(prop.isPlural)
			//				cap.push("reorder");
		}
		if (!isChild && !prop.$compute && (cap.indexOf("filter") < 0)) cap.push("filter");
		if (prop.$isLocalized) cap.push("localize");
	}
	if (facetName !== "$edit") {
		if (i_add >= 0) cap.splice(cap.indexOf("insert"), 1);
		if (i_app >= 0) cap.splice(cap.indexOf("append"), 1);
		if (i_del >= 0) cap.splice(cap.indexOf("delete"), 1);
		if (i_reo >= 0) cap.splice(cap.indexOf("reorder"), 1);
		// if (i_loc >= 0) cap.splice(cap.indexOf("localize"), 1);
	}
	return cap.join(",");
}

var _decoratePropertyProtoMap = {
	graph: function(_, $p, entity, prop) {
		$p.$url = "{$baseUrl}/{$pluralType}('{$key}')/$graphs/" + prop.name;
		$p.$linkCategories = [];
		$p.$nodeCategories = [];
		//
		var maps = prop.getGraphRelationsMaps(_);
		//
		flows.eachKey(_, maps.nodes, function(_, nodeName, node) {
			$p.$nodeCategories.push(node);
		});
		flows.eachKey(_, maps.links, function(_, linkName, link) {
			$p.$linkCategories.push(link);
		});
	},
	"tag-cloud": function(_, $p, entity, prop) {
		$p.$url = "{$baseUrl}/{$pluralType}('{$key}')/$tagClouds/" + prop.name;
		$p.$nodeCategories = [];
		// TODO
		$p.$nodeCategories.push({
			$title: "Categ test",
			$prototype: {
				$properties: {
					$value: "Test"
				}
			}
		});
	},
	filter: function(_, $p, entity, prop) {
		if (prop.$filterRepresentation && (typeof prop.$filterRepresentation !== "function")) {
			$p.$links = $p.$links || {};
			var l = $p.$links.$prototype = {
				$url: "{$baseUrl}/$prototypes('" + prop.$filterRepresentation + ".$query')",
				$isHidden: true
			};
		}
	}
};

function _getLink(facetName, title, params, entityName, representationName) {
	var link = {
		$type: "application/json;vnd.sage=syracuse"
	};
	if (title) link.$title = title;
	var plural = (entityName && pluralize(entityName)) || "{$pluralType}";
	var singular = representationName || entityName || "{$representation}";
	//
	switch (facetName) {
		case "$details":
			link.$url = "{$baseUrl}/" + plural + "('{$key}')?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
			break;
		case "$lookup":
		case "$select":
		case "$query":
			link.$url = "{$baseUrl}/" + plural + "?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
			break;
		case "$edit":
			link.$url = "{$baseUrl}/" + plural + "('{$key}')/$workingCopies?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
			link.$method = "POST";
			break;
		case "$create":
			// $create facet is in fact an $edit facet
			link.$url = "{$baseUrl}/" + plural + "/$template/$workingCopies?representation=" + singular + ".$edit&role={$role}" + (params ? "&" + params : "");
			link.$method = "POST";
			break;
	}
	return link;
}

function _fillProtoTemplates(result, e, stringRes) {
	result.$url = "{$baseUrl}/" + e.plural + "('{$key}')";
	result.$shortUrl = "{$baseUrl}/" + e.plural + "('{$key}')";
	result.$value = (e.$valueTemplate && (_getTranslatedString(stringRes, [e.name, "$valueTemplate"]) || e.$valueTemplate.expression)) || "{$key}";
	// $title conflicts with the property title for reference thumb.
	//			result.$title = (e.$titleTemplate && e.$titleTemplate.expression) || (e.title + " {$key}");
	result.$description = (e.$descriptionTemplate && (_getTranslatedString(stringRes, [e.name, "$descriptionTemplate"]) || e.$descriptionTemplate.expression)) || _getTranslatedString(stringRes, [e.name, "$title"]) || result.$title;
	// extract all fields in templates
	result.$key = e.$key || "{$uuid}";
	result.$properties = {};
	var allFields = {};

	function addField(elem) {
		elem = elem.substring(1, elem.length - 1);
		if (!allFields[elem] && e.$properties[elem]) allFields[elem] = e.$properties[elem];
	}
	if (e.$valueTemplate && e.$valueTemplate.matches) e.$valueTemplate.matches.forEach(addField);
	if (e.$valueTitleTemplate && e.$valueTitleTemplate.matches) e.$valueTitleTemplate.matches.forEach(addField);
	if (e.$descriptionTemplate && e.$descriptionTemplate.matches) e.$descriptionTemplate.matches.forEach(addField);
	//
	forEachKey(allFields, function(field, value) {
		result.$properties[field] = {
			$type: value.getMimeType()
		};
	});
}

function _fillThumb($thumb, e, rel, prefix, facetName, stringRes) {
	_fillProtoTemplates($thumb, e, stringRes);
	$thumb.$url += "?representation={$representation}.$thumb";
	$thumb.$prototype = "{$baseUrl}/$prototypes('{$representation}.$thumb')";
	$thumb.$representation = e.name;
	$thumb.$title = (e.$valueTitleTemplate && (_getTranslatedString(stringRes, [e.name, "$valueTitleTemplate"]) || e.$valueTitleTemplate.expression));
	if (rel.$isDisabled && (typeof rel.$isDisabled !== "function")) $thumb.$isDisabled = rel.$isDisabled;
	if (rel.$isReadOnly && (typeof rel.$isReadOnly !== "function")) $thumb.$isReadOnly = rel.$isReadOnly;
	$thumb.$links = {
		$details: _getLink("$details", null, "", rel.$isDynamicType ? null : e.name)
	};
	//
	//var lookupLinkName = ((rel && rel.isPlural && rel.relType !== "children") ? "$select" : "$lookup");
	if ((facetName === "$edit") || (queryRepr.indexOf(facetName) >= 0)) {
		var lookupLinkName = "$lookup";
		var relLookupParams = (rel.$lookup && (rel.$lookup.parameters || rel.$lookup.$parameters)) || (rel.$select && (rel.$select.parameters || rel.$select.$parameters));
		$thumb.$links[lookupLinkName] = _getLink(lookupLinkName, locale.format(module, "createTableActionTitle"), "trackingId={$trackingId}" + ((rel && rel.name) ? "&binding=" + prefix : "") + (relLookupParams ? "&" + relLookupParams : ""), e.name);
	}
}


function BaseProperty(entity, meta) {
	//	this._meta = meta;
	var self = this;
	self._entity = entity;
	//
	var prop = meta;
	prop.title = prop.title || prop.$title || prop.name;
	prop.$title = prop.$title || prop.title;
	//
	for (var ii in meta) {
		switch (ii) {
			case "isChild":
			case "$isChild":
				self._$isChild = meta.$isChild || meta.isChild;
				break;
			default:
				self[ii] = meta[ii];
		}
	}
};

var BasePropClass = helpers.defineClass(BaseProperty, null, {
	getPropertyPrototype: function(_, stringRes, facetName, isChild, childPrefix, visited, options) {
		var self = this;
		var entity = self._entity;
		//
		var $r = {};
		//
		$r.$title = _getTranslatedString(stringRes, [entity.alias, self.name, "$title"], true) || self.title;
		if (typeof self.$description !== "function") $r.$description = _getTranslatedString(stringRes, [entity.alias, self.name, "$description"], true) || self.$description;
		$r.$displayLength = self.$displayLength;
		$r.$isUnique = self.$isUnique;

		["$isMandatory", "$isDisabled", "$isReadOnly", "$isHidden", "$isExcluded"].forEach(function(n) {
			_copyIfStatic(self, $r, n);
		});
		//
		$r.$capabilities = _normalizeCapabilities(self, facetName, isChild);
		//
		return $r;
	},
	getTitle: function() {
		var self = this;
		var entity = self._entity;
		//
		var stringRes = entity.contract.resources && entity.contract.resources();
		return _getTranslatedString(stringRes, [entity.alias, self.name, "$title"], true) || self.$title;
	}
});

function Property(entity, meta) {
	var prop = meta;
	prop.type = prop.type || prop.$type || "string";
	if (prop.$enumCaptions) throw new Error(locale.format(module, "enumFormatDeprecated", entity.name, prop.name));
	// dont create the property if there isn't any default value, as null property means null default value
	if (prop.hasOwnProperty("defaultValue")) prop.defaultValue = prop.defaultValue;
	else if (prop.hasOwnProperty("$default")) prop.defaultValue = prop.$default;
	prop.minLength = prop.$minLength;
	prop.maxLength = prop.$maxLength;
	prop.mandatory = prop.$isMandatory;
	prop.nullable = prop.$isNullable;
	//
	BaseProperty.call(this, entity, meta);
};

exports.Property = helpers.defineClass(Property, BaseProperty, {
	getPropertyPrototype: function(_, stringRes, facetName, isChild, childPrefix, visited, options) {
		var $r = BaseProperty.prototype.getPropertyPrototype.call(this, _, stringRes, facetName, isChild, childPrefix);
		var res = $r;
		var name = this.name;
		var prop = this;
		var entity = this._entity;
		//		var propUrl = "{$baseUrl}/" + ((facetName === "$edit") ? "$workingCopies('{$trackingId}')" : "{$pluralType}('{$key}')") + "/" + (isChild ? childPrefix + "('{$key}')/" + name : name);
		var propUrl = "{$shortUrl}/" + name;

		res.$links = prop.$links;
		var $p;
		if (this.$isArray) {
			res.$type = "application/x-array";
			$p = res.$item = {};
		} else $p = res;
		if (prop["$enum"]) {
			$p.$type = "application/x-choice";
			var $value = $p.$value = {
				$type: prop.getMimeType(),
			};
			var protoEnum = $value.$enum = [];
			Array.isArray(prop["$enum"]) && prop["$enum"].forEach(function(e, idx) {
				protoEnum.push({
					$value: e.$value,
					$title: _getTranslatedString(stringRes, [entity.alias, name, e.$value], true) || e.$title || e.$value
				});
			});
		} else {
			$p.$type = prop.getMimeType();
			if (prop.isExternalStorage()) $p.$url = propUrl;
			if (prop.$type === "integer" && !prop.$format) prop.$format = "0";
		}
		$p.$format = prop.$format;
		_copyConstraints(prop, $p);
		//
		if (prop.$type === "password" && prop.$salt) {
			var c = ((require('config') || {}).session || {});
			$p.$salt = prop.$salt.replace("{$realm}", c.realm || "Syracuse");
		}
		//
		if (prop.isComputed || prop.$compute) $p.$isDisabled = true;
		// capabilities: use "res" variable for $capabilities as for the arrays we must be on prop level not on $item (as is $p)
		//		res.$capabilities = _normalizeCapabilities(prop, facetName, isChild);
		if ((prop.type === "string") && (res.$capabilities.indexOf("alphaTab") < 0)) res.$capabilities = res.$capabilities + ",alphaTab";
		//
		if (prop.$linksToDetails && (facetName !== "$lookup" && facetName !== "$select")) {
			if (prop.$details) {
				if (typeof prop.$details !== "function") {
					$p.$links = $p.$links || {};
					$p.$links.$details = prop.$details;
				}
			} else {
				$p.$links = $p.$links || {};
				$p.$links.$details = _getLink("$details");
			}
		}
		if (prop.$contentType) {
			$p.$contentType = prop.$contentType;
		}
		if (prop.$lookup) {
			$p.$links = $p.$links || {};
			if (typeof prop.$lookup !== 'function') {
				var lp = prop.$lookup && (prop.$lookup.parameters || prop.$lookup.$parameters);
				$p.$links.$lookup = _getLink("$lookup", null, "trackingId={$trackingId}&binding=" + prop.name + (lp ? "&" + lp : ""), prop.$lookup.entity);
				$p.$links.$lookup.$result = prop.$lookup.field;
			} else $p.$links.$lookup = {
				$isDisabled: true
			};
		}
		if (prop.$isLocalized) {
			propUrl = "{$shortUrl}/" + name;
			$p.$links = $p.$links || {};
			$p.$links.$localize = {
				$title: locale.format(module, "translateLinkTitle"),
				$url: propUrl + "/$localize",
				$method: "GET"
			};
		}
		//
		_decoratePropertyProtoMap[prop.$type] && _decoratePropertyProtoMap[prop.$type](_, $p, entity, prop);
		//
		return res;
	},
	getMimeType: function() {
		switch (this.type) {
			case "image":
			case "text/html":
			case "text/rtf":
			case "text/plain":
				return this.type;
			default:
				return ("application/x-" + this.type);
		}
	},
	isExternalStorage: function() {
		return (this.hasOwnProperty("$storage"));
	},
	getAllConstraints: function() {
		var c = {};
		_copyConstraints(this, c);
		if (this.$isMandatory) c.$isMandatory = this.$isMandatory;
		if (this.$isDefined) c.$isDefined = this.$isDefined;
		return c;
	},
	getDefaultValue: function(_, instance) {
		var property = this;
		if (property.hasOwnProperty("defaultValue")) {
			if (typeof property.defaultValue === "function") return property.defaultValue(_, instance);
			else return property.defaultValue;
		} else return (types[(property.$type || "string")] || {}).defaultValue;
	},
	hasDefaultValue: function() {
		return this.hasOwnProperty("defaultValue");
	},
	getGraphRelationsMaps: function(_) {
		var prop = this;
		if (prop.$type !== "graph") return;
		//
		var entity = this._entity;
		var stringRes = entity.contract.resources && entity.contract.resources();

		function _addNodes(_, rel, relMap, walked) {
			var ent = rel.targetEntity;
			if (!nodesMap[ent.name]) nodesMap[ent.name] = {
				$name: ent.name,
				$title: _getTranslatedString(stringRes, [ent.alias, "$pluralTitle"]) || ent.$pluralTitle,
				$selected: (relMap.$selected !== false),
				$prototype: {
					$properties: {
						$value: ent.$valueTemplate && ent.$valueTemplate.expression
					},
					$links: {
						$default: {
							$url: "{$baseUrl}/" + ent.plural + "('" + (ent.$key || "{$uuid}") + "')?representation=" + ent.name + ".$details",
							$type: "json",
							//$target: "blank"
						}
					}
				}
			};
			if (!linksMap[walked]) linksMap[walked] = {
				$name: walked,
				$title: rel.$title
			};
		}

		function _walkRelation(_, ent, relName, relMap, walked) {
			if (relName[0] === "$") return;
			//
			var targetEntity = ent.$relations && ent.$relations[relName] && ent.$relations[relName].targetEntity;
			if (!targetEntity) throw new Error(locale.format(module, "relationEntityNotFound", relName));
			//
			_addNodes(_, ent.$relations[relName], relMap, walked);
			// continue recursion
			flows.eachKey(_, relMap, function(_, locRelName, locRelMap) {
				_walkRelation(_, targetEntity, locRelName, locRelMap, walked + "." + locRelName);
			});
		}
		var nodesMap = {};
		var linksMap = {};
		// add starting point
		nodesMap[entity.name] = {
			$name: entity.name,
			$title: _getTranslatedString(stringRes, [entity.alias, "$pluralTitle"]) || entity.$pluralTitle,
			$selected: true,
			$prototype: {
				$properties: {
					$value: entity.$valueTemplate && entity.$valueTemplate.expression
				}
			}
		};
		//
		flows.eachKey(_, this.$relations, function(_, relName, relation) {
			_walkRelation(_, entity, relName, relation, relName);
		});
		//
		return {
			nodes: nodesMap,
			links: linksMap
		};
	}
});

function Relation(entity, meta) {
	var rel = meta;
	rel.isComputed = rel.$isComputed = rel.isComputed || rel.$isComputed;
	rel.isChild = rel.$isChild = rel.isChild || rel.$isChild;
	rel.$canReorder = rel.$canReorder || (rel.$capabilities && (rel.$capabilities.indexOf("reorder") >= 0));
	if (typeof rel.optional == "undefined") rel.optional = false;
	if (rel.isChild) rel.owned = true;
	rel.type = rel.type || rel.$type;
	rel.mandatory = rel.$isMandatory;
	rel.inv = rel.inv || rel.$inv;
	for (var vv in (rel.$variants || {})) rel.$variants[vv].name = vv;

	BaseProperty.call(this, entity, meta);
};

exports.Relation = helpers.defineClass(Relation, BaseProperty, {
	getIsChild: function(typeName) {
		var self = this;
		if (self.$variants && typeName && self.$variants[typeName]) {
			return self.$variants[typeName].$isChild || self.$variants[typeName].isChild || self._$isChild;
		} else return self._$isChild;
	},
	getTargetEntity: function(typeName) {
		var self = this;
		if (self.$variants && typeName && self.$variants[typeName]) {
			return self.$variants[typeName].targetEntity;
		} else return self.targetEntity;
	},
	getPropertyPrototype: function(_, stringRes, facetName, isChild, childPrefix, visited, options) {
		function _updateChildRef(_, resource, item, rel, variant, facetName, isChild, childPrefix, isCollection) {
			var $item = resource.$item = variant.targetEntity.getPrototype(_, variant.targetEntity.name, facetName, isChild, childPrefix, visitedEntities, options);
			$item.$representation = variant.targetEntity.name;
			// rewrite $url to reference parent's $url
			$item.$shortUrl = "{$shortUrl}/" + self.name + (self.isPlural ? "('{$uuid}')" : "");
			if (facetName === "$edit") {
				if (isCollection) {
					resource.$actions = resource.$actions || {};
					if (variant.$select) {
						resource.$actions.$select = resource.$actions.$select || {
							$title: locale.format(module, "createTableActionTitle"),
							$method: "PUT"
						};
						var a = resource.$actions.$select;
						a.$parameters = a.$parameters || {};
						var selectEnt = entity.getModel().getEntity(_, variant.$select.$type); // assume same model for now ...
						a.$parameters.$actions = a.$parameters.$actions || {};
						var lp = variant.$select && (variant.$select.parameters || variant.$select.$parameters);
						a.$parameters.$actions.$select = {
							$title: variant.$select.$title,
							$type: "application/x-array",
							$item: selectEnt.getPrototype(_, selectEnt.name, "$select", true, childPrefix),
							$url: "{$baseUrl}/" + selectEnt.plural + "?representation=" + selectEnt.name + ".$select" + (lp ? "&" + lp : "") + "&trackingId={trackingId}" + (childPrefix ? "&binding=" + childPrefix : "")
						};
					} else {
						// children create/delete are base on capabilities, not on actions.
						/*if (!rel.$capabilities || rel.$capabilities.indexOf("append") >= 0) resource.$actions.$create = resource.$actions.$create || {
							$title: locale.format(module, "createTableActionTitle"),
							$method: "PUT"
						};*/
					}
				} else {
					if (variant.$lookup) {
						var lookupLinkName = "$lookup";
						$item.$links = $item.$links || {};
						var lp = variant.$lookup && (variant.$lookup.parameters || variant.$lookup.$parameters);
						$item.$links[lookupLinkName] = _getLink(lookupLinkName, locale.format(module, "selectItemActionTitle"), "trackingId={$trackingId}" + ((rel && rel.name) ? "&binding=" + childPrefix : "") + (lp ? "&" + lp : ""), variant.targetEntity.name);
					}
					if ($item.$actions && $item.$actions.$delete) delete $item.$actions.$delete;
				}
			}
		}

		function _updateItem(_, res, item, ent, variantMeta) {
			var variant = variantMeta || self;
			var isChild = (variant && variant.hasOwnProperty("_$isChild") ? variant._$isChild : (variant && variant.$isChild) || self._$isChild);
			if (isChild) {
				item.$type = "application/x-object";
				if (visitedEntities && visitedEntities.indexOf(variant.targetEntity.name) >= 0) {
					variant.targetEntity._export$Id = true;
					item.$item = {
						$type: "application/x-pointer",
						$prototype: "#" + variant.targetEntity.name
					};
				} else {
					_updateChildRef(_, variantMeta ? item : res, item, self, variant, facetName, true, thumbRelName, self.isPlural);
				}
			} else {
				item.$type = "application/x-reference";
				item.$item = {};
				_fillThumb(item.$item, ent, self, thumbRelName, facetName, stringRes);
				if (self.isPlural && facetName === "$edit" && (typeof self.$isDisabled === "function" || !self.$isDisabled)) {
					(res.$links = res.$links || {}).$select = self.getLink("$select");
				}
			}
			if (variantMeta && variantMeta.$title) item.$title = variantMeta.$title;
		}

		var $r = BaseProperty.prototype.getPropertyPrototype.call(this, _, stringRes, facetName, isChild, childPrefix);
		var result = $r;
		//
		var self = this;
		var entity = self._entity;
		var visitedEntities = visited || [];
		//
		// properly format binding for childrens
		var thumbRelName = self.name;
		if (childPrefix) thumbRelName = childPrefix.replace("uuid", "parent_uuid") + "('{$uuid}')/" + thumbRelName;
		//
		var $item = $r;
		if (self.isPlural) {
			$r.$type = "application/x-array";
			$item = $r.$item = {};
		}
		if (self.$variants) {
			$item.$type = "application/x-variant";
			$item.$variants = {};
			Object.keys(self.$variants).forEach_(_, function(_, vName) {
				var ent = self.$variants[vName].targetEntity;
				var variant = self.$variants[vName];
				var $v = $item.$variants[vName] = {};
				if (variant.$capabilities) $v.$capabilities = _normalizeCapabilities(variant, facetName, isChild);
				_updateItem(_, $r, $v, ent, variant);
			});
		} else {
			_updateItem(_, $r, $item, self.targetEntity, null);
		}
		if (self.$treeview && self.$treeview.$bindings) {
			$r.$treeview = {
				$mode: self.$treeview.$mode || "parentKey",
				$bindings: {
					$id: self.$treeview.$bindings.$id,
					$parent: self.$treeview.$bindings.$parent,
					$title: self.$treeview.$bindings.$title || self.$treeview.$bindings.$id,
					$description: self.$treeview.$bindings.$description || self.$treeview.$bindings.$id,
					$open: self.$treeview.$bindings.$open || "EXPD",
					$data: Object.keys($r.$item.$properties).filter(function(property) {
						return [self.$treeview.$bindings.$id, self.$treeview.$bindings.$parent].indexOf(property) < 0;
					})
				}
			};
		}
		if (this.$links) {
			result.$links = Object.keys(this.$links)
				.filter(k => !this.$links[k].facets || this.$links[k].facets.indexOf(facetName) >= 0)
				.reduce((r, k) => (r[k] = this.$links[k], r), {});
		}
		//
		return result;
	},
	getLink: function(facetName, variantName, params, title) {
		var self = this;
		switch (facetName) {
			case "$select":
				var lp = self.$select && (self.$select.parameters || self.$select.$parameters);
				var pars = ["trackingId={$trackingId}", "parent=" + self._entity.name + "('{$key}')", "binding=" + self.name];
				if (lp) pars.push(lp);
				if (params) pars.push(params);
				if (self.$variants) {
					var res = {
						$title: locale.format(module, "createTableActionTitle"),
						$variants: {}
					};
					if (variantName) {
						var vEnt = self.getTargetEntity(variantName);
						if (!vEnt) throw new Error(locale.format(module, "noTargetEntity", self._entity.name, self.name, vName));
						//res.$variants[variantName] = _getLink("$select", locale.format(module, "createTableActionTitle"), pars.join("&"), vEnt.name);
						res.$variants[variantName] = _getLink("$select", title, pars.join("&") + "&variant=" + variantName, vEnt.name);
					} else {
						for (var vName in self.$variants) {
							if (!self.getIsChild(vName)) {
								var vEnt = self.getTargetEntity(vName);
								if (!vEnt) throw new Error(locale.format(module, "noTargetEntity", self._entity.name, self.name, vName));
								//res.$variants[vName] = _getLink("$select", locale.format(module, "createTableActionTitle"), pars.join("&"), vEnt.name);
								res.$variants[vName] = _getLink("$select", title, pars.join("&") + "&variant=" + vName, vEnt.name);
							}
						}
					}
					return res;
				} else {
					var ent = self.getTargetEntity();
					if (!ent) throw new Error(locale.format(module, "noTargetEntity", self._entity.name, self.name, ""));
					return _getLink("$select", title || locale.format(module, "createTableActionTitle"), pars.join("&"), ent.name);
				}
			default:
				return _getLink(facetName, title, pars.join("&"), self._entity.name); // TODO ?
		}
	}
});

function _getStack() {
	var err = new Error("");
	return err.safeStack;
}

_defineProperty(Relation, false, "isChild", "_$isChild", locale.format(module, "obsolete", "isChild", "getIsChild()"));
_defineProperty(Relation, false, "$isChild", "_$isChild", locale.format(module, "obsolete", "isChild", "getIsChild()"));

function _checkDefaultOrder(entity, orders) {
	orders.forEach(function(order) {
		if (!(order instanceof Array)) throw new Error(entity.name + ": default order element is not an array");
		if (!entity.$properties[order[0]]) throw new Error(entity.name + ": invalid order property: " + order[0]);
		if (order[1] === undefined) order[1] = true;
	});
}

var _allEvents = ["$afterPropagate", "$afterActions", "$beforeSave", "$canSave", "$afterSave", "$errorSave", "$canDelete"];

function _getEntityPrototype(_, model, entity, reprName, facetName, isChild, childPrefix, visited, options) {
	function _fillProtoTemplates(result, e) {
		result.$url = "{$baseUrl}/" + entity.plural + "('{$key}')";
		result.$url = "{$baseUrl}/" + entity.plural + "('{$key}')";
		result.$value = (e.$valueTemplate && (_getTranslatedString(stringRes, [e.name, "$valueTemplate"]) || e.$valueTemplate.expression)) || "{$key}";
		// $title conflicts with the property title for reference thumb.
		//			result.$title = (e.$titleTemplate && e.$titleTemplate.expression) || (e.title + " {$key}");
		result.$description = (e.$descriptionTemplate && (_getTranslatedString(stringRes, [e.name, "$descriptionTemplate"]) || e.$descriptionTemplate.expression)) || _getTranslatedString(stringRes, [e.name, "$title"]) || result.$title;
		// extract all fields in templates
		result.$key = e.$key || "{$uuid}";
		result.$properties = {};
		var allFields = {};

		function addField(elem) {
			elem = elem.substring(1, elem.length - 1);
			if (!allFields[elem] && e.$properties[elem]) allFields[elem] = e.$properties[elem];
		}
		if (e.$valueTemplate && e.$valueTemplate.matches) e.$valueTemplate.matches.forEach(addField);
		if (e.$valueTitleTemplate && e.$valueTitleTemplate.matches) e.$valueTitleTemplate.matches.forEach(addField);
		if (e.$descriptionTemplate && e.$descriptionTemplate.matches) e.$descriptionTemplate.matches.forEach(addField);
		//
		forEachKey(allFields, function(field, value) {
			result.$properties[field] = {
				$type: value.getMimeType()
			};
		});
	}

	function _fillThumb($thumb, e, rel, prefix) {
		_fillProtoTemplates($thumb, e);
		$thumb.$url += "?representation={$representation}.$thumb";
		$thumb.$prototype = "{$baseUrl}/$prototypes('{$representation}.$thumb')";
		$thumb.$representation = e.name;
		$thumb.$title = (e.$valueTitleTemplate && (_getTranslatedString(stringRes, [e.name, "$valueTitleTemplate"]) || e.$valueTitleTemplate.expression));
		if (rel.$isDisabled && (typeof rel.$isDisabled !== "function")) $thumb.$isDisabled = rel.$isDisabled;
		if (rel.$isReadOnly && (typeof rel.$isReadOnly !== "function")) $thumb.$isReadOnly = rel.$isReadOnly;
		$thumb.$links = {
			$details: _getLink("$details", null, "", rel.$isDynamicType ? null : e.name)
		};
		//
		//var lookupLinkName = ((rel && rel.isPlural && rel.relType !== "children") ? "$select" : "$lookup");
		if ((facetName === "$edit") || (queryRepr.indexOf(facetName) >= 0)) {
			var lookupLinkName = "$lookup";
			var relLookupParams = (rel.$lookup && (rel.$lookup.parameters || rel.$lookup.$parameters)) || (rel.$select && (rel.$select.parameters || rel.$select.$parameters));
			$thumb.$links[lookupLinkName] = _getLink(lookupLinkName, locale.format(module, "createTableActionTitle"), "trackingId={$trackingId}" + ((rel && rel.name) ? "&binding=" + prefix : "") + (relLookupParams ? "&" + relLookupParams : ""), e.name);
		}
	}

	function _addWordLinks(_, resource, entityName, facetName) {
		if (!adminBaseUrl) {
			var adminEP = require("syracuse-collaboration/lib/helpers").AdminHelper.getCollaborationEndpoint(_);
			adminBaseUrl = adminEP && adminEP.getBaseUrl(_);
		}

		// These parameters can be set to enforce filtering on set properties during template selection
		var templateParams = {
			"$msoRepr": "{$representation}" + "." + facetName,
			"$msoLocale": "",
			//require('streamline-runtime').globals.context.locale,
			"$msoCpy": "",
			"$msoLeg": "",
			"$msoActiv": "",
			"$msoEndpoint": "" // endpoint as string formed like <application>.<contract>.<dataset> e.g. x3.erp.SUPERV
		};

		var urlParams = "";
		flows.eachKey(_, templateParams, function(_, name, value) {
			urlParams += "&" + name + "=" + value;
		});

		if (queryRepr.indexOf(facetName) >= 0) {
			resource.$links.$wordmailmerge = {
				"$title": locale.format(module, "mailMerge"),
				"$url": _getLink(facetName).$url + "&createMode={creationMode}&doc_uuid={document}",
				"$type": httpHelpers.mediaTypes.word_mailmerge,
				"$confirm": locale.format(module, "installOfficeAddin"),
				"$officeAddinSetup": "/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE",
				"$parameters": {
					"$url": adminBaseUrl + "/msoMailMergeDocSels/$template/$workingCopies?representation=msoMailMergeDocSel.$edit&role={$role}" + urlParams,
					"$method": "POST",
					"$properties": {
						"dummy": { // the user will be prompted to enter user1 value
							"$title": "dummy",
							"$type": "application/x-string"
						}
					}
				}
			};
		}

		resource.$links.$wordreport = {
			"$title": locale.format(module, "wordReport"),
			"$url": _getLink(facetName).$url + "&reportMode={reportMode}&doc_uuid={document}",
			"$type": httpHelpers.mediaTypes.word_report,
			"$confirm": locale.format(module, "installOfficeAddin"),
			"$officeAddinSetup": "/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE",
			"$parameters": {
				"$url": adminBaseUrl + "/msoReportModes/$template/$workingCopies?representation=msoReportMode.$edit&role={$role}" + urlParams,
				"$method": "POST",
				"$properties": {
					"dummy": {
						"$title": "dummy",
						"$type": "application/x-string"
					}
				}
			}
		};
	}

	function _addExcelLinks(_, resource, entityName, facetName) {
		if (!adminBaseUrl) {
			var adminEP = require("syracuse-collaboration/lib/helpers").AdminHelper.getCollaborationEndpoint(_);
			adminBaseUrl = adminEP && adminEP.getBaseUrl(_);
		}

		// These parameters can be set to enforce filtering on set properties during template selection
		var templateParams = {
			"$msoExcelRepr": "{$representation}" + "." + facetName,
			"$msoLocale": "",
			//require('streamline-runtime').globals.context.locale,
			"$msoCpy": "",
			"$msoLeg": "",
			"$msoActiv": "",
			"$msoEndpoint": "" // endpoint as string formed like <application>.<contract>.<dataset> e.g. x3.erp.SUPERV
		};

		var urlParams = "";
		flows.eachKey(_, templateParams, function(_, name, value) {
			urlParams += "&" + name + "=" + value;
		});

		resource.$links.$excelreport = {
			"$title": locale.format(module, "excelReport"),
			"$url": _getLink(facetName).$url + "&excelReportMode={excelReportMode}&doc_uuid={document}",
			"$type": httpHelpers.mediaTypes.excel_worksheet,
			"$confirm": locale.format(module, "installOfficeAddin"),
			"$officeAddinSetup": "/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE",
			"$parameters": {
				"$url": adminBaseUrl + "/msoExcelReportModes/$template/$workingCopies?representation=msoExcelReportMode.$edit&role={$role}" + urlParams,
				"$method": "POST",
				"$properties": {
					"dummy": {
						"$title": "dummy",
						"$type": "application/x-string"
					}
				}
			}
		};
	}

	function _addPptLinks(resource) {
		if (queryRepr.indexOf(facetName) >= 0) {
			resource.$links.$pptslide = {
				"$title": locale.format(module, "createNewSlide"),
				"$url": _getLink(facetName).$url + "&count={recordsPerPage}" + "&pptMode=newSlide",
				"$type": httpHelpers.mediaTypes.ppt_slide,
				"$confirm": locale.format(module, "installOfficeAddin"),
				"$officeAddinSetup": "/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE"
			};
		}
	}

	function _copySelOption(copy, opt, destName) {
		if (opt && (typeof opt === "object") && (Object.keys(opt).length > 0)) copy[destName] = opt;
	}

	//
	var adminBaseUrl = null;
	var opt = options || {};
	var stringRes = entity.contract.resources && entity.contract.resources();
	var resource = {
		$type: "application/json"
	};
	resource.$prototype = "{$baseUrl}/$prototypes('{$representation}." + facetName + "')";
	if (!isChild) {
		resource.$url = (facetName === "$edit") ? "{$baseUrl}/$workingCopies('{$trackingId}')" : "{$baseUrl}/{$pluralType}('{$key}')";
		resource.$shortUrl = (facetName === "$edit") ? "{$baseUrl}/$workingCopies('{$trackingId}')" : "{$baseUrl}/{$pluralType}('{$key}')";
		resource.$value = (entity.$valueTemplate && (_getTranslatedString(stringRes, [entity.alias, "$valueTemplate"]) || entity.$valueTemplate.expression)) || "{$key}";
		resource.$title = (entity.$titleTemplate && (_getTranslatedString(stringRes, [entity.alias, "$titleTemplate"]) || entity.$titleTemplate.expression)) || (entity.title + " {$key}");
	}
	resource.$key = entity.$key || "{$uuid}";
	resource.$description = (entity.$descriptionTemplate && (_getTranslatedString(stringRes, [entity.alias, "$descriptionTemplate"]) || entity.$descriptionTemplate.expression)) || resource.$title;
	resource.$pluralType = entity.plural;
	resource.$representation = reprName;
	var $ = resource.$properties = {};
	flows.eachKey(_, entity.$properties, function(_, name, prop) {
		//if (prop.type === "json") return;
		if (options && options.select && !options.select[name]) return;
		if ((prop.type === "graph") && (queryRepr.indexOf(facetName) >= 0)) return;
		if ((prop.type === "password") && (facetName !== "$edit")) return;
		if (prop.$isDeveloppementFeature && !(((globals.context.config || {}).system || {}).enableDevelopmentFeatures)) return;
		//
		//don't send default values as might create an difference between the value stored on server and showed by the client
		//		if (typeof prop.$default !== "undefined") {
		//			resource[name] = resourceHelpers.formatValue(prop, prop.$default);
		//		}
		//
		var $p = $[name] = prop.getPropertyPrototype(_, stringRes, facetName, isChild, childPrefix);
	});
	var $links = resource.$links = {};
	flows.eachKey(_, entity.$relations, function(_, name, rel) {
		if (opt.select && !opt.select[name]) return;
		if (!opt.select && rel.isPlural && (queryRepr.indexOf(facetName) >= 0) && !(opt.include && opt.include[name])) return;
		if (rel.relType == "parent") return;
		var visitedEnts = visited || [];
		visitedEnts.push(entity.name);
		var cpOptions;
		if (options) {
			// copy options for this particular relation: include and select if not == empty object
			cpOptions = {};
			_copySelOption(cpOptions, options.include && options.include[name], "include");
			_copySelOption(cpOptions, options.select && options.select[name], "select");
		}
		var $r = $[name] = rel.getPropertyPrototype(_, stringRes, facetName, isChild, childPrefix, visitedEnts, cpOptions);
	});
	if (entity._export$Id) resource.$id = entity.name;
	var $showMeta = entity.$showMeta ? entity.$showMeta.split(',') : [];
	// some standard properties
	$["$creUser"] = {
		$title: "Created by",
		$type: "application/x-string",
		$isDisabled: true,
		$isHidden: $showMeta.indexOf("$creUser") === -1,
		$capabilities: "sort,filter"
	};
	$["$updUser"] = {
		$title: "Updated by",
		$type: "application/x-string",
		$isDisabled: true,
		$isHidden: $showMeta.indexOf("$updUser") === -1,
		$capabilities: "sort,filter"
	};
	$["$creDate"] = {
		$title: "Created on",
		$type: "application/x-datetime",
		$isDisabled: true,
		$isHidden: $showMeta.indexOf("$creDate") === -1,
		$capabilities: "sort,filter"
	};
	$["$updDate"] = {
		$title: "Updated on",
		$type: "application/x-datetime",
		$isDisabled: true,
		$isHidden: $showMeta.indexOf("$updDate") === -1,
		$capabilities: "sort,filter"
	};
	// #4928
	if (entity.$allowFactory) {
		$["$factory"] = {
			$title: "Is factory",
			$type: "application/x-boolean",
			$capabilities: "sort,filter"
		};
		$["$factoryOwner"] = {
			$title: "Factory Owner",
			$type: "application/x-string",
			$isDisabled: true,
			$capabilities: "sort,filter"
		};
	}
	// services
	entity.addServicesLinks(facetName, resource, isChild);
	//
	if ((facetName !== "$child") && !isChild) {
		entity.fillLinksResource(facetName, resource);
		// word links is "opt-in"
		if (_isEntityCapableOf(entity, "wordReport")) _addWordLinks(_, resource, entity.name, facetName);
		// removed ppt since reporting in ppt is not supported yet
		// _addPptLinks(resource, facetName);
		if (queryRepr.indexOf(facetName) >= 0) {
			var old = resource;
			var tr = _getTranslatedString(stringRes, [entity.alias, "$listTitle"]);
			resource = {
				$baseUrl: resource.$baseUrl,
				$baseType: resource.$baseType,
				$url: "{$baseUrl}/" + entity.plural,
				$type: resource.$type,
				$title: (tr ? tr + (entity.$listTitleSuffix || "") : entity.$listTitle || locale.format(module, "listOf", entity.plural)),
				$properties: {
					$resources: {
						$type: "application/x-array",
						$item: resource
					}
				}
			};
			// default order
			resource.$properties.$resources.$item.$defaultOrder = entity.defaultOrder.map(function(item) {
				return item[1] ? item[0] : item[0] + " desc";
			}).join(",");
			//
			if (facetName !== "$search") {
				resource.$pluralType = entity.plural;
				resource.$representation = reprName;
			}
			resource.$links = resource.$links || {};
			if (entity.$canCreate !== false) {
				resource.$links.$create = _getLink("$create", _getTranslatedString(stringRes, [entity.alias, "$createActionTitle"]) || locale.format(module, "newLinkTitle", entity.name));
			}
			// print is opt-out: not for 7.0
			// if (_isEntityCapableOf(entity, "pdfReport")) {
			// 	resource.$links.$print = _getLink(facetName, locale.format(module, "print"));
			// 	resource.$links.$print.$type = httpHelpers.mediaTypes.pdf;
			// }
			// excel is opt-out
			if (_isEntityCapableOf(entity, "excelReport")) {
				_addExcelLinks(_, resource, entity.name, facetName);
			}

			// word links is "opt-in"
			if (_isEntityCapableOf(entity, "mailMerge")) _addWordLinks(_, resource, entity.name, facetName);
			// removed ppt since reporting in ppt is not supported yet
			// _addPptLinks(resource, facetName);

			// Add factory level links
			Object.keys(entity.$services).forEach(function(key) {
				if (!entity.$services[key].isMethod) resource.$links[key] = old.$links[key];
			});
			// Add $links that are explicitly targetted to this facet
			Object.keys(entity.$links).forEach(key => {
				const facets = entity.$links[key].$facets;
				if (facets && facets.indexOf('$query') >= 0) resource.$links[key] = entity.$links[key];
			});
			if (entity.$helpPage) {
				resource.$links.$help = {
					$url: "{$baseHelpUrl}/" + entity.$helpPage + '.html',
					$title: locale.format(module, "helpTitle"),
					$type: "text/html",
					$target: "help",
				};
			}

			// Capability to add query links
			if (entity.$queryLinks) {
				Object.keys(entity.$queryLinks).forEach(function(key) {
					entity.$queryLinks[key].$title = _getTranslatedString(stringRes, [entity.alias, "$queryLinks", key, "$title"], true) || entity.$queryLinks[key].$title || key;
					resource.$links[key] = entity.$queryLinks[key];
				});
			}

			delete old.$baseType;
			delete old.$baseUrl;
			//old.$type = result.$baseType + "." + entity.name + ":$queryItem";
			old.$type = "application/json";
		} else if (facetName === "$details") {
			if (_isEntityCapableOf(entity, "excelReport")) {
				_addExcelLinks(_, resource, entity.name, facetName);
			}
		}
	} else if (isChild) {
		if (facetName === "$edit") {
			// children create / delete are managed by $capabilities, not actions anymore
			/*resource.$actions = resource.$actions || {};
			resource.$actions.$delete = resource.$actions.$delete || {
				$title: locale.format(module, "deleteActionTitle"),
				$method: "PUT"
			};*/
		}
	}

	//
	return resource;
}

function Entity(model, name, meta) {
	var self = this;
	var entity = meta;
	self._model = model;
	//
	entity.name = name;
	entity.className = entity.className || capitalize(name);
	entity.plural = entity.plural || pluralize(name);
	entity.$pluralTitle = entity.$pluralTitle || capitalize(entity.plural);
	entity.contract = model.contract;
	entity.title = entity.title || entity.$title || entity.name;
	entity.allProperties = {};
	// default $isPersistent is true
	if (!entity.hasOwnProperty("$isPersistent")) entity.$isPersistent = true;
	if (!entity.hasOwnProperty("$capabilities")) entity.$capabilities = "excelReport,pdfReport"; // wordReport and mailMerge are opt-in

	entity.$properties = entity.$properties || {};
	entity.$services = entity.$services || {};
	entity.$events = entity.$events || {};
	entity.$methods = entity.$methods || {};
	entity.$functions = entity.$functions || {};
	entity.$rules = entity.$rules || {};
	entity.$links = entity.$links || {};
	entity.$actions = entity.$actions || {};
	//
	entity.$relations = entity.$relations || {};
	// register extension properties and services
	if (_isEntityCapableOf(entity, "mailTemplate")) require('syracuse-email/lib/entities/mailTemplate').addMailTemplateService(entity);
	// 
	entity._$properties = {};
	helpers.object.forEachKey(entity.$properties, function(propName, prop) {
		prop.name = propName;
		entity._$properties[propName] = new exports.Property(self, entity.$properties[propName]);
		entity.allProperties[propName] = entity._$properties[propName];
	});
	//
	entity.defaultOrder = entity.defaultOrder || entity.$defaultOrder;
	if (!entity.defaultOrder && entity.$properties["description"]) entity.defaultOrder = [
		["description", true]
	];
	if (!entity.defaultOrder) entity.defaultOrder = [];
	_checkDefaultOrder(entity, entity.defaultOrder);

	if (entity.descriptor) {
		if (typeof entity.descriptor != "function" && !entity.$properties[entity.descriptor]) throw new Error(entity.name + ": invalid descriptor property: " + entity.descriptor);
	}

	_allEvents.forEach(function(name) {
		entity.$events[name] = entity.$events[name] || [];
	});
	entity._$relations = {};
	forEachKey(entity.$relations, function(relName, rel) {
		rel.name = relName;
		entity._$relations[relName] = new exports.Relation(self, entity.$relations[relName]);
		entity.allProperties[relName] = entity._$relations[relName];
	});
	//
	forEachKey(entity.$links, function(name, link) {
		//link.name = name;
	});
	forEachKey(entity.$actions, function(name, action) {
		//action.name = name;
	});

	function _makeTemplate(str) {
		var template = new resourceProxy.Template(str);
		(template.matches || []).forEach(function(match) {
			match = match.substring(1, match.length - 2).trim();
			if (entity.$properties[match]) entity.$properties[match].usedByTemplate = true;
		});
		return template;
	}
	if (entity.$valueTemplate && (typeof entity.$valueTemplate === "string")) entity.$valueTemplate = _makeTemplate(entity.$valueTemplate);
	if (entity.$valueTitleTemplate && (typeof entity.$valueTitleTemplate === "string")) entity.$valueTitleTemplate = _makeTemplate(entity.$valueTitleTemplate);
	if (entity.$summaryTemplate && (typeof entity.$summaryTemplate === "string")) entity.$summaryTemplate = _makeTemplate(entity.$summaryTemplate);
	if (entity.$titleTemplate && (typeof entity.$titleTemplate === "string")) entity.$titleTemplate = _makeTemplate(entity.$titleTemplate);
	if (entity.$descriptionTemplate && (typeof entity.$descriptionTemplate === "string")) entity.$descriptionTemplate = _makeTemplate(entity.$descriptionTemplate);
	if (entity.$iconTemplate && (typeof entity.$iconTemplate === "string")) entity.$iconTemplate = _makeTemplate(entity.$iconTemplate);
	entity.$urlTemplate = _makeTemplate("{$baseUrl}/" + entity.plural + "('{$key}')?representation=" + entity.name + ".$details");
	//
	// standard services
	if ((entity.$lockType === "pessimist") && !entity.$services.forceLockInstance) {
		// force locking of an instance allready locked by another user
		entity.$services.forceLockInstance = {
			$method: "POST",
			$isMethod: true,
			$title: "Force lock",
			$isHidden: true,
			$execute: function(_, context, instance) {
				// delete locks for instance (other session?)
				instance.unlockInstance(_);
				// lock for this session
				instance.lockInstance(_);
				//
				context.reply(_, 200);
			}
		};
	}

	//
	forEachKey(entity.$staticFunctions, function(name, fn) {
		if (typeof fn != "function") throw new Error(entity.name + ": " + name + " is not a function");
		//
		entity[name] = fn.bind(entity);
	});
	forEachKey(entity.$services, function(name, operation) {
		operation.name = name;
		operation.method = operation.method || operation.$method;
		operation.isMethod = operation.isMethod || operation.$isMethod || false;
		operation.execute = operation.execute || operation.$execute;
		if (typeof operation.execute != "function") throw new Error(entity.name + "operation '" + name + "' does not have execute method");
	});
	//
	forEachKey(entity.$events, function(name, event) {
		if (_allEvents.indexOf(name) < 0) throw new Error(entity.name + ": invalid event name: " + name);

	});
	//
	forEachKey(entity.$staticFunctions, function(name, fn) {
		if (typeof fn != "function") throw new Error(entity.name + ": " + name + " is not a function");
	});
	forEachKey(entity.$functions, function(name, fn) {
		if (typeof fn != "function") throw new Error(entity.name + ": " + name + " is not a function");
	});
	forEachKey(entity.$methods, function(name, fn) {
		if (typeof fn != "function") throw new Error(entity.name + ": " + name + " is not a function");
	});
	//
	for (var ii in meta) {
		self[ii] = meta[ii];
	}
	//
	delete self.$properties;
	Object.defineProperty(self, "$properties", {
		get: function() {
			return self._$properties;
		},
		set: function(val) {
			throw new Error(locale.format(module, "attemptToWrite", "$properties"));
		}
	});
	delete self.$relations;
	Object.defineProperty(self, "$relations", {
		get: function() {
			return self._$relations;
		},
		set: function(val) {
			throw new Error(locale.format(module, "attemptToWrite", "$relations"));
		}
	});
	self._allProperties = self.allProperties;
	delete self.allProperties;
	Object.defineProperty(self, "allProperties", {
		get: function() {
			return self._allProperties;
		},
		set: function(val) {
			throw new Error(locale.format(module, "attemptToWrite", "allProperties"));
		}
	});
	//
	self.factory = new factory.Factory(self);
}

function _isEntityCapableOf(entity, capability) {
	var caps = (entity.$capabilities || "").split(",");
	return caps.indexOf(capability) >= 0;
}

function _getMeta(entity, metaName, parameters, selected, needsThumb, forceChildren, depth) {
	return {
		entity: entity,
		name: metaName,
		$properties: entity.$properties,
		$relations: entity.$relations,
		isSelected: selected,
		needsThumb: needsThumb,
		defaultOrder: entity.defaultOrder
	};
}

exports.Entity = helpers.defineClass(Entity, null, {
	createInstance: function(_, db, initial) {
		return this.factory.createInstance(_, initial, db);
	},
	fetchInstance: function(_, db, options) {
		return db.fetchInstance(_, this, options);
	},
	fetchInstances: function(_, db, options) {
		return db.fetchInstances(_, this, options);
	},
	count: function(_, db, options) {
		return db.count(_, this, options);
	},
	addServicesLinks: function(reprType, resource, isChild) {
		var contract = this._model.contract;
		var entity = this;
		// add standard links resources for the entity
		var stringRes = contract.resources && contract.resources();
		var self = this;
		//
		if (self.$actions) {
			resource.$actions = resource.$actions || {};
			Object.keys(self.$actions).forEach(function(lName) {
				var a = self.$actions[lName];
				if (typeof a === "function") return;
				if (!a.$facets || (a.$facets && a.$facets.indexOf(reprType) >= 0)) var p = resource.$actions[lName] = resource.$actions[lName] || {};
				helpers.object.extend(p, a, true, true);
			});
		}
		// services
		forEachKey(self.$services, function(key, service) {
			var s = null;

			if (service.$method && (service.$method !== "GET") && (reprType === "$edit")) {
				resource.$actions = resource.$actions || {};
				s = resource.$actions[key] = {};
			} else {
				// make service links
				resource.$links = resource.$links || {};
				s = resource.$links[key] = {
					$type: service.$type || "application/json;vnd.sage=syracuse"
				};
				if (isChild) s.$url = "{$shortUrl}";
				else s.$url = "{$baseUrl}/" + (!service.$isMethod ? "{$pluralType}" : (reprType === "$edit" ? "$workingCopies('{$trackingId}')" : "{$pluralType}('{$key}')"));
				s.$url += "/$service/" + key + "?representation={$representation}." + reprType;
				if (service.$parameters && service.$parameters.$properties) {
					var props = service.$parameters.$properties;
					var par = Object.keys(props).map(function(p) {
						return p + "=" + "{" + p + "}";
					}).join("&");
					if (par) s.$url += "&" + par;
				}
			}
			s.$method = service.$method || "GET";
			s.$title = _getTranslatedString(stringRes, [entity.alias, "$services", key, "$title"], true) || service.$title || key;
			s.$description = _getTranslatedString(stringRes, [entity.alias, "$services", key, "$description"], true) || service.$description || null;
			s.$confirm = _getTranslatedString(stringRes, [entity.alias, "$services", key, "$confirm"], true) || service.$confirm || null;

			if (service.$isHidden && (typeof s.$isHidden != "function")) s.$isHidden = service.$isHidden;
			if (service.$isDisabled && (typeof s.$isDisabled != "function")) s.$isDisabled = service.$isDisabled;

			if (service.$facets && service.$facets.indexOf(reprType) < 0) {
				s.$isDisabled = true;
			}
			if (service.$parameters) s.$parameters = service.$parameters;
			if (service.$invocationMode) {
				s.$invocationMode = service.$invocationMode;
				s.$url = s.$url + "&trackngId={$trackngId}";
			} else if (s.$method === "GET") {
				s.$target = service.$target || "diagnoses";
			}
			if (service.$urlParameters) s.$url += "&" + service.$urlParameters;
		});
		resource.$links = resource.$links || {};
		forEachKey(self.$links, function(key, link) {
			if (typeof link === 'string') return;
			link.$title = _getTranslatedString(stringRes, [entity.alias, "$links", key, "$title"]) || link.$title;
			if (typeof link !== "function") resource.$links[key] = link;
		});
	},
	fillLinksResource: function(reprType, resource) {
		var contract = this._model.contract;
		var entity = this;
		// add standard links resources for the entity
		var stringRes = contract.resources && contract.resources();
		var self = this;
		var $links = (resource.$links = (resource.$links || {}));
		if (reprType !== "$details") {
			if (self.$isPersistent !== false) $links.$details = _getLink("$details", locale.format(module, "detailsLinkTitle"));
		}
		if (reprType !== "$edit") {
			if (self.$canEdit !== false) $links.$edit = _getLink("$edit", locale.format(module, "editLinkTitle"));
			if (self.$canDelete !== false) $links.$delete = {
				$title: locale.format(module, "deleteActionTitle"),
				$confirm: locale.format(module, "deleteConfirmMessage", self.$valueTemplate && self.$valueTemplate.expression),
				// send to query representation
				$url: "{$baseUrl}/{$pluralType}('{$key}')?representation={$representation}." + reprType + "&role={$role}",
				$type: "application/json;vnd.sage=syracuse",
				$method: "DELETE"
			};
		}
		if (reprType !== "$query") {
			var tr = _getTranslatedString(stringRes, [self.alias, "$listTitle"]);
			if (self.$isPersistent !== false) $links.$query = _getLink("$query", tr ? tr + (self.$listTitleSuffix || "") : entity.$listTitle || locale.format(module, "listOf", self.plural));
		}
		if (reprType === "$edit") {
			resource.$actions = resource.$actions || {};
			if (self.$canSave !== false) {
				resource.$actions.$save = resource.$actions.$save || {
					$title: locale.format(module, "saveActionTitle"),
					$isDisabled: true,
					$links: {
						$details: _getLink("$details", locale.format(module, "ok"), "", self.name),
						$query: _getLink("$query", locale.format(module, "backToList"), "", self.name),
					}
				};
				if (self.$canCreate !== false) {
					resource.$actions.$save.$links.$create = _getLink("$create", _getTranslatedString(stringRes, [self.alias, "$createActionTitle"]) || locale.format(module, "newLinkTitle", self.name), "", self.name);
					resource.$actions.$save.$links.$create.$isHidden = (self.$isPersistent === false);
				}
				resource.$actions.$save.$links.$details.$isHidden = (self.$isPersistent === false);
				resource.$actions.$save.$links.$query.$isHidden = (self.$isPersistent === false);
			}
		}
		if (entity.$helpPage) {
			$links.$help = {
				$url: "{$baseHelpUrl}/" + entity.$helpPage + '.html',
				$title: locale.format(module, "helpTitle"),
				$type: "text/html",
				$target: "help",
			};
		}
		// actions, links services
		self.addServicesLinks(reprType, resource);
		// PDFHACK: not for 7.0
		// if (_isEntityCapableOf(entity, "pdfReport")) {
		// 	$links.$print = _getLink(reprType, locale.format(module, "print"));
		// 	$links.$print.$type = "application/pdf";
		// }
		// $lookup and $select items should only have $details link
		if (["$lookup", "$select"].indexOf(reprType) >= 0) {
			resource.$links = {
				$details: _getLink("$details", locale.format(module, "detailsLinkTitle"))
			};
		}
	},
	getPrototype: function(_, reprName, facetName, isChild, childPrefix, visited, options) {
		return (this.$getPrototype && this.$getPrototype(_, reprName, facetName)) || _getEntityPrototype(_, this._model, this, reprName, facetName, isChild, childPrefix, visited, options);
	},
	makeDigest: function(_, db) {
		var self = this;
		if (!self.$allowSync) return null;
		// get current counter value
		var cnt = self.getCounterValue(_, db, "tick");
		if (!cnt) return null;
		if (!self._endpoint) {
			var dataModel = require("./dataModel");
			var syncData = dataModel.getSyncData(_, db);
			self._endpoint = syncData[0] + self.plural;
			self.getCounterValue(_, db, "tick", {
				data: {
					endpoint: self._endpoint,
					conflictPriority: +syncData[1]
				}
			});
		}
		var dig = [{
			$endpoint: self._endpoint,
			$tick: cnt.value,
			$conflictPriority: cnt.data.conflictPriority,
			$stamp: new Date()
		}];
		if (cnt.data.digest) {
			for (var key in cnt.data.digest) {
				var item = cnt.data.digest[key];
				dig.push({
					$conflictPriority: item.c,
					$endpoint: item.e,
					$stamp: item.s,
					$tick: item.t
				});
			}
		}
		return {
			$origin: self._endpoint,
			$resources: dig
		};
	},
	tick: function(_, db) { // atomically increases the tick and sets the local endpoint for the digest of this entity
		var entity = this;
		if (!entity.$allowSync) throw new Error(locale.format(module, "noSyncInfo", entity.name));
		var val = entity.getCounterValue(_, db, "tick", {
			increment: 1
		});
		return val.value;

	},
	saveDigest: function(_, db, digest) {
		var entity = this;
		if (!entity.$allowSync) throw new Error(locale.format(module, "noSyncInfo", entity.name));
		for (var i = 0; i < digest.$resources.length; i++) {
			if (digest.$resources[i].$endpoint === digest.$origin) {
				var localPart = digest.$resources.splice(i, 1)[0];
				var data = {
					digest: digest.$resources.map(function(res) {
						res = res || {};
						return {
							c: res.$conflictPriority,
							e: res.$endpoint,
							s: res.$stamp,
							t: res.$tick
						};
					}),
					conflictPriority: +localPart.$conflictPriority
				};
				entity.getCounterValue(_, db, "tick", {
					data: data,
					value: +localPart.$tick
				});
				return;
			}
		}
		throw new Error(locale.format(module, "noOrigin"));
	},
	getModel: function() {
		return this._model;
	},
	getSearchFacets: function(_) {
		return this.$facets;
	},
	getSearchFields: function(_) {
		return this.$searchIndex && this.$searchIndex.$fields;
	},
	isCapableOf: function(cap) {
		return _isEntityCapableOf(this, cap);
	},
	getLink: function(facet, title, params, representation) {
		return _getLink(facet, title, params, this.name, representation);
	},
	getMeta: function(parameters, forceChildren) {
		var entity = this;
		return _getMeta(entity, entity.plural, parameters || {}, true, false, forceChildren, 0);
	},
	_solveTargetEntities: function() {
		var entity = this;
		var model = entity.getModel();
		var entities = model._entities;
		var name = entity.name;
		forEachKey(entity.$relations, function(relName, rel) {
			var singular = rel.type && model.singularize(rel.type);
			rel.isPlural = rel.$isPlural = (rel.hasOwnProperty("$isPlural") || rel.hasOwnProperty("isPlural")) ? (rel.isPlural || rel.$isPlural) : (singular != null);
			if (rel.isPlural) {
				if (singular) {
					rel.targetEntity = find(entities, singular);
				} else if (rel.$variants) {
					Object.keys(rel.$variants).forEach(function(vName) {
						var v = rel.$variants[vName];
						v.type = v.type || v.$type;
						v.targetEntity = find(entities, v.type);
					});
				}
				if (!rel.defaultOrder) {
					if (rel.$capabilities && (rel.$capabilities.split(",").indexOf("reorder") >= 0)) rel.defaultOrder = "$index";
					else rel.defaultOrder = rel.targetEntity && rel.targetEntity.defaultOrder;
				}
			} else {
				if (rel.type) {
					if (!entities[rel.type]) throw new Error(entity.name + ": relation '" + relName + "' targets unknown type: " + rel.type);
					rel.targetEntity = find(entities, rel.type);
				} else if (rel.$variants) {
					Object.keys(rel.$variants).forEach(function(vName) {
						var v = rel.$variants[vName];
						v.type = v.type || v.$type;
						v.targetEntity = find(entities, v.type);
					});
				}
			}
			//
			if (rel.targetEntity && !rel.isComputed) {
				rel.targetEntity.referingEntities = rel.targetEntity.referingEntities || {};
				rel.targetEntity.referingEntities[name] = rel.targetEntity.referingEntities[name] || [];
				rel.targetEntity.referingEntities[name].push(relName);
			}
			//
			var inv = rel.inv && rel.targetEntity && rel.targetEntity.$relations[rel.inv];
			// !!! for now, inv not managed for variants
			/*if (!inv && rel.$variants) {
				// all relations in variants should be homogenous, so just pick the first
				var firstName = Object.keys(rel.$variants)[0];
				var firstVar = firstName && rel.$variants[firstName];
				if (firstVar && firstVar.inv) inv = firstVar.targetEntity.$relations[firstVar.inv];
			}*/
			// classify with relType
			if (rel.isPlural) {
				if (rel.getIsChild()) rel.relType = "children";
				else if (inv && inv.isPlural) rel.relType = "association";
				else rel.relType = "link";
			} else {
				if (rel.getIsChild()) rel.relType = "child";
				else if (inv && inv.getIsChild()) rel.relType = "parent";
				else rel.relType = "reference";
			}
		});
	},
	_checkReverseRelations: function() {
		var entity = this;
		forEachKey(entity.$relations, function(relName, rel) {
			if (!rel.targetEntity && !rel.$variants && !rel.$isDynamicType) throw new Error(entity.name + "." + relName + ": target entity undefined");
			// TODO: check inv for dynamicType case
			if (!rel.targetEntity) return;
			var inv = rel.targetEntity.$relations[rel.inv];
			if (inv) {
				if (!inv.targetEntity) throw new Error(rel.targetEntity.name + "." + inv.name + ": target entity undefined");
				if (inv.targetEntity != entity) throw new Error(rel.targetEntity.name + "." + inv.name + ": expected type=" + entity.name + ", got type=" + inv.targetEntity.name);
				if (!inv.inv) inv.inv = rel.name;
				if (inv.inv != rel.name) throw new Error(rel.targetEntity.name + "." + inv.name + ": expected inv=" + rel.name + ", got inv=" + inv.inv);
			}
		});
	},
	_dependencyOf: function(_) {
		var model = this.getModel();
		var entities = model._entities;
		var deps = [];
		var self = this;
		Object.keys(entities).forEach_(_, function(_, key) {
			var entity = entities[key];
			forEachKey(entity.$relations, function(relName, rel) {
				var singular = rel.type && model.singularize(rel.type);
				if (singular === self.name) deps.push(entity.name);
			});
		});
		return deps;
	},
	/// -------------
	/// ## getCounterValue function :
	/// ``` javascript
	/// var value = db.getCounterValue(_, name, options);
	/// ```
	/// manages counters for this entity with name as unique key.
	/// options:
	/// * value: if set it will update the counter value to the given value
	/// * increment: if set counter value will be increment by the given value
	/// * data: object that will be saved with the counter. Update of this is differential, meaning that property not in object
	///     aren't updated. To delete a property it must be set to null
	/// if (!value && !increment) existing value is returned without modification
	/// data is updated even if counter value is not modified
	///
	/// return value is in form of:
	/// ``` javascript
	/// {
	///   value: 152,
	///   data: {
	///     "...": "..."
	///   }
	/// }
	///
	getCounterValue: function(_, db, code, options) {
		return db.getCounterValue(_, this.name, code, options);
	}
});