"use strict";

/// !doc
/// # Factory API
/// ```javascript
/// var factory = require('syracuse-orm/lib/factory')
/// ```
///

// TODO : centralized management of $init, apply on childrens too
var datetime = require('@sage/syracuse-core').types.datetime;
var globals = require('streamline-runtime').globals;
var helpers = require('@sage/syracuse-core').helpers;
var httpHelpers = require('@sage/syracuse-core').http;
var forEachKey = helpers.object.forEachKey;
var types = require('@sage/syracuse-core').types;
var resourceHelpers = require('@sage/syracuse-core').resource.util;
var flows = require('streamline-runtime').flows;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var admHelper;
var fileStoreFactory = require("./fileStoreFactory");
var locale = require('streamline-locale');
var Template = require('@sage/syracuse-core').resource.proxy.Template;
//
var serializer = require("syracuse-orm/lib/serializer");
var signSerializer = new serializer.SignSerializer();
var saveSerializer = new serializer.SaveSerializer("$snapshot");
//
var parser = require('@sage/syracuse-sdata-parser');
var sdataAsync = require("syracuse-sdata/lib/sdataAsync");
var checksum = require("./checksum");
var perfmon = require('../../../src/perfmon/record');
var sys = require("util");
var base64; // encryption
var config = require('config');
var jsurl = require("jsurl");

var nocache = config && config.hosting && config.hosting.nocache;

try {
	// if heapdump is not installed require.resolve will throw
	// if it is installed we test the module cache to see if it has been loaded.
	var heapdumpLoaded = !!require('module')._cache[require.resolve('heapdump')];
} catch (ex) {}

var config = {};
var factoryTracer = require('@sage/syracuse-core').getTracer("orm.factory");

var queryFacets = ["$query", "$lookup", "$select", "$bulk", "$search"];

function _errorWithLog(message) {
	//	console.error(message);
	factoryTracer.error && factoryTracer.error(message);
}

function _addUrlParam(url, name, value, appendEmpty) {
	if (!value && !appendEmpty) return url;
	return url + (url.indexOf("?") >= 0 ? "&" : "?") + name + "=" + value;
}

function _normalizeDiag(diag) {
	return {
		$severity: diag.$severity || diag.severity,
		$message: diag.$message || diag.message,
		$links: diag.$links,
		$stackTrace: diag.$stackTrace
	};
}

function _getTranslatedString(stringResources, parts, combineParts) {
	if (!stringResources || !parts || !parts.length) return "";
	for (var i = 0; i < (combineParts ? parts.length : 1); i++) {
		var str = stringResources[parts.slice(i).join(".")];
		//console.log("resource for : "+parts.slice(i).join(".")+"="+str);
		if (str) return str;
	}
}

// checks if "testParent" is parent of "instance"

function _instanceParentOf(testParent, instance) {
	var visited = []; // prevent looping
	var parent = instance;
	while (parent._parent) {
		if (parent._parent === testParent) return true;
		if (visited.indexOf(parent._parent.$uuid) >= 0) throw new Error("INTERNAL ERROR: Looping detected in getTopInstance");
		parent = parent._parent;
		visited.push(parent.$uuid);
	}
	return false;
}

function getTopInstance(instance) {
	var visited = []; // prevent looping
	var parent = instance._parent || instance;
	while (parent._parent) {
		if (visited.indexOf(parent._parent.$uuid) >= 0) throw new Error("INTERNAL ERROR: Looping detected in getTopInstance");
		parent = parent._parent;
		visited.push(parent.$uuid);
	}
	return parent;
}

function _formatValue(prop, val) {
	return resourceHelpers.formatValue(prop, val);
}


function _addRights(_, ent, params) {
	var tracer = config.tracer; // || console.log;
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("filters.addRights found security profile: " + sp.code(_));
		var r = sp.canReadClass(_, ent.name);
		if (typeof r === "boolean") {
			if (r === false) {
				tracer && tracer("read of class " + ent.name + " denied");
				return false;
			}
		} else {
			// filter is a sdata condition
			r = sp.replacePredefinedVars(_, r);
			//
			factoryTracer.debug && factoryTracer.debug("filters.addRights add where: " + r);
			var f = parser.parse(r);
			if (params.where) params.where = {
				type: "operator",
				value: {
					code: "and"
				},
				children: [params.where, f]
			};
			else params.where = f;
		}
	} else tracer && tracer("security profile not found for " + ent.name);
	return true;
}

function hasFactoryRights(_, _inst, key, noDiag) {
	function hasPropRights(_) {
		if (_inst.$factory && !_canModifyFactoryInstance(_, _inst)) {
			if (!noDiag) _inst.$addError(locale.format(module, "updateFactoryPropertyForbidden", _inst._meta._allProperties[key].title, _inst.getEntity(_).title, _inst.$factoryOwner));
			return false;
		}
		return true;
	}

	function checkInstanceRights(_) {
		// Check instance itself
		//          If the key occurs in factoryExcludes (and factoryExcludes exists), do nothing (independent of factoryIncludes)
		//         If the key occurs in factoryIncludes: return false when hasPropRights(_) is not true,
		//         If factoryExcludes exists but the key is not in factoryExcludes: return false when hasPropRights(_) is not true
		//         In all other cases do nothing
		// function can only occur in context where _inst is not undefined
		var instmeta = _inst && _inst._meta;
		// condition "_inst.$factory" has been put in front because hasPropRights will only return false if this condition is true
		if (hasRight && instmeta && _inst.$factory && instmeta.$properties.hasOwnProperty(key)) {
			// Do not protect localizations
			var isLocalized = instmeta.$properties.hasOwnProperty(key) && instmeta.$properties[key].$isLocalized;
			if (isLocalized) return true;
			var factoryExcludes = instmeta.$factoryExcludes;
			if (factoryExcludes) {
				if (factoryExcludes.indexOf(key) === -1 && !hasPropRights(_)) return false;
			} else {
				var factoryIncludes = instmeta.$factoryIncludes;
				if (factoryIncludes && factoryIncludes.indexOf(key) !== -1 && !hasPropRights(_)) return false;
			}
		}
		// $factory protect
		if (key === "$factory") {
			if (_inst.$factory == null && !_canModifyFactoryInstance(_, _inst, true)) {
				if (!noDiag) _inst.$addError(locale.format(module, "createFactoryForbidden"));
				return false;
			} else if (_inst.$factory && !_canModifyFactoryInstance(_, _inst)) {
				if (!noDiag) _inst.$addError(locale.format(module, "ownFactoryForbidden", _inst.getEntity(_).title, _inst.$factoryOwner));
				return false;
			}
		}
		return true;
	}


	var hasRight = true;
	// #4928: Factory security
	if (key) {
		// Check parent
		if (_inst && _inst._relation && _inst._parent) {
			if (_inst._parent._meta.$allowFactory) {
				hasRight = hasFactoryRights(_, _inst._parent, _inst._relation.name, noDiag);
				if (!hasRight) {
					if (!noDiag) _inst.$diagnoses = helpers.object.clone(_inst._parent.$diagnoses, true);
					return false;
				}
			} else if (!checkInstanceRights(_)) {
				if (!noDiag) _inst.$addError(locale.format(module, "updateFactoryForbidden", _inst.getEntity(_).name, _inst.$factoryOwner));
				return false; // avoid twice invocation of checkInstanceRights(_)
			} else {
				return hasRight;
			}
		}
		if (!checkInstanceRights(_)) return false;
	} else if (_inst.$factory && !_canModifyFactoryInstance(_, _inst)) {
		if (!noDiag) _inst.$addError(locale.format(module, "updateFactoryForbidden", _inst.getEntity(_).name, _inst.$factoryOwner));
		hasRight = false;
	}
	return hasRight;
}

var protectOnly = "SAGE";

function canUpdateRelation(_, _inst, _rel, _key, isInv) {
	var _relInfo = _inst._meta._$relations[_key];

	function allowUnlinkPluralInv(_) {
		if (_relInfo.inv && _relInfo.isPlural) {
			var _r = _rel[_relInfo.inv] && _rel[_relInfo.inv](_);
			if (_r && _r.get) {
				var _relProp = _r.get(_, _inst.$uuid);
				return _relProp && _relProp.$allowFactoryUnlink;
			}
		}
		return false;
	}
	if (_rel && !_rel.$allowFactoryUnlink && _inst && _inst._meta._$relations && _relInfo && !allowUnlinkPluralInv(_)) {
		var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
		var childWithRelationKey = _rel.$childRecord && _rel._relation && _rel._relation && _rel._relation.$factoryRelationKey && _rel[_rel._relation.$factoryRelationKey](_);
		// protect links between SAGE factory elements
		// for this instance related
		if (sp && _inst.$factoryOwner === protectOnly && sp.factoryOwner(_) !== protectOnly) {
			var msg, _instTpl;
			if (_inst.$factoryOwner === _rel.$factoryOwner) {
				_instTpl = _inst._meta.$valueTemplate && _inst._meta.$valueTemplate.resolve(_inst.serializeInstance(_));
				var _relTpl = _rel._meta.$valueTemplate && _rel._meta.$valueTemplate.resolve(_rel.serializeInstance(_));
				if (isInv) {
					msg = locale.format(module, "protectedFactoryRef", _rel.getEntity(_).name, _relTpl, _inst.getEntity(_).name, _instTpl, _inst.$factoryOwner);
				} else {
					msg = locale.format(module, "protectedFactoryRef", _inst.getEntity(_).name, _instTpl, _rel.getEntity(_).name, _relTpl, _inst.$factoryOwner);
				}
				// Put diagnose
				_inst.$addError(msg);
				if (_inst._parent) _inst._parent.$addError(msg);
				return false;
			}
			// case of child relation where $factoryRelationKey metadata is set on entity relation declaration (see landingPage entity and vignettes relation for instance)
			else if (childWithRelationKey && childWithRelationKey.$factoryOwner === _inst.$factoryOwner) {
				_instTpl = _inst._meta.$valueTemplate && _inst._meta.$valueTemplate.resolve(_inst.serializeInstance(_));
				var _childTpl = childWithRelationKey._meta.$valueTemplate && childWithRelationKey._meta.$valueTemplate.resolve(childWithRelationKey.serializeInstance(_));
				msg = locale.format(module, "protectedFactoryRef", _inst.getEntity(_).name, _instTpl, _rel.getEntity(_).name, _childTpl, _inst.$factoryOwner);
				// Put diagnose
				_inst.$addError(msg);
				if (_inst._parent) _inst._parent.$addError(msg);
				return false;
			}
		}
	}
	return true;
}

function hasFactoryCapability(_) {
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	return sp && sp.hasFactoryRights(_);
}

var _canModifyFactoryInstance = function(_, instance, ignoreInstance) {
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	return sp && sp.canUpdateFactoryInstance(_, instance, ignoreInstance);
};

function _canCreateInstance(_, instance) {
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("factory._canCreateInstance found security profile: " + sp.code(_));
		var r = sp.canCreateClass(_, instance.getEntity(_).name, true);
		if (typeof r === "boolean") {
			if (r === false) {
				return false;
			}
		} else {
			// filter is a sdata condition
			r = sp.replacePredefinedVars(_, r);
			//
			factoryTracer.debug && factoryTracer.debug("filters.canCreateInstance add where: " + r);
			return instance.match(_, parser.parse(r));
		}
	}
	//
	return true;
}

function _canUpdateInstance(_, instance) {
	// security SAM-118797: it is not possible to handle the security level with sdata filter
	// we introduce a function in the entity to check the rights
	// a later enhancement would be to have paging management that is not only based on the mongoDB paging in order to not return the instance.
	if (instance.$allowUpdate && !instance.$allowUpdate(_)) {
		instance.$addError(locale.format(module, "conditionFailed", "not enough rights"));
		return false;
	}

	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("factory._canUpdateInstance found security profile: " + sp.code(_));
		var r = sp.canUpdateClass(_, instance.getEntity(_).name);
		if (typeof r === "boolean") {
			if (r === false) {
				return false;
			}
		} else {
			// filter is a sdata condition
			r = sp.replacePredefinedVars(_, r);
			//
			factoryTracer.debug && factoryTracer.debug("filters.canUpdateInstance add where: " + r);
			var res = instance.match(_, parser.parse(r));
			if (!res) {
				instance.$addError(locale.format(module, "conditionFailed", r));
			}
			return res;
		}
	}
	//
	return true;
}

function _canDeleteInstance(_, instance) {
	// security: see _canUpdateInstance
	if (instance.$allowDelete && !instance.$allowDelete(_)) {
		instance.$addError(locale.format(module, "conditionFailed", "not enough rights"));
		return false;
	}

	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("factory._canDeleteInstance " + instance._meta.name + " found security profile: " + sp.code(_));
		var r = sp.canDeleteClass(_, instance.getEntity(_).name);
		if (typeof r === "boolean") {
			if (r === false) {
				return false;
			}
		} else {
			// filter is a sdata condition
			r = sp.replacePredefinedVars(_, r);
			//
			factoryTracer.debug && factoryTracer.debug("filters.canDeleteInstance add where: " + r);
			return instance.match(_, parser.parse(r));
		}
	}
	//
	return true;
}

function _getTargetEntity(_, model, relation, type, variantType) {
	var targetType = null;
	if (relation.$variants) {
		var vType = variantType || _getVariantType(relation.$variants, type);
		if (vType && relation.$variants[vType]) targetType = relation.$variants[vType].targetEntity;
		if (!targetType) throw new Error(locale.format(module, "varTargetTypeNotFound", relation.name, vType));
	} else {
		if (relation.$isDynamicType && type) {
			targetType = model.getEntity(_, type);
			if (!targetType) throw new Error(locale.format(module, "dynTargetTypeNotFound", relation.name, type));
		} else {
			targetType = relation.targetEntity;
			if (!targetType) throw new Error(locale.format(module, "targetTypeNotFound", relation.name));
		}
	}
	return targetType;
}

function _getVariantType(variants, typeName) {
	var res = typeName;
	var vv = variants || {};
	Object.keys(vv).some(function(vName) {
		if (vv[vName].$type === typeName) {
			res = vName;
			return true;
		}
		return false;
	});
	factoryTracer.debug && factoryTracer.debug("factory._getVariantType resolve variant " + typeName + " in " + Object.keys(vv) + "=" + res);
	return res;
}




function _getPropertiesResourceMeta(_, resource, instance) {

	function _internalGetMeta(_, key, prop, isRelation) {
		var resprop;
		if (!hasFactoryRights(_, instance, key, true)) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$isDisabled = true;
		}
		if (prop.$isMandatory && (typeof prop.$isMandatory === "function")) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$isMandatory = prop.$isMandatory(_, instance);
		}
		if (prop.$isHidden && (typeof prop.$isHidden === "function")) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			// security profile may set this prop before, so MUST or
			resprop.$isHidden = resprop.$isHidden || prop.$isHidden(_, instance);
		}
		if (prop.$isDefined && (typeof prop.$isDefined === "function")) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$isHidden = !prop.$isDefined(_, instance);
		}
		// rearranged for performance
		if (prop.$isDisabled && (typeof prop.$isDisabled === "function") && (!resprop || !resprop.$isDisabled)) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$isDisabled = prop.$isDisabled(_, instance);
		}
		if (prop.$isReadOnly && (typeof prop.$isReadOnly === "function")) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$isReadOnly = prop.$isReadOnly(_, instance);
		}
		if (prop.$description && (typeof prop.$description === "function")) {
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			resprop.$description = prop.$description(_, instance);
		}

		if (prop.$minimum && (typeof prop.$minimum === "function")) {
			// conditional mandatory
			resource.$properties[key] = resource.$properties[key] || {};
			resource.$properties[key].$minimum = prop.$minimum(_, instance);
		}

		if (prop.$enum && (typeof prop.$enum === "function")) {
			// conditional mandatory
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			var v = resprop.$value = resprop.$value || {};
			v.$type = prop.getMimeType();
			v.$enum = prop.$enum(_, instance);
		}
		if (prop.$lookup && (typeof prop.$lookup === "function")) {
			// conditional lookup
			var p = resprop = resource.$properties[key] = resource.$properties[key] || {};
			var res_lookup = prop.$lookup(_, instance);
			if (res_lookup) {
				if (isRelation) p = p.$item = p.$item || {};
				p.$links = {
					$lookup: res_lookup
				};
			}
		}
		if (prop.$select && (typeof prop.$select === "function")) {
			// conditional lookup
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			var res_select = prop.$select(_, instance);
			if (res_select) resprop.$links = {
				$select: res_select
			};
		}
		if (prop.$filterRepresentation && (typeof prop.$filterRepresentation === "function")) {
			// conditional lookup
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			var res_repr = prop.$filterRepresentation(_, instance);
			if (res_repr) {
				resprop.$links = {
					$prototype: res_repr
				};
				resprop.$links.$prototype.$isHidden = true;
			}
		}
		if (prop.isExternalStorage && prop.isExternalStorage()) {
			if (prop.$url && (typeof prop.$url === "function")) {
				if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
				resprop.$url = prop.$url(_, instance);
			}
		}
		if (prop.$details && (typeof prop.$details === "function")) {
			if (!resprop) resprop = resource.$properties[key] = resource.$properties[key] || {};
			var det = prop.$details(_, instance);
			if (det) {
				resprop.$links = {
					$details: det
				};
			}
		}
	}

	var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
	resource.$properties = resource.$properties || {};

	// direct loop to increase performance
	var obj = instance._meta.$properties;
	var keys = Object.keys(obj);
	var j = keys.length;
	var key;
	while (--j >= 0) {
		_internalGetMeta(_, key = keys[j], obj[key]);
	}
	var obj = instance._meta.$relations;
	var keys = Object.keys(obj);
	var j = keys.length;
	var key;
	while (--j >= 0) {
		_internalGetMeta(_, key = keys[j], obj[key], true);
	};


	var entity = instance.getEntity(_);
	var stringRes = entity.contract && entity.contract.resources && entity.contract.resources();

	if (instance._meta.$allowFactory) {
		var allowFactory = true;
		if (typeof instance._meta.$allowFactory === "function") {
			allowFactory = instance._meta.$allowFactory(_, instance);
		}
		resource.$properties.$factory = resource.$properties.$factory || {};
		resource.$properties.$factoryOwner = resource.$properties.$factoryOwner || {};
		if (!allowFactory || !hasFactoryCapability(_)) {
			resource.$properties.$factory.$isHidden = true;
			if (!resource.$factory) resource.$properties.$factoryOwner.$isHidden = true;
		} else {
			resource.$properties.$factory.$isHidden = false;
			resource.$properties.$factoryOwner.$isHidden = false;
			if (!hasFactoryRights(_, instance, "$factory", true)) {
				resource.$properties.$factory.$isDisabled = true;
			}
		}
	}

	// actions
	flows.eachKey(_, instance._meta.$actions, function(_, key, action) {
		if (typeof action === "function") {
			var a = action(_, instance);
			if (a && Object.keys(a).length > 0) {
				resource.$actions = resource.$actions || {};
				resource.$actions[key] = a;
			}
		}
	});
	// links
	if (instance._meta.$links) {
		if (typeof instance._meta.$links === "function") {
			var lks = instance._meta.$links(_, instance);
			resource.$links = resource.$links || {};
			Object.keys(lks).forEach(function(lk) {
				resource.$links[lk] = lks[lk];
				if (resource.$links[lk]) {
					resource.$links[lk].$title = _getTranslatedString(stringRes, [entity.alias, "$links", lk, "$title"], true) || resource.$links[lk].$title || lk;
					resource.$links[lk].$description = _getTranslatedString(stringRes, [entity.alias, "$links", lk, "$description"], true) || resource.$links[lk].$description || null;
				}
			});
		} else {
			flows.eachKey(_, instance._meta.$links, function(_, key, link) {
				if (typeof link === "function") {
					var l = link(_, instance);
					if (l) {
						resource.$links = resource.$links || {};
						resource.$links[key] = l;
						if (resource.$links[key]) {
							resource.$links[key].$title = _getTranslatedString(stringRes, [entity.alias, "$links", key, "$title"], true) || resource.$links[key].$title || key;
							resource.$links[key].$description = _getTranslatedString(stringRes, [entity.alias, "$links", key, "$description"], true) || resource.$links[key].$description || null;
						}
					}
				}
			});
		}
	}
	// services
	if (instance._meta.$services) {
		if (typeof instance._meta.$services === "function") {
			var lks = instance._meta.$services(_, instance);
			resource.$links = resource.$links || {};
			Object.keys(lks).forEach(function(lk) {
				resource.$links[lk] = lks[lk];
			});
		} else {
			flows.eachKey(_, instance._meta.$services, function(_, key, link) {
				if (typeof link === "function") {
					var l = link(_, instance);
					if (l) {
						resource.$links = resource.$links || {};
						resource.$links[key] = l;
					}
				} else {
					if (sp && !sp.canExecuteService(_, instance._meta.name, key)) {
						resource.$links = resource.$links || {};
						resource.$links[key] = resource.$links[key] || {};
						resource.$links[key].$isHidden = true;
					} else if (typeof link.$isDefined === "function") {
						resource.$links = resource.$links || {};
						resource.$links[key] = resource.$links[key] || {};
						resource.$links[key].$isHidden = !link.$isDefined(_, instance);
					}
					if (link.$isDisabled && (typeof link.$isDisabled === "function")) {
						var useDisabledFunc = true;
						if (link.$facets) {
							var currentFacet = globals.context && globals.context.sdataContext && globals.context.sdataContext.representation && globals.context.sdataContext.representation.type;
							if (currentFacet && link.$facets.indexOf(currentFacet) === -1) {
								useDisabledFunc = false;
							}
						}
						if (useDisabledFunc) {
							resource.$links = resource.$links || {};
							resource.$links[key] = resource.$links[key] || {};
							resource.$links[key].$isDisabled = link.$isDisabled(_, instance);
						}
					}
				}
			});
		}
	}
	flows.eachKey(_, instance.$links, function(_, key, link) {
		var l = (typeof link === "function") ? link(_, instance) : link;
		if (l) {
			resource.$links = resource.$links || {};
			resource.$links[key] = l;
		}
	});
	// security
	if (sp && !config.showRights) {
		factoryTracer.debug && factoryTracer.debug("serialize found security profile: " + sp.code(_));
		var l;
		if (!sp.canUpdateClass(_, instance._meta.name)) {
			resource.$links = resource.$links || {};
			l = resource.$links.$edit = resource.$links.$edit || {};
			l.$isHidden = true;
			//
			resource.$actions = resource.$actions || {};
			var a = resource.$actions.$save = resource.$actions.$save || {};
			a.$isHidden = true;
		}
		if (!sp.canDeleteClass(_, instance._meta.name)) {
			resource.$links = resource.$links || {};
			l = resource.$links.$delete = resource.$links.$delete || {};
			l.$isHidden = true;
		}
	}
}

function _makeLazyUrl(url, propName, segment) {
	var lazyUrl;
	if (url) {
		lazyUrl = url.split("?");
		lazyUrl[0] += (segment ? "/" + segment : "") + "/" + propName;
		lazyUrl = lazyUrl.join("?");
	} else lazyUrl = "{$baseUrl}/{$pluralType}('{$key}')" + (segment ? "/" + segment : "") + "/" + propName;
	return lazyUrl;
}

var _propTypeFormaterMap = {
	graph: function(property, instance) {
		return {
			$url: _makeLazyUrl(instance.$url, property.name, "$graphs"),
			$type: property.$type
		};
	},
	"tag-cloud": function(property, instance) {
		return {
			$url: _makeLazyUrl(instance.$url, property.name, "$tagClouds"),
			$type: property.$type
		};
	}
};

function _createSnapshot(_, instance, type) {
	// allready a snapshot
	if (instance._snapshotType || !instance.$uuid) return;
	//
	factoryTracer.debug && factoryTracer.debug("factory._createSnapshot: $uuid: " + instance.$uuid);
	//
	instance.lockInstance(_);
	//
	var data = instance._data;
	var copy = {
		$isSnapshot: true,
		$signature: data.$signature
	};
	forEachKey(instance._meta.$properties, function(name, prop) {
		var v = data[name];
		if (v != null) {
			if (Array.isArray(v)) v = v.slice(0);
			if (prop.$isLocalized || prop.isExternalStorage())
			//			if(typeof v === "object")
				copy[name] = _clone(v);
			else
			// use formatValue as passes through the same code that treats database data
				copy[name] = _formatValue(prop, v);
		}
	});
	var snapshot = instance._meta.factory.createInstance(_, copy, instance._db, instance._context);

	// relations
	flows.eachKey(_, instance._meta.$relations, function(_, name, prop) {
		var v = data[name];
		if (v != null) {
			if (prop.isPlural) {
				var coll = snapshot[name](_);
				// for collections, create a snapshot collections pointing to the org. collection elements
				/*				flows.eachKey(_, v._data, function(_, uuid, elt){
					coll._data[uuid] = elt;
				});*/
				coll._data = null;
				coll._array = v._array.slice(0);
			} else
			// snapshot continues to point to the same instance of the relation. This should be right as
			// the instance has her own snapshot in case of modification
			// direct copy as _setRel might trigger rules
			//				snapshot[name](_, v);
				snapshot._data[name] = v;
		}
	});


	snapshot._snapshotType = type;
	factoryTracer.debug && factoryTracer.debug("factory._createSnapshot exit: $uuid: ");

	// copy factory information
	snapshot.$factoryOwner = instance.$factoryOwner;
	snapshot.$factory = instance.$factory;
	return snapshot;
}

function _serializeExternalStorageProperty(_, instance, propName) {
	factoryTracer.debug && factoryTracer.debug("factory._serializeExternalStorageProperty enter: " + instance.$uuid);
	var key = propName;
	if (!instance[key](_)) return null;
	if (!instance[key](_).fileExists(_)) return null;
	var property = instance._meta.$properties[key];
	var storeProps = instance[key](_).getProperties(_) || {};
	factoryTracer.debug && factoryTracer.debug("factory._serializeExternalStorageProperty properties: " + sys.inspect(storeProps));
	var url = "";
	if (property.$url) {
		url = (typeof property.$url === "function") ? property.$url(_, instance) : property.$url;
	} else url = _makeLazyUrl(instance.$url, key);
	return {
		$uuid: instance[key](_).getUuid(),
		// crnit 150417 : property's url should come from prototype as in case of children relation it is the only place
		// where we can build a full url with relations list like /master('key')/children1('key')/children2('key')/prop
		$url: property.$forceUrl ? url : null,
		$type: property.$type,
		$contentType: storeProps.contentType,
		$fileName: storeProps.fileName,
		$length: storeProps.length
	};
}

function _serializeReference(_, instance, relMeta, options) {
	function _addMatches(t) {
		if (t && t.matches) {
			t.matches.forEach(function(e) {
				var m = e.substring(1, e.length - 1);
				if (_matches.indexOf(m) < 0) _matches.push(m);
			});
		}
	}
	if (!instance) return null;
	var entity = instance.getEntity(_);
	var result = {};
	var res;
	var varType;
	if (relMeta.$variants) {
		factoryTracer.debug && factoryTracer.debug("factory._serializeReference has variant of type: " + instance.$variantType);
		varType = instance.$variantType || _getVariantType(relMeta.$variants, entity.name);
	}
	if (relMeta.getIsChild(varType) || relMeta.$serializeAll || (options && (options.select || options.include))) {
		factoryTracer.debug && factoryTracer.debug("factory._serialize child reference: " + relMeta.name);
		res = _serialize(_, instance, false, false, relMeta, options);
		if (relMeta.$variants) result[varType] = res;
		else result = res;
	} else {
		factoryTracer.debug && factoryTracer.debug("factory._serialize reference: " + relMeta.name);
		//
		res = {
			$uuid: instance.$uuid,
			$key: instance.$key,
			$shortUrl: instance.$shortUrl,
			$url: instance.$url
		};
		//
		// serialize only props that compose $valueTemplate or $key
		//		var targetType = _getTargetEntity(_, instance._db.model, relMeta, instance && instance.$type);
		var targetType = instance.getEntity(_);
		var _matches = [];
		_addMatches(targetType.$valueTemplate);
		_addMatches(targetType.$valueTitleTemplate);
		var kt = targetType.$key ? (new Template(targetType.$key)) : null;
		kt && _addMatches(kt);
		// ensure load
		var i = instance;
		_matches.forEach_(_, function(_, match) {
			res[match] = i.$resolvePath(_, match);
		});
		if (relMeta.$isDynamicType) {
			res.$pluralType = targetType.plural;
			res.$representation = targetType.name;
			var t = targetType.$valueTemplate || kt;
			res.$value = t && t.resolve(res);
		}
		//
		if (relMeta.$variants) result[varType] = res;
		else result = res;
	}
	if (instance.$onSerializeReference) instance.$onSerializeReference(_, res);
	return result;
}

function _copySelOption(copy, opt, destName) {
	if (opt && (typeof opt === "object") && (Object.keys(opt).length > 0)) copy[destName] = opt;
}

// sync parameter: 0 or false: $uuid is equal to $key if instance.$syncUuid is empty
//  1 or true: $uuid is always value of instance.$syncUuid
//  2: $uuid is value of instance.$syncUuid; include also $tick, $endpoint, $stamp.
function _internalSerialize(_, instance, shallow, sync, relation, options) {
	function _toParam(struct, prefix) {
		return Object.keys(struct || {}).map(function(key) {
			var pp = (prefix ? prefix + "." : "") + key;
			var crt = struct[key];
			return (Object.keys(crt || {}).length ? _toParam(crt, pp) : pp);
		}).join(",");
	}
	if (!instance) return null;
	var opt = options || {};
	//var timing = perfmon.start(module, "factory.serialize", instance._meta.name + "." + instance.$uuid);
	//
	var meta = instance._meta;
	// security
	var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
	sp && factoryTracer.debug && factoryTracer.debug("serialize found security profile: " + sp.code(_));
	//
	var uuid, url;
	if (sync) {
		uuid = instance.$syncUuid;
		url = instance.$url || instance.computeUrlShort();
	} else {
		uuid = (instance.$syncUuid || instance.$uuid);
		url = instance.$url || instance.computeUrl();
	}
	if (opt.include) url = _addUrlParam(url, "include", _toParam(opt.include, ""));
	if (opt.select) url = _addUrlParam(url, "select", _toParam(opt.select, ""));
	var resource = {
		$uuid: uuid,
		$key: instance.$key,
		//		$trackingId: instance.$trackingId || instance.$uuid,
		$trackingId: instance.$trackingId,
		$etag: instance.$etag,
		$creUser: instance.$creUser,
		$creDate: instance.$creDate,
		$updUser: instance.$updUser,
		$updDate: instance.$updDate,
		$factory: instance.$factory,
		$factoryOwner: instance.$factoryOwner,
		$properties: instance.$properties
	};
	resource.$url = url;
	resource.$shortUrl = instance.computeUrlShort();
	if (relation) {
		var varType;
		if (relation.$variants) {
			factoryTracer.debug && factoryTracer.debug("factory._serializeReference has variant of type: " + instance.$variantType);
			varType = instance.$variantType || _getVariantType(relation.$variants, meta.name);
		}
		if (relation.getIsChild(varType)) {
			delete resource.$url;
			delete resource.$shortUrl;
		}
	}
	if (sync > 1) {
		resource.$tick = instance.$tick;
		resource.$endpoint = instance.$endpoint || instance._meta._syncEndpoint;
		resource.$stamp = instance.$stamp || instance.$updDate;
	}
	if (instance.$diagnoses && instance.$diagnoses.length) resource.$diagnoses = instance.$diagnoses;
	// add all parents uuid - usefull for childrens with expressions
	if (!shallow) {
		var parent = instance;
		var prefix = "$";
		while (parent = parent._parent)
			resource[(prefix += "parent_") + "uuid"] = parent.$uuid;
	}
	//
	if (instance.hasOwnProperty("$index")) resource.$index = instance.$index;

	// direct loop to increase performance
	var obj = meta.$properties;
	var keys = Object.keys(obj);
	var j = keys.length;
	while (--j >= 0) {
		var key = keys[j];
		var property = obj[key];
		factoryTracer.debug && factoryTracer.debug("factory._serialize property: " + key);
		if (options && options.select && !options.select[key]) continue;
		if (property.isExternalStorage() && !(instance[key](_) && instance[key](_).fileExists(_))) continue;
		// dont send password to the client
		if (property.$type === "password") continue;
		if (sp && !sp.canReadProperty(_, meta.name, key)) {
			factoryTracer.debug && factoryTracer.debug("factory._serialize property: " + key + " restricted");
			var p = resource.$properties[key] = resource.$properties[key] || {};
			p.$isHidden = true;
			continue;
		}
		//
		if (property.$isLazy || property.isExternalStorage()) {
			resource[key] = _serializeExternalStorageProperty(_, instance, key);
		} else resource[key] = (_propTypeFormaterMap[property.$type] && _propTypeFormaterMap[property.$type](property, instance)) || _formatValue(property, instance[key](_));
		//if (resource[key] && typeof resource[key] === 'object') resource[key].$pluralType = meta.plural;
	};

	var obj = meta.$relations;
	var keys = Object.keys(obj);
	var j = keys.length;
	while (--j >= 0) {
		var key = keys[j];
		var relation = obj[key];
		if (opt.select && !opt.select[key]) continue;
		if (!opt.select && shallow && relation.isPlural && !(options && options.include && options.include[key])) continue;
		// no need to serialize the inverse of a child relation
		var inv = relation.$inv && relation.targetEntity.$relations[relation.$inv];
		if (inv && inv.getIsChild()) continue; // TODO: getIsChild parameter, important for variants
		if (sp && !sp.canReadProperty(_, meta.name, key)) {
			factoryTracer.debug && factoryTracer.debug("factory._serialize relation: " + key + " restricted");
			var p = resource.$properties[key] = resource.$properties[key] || {};
			p.$isHidden = true;
			continue;
		}
		factoryTracer.debug && factoryTracer.debug("factory._serialize relation: " + instance.$uuid + "." + key);
		var val = instance[key](_);
		var cpOptions;
		if (options) {
			// copy options for this particular relation: include and select if not == empty object
			cpOptions = {};
			_copySelOption(cpOptions, options.include && options.include[key], "include");
			_copySelOption(cpOptions, options.select && options.select[key], "select");
		}
		if (relation.isPlural) {
			if (!val) throw new Error("Internal error: collection null: " + meta.name + "." + key);
			var collData = val.toArray(_, true);
			if (collData.length) resource[key] = collData.map_(_,

				function(_, elt) {
					//var r = _serialize(_, elt, !relation.getIsChild());
					var r = _serializeReference(_, elt, relation, cpOptions);
					// $index should be returned only in delta mode. In serialize we return full table
					delete r.$index;
					return r;
				});
			else resource[key] = [];
		} else {
			resource[key] = _serializeReference(_, val, relation, cpOptions);
		}
	};
	//
	_getPropertiesResourceMeta(_, resource, instance);
	// compute $key
	if (meta.$key) resource.$key = (new Template(meta.$key)).resolve(resource);
	if (meta.$valueTemplate) resource.$value = meta.$valueTemplate.resolve(resource);
	//
	factoryTracer.debug && factoryTracer.debug("factory._serialize exit: " + instance.$uuid + "-" + sys.inspect(resource));
	//timing.end();
	return resource;
}

//sync parameter: 0 or false: $uuid is equal to $key if instance.$syncUuid is empty
//1 or true: $uuid is always value of instance.$syncUuid
//2: $uuid is value of instance.$syncUuid; include also $tick, $endpoint, $stamp.

function _serialize(_, instance, shallow, sync, relation, options) {
	if (!instance) return null;
	// particular case of pages
	factoryTracer.debug && factoryTracer.debug("factory._serialize enter: " + instance.$uuid);
	if (instance.serialize) {
		return instance.serialize(_);
	}
	if (instance._data && instance._data.serialize) {
		return instance._data.serialize(_);
	}
	// non persistent object might have this
	if (instance.$serialize) {
		factoryTracer.debug && factoryTracer.debug("factory._serialize exit: ($serialize)");
		// WARNING: arguments does not have the same order to be aligned with the _internalSerialize function in the prototype
		return instance.$serialize(_, sync, shallow, relation, options);
	}
	//
	return _internalSerialize(_, instance, shallow, sync, relation, options);
}

// takes an url identifying an object and fetches the associated object. The url must be in form:
// [http://server:port]/sdata/application/contract/dataset/entities('identifier')[?...]

function _resolveDetailUrl(_, url) {
	// takes the last 4 segments of the url
	factoryTracer.debug && factoryTracer.debug("factory._resolveUrl url: " + url);
	var segs = url.split("?")[0].split("/").slice(-4);
	if (!segs[3]) return null;
	//
	var det = httpHelpers.decodeDetailSegment(segs[3]);
	if (!det) return null;
	factoryTracer.debug && factoryTracer.debug("factory._resolveUrl params: " + JSON.stringify(det));
	//
	var ep = adminHelper.getEndpoint(_, {
		application: segs[0],
		contract: segs[1],
		dataset: segs[2]
	});
	if (!ep) return null;
	//
	var db = ep.getOrm(_);
	// 
	var where = det.isExpressionId ? {
		sdataWhere: det.id
	} : det.id;
	return db.fetchInstance(_, db.getEntity(_, db.model.singularize(det.name)), where);
}

exports.fetchFromUrl = function(_, url) {
	return _resolveDetailUrl(_, url);
};

// sets and replaces global UUID. Ensures that the global UUID is really unique.
exports.setSyncUuid = function(_, context, replaceUuid) {
	// var data = JSON.parse(context.request.readAll(_));
	if (!context.linkUrl) return context.reply(_, httpHelpers.httpStatus.BadRequest, locale.format(module, "noUrl"));
	// find key of instance
	var reg = /\(\'([-\w]+)\'\)/.exec(context.linkUrl);
	var instance;
	if (reg) {
		try {
			instance = context.db.fetchInstance(_, context.entity, reg[1]);
		} catch (e) {
			console.error(e.stack);
		}
	}
	// var instance = _resolveDetailUrl(_, data.$url);
	if (!instance) return context.reply(_, 404);
	var oldInstance;
	if (!replaceUuid) {
		var newUuid;
		if (!context.syncUuid) {
			// create a uuid
			context.syncUuid = instance.$syncUuid || helpers.uuid.generate();
			newUuid = true;
		}
		if (instance.$syncUuid !== context.syncUuid) {
			if (instance.$syncUuid) return context.reply(_, httpHelpers.httpStatus.BadRequest, locale.format(module, "differentUuid", instance.$syncUuid));
			oldInstance = context.db.fetchInstance(_, context.entity, {
				jsonWhere: {
					'$syncUuid': context.syncUuid
				}
			});
			if (oldInstance) {
				if (!newUuid) return context.reply(_, httpHelpers.httpStatus.BadRequest, locale.format(module, "existentUuid"));
				context.syncUuid = helpers.uuid.generate();
			}
			instance.$syncUuid = context.syncUuid;
			instance.save(_);
		}
		return context.reply(_, 201, _serialize(_, instance, null, true));
	} else {
		if (!context.syncUuid) return context.reply(_, httpHelpers.httpStatus.BadRequest, locale.format(module, "noUuid"));
		if (context.syncUuid !== instance.$syncUuid) {
			// something has to be done
			oldInstance = context.db.fetchInstance(_, context.entity, {
				jsonWhere: {
					'$syncUuid': context.syncUuid
				}
			});
			if (oldInstance) { // unset UUID at other instance
				oldInstance.$syncUuid = null;
				oldInstance._deleteSyncUuid = true;
				oldInstance.save(_);
			}
			instance.$syncUuid = context.syncUuid;
			instance.save(_);
		}
		var erg = _serialize(_, instance, null, true);
		erg = context.reply(_, 200, erg);
		return erg;
	}
};

// resolve an instance from it's $value

function _valueToInstance(_, db, entity, val) {
	if (!val) return null;
	var valFields = entity.$valueTemplate && (entity.$valueTemplate.matches || []).map(function(m) {
		return m.substring(1, m.length - 1);
	});
	if (valFields && (valFields.length !== 1)) return null;
	var jsonWhere = {};
	jsonWhere[valFields[0]] = val[valFields[0]] || val.$value;
	return db.fetchInstance(_, entity, {
		jsonWhere: jsonWhere
	});
}

function _resourceHasValue(entity, resource) {
	if (resource) {
		// Check for $value and a non blank
		if (resource.$value && resource.$value.trim() !== "") {
			return true;
		}

		// Determine the fields from the entity
		var valFields = entity.$valueTemplate && (entity.$valueTemplate.matches || []).map(function(m) {
			return m.substring(1, m.length - 1);
		});
		if (!valFields || valFields.length !== 1) {
			return false;
		}

		// Finally check for a value present in the field
		if (resource[valFields[0]] && resource[valFields[0]].trim() !== "") {
			return true;
		}
	}

	// Failed to find a value anywhere
	return false;
}

function _getLocalizedProp(_, instance, name, property, localeCode) {
	// getter
	// compat
	var val1;
	if (typeof(val1 = instance._data[name]) === "string") return val1;
	//
	var locCode = (localeCode || globals.context.sessionLocale || locale.current).toLowerCase();
	var val = val1 && ((locCode && val1[locCode]) || val1["default"]);
	if (instance._snapshotType && val) val = val[instance._snapshotType] || val;
	//
	factoryTracer.debug && factoryTracer.debug("factory._getLocalizedProp(" + name + ")=" + val);
	return val;
}

function _applyDelta(_, context, instance, delta) {
	function _resourceToInstance(_, resource, relation, variantType, options) {
		var result;
		if (resource.$url) {
			if ((!resource.$uuid && !resource.$key) || relation.$isDynamicType) {
				result = _resolveDetailUrl(_, resource.$url);
				if (!result) {
					instance.$addDiagnose("warning", locale.format(module, "referenceNotFound", relation.name), relation.name);
					options.resolved = false;
					return;
				}
				resource.$uuid = result.$uuid;
			}
		} else if (!resource.$uuid && !resource.$key) {
			// try to fetch the instance by $value
			var ent = relation.getTargetEntity(variantType);
			if (_resourceHasValue(ent, resource)) {
				result = _valueToInstance(_, instance._db, ent, resource);
				if (!result) {
					instance.$addDiagnose("warning", locale.format(module, "referenceNotFound", relation.name), relation.name);
					options.resolved = false;
					return;
				}
				resource.$uuid = result.$uuid;
			} else {
				options.resolved = false;
				return;
			}
		}
		options.resolved = true;
		return result;
	}

	var allowedDelta = true;

	instance._errorCount = 0;
	instance.$diagnoses = [];
	instance.$properties = {};
	// will execute propagate after sysSnapshot creation
	instance.deferPropagate = [];

	// security
	var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
	sp && factoryTracer.debug && factoryTracer.debug("_applyDelta found security profile: " + sp.code(_));
	// in case of relations, we will set instances for every child relation
	factoryTracer.debug && factoryTracer.debug("factory._applyDelta input: " + sys.inspect(delta));
	flows.eachKey(_, delta, function(_, key, value) {
		factoryTracer.debug && factoryTracer.debug("factory._applyDelta key: " + key);
		// security
		if (sp && !sp.canUpdateProperty(_, instance._meta.name, key)) {
			factoryTracer.debug && factoryTracer.debug("factory._applyDelta property: " + key + " restricted");
			instance.$addError(locale.format(module, "propUpdateForbidden", key, instance._meta.name), key);
			allowedDelta = false;
			return;
		}
		var r = instance._meta && instance._meta.$relations && instance._meta.$relations[key];
		if (r && r.isPlural) {
			if (Array.isArray(value)) {
				var collection = instance[key](_);
				var oldElts = collection.toArray(_);
				// delete missing: now we detect delta mode by the $index property
				//			var receivedUuids = (delta.$properties && delta.$properties[key] && delta.$properties[key].$deleteMissing)?[]:null;
				if (value.length && !value[0]) throw new Error("Internal error: inconsistent data (null element in array)");
				var isDelta = (value.length && ((value[0].$index != null) || (value[0].$isDeleted != null)));
				var receivedUuids = isDelta ? null : [];
				//			collection._isDelta = (receivedUuids == null);
				// AS 20/11/2012: the client always sends deltas. Deleted records will always have $isDeleted: true.
				//var receivedUuids = null;
				collection._isDelta = true;
				value.forEach_(_, function(_, newElt, idx) {
					if (!newElt) return;
					// has url ?
					var varType = null;
					var rel = r;
					if (rel.$variants) {
						if (typeof value !== "object") throw new Error(locale.format(module, "objectExpected", instance._meta.name, rel.name, newElt));
						// #5024 : Each object contains a $serverIndex property, so the length to control is 2 instead of 1
						if (Object.keys(newElt).length > 2) throw new Error(locale.format(module, "invalidVariantCount", Object.keys(newElt).length));
						varType = Object.keys(newElt)[0];
						if (!rel.$variants[varType]) throw new Error(locale.format(module, "unknownVariant", rel.name, varType));
						newElt = newElt[varType];
						newElt.$variantType = varType;
					}
					var resolvedInstance = null;
					if (!collection._relMeta.getIsChild(varType)) {
						var opt = {};
						resolvedInstance = _resourceToInstance(_, newElt, collection._relMeta, varType, opt);
						if (!opt.resolved) return;
					}
					//
					if (!newElt.$uuid) {
						newElt.$uuid = helpers.uuid.generate();
					}
					// check $uuid presence for references
					if (!collection._relMeta.getIsChild(varType) && !newElt.$uuid) { // TODO: getIsChild parameter ? Important if $variants //
						instance.$addError(locale.format(module, "referenceNotFound", collection._relMeta.name), collection._relMeta.name);
						return;
					}
					//
					var k = newElt.$key || newElt.$uuid;
					receivedUuids && receivedUuids.push(k);
					if (newElt.$isDeleted) {
						factoryTracer.debug && factoryTracer.debug("factory._applyDelta isDeleted: " + k);
						// #4928: Factory security
						var _child = collection.get(_, k);
						if (_child) {
							if (!canUpdateRelation(_, instance, _child, key) || !hasFactoryRights(_, _child, key)) {
								allowedDelta = false;
								return;
							}
							collection.deleteInstance(_, k);
						}
					} else {
						var isCreated = false;
						var actualItem = collection.get(_, k);
						if (!actualItem) {
							actualItem = resolvedInstance || instance.createChild(_, key, k, r.$inlineStore && newElt, false, varType);
							if (isDelta) actualItem.$index = newElt.$index;
							collection.set(_, actualItem);

							if (actualItem.$factory && instance.$factory && sp.factoryOwner(_) !== instance.$factoryOwner && instance.$factoryOwner === actualItem.$factoryOwner) {
								// this metadata will allow to unlink two SAGE factory elements ifs have been added by user
								actualItem.$allowFactoryUnlink = true;
							}
							isCreated = true;
						}
						if (actualItem.$isDeleted) actualItem.$isDeleted = false;
						if (collection._relMeta.getIsChild(actualItem.$variantType)) {
							_applyDelta(_, context, actualItem, newElt);
							// check factory values on child record
							if (collection._relMeta.$factoryRelationKey) {
								var _childRel = actualItem[collection._relMeta.$factoryRelationKey](_);
								if (_childRel && _childRel.$factory && instance.$factory && sp.factoryOwner(_) !== instance.$factoryOwner && instance.$factoryOwner === _childRel.$factoryOwner) {
									// this metadata will allow to unlink two SAGE factory elements ifs have been added by user
									actualItem.$allowFactoryUnlink = true;
								}
							}
						}
						// order management
						if (isDelta) {
							actualItem.$index = newElt.$index;
							// no need to splice, set should do it
							//if(isCreated) collection._array.splice(newElt.$index, 0, actualItem);
							actualItem.$updUser = newElt.$updUser || (context && context.getUser(_) && context.getUser(_).login(_));
							actualItem.$updDate = newElt.$updDate || new Date();
						} else actualItem.$index = idx;
					}
				});
				// rebase indexes
				if (isDelta) oldElts.forEach(function(e, i) {
					e.$index = i;
				});
				else collection._array.sort(function(a, b) {
					return a.$index - b.$index;
				});
				// delete missing
				if (receivedUuids) {
					var collUuids = collection.toUuidArray(_);
					factoryTracer.debug && factoryTracer.debug("factory._applyDelta delete missing: received Uuids: " + sys.inspect(receivedUuids) + "; " + sys.inspect(collUuids));
					collUuids.forEach_(_, function(_, collEltUuid) {
						if (receivedUuids.indexOf(collEltUuid) < 0) {
							factoryTracer.debug && factoryTracer.debug("factory._applyDelta isDeleted: " + collEltUuid);
							// #4928: Factory security
							var _child = collection.get(_, collEltUuid);
							if (!canUpdateRelation(_, instance, _child, key) || !hasFactoryRights(_, _child, key)) {
								allowedDelta = false;
								return;
							}
							collection.deleteInstance(_, collEltUuid);
						}
					});
				}
			}
		} else {
			if (key[0] === '$') {
				// syncUuid will be set when $key is not the same as $uuid
				if (key === "$uuid" && value && instance.$uuid && instance.$uuid !== value) {
					instance.$syncUuid = value;
				} else {
					if (key === "$factory" && instance[key] !== value && !hasFactoryRights(_, instance, key)) {
						allowedDelta = false;
						return;
					}
					instance[key] = value;
				}
				// manage of "undefined" values
				if (key === "$properties")
					for (var d in delta.$properties)
						if (delta.$properties[d].$isUndefined) delete instance._data[d];
			} else {
				var rel = instance._meta.$relations && instance._meta.$relations[key];
				//				if (instance._meta.$relations && instance._meta.$relations.hasOwnProperty(key)) {
				if (rel) {
					if (value) {
						var varType = null;
						if (rel.$variants) {
							if (typeof value !== "object") throw new Error(locale.format(module, "objectExpected", instance._meta.name, rel.name, value));
							if (Object.keys(value).length > 1) throw new Error(locale.format(module, "invalidVariantCount", Object.keys(value).length));
							varType = Object.keys(value)[0];
							if (!rel.$variants[varType]) throw new Error(locale.format(module, "unknownVariant", rel.name, varType));
							value = value[varType];
							value.$variantType = varType;
						}
						if (rel.getIsChild(varType)) {
							var currentChild = instance[key](_);
							// child "1" relation, apply delta if allready exists, set new instance otherwise
							if (!currentChild || value.$key && currentChild.$key !== value.$key) {
								// #4928: Factory security
								var child = instance.createChild(_, key, value.$uuid, null, false, varType);
								if (!canUpdateRelation(_, instance, child, key) || !hasFactoryRights(_, child, key)) {
									allowedDelta = false;
									return;
								}
								if (currentChild) {
									currentChild.deleteSelf(_);
								}
								instance[key](_, child);
							}
							if (currentChild && (!canUpdateRelation(_, instance, currentChild, key) || !hasFactoryRights(_, currentChild, key))) {
								allowedDelta = false;
								return;
							}
							_applyDelta(_, context, instance[key](_), value);


						} else {
							var opt = {};
							var vv = _resourceToInstance(_, value, rel, varType, opt);
							if (!opt.resolved) return;
							//
							var relVal = instance[key](_);
							var k = vv ? (vv.$key || vv.$uuid) : (value.$key || value.$uuid);
							if (!k) {
								instance.$addError(locale.format(module, "referenceNotFound", rel.name), rel.name);
								return;
							}
							//							if(!relVal || (value.$uuid && (value.$uuid !== relVal.$uuid)))
							if (!relVal || (k !== relVal.$key)) {
								// reference change
								// #4928: Factory security
								var child = instance.createChild(_, key, k, null, false, varType);
								if (!canUpdateRelation(_, instance, child, key) || !hasFactoryRights(_, child, key)) {
									allowedDelta = false;
									return;
								}
								instance[key](_, child);
							}
						}
					} else instance[key](_, null);
				} else if (instance._meta.$properties && instance._meta.$properties.hasOwnProperty(key)) {
					var p = instance._meta.$properties[key];
					if (p.$isArray && Array.isArray(value)) {
						instance[key](_, value.map(function(v) {
							// #4928: Factory security : TODO for properties arrays
							return resourceHelpers.parseValue(p, v);
						}));
					} else {
						// #4928: Factory security
						// If values are different
						if (instance[key](_) !== resourceHelpers.parseValue(p, value)) {
							if (instance[key](_) == null && value === "") {
								// Do nothing
							} else if (!hasFactoryRights(_, instance, key)) {
								allowedDelta = false;
								return;
							}
						}
						instance[key](_, resourceHelpers.parseValue(p, value));
					}
				}
			}
		}

	});
	// create sys snapshot
	instance.$sysSnapshot = _createSnapshot(_, instance, "$sysSnapshot");
	// execute defered
	// !!! BUG !!! the defered execution of propagates might override modifications in delta
	instance.executeDefered(_, "deferPropagate");

	// $key might have change
	instance.$key = instance.computeKey();
	//
	factoryTracer.debug && factoryTracer.debug("factory._applyDelta resulting instance data: " + sys.inspect(instance._data));
	factoryTracer.debug && factoryTracer.debug("factory._applyDelta resulting instance properties: " + sys.inspect(instance.$properties));
	//	factoryTracer.debug && factoryTracer.debug("factory._applyDelta related inst: "+sys.inspect(instance._relatedInst));
	return allowedDelta;
}

function _cleanupDeleted(_, instance, shallow) {
	factoryTracer.debug && factoryTracer.debug("factory._cleanupDelete for instance: " + instance._meta.name + "." + instance.$uuid);
	if (!instance._meta.$relations) return;
	//
	flows.eachKey(_, instance._meta.$relations, function(_, key, rel) {
		if (instance._data[key])
			if (rel.isPlural) {
				// remove deleted instances
				if (instance._data[key]._data) flows.eachKey(_, instance._data[key]._data, function(_, elemKey, elemInst) {
					if (elemInst.$isDeleted) {
						factoryTracer.debug && factoryTracer.debug("factory._cleanupDelete removing: " + key + "." + elemKey);
						delete instance._data[key]._data[elemKey];
					} else if (!shallow || rel.getIsChild(elemInst.$variantType)) _cleanupDeleted(_, elemInst, true);
				});
			} else if (!shallow) _cleanupDeleted(_, instance._data[key], true);
	});
}

function _cleanupExternalStorage(_, instance) {
	if (!instance.$snapshot) return;
	factoryTracer.debug && factoryTracer.debug("factory._cleanupExternalStorage for instance: " + instance._meta.name + "." + instance.$uuid);
	flows.eachKey(_, instance._propertyStores, function(_, key, store) {
		var oldFile = instance.$snapshot[key](_).getUuid();
		if (oldFile && (oldFile !== instance[key](_).getUuid())) {
			factoryTracer.debug && factoryTracer.debug("factory._cleanupExternalStorage deleting: " + oldFile);
			instance.$snapshot[key](_).deleteFile(_);
		}
	});
}

function _executeActions(_, context, instance) {
	factoryTracer.debug && factoryTracer.debug("factory._executeActions instance: " + instance._meta.name + "." + instance.$uuid + " - actions: " + sys.inspect(instance.$actions, null, 3));
	// for each relation, scan if action isRequested
	flows.eachKey(_, instance._meta.$relations, function(_, key, rel) {
		var relInst = instance[key](_);
		if (!relInst || !rel.getIsChild()) return; // TODO: getIsChild Parameter : Important for $variants
		// recurse
		if (rel.isPlural) {
			var coll = relInst.toArray(_);
			coll.forEach_(_, function(_, item) {
				_executeActions(_, context, item);
			});
		} else _executeActions(_, context, relInst);
		// execute relation actions
		var acts = relInst.$actions || (instance.$properties[key] && instance.$properties[key].$actions);
		if (acts) flows.eachKey(_, acts, function(_, name, action) {
			// for the moment, save is managed differently
			if (action.$isRequested && (name !== "$save")) {
				if ((name === "$select") || (name === "$create")) {
					factoryTracer.debug && factoryTracer.debug("factory._executing " + name + ".$create");
					if (action.$parameters && action.$parameters.$select) {
						action.$parameters.$select.forEach_(_, function(_, item) {
							var child = instance.createChild(_, key);
							if (rel.isPlural) relInst.set(_, child);
							else instance[key](_, child);
							//
							var fields = rel.$select.$fieldMap;
							fields && Object.keys(fields).forEach_(_, function(_, targetName) {
								if (rel.targetEntity.$relations[targetName]) {
									var inst = instance._db.fetchInstance(_, rel.targetEntity.$relations[targetName].targetEntity, item[fields[targetName]]);
									inst && child[targetName](_, inst);
								} else if (rel.targetEntity.$properties[targetName]) {
									item[fields[targetName]] && child[targetName](_, item[fields[targetName]]);
								}
							});
						});
					} else {
						var child = instance.createChild(_, key);
						if (rel.isPlural) relInst.set(_, child);
						else instance[key](_, child);
					}
				}
				//
				delete action.$parameters;
				action.$isRequested = false;
			}
		});
	});

	flows.eachKey(_, instance._meta.$properties, function(_, key, prop) {

		var propInst = instance[key](_);
		if (!propInst || typeof propInst === 'string') return;

		var lnks = instance.$properties[key] && instance.$properties[key].$links;
		if (lnks) flows.eachKey(_, lnks, function(_, name, lnk) {
			if (lnk && (name === "$lookup")) {
				var fields = lnk.$fieldMap;
				fields && Object.keys(fields).forEach_(_, function(_, targetName) {

					if (instance.$properties[targetName]) {
						instance[targetName](_, propInst[fields[targetName]]);
					}
				});
			}
		});
	});
	// execute instance actions
	var result = null;
	if (instance.$actions) flows.eachKey(_, instance.$actions, function(_, name, action) {
		// for the moment, save is managed differently
		if (action.$isRequested && (name !== "$save")) {
			result = result || {
				$actions: {}
			};
			var s = instance._meta.$services && instance._meta.$services[name];
			var a = result.$actions[name] = {
				$isRequested: false,
				$isDisabled: s && s.$permanent ? false : true
			};
			var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
			sp && factoryTracer.debug && factoryTracer.debug("_executeActions found security profile: " + sp.code(_));
			if (sp && !sp.canExecuteService(_, instance._meta.name, name)) {
				a.$diagnoses = a.$diagnoses || [];
				a.$diagnoses.push({
					$severity: "error",
					$message: locale.format(module, "executeForbidden", name, instance._meta.name)
				});
			} else {
				factoryTracer.debug && factoryTracer.debug("factory._executing " + name);
				if (s) {
					if (s.$validateBeforeExecute === false || instance.validateSelf(_)) {
						if ((s.$invocationMode === "async") && action.$trackingId) {
							var id = action.$trackingId;
							(context.parameters = context.parameters || {}).trackngId = action.$trackingId;
							var tracker = sdataAsync.create(context, function(_, context) {
								try {
									s.$execute(_, context, _createSnapshot(_, instance, "async"), action.$parameters);
									tracker.$diagnoses = tracker.$diagnoses || instance.$diagnoses;
								} catch (e) {
									tracker.addError(e.message, e.safeStack);
								}
							}, true);
							tracker.location = "/sdata/$trackers('" + id + "')";
							if (s.$capabilities && (s.$capabilities.indexOf("abort") >= 0)) tracker.canAbort = true;
							tracker.start(_);
							a.$location = tracker.location;
							a.$state = tracker.phase;
						} else {
							var res = instance._meta.$services[name].$execute(_, context, instance, action.$parameters);
							a.$diagnoses = res && res.$diagnoses;
							a.$links = res && res.$links;
						}
					}
				} else if (name === "$delete") {
					instance.$isDeleted = true;
				}
			}
			//
			action.$isRequested = false;
			action.$isDisabled = false;
		}
	});
	factoryTracer.debug && factoryTracer.debug("factory._executeActions result: " + sys.inspect(result));
	return result;
}

function _delta(oldObj, newObj) {
	if (newObj && !oldObj) return newObj;
	if (oldObj && !newObj) return null;

	if (Array.isArray(oldObj)) {
		if (Array.isArray(newObj) && oldObj.length === newObj.length) {
			var arr = newObj.map(function(newElt, i) {
				return _delta(oldObj[i], newElt);
			});
			if (arr.some(function(elt) {
					return typeof elt !== "undefined";
				})) return newObj; // will optimize later
			else return;
		}
		return newObj;
	} else if (typeof oldObj === "object" && typeof newObj === "object") {
		var result;
		var keys = {};
		forEachKey(oldObj, function(key, oldVal) {
			keys[key] = true;
			var diff = _delta(oldVal, newObj[key]);
			if (typeof diff !== "undefined") {
				result = result || {};
				result[key] = diff;
			}
		});
		forEachKey(newObj, function(key, newVal) {
			if (!keys[key]) {
				result = result || {};
				result[key] = newVal;
			}
		});
		return result;
	} else if (oldObj !== newObj) {
		return newObj;
	}
}

function _computePropertyDelta(_, instance, snapshot, delta, property, fullLocale) {
	var key = property.name;
	var newVal = _formatValue(property, ((property.$isLocalized && !fullLocale) || property.$compute) ? instance[key](_) : instance._data[key]);
	var oldVal = _formatValue(property, ((property.$isLocalized && !fullLocale) || property.$compute) ? snapshot[key](_) : snapshot._data[key]);
	// TEMP, TODO proper management of snapshots on external stored props
	factoryTracer.debug && factoryTracer.debug("factory.compute delta on property: " + key + "; oldVal: " + sys.inspect(oldVal) + "; newVal: " + sys.inspect(newVal));
	if (property.isExternalStorage()) {
		if (instance[key](_)) {
			delta[key] = _delta(oldVal, newVal);
		}
	} else {
		// new data has a value (may be null) and oldVal is different or not set
		if (property.$isLocalized && fullLocale) {
			delta[key] = _delta(oldVal, newVal);
		} else if ((instance._data.hasOwnProperty(key) || property.$compute) && ((newVal !== oldVal) || !snapshot._data.hasOwnProperty(key))) delta[key] = newVal;
	}
}

function _computeReferenceDelta(_, instance, snapshot, snapshotType, relation, delta, fullLocale) {
	var key = relation.name;
	factoryTracer.debug && factoryTracer.debug("factory.compute delta on relation: " + key);
	var newVal = instance._data[key];
	if (newVal) {
		var oldVal = ((snapshot && snapshot._data[key]) || newVal[snapshotType]);
		if (relation.getIsChild(newVal.$variantType)) {
			var d = _computeDelta(_, newVal, snapshotType, oldVal, fullLocale);
			if (d !== {}) delta[key] = d;
		} else if (newVal.$uuid !== (oldVal && oldVal.$uuid))
		// send serialization of thumb, not just an uuid
			delta[key] = _serialize(_, newVal, true);
		// delta[key] = {$uuid:newVal.$uuid};
	} else if ((snapshot && snapshot._data.hasOwnProperty(key) && snapshot._data[key]) || (snapshot && !snapshot._data.hasOwnProperty(key)) || !snapshot) delta[key] = null;
	factoryTracer.debug && factoryTracer.debug("factory.compute delta on relation: " + key + "; exit");
}

function _computePluralDelta(_, instance, snapshot, snapshotType, relation, delta, fullLocale, forceDelta) {
	var key = relation.name;
	factoryTracer.debug && factoryTracer.debug("factory.compute delta on relation: " + key);
	// detect delta type
	// do not return $isDeleted elements anymore
	var newColl = instance[key](_).toArray(_, true);
	/*	var oldColl = (snapshot && snapshot[key](_).toArray(_));
	// is different ?
	if(newColl.some_(_, function(_, newElt, i) {
		if(newElt.$isDeleted) return true;
		var oldElt = oldColl && oldColl[i];
		if(!oldElt) return true;
		if(oldElt.$uuid !== newElt.$uuid) return true;
		//
		if(relation.getIsChild())
			return _computeDelta(_, newElt, snapshotType, oldElt, fullLocale) != {};
	}))*/
	delta[key] = newColl.map_(_, function(_, e) {
		if (e.$isDeleted) return {
			$uuid: e.$uuid,
			$isDeleted: true
		};
		else return _serializeReference(_, e, relation);
	});
	/*	if(instance[key](_)._isDelta || forceDelta) {
		var newColl = instance[key](_).toArray(_);
		var oldColl = (snapshot && snapshot[key](_)._data);
//				var oldColl = (snapshot && snapshot[key](_));
		var deltaColl = [];
		newColl.forEach_(_, function(_, newElt) {
			var newId = newElt.$uuid;
			if (newElt.$isDeleted)
				deltaColl.push({$uuid: newId,$isDeleted: true});
			else {
				var oldElt = oldColl && oldColl[newId];
				oldElt = (oldElt && (oldElt[snapshotType] || oldElt)) || newElt[snapshotType];
				if (relation.getIsChild() || relation.$assoType)
					deltaColl.push(_computeDelta(_, newElt, snapshotType, oldElt, fullLocale));
				else
					if (newElt && ((oldElt && (newElt.$uuid != oldElt.$uuid)) || !oldElt))
						deltaColl.push(_serialize(_,newElt, true));
			}
		});
		if (deltaColl.length)
			delta[key] = deltaColl;
	} else {
		var newColl = instance[key](_).toArray(_, true);
		delta[key] = newColl.map_(_, function(_, e) {
			return _serialize(_, e, true);
		});
	}
*/
	factoryTracer.debug && factoryTracer.debug("factory.compute delta on relation: " + key + "; exit");
}

// async for computed values
// use snapshotType instead of snapshot as we can have snapshots for
// childrens w/o snapshot for main instance

function _computeDelta(_, instance, snapshotType, snapshotValue, fullLocale, forceDelta) {
	factoryTracer.debug && factoryTracer.debug("factory.computeDelta: " + instance.$uuid);
	var snapshot = snapshotValue || instance[snapshotType];
	var meta = instance._meta;
	var delta = {};
	var delta$ = {};
	if (snapshot) {
		flows.eachKey(_, meta.$properties, function(_, key, property) {
			_computePropertyDelta(_, instance, snapshot, delta, property, fullLocale);
			// meta
			var newMeta = instance.$properties[key];
			var oldMeta = snapshot.$properties[key];
			delta$[key] = _delta(oldMeta, newMeta);
		});
		if (instance.hasOwnProperty("$index"))
			if (instance.$index !== snapshot.$index) delta.$index = instance.$index;
	}
	// compute delta on relations even if no snapshot provided for the main instance
	flows.eachKey(_, meta.$relations, function(_, key, relation) {
		// TODO : there seems to be a problem as we have deltas on relations even if there is no difference
		if (relation.isPlural) {
			_computePluralDelta(_, instance, snapshot, snapshotType, relation, delta, fullLocale, forceDelta);
		} else _computeReferenceDelta(_, instance, snapshot, snapshotType, relation, delta, fullLocale);
		var newMeta = instance.$properties[key];
		var oldMeta = snapshot && snapshot.$properties[key];
		delta$[key] = _delta(oldMeta, newMeta);
	});
	//
	if (delta$ !== {}) delta.$properties = delta$;
	if (delta !== {}) {
		/*		delta.$url = instance.$url;
		delta.$key = instance.$key;
		delta.$uuid = instance.$uuid;
		delta.$etag = instance.$etag;
		delta.$creUser = instance.$creUser;
		delta.$creDate = instance.$creDate;
		delta.$updUser = instance.$updUser;
		delta.$updDate = instance.$updDate;*/
		// coppy all $ properties
		Object.keys(instance).forEach(function(key) {
			var vv = instance[key];
			if (["$type", "$loaded", "$signature"].indexOf(key) >= 0) return;
			if (key[0] === "$" && vv && typeof vv !== "object") delta[key] = vv;
		});
	}
	if (instance.$diagnoses && instance.$diagnoses.length) delta.$diagnoses = instance.$diagnoses;
	//
	_getPropertiesResourceMeta(_, delta, instance);
	// compute $key
	if (meta.$key)
	// TODO: make a "resolveInstance" function to template, to avoid use of _data
		delta.$key = (new Template(meta.$key)).resolve(instance._data);
	//
	factoryTracer.debug && factoryTracer.debug("factory.computeDelta exit: " + instance.$uuid + "; " + sys.inspect(delta));
	return delta;
}

// Determine whether an error is present
function _isAnError(diag) {
	var s = diag.$severity || diag.severity;
	return s === "error" || s === "fatal";
}

function _errorCount(instance) {
	if (instance.$properties && (typeof instance.$properties === "object")) {
		return (Object.keys(instance.$properties).reduce(function(prev, current) {
			return prev + (instance.$properties[current].$diagnoses || []).filter(_isAnError).length;
		}, 0)) + (instance.$diagnoses || []).filter(_isAnError).length;
	} else {
		return 0;
	}
}


function _detectInList(location) {
	if (location && location.$diagnoses) {
		for (var i = location.$diagnoses.length - 1; i >= 0; i--) {
			if (_isAnError(location.$diagnoses[i])) {
				return location.$diagnoses[i];
			}
		}
	}
}


function _findError(_, instance) {
	var error;
	var obj;
	if (error = _detectInList(instance)) return error;
	if (instance.$actions && (error = _detectInList(instance.$actions.$save))) return error;
	if (obj = instance.$properties) {
		for (var key in obj) {
			if (error = _detectInList(obj[key])) return error;
		}
	}
	// recurse relations
	if ((obj = instance._meta.$relations) && Object.keys(obj).some_(_, function(_, key) {
			var rel = obj[key];
			var content;

			if (rel.getIsChild()) // TODO: getIsChild parameter ? Important if $variants //
				content = instance[key](_);
			if (rel.isPlural) {
				return content && content.toArray(_, true).some_(_, function(_, item) {
					return (error = _findError(_, item));
				});
			} else return (content && (error = _findError(_, content)));

		})) return error;
	return undefined;
}

// TODO: maybe replace function body with !!_findError(_, instance)

function _existsError(_, instance) {
	if ((instance.$diagnoses || []).some(_isAnError)) {
		return true;
	}
	//
	var hasErr = false;
	if (instance.$properties) {
		flows.eachKey(_, instance.$properties, function(_, key, item) {
			hasErr = hasErr || ((item && item.$diagnoses) || []).some(_isAnError);
		});
	}
	if (hasErr) return true;
	// recurse relations
	flows.eachKey(_, (instance._meta.$relations || {}), function(_, key, rel) {
		if (rel.getIsChild()) // TODO: getIsChild parameter ? Important if $variants //
			if (rel.isPlural) {
			instance[key](_).toArray(_, true).forEach_(_, function(_, item) {
				hasErr = hasErr || _existsError(_, item);
			});
		} else hasErr = hasErr || (instance[key](_) && _existsError(_, instance[key](_)));
	});
	if (hasErr) return true;
	//
	return false;
}

function _clearDiagnoses(_, instance) {
	if (instance.$diagnoses) instance.$diagnoses = [];
	//
	if (instance.$properties) {
		flows.eachKey(_, instance.$properties, function(_, key, item) {
			if (item.$diagnoses) item.$diagnoses = [];
		});
	}
	// recurse relations
	flows.eachKey(_, (instance._meta.$relations || {}), function(_, key, rel) {
		if (rel.getIsChild()) // TODO: getIsChild parameter ? Important if $variants //
			if (rel.isPlural) {
			instance[key](_).toArray(_, true).forEach_(_, function(_, item) {
				_clearDiagnoses(_, item);
			});
		} else(instance[key](_) && _clearDiagnoses(_, instance[key](_)));
	});
}

function _safeCall(_, instance, propName, fn, field, val) {
	instance._safeCalls = instance._safeCalls || {};
	var instanceRef = instance._safeCalls[field];
	if (!instanceRef) {
		instanceRef = instance._safeCalls[field] = {
			_keysCount: 0,
		};
	}

	var id = (globals.context && globals.context.requestId) || 0;
	var key = id + propName;
	var propRef = instanceRef[key];
	if (!propRef) {
		propRef = instanceRef[key] = {
			funnel: flows.funnel(1),
			counter: 0,
		}
		instanceRef._keysCount++;
	} else {
		// detect recursive calls
		for (var cx = globals.context; cx; cx = Object.getPrototypeOf(cx)) {
			if (cx === propRef.context) throw new Error(field.substring(1) + " loop on " + propName);
		}
	}

	// go through funnel to avoid concurrent evaluations of the same property.
	// wrap context so that we can detect recursive calls
	propRef.counter++;
	return flows.withContext(_ => propRef.funnel(_, (_) => {
		propRef.context = globals.context;
		try {
			return fn(_, instance, val);
		} catch (e) {
			instance.$addError(e.message + "\n" + e.safeStack, propName);
			factoryTracer.error && factoryTracer.error("Error executing " + fn.name + " for " + propName, e);
		} finally {
			// release temporary structures
			if (--propRef.counter === 0) {
				delete instanceRef[key];
				if (--instanceRef._keysCount === 0) delete instance._safeCalls;
			}
		}
	}))(_);
}

exports.unitTestSafeCall = _safeCall; // for unit tests

function _fireOnDelete(_, instance, withMainInstance) {
	flows.eachKey(_, instance._meta.$relations, function(_, relName, rel) {
		if (rel.getIsChild() && rel.targetEntity && rel.targetEntity.$functions && rel.targetEntity.$functions.$onDelete) { // TODO: getIsChild parameter ? Important if $variants //
			var relInst = instance[relName](_);
			if (!relInst) return;
			if (rel.isPlural) relInst.toArray(_, false).forEach_(_, function(_, item) {
				item.$isDeleted && factoryTracer.debug && factoryTracer.debug("factory._fireOnDelete call on relation item: " + item.$uuid + " from relation " + rel.name);
				item.$isDeleted && item.$onDelete && item.$onDelete(_);
			});
			else {
				relInst.$isDeleted && factoryTracer.debug && factoryTracer.debug("factory._fireOnDelete call on relation item: " + relInst.$uuid + " from relation " + rel.name);
				relInst.$isDeleted && relInst.$onDelete && relInst.$onDelete(_);
			}
		}
	});
	withMainInstance && factoryTracer.debug && factoryTracer.debug("factory._fireOnDelete on instance: " + instance.$uuid);
	withMainInstance && instance.$onDelete && instance.$onDelete(_);
}

function _validateRelation(_, instance, relation, name, value) {
	if (relation.$compute) return true;
	if (instance.$validated[name]) return true;
	//
	instance.$validated[name] = true;
	//
	factoryTracer.debug && factoryTracer.debug("factory._validateRelation enter: " + name + ":" + relation.name);
	//
	var mandatory = relation.$isMandatory;
	if (typeof mandatory === "function") mandatory = mandatory(_, instance);
	if (mandatory)
		if (!value) instance.$addError(name + " is mandatory", name);
}

function _validateProperty(_, instance, property, name, value) {
	if (property.$compute) return true;
	if (instance.$validated[name]) return true;
	//
	instance.$validated[name] = true;
	//
	factoryTracer.debug && factoryTracer.debug("factory._validateProperty enter: " + name + ":" + property.name);
	//
	//	var value = instance[name](_);
	var type = property.type !== 'binary' && types[(property.type || "string")];
	if (type) {
		var errors = [];
		var c = property.getAllConstraints();
		if (c.$isMandatory && (typeof c.$isMandatory === "function")) c.$isMandatory = c.$isMandatory(_, instance);
		if (c.$isDefined && (typeof c.$isDefined === "function")) c.$isNullable = c.$isNullable || !c.$isDefined(_, instance);
		if (c.$pattern && (typeof c.$pattern === "function")) c.$pattern = c.$pattern(_, instance);
		if (property.$isArray && Array.isArray(value)) value.forEach(function(v) {
			type.validate(v, c, errors, instance);
		});
		else type.validate(value, c, errors, instance);
		if (errors.length) {
			factoryTracer.debug && factoryTracer.debug("factory._validateProperty errors: " + sys.inspect(errors));
			errors.forEach(function(error) {
				// crnit:extended error message is needed for import; TODO: as error is associated with property meta,
				// leave simple error message but correctly extract it for import
				//				instance.$addError(instance._meta.name+"."+property.name+":"+error, property.name);
				instance.$addError(error, property.name);
			});
			return instance.$validated[name] = false;
		}
	}
	// unique validate, not for childrens where the validation must be done for the childrens list of the parent
	if (!instance._parent) {
		var filter = {};
		var propNames = [];
		var propFiltered = false;
		if (property.$isUnique) {
			filter.jsonWhere = filter.jsonWhere || {};
			if (property.$isLocalized) filter.jsonWhere[property.name + "." + locale.current] = value;
			else filter.jsonWhere[property.name] = value;
			propNames.push(property.name);
			propFiltered = true;
		}
		var incompleteKey = false;
		instance._meta.$uniqueConstraints && instance._meta.$uniqueConstraints.forEach_(_, function(_, ui) {
			// property is part of an unique index ?
			if (ui.indexOf(property.name) >= 0) {
				ui.forEach_(_, function(_, p) {
					if (incompleteKey) return;
					if ((p === property.name) && propFiltered) return;
					var prop = instance._meta.$properties[p] || instance._meta.$relations[p];
					if (!prop) return;
					propNames.push(p);
					var fval = (p === property.name) ? value : instance[p](_);
					if (fval === undefined) {
						incompleteKey = true;
						return;
					}
					if (fval && fval.$uuid) fval = fval.$uuid;
					filter.jsonWhere = filter.jsonWhere || {};
					if (prop.$isLocalized) filter.jsonWhere[prop.name + "." + locale.current] = fval;
					else filter.jsonWhere[prop.name] = fval;
				});
			}
		});
		if (!incompleteKey && filter.jsonWhere) {
			filter.jsonWhere.$uuid = {
				$ne: instance.$uuid
			};
			var testInstance = instance._db.fetchInstance(_, instance._meta, filter);
			if (testInstance) {
				instance.$addError(locale.format(module, propNames.length === 1 ? "uniqueKeyViolation" : "uniqueKeysViolation", instance._meta.name, propNames.join(",")), property.name, undefined, undefined, "UNIQUE_KEY_VIOLATION");
				return instance.$validated[name] = false;
			}
		}
	}
	//
	return true;
}
// check mandatory props

function _validateMandatory(_, instance) {
	factoryTracer.debug && factoryTracer.debug("factory._validateMandatory: " + instance._meta.name);
	flows.eachKey(_, instance._meta.$properties, function(_, name, property) {
		_validateProperty(_, instance, property, name, instance[name](_));
	});
	flows.eachKey(_, instance._meta.$relations, function(_, name, relation) {
		var mandatory = relation.$isMandatory;
		if (typeof mandatory === "function") mandatory = mandatory(_, instance);
		if (mandatory || relation.getIsChild()) { // TODO: getIsChild parameter ? Important if $variants //
			var relValue = instance[name](_);
			if (mandatory) {
				if ((relation.isPlural && relValue.isEmpty()) || (relValue == null)) instance.$addError(name + " is mandatory", name);
			}
			if (relation.getIsChild() && relValue) { // TODO: getIsChild parameter ? Important if $variants //
				if (relation.isPlural) {
					var values = relValue.toArray(_);
					values.forEach_(_, function(_, value) {
						_validateMandatory(_, value);
						instance._errorCount += value._errorCount;
					});
				} else {
					_validateMandatory(_, relValue);
					instance._errorCount += relValue._errorCount;
				}
			}
		}
	});
}

function _clone(obj) {
	var result = {};
	forEachKey(obj, function(key, val) {
		if (Array.isArray(val)) result[key] = val.map(function(elt) {
			return _clone(elt);
		});
		else if (val != null && typeof val === "object") result[key] = _clone(val);
		else result[key] = val;
	});
	return result;
}

function _checkRights(_, instance) {
	var where = {};
	if (!instance) return true;
	if (!_addRights(_, instance._meta, where)) return false;
	if (!instance.$loaded) instance.ensureLoaded(_);
	return where.where ? instance.match(_, where.where) : true;
}

// Instance collection class
// Collections prototype

function InstanceCollection(instance, name, relMeta) {
	this._data = null;
	this._deletedInstances = {};
	this._asso = {};
	this._array = [];
	this._relName = name;
	this._relMeta = relMeta;
	this._parent = instance;
	this._ordered = true;
	// loaded allows lazyLoad of computed relations (association use case when list is loaded by querying opposite table)
	this.loaded = !relMeta.isComputed;
	//
	this._isDelta = true;
}
//

function _createParentSnapshot(_, collection) {
	var parent = collection._parent;
	if (parent._snapshotEnabled && !parent.$snapshot) parent.$snapshot = _createSnapshot(_, parent, "$snapshot");
	factoryTracer.debug && factoryTracer.debug("factory.collection createParentSnapshot exit");
}

function _computeCollection(_, collection) {
	if (collection._parent && collection._parent.$uuid) {
		var filter = {};
		//			filter[collection._relMeta.$inv + (collection._relMeta.targetEntity.$relations[collection._relMeta.$inv].isPlural?".$keys":".$uuid")] = collection._parent.$uuid;
		filter[collection._relMeta.$inv + ".$uuid"] = collection._parent.$uuid;
		factoryTracer.debug && factoryTracer.debug("factory.collection fetchOpposite: parent:" + collection._parent.$uuid);
		var instArray = collection._parent._db.fetchInstances(_, collection._relMeta.targetEntity, {
			jsonWhere: filter
		});
		collection._array = instArray.slice(0);
		collection.loaded = true;
	}
}
//
var _collProto = InstanceCollection.prototype;
//

function _getCollEltValue(_, coll, elt) {
	var self = coll;
	var val = elt;
	var v = self._parent._snapshotType ? (val[self._parent._snapshotType] || _createSnapshot(_, val, self._parent._snapshotType)) : val;
	// lazy load associations
	if (v && !v.$isDeleted && !self._relMeta.getIsChild(v.$variantType)) {
		v.ensureLoaded(_);
	}
	return v;
}
_collProto.load = function(_, value) {
	function _makeInst(_, elt) {
		return instance.createChild(_, self._relMeta.name, elt.$uuid || elt.$key || elt.$url, elt, true);
	}
	//
	var instance = this._parent;
	var self = this;
	if (Array.isArray(value)) this._array = value.map_(_, function(_, elt) {
		return _makeInst(_, elt);
	});
	else
		for (var key in value) {
			if ((key[0] !== "$") && (key[0] !== "_")) {
				self._array.push(_makeInst(_, {
					$uuid: key
				}));
			}
		}
};
/// -------------
/// ## Collections toArray function :
/// ``` javascript
/// var array = anInstance.myList(_).toArray(_);
/// ```
///
/// returns an array of elements or an array of snapshots if the parent is an snapshot
///
_collProto.toArray = function(_, excludeDeleted) {
	var self = this;
	var result = [];
	factoryTracer.debug && factoryTracer.debug("factory._toArray(" + excludeDeleted + ") enter");
	//
	// TODO: getIsChild parameter ? Important if $variants //
	var selfrelMeta = self._relMeta;
	var selfarray = self._array;
	if (!self._ordered && !selfrelMeta.$canReorder && selfrelMeta.defaultOrder && selfrelMeta.defaultOrder.length && !selfrelMeta.getIsChild()) {
		factoryTracer.debug && factoryTracer.debug("factory._toArray sort by: " + sys.inspect(selfrelMeta.defaultOrder) + "; original array: " + sys.inspect(selfarray.map(function(r) {
			return {
				$uuid: r.$uuid,
				_data: r._data,
				$index: r.$index,
				$isDeleted: r.$isDeleted
			};
		})));
		// ensure loaded for all
		// TODO: getIsChild parameter ? Important if $variants //
		if (!selfrelMeta.getIsChild()) selfarray.forEach_(_, function(_, v) {
			if (v && !v.$isDeleted) v.ensureLoaded(_);
		});
		selfarray.sort_(_, function(_, a, b) {
			// for now only supports properties,
			// TODO : implement proper typed comparaison
			// TODO : ascending / descending
			var x = selfrelMeta.defaultOrder.reduce_(_, function(_, prevValue, value) {
				if (prevValue) return prevValue;
				var p = value[0];
				var val_a = a[p](_) || "";
				var val_b = b[p](_) || "";
				if (val_a < val_b) return -1;
				if (val_a > val_b) return 1;
				return 0;
			}, 0);
			return x;
		});
		self._ordered = true;
	}
	var length = selfarray.length;
	// direct loop (because this part of code is hot)
	var i = 0;
	while (i < length) {
		var val = selfarray[i++];
		if (!excludeDeleted || !val.$isDeleted)
			result.push(_getCollEltValue(_, self, val));
	}
	//
	factoryTracer.debug && factoryTracer.debug("factory._toArray(" + excludeDeleted + ") result: " + sys.inspect(result.map(function(r) {
		return {
			$uuid: r.$uuid,
			_data: r._data,
			$index: r.$index,
			$isDeleted: r.$isDeleted
		};
	})));
	return result;
};
/// -------------
/// ## Collections toUuidArray function :
/// ``` javascript
/// var array = anInstance.myList(_).toUuidArray(_);
/// ```
///
/// return an array of uuids (to avoid instanciation)
///
_collProto.toUuidArray = function(_, excludeDeleted) {
	var self = this;
	return (excludeDeleted ? self._array.filter(function(e) {
		return !e.$isDeleted;
	}) : self._array).map(function(e) {
		return e.$key || e.$uuid;
	});
};
/// -------------
/// ## Collections sort function :
/// ``` javascript
/// anInstance.myList(_).sort(_, sortFunction);
/// ```
///
/// return an array of uuids (to avoid instanciation)
///
_collProto.sort = function(_, sortFunction) {
	var self = this;
	self._array.sort_(_, sortFunction);
};

/// -------------
/// ## Collections refresh function :
/// ``` javascript
/// anInstance.myList(_).refresh(_);
/// ```
///
/// for computed relations, reloades the objects list. Does nothing for stored relations
///
_collProto.refresh = function(_) {
	factoryTracer.debug && factoryTracer.debug("factory.collection refresh; _parent: " + this._parent.$uuid);
	if (this._relMeta.isComputed) _computeCollection(_, this);
	// chaining
	return this;
};
/// -------------
/// ## Collections deleteInstance function :
/// ``` javascript
/// anInstance.myList(_).deleteInstance(_, instanceId);
/// ```
///
/// removes the instance identified by instanceId from the collection
///
_collProto.deleteInstance = function(_, instanceId, isInverse) {
	if (!instanceId) return;
	// create a snapshot for the parent
	factoryTracer.debug && factoryTracer.debug("factory.collection deleteInstance; _parent: " + this._parent.$uuid + " $uuid: " + instanceId);
	_createParentSnapshot(_, this);
	// if delete on computed relation, make the delete to the opposite side
	var relInst = this.get(_, instanceId);
	if (relInst) {
		if (relInst._relation && relInst._relation.$factoryProtect && relInst.$factory && !_canModifyFactoryInstance(_, relInst)) {
			relInst._parent.$addError(locale.format(module, "deleteFactoryForbidden", relInst.getEntity(_).name, relInst.$factoryOwner));
			return false;
		}
		var invRel = this._relMeta.$inv && relInst.getEntity(_).$relations[this._relMeta.$inv];
		if (!isInverse && (this._relMeta.isComputed || (invRel && !invRel.isComputed))) {
			factoryTracer.debug && factoryTracer.debug("factory.collection deleteInstance on computed relation: " + this._relName);
			relInst._snapshotEnabled = true;
			relInst._sysSnapshotEnabled = true;
			if (invRel.isPlural) relInst[this._relMeta.$inv](_).deleteInstance(_, this._parent.$uuid, true);
			else relInst[this._relMeta.$inv](_, null);
			if (!this._relMeta.getIsChild(relInst.$variantType)) this._parent.addRelatedInstance(relInst);
		} else this._parent.addReindexInstance(relInst);
		//
		relInst.$isDeleted = true;
		factoryTracer.debug && factoryTracer.debug("factory.collection deleteInstance exit ; _parent: " + this._parent.$uuid + " $uuid: " + instanceId);
		return true;
	}
	//
	return false;
};
/// -------------
/// ## Collections reset function :
/// ``` javascript
/// anInstance.myList(_).reset(_);
/// ```
///
/// Removes all elements from the collection
///
_collProto.reset = function(_) {
	// create a snapshot for the parent
	_createParentSnapshot(_, this);
	//
	this._data = null;
	this._array = [];
};
//

function _buildCollMap(_, coll) {
	coll._data = {};
	coll._array.forEach(function(e) {
		coll._data[e.$uuid] = e;
	});
}
/// -------------
/// ## Collections get function :
/// ``` javascript
/// var elem = anInstance.myList(_).get(_, uuid);
/// ```
///
_collProto.get = function(_, uuid) {
	if (!uuid) return null;
	//
	this._data || _buildCollMap(_, this);
	//
	var relation = this._relMeta;
	var val = this._data[uuid];
	val = this._parent._snapshotType ? (val[this._parent._snapshotType] || _createSnapshot(_, val, this._parent._snapshotType)) : val;
	// lazy load associations
	if (val && !val.$isDeleted && !relation.getIsChild(val.$variantType)) {
		val.ensureLoaded(_);
	}
	//
	factoryTracer.debug && factoryTracer.debug("factory.collection.get: " + uuid + "; " + (val && val.$inspect && val.$inspect(false)));
	return val;
};
/// -------------
/// ## Collections add function :
/// ``` javascript
/// var newElem = anInstance.collection(_).add(_);
/// ```
/// Creates a new element and adds it to the collection
///
/// Returns the created new element
///
_collProto.add = function(_) {
	return this.set(_, this._parent.createChild(_, this._relMeta.name));
};
// FDB
_collProto.createChild = function(_) {
	return this._parent.createChild(_, this._relMeta.name);
};
/// -------------
/// ## Collections setUuid function :
/// ``` javascript
/// aRef = anInstance.myList(_).setUuid(_, aRefUuid);
/// ```
///
// isInverse : called from the inverse relation set, so don't propagate
// TODO: create an internal function so isInverse would not be exposed
_collProto.setUuid = function(_, value) {
	var ent = this._relMeta.targetEntity;
	var v = this._parent._db.fetchInstance(_, ent, value);
	v && this.set(_, v);
	return v;
};
/// -------------
/// ## Collections set function :
/// ``` javascript
/// var aRef = anInstance.myList(_).set(_, aRef);
/// ```
///
// isInverse : called from the inverse relation set, so don't propagate
// TODO: create an internal function so isInverse would not be exposed
_collProto.set = function(_, value, isInverse, variantType) {
	if (!value) throw new Error("Cannot set an undefined value for a collection; use deleteInstance instead.");
	factoryTracer.debug && factoryTracer.debug("factory.collection.set: value: " + value.$inspect(true) + "; isInverse:" + sys.inspect(isInverse));
	//
	//if (!_checkRights(_, value)) throw new Error(locale.format(module, "readForbidden", value._meta.name));
	if (!_checkRights(_, value)) return this._parent.$addError(locale.format(module, "readForbidden", value._meta.name), this._relMeta.name);
	// create a snapshot for the parent
	_createParentSnapshot(_, this);
	//
	if (this._relMeta.$variants) value.$variantType = variantType || _getVariantType(this._relMeta.$variants, value._meta.name);
	//
	var k = value.$key || value.$uuid;

	// set (maybe temporary)
	this._data || _buildCollMap(_, this);

	var prevData = this._data[k];
	this._data[k] = value;
	var invRelation = this._relMeta.$inv && value._meta.$relations[this._relMeta.$inv];
	if (!isInverse && invRelation) {
		factoryTracer.debug && factoryTracer.debug("factory.collection.set inverse relation");

		var current = this.get(_, k);
		// set inverse relation

		if (invRelation.isPlural) {
			// create the inverse relation if *-*
			// use the getter to lazy load
			// Optimisation import - not load inverse relations
			if (!invRelation.$isComputed || !this._parent.$importing)
				current[this._relMeta.$inv](_).set(_, this._parent, true);
		} else current[this._relMeta.$inv](_, this._parent, true);

		// if relation set has errors, we must not consider it
		if (current && current.hasErrors(_)) {
			delete this._data[k];
			return value;
		}
		// to persist
		if (!this._relMeta.getIsChild(value.$variantType) && !value._meta.$relations[this._relMeta.$inv].isComputed) this._parent.addRelatedInstance(value);
		else this._parent.addReindexInstance(value);
		//

	}

	if (!prevData) {
		var p = (value.$index != null ? value.$index : this._array.length);
		this._array.splice(p, 0, value);
		factoryTracer.debug && factoryTracer.debug("factory.collection.set: value inserted at " + p);
	}

	if (this._relMeta.$propagate) {
		var svPropagate = this._relMeta.$propagate;
		this._relMeta.$propagate = null;
		_safeCall(_, this._parent, this._relMeta.name, svPropagate, "_propagating", value);
		this._relMeta.$propagate = svPropagate;
	}
	// indicate to reorder to the next read
	this._ordered = false;
	//
	factoryTracer.debug && factoryTracer.debug("factory.collection.set: resulting array: " + sys.inspect(this._array.map(function(e) {
		return {
			$uuid: e.$uuid,
			$index: e.$index
		};
	})));
	// allow chaining
	return value;
};

_collProto.unmark = function(_, item, tag) {
	if (!item || !tag) return;
	//
	var k = item.$key || item.$uuid;
	this._data || _buildCollMap(_, this);
	//
	var dd = this._data[k];
	if (!dd || !dd.$mark) return;
	//
	delete dd.$mark[tag];
	if (!Object.keys(dd.$mark).length) delete dd.$mark;
};

_collProto.setArray = function(_, values) {
	this.reset(_);
	//
	var self = this;
	if (typeof values === "object") {
		values.$items.forEach_(_, function(_, item) {
			var searchParam = {
				jsonWhere: {}
			};
			searchParam.jsonWhere[values.$key] = item;
			var inst = self._parent._db.fetchInstance(_, self._relMeta.targetEntity, searchParam);
			if (!inst) throw new Error(self._relMeta.targetEntity.name + " " + item + " not found");
			self.set(_, inst);
		});
	} else throw new Error("collection.setArray of instances NIY");
};
// helper for filter

function _checkInstance(_, inst, filter) {
	var add = true;
	flows.eachKey(_, filter, function(_, filterKey, filterValue) {
		var tempInst = inst;
		// TODO: optimize - take the filterItem compute out of the main loop
		var filterItem = filterKey.split(".");
		var term;
		while (term = filterItem.shift()) {
			if (!tempInst) break;
			factoryTracer.debug && factoryTracer.debug("factory.collection.filter testing term: " + term + "=" + filterValue + " on " + tempInst.$uuid);
			if ((term !== "$uuid") && !tempInst._meta.$properties[term] && !tempInst._meta.$relations[term]) throw new Error(locale.format(module, "unknownFilterTerm", term, tempInst._meta.name));
			if (term === "$uuid") add = add && (tempInst[term] === filterValue);
			else //
			if (tempInst._meta.$properties[term]) {
				// is final prop
				if (tempInst._meta.$properties[term].$isLocalized) {
					var loc = filterItem.shift();
					add = add && ((loc ? _getLocalizedProp(_, tempInst, term, tempInst._meta.$properties[term], loc) : tempInst[term](_)) === filterValue);
				} else add = add && (tempInst[term](_) === filterValue);
				//
				factoryTracer.debug && factoryTracer.debug("factory.collection.filter testing term: " + term + "=" + filterValue + " on " + tempInst.$uuid + "; add=" + add);
				//
				break;
			} else //
			if (tempInst._meta.$relations[term] && !tempInst._meta.$relations[term].isPlural) {
				// walk
				tempInst = tempInst[term](_);
				// if last term of item is the relation and filterValue is object test the instance against the filterValue
				if (!filterItem.length && (typeof filterValue === "object")) {
					add = add && _checkInstance(_, tempInst, filterValue);
				}
			}
		}
	});
	return add;
}
/// -------------
/// ## Collections filter function :
/// ``` javascript
/// var options = {
///     jsonWhere: {
///       title: "some title"
///     }
/// }
/// var array = anInstance.myList(_).filter(_, options);
/// ```
///
/// returns an array of collection elements filtered with an expression. Doesn't affect the collection itself
///
/// * options - object allowing to pass the filter as one of the properties
/// - jsonWhere : json like
/// - sdataWhere : string of sdata syntax
/// - where : parsed tree of sdata syntax
///
_collProto.filter = function(_, options) {
	var self = this;
	var result = [];
	//
	options = options || {};
	if (options.sdataWhere) options.jsonWhere = parser.sdataToJson(options.sdataWhere);
	if (!options || !options.jsonWhere) return this.toArray(_);
	//
	var filter = options.jsonWhere;
	factoryTracer.debug && factoryTracer.debug("factory.collection.filter processed filter: " + sys.inspect(filter));
	//		flows.eachKey(_, self._data, function(_, key, value){
	self._array.forEach_(_, function(_, inst) {
		// filter instance
		if (_checkInstance(_, inst, filter)) {
			factoryTracer.debug && factoryTracer.debug("factory.collection.filter testing: " + sys.inspect(filter) + " on " + inst.$uuid + "=" + true);
			result.push(inst);
		} else //
			factoryTracer.debug && factoryTracer.debug("factory.collection.filter testing: " + sys.inspect(filter) + " on " + inst.$uuid + "=" + false);
		//			factoryTracer.debug && factoryTracer.debug("factory.collection.filter testing: " + sys.inspect(filter) + " on " + inst.$uuid + "=" + add);
		//			if (add) result.push(inst);
	});
	return result;
};
/// -------------
/// ## Collections isEmpty function :
/// ``` javascript
/// var empty = anInstance.myList(_).isEmpty();
/// ```
///
_collProto.isEmpty = function() {
	//		return (Object.keys(this._data).length == 0);
	return this._array.length === 0;
};
/// -------------
/// ## Collections getLength function :
/// ``` javascript
/// var array = anInstance.myList(_).getLength();
/// ```
///
_collProto.getLength = function() {
	//		return Object.keys(this._data).length;
	return this._array.length;
};

// Streamer property class
// wrapper to generic stream implementation

function PropertyStore(instance, property) {
	this.instance = instance;
	this.property = property;
	// needs refreshing on compute delta. Normaly updated on propagate. Cleared by compute delta
	this.invalid = false;
}
var streamerProto = PropertyStore.prototype;
streamerProto.init = function(_, fileName) {
	var property = this.property;
	var instance = this.instance;
	// create the proper factory
	var storageType = property.$storage && ((typeof property.$storage === "function") ? property.$storage(_, instance) : property.$storage);
	factoryTracer.debug && factoryTracer.debug("propertyStore.init: create store of " + storageType + " type");
	this._store = storageType && fileStoreFactory.createFileStore(instance, property, storageType);
	if (fileName != null) this._store.setFile(_, fileName);
};
streamerProto.getUuid = function() {
	return this._store && this._store.fileName;
};
/// -------------
/// ## Stream property getProperties function :
/// ``` javascript
/// var props = anInstance.content(_).getProperties(_);
/// ```
///
/// Returns the stored element properties (file size, content type, ...)
///
streamerProto.getProperties = function(_) {
	return this._store.getProperties(_);
};
/// -------------
/// ## Stream property fileExists function :
/// ``` javascript
/// var isThere = anInstance.content(_).fileExists(_);
/// ```
///
streamerProto.fileExists = function(_) {
	return this._store.fileExists(_);
};
/// -------------
/// ## Stream property createWorkingCopy function :
/// ``` javascript
/// anInstance.content(_).createWorkingCopy(_);
/// ```
///
/// creates a new file for storage, to use for two phase update: when using a workingCopy, one must have persist changes of the file
/// before invoke "Save" on the object. So we should create a new file for update, then "Save" will persist object's pointer to the new file.
///
streamerProto.createWorkingCopy = function(_, isDeleted) {
	var instance = this.instance;
	// allready in working copy ?
	if (!isDeleted && instance._snapshotEnabled && instance.$snapshot) return;
	// create snapshot
	if (instance._snapshotEnabled && !instance.$snapshot) instance.$snapshot = _createSnapshot(_, instance, "$snapshot");
	//console.log("post working");

	instance._data[this.property.name] = {
		$uuid: ""
	};
	//		instance._data[this.property.name] = {};

	this._store.setFile(_, "");

};
/// -------------
/// ## Stream property createReadableStream function :
/// ``` javascript
/// var stream = anInstance.content(_).createReadableStream(_);
/// var buf;
/// while(buf = stream.read(_))
///   doSomething(buf);
/// ```
///
streamerProto.createReadableStream = function(_) {
	return this._store.createReadableStream(_);
};
/// ------------
/// ## Stream property createWritableStream function :
/// ``` javascript
/// var stream = anInstance.content(_).createWritableStream(_);
/// while(buf = something)
///   stream.write(_, buf, encoding);
/// stream.end(lastMessage, encoding, _);
/// ```
///
/// NOTE: the "end" signature isn't standard as normaly doesn't take a callback. But Mongodb "GridFS" driver needs it
/// so make sure you passe a callback in las parameter of "end"
///
streamerProto.createWritableStream = function(_, options) {
	var self = this;
	var instance = this.instance;
	if (instance._snapshotEnabled && !instance.$snapshot) instance.$snapshot = _createSnapshot(_, instance, "$snapshot");
	var opt = options || {};
	opt.referingInstance = {
		className: this.instance._meta.name,
		property: this.property.name,
		uuid: this.instance.$uuid
	};
	//
	if (!this._store.fileName) {
		this._store.setFile(_, (instance._data[this.property.name] = {
			$uuid: helpers.uuid.generate()
		}).$uuid);
		factoryTracer.debug && factoryTracer.debug("propertyStore.createFile: " + this._store.fileName + " check property uuid: " + instance._data[this.property.name].$uuid);
	}
	// Needed to be able to retrieve document later
	opt.fsName = this._store.fileName;
	// TODO: propagate is done before writing the content and passes the options. Is this the right thing to do ?
	if (this.property && this.property.$propagate) this.property.$propagate(_, this.instance, opt);
	//
	var stream = this._store.createWritableStream(_, opt);
	// detect upload done
	if (self.property.$uploadDone) {
		var oldWrite = stream.write;
		stream.write = function(_, buf, enc) {
			var res = oldWrite.call(stream, _, buf, enc);
			if (buf == undefined) {
				// restore write
				stream.write = oldWrite;
				//
				self.property.$uploadDone(_, self.instance);
			}
			return res;
		};
	}
	return stream;

};
streamerProto.uploadDone = function(_) {
	// uploadDone does nothing anymore as now upload done is detected at the end of the stream
	//this.property.$uploadDone && this.property.$uploadDone(_, this.instance);
};
//
streamerProto.deleteFile = function(_) {
	this._store.deleteFile(_);
};
streamerProto.close = function(_) {
	this._store.close(_);
};
streamerProto.attach = function(_, store) {
	var instance = this.instance;
	if (instance._snapshotEnabled && !instance.$snapshot) instance.$snapshot = _createSnapshot(_, instance, "$snapshot");
	var opt = store.getProperties(_) || {};
	opt.referingInstance = {
		className: this.instance._meta.name,
		property: this.property.name,
		uuid: this.instance.$uuid
	};
	/*console.log("AAA: " + (instance._data[this.property.name] = {
		$uuid: store._store.fileName
	}).$uuid);*/
	//console.log("store._store.fileName: " + store._store.fileName);
	// use the same file (store) as the source store
	this._store.setFile(_, (instance._data[this.property.name] = {
		$uuid: store._store.fileName
	}).$uuid);
	factoryTracer.debug && factoryTracer.debug("propertyStore.createFile: " + this._store.fileName + " check property uuid: " + instance._data[this.property.name].$uuid);
	// TODO: propagate is done before writing the content and passes the options. Is this the right thing to do ?
	if (this.property && this.property.$propagate) this.property.$propagate(_, this.instance, opt);
	// force writing the new metadata and closes the stream
	this._store.writeMetadata(_, opt);
};
// ensure locale key is in lowercase

function _fixLocalized(p, v, e) {
	if (!p.$isLocalized) return v;
	if (!v) return v;
	var r = {};
	// !!! quick fix for data having change property type to localized
	if (typeof v !== "object") return {
		"default": v
	};
	//
	Object.keys(v).forEach(function(k) {
		r[k.toLowerCase()] = v[k];
	});
	return r;
}

// Factory class

function Factory(entityMeta) {
	var factorySelf = this;
	factorySelf._meta = entityMeta; // for debug
	// instance prototype

	function Constructor(connection) {
		var inst = this;
		inst._propagateTick = 0;
		inst.$etag = 1;
		// _meta is entity here
		inst._meta = entityMeta;
		// functions bind
		inst._errorCount = 0;
		inst.$properties = {};
		// property to avoid multiple validation
		inst.$validated = {};
		//
		inst._data = {};
		inst._propertyStores = {};
		inst.$attr = {};
		// database connection, usefull for lazy loads
		inst._db = connection;
		// other instances to persist with the main instance
		inst._relatedInst = {};
		// instances that we should reindex
		inst._reindexInst = {};
		//
		inst.$key = inst.computeKey();
		//
		inst._snapshotEnabled = true;
		inst._sysSnapshotEnabled = true;
		//
		inst.$syncUuid = null;
		inst.$loaded = false;
		// DEBUG >>>
		if (inst._meta.name !== factorySelf._meta.name) {
			_errorWithLog("FATAL ERROR !!!!!!!!!!!!! entityMeta differ from factory._meta");
			_errorWithLog("Meta names: inst=" + inst._meta.name + "; factory=" + factorySelf._meta.name);
		}
		// DEBUG <<<
	}

	// generate the Instance constructor dynamically if heapdump is loaded, to get meaningful class names.
	var Instance = heapdumpLoaded ? eval("(function " + helpers.string.capitalize(entityMeta.name) + "(connection) { Constructor.call(this, connection); })") : Constructor;

	var _proto = Instance.prototype;

	forEachKey(entityMeta.$functions, function(name, fn) {
		_proto[name] = fn;
	});

	// array-ify event handlers
	entityMeta.$events = entityMeta.$events || {};
	forEachKey(entityMeta.$events, (name, handlers) => {
		if (!Array.isArray(handlers)) entityMeta.$events[name] = [handlers];
	});

	_proto.load = function(_, data) {
		function _hasReference(value) {
			return value && (typeof value === "object") && (Object.keys(value).length > 0);
			//return value != null;
		}
		var self = this;
		this._snapshotEnabled = false;
		this._sysSnapshotEnabled = false;
		if (data) {
			//
			factoryTracer.debug && factoryTracer.debug("factory.load data: " + sys.inspect(data));
			var keys = Object.keys(data);
			var i = keys.length;
			// direct loop (because this part of code is hot)
			var selfdata = self._data;
			var selfmeta = self._meta;
			while (--i >= 0) {
				var key = keys[i];
				var value = data[key];
				var r = selfmeta.$relations && selfmeta.$relations[key];
				if (value && r && r.isPlural && Array.isArray(value)) {
					(selfdata[key] = new InstanceCollection(self, key, r)).load(_, value);
					// selfdata[key].load(_, value);
				} else if (value && r) {
					var rel = r;
					if (rel.isPlural) {
						(selfdata[key] = new InstanceCollection(self, key, rel)).load(_, value);
						// selfdata[key].load(_, value);
					} else {
						if (!_hasReference(value)) selfdata[key] = null;
						else {
							if (value.$url) self[key](_, _resolveDetailUrl(_, value.$url));
							else {
								var e = _getTargetEntity(_, self._db.model, rel, value.$type, value.$variantType);
								var id = e && e.$key ? (new Template(e.$key)).resolve(value) : value.$uuid;
								// check null relation
								if (!id && !value.$url) selfdata[key] = null;
								else selfdata[key] = self.createChild(_, key, id, value, true);
							}
						}
					}
				} else {
					if (key[0] === "$") self[key] = value;
					else {
						var p = selfmeta.$properties && selfmeta.$properties[key];
						if (p) {
							if (p.isExternalStorage()) {
								// compat, change of storage format
								if (typeof value === "string") selfdata[key] = {
									$uuid: value
								};
								else selfdata[key] = value;
							} else {
								if (p.$encrypt && value) {
									if (data.$isSnapshot) {
										selfdata[key] = value;
									} else {
										base64 = base64 || require('syracuse-license').load('license');
										selfdata[key] = base64.license(1, value, new Boolean(false));
										if (selfdata[key] === null || selfdata[key] === undefined) {
											console.error("Cannot decrypt " + value + ". Set default password '-'");
											selfdata[key] = "-";
										}
									}
									// console.log(self._meta.name+" DECR "+self._data[key])
								} else if (p.$isArray && Array.isArray(value)) selfdata[key] = value.map(function(v) {
									return resourceHelpers.parseValue(p, _fixLocalized(p, v, selfmeta));
								});
								else selfdata[key] = resourceHelpers.parseValue(p, _fixLocalized(p, value, selfmeta));
							}
						} else selfdata[key] = value;
					}
				}
			};
			self.$initialUpdDate = this.$updDate;
			self.$updUser = this.$updUser || this.$creUser;
			//
			if (!data.$isSnapshot && !data.$childRecord && self._meta.$signed) {
				data.$uuid = self.$uuid;
				var toCheck = signSerializer.serializeResource(self._meta, data);
				factoryTracer.debug && factoryTracer.debug("factory.verify checksum of: " + sys.inspect(toCheck));
				if (!checksum.verify(toCheck)) throw new Error(locale.format(module, "checksumVerifyError", self._meta.name, self.$uuid));
			}
			self.$loaded = true;
		}
		//
		self.$key = self.computeKey();
		this._snapshotEnabled = true;
		this._sysSnapshotEnabled = true;
	};
	/// -------------
	/// ## Instance getEntity function :
	/// ``` javascript
	/// var entity = anInstance.getEntity(_);
	/// ```
	///
	_proto.getEntity = function(_) {
		return this._meta;
	};

	_proto.computeKey = function() {
		return (this._meta.$key ? (new Template(this._meta.$key)).resolve(this._data) : this.$uuid);
	};

	_proto.computeUrl = function(asResource) {
		if (this.$trackingId && !asResource) return [this._db.baseUrl, "$workingCopies('" + this.$trackingId + "')"].join("/") + "?representation=" + this._meta.name + ".$edit";
		else return [this._db.baseUrl, this._meta.plural + "('" + this.computeKey() + "')"].join("/") + "?representation=" + this._meta.name + ".$details";
	};

	_proto.computeUrlShort = function() {
		if (this.$trackingId) return [this._db.baseUrl, "$workingCopies('" + this.$trackingId + "')"].join("/");
		else return [this._db.baseUrl, this._meta.plural + "('" + this.computeKey() + "')"].join("/");
	};

	_proto._load = function(_, data) {
		// TODO !!!!!
		throw new Error("NYI");
	};

	// run validations before save

	function _validateBeforeSave(_, instance, ignoreRestrictions) {
		factoryTracer.debug && factoryTracer.debug("factory._validateBeforeSave: " + instance._meta.name);
		if (!ignoreRestrictions && !_canUpdateInstance(_, instance)) {
			instance.$addError(locale.format(module, "updateForbidden", instance._meta.name, ""));
			return;
		}
		// revalidate all props as they might never been set
		flows.eachKey(_, instance._meta.$properties, function(_, name, property) {
			_validateProperty(_, instance, property, name, instance[name](_));
		});
		//
		flows.eachKey(_, instance._meta.$relations, function(_, name, relation) {
			var mandatory = relation.$isMandatory;
			if (typeof mandatory === "function") mandatory = mandatory(_, instance);
			if (mandatory || relation.getIsChild()) { // TODO: getIsChild parameter ? Important if $variants //
				var relValue = instance[name](_);
				if (mandatory) {
					if ((relation.isPlural && relValue.isEmpty()) || (relValue == null)) instance.$addError(name + " is mandatory", name);
				}
				if (relValue && relation.getIsChild()) { // TODO: getIsChild parameter ? Important if $variants //
					if (relation.isPlural) {
						var values = relValue.toArray(_);
						values.forEach_(_, function(_, value) {
							_validateBeforeSave(_, value, ignoreRestrictions);
							instance._errorCount += value._errorCount;
						});
					} else {
						_validateBeforeSave(_, relValue, ignoreRestrictions);
						instance._errorCount += relValue._errorCount;
					}
				}
			}
		});
		// control rule
		if (instance._meta.$control) instance._meta.$control(_, instance);
		//
		flows.eachKey(_, instance._relatedInst, function(_, key, value) {
			// do not apply restrictions for $inv relations
			_validateBeforeSave(_, value, value && value._relation && (value._db.model.singularize(value._relation.$inv) === instance._meta.name));
			value.getAllDiagnoses(_, instance.$diagnoses, {
				addEntityName: true,
				addPropName: true
			});
			//			if(value._errorCount)
			//				instance.$addError("Related instance error: "+value.$uuid);
		});
		//
		if (instance._errorCount) factoryTracer.debug && factoryTracer.debug("factory._validateBeforSave errors: " + sys.inspect(instance.$properties));
		factoryTracer.debug && factoryTracer.debug("factory._validateBeforeSave exit: " + instance._meta.name);
	}
	// getters ****************************************************

	function _getExternalStorageProp(_, instance, name, property) {
		// getter
		var val;
		if (property.$compute) {
			val = property.$compute(_, instance);
			//
			//factoryTracer.debug && factoryTracer.debug("factory._getExternalStorageProp(" + name + "): $compute=" + sys.inspect(val));
		} else {
			if (!(val = instance._propertyStores[property.name])) {
				val = instance._propertyStores[property.name] = new PropertyStore(instance, property);
				val.init(_);
			}
			//
			//factoryTracer.debug && factoryTracer.debug("factory._getExternalStorageProp(" + name + ")=" + sys.inspect(val));
		}
		return val;
	}
	/// -------------
	/// ## Instance getPropAllLocales function :
	/// ``` javascript
	/// var object = anInstance.getPropAllLocales(_, propName);
	/// ```
	/// For localized properties, returns a map with all locales
	///
	_proto.getPropAllLocales = function(_, propName) {
		var e = this.getEntity(_);
		var p = e.$properties[propName];
		if (!p) throw new Error(locale.format(module, "propertyNotFound", propName, e.name));
		return p.$compute ? p.$compute(_, this, true) : this._data[propName];
	};
	//

	function _getProp(_, instance, name, property) {
		// getter
		var val = instance._data[name];
		if (instance._snapshotType && val) val = val[instance._snapshotType] || val;
		//
		factoryTracer.debug && factoryTracer.debug("factory._getProp(" + name + ")=" + val);
		return val;
	}

	function _getRel(_, instance, name, relation) {
		factoryTracer.debug && factoryTracer.debug("factory._getRel enter: " + instance.$uuid + "." + name);
		// getter
		/*		if (relation.$compute) {
			// FDB
			if (relation.isPlural && !instance._data[name]) instance._data[name] = new InstanceCollection(instance, name, relation);
			return instance._data[name];
		}*/
		if (relation.isPlural) {
			// returns InstanceCollection, not an array
			if (!instance._data[name]) instance._data[name] = new InstanceCollection(instance, name, relation);
			// lazy loads collection
			if (!instance._data[name].loaded) _computeCollection(_, instance._data[name]);
			factoryTracer.debug && factoryTracer.debug("factory._getRel collection: " + name + ";" + sys.inspect(instance._data[name]._array.map(

				function(item) {
					return {
						$uuid: item.$uuid,
						$loaded: item.$loaded
					};
				})));
			return instance._data[name];
		} else {
			var val = instance._data[name];
			if (instance._snapshotType && val) {
				val = val[instance._snapshotType] || val;
				// on get, if is child, create a snapshot in case someone gets a pointer
				if (relation.getIsChild(val.$variantType)) _createSnapshot(_, val, instance._snapshotType);
			}
			// lazy load associations
			if (val && !relation.getIsChild(val.$variantType) && val.$key && !val.$loaded) {
				val.ensureLoaded(_);
				// if stil not loaded, the reference might not exists anymore (like it was deleted)
				if (!val.$loaded) val = null;
			}
			factoryTracer.debug && factoryTracer.debug("factory._getRel: " + name + ";" + (val && val.$inspect && val.$inspect(false)));
			return val;
		}
	}
	// setters *********************************************************
	// set value

	function _prepareSetValue(_, instance, name, property, val, validateFunction) {
		if (instance._controlling && instance._controlling !== property.name) {
			throw new Error("invalid attempt to assign " + property.name +
				" while controlling " + instance._controlling);
		}
		//
		var oldVal = instance._data[name];
		// #7445: Protect SAGE factory links

		if (oldVal && instance._meta.$relations && instance._meta.$relations[name]) {
			if (oldVal.ensureLoaded) oldVal.ensureLoaded(_);
			if (oldVal.$uuid !== (val && val.$uuid) && !canUpdateRelation(_, instance, oldVal, name, true)) return false;
		}
		// allow setting null values
		if (instance._data.hasOwnProperty(name) && (oldVal === val)) return false;
		// control (before setting new value)
		// TODO: doesn't work, see later
		/*		instance._controlling = property.name;
		try {
			var errCount = _errorCount(instance);
			// validation
			if (instance._meta.$properties[name])
				validateFunction(_, instance, property, name, val);
			// control rule
			if (property.$control)
				property.$control(_, instance, val);
		}
		finally {
			instance._controlling = null;
		}
		// check if validation has found errors
		if(errCount !== _errorCount(instance))
			return false;*/
		//
		if (instance._snapshotEnabled && !instance.$snapshot) instance.$snapshot = _createSnapshot(_, instance, "$snapshot");
		//
		if (!instance._disableValidate) {
			var $prop = (instance.$properties[name] = instance.$properties[name] || {});
			$prop.$diagnoses = [];
		}
		// EXCEPTION: setting null when allready undefined shouldn't fire validation rules but should write in the null value
		if ((oldVal == null) && (val == null)) {
			instance._data[name] = val;
			return false;
		}
		//
		instance.$validated[name] = false;
		//
		return true;
	}

	function _afterSetValue(_, instance, name, property, val, validateFunction) {
		// force lazy load for relations
		val = instance[name](_);
		//
		instance._controlling = property.name;
		var errCount;
		try {
			errCount = _errorCount(instance);
			// validation
			if (instance._meta.$properties[name] && !instance._disableValidate) validateFunction && validateFunction(_, instance, property, name, val);
			// control rule
			if (property.$control) property.$control(_, instance, val);
		} finally {
			instance._controlling = null;
		}
		// propagate, is after value is set

		if (property.$propagate && errCount === _errorCount(instance)) {
			//		if (property.$propagate) {
			var closure = function(_) {
				var svPropagate = property.$propagate;
				property.$propagate = null;
				instance._disableValidate = true; // avoid validation of properties modified by propagate
				try {
					_safeCall(_, instance, property.name, svPropagate, "_propagating", val);
				} finally {
					property.$propagate = svPropagate;
					instance._disableValidate = false;
				}
			};
			// deferProgpagate list may be on an ancestor - walk the parent chain up to find it.
			var inst = instance;
			while (inst._parent) inst = inst._parent;
			if (inst.deferPropagate) {
				inst.defer("deferPropagate", closure);
			} else closure(_);
		}
	}
	_proto.setLocalizedProp = function(_, name, localeCode, val) {
		var instance = this;
		//
		var _data = instance._data[name] = (instance._data[name] || {});
		// normalize locale code to lowercase
		localeCode = localeCode.toLowerCase();
		if (!_data["default"]) _data["default"] = val;
		else if (val && val !== _data[localeCode]) {
			// use global locale to fill default value.
			// when (non empty) value for global default locale is set, then also default value is set

			admHelper = admHelper || require('syracuse-auth/lib/helpers');
			var settingdata = admHelper.getStandardSetting(_);
			var lCode = (settingdata && settingdata.localeCode) || "en-us";
			if (!_data[lCode] || lCode === localeCode) {
				_data["default"] = val;
			}
		}
		_data[localeCode] = val;
		//
		factoryTracer.debug && factoryTracer.debug("factory.setLocalizedProp: " + name + "," + localeCode + "," + val + "; Actual value: " + sys.inspect(instance._data[name]));
	};

	function _setProp(_, instance, name, property, val) {
		// setter
		factoryTracer.debug && factoryTracer.debug("factory._setProp: " + name + "," + sys.inspect(val));
		//
		if (property.$isArray && property.$sorted) val.sort(property.$sort || function(a, b) {
			return resourceHelpers.compare(property, a, b);
		});
		instance._data[name] = val;
	}

	// unified function for setting a value
	function _setValueInt(_, self, name, property, val, _validateProperty) {
		// check
		if (!_prepareSetValue(_, self, name, property, val, _validateProperty)) return;
		// setter
		if (property.$isLocalized) {
			// var self = this;
			// accept maps
			if (val && (typeof val === "object")) {
				if (val["default"]) self.setLocalizedProp(_, name, "default", val["default"]);
				Object.keys(val).forEach_(_, function(_, key) {
					self.setLocalizedProp(_, name, key, val[key]);
				});
			} else self.setLocalizedProp(_, name, locale.current, val);
		} else {
			if (property.isExternalStorage() && val && val.$value && val.$contentType && val.$fileName) {
				//val.$value is the content of file encoded in base64
				var store = _getExternalStorageProp(_, self, name, property);
				if (store) {
					store.createWorkingCopy(_);
					var stream = store.createWritableStream(_, {
						contentType: val.$contentType,
						fileName: val.$fileName
					});
					var buf = new Buffer(val.$value, 'base64');
					delete val.$value;
					stream.write(_, buf, "binary");
					stream.write(_, null);
					store.uploadDone(_);
				}
			} else _setProp(_, self, name, property, val);
		}
		// propagate
		// validation & control
		_afterSetValue(_, self, name, property, val, _validateProperty);

	}

	function _setRel(_, instance, name, property, val, isInverse, variantName) {
		// setter
		factoryTracer.debug && factoryTracer.debug("factory._set: " + name + "," + sys.inspect(isInverse) + ", variantName=" + variantName + "," + ((val && val.$inspect && val.$inspect(true)) || sys.inspect(val)) + ")");
		//
		if (!_prepareSetValue(_, instance, name, property, val, _validateRelation)) return;
		//
		//if (!_checkRights(_, val)) throw new Error(locale.format(module, "readForbidden", val._meta.name));
		if (!_checkRights(_, val)) return instance.$addError(locale.format(module, "readForbidden", val._meta.name), name);
		//
		if (property.isPlural) {
			// set of array used in object initialisation
			throw (new Error("Instance: cannot set collection property"));
		} else {
			// TODO: some meta (as $variantType) are stored directly into the instance. It's not correct if the same instance
			// is associated several times with different relations !!!!
			// should add a level (like $item) between _data and the actual associated instance
			if (val && property.$variants) {
				val.$variantType = val.$variantType || variantName || _getVariantType(property.$variants, val.getEntity(_).name);
				if (!val.$variantType) throw new Error("Instance: No variant type found for entity " + val.getEntity(_).name);
			}
			//
			var oldVal = instance._data[name];
			instance._data[name] = val;
			if (!isInverse && val) {
				// prevent circular refs
				if (!_instanceParentOf(val, instance)) {
					val._parent = instance;
					val._relation = property;
				}
			}
			if (property.$isDynamicType && val) val.$type = val.getEntity(_).name;
			// replication
			if (property.$propagateInv) {
				if (property.$inv && val._meta.$relations[property.$inv] && val._meta.$relations[property.$inv].isPlural) {
					factoryTracer.debug && factoryTracer.debug("factory._set propagateInv to list; oldVal: " + (oldVal && oldVal.$uuid));
					if (oldVal) {
						factoryTracer.debug && factoryTracer.debug("factory._set remove from old list of: " + oldVal.$uuid);
						oldVal.ensureLoaded(_);
						oldVal[val._meta.$relations[property.$inv].name](_).deleteInstance(_, instance.$uuid);
						instance.addRelatedInstance(oldVal);
					}
					// add instance to new list
					if (!isInverse) {
						// for use of the inverse list, mark instance as $loaded. This must prevent destroying _data by ensureLoaded
						instance.$loaded = true;
						// use getter to lazy load
						instance[property.name](_)[val._meta.$relations[property.$inv].name](_).set(_, instance, true);
						// to persist
						instance.addRelatedInstance(instance[property.name](_));
					}
				}
			}
		}
		// validation & control
		_afterSetValue(_, instance, name, property, val, _validateRelation);
	}
	forEachKey(entityMeta.$properties, function(name, property) {
		if (property.$compute) {
			_proto[name] = function(_, val) {
				if (arguments.length === 1) {
					//
					factoryTracer.debug && factoryTracer.debug("factory.get compute prop: " + property.name);
					return _safeCall(_, this, property.name, property.$compute, "_computing");
				} else {
					_setValueInt(_, this, name, property, val, _validateProperty);
				}
			};
		} else if (property.isExternalStorage()) {
			_proto[name] = function(_, val) {
				if (arguments.length === 1) {
					//
					return _getExternalStorageProp(_, this, name, property);
				} else {
					return _setValueInt(_, this, name, property, val, _validateProperty);
				}
			};
		} else if (property.$isLocalized) {
			_proto[name] = function(_, val) {
				if (arguments.length === 1) {
					//
					return _getLocalizedProp(_, this, name, property);
				} else {
					return _setValueInt(_, this, name, property, val, _validateProperty);
				}
			};
		} else {
			_proto[name] = function(_, val) {
				if (arguments.length === 1) {
					//
					return _getProp(_, this, name);
				} else {
					_setValueInt(_, this, name, property, val, _validateProperty);
				}
			};
		}
	});

	forEachKey(entityMeta.$relations, function(name, relation) {
		if (relation.$compute) {
			_proto[name] = function(_, val, isInverse, variantName) {
				if (arguments.length === 1) {
					factoryTracer.debug && factoryTracer.debug("factory.get compute rel: " + relation.name);
					if (relation.isPlural) return (this._data[name] = (this._data[name] || (new InstanceCollection(this, name, relation))));
					else return _safeCall(_, this, relation.name, relation.$compute, "_computing");
				} else {
					// isInverse is internal prop should not have been exposed in this operation. Have to leave it here for compat but will support also 
					// to ignore it. In this case the second parameter is variantName
					var isInv = isInverse;
					var varName = variantName;
					if (typeof isInverse === "string") {
						isInv = false;
						varName = isInverse;
					}
					//
					_setRel(_, this, name, relation, val, isInv, varName);
				}
			};

		} else {
			_proto[name] = function(_, val, isInverse, variantName) {
				if (arguments.length === 1) {
					return _getRel(_, this, name, relation);
				} else {
					// isInverse is internal prop should not have been exposed in this operation. Have to leave it here for compat but will support also 
					// to ignore it. In this case the second parameter is variantName
					var isInv = isInverse;
					var varName = variantName;
					if (typeof isInverse === "string") {
						isInv = false;
						varName = isInverse;
					}
					//
					_setRel(_, this, name, relation, val, isInv, varName);
				}
			};

		}
	});

	_proto._initialize = function(_, context, initialInstanceId) {
		if (!this.$uuid) {
			this.$uuid = initialInstanceId || helpers.uuid.generate();
			this.$key = this.computeKey();
			this.$created = true;
			var session = globals.context.session;
			this.$creUser = (session && session.getUserLogin(_)) || "anonymous";
			this.$updUser = this.$creUser;
		}
		//
		var instance = this;
		factoryTracer.debug && factoryTracer.debug("factory._initialize: " + instance.$uuid);
		// create snapshot
		instance._snapshotEnabled = true;
		instance._sysSnapshotEnabled = true;
		if (!instance.$snapshot) instance.$snapshot = _createSnapshot(_, instance, "$snapshot");
		//		
		flows.eachKey(_, instance._meta.$properties, function(_, name, property) {
			if (property.hasDefaultValue()) instance[name](_, property.getDefaultValue(_, instance));
			else if (property.$type === "boolean") instance[name](_, false);
		});
		flows.eachKey(_, instance._meta.$relations, function(_, name, relation) {
			if (relation.hasOwnProperty("defaultValue")) {
				var defVal = null;
				if (typeof relation.defaultValue === "function") defVal = relation.defaultValue(_, instance);
				else defVal = relation.defaultValue;
				//
				if (relation.isPlural) {
					var rel = instance[name](_);
					if (defVal) {
						if (Array.isArray(defVal)) defVal.forEach_(_, function(_, vv) {
							rel.set(_, vv);
						});
						else rel.set(_, defVal);
					}
				} else instance[name](_, defVal);
			}
		});
		if (instance._meta.$init) instance._meta.$init(_, instance, context);
		//
		return instance;
	};
	_proto.$addError = function(message, propName, links, stackTrace, code) {
		factoryTracer.debug && factoryTracer.debug("error added for " + this.$uuid + "." + propName + " " + message);
		this._errorCount++;
		var node = this;
		var controlProp = propName || this._controlling;
		if (controlProp) node = (this.$properties[controlProp] = this.$properties[controlProp] || {});
		node.$diagnoses = node.$diagnoses || [];
		var diag = {
			$severity: "error",
			$message: message,
			$links: links,
			$stackTrace: stackTrace
		};
		if (code) {
			diag.code = code;
			diag.propname = propName;
		}
		node.$diagnoses.push(diag);
	};
	_proto.$addDiagnose = function(severity, message, propName, links, stackTrace) {
		factoryTracer.debug && factoryTracer.debug("diagnose added for " + this.$uuid + "." + propName + " " + message);
		var node = this;
		if (propName) node = (this.$properties[propName] = this.$properties[propName] || {});
		node.$diagnoses = node.$diagnoses || [];
		node.$diagnoses.push({
			$severity: severity,
			$message: message,
			$links: links,
			$stackTrace: stackTrace
		});
	};
	_proto.lockInstanceRetry = function(_) {
		adminHelper.lockInstanceRetry(_, this);
	};
	_proto.lockInstance = function(_) {
		adminHelper.lockInstance(_, this);
	};
	_proto.unlockInstance = function(_) {
		adminHelper.unlockInstance(_, this);
	};
	_proto.$inspect = function(withData, withMeta) {
		return "instance: " + this._meta.name + "; $uuid: " + this.$uuid + (withData ? "; data=" + sys.inspect(this._data) : "") + (withMeta ? sys.inspect(this._meta) : "");
	};
	// sync parameter: SData consistent handling of $uuid (not with identification $uuid === $key)
	//  at the moment just for Link and Sync protocol (not for all protocols because $uuid is used very much in convergence client)
	// WARNING: To ensure compatibility the sync and the shallow argument does not have the same order 
	_proto._internalSerialize = function(_, sync, shallow, relation, options) {
		return _internalSerialize(_, this, shallow, sync, relation, options);
	};
	// sync parameter: SData consistent handling of $uuid (not with identification $uuid === $key)
	//  at the moment just for Link and Sync protocol (not for all protocols because $uuid is used very much in convergence client)
	_proto.serializeInstance = function(_, sync) {
		return _serialize(_, this, null, sync);
	};
	_proto.ensureLoaded = function(_) {
		// enforce $loaded check as in some cases of circular navigation we might endup destroying some modifications
		this.$loaded = this.$loaded || (this._data && (Object.keys(this._data).length !== 0));
		//
		if (!this.$loaded) {
			factoryTracer.debug && factoryTracer.debug("factory.ensureLoaded.load: " + this.$uuid);
			var asso = _instanceById(_, {
				entity: this._meta,
				db: this._db,
				instanceId: this.$key
			});
			if (asso) {
				// replace _data by _data fetched
				var self = this;
				self._data = asso._data;
				forEachKey(asso, function(key) {
					if (key[0] === "$") self[key] = asso[key];
				});
				self.$initialUpdDate = asso.$updDate;
			}
			//			this.$key = this.$uuid;
			this.$loaded = asso != null;
		}
		//
		return this;
	};
	//
	_proto.getSnapshotDelta = function(_) {
		return _computeDelta(_, this, "$snapshot", null, false);
	};
	_proto.getSaveSnapshotDelta = function(_) {
		return serializer.serialize(_, this, saveSerializer);
	};
	_proto.getClassName = function() {
		return helpers.string.capitalize(this._meta.name);
	};
	_proto.createChild = function(_, relationName, key, data, loadOnly, variantType) {
		factoryTracer.debug && factoryTracer.debug("factory.syncCreateChild: " + relationName + "; variantType=" + variantType + ";" + sys.inspect(data));
		//
		var self = this;
		var r = self._meta.$relations[relationName];
		var md = self._db.model;
		var varType = variantType || (data && data.$variantType);
		//
		var t;
		if (data) {
			data.$childRecord = true; // is NOT only for a child relation but to identify that it's not the top instance
			if (r.$isDynamicType || r.$variants) {
				if (data.$type) t = data.$type;
				else if (data.$url) {
					var url = data.$url;
					var segs = url.split("?")[0].split("/").slice(-4);
					var det = httpHelpers.decodeDetailSegment(segs[3]);
					if (det) {
						data.$type = t = md.singularize(det.name);
						key = det.id;
					}
				}
			}
		}
		var tgType = _getTargetEntity(_, md, r, t, varType);
		// DEBUG
		if (tgType) {
			var tgTypefactory = tgType.factory;
			if (tgTypefactory._meta.name !== tgTypefactory._entityMeta.name) {
				var a = tgTypefactory._meta.name;
				var b = tgTypefactory._entityMeta.name;
				console.error("FATAL FACTORY FACTORY TYPEOF META (" + typeof a + ") != _META (" + b + ") - (2603)");
				console.error("FATAL FACTORY FACTORY META (" + a + ") != _META (" + b + ") - (2604)");
				//
				//process.kill(process.pid);
			}
			if (!r.$isDynamicType && r.targetEntity && tgType.name !== r.targetEntity.name) {
				console.error("FATAL FACTORY (2528) tgType: " + tgType.name + " !== r.targetEntity " + r.targetEntity.name);
			}
		}
		// DEBUG
		var elt = tgTypefactory.syncCreateInstance(_, data, self._db, self._context);
		// DEBUG
		if (elt && relationName === "vignettes" && elt._meta.name === "dashboardVariant") {
			console.error("FATAL FACTORY (2530) tgType: " + sys.inspect(tgType));
			console.error("FATAL FACTORY (2530) tgType.factory: " + sys.inspect(tgTypefactory._meta));
		}
		// DEBUG >>>
		if ((self._meta.name === "menuBlock") && (elt._meta.name === "menuBlock")) {
			// ERROR CONDITION !!!
			_errorWithLog("FATAL ERROR !!!!!!!!!! - Wrong created item meta");
			_errorWithLog("Variant types : data=" + (data && data.$variantType) + "; param=" + variantType + "; result=" + varType);
			_errorWithLog("r name=" + r.name);
			_errorWithLog("type: data=" + (data && data.$type) + "; result=" + t);
			_errorWithLog("data url: " + (data && data.$url));
			_errorWithLog("target type: " + tgType.name);
			_errorWithLog("target type factory: " + (tgType && (tgType.factory._entityMeta.name + ";" + tgType.factory._meta.name)));
		}
		// DEBUG <<<
		// don't generate an uuid, let _initialize do it
		if (tgType.$key && key) {
			elt.$key = key;
			elt.$uuid = (data && data.$uuid);
		} else {
			elt.$uuid = elt.$key = key;
		}
		// if creating -> is loaded
		elt.$loaded = (key == null) || r.getIsChild(elt.$variantType) || (data && r.$inlineStore);
		elt._snapshotEnabled = true;
		elt._sysSnapshotEnabled = true;
		elt._parent = this;
		elt._relation = r;
		// variant
		if (r.$variants) elt.$variantType = varType || _getVariantType(r.$variants, tgType.name);
		//
		if (!loadOnly && ((!data && r.getIsChild(elt.$variantType)) || !key)) {
			elt._initialize(_, self._context);
			elt.$created = true;
			var session = globals.context.session;
			elt.$creUser = (session && session.getUserLogin(_)) || "anonymous";
			elt.$updUser = r.$creUser;
			elt.$creDate = new Date();
		}
		//
		if (data && data.$mark) elt.$mark = data.$mark;
		//
		return elt;
	};
	// add the instance to persist to the related list of the top instance
	_proto.addRelatedInstance = function(instance) {
		if (!instance) return;
		factoryTracer.debug && factoryTracer.debug("factory.addRelatedInstance: " + instance.$inspect());
		var top = getTopInstance(this);
		factoryTracer.debug && factoryTracer.debug("factory.topInstance: " + top.$inspect());
		// avoid loops
		if (instance._relatedInst[this.$uuid] || instance._relatedInst[top.$uuid]) return;
		//
		top._relatedInst[instance.$uuid] = instance;
		factoryTracer.debug && factoryTracer.debug("factory.topInstance related inst: " + sys.inspect(top._relatedInst));
	};
	// add the instance to reindex to the related list of the top instance
	_proto.addReindexInstance = function(instance) {
		if (!instance) return;
		factoryTracer.debug && factoryTracer.debug("factory.addReindexInstance: " + instance.$inspect());
		var top = getTopInstance(this);
		factoryTracer.debug && factoryTracer.debug("factory.topInstance: " + top.$inspect());
		top._reindexInst[instance.$uuid] = instance;
		factoryTracer.debug && factoryTracer.debug("factory.topInstance reindex inst: " + sys.inspect(top._reindexInst));
	};

	function _runEvents(_, events, self, params) {
		if (!events) return;
		events.forEach_(_, function(_, ev) {
			if (typeof ev === "function") ev(_, self, params);
			else if (ev.handler) ev.handler(_, self, params);
		});
	}

	function _fireBeforeSave(_, self, params) {
		_runEvents(_, self._meta && self._meta.$events && self._meta.$events.$beforeSave, self, params);
		_runEvents(_, self._db.model && self._db.model.$events && self._db.model.$events.$beforeSave, self, params);
		// can save ?
		_runEvents(_, self._meta && self._meta.$events && self._meta.$events.$canSave, self, params);
		_runEvents(_, self._db.model && self._db.model.$events && self._db.model.$events.$canSave, self, params);
		// notify child instances
		self._meta && flows.eachKey(_, self._meta.$relations, function(_, relName, rel) {
			if (rel.getIsChild()) { // TODO: getIsChild parameter ? Important if $variants //
				var relInst = self[relName](_);
				if (!relInst) return;
				if (rel.isPlural) {
					relInst.toArray(_, false).forEach_(_, function(_, inst) {
						_fireBeforeSave(_, inst, params);
					});
				} else {
					_fireBeforeSave(_, relInst, params);
				}
			}
		});
	}

	_proto.fireEvent = function(_, eventName, params) {
		// only events on main instance
		_runEvents(_, this._meta && this._meta.$events && this._meta.$events[eventName], this, params);
	}


	function _fireErrorSave(_, self, params) {
		// only events on main instance
		_runEvents(_, self._meta && self._meta.$events && self._meta.$events.$errorSave, self, params);
	}

	function _fireAfterSave(_, self, params) {
		_runEvents(_, self._meta && self._meta.$events && self._meta.$events.$afterSave, self, params);
		_runEvents(_, self._db.model && self._db.model.$events && self._db.model.$events.$afterSave, self, params);
		// notify child instances
		self._meta && flows.eachKey(_, self._meta.$relations, function(_, relName, rel) {
			if (rel.getIsChild() && rel.targetEntity && rel.targetEntity.$events) { // TODO: getIsChild parameter ? Important if $variants //
				var relInst = self[relName](_);
				if (!relInst) return;
				if (rel.isPlural) {
					relInst.toArray(_, false).forEach_(_, function(_, inst) {
						_fireAfterSave(_, inst, params);
					});
				} else {
					_fireAfterSave(_, relInst, params);
				}
			}
		});
	}
	_proto.findError = function(_) {
		return _findError(_, this);
	};
	_proto.validateSelf = function(_) {
		_validateBeforeSave(_, this);
		return !_existsError(_, this);
	};
	// save an instance to database, simplified operation to be invoked from framework
	_proto.$tryPersist = function(_, parameters, options) {
		var opt = options || {};
		opt.shallowSerialize = true;
		var self = this;
		var res = self.save(_, parameters, opt);
		var diags = self.getAllDiagnoses(_, null, {
			addEntityName: true,
			addPropName: true
		}) || [];
		((((res || {}).$actions || {}).$save || {}).$diagnoses || []).forEach(function(dd) {
			diags.push(dd);
		});
		var _err = diags.filter(function(dd) {
			return dd.$severity === "error";
		});
		var result = {
			success: true
		};
		if (_err && _err.length) {
			result.success = false;
			result.errors = _err;
		}
		if (diags && diags.length) result.diagnoses = diags;
		return result;
	};
	_proto.$persist = function(_, parameters, options) {
		var res = this.$tryPersist(_, parameters, options);
		if (!res.success) {
			var err = new Error(locale.format(module, "resourceNotSaved"));
			err.$diagnoses = res.errors;
			err.$httpStatus = 400;
			throw err;
		}
	};
	// save an instance to database
	_proto.save = function(_, parameters, options) {
		var self = this;
		var opt = options || {};
		//
		if (opt.clearDiagnoses) _clearDiagnoses(_, self);
		// fire before save
		_fireBeforeSave(_, this, parameters);
		// fire $onDelete (for childrens)
		_fireOnDelete(_, this, false);
		// global validation
		!self._meta.$ignoreValidateOnSave && _validateBeforeSave(_, this, opt.ignoreRestrictions);
		// compute checksum
		var r;
		if (self._meta.$signed) {
			r = serializer.serialize(_, self, signSerializer);
			factoryTracer.debug && factoryTracer.debug("factory.save: compute signature on: " + sys.inspect(r));
		}
		if (r) {
			checksum.sign(r);
			self.$signature = self._data.$signature = r.$signature;
		}
		// from datacontext._execoperation
		var op;
		var s = self._meta.$actions && self._meta.$actions.$save;
		if (typeof s === "function") op = s(_, self);
		else op = {};
		op.$isRequested = false;
		op.$links = {};
		if (!(self.$created && (self._meta.$isPersistent !== false))) op.$links.$create = {
			$isHidden: true
		};
		//
		var hasErrors = _existsError(_, this);
		// if errors, hide standard links
		// always send links status to show them if they were hidden and the error was fixed
		op.$links.$details = (op.$links.$details || {});
		op.$links.$details.$isHidden = hasErrors;
		op.$links.$query = (op.$links.$query || {});
		op.$links.$query.$isHidden = hasErrors;
		op.$links.$create = (op.$links.$create || {});
		op.$links.$create.$isHidden = hasErrors;
		//
		if (!hasErrors) try {
				op.$diagnoses = [];
				this._saveErrorCode = 0;
				if (this.$save) {
					this.$save(_, op, parameters);
					hasErrors = _existsError(_, this);
					hasErrors = hasErrors || (op.$diagnoses || []).some(function(d) {
						return d.$severity === "error";
					});
				} else {
					// increase the tick
					if (this._noIncreaseTick) {
						this._noIncreaseTick = false;
					} else {
						if (this._meta.$allowSync) {
							if (this.$created && !this.$syncUuid) {
								this.$syncUuid = helpers.uuid.generate();
							}
							this.$tick = this._meta.tick(_, this._db) - 1;
							this.$endpoint = "";
							if (this.$stamp) this.$stamp = undefined; // do not store local timestamps twice
						}
					}

					var saveResult = this._db.saveInstance(_, this);
					factoryTracer.debug && factoryTracer.debug("factory.save: db saveResult: " + sys.inspect(saveResult));
					if (saveResult === 0) {
						factoryTracer.debug && factoryTracer.debug("factory.save: concurrency error; lastModified: " + this.$updDate);
						this._saveErrorCode = httpHelpers.httpStatus.Conflict;
						hasErrors = true;
						throw new Error("Cannot save this resource as it has been modified by another user (" + this._meta.name + "." + this.$uuid + ")");
					}
				}
				// cleanup external storage files
				_cleanupExternalStorage(_, this);
				//
				if (this._snapshotEnabled && this.$snapshot) this.$snapshot = null;
				// save related instances
				// Q : what if fails ? (we should validate related instances first)
				// Q : should we do this at first or at the end ?
				factoryTracer.debug && factoryTracer.debug("factory.save: relatedInstances; $uuid: " + this.$uuid + "; " + sys.inspect(this._relatedInst));
				var hasRelatedErrors = false;
				flows.eachKey(_, this._relatedInst, function(_, key, value) {
					var res = value.save(_, null, {
						shallowSerialize: opt.shallowSerialize
					});
					// push diagnoses to main diagnoses
					res.$actions.$save.$diagnoses && res.$actions.$save.$diagnoses.forEach(function(diag) {
						var d = _normalizeDiag(diag);
						if (d.$severity === "error") {
							op.$diagnoses.push(d);
							hasRelatedErrors = true;
							hasErrors = true;
						}
					});
					// Propagate diagnoses of related instances
					value.$diagnoses && value.$diagnoses.forEach(function(diag) {
						var d = _normalizeDiag(diag);
						if (d.$severity === "error") {
							op.$diagnoses.push(d);
							hasRelatedErrors = true;
							hasErrors = true;
						}
					});
				});
				// cleanup deleted instances (plural relations)
				_cleanupDeleted(_, this);
				// cleanup snapshot
				this.$snapshot = null;
				// do not cleanup snapshot because after save there might be calls of _computeDelta
				//this.$sysSnapshot = null;
				//
				this.unlockInstance(_);
				//
				if (!hasRelatedErrors && !hasErrors) op.$diagnoses.splice(0, 0, {
					$severity: "success",
					$message: locale.format(module, "resourceSaved")
				});
				//
				self.$created = false;
			} catch (ex) {
				op.$diagnoses.push({
					$severity: "error",
					$message: ex.message,
					$stackTrace: ex.safeStack
				});
				hasErrors = true;
				op.$links && Object.keys(op.$links).forEach(function(k) {
					op.$links[k].$isHidden = true;
				});
				factoryTracer.error && factoryTracer.error("Save error", ex);
			}
			//		op.$title = "Save";
		op.$isDisabled = true;
		op.$isRequested = false;
		//
		var result = opt.shallowSerialize ? {} : _serialize(_, this, false, null, null, {
			include: parameters && parameters.include,
			select: parameters && parameters.select
		});
		// crnit : from serializer
		result.$actions = result.$actions || {};
		result.$actions.$save = op;
		factoryTracer.debug && factoryTracer.debug("Result actions $save: " + sys.inspect(result.$actions.$save));
		// fire after save
		if (!hasErrors) _fireAfterSave(_, this, parameters);
		else _fireErrorSave(_, this, parameters);
		//
		this._relatedInst = {};
		//
		return result;
	};
	_proto.getEndpoint = function(_) {
		// TODO: should optimise - endpoint should be a variable. Might be entities should be declined by endpoint !
		var e = this.getEntity(_);
		return adminHelper.getEndpoint(_, {
			application: e.contract.application,
			contract: e.contract.contract,
			dataset: this._db.dataset.database
		});
	};
	_proto.getUrl = function(_) {
		var e = this.getEndpoint(_);
		return [e.getBaseUrl(_), this._meta.plural + "('" + this.computeKey() + "')"].join("/");
	};

	function _evaluate(_, instance, expression) {
		// TODO: lowercase for strings
		function _getReferenceValue(ref, returnInstance) {
			return (returnInstance ? ref : ref && ref.$uuid);
		}

		function _getReferencesValues(_, refs, returnInstance) {
			return (refs && !refs.isEmpty() ? (returnInstance ? refs && refs.toArray(_) : refs && refs.toUuidArray(_)) : null);
		}

		// maybe there is special sorting function for property - then take this sorting function

		function _sortFunction(exp, childInst) {
			if (exp.type === "identifier") {
				var meta = childInst._meta.$properties[exp.value];
				if (meta) return meta.$computeSortValue;
			}
			return null;
		}

		function _evaluateChild(_, exp, childInst, returnInstance) {
			var result = null;
			switch (exp.type) {
				case "operator":
					return _evaluate(_, childInst, exp);
				case "identifier":
					if (["$uuid", "$updDate", "$updUser", "$creDate", "$creUser"].indexOf(exp.value) >= 0) return childInst[exp.value];
					var meta = childInst._meta.$properties[exp.value];
					if (meta) return childInst[exp.value](_);
					meta = childInst._meta.$relations[exp.value];
					if (meta) return (meta.isPlural ? _getReferencesValues(_, childInst[exp.value](_), returnInstance) : _getReferenceValue(childInst[exp.value](_), returnInstance));
					if (typeof childInst[exp.value] === "function") return childInst[exp.value](_);
					else return childInst[exp.value];
					return null;
				case "literal":
					return exp.value;
				default:
					throw new Error(exp.type + "NYI");
			}
			return null;
		}
		//
		if (!expression) return true;
		//
		var sortFunction;
		if (expression.type === "operator") {

			switch (expression.value.code) {
				case "not":
				case "NOT":
					return !_evaluateChild(_, expression.children[0], instance);
				case "and":
				case "AND":
					return _evaluateChild(_, expression.children[0], instance) && _evaluateChild(_, expression.children[1], instance);
				case "or":
				case "OR":
					return _evaluateChild(_, expression.children[0], instance) || _evaluateChild(_, expression.children[1], instance);
				case ".":
					if (expression.children.length !== 2) throw new Error("Invalid expression: '.' operator" + expression.toString());
					if (expression.children[1].type !== "identifier") throw new Error("Invalid expression: '.' operator" + expression.toString());
					var child1 = _evaluateChild(_, expression.children[0], instance, true);
					return child1 && _evaluateChild(_, expression.children[1], child1, true);
				case "=":
					return _evaluateChild(_, expression.children[0], instance) === _evaluateChild(_, expression.children[1], instance);
				case "<>":
					return _evaluateChild(_, expression.children[0], instance) !== _evaluateChild(_, expression.children[1], instance);
				case "<":
					if (sortFunction = _sortFunction(expression.children[0], instance)) {
						return sortFunction(_evaluateChild(_, expression.children[0], instance), _evaluateChild(_, expression.children[1], instance)) < 0;
					}
					return _evaluateChild(_, expression.children[0], instance) < _evaluateChild(_, expression.children[1], instance);
				case "<=":
					if (sortFunction = _sortFunction(expression.children[0], instance)) {
						return sortFunction(_evaluateChild(_, expression.children[0], instance), _evaluateChild(_, expression.children[1], instance)) <= 0;
					}
					return _evaluateChild(_, expression.children[0], instance) <= _evaluateChild(_, expression.children[1], instance);
				case ">":
					if (sortFunction = _sortFunction(expression.children[0], instance)) {
						return sortFunction(_evaluateChild(_, expression.children[0], instance), _evaluateChild(_, expression.children[1], instance)) > 0;
					}
					return _evaluateChild(_, expression.children[0], instance) > _evaluateChild(_, expression.children[1], instance);
				case ">=":
					if (sortFunction = _sortFunction(expression.children[0], instance)) {
						return sortFunction(_evaluateChild(_, expression.children[0], instance), _evaluateChild(_, expression.children[1], instance)) >= 0;
					}
					return _evaluateChild(_, expression.children[0], instance) >= _evaluateChild(_, expression.children[1], instance);
				case "like":
					if (expression.children[1].type !== "literal") throw new Error(locale.format(module, "literalExpected", expression.value.code, expression.children[1].value));
					return ((_evaluateChild(_, expression.children[0], instance) || "").search("^" + expression.children[1].value.replace(/%/g, ".*") + "$") >= 0);
				case "between":
					var term = _evaluateChild(_, expression.children[0], instance);
					if (sortFunction = _sortFunction(expression.children[0], instance)) {
						return sortFunction(term, _evaluateChild(_, expression.children[1], instance)) >= 0 && sortFunction(term, _evaluateChild(_, expression.children[2], instance)) <= 0;
					}
					return (term >= _evaluateChild(_, expression.children[1], instance)) && (term <= _evaluateChild(_, expression.children[2], instance));
				case "in":
					var child_in = _evaluateChild(_, expression.children[0], instance);
					return expression.children.slice(1).some_(_, function(_, child) {
						if (Array.isArray(child_in))
							return child_in.indexOf(_evaluateChild(_, child, instance)) !== -1;
						return child_in === _evaluateChild(_, child, instance);
					});
				default:
					throw new Error("operator: " + expression.value.code + " NYI");
			}
		} else {
			throw new Error(expression.type + " NYI");
		}
	}
	_proto.match = function(_, expression) {
		return _evaluate(_, this, expression);
	};
	_proto.defer = function(poolName, closure) {
		var pool = this[poolName] = this[poolName] || [];
		pool && pool.push(closure);
	};
	_proto.executeDefered = function(_, poolName) {
		var closure;
		if (this[poolName]) {
			while (closure = this[poolName].shift()) {
				closure(_);
			}
			this[poolName] = null;
		}
	};
	/// -------------
	/// ## Factory $resolvePath function :
	/// ``` javascript
	/// var value = instance.$resolvePath(_, "myRelation.secondRef.property");
	/// ```
	/// Returns the value of the property scanning the path
	///
	_proto.$resolvePath = function(_, path) {
		var self = this;
		var segs = path.split(".");
		var seg;
		while (seg = segs.shift()) {
			if (!self) return null;
			if (seg[0] === "$") return self[seg];
			if (self._meta.$properties[seg]) return _formatValue(self._meta.$properties[seg], self[seg](_));
			else if (self._meta.$relations[seg] && !self._meta.$relations[seg].isPlural) self = self[seg](_);
		}
		return null;
	};
	/// -------------
	/// ## Factory $resolveTemplate function :
	/// ``` javascript
	/// var value = instance.$resolveTemplate(_, "some string with {placeholders}");
	/// ```
	/// Returns the value of the template replacing placeholders
	///
	_proto.$resolveTemplate = function(_, template) {
		var self = this;
		var res = template;
		var tmpl = new Template(template);
		tmpl.matches && tmpl.matches.forEach_(_, function(_, mm) {
			res = res.replace(mm, self.$resolvePath(_, mm.substring(1, mm.length - 1)));
		});
		return res;
	};
	/// -------------
	/// ## Factory $getSummary function :
	/// ``` javascript
	/// var value = instance.$getSummary(_); 
	/// ```
	/// Returns a resume of properties and relations
	/// 
	_proto.$getSummary = function(_, shallow) {
		var self = this;
		var ent = self.getEntity(_);
		var summary = Object.keys(ent.$properties).reduce_(_, function(_, prev, item) {
			var prop = ent.$properties[item];
			if (prop.$isHidden) return prev;
			var val = self[item](_);
			var res = [];
			if (prev) res.push(prev);
			if (val) res.push(prop.getTitle() + "=" + val);
			return res.join("; ");
		}, "");
		//
		if (!shallow) {
			summary = Object.keys(ent.$relations).reduce_(_, function(_, prev, item) {
				var prop = ent.$relations[item];
				if (prop.$isHidden) return prev;
				var val;
				if (prop.isPlural) {
					val = self[item](_).toArray(_).map_(_, function(_, it) {
						return prop.getIsChild(it.$variantType) ? it.$getSummary(_, true) : (it.description ? it.description(_) : "?");
					}).join(", ") || "";
				} else {
					var it = self[item](_);
					if (it) val = prop.getIsChild(it.$variantType) ? it.$getSummary(_, true) : (it.description ? it.description(_) : "?");
				}
				var res = [];
				if (prev) res.push(prev);
				if (val) res.push(prop.getTitle() + "=(" + val + ")");
				return res.join("; ");
			}, summary);
		}
		//
		return summary;
	};
	/// -------------
	/// ## Factory $canDelete function :
	/// ``` javascript
	/// var canDelete = instance.$canDelete(_);
	/// ```
	/// Performs verifications before delete
	///
	/// Returns false if cannot delete
	///
	_proto.$canDelete = function(_) {
		// check here if we can delete instance; set diagnoses otherwise
		// TODO: replace deleteError with standard diagnoses
		var self = this;
		self.deleteError = "";
		factoryTracer.debug && factoryTracer.debug("factory._canDelete $uuid: " + self.$uuid);
		return (!self._meta.$relations || !Object.keys(self._meta.$relations).filter(function(relName) {
			return self._meta.$relations[relName].$cascadeDelete;
		}).some_(_, function(_, relName) {
			factoryTracer.debug && factoryTracer.debug("factory.$canDelete exploring: " + relName);
			var rel = self._meta.$relations[relName];
			if (rel.isPlural) {
				return self[relName](_).toArray(_).some_(_, function(_, item) {
					if (!item.$canDelete(_)) {
						//					self.$addError(locale.format(module, "cannotDeleteReferenced", self.getValue(_), item._meta.name, item.getValue(_)));
						self.deleteError = locale.format(module, "cannotDeleteReferenced", self.getValue(_), item._meta.name, item.getValue(_));
						return true;
					} else return false;
				});
			} else {
				var v = self[relName](_);
				if (!v || v.$canDelete(_)) {
					return false;
				} else {
					//					self.$addError(locale.format(module, "cannotDeleteReferenced", self.getValue(_), self[relName](_)._meta.name, self[relName](_).getValue(_)));
					self.deleteError = locale.format(module, "cannotDeleteReferenced", self.getValue(_), self[relName](_)._meta.name, self[relName](_).getValue(_));
					return true;
				}
			}
		})) && (!self._meta.referingEntities || !Object.keys(self._meta.referingEntities).some_(_, function(_, entityName) {
			factoryTracer.debug && factoryTracer.debug("factory.$canDelete refering ent: " + entityName);
			var entity = self._db.model.getEntity(_, entityName);
			if (!entity) throw new Error(locale.format(module, "entityNotFound", entityName));
			if (entity.$isPersistent === false) return false;
			// check if is refered
			var filter = {};
			var rels = self._meta.referingEntities[entityName].filter(function(relName) {
				// ignore relation if direct or inverse is with cascade
				var rel = entity.$relations && entity.$relations[relName];
				if (rel && (rel.$cascadeDelete || rel.$nullOnDelete)) return false;
				var inv = rel && rel.$inv && rel.targetEntity && rel.targetEntity.$relations[rel.$inv];
				return (!inv || !inv.$cascadeDelete);
			});
			if (rels.length === 0) return false;
			if (rels.length > 1) {
				filter.$or = rels.map(function(relName) {
					var part = {};
					part[relName] = self.$uuid;
					return part;
				});
			} else filter[rels[0]] = self.$uuid;
			var inst = self._db.fetchInstance(_, entity, {
				jsonWhere: filter
			});
			if (inst) {
				//				self.$addError(locale.format(module, "cannotDeleteReferenced", self.getValue(_), inst._meta.name, inst.getValue(_)));
				self.deleteError = locale.format(module, "cannotDeleteReferenced", self.getValue(_), inst._meta.name, inst.getValue(_));
			}
			return (inst != null);
		}));
	};
	/// -------------
	/// ## Factory deleteSelf function :
	/// ``` javascript
	/// instance.deleteSelf(_);
	/// ```
	/// Deletes the instance from the database
	/// Performs verifications and cascade deletes
	///
	/// Returns false in case of error and instance.deleteError hints of the error
	///
	_proto.deleteSelf = function(_, options) {
		function _onRelationDelete(_, rel, inst) {
			if (rel.getIsChild(inst && inst.$variantType)) _propagateDelete(_, inst);
			if (rel.$cascadeDelete) inst.deleteSelf(_, options);
		}

		function _propagateDelete(_, inst) {
			Object.keys(inst._meta.$relations || {}).forEach_(_, function(_, rName) {
				var r = inst._meta.$relations[rName];
				if (r.getIsChild() || r.$cascadeDelete || r.$nullOnDelete) { // TODO: getIsChild parameter ? Important if $variants //
					if (r.isPlural) inst[rName](_).toArray(_).forEach_(_, function(_, item) {
						_onRelationDelete(_, r, item);
						if (r.$nullOnDelete) inst[rName](_).deleteInstance(_, item.$uuid);
					});
					else {
						var item = inst[rName](_);
						if (item) _onRelationDelete(_, r, item);
					}
				}
			});
		}
		factoryTracer.debug && factoryTracer.debug("factory.deleteSelf, $uuid: " + this.$uuid);
		var opt = options || {};
		var self = this;
		if (!opt.ignoreRestrictions && self.$factory && !_canModifyFactoryInstance(_, self)) {
			config.tracer && config.tracer("factory.deleteFactoryInstance forbidden will reply 403");
			self.$addError(locale.format(module, "deleteFactoryForbidden", self.getEntity(_).name, self.$factoryOwner));
		}
		if (!opt.ignoreRestrictions && !_canDeleteInstance(_, self)) {
			factoryTracer.debug && factoryTracer.debug("factory.deleteInstance forbidden will reply 403");
			self.$addError(locale.format(module, "deleteForbidden", self.getEntity(_).name));
			return;
		}
		try {
			_runEvents(_, self._meta && self._meta.$events && self._meta.$events.$canDelete, self);
			if (self.hasErrors(_)) return false;
			//
			var c = self.$canDelete(_);
			factoryTracer.debug && factoryTracer.debug("factory.$canDelete $uuid: " + self.$uuid + " results: " + c);
			if (!c) return false;
			// fire $onDelete
			_fireOnDelete(_, this, true);
			//
			this._db.deleteInstance(_, this);
			// cascade delete on childrens
			_propagateDelete(_, self);
			// delete storage files
			Object.keys(self._meta.$properties).filter(function(propName) {
				return self._meta.$properties[propName].isExternalStorage();
			}).forEach_(_, function(_, propName) {
				var store = self[propName](_);
				store && store.deleteFile(_);
			});
			// save related
			flows.eachKey(_, this._relatedInst, function(_, key, value) {
				var res = value.save(_);
				// push diagnoses to main diagnoses
				(res.$actions.$save.$diagnoses || []).forEach(function(diag) {
					var d = _normalizeDiag(diag);
					if (d.$severity === "error") {
						self.$addError(d.$message);
					}
				});
			});
			factoryTracer.debug && factoryTracer.debug("factory.deleteSelf ok, $uuid: " + this.$uuid);
		} catch (e) {
			this.deleteError = e.message;
			this.$addError(e.message);
			factoryTracer.debug && factoryTracer.debug("factory.deleteSelf error, $uuid: " + this.$uuid + "; message: " + e.message + "\n" + e.stack);
			return false;
		}
		// store metadata in "deleted" entity
		if (this._meta.$allowSync && this.$syncUuid && !this._noIncreaseTick) {
			var oldValue = this._meta.tick(_, this._db) - 1;
			var deletedEnt = this._db.getEntity(_, "deleted");
			if (deletedEnt) {
				var instance = deletedEnt.createInstance(_, this._db, null);
				instance.entname(_, this._meta.name);
				instance.tick(_, oldValue);
				instance.endpoint(_, this.$endpoint);
				instance.deletionTime(_, datetime.now());
				instance.notifiedServers(_, {});
				instance.syncUuid(_, this.$syncUuid);
				instance.save(_);
			}

		}
		return true;
	};
	/// -------------
	/// ## Factory hasErrors function :
	/// ``` javascript
	/// if(instance.hasErrors(_) doSomething();
	/// ```
	/// Returns true if there are error diagnoses
	///
	_proto.hasErrors = function(_) {
		return this.getAllDiagnoses(_).some(function(d) {
			return (d.$severity || d.severity) === "error";
		});
	};

	/// -------------
	/// ## Factory getAllDiagnoses function :
	/// ``` javascript
	/// var diags = [];
	/// instance.getAllDiagnoses(_, diag, options);
	/// ```
	/// Returns an flat array of diagnoses instead of a tree. Allows quick detection of diagnose messages
	///
	/// * diag - results array; diagnoses will be pushed into this array
	/// * options = {
	///			addPropName: true, // adds the property name to the message
	///			addEntityName: true // adds the entity name to the message
	///  }
	///
	_proto.getAllDiagnoses = function(_, diagnoses, options) {
		function _makeDiagnose(_, diag, propName) {
			if (propName && options && options.addPropName) diag.$message = propName + ": " + diag.$message;
			if (options && options.addEntityName) diag.$message = (self.$toString ? self.$toString(_) : self._meta.name) + ": " + diag.$message;
			return diag;
		}

		function _accept(diag) {
			if (!opt || !opt.filter) return true;
			return (opt.filter.indexOf(diag.$severity) >= 0);
		}
		var self = this;
		var diag = [];
		var opt = options || {};
		factoryTracer.debug && factoryTracer.debug("factory.getAllDiagnoses instance: " + self._meta.name + "." + self.$uuid);
		if (self.$diagnoses) self.$diagnoses.forEach_(_, function(_, item) {
			if (_accept(item)) diag.push(_makeDiagnose(_, item));
		});
		//
		if (self.$properties) flows.eachKey(_, self.$properties, function(_, key, prop) {
			factoryTracer.debug && factoryTracer.debug("factory.getAllDiagnoses add diag: " + key);
			if (prop.$diagnoses) prop.$diagnoses.forEach_(_, function(_, item) {
				if (_accept(item)) diag.push(_makeDiagnose(_, item, key));
			});
		});
		//
		flows.eachKey(_, self._meta.$relations, function(_, key, rel) {
			factoryTracer.debug && factoryTracer.debug("factory.getAllDiagnoses add diag: " + key);
			if (rel.getIsChild()) { // TODO: getIsChild parameter ? Important if $variants //
				var relData = self[key](_);
				if (rel.isPlural) relData.toArray(_).forEach_(_, function(_, item) {
					item.getAllDiagnoses(_, diag, options);
				});
				else relData && relData.getAllDiagnoses(_, diag, options);
			}
		});
		//
		flows.eachKey(_, self.$actions, function(_, key, action) {
			factoryTracer.debug && factoryTracer.debug("factory.getAllDiagnoses add diag: " + key);
			if (action.$diagnoses) action.$diagnoses.forEach_(_, function(_, item) {
				if (_accept(item)) diag.push(_makeDiagnose(_, item));
			});
		});
		//
		if (diagnoses) diag.forEach(function(d) {
			if (_accept(d)) diagnoses.push(d);
		});
		return diag;
	};

	function _decodeTemplate(_, inst, template) {
		if (!inst) return "";
		if (!template) return "";
		var res = template.expression;
		if (!template.matches) return res;
		template.matches.forEach_(_, function(_, match) {
			var prop = match.substring(1, match.length - 1);
			if (inst._meta.$properties[prop]) res = res.replace(match, _formatValue(inst._meta.$properties[prop], inst[prop](_)));
			else if (inst._meta.$relations[prop]) {
				if (inst._meta.$relations[prop].isPlural) res = res.replace(match, inst[prop](_).toArray(_).map_(_, function(_, elem) {
					return _decodeTemplate(_, elem, inst._meta.$relations[prop].targetEntity.$valueTemplate);
				}).join(","));
				else res = res.replace(match, _decodeTemplate(_, inst[prop](_), inst._meta.$relations[prop].targetEntity.$valueTemplate));
			}
		});
		return res;
	}

	_proto.$addSaveResource = function(_, res) {
		var instance = this;
		if (!instance._errorCount && (instance._meta.$canSave !== false)) {
			var s = instance._meta.$actions && instance._meta.$actions.$save;
			var saveMeta = (typeof s === "function") ? s(_, instance) : {};
			//
			res.$actions = res.$actions || {};
			res.$actions.$save = res.$actions.$save || {};
			//res.$actions.$save.$isRequested = false; // SAM 98200
			res.$actions.$save.$isDisabled = saveMeta.$isDisabled || false;
		}
	};

	_proto.getValue = function(_) {
		return _decodeTemplate(_, this, this._meta.$valueTemplate);
	};

	_proto.$fillFromParameters = function(_, query) {
		if (!query) return;
		Object.keys(query).forEach_(_, (_, k) => {
			const rel = this._meta.$relations[k];
			var val = query[k];
			if (rel) {
				if (rel.getIsChild() || rel.isPlural) throw new Error("NIY: only reference relations are supported");
				const obj = this._db.fetchInstance(_, rel.targetEntity, val);
				this[k](_, obj)
			} else {
				const prop = this._meta.$properties[k];
				if (prop) {
					switch (prop.type) {
						case 'string':
							break;
						case 'integer':
							val = parseInt(val);
							break;
						case 'boolean':
							val = val === true || val === 'true';
							break;
						default:
							throw new Error(`NIY: datatype not yet supported: ${prop.type}`);
					}
					this[k](_, val);
				}
			}
			// params that we don't match are ignored silently
		});
	};

	//
	factorySelf.__defineGetter__("_entityMeta", function() {
		return entityMeta;
	});
	// connection is usefull for lazy loads, provide a dbHandle
	/// -------------
	/// ## Factory createInstance function :
	/// ``` javascript
	/// var newInstance = entity.factory.createInstance(_, initialData, dbConnection);
	/// ```
	/// Creates a new instance of entity. If initial data is provided (existing object), it uses it to initialize the instance or creates a new object otherwise
	/// dbConnection must be provided as an instance of the database driver
	///
	/// Returns the created new element
	///
	factorySelf.createInstance = function(_, data, connection, context, initialInstanceId) {
		var inst = new Instance(connection);
		var createMetaName = inst._meta.name;
		if (!data) inst._initialize(_, context, initialInstanceId);
		else inst.load(_, data);
		var afterLoadMetaName = inst._meta.name;
		if (createMetaName !== afterLoadMetaName) {
			_errorWithLog("FATAL ERROR !!!!! Meta after create " + createMetaName + " different of after load meta name " + afterLoadMetaName);
		}
		//
		return inst;
	};
	factorySelf.syncCreateInstance = function(_, data, connection, context) {
		var inst = new Instance(connection);
		var createMetaName = inst._meta.name;
		data && inst.load(_, data);
		var afterLoadMetaName = inst._meta.name;
		if (createMetaName !== afterLoadMetaName) {
			_errorWithLog("FATAL ERROR !!!!! Meta after create " + createMetaName + " different of after load meta name " + afterLoadMetaName);
		}
		if (data && data.$type === "menuSubblock" && inst._meta.name !== "menuSubblock") {
			_errorWithLog("FATAL ERROR !!!!! Meta after create different of subblock " + data.$type + " different of after load meta name " + inst._meta.name);
		}
		//
		return inst;
	};
}

exports.Factory = helpers.defineClass(Factory, null, {});

// Working copy stuff

function _testETag(_, context, instance, delta) {
	if (!delta || (delta.$etag && (delta.$etag !== instance.$etag))) {
		factoryTracer.debug && factoryTracer.debug("factory.etag test failed: delta.etag=" + (delta && delta.$etag) + "; instance etag=" + instance.$etag);
		context.reply(_, 412, _serialize(_, instance));
		return false;
	}
	return true;
}

function _fromCache(instanceId) {
	return globals && globals.context && globals.context.instancesCache && globals.context.instancesCache[instanceId];
}

function _toCache(_, db, entity, id) {
	var instance = db.fetchInstance(_, entity, id);
	if (instance && globals && globals.context) {
		globals.context.instancesCache = globals.context.instancesCache || {};
		globals.context.instancesCache[id] = instance;
	}
	return instance;
}

function _instanceById(_, context) {
	// try to find the instance in cache
	var instance = null;
	//	factoryTracer.debug && factoryTracer.debug("factory._instanceById: "+sys.inspect(context));
	factoryTracer.debug && factoryTracer.debug("factory._instanceById requested id: " + context.instanceId + "; isExpression: " + context.isExpressionId);
	var where;
	if (context.parameters && context.parameters.where) {
		where = {
			where: {
				type: "operator",
				value: {
					code: "and"
				},
				children: [context.parameters.where, parser.parse(context.isExpressionId ? context.instanceId : "($uuid eq \"" + context.instanceId + "\")")]
			}
		};
	} else {
		if (context.isExpressionId) {
			where = context.syncUuid ? {
				jsonWhere: {
					'$syncUuid': context.syncUuid
				}
			} : {
				sdataWhere: context.instanceId
			};
		} else {
			if (context.entity.$withCache) {
				return _fromCache(context.instanceId) || _toCache(_, context.db, context.entity, context.instanceId);
			}
			where = context.instanceId;
		}
	}
	if (context.entity.$isPersistent) instance = context.db.fetchInstance(_, context.entity, where);
	else {
		instance = context.entity.factory.createInstance(_, null, context.db);
		instance.$setId(_, context, context.instanceId);
		// recompute $key as it might have changed in setId (hasn't been initialized in create)
		instance.$key = instance.computeKey();
	}
	return instance;
}

function _createWorkingCopy(_, context, factory, wcId, initialInstanceId) {
	context.setMeta(true);
	// rights management
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("filters._createWorkingCopy found security profile: " + sp.code(_));
		if (!context.instanceId && !sp.canCreateClass(_, context.entity.name)) return context.reply(_, 403, locale.format(module, "createForbidden", context.entity.name));
	}
	//	var wcId = context.query.trackingId;
	// crnit : use database abstraction
	var instance = null;
	if (context.instanceId) {
		//instance = context.db.fetchInstance(_, context.entity, context.instanceId, (context.representation && context.representation.type));
		instance = _instanceById(_, context);
		factoryTracer.debug && factoryTracer.debug("factory.create working copy fetched instance: " + sys.inspect(instance));
		if (!instance) {
			context.reply(_, 404, "The requested ressource has not been found");
			return;
		}
		//		// rights management
		//		if (instance.$factory && !_canModifyFactoryInstance(_, instance)) {
		//			return context.reply(_, 403, locale.format(module, "updateFactoryForbidden", instance.getEntity(_).name, instance.$factoryOwner));
		//		}
		if (!_canUpdateInstance(_, instance)) return context.reply(_, 403, locale.format(module, "updateForbidden", context.entity.name, instance.$diagnoses.length > 0 ? instance.$diagnoses[0].$message : ""));
		// explicit lock instance in create WC only (to have the error earlieast), for other cases is done by _createSnapshot
		try {
			instance.lockInstance(_);
		} catch (ex) {
			if (ex.$httpStatus) {
				factoryTracer.error && factoryTracer.error("factory.createWC http error: " + ex.$httpStatus, ex);
				if ((ex.$httpStatus === httpHelpers.httpStatus.Conflict) && ex.lockStatus) {
					// send diagnoses allowing to unlock
					instance.$addError(ex.message, null, {
						$unlock: {
							$title: "Force unlock",
							$url: context.baseUrl + "/$workingCopies('" + wcId + "')/$service/forceLockInstance",
							$method: "POST"
						}
					});
				} else {
					context.reply(_, ex.$httpStatus, ex.message);
					return;
				}
			} else {
				throw ex;
			}
		}
		//
	} else {
		instance = factory.createInstance(_, null, context.db, context, initialInstanceId);
		//		instance._initialize(_, context);
	}
	if (instance.$setParameters) instance.$setParameters(_, context);
	//	instance.$url = context.baseUrl + "/$workingCopies('" + wcId + "')?representation=" + instance._meta.name + ".$edit";
	instance.$url = context.baseUrl + "/$workingCopies('" + wcId + "')?representation=" + context.representation.entity + ".$edit";
	if (context.query) {
		var pps = Object.keys(context.query).filter(function(ppName) {
			return ppName !== "representation";
		}).map(function(ppName) {
			return ppName + "=" + encodeURIComponent(context.query[ppName]);
		}).join("&");
		if (pps) instance.$url = instance.$url + "&" + pps;
	}
	instance.$trackingId = wcId;
	instance.$type = context.model.baseType;
	instance._snapshotEnabled = true;
	instance._sysSnapshotEnabled = true;
	//
	context.httpSession[wcId] = instance;
	//
	return instance;
}

exports.createTemplate = function(_, context, factory) {
	// create an instance, serialize it and remove it
	var instance = factory.createInstance(_, null, context.db, context);
	//serialize
	if (instance) {
		var resource = _serialize(_, instance);
		delete resource.$uuid;
		delete resource.$key;
		// todo delete all
		context.reply(_, httpHelpers.httpStatus.OK, resource);
	} else context.reply(_, 404, "The requested ressource has not been found");
};

exports.createWorkingCopy = function(_, context, factory) {
	var delta = context.query.$payload ? jsurl.parse(context.query.$payload) : JSON.parse(context.request.readAll(_));
	var initialInstanceId = delta && delta.$uuid;
	var instance = _createWorkingCopy(_, context, factory, (delta && delta.$trackingId) || context.query.trackingId || helpers.uuid.generate(), initialInstanceId);
	if (!instance) return;
	var resource;
	// in WC creation we might get initial data from client sendBag
	instance.$sysSnapshot = null;
	var hasSave = false;
	var actResult = null;
	if (delta) {
		factoryTracer.debug && factoryTracer.debug("factory.createWorkingCopy got delta: " + sys.inspect(delta));
		instance.$etag = delta.$etag;
		//
		_applyDelta(_, context, instance, delta);
		instance.fireEvent(_, '$afterPropagate');

		// execute actions
		actResult = _executeActions(_, context, instance);
		instance.fireEvent(_, '$afterActions');
		//
		instance.$etag++;
		instance.$updUser = (context && context.getUser(_) && context.getUser(_).login(_));
		//
		if (delta && delta.$actions && delta.$actions.$save && delta.$actions.$save.$isRequested) {
			if (!_canCreateInstance(_, instance)) return context.reply(_, 403, locale.format(module, "createForbidden", instance.getEntity(_).name));

			hasSave = true;
			// save
			resource = instance.save(_, delta.$actions.$save.$parameters);
		}
	}
	//
	resource = resource || _serialize(_, instance);
	// copy actions result
	actResult && actResult.$actions && Object.keys(actResult.$actions).forEach(function(actName) {
		resource.$actions = resource.$actions || {};
		resource.$actions[actName] = actResult.$actions[actName];
	});
	// activate SAVE, see if we need to implement some conditions here
	var res = resource;
	if (instance._meta.$canSave !== false) {
		var s = instance._meta.$actions && instance._meta.$actions.$save;
		var saveMeta = (typeof s === "function") ? s(_, instance) : {};
		//
		res.$actions = res.$actions || {};
		res.$actions.$save = res.$actions.$save || {};
		//res.$actions.$save.$isRequested = false; // SAM 98200
		res.$actions.$save.$isDisabled = hasSave || saveMeta.$isDisabled;
		//	res.$actions.$save.$isDisabled = true;
	}
	// no details link if instance is created
	if (instance.$created && (instance._meta.$isPersistent !== false)) {
		res.$links = res.$links || {};
		res.$links.$details = res.$links.$details || {};
		res.$links.$details.$isHidden = true;
	}
	//
	context.reply(_, httpHelpers.httpStatus.Created, resource);
};

exports.getWorkingCopy = function(_, context, instance) {
	context.reply(_, 200, _serialize(_, instance));
};

exports.updateWorkingCopyLocalizedProp = function(_, context, wcInstance, updInstance, propertyName, delta) {
	var newDelta = {};
	newDelta[propertyName] = ((delta && delta.$values) || []).reduce(function(prev, locVal) {
		prev[locVal.$locale.toLowerCase()] = locVal.$value;
		return prev;
	}, {});
	exports.updateWorkingCopy(_, context, wcInstance, newDelta, {
		fullSerialize: true,
		updInstance: updInstance
	});
};

exports.updateWorkingCopy = function(_, context, instance, delta, opt) {

	function _getObject(collElem) { // looking for the collecton receive from the client in the delta in order to check if we receive a delta or all the array
		if (collElem && (typeof collElem !== 'string') && Object.keys(collElem).length) {
			if (collElem.$key || "$uuid" in collElem) // fist level
				return collElem;
			else
				return _getObject(collElem[Object.keys(collElem)[0]]);
		} else {
			return null;
		}
	}

	function _manageNonPersistentCollectionItem(_) {
		// be sure the relation are update on the instnace
		Object.keys(instance._meta._$relations).forEach_(_, function(_, key) {
			if (delta[key] && Array.isArray(delta[key]) && instance._meta._$relations[key].$isPlural) {
				var obj = _getObject(delta[key][0]);
				if (obj && !obj.$index) {
					// if we have $index, we receive a delta (deleteMissing=false) else we receive the full collection (deleteMissing=true) and have to remove deleted instance
					var mapDeltaUuid = [];
					delta[key].forEach(function(item) {
						mapDeltaUuid.push(_getObject(item).$uuid);
					});
					// remove element that are not in the delta
					var col = instance[key](_);
					var toArray = col.toArray(_);
					col.reset(_);
					toArray && toArray.forEach_(_, function(_, item) {
						if (mapDeltaUuid.indexOf(item.$uuid) !== -1) {
							col.set(_, item);
						}
					});
				}
			}
		});

	}

	var options = opt || {};
	// lock TODO !!!
	try {
		instance.lockInstance(_);
	} catch (ex) {
		if (ex.$httpStatus) {
			factoryTracer.error && factoryTracer.error("factory.createWC http error: " + ex.$httpStatus, ex);
			if ((ex.$httpStatus === httpHelpers.httpStatus.Conflict) && ex.lockStatus) {
				// send diagnoses allowing to unlock
				instance.$addError(ex.message, null, {
					$unlock: {
						$title: "Force unlock",
						$url: context.baseUrl + "/$workingCopies('" + context.query.trackingId + "')/$service/forceLockInstance",
						$method: "POST"
					}
				});
			} else {
				context.reply(_, ex.$httpStatus, ex.message);
				return;
			}
		} else {
			throw ex;
		}
	}
	//
	instance.$sysSnapshot = null;
	if (!_testETag(_, context, instance, delta)) return;
	// #4928 : delta will be serialized only if validated (factory security)
	var deltaApplied = _applyDelta(_, context, options.updInstance || instance, delta);
	instance.fireEvent(_, '$afterPropagate');

	// rights management
	if (!_canUpdateInstance(_, instance)) return context.reply(_, 403, locale.format(module, "updateForbidden", instance.getEntity(_).name, instance.$diagnoses.length > 0 ? instance.$diagnoses[0].$message : ""));

	// execute actions
	var actions = _executeActions(_, context, options.updInstance || instance);
	instance.fireEvent(_, '$afterActions');
	//
	instance.$etag++;
	instance.$updUser = (context && context.getUser(_) && context.getUser(_).login(_));
	//
	if (delta.$actions && delta.$actions.$save && delta.$actions.$save.$isRequested) {
		// save
		try {
			var resource = instance.save(_, helpers.object.extend(delta.$actions.$save.$parameters, context.parameters || {}));
			// for working copies, send allways OK status code and let diagnoses show error messages
			//			context.reply(_, instance._saveErrorCode ? instance._saveErrorCode : httpHelpers.httpStatus.OK, resource);
			context.reply(_, httpHelpers.httpStatus.OK, resource);
		} catch (e) {
			context.reply(_, 500, e.message);
		}
	} else {
		var res = (options.fullSerialize || !deltaApplied) ? instance.serializeInstance(_) : _computeDelta(_, instance, "$sysSnapshot", null, false);
		// activer save
		// !!! validateMandatory desactivated for now, it's better for the user to see the error when he saves.
		// anyway, validateMandatory should not fill $diagnoses
		//		_validateMandatory(_, instance);
		instance.$addSaveResource(_, res);
		// no details link if instance is created
		if (instance.$created && (instance._meta.$isPersistent !== false)) {
			res.$links = res.$links || {};
			res.$links.$details = res.$links.$details || {};
			res.$links.$details.$isHidden = true;
		}

		// SAM 102703 : for persistent entities only or if it's not specified to recreate working copy automatically
		if (instance._meta.$isPersistent || !instance._meta.$autoRecreateWorkingCopy) {
			// merge actions result into resource
			actions && helpers.object.extend(res, actions, true, true);
		}


		// quick hack to serialize localized properties. Will work for string properties only
		if (options && options.forceReply) options.forceReply.forEach_(_, function(_, pName) {
			res[pName] = _formatValue(instance.getEntity(_).$properties[pName], instance[pName](_));
		});
		//
		if (!instance._meta.$isPersistent) { // SAM 110110 - Search Index Management run for language connection also
			_manageNonPersistentCollectionItem(_);
		}
		context.reply(_, httpHelpers.httpStatus.OK, res);
	}
};
exports.replyLocalizedProperty = function(_, context, instance, propertyName, readOnly) {
	var propValues = instance.getPropAllLocales(_, propertyName) || {};
	propValues["en-us"] = propValues["en-us"] || propValues["default"];
	var adminDb = adminHelper.getCollaborationOrm(_);
	var locs = adminDb.fetchInstances(_, adminDb.getEntity(_, "localePreference"), {
		jsonWhere: {
			enabled: true
		}
	});
	var res = {
		$url: context.request.url,
		$type: "application/x-localization",
		$values: locs.map_(_, function(_, loc) {
			var lCode = loc.code(_);
			return {
				$title: loc.description(_),
				$locale: lCode,
				$value: propValues[lCode.toLowerCase()] || null
			};
		})
	};
	if (!readOnly) res.$links = {
		$save: {
			$title: locale.format(module, "saveActionTitle"),
			$method: "PUT",
			$url: context.request.url
		}
	};
	context.reply(_, 200, res, {
		"content-type": "application/json"
	});
};
/// -------------
/// ## Factory replyInstances function :
/// ``` javascript
/// var factory = require("syracuse-orm/lib/factory");
/// ...
/// factory.replyInstances(_, context);
/// ```
/// Replies the request with an array of resources based on the context object
/// The context must provide the database abstraction, an entity and the filters
///
exports.replyInstances = function(_, context, entity, parameters) {
	factoryTracer.debug && factoryTracer.debug("factory.replyInstances enter");
	context.setMeta(false);
	//
	var ent = entity || context.entity;
	var params = helpers.object.clone(parameters || context.parameters || {});
	// add rights
	if (!_addRights(_, ent, params)) return context.reply(_, 403, locale.format(module, "readForbidden", ent.name));
	// Add representation filter from parameters
	if (params.filter) {
		var filt = context.getRepresentationFilter(context.contract, context.getRepresentation(context.contract, context.entity.name, context.representation.entity), context.representation.type, params.filter);
		if (filt) {
			// Change for new syra-sdata-parser submodule
			filt = parser.parse(filt);
			if (params.where) params.where = {
				type: "operator",
				value: {
					code: "and"
				},
				children: [params.where, filt]
			};
			else params.where = filt;
		}
	}
	context.addComplementFilter(_, params);
	var instances;
	if (ent.$fetchInstances) {
		var instanceFetched = ent.$fetchInstances(_, context, params);
		if (instanceFetched.$diagnoses) {
			context.replyResource(_, 500, instanceFetched);
			return;
		} else {
			var preliminary = (ent.$sortInstances || context.sortInstancesArray)(_, context.filterInstancesArray(_, instanceFetched), params, ent.defaultOrder);
			var listCount = preliminary.length;
			//
			context.totalCount = listCount;
			var start = (params.startIndex || 1) - 1;
			var count = (params.count || (listCount - start));
			instances = (params.key && params.key.split(".")[0] === "lt") ? preliminary.slice(-count) : preliminary.slice(start, Math.min(start + count, listCount));
		}
	} else {
		context.totalCount = context.db.count(_, ent, params);
		// add filter for letter paging (no letter paging for count compute)
		if (params.startLetter && params.orderBy && params.orderBy[0] && params.orderBy[0].binding) {
			var newFilter = parser.parse("(" + params.orderBy[0].binding + " between '" + params.startLetter.toLowerCase() + "' and 'z') or " +
				"(" + params.orderBy[0].binding + " between '" + params.startLetter.toUpperCase() + "' and 'Z')");
			if (params.where) params.where = {
				type: "operator",
				value: {
					code: "and"
				},
				children: [params.where, newFilter]
			};
			else params.where = newFilter;
		}
		instances = context.db.fetchInstances(_, ent, params);
	}
	factoryTracer.debug && factoryTracer.debug("factory.fetchInstances count:" + context.totalCount);
	//
	var resources = [];

	if (context.representation && context.representation.type === "$query") {
		params.select = params.select || context.getRepresentationSelect(context.contract, context.getRepresentation(context.contract, context.entity.name, context.representation.entity), context.representation.type);
	}
	instances.forEach_(_, function(_, instance) {
		resources.push(_serialize(_, instance, (queryFacets.indexOf(context.representation.type) >= 0), context.useSyncUuid, null, {
			include: params.include,
			select: params.select
		}));
	});
	context.replyResources(_, httpHelpers.httpStatus.OK, resources);
};
/// -------------
/// ## Factory fetchInstance function :
/// ``` javascript
/// var factory = require("syracuse-orm/lib/factory");
/// ...
/// var instance = factory.fetchInstance(_, context);
/// ```
/// Fetches an instance based on the context object
/// The context must provide the database abstraction, an entity and the instanceId
///
/// Returns the fetched element or null
///
exports.fetchInstance = function(_, context) {
	factoryTracer.debug && factoryTracer.debug("factory.fetchInstance enter");
	context.setMeta(false);
	// add rights
	context.parameters = context.parameters || {};
	if (!_addRights(_, context.entity, context.parameters)) return null;
	//
	return _instanceById(_, context);
};
/// -------------
/// ## Factory replyInstance function :
/// ``` javascript
/// var factory = require("syracuse-orm/lib/factory");
/// ...
/// factory.replyInstance(_, context);
/// ```
/// Replies the request with a resource based on the context object
/// The context must provide the database abstraction, an entity and the instanceId
///
exports.replyInstance = function(_, context, notFoundCallback) {
	_replyInstance(_, context, notFoundCallback);
};

function _replyInstance(_, context, notFoundCallback) {
	factoryTracer.debug && factoryTracer.debug("factory.replyInstance enter");
	context.setMeta(false);
	// add rights
	var params = helpers.object.clone(context.parameters || {});
	if (!_addRights(_, context.entity, params)) return context.reply(_, 403, locale.format(module, "readForbidden", context.entity.name));
	//
	var instance = context.instance || _instanceById(_, context);
	if (instance) {
		var resource;
		var fromCache = false;
		if (context.sendUrlOnly) {
			resource = {
				$uuid: instance.$syncUuid,
				$url: instance.$url || instance.computeUrlShort()
			};
		} else {
			var cacheEtag = (instance.$cacheEtag) ? instance.$cacheEtag(_) : "";
			if (!nocache && cacheEtag && context.request.headers && cacheEtag === context.request.headers["if-none-match"]) {
				fromCache = true;
			} else {
				resource = _serialize(_, instance, null, context.useSyncUuid, null, {
					include: params.include,
					select: params.select
				}); // useSyncUuid: force SData compliant $uuid
			}
		}
		if (fromCache) context.reply(_, 304, {});
		else context.replyResource(_, httpHelpers.httpStatus.OK, resource, cacheEtag);
	} else if (notFoundCallback) notFoundCallback(_, context);
	else {
		var repMeta = context.getRepresentationMeta(context.contract, context.getRepresentation(context.contract, context.entity.name, context.representation.entity), context.representation.type);
		if (repMeta && repMeta.$options && repMeta.$options.$notFoundUrl) {
			// TODO: expression parse for this url ?
			//				var location = repMeta.$options.$notFoundUrl;
			var location = repMeta.$options.$notFoundUrl && repMeta.$options.$notFoundUrl.replace("{$baseUrl}", context.baseUrl);
			context.reply(_, httpHelpers.httpStatus.TemporaryRedirect, "", {
				Location: location
			});
		} else {
			// test whether instance exists (without access restrictions)
			var params = context.parameters;
			context.parameters = undefined;
			instance = _instanceById(_, context);
			context.parameters = params;
			if (!instance) {
				context.reply(_, 404);
			} else {
				context.reply(_, 403, locale.format(module, "readInstanceForbidden", context.entity.name));
			}
		}
	}
}

function _createInstance(_, context, factory, batchRequest) {
	// rights management
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		factoryTracer.debug && factoryTracer.debug("filters._createWorkingCopy found security profile: " + sp.code(_));
		if (!context.instanceId && !sp.canCreateClass(_, context.entity.name)) return context.reply(_, 403, locale.format(module, "createForbidden", context.entity.name));
	}
	// create instance
	var instance = null;
	if (context.batchResult) {
		instance = _instanceById(_, context);
		if (instance && (instance.$uuid && (instance.$uuid === context.instanceId))) {
			context.reply(_, httpHelpers.httpStatus.Created, _serialize(_, instance));
			return;
		}
	}
	//
	var delta = batchRequest ? batchRequest : context.query.$payload ? jsurl.parse(context.query.$payload) : JSON.parse(context.request.readAll(_));
	//
	instance = factory.createInstance(_, null, context.db, context, delta && delta.$uuid);
	//	instance.$url = context.baseUrl + "/"+instance._meta.name+"('" + instance.$uuid + "')?representation=" + instance._meta.name + ".$edit";
	instance.$url = context.baseUrl + "/" + instance._meta.plural + "('" + instance.$uuid + "')?representation=" + context.representation.entity + ".$edit";
	instance.$type = context.model.baseType;
	// apply delta
	instance.$sysSnapshot = null;
	_applyDelta(_, context, instance, delta);
	// save
	instance.$url = context.baseUrl + "/" + instance._meta.plural + "('" + instance.$uuid + "')";
	var res = instance.save(_);
	context.reply(_, _existsError(_, instance) ? httpHelpers.httpStatus.BadRequest : httpHelpers.httpStatus.Created, res);
}

exports.createInstance = function(_, context, factory) {
	_createInstance(_, context, factory);
};

function _updateInstance(_, context, data, instance, opt) {
	var options = opt || {};
	var instance = instance || context.instance || (context.instanceId && _instanceById(_, context));
	if (!instance) context.reply(_, 404);
	//
	factoryTracer.debug && factoryTracer.debug("factory.updateInstance fetched instance: " + instance.$inspect(true));
	//
	if (context.batchResult && (!instance || (instance.$uuid !== context.instanceId))) {
		context.reply(_, 410);
		return;
	}
	if (!instance) {
		if (context.batchResult) context.reply(_, 410);
		else context.reply(_, 404);
		return;
	}

	// rights management
	if (!_canUpdateInstance(_, instance)) {
		factoryTracer.debug && factoryTracer.debug("factory.updateInstance forbidden will reply 403");
		return context.reply(_, 403, locale.format(module, "updateForbidden", instance.getEntity(_).name, instance.$diagnoses && instance.$diagnoses.length > 0 ? instance.$diagnoses[0].$message : ""));
	}
	//
	var params = helpers.object.clone(context.parameters || {});
	// apply delta
	instance.$sysSnapshot = null;
	instance._snapshotEnabled = true;
	instance._sysSnapshotEnabled = true;
	instance.$updUser = (context && context.getUser(_) && context.getUser(_).login(_));
	var delta = data ? data : JSON.parse(context.request.readAll(_));
	var deltaApplied = _applyDelta(_, context, options.updInstance || instance, delta);
	// save
	try {
		var resource = deltaApplied ? instance.save(_, params) : instance.serializeInstance(_);
		var ee = _existsError(_, instance);
		context.reply(_, (ee ? httpHelpers.httpStatus.BadRequest : httpHelpers.httpStatus.OK), resource);
	} catch (e) {
		context.reply(_, 500, e.message);
	}
}

exports.updateLocalizedProperty = function(_, context, instance, relInstance, propertyName, delta) {
	var newDelta = {};
	newDelta[propertyName] = ((delta && delta.$values) || []).reduce(function(prev, locVal) {
		prev[locVal.$locale.toLowerCase()] = locVal.$value;
		return prev;
	}, {});
	_updateInstance(_, context, newDelta, instance, {
		updInstance: relInstance
	});
};

exports.updateInstance = function(_, context) {
	_updateInstance(_, context);
};

function _deleteInstance(_, context) {
	if (context.instanceId) {
		var instance = _instanceById(_, context);
		//var instance = context.db.fetchInstance(_, context.entity, context.instanceId, (context.representation && context.representation.type));
		if (context.batchResult && (!instance || (context.instanceId !== instance.$uuid))) {
			context.reply(_, 410);
			return;
		}
		if (!instance) {
			if (context.batchResult) context.reply(_, 410);
			else context.reply(_, 404);
			return;
		}

		factoryTracer.debug && factoryTracer.debug("factory.deleteInstance fetched instance: " + instance.$inspect(true)); // #4928
		if (instance.$factory && !_canModifyFactoryInstance(_, instance)) {
			config.tracer && config.tracer("factory.deleteFactoryInstance forbidden will reply 403");
			return context.reply(_, 403, locale.format(module, "deleteFactoryForbidden", instance.getEntity(_).name, instance.$factoryOwner));
		}

		if (!_canDeleteInstance(_, instance)) {
			factoryTracer.debug && factoryTracer.debug("factory.deleteInstance forbidden will reply 403");
			return context.reply(_, 403, locale.format(module, "deleteForbidden", context.entity.name));
		}
		// check
		if (instance.deleteSelf(_)) {
			// save
			context.replyDeleted(_);
		} else context.reply(_, 403, instance.deleteError || instance.getAllDiagnoses(_).map(function(dd) {
			return dd.$message;
		}).join(","));
	} else context.reply(_, 404);
}

exports.deleteInstance = _deleteInstance;

// setup
exports.setup = function(factoryConfig) {
	config = factoryConfig || {};
};

exports.batch = function(_, context) {
	try {
		var batchResult = {
			$resources: []
		};
		var brequest = JSON.parse(context.request.readAll(_));

		brequest.$resources.forEach_(_, function(_, entry) {
			var op = {
				etag: entry.$etag,
				method: entry.$httpMethod.toLowerCase(),
				ifMatch: entry.$httpifMatch
			};
			delete entry.$httpMethod;
			delete entry.$httpifMatch;
			var opres = {
				$httpStatus: 200
			};
			context.instanceId = entry.$uuid;
			batchResult.$resources.push(opres);
			try {
				context.batchResult = opres;
				switch (op.method) {
					case "get":
						_replyInstance(_, context);
						break;
					case "post":
						_createInstance(_, context, context.entity.factory, entry);
						break;
					case "put":
						_updateInstance(_, context, entry);
						break;
					case "delete":
						_deleteInstance(_, context);
						break;
					default:
						break;
				}
			} catch (ex) {
				opres.$httpStatus = 500;
				opres.$httpMessage = ex.message;
			}
		});
		context.batchResult = null;
		context.reply(_, 200, batchResult);
	} catch (e) {
		context.batchResult = null;
		context.reply(_, 500, e.message);
	}
};