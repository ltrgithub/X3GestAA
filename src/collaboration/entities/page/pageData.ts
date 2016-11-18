"use strict";

var factory = require("../../../../../src/orm/factory");
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var locale = require('streamline-locale');

function _changeTransaction(page, transaction) {
	var bindRE = new RegExp('^([^_]+?)(' + page.$article.$transaction + ')([A-Z]|\\d)(_.*)$');
	var localRE = new RegExp('^(\\{@\\w-[^-]+?)(' + page.$article.$transaction + ')([A-Z]|\\d)?(-\\d+\\})$');
	var replacer = function(all, p1, p2, p3, p4) {
		return p1 + transaction + (p3 || "") + p4;
	};

	function change(obj) {
		Object.keys(obj).forEach(function(key) {
			var v = obj[key];
			if (key === '$bind') obj.$bind = v.toString().replace(bindRE, replacer);
			else if (typeof v === "string" && v[0] === '{') obj[key] = v.replace(localRE, replacer);
			else if (v && typeof v === "object") change(v);
		});
	}
	change(page.$article);
	page.$article.$transaction = transaction;
}

function _extractProtoFieldNames(proto, fields, exclude_map) {
	if (!proto.$properties) return;
	Object.keys(proto.$properties).forEach(function(k) {
		var p = proto.$properties[k];
		if (p.$isExcluded) return;
		if (p.$X3Name) fields.push(p.$X3Name);
		if ((p.$type === "application/x-array") && p.$item) _extractProtoFieldNames(p.$item, fields);
		if ((p.$type === "application/x-reference") && p.$item && p.$item.$properties) {
			Object.keys(p.$item.$properties).forEach(function(key) {
				var lp = proto.$properties[key];
				if (lp && lp.$X3Name) exclude_map[lp.$X3Name] = true;
			});
		}
	});
}

function _makeBindsMap(article, result) {
	var item = article;
	if (!item) return;
	if (item.$bind) result[item.$bind] = true;
	if (Array.isArray(item)) {
		item.forEach(function(it) {
			_makeBindsMap(it, result);
		});
	} else //
	if (typeof item === "object") {
		Object.keys(item).forEach(function(it) {
			_makeBindsMap(item[it], result);
		});
	}
}

function _exclude_commun(a, b) {
	for (var i = a.length - 1; i >= 0; i--) {
		var idx = b.indexOf(a[i]);
		if (idx >= 0) {
			b.splice(idx, 1);
			a.splice(i, 1);
		}
	}
}

exports.entity = {
	//	$lockType: "pessimist",
	$titleTemplate: "Page",
	$descriptionTemplate: "Page content",
	$valueTemplate: "{content}",
	$properties: {
		// code property used as identifier in export / import
		code: {
			$title: "Code",
			$isUnique: true,
			defaultValue: function(_, instance) {
				return instance.$uuid;
			}
		},
		content: {
			$title: "Content",
			$type: "string",
			$propagate: function(_, instance, value) {
				// CRNIT: History should be managed in GIT
				// create a historic version (use snapshot)
				/*				var oldValue = instance.$snapshot && instance.$snapshot.content(_);
				if (oldValue) {
					var lastHist = instance.getLastVersionInstance(_);
					if (!lastHist) {
						// create the first history page
						lastHist = instance.createChild(_, "history");
						lastHist.content(_, oldValue);
						lastHist.version(_, 0);
						instance.history(_).set(_, lastHist);
					}
					// create the differential history
					lastHist.addVersion(_, oldValue, value);
					instance.addRelatedInstance(lastHist);
				}
				*/
			}
		},
		localization: {
			$title: "Localization",
			$type: "string"
		}
	},
	$relations: {
		/*		history: {
			$title: "History",
			$type: "pageDataHistories",
			$inv: "pageData",
			$isComputed: true,
			$isLazy: true,
			$cascadeDelete: true
			//			isChild: true
		}
		*/
	},
	$functions: {
		/*		getLastVersionInstance: function(_) {
			return this._db.fetchInstance(_, this._meta.$relations.history.targetEntity, {
				jsonWhere: {
					pageData: this.$uuid
				},
				orderBy: [{
					binding: "version",
					descending: true
				}],
				count: 1
			});
		},*/
		convertFusionArticle: function(_, pageDef, endpoint, version, opt) {
			var options = opt || {};
			var converter = require("syracuse-x3/lib/cvgPageConverter");
			//
			var c = this.content(_);
			if (!c) return;
			c = JSON.parse(c);
			c = c.$article;
			//
			if (c.$generatorVersion === version) return;
			// fetch prototype
			var par = {
				prototypeId: pageDef.representation(_).replace("$MODEL", "") + "." + pageDef.facet(_)
			};
			var p;
			try {
				p = options.prototype || endpoint.getFusionPrototype(_, par);
			} catch (e) {
				return this.$addError(e.message, null, null, e.$stackTrace || e.safeStack);
			}
			if (!p) return this.$addError(locale.format(module, "prototypeNotFound", par.prototypeId, endpoint.dataset(_)));
			if (!p.$generatorVersion) return;
			//
			p.$article = c;
			//
			try {
				converter.makePersistent(p);
				p.$article.$generatorVersion = version;
				this.content(_, JSON.stringify({
					$article: p.$article
				}));
				//
				var s = this.save(_);
				var ds = ((s.$actions || {}).$save || {}).$diagnoses || [];
				this.getAllDiagnoses(_, options.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
				if (options.$diagnoses) {
					ds.forEach(function(d) {
						options.$diagnoses.push(d);
					});
				}
			} catch (e) {
				options.$diagnoses && options.$diagnoses.push({
					$severity: "error",
					$message: locale.format(module, "convertError", par.prototypeId, 1, e.message)
				});
			}
		},
		convertLocalization: function(_, pageDef, endpoint, version, opt) {
			var options = opt || {};
			var converter = require("syracuse-x3/lib/cvgPageConverter");
			//
			var c = this.content(_);
			if (!c) return;
			c = JSON.parse(c);
			c = c.$article;
			//
			if (c.$localesVersion === version) return;
			// fetch prototype
			var p = null;
			var par = {};
			var rr = pageDef.representation(_);
			if ((rr.indexOf("$MODEL") >= 0) && c.$transaction) {
				par.prototypeId = "W" + rr.replace("$MODEL", "") + c.$transaction + "." + pageDef.facet(_);
				try {
					p = options.prototype || endpoint.getFusionPrototype(_, par);
				} catch (e) {
					// as we use a W+Repr+Transaction convention, prototype might not exists. No error and attempt to
					// fetch it with a standard rule
				}
			}
			if (!p) {
				par.prototypeId = rr.replace("$MODEL", "") + "." + pageDef.facet(_);
				try {
					p = options.prototype || endpoint.getFusionPrototype(_, par);
				} catch (e) {
					return this.$addError(e.message, null, null, e.$stackTrace || e.safeStack);
				}
			}
			if (!p) return this.$addError(locale.format(module, "prototypeNotFound", par.prototypeId, endpoint.dataset(_)));
			//
			try {
				converter.convertLocalization(p, c, {
					prototypeId: par.prototypeId,
					$diagnoses: options.$diagnoses
				});
				c.$localesVersion = version;
				this.content(_, JSON.stringify({
					$article: c
				}));
				//
				var s = this.save(_);
				var ds = ((s.$actions || {}).$save || {}).$diagnoses || [];
				this.getAllDiagnoses(_, options.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
				if (options.$diagnoses) {
					ds.forEach(function(d) {
						options.$diagnoses.push(d);
					});
				}
			} catch (e) {
				options.$diagnoses && options.$diagnoses.push({
					$severity: "error",
					$message: locale.format(module, "convertError", par.prototypeId, 1, e.message)
				});
			}
		},
		diagnoseFusionArticle: function(_, pageDef, variant, endpoint, version, opt) {
			var options = opt || {};
			var diags = opt.$diagnoses || [];
			//
			if (!options.diagModels && (pageDef.representation(_).indexOf("$MODEL") >= 0)) return;
			//
			var c = this.content(_);
			if (!c) return;
			c = JSON.parse(c);
			c = c.$article;
			//
			var p = null;
			var par = {};
			var rr = pageDef.representation(_);
			if ((rr.indexOf("$MODEL") >= 0) && c.$transaction) {
				par.prototypeId = "W" + rr.replace("$MODEL", "") + c.$transaction + "." + pageDef.facet(_);
				try {
					p = options.prototype || endpoint.getFusionPrototype(_, par);
				} catch (e) {
					// as we use a W+Repr+Transaction convention, prototype might not exists. No error and attempt to
					// fetch it with a standard rule
				}
			}
			if (!p) {
				par.prototypeId = rr.replace("$MODEL", "") + "." + pageDef.facet(_);
				try {
					p = options.prototype || endpoint.getFusionPrototype(_, par);
				} catch (e) {
					return this.$addError(e.message, null, null, e.$stackTrace || e.safeStack);
				}
			}
			if (!p) return this.$addError(locale.format(module, "prototypeNotFound", par.prototypeId, endpoint.dataset(_)));
			// version check
			if (!c.$generatorVersion || (c.$generatorVersion < version)) {
				return diags.push({
					$severity: "info",
					$message: locale.format(module, "notConverted", par.prototypeId, version)
				});
			}
			// check if all prototype's properties are in article
			if (!p.$generatorVersion) return diags.push({
				$severity: "warning",
				$message: locale.format(module, "protoNotConverted", par.prototypeId, version)
			});
			//
			var protoFields = [];
			var exclude_map = {}; // exclude description field of references
			_extractProtoFieldNames(p, protoFields, exclude_map);
			_exclude_commun(Object.keys(exclude_map), protoFields);
			// check $transaction
			if (!c.$transaction && (p.$transaction || (pageDef.representation(_).indexOf("$MODEL") >= 0))) {
				diags.push({
					$severity: "warning",
					$message: locale.format(module, "articleMissTransaction", pageDef.code(_), variant.code(_), variant.title(_), par.prototypeId)
				});
			}
			if (p.$transaction && c.$transaction && (p.$transaction === c.$transaction)) {
				_changeTransaction({
					$article: c
				}, p.$transaction);
			}
			// scan $bind
			var binds = {};
			if (!options.diagMenuBar) {
				c.$menus = null;
				c.$fusionBar = null;
			}
			_makeBindsMap(c, binds);
			var a_binds = Object.keys(binds);
			_exclude_commun(a_binds, protoFields);
			// scan $exclude
			var g = (c.$garbageFields && c.$garbageFields.slice(0)) || [];
			_exclude_commun(g, protoFields);
			// result
			protoFields.length && diags.push({
				$severity: "info",
				$message: locale.format(module, "protoFieldNotInArticle", pageDef.code(_), variant.code(_), variant.title(_), par.prototypeId, protoFields.join(","))
			});
			options.diagArtNotInProto && a_binds.length && diags.push({
				$severity: "info",
				$message: locale.format(module, "articleFieldNotInProto", pageDef.code(_), variant.code(_), variant.title(_), par.prototypeId, a_binds.join(","))
			});
			options.diagArtNotInProto && g.length && diags.push({
				$severity: "info",
				$message: locale.format(module, "articleExcludedNotInProto", pageDef.code(_), variant.code(_), variant.title(_), par.prototypeId, g.join(","))
			});
			var converter = require("syracuse-x3/lib/cvgPageConverter");
			var nf = converter.getLocalizationNotFoundArray(c, p.$localization);
			nf.length && diags.push({
				$severity: "warning",
				$message: locale.format(module, "locCodeNotFound", (par.prototypeId || ""), nf.join(","))
			});
		},
		$onExportResource: function(_, key, resource, localizations) {
			if (!key || !localizations) return;
			//
			var self = this;
			var content = JSON.parse(self.content(_) || "{}");
			var loc = content.$article && content.$article.$localization || {};
			Object.keys(loc).forEach(function(lg) {
				var lang = lg.toLowerCase();
				var locLg = localizations[lang] = localizations[lang] || {};
				Object.keys(loc[lg]).forEach(function(kk) {
					locLg["pageData." + key + "." + kk] = loc[lg][kk];
				});
			});
		},
		$onImportResource: function(_, resource, proto, localization) {
			function _setLocalization(lang, importKey, value) {
				var key = importKey.substring(prefix.length);
				instLoc[lang] = instLoc[lang] || {};
				instLoc[lang][key] = value;
			}
			if (!resource || !proto || !localization) return;
			var self = this;
			//
			var keys = Array.isArray(proto.$key) ? proto.$key : [proto.$key];
			var key = keys.map(function(kk) {
				return resource[kk];
			}).join(".");
			var content = JSON.parse(self.content(_) || "{}");
			content.$article = content.$article || {};
			var instLoc = content.$article.$localization = content.$article.$localization || {};
			var prefix = "pageData." + key + ".";
			Object.keys(localization).forEach(function(lang) {
				Object.keys(localization[lang]).forEach(function(kk) {
					if (kk.indexOf(prefix) === 0) _setLocalization(lang, kk, localization[lang][kk]);
				});
			});
			if (Object.keys(instLoc).length) self.localization(_, JSON.stringify(instLoc));
		}
	},
	$indexes: {},
	$defaultOrder: [
		["code", true]
	]
};