"use strict";

var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

function _getLayout(_, db, id, withCreate) {
	//
	var ids = id.split(",");
	var pIds = ids[0].split(".");
	var pageVariant = pIds.shift();
	var pageId = pIds.join(".");
	//
	var bIds = (ids[1] && ids[1].split(".")) || [];
	var bindVariant = bIds[0];
	var bindId = bIds[1];
	//
	var layoutEnt = db.getEntity(_, "pageLayout");
	var filter = pageVariant === "pageContext" ? {
		pageContext: pageId,
		binding: bindId
	} : {
		page: pageId,
		binding: bindId
	};
	//
	var layout = db.fetchInstance(_, layoutEnt, {
		jsonWhere: filter
	});
	if (!layout && withCreate) {
		//
		layout = layoutEnt.createInstance(_, db);
		var page;
		switch (pageVariant) {
			case "pageContext":
				layout.pageContext(_, pageId);
				break;
			case "pageVariant":
				var pageEnt = db.getEntity(_, "pageDef");
				var pageDef = db.fetchInstance(_, pageEnt, {
					jsonWhere: {
						variants: pageId
					}
				});
				page = pageDef.variants(_).get(_, pageId);
				layout.page(_, page, pageVariant);
				break;
			default:
				var pageEnt = layoutEnt.$relations.page.getTargetEntity(pageVariant);
				page = db.fetchInstance(_, pageEnt, pageId);
				layout.page(_, page, pageVariant);
		}
		if (bindVariant && bindId) {
			var bindEnt = layoutEnt.$relations.binding.getTargetEntity(bindVariant);
			if (!bindEnt) throw new Error(locale.format(module, "bindEntityNotFound", bindVariant));
			var bind = db.fetchInstance(_, bindEnt, bindId);
			if (bind) layout.binding(_, bind, bindVariant);
		}
	}
	return layout;
}

var localePrefs = {};

function getLocalePreferences(_, db) {
	var id = globals.context.tenantId || 0;
	localePrefs[id] = localePrefs[id] || db.fetchInstances(_, db.getEntity(_, "localePreference")).map_(_, function(_, l) {
		return l.code(_);
	});
	return localePrefs[id];
}

exports.cleanLocalizations = function(_, content, pageLayoutProxy, tracer) {
	var db = adminHelper.getCollaborationOrm(_);
	var stringifiedLayout = JSON.stringify(content.$layout);
	if (pageLayoutProxy && pageLayoutProxy._layoutId && pageLayoutProxy._layoutId.indexOf('.') !== -1) {
		var idParts = pageLayoutProxy._layoutId.split('.');
		var entityName = idParts[0];
		var uuid = idParts[1];
		var lpEntity = db.getEntity(_, entityName);
		if (lpEntity) {
			var lp = db.fetchInstance(_, lpEntity, {
				jsonWhere: {
					$uuid: uuid
				}
			});
			if (lp) {
				var pageName = lp.pageName && lp.pageName(_) ? lp.pageName(_) + "(" + lp.$uuid + ")" : lp.$uuid;
				var locPrefs = getLocalePreferences(_, db);
				var loc = content.$localization;
				//console.error("CONTENT: "+ JSON.stringify(content,null,2));
				// set lower with upper values and delete upper (fr-FR values will be set in fr-fr, and fr-FR will be deleted)
				locPrefs.forEach_(_, function(_, pref) {
					if (loc[pref]) {
						loc[pref.toLowerCase()] = loc[pref.toLowerCase()] || {};
						var keys = Object.keys(loc[pref]);
						keys.forEach_(_, function(_, k) {
							if (loc[pref.toLowerCase()][k] !== loc[pref][k]) {

								if (stringifiedLayout.indexOf(k) !== -1) {
									var oldVal = loc[pref.toLowerCase()][k];
									var newVal = loc[pref][k];

									if (tracer && lp.$factory === true && lp.$factoryOwner === "SAGE") {
										// display everything for factory elements
										tracer("  Replace old localization (" + pref.toLowerCase() + "): '" + oldVal + "' with new value (" + pref + "): '" + newVal + "' on " + entityName + " " + pageName);
									} else if (tracer && oldVal) {
										// Do not display others if previous value was not set
										tracer("  Replace old localization (" + pref.toLowerCase() + "): '" + oldVal + "' with new value (" + pref + "): '" + newVal + "' on " + entityName + " " + pageName);
									}
									loc[pref.toLowerCase()][k] = loc[pref][k];
								}
							}
						});
						delete loc[pref];
					}
				});
				var items = content && content.$layout && content.$layout.$items && content.$layout.$items;
				if (items) {
					for (var i in loc) {
						for (var j in loc[i]) {
							if (stringifiedLayout.indexOf(j) === -1) {
								if (tracer && lp.$factory === true && lp.$factoryOwner === "SAGE") {
									// display everything for factory elements
									tracer("  Delete unused localization: " + loc[i][j] + "' on " + entityName + " " + pageName);
								}
								delete loc[i][j];
							}
						}
					}
				}
			}
		}
	}
};

exports.entity = {
	$isPersistent: false,
	$properties: {
		content: {
			$title: "Content",
			$type: "json"
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			var self = this;
			// id is a composed of: "pageVariant.pageUuid[,bindVariant.bindUuid]
			self._layoutId = id;
			var layout = _getLayout(_, self._db, id);
			//
			if (layout) {
				var cnt = JSON.parse(layout.content(_) || "{}");
				cnt.$localization = JSON.parse(layout.localization(_) || "{}");
				self.content(_, cnt);
			} else self.content(_, null);
		},
		$save: function(_, saveRes) {
			var self = this;
			//
			var layout = _getLayout(_, self._db, self._layoutId, true);
			var cnt = self.content(_) || {};
			// to avoid unnecessary localizations and to merge upper and lower cased keys like fr-fr and fr-FR
			exports.cleanLocalizations(_, cnt, self);
			var loc = cnt.$localization;
			layout.localization(_, JSON.stringify(loc));
			// delete before strigify but restore after otherwise put return is wrong
			delete cnt.$localization;
			layout.content(_, JSON.stringify(cnt));
			cnt.$localization = loc;
			layout.save(_, null, {
				shallowSerialize: true
			});
			saveRes.$diagnoses = saveRes.$diagnoses || [];
			layout.getAllDiagnoses(_, saveRes.$diagnoses, {
				addEntityName: true,
				addPropName: true
			});
			// cache reset
			globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("landingPage");
		}
	},
	// global entity functions
	getLayoutContentFromId: function(_, db, id) {
		var layout = _getLayout(_, db, id);
		if (!layout) return null;
		var cnt = JSON.parse(layout.content(_) || "{}");
		cnt.$localization = JSON.parse(layout.localization(_) || "{}");
		return cnt;
	},
	getLayoutFromId: function(_, db, id) {
		return _getLayout(_, db, id);
	},
	getLayoutEtagFromId: function(_, db, id) {
		var layout = _getLayout(_, db, id);
		if (!layout) return null;
		return layout.$updDate && layout.$updDate.toUTCString();
	}
};