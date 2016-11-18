"use strict";

var globals = require('streamline-runtime').globals;
var fs = require('streamline-fs');
var fsp = require('path');
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("../../../collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');
var perfmon = require('../../../..//src/perfmon/record');
var converter = require("syracuse-x3/lib/cvgPageConverter");
var crypto = require('crypto');
var config = require('config');
var navPageHelper = require("./navPageHelper");
var nocache = config && config.hosting && config.hosting.nocache;
var profileJsonDate;


var _tracer; // = console.log;


function _addUrlParam(url, param) {
	return url.indexOf("?") >= 0 ? url + "&" + param : url + "?" + param;
}

function _exists(_, fname) {
	return fs.exists(fname, _);
}

function _getPath(presentation) {
	var path = presentation.split(",");
	path = path[0].split(".");
	var facet = path.pop();
	// temp page hack
	if (facet === "$dashboard") {
		path = "syracuse-main/html/default/" + path.pop() + "-" + facet + ".json";
	} else if (path[0] === "syracuse" && path[1] === "content") {
		path = path.slice(2);
		path = "syracuse-main/html/" + path.join("/") + "-" + facet + ".json";
	} else {
		path[2] = "uiviews"; //replace dataset.
		path.splice(1, 0, "lib"); // insert lib
		//		path = path.join("/") + "-" + type + ".json";
		path = path.slice(0, 4).join("/") + "/" + facet + ".json";
	}
	var x = fsp.join(__dirname, "../../../..") + "/" + path;
	return x;
}


function _getUrlPrototype(baseUrl, mediaType, x3fusion) {
	//Il faudra trouver un moyen d'associer un media type avec une url de serveur.
	//Pour l'instant, pointe sur le serveur syracuse
	var url = baseUrl.split("/");
	url = url[0] + "//" + url[2] + "/" + (x3fusion ? "trans" : url[3]) + "/";
	//	url = url[0] + "//" + url[2] + "/" + (x3fusion?"x3":url[3]) + "/";
	mediaType = mediaType.split(".");
	url += mediaType.slice(0, 3).join("/");
	url += "/$prototypes('";
	url += mediaType.slice(3, 5).join(".").split(',')[0];
	url += "')";

	return url;
}

function _parsePageId(id) {
	// id = application.contract.representation.facet, [$page || trans], [{variant} || uuid_of_variant], [{device} || "desktop" || "phone"]
	var path = id.split(",");
	var options = {
		x3fusion: (path[1] === "trans"),
		variantId: ((path.length > 2) ? ((path[2] == "{variant}") ? null : path[2]) : null),
		device: ((path.length > 3) ? ((path[3] == "{device}") ? "desktop" : path[3]) : "desktop")
	};
	path = path[0].split(".");
	if (path.length > 3) {
		// has endpoint indication
		options.application = path[0];
		options.contract = path[1];
		options.endpoint = path[2];
	} else {
		path.splice(0, 1, "syracuse", "collaboration", "syracuse");
	}
	options.representation = path[3];
	options.facet = path[4];
	// don't remove dataset segment anymore
	/*	// remove dataset segment
	 path.splice(2, 1);*/
	options.pageContext = path.join(".");
	//save original id
	options.id = id;
	return options;
}

function _checkId(options) {
	// id = application.contract.representation.facet, [$page || trans], [{variant} || uuid_of_variant]
	if (!options.variantId) options.variantId = null;
	if (!options.x3fusion) options.x3fusion = false;
	if (!options.id) {
		options.id = [
			[options.application, options.contract, options.endpoint, options.representation, options.facet].join("."),
			options.x3fusion ? "trans" : "$page", options.variantId ? options.variantId : "{variant}"
		].join(",");
	}
	if (!options.pageContext) options.pageContext = [options.application, options.contract, options.endpoint, options.representation, options.facet].join(".");
	if (!options.device) options.device = "desktop";
}

function _fromPrototypeCache(_, context, cacheId, cacheName) {
	if (!cacheId) return null;
	var p = (globals.context.session.fromCache && globals.context.session.fromCache(cacheName, cacheId));
	p && _tracer && _tracer("Prototype cache hit for: " + cacheId);
	return p;
}

function _toPrototypeCache(_, cacheId, cacheName, prototype) {
	return cacheId ? (globals.context.session.toCache && globals.context.session.toCache(cacheName, cacheId, prototype)) : prototype;
}

function _getCurrentConfig(_, context) {
	// TODO : optimize - use a cache for currentConfig
	var config = require('config'); // do not put this require in header as would be circular reference
	var currentConfig;
	if (config && config.currentConfigVersion) currentConfig = context.db.fetchInstance(_, context.model.getEntity(_, "configuration"), {
		jsonWhere: {
			version: config.currentConfigVersion
		}
	});
	if (!currentConfig)
	// get the biggest config enabled
		currentConfig = context.db.fetchInstance(_, context.model.getEntity(_, "configuration"), {
		jsonWhere: {
			enable: true
		},
		orderBy: [{
			binding: "version",
			descending: true
		}],
		count: 1
	});
	//
	return currentConfig;
}

function _getAllConfigFilter(_, context) {
	var crtConfig = _getCurrentConfig(_, context);
	//
	var parents = crtConfig && crtConfig.allParents(_).toUuidArray(_);
	// add crtConfig
	parents && parents.push(crtConfig.$uuid);
	// add "none"
	parents && parents.push(null);
	//
	return (parents && {
		$in: parents
	}) || null;
}

function _getAlternateFacets(facet) {
	switch (facet) {
		//	case "$edit":
		//		return ["$details"];
		//	case "$details":
		//		return ["$edit"];
		case "$query":
			return ["$lookup", "$select"];
		case "$lookup":
			return ["$query", "$select"];
		case "$select":
			return ["$query", "$lookup"];
		default:
			return null;
	}
}

function _pickVariants(_, context, params, authEntity, selectedEp) {
	var app = params.application && params.contract && adminHelper.getApplication(_, params.application, params.contract);
	var variant = null;
	var variants = null;
	var pageEntity = null;
	var pageWhere = null;
	var pageDef = null;
	var selectedEpId = selectedEp && selectedEp.$uuid;
	if (params.facet === "$dashboard") {
		// look for dashboard by representation
		pageEntity = context.model.getEntity(_, "dashboardDef");
		pageWhere = {
			jsonWhere: {
				dashboardName: params.representation
			}
		};
	} else {
		pageEntity = context.model.getEntity(_, "pageDef");
		pageWhere = {
			jsonWhere: {
				representation: params.representation,
				facet: params.facet,
				application: app && app.$uuid,
				device: params.device
			}
		};
	}
	pageDef = context.db.fetchInstance(_, pageEntity, pageWhere);
	if (!pageDef) {
		if (params.x3fusion) {
			// try model representation
			if (params.modelRepresentation) {
				var new_r = context.parameters.modelRepresentation + '$MODEL';
				pageWhere.jsonWhere.representation = new_r;
				pageDef = context.db.fetchInstance(_, pageEntity, pageWhere);
			}
		} else {
			// try alternates
			var alt = _getAlternateFacets(params.facet);
			if (alt) {
				pageWhere.jsonWhere.facet = {
					$in: alt
				};
				pageDef = context.db.fetchInstance(_, pageEntity, pageWhere);
			}
		}
	}
	var up = context.getUserProfile(_);
	var userId = up.user(_).$uuid;
	// last variant storage
	var variantId = params.variantId;
	var pref = up.getRepresentationPrefs(_, params.representation, params.facet);
	if (params.variantId) {
		if (!pref) pref = up.createRepresentationPrefs(_, params.representation, params.facet);
		pref.lastVariantId(_, params.variantId);
		pref.save(_);
	} else variantId = pref && pref.lastVariantId(_);
	//
	variants = pageDef && pageDef.selectAllVariants(_, variantId, {
		userId: userId,
		roleId: up.selectedRole(_) && up.selectedRole(_).$uuid,
		endpointId: selectedEpId,
		applicationId: selectedEp && selectedEp.applicationRef(_).$uuid,
		modelRepresentation: params.modelRepresentation
	});
	return variants;
}

function _getFusionPrototype(_, context, protoIds, ignoreStubs, cacheInfosOnly) {
	function _getFusionPrototypeStub(_, protoUrl, fallbackFct) {
		// url is like '/sdata/contract/application/dataset/$prototypes('name.type.variant')',
		var root = process.mainModule.filename.substring(0, process.mainModule.filename.indexOf("index.js"));
		var path = protoUrl.split("/").slice(1);
		path[0] = stubsPath;
		path = path.join("/");
		path = path.split("?")[0];
		var proto = null;
		try {
			proto = JSON.parse(fs.readFile(root + path, "utf8", _));
		} catch (err) {
			if (err.code !== "ENOENT") throw err;
			proto = fallbackFct(_, context, protoIds, true);
		}
		return proto;
	}

	// helpers.stubsPath is to be deprecated
	var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
	//
	var ep = adminHelper.getEndpoint(_, {
		dataset: protoIds[2]
	});
	//
	var _config = require('config').x3fusion || {};
	var opt = {
		// required
		langCode: locale.extractLocaleCode(context.request.headers["accept-language"]),
		prototypeId: protoIds.slice(3, 5).join("."),
		// optional
		prototypesLocalServerRoot: (ignoreStubs ? "" : _config.prototypesLocalServerRoot),
		prototypesFolder: (ignoreStubs ? "" : _config.prototypesFolder),
		timestamp: context.parameters && context.parameters.timestamp
	};
	// stubs
	if (!ignoreStubs && stubsPath && _config.prototypesLocalServerRoot) {
		return _getFusionPrototypeStub(_, ep.getFusionPrototypeUrl(_, opt), _getFusionPrototype);
	}
	//
	if (cacheInfosOnly)
		return ep && ep.getFusionPrototypeCacheInfos(_, opt);
	return ep && ep.getFusionPrototype(_, opt);
}

function _changeTransaction(page, transaction) {
	var bindRE = new RegExp('^([^_]+?)(' + page.$article.$transaction + ')(.*)$');
	var localRE = new RegExp('^(\\{@\\w[-_][^-_]+?)(' + page.$article.$transaction + ')([^\\}]*\\})$');
	var replacer = function(all, p1, p2, p3) {
		return p1 + transaction + p3;
	};

	function change(obj) {
		Object.keys(obj).forEach(function(key) {
			var v = obj[key];
			if (key === '$bind') {
				var oldBind = obj.$bind;
				obj.$bind = v.toString().replace(bindRE, replacer);
				_tracer && _tracer("Replacing: " + oldBind + " with " + obj.$bind);
			} else if (typeof v === "string" && v[0] === '{') obj[key] = v.replace(localRE, replacer);
			else if (v && typeof v === "object") change(v);
		});
	}
	_tracer && _tracer("Changing trasaction code for: " + page.$article.$transaction + " to " + transaction);
	change(page.$article);
	page.$article.$transaction = transaction;
}


function _computeEtag(_, variantId, key1, nbVariants, key2) {
	var _etag = "";
	if (!variantId && !key1) {
		_etag += 'no_variant';
	}
	if (variantId) {
		_etag += variantId;
	}
	if (key1) {
		if (_etag !== "") _etag += '~';
		_etag += key1;
		if (nbVariants != null) {
			if (_etag !== "") _etag += '~';
			_etag += nbVariants;
		}
	}
	if (key2) {
		if (_etag !== "") _etag += '~';
		_etag += key2;
	}

	// protect if profile.json changed
	if (!profileJsonDate) {
		profileJsonDate = fs.stat(__dirname + "/../../security/profile.json", _).mtime;
	}
	_etag += '~' + profileJsonDate.toISOString();

	// language should be in etag
	_etag += '~' + locale.current;

	// consider navigation page cache changes
	_etag += '~' + navPageHelper.getLastChangeTime();
	//
	// Create hash to be sure that etag doesn't contains special characters + add double quotes to respect HTTP protocol
	var shasum = crypto.createHash('sha1');
	shasum.update(_etag, "utf8");
	_etag = shasum.digest('hex');
	//
	return _etag !== "" ? '"' + _etag + '"' : null;
}

function _getNavPageComponentsLastModified(_, db) {
	function getLastModifiedInstance(_, entityName, binding) {
		var entity = db.getEntity(_, entityName);
		var _inst = db.fetchInstance(_, entity, {
			jsonWhere: {},
			orderBy: [{
				binding: binding,
				descending: true
			}]
		});
		return _inst;
	}

	var entitiesToCheck = ["navigationPage", "menuModule", "menuBlock", "menuItem"];
	var lastModified = new Date(0);
	for (var i in entitiesToCheck) {
		var inst = getLastModifiedInstance(_, entitiesToCheck[i], "$updDate");
		_tracer && _tracer(entitiesToCheck[i] + " : " + inst.$updDate);
		lastModified = inst && inst.$updDate > lastModified ? inst.$updDate : lastModified;
	}
	return lastModified;
}

function _computeNavigationPageEtag(_, context, params) {
	var lastModified = _getNavPageComponentsLastModified(_, context.db);
	_tracer && _tracer("Last resource modified : " + lastModified);

	var editMode = (params && params.editMode) || (context.parameters && context.parameters.editMode) || "user";
	var adminMode = editMode === "admin";
	var selectedEp = params.endpoint && adminHelper.getEndpoint(_, {
		dataset: params.endpoint
	});
	var adminEp = adminHelper.getCollaborationEndpoint(_);
	var up = context.getUserProfile(_);

	var selectedEpId = selectedEp && selectedEp.$uuid;
	var admFctRights = adminMode ? null : up.getAccessRightAuthorizations(_, adminEp);
	var selEpFctRights = adminMode ? null : ((selectedEpId !== adminEp.$uuid) ? up.getAccessRightAuthorizations(_, selectedEp) : admFctRights);
	var adminRightsDate = admFctRights && admFctRights.$etag;
	var rightsKey = adminRightsDate && adminRightsDate.toISOString();
	_tracer && _tracer("Administration endpoint rights : " + adminRightsDate);

	var epRightsDate = selEpFctRights && selEpFctRights.$etag;
	_tracer && _tracer("Selected endpoint rights : " + epRightsDate);
	if (epRightsDate) rightsKey = rightsKey != null ? rightsKey + "~" + epRightsDate : epRightsDate;
	_tracer && _tracer("Rights key : " + rightsKey);
	return _computeEtag(_, up.user(_).$uuid, lastModified.toISOString(), null, rightsKey || new Date(0));
}

function _getPage(_, context, params) {
	function _selected(propName) {
		return (select && select[propName]) || !select;
	}
	var timing = perfmon.start(module, "page._getPage", params.representation);
	_checkId(params);
	var id = params.id;
	var role = params.role || context.getSelectedRoleId(_);
	var selectedEp = params.endpoint && adminHelper.getEndpoint(_, {
		dataset: params.endpoint
	});
	var select = context.parameters.select;
	var selectedEpId = selectedEp && selectedEp.$uuid;
	var page = null;

	var protoIds = (id.split(",")[0] || "").split(".");
	// fusion prototype
	var fusionProto = params.x3fusion && (_selected("$prototype") || _selected("$article")) ? _getFusionPrototype(_, context, protoIds) : null;
	var fusionProtoCacheInfos = params.x3fusion && (_selected("$prototype") || _selected("$article")) && fusionProto ? _getFusionPrototype(_, context, protoIds, true, "Cache-Infos") : null;
	var fusionUpdDate = fusionProtoCacheInfos && fusionProtoCacheInfos.lastModified ? new Date(fusionProtoCacheInfos.lastModified) : null;

	// get variant and article
	var varTiming = perfmon.start(module, "page.selectVariant", params.representation);
	//
	var up = context.getUserProfile(_);
	var userId = up.user(_).$uuid;
	var authEntity = (params.facet === "$dashboard") ? context.model.getEntity(_, "dashboardAuth") : context.model.getEntity(_, "pageAuth");
	var variants = _pickVariants(_, context, params, authEntity, selectedEp);
	var variant = variants && variants[0];
	var variantUpdDate, variantId = variant && variant.$uuid;

	try {
		var pageData = variant && variant.pageData(_);

		if (variant && variants) {
			variantUpdDate = pageData && pageData.$updDate;

			if (!id.split(",")[2]) {
				for (var i = 1; i < variants.length; i++) {
					var pData = variants[i].pageData(_);
					if (pData && (!variantUpdDate || pData.$updDate > variantUpdDate)) {
						variantId = variants[i].$uuid;
						variantUpdDate = pData.$updDate;
					}
				}
			}
		}
		page = ((_selected("$prototype") || _selected("$article")) && pageData && JSON.parse(pageData.content(_))) || {};
		// fusion prototype to convert ?
		if (fusionProto && pageData && pageData.content(_) && fusionProto.$generatorVersion && page.$article) {
			if (!page.$article.$generatorVersion) {
				//fusionProto.$article = page.$article;
				try {
					// CANNOT call twice make persistent, it will change the prototype !!! MUST clone
					if (fusionProto.$article && !fusionProto.$article.$generatorVersion) {
						var cloneProto = helpers.object.clone(fusionProto, true);
						converter.makePersistent(cloneProto, fusionProto.$article);
						//converter.makePersistent(fusionProto);
					}
					converter.makePersistent(fusionProto, page.$article);
					// page.$article = fusionProto.$article;
					page.$article.$generatorVersion = 1;
					page.$article.$transaction = fusionProto.$transaction;
					fusionProto.$article.$transaction = fusionProto.$transaction;
					pageData.content(_, JSON.stringify({
						$article: page.$article
					}));
					// silent save ...
					pageData.save(_);
				} catch (e) {
					page.$diagnoses = [{
						$severity: "error",
						$message: locale.format(module, "convertError", id, 1, e.message)
					}];

					// ask fusionproto again
					fusionProto = _getFusionPrototype(_, context, protoIds);
				}
			} else {
				// crnit 130902 - we have to change the transaction of page.$article (authoring) but not for fusionProto.$article
				_tracer && _tracer("$transaction info before make persistent: proto=" + fusionProto.$transaction + "; page: " + page.$article.$transaction);
				converter.makePersistent(fusionProto);
				if (fusionProto.$article) fusionProto.$article.$generatorVersion = 1;
				if (fusionProto.$transaction && page.$article.$transaction && page.$article.$transaction !== fusionProto.$transaction) {
					_changeTransaction(page, fusionProto.$transaction);
				}
				if (fusionProto.$transaction && fusionProto.$article.$transaction && fusionProto.$article.$transaction !== fusionProto.$transaction) {
					_changeTransaction(fusionProto, fusionProto.$transaction);
				}
				//fusionProto.$article = page.$article;
			}
		}
		if (fusionProto) {
			if (fusionProto.$article) fusionProto.$article.$transaction = fusionProto.$transaction;
			if (page.$article && !page.$article.$transaction && fusionProto.$transaction) page.$article.$transaction = fusionProto.$transaction;
			if (page.$article && params.modelRepresentation && variant && (variant._parent.representation(_) === (params.modelRepresentation + "$MODEL"))) page.$article.$isModel = true;
		}
	} catch (e) {
		page = {};
	}
	varTiming.end();
	page.$authorUrl = context.baseUrl + "/" + authEntity.plural + ((variant && variant.$uuid) ? "('" + (variant && variant.$uuid) + "')" : "/$template") +
		"/$workingCopies?representation=" + authEntity.name + ".$edit&pageContext=" + params.pageContext + (params.device ? "&device=" + params.device : "");
	// preferences
	page.$links = page.$links || {};
	var prefId = ((variant && variant.$uuid) ? "pageVariant." + variant.$uuid : "pageContext." + params.pageContext) + ",user." + userId;
	page.$links.$userPreferences = {
		$url: context.baseUrl + "/pageLayoutProxies('" + prefId + "')?representation=pageLayoutProxy.$edit",
		$method: "PUT"
	};
	if (params && params.device === "desktop") {
		// add breadcrumb
		// get key for breadcrumb
		var facet = params.facet;
		var key = params.application + "." + params.contract + "." + params.representation;

		page.$links.$breadcrumb = navPageHelper.getBreadcrumb(_, _getNavPageComponentsLastModified(_, adminHelper.getCollaborationOrm(_)), key, facet);
	}
	//
	// crnit >>> use url instead of content to take profit of cache
	/*	var cnt = context.db.getEntity(_, "pageLayoutProxy").getLayoutContentFromId(_, context.db, prefId);
	 if (cnt) page.userPreferences = {
	 content: cnt
	 };
	 */
	page.userPreferences = context.baseUrl + "/pageLayoutProxies('" + prefId + "')?representation=pageLayoutProxy.$details";
	// crnit <<<
	//
	//
	var fromFile = false;
	if (!variant) {
		var p = _getPath(id);
		if (_exists(_, p)) try {
			var data = fs.readFile(p, "utf8", _);
			variantUpdDate = fs.stat(p, _).mtime;
			var c = JSON.parse(data);
			page = c;
			page.$authorUrl = context.baseUrl + "/" + (params.facet === "$dashboard" ? "dashboardAuths" : "pageAuths") +
				"/$template/$workingCopies?representation=" + (params.facet === "$dashboard" ? "dashboardAuth" : "pageAuth") +
				".$edit&pageContext=" + params.pageContext + (params.device ? "&device=" + params.device : "");
			fromFile = true;
		} catch (e) {}
	}
	if (params.modelRepresentation) page.$authorUrl += "&modelRepresentation=" + params.modelRepresentation;

	page.$url = page.$url || id;
	//
	if ((params.facet === "$dashboard") && !fromFile && (_selected("$prototype") || _selected("$article"))) {
		var dt = perfmon.start(module, "page.dashboardPrototypes", params.representation);
		if (variant) {
			page.$diagnoses = page.$diagnoses || [];
			var cacheId = [variant.$uuid, selectedEpId || "all", role, locale.current].join("_");
			page.$prototype = _fromPrototypeCache(_, context, cacheId, "dashboardPrototype") || _toPrototypeCache(_, cacheId, "dashboardPrototype", variant.getPrototype(_, context.getUserProfile(_), {
				$diagnoses: page.$diagnoses,
				selectedEndpoint: selectedEp,
				withArticle: false // for now always send default article (page.$article == null)
			}));
			var loc = variant && variant.pageData(_) && JSON.parse((variant.pageData(_).localization(_) || "{}"));
			if (loc) page.$prototype.$localization = loc[locale.current.toLowerCase()] || loc["en-us"];
			if (!page.$prototype.$links || Object.keys(page.$prototype.$links).length === 0) {
				page.$prototype.$properties = page.$prototype.$properties || {};
				var lks = page.$prototype.$links || {};
				lks.$createDashboard = {
					$title: locale.format(module, "editDashboardLabel", params.representation),
					$url: context.baseUrl + "/dashboardDefs('" + variant._parent.$uuid + "')/$workingCopies?representation=dashboardDef.$edit",
					$method: "POST"
				};
				lks.legacy = {
					$title: "Samples/SOS dashboard",
					$url: "?representation=samples.$dashboard"
				};
			}
		} else {
			// make a vignette allowing the creation of this dashboard
			page.$prototype = {
				$title: locale.format(module, "dashboardNotFoundTitle", params.representation),
				$properties: {},
				$links: {
					$create: {
						$title: locale.format(module, "createDashboardLabel", params.representation),
						$url: context.baseUrl + "/dashboardDefs/$template/$workingCopies?representation=dashboardDef.$edit",
						$method: "POST"
					},
					legacy: {
						$title: "Samples/SOS dashboard",
						$url: "?representation=samples.$dashboard"
					}
				}
			};
		}
		dt.end();
	}
	if (context.parameters.fetchPrototype !== "false")
	//page.$prototype = page.$prototype || (!params.x3fusion && context.getPrototypeResource(_, protoIds.slice(3,5).join("."), (variant == null), protoIds[0], protoIds[1], protoIds[2])) || _getUrlPrototype(context.baseUrl, context.instanceId, params.x3fusion);
	//if (_selected("$prototype")) page.$prototype = page.$prototype || (params.x3fusion ? fusionProto : context.getPrototypeResource(_, protoIds.slice(3, 5).join("."), (variant == null), protoIds[0], protoIds[1], protoIds[2])) || _getUrlPrototype(context.baseUrl, context.instanceId, params.x3fusion);
		if (_selected("$prototype")) page.$prototype = page.$prototype || (params.x3fusion ? fusionProto : null) || _getUrlPrototype(context.baseUrl, context.instanceId, params.x3fusion);
		//
		// add alternate variants links
	if (variant && variants && _selected("$views")) {
		var url_pars = [];
		if (params.facet !== "$dashboard") url_pars.push("fetchPrototype=false");
		if (params.modelRepresentation) url_pars.push("modelRepresentation=" + params.modelRepresentation);
		page.$views = variants.map_(_, function(_, v) {
			return {
				$title: v.title(_),
				$code: v.code(_),
				$description: v.description(_),
				$isFactory: v.$factory,
				$url: context.baseUrl + "/pages('" + id.split(",").slice(0, 2).join(",") + "," + v.$uuid + "')" + (url_pars.length ? "?" + url_pars.join("&") : ""),
				$selected: (v.$uuid === variant.$uuid)
			};
		});
	}
	//
	if (_selected("$prototype")) {
		if (typeof page.$prototype === "object") {
			var ep = context.httpSession["userProfile"] && context.httpSession["userProfile"].selectedEndpoint(_);
			if (ep) page.$prototype.$baseUrl = "/sdata/" + ep.application(_) + "/" + ep.contract(_) + "/" + ep.dataset(_);
		} else {
			if ((typeof page.$prototype === "string") && params.protoInPage) {
				if (params.application === "x3") {
					//
					var ep = context.db.fetchInstance(_, context.db.model.getEntity(_, "endPoint"), {
						jsonWhere: {
							dataset: params.endpoint
						}
					});
					if (ep) {
						var model = ep.getModel(_, false);
						if (model) {
							model.resetCache();
							var proto;
							// #1602 - return X3 diagnoses
							if ("phone" == params.device) {
								proto = model.getMobilePrototype(_, params.representation, params.facet, params.device);
							} else if ("mobile" == params.device) {
								proto = model.getMobilePrototype(_, params.representation, params.facet, "desktop");
							} else {
								var entity = model.getEntity(_, params.representation, params.facet, params.device);
								if (entity) proto = entity.getPrototype(_, params.representation, params.facet, params.device);
							}
							if (proto) page.$prototype = proto;
						}
					}
				}

			}
		}
	}
	//
	timing.end();

	page._etag = _computeEtag(_, variant && variant.$uuid, variantUpdDate && variantUpdDate.toISOString(), variants && variants.length, fusionUpdDate && fusionUpdDate.toISOString());
	return page;
}

function _getNavigationPage(_, context, params) {
	var role = params.role || context.getSelectedRoleId(_);
	var editMode = (params && params.editMode) || (context.parameters && context.parameters.editMode) || "user";
	var adminMode = editMode === "admin";
	var app = params.application && params.contract && adminHelper.getApplication(_, params.application, params.contract);
	var appId = app && app.$uuid;
	// TODO: no app strategy ?
	var selectedEp = params.endpoint && adminHelper.getEndpoint(_, {
		dataset: params.endpoint
	});
	var selectedEpId = selectedEp && selectedEp.$uuid;
	var cacheId = adminMode ? null : [params.representation, (selectedEp && selectedEpId) || "all", role, locale.current].join("_");
	//
	//return _fromPrototypeCache(_, context, cacheId, "navigationPage") || _toPrototypeCache(_, cacheId, "navigationPage", (function(_) {
	return (function(_) {
		function _keep(_, app, epIds) {
			if (adminMode) return true;
			var _appId = app && app.$uuid;
			var keep = (_appId === appId || _appId === adminApp.$uuid);

			if (epIds && epIds.length) keep = keep && ((epIds.indexOf(selectedEpId) >= 0) || (epIds.indexOf(adminEp.$uuid) >= 0));
			return keep;
		}
		//
		var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
		var authLevel = sp && sp.authoringLevel(_);
		var adminApp = adminHelper.getCollaborationApplication(_);
		var adminEp = adminHelper.getCollaborationEndpoint(_);
		var page = {};
		//		page.$baseUrl = context.baseUrl;
		//
		var db = adminHelper.getCollaborationOrm(_); //context.db;
		var navPageEnt = db.getEntity(_, "navigationPage");
		var navModEnt = navPageEnt.$relations.modules.getTargetEntity();
		var subModEnt = navModEnt.$relations.submodules.getTargetEntity(); // = menuBlock
		var subBlockEnt = db.getEntity(_, "menuSubblock");
		var menuItemEnt = db.getEntity(_, "menuItem");
		// navigation page level
		var navPageProto = page.$prototype = navPageEnt.getPrototype(_, "navigationPage", "$details");
		navPageProto.$baseUrl = adminEp.getBaseUrl(_);
		navPageProto.$adminBaseUrl = navPageProto.$baseUrl;
		delete navPageProto.$links.$edit;
		delete navPageProto.$links.admin;
		var page_url = context.request.url;
		var hasPar = page_url.indexOf("?") >= 0;

		/*		if (!adminMode) {
		 var up = globals.context.session.getUserProfile(_);
		 // WARNING !!! sage is not authoring level anymore
		 if (up && (["sage", "admin"].indexOf(up.authoringLevel(_)) >= 0)) //
		 navPageProto.$links.$edit = {
		 $type: "application/json;vnd.sage=syracuse",
		 $title: locale.format(module, "pageAdmin"),
		 $method: "GET",
		 $url: page_url + (hasPar ? "&" : "?") + "editMode=admin"
		 };
		 }*/
		if (adminMode) {
			navPageProto.$links.$details = {
				$type: "application/json;vnd.sage=syracuse",
				$title: locale.format(module, "pageAdmin"),
				$method: "GET",
				$url: page_url.replace("&editMode=admin", "")
			};
		}
		//
		navPageProto.$url = _addUrlParam(navPageProto.$url, "include=modules.code,modules.title,modules.submodules.code,modules.submodules.title");
		// modules
		navPageProto.$properties.modules.$capabilities = navPageEnt.$relations.modules.$capabilities;
		var modProto = navPageProto.$properties.modules.$item = navModEnt.getPrototype(_, "menuModule", "$details");
		if (modProto.$properties.title.$links) delete modProto.$properties.title.$links.$details;
		var modProtoLks = navPageProto.$properties.modules.$links = navPageProto.$properties.modules.$links || {};
		if (adminMode) {
			modProtoLks.$select = navPageEnt.$relations.modules.getLink("$select", null, null, locale.format(module, "addModuleTitle"));
			modProtoLks.$create = navModEnt.getLink("$create", locale.format(module, "createModuleTitle"), "originPage={$uuid}", "menuModulePage");
			modProtoLks.$create.$target = "$edit";
			modProto.$representation = "menuModulePage";
			if (modProto.$properties.title.$links && modProto.$properties.title.$links.$localize) modProto.$properties.title.$links.$localize.$url += "?forceEdit=true";
		}
		modProto.$url = _addUrlParam(modProto.$url, "include=submodules.code,submodules.title,submodules.items");
		// no delete link here because it would delete the module, not the associattion.
		delete modProto.$links.$delete;
		// submodules
		modProto.$properties.submodules.$capabilities = navModEnt.$relations.submodules.$capabilities;
		var blockProto = modProto.$properties.submodules.$item = subModEnt.getPrototype(_, "menuBlock", "$details");
		delete blockProto.$links.$delete;
		if (blockProto.$properties.title.$links) delete blockProto.$properties.title.$details;
		var blockProtoLks = modProto.$properties.submodules.$links = modProto.$properties.submodules.$links || {};
		if (adminMode) {
			blockProtoLks.$select = navModEnt.$relations.submodules.getLink("$select", null, null, locale.format(module, "addSubmoduleTitle"));
			blockProtoLks.$create = subModEnt.getLink("$create", locale.format(module, "createSubmoduleTitle"), "originModule={$uuid}", "menuBlockPage");
			blockProtoLks.$create.$target = "$edit";
			blockProto.$representation = "menuBlockPage";
			if (blockProto.$properties.title.$links && blockProto.$properties.title.$links.$localize) blockProto.$properties.title.$links.$localize.$url += "?forceEdit=true";
		}
		// submodule items
		var blockItemsProto = blockProto.$properties.items.$item;
		var blockItemsProtoLks = blockProto.$properties.items.$links = blockProto.$properties.items.$links || {};
		if (adminMode) {
			blockItemsProtoLks.$select = subModEnt.$relations.items.getLink("$select", null, null, locale.format(module, "addMenuItemTitle"));
		}
		// submodule items: menu items
		var blockItemsMIProto = blockItemsProto.$variants.menuItem;
		blockItemsMIProto.$capabilities = subModEnt.$relations.items.$variants.menuItem.$capabilities;
		// submodule items: menu blocks
		var blockItemsMBProto = blockItemsProto.$variants.menuBlock;
		blockItemsMBProto.$capabilities = subModEnt.$relations.items.$variants.menuBlock.$capabilities;
		var sbProto = blockItemsMBProto.$item;
		if (sbProto.$properties.title.$links) delete sbProto.$properties.title.$links.$details;
		// subblocks capabilities
		var subBlockItemsMBProtoLks = blockItemsMBProto.$item.$properties.items.$links = blockItemsMBProto.$item.$properties.items.$links || {};
		if (adminMode) {
			subBlockItemsMBProtoLks.$select = subBlockEnt.$relations.items.getLink("$select", null, null, locale.format(module, "addMenuItemTitle"));
			if (sbProto.$properties.title.$links && sbProto.$properties.title.$links.$localize) sbProto.$properties.title.$links.$localize.$url += "?forceEdit=true";
		}
		// subblocks items: menu items
		var subBlockItemsMIProto = blockItemsMBProto.$item.$properties.items.$item.$variants.menuItem;
		subBlockItemsMIProto.$capabilities = subBlockEnt.$relations.items.$variants.menuItem.$capabilities;
		// submodule items: menu blocks
		var subBlockItemsMBProto = blockItemsMBProto.$item.$properties.items.$item.$variants.menuBlock;
		subBlockItemsMBProto.$capabilities = subBlockEnt.$relations.items.$variants.menuBlock.$capabilities;
		//
		// navigation page data
		var up = context.getUserProfile(_);
		var np;
		if (params.representation === "home" && !adminMode) {
			var rr = db.fetchInstance(_, db.getEntity(_, "role"), role);
			if (rr) np = rr.navigationPage(_);
		}
		np = np || db.fetchInstance(_, navPageEnt, {
			jsonWhere: {
				pageName: params.representation
			}
		});
		if (!np) {
			// TODO: not found management
			return page;
		}
		//
		// rights structure
		var admFctRights = adminMode ? null : up.getAccessRightAuthorizations(_, adminEp);
		var selEpFctRights = adminMode ? null : ((selectedEpId !== adminEp.$uuid) ? up.getAccessRightAuthorizations(_, selectedEp) : admFctRights);
		if (selEpFctRights && selEpFctRights.$diagnoses) page.$diagnoses = selEpFctRights.$diagnoses;
		//

		// reset the product name regarding the map define in helper that is updated on each syracuse connection
		adminHelper.changeProductName(_, up);
		page.$uuid = np.$uuid;
		page.$prototype.$editMode = editMode;
		page.title = np.title(_);
		page.description = np.description(_);
		page.pageName = np.pageName(_);
		page.productName = up.productName(_);
		page.modules = [];
		var lastModified = _getNavPageComponentsLastModified(_, np._db);
		// crnit : since full load of modules one by one, the funnel is not needed anymore
		//		modulesCacheFunnel(_, function(_) {
		var npModules = navPageHelper._fetchNavPageModules(_, np, lastModified);

		npModules.forEach_(_, function(_, mm) {
			if (!_keep(_, mm.application(_), mm.endpoints(_).toUuidArray(_))) return;
			var mmAppId = mm.application(_) && mm.application(_).$uuid;
			var isAdmin = mmAppId === adminApp.$uuid;
			var ff = {
				applicationId: mmAppId,
				endpointId: (isAdmin ? adminEp.$uuid : selectedEpId),
				auth: (isAdmin ? admFctRights : selEpFctRights),
				authLevel: authLevel
			};
			var page_m = {
				$uuid: mm.$uuid,
				$hostUrl: globals.context.session.host,
				$menuBaseUrl: isAdmin ? adminEp.getBaseUrl(_) : selectedEp && selectedEp.getBaseUrl(_),
				code: mm.code(_),
				title: mm.title(_),
				submodules: []
			};
			if (page_m.$menuBaseUrl) page_m.$transMenuBaseUrl = page_m.$menuBaseUrl.replace("/sdata/", "/trans/");
			mm.submodules(_).toArray(_).forEach_(_, function(_, sm) {
				if (!_keep(_, sm.application(_), sm.endpoints(_).toUuidArray(_))) return;
				var res_sm = sm.getNavigationPageResource(_, {
					representation: "{$menuBaseUrl}",
					"function": "{$transMenuBaseUrl}"
				}, ff, adminMode);
				if (adminMode || (res_sm.items && res_sm.items.length)) page_m.submodules.push(res_sm);
				res_sm.$links = res_sm.$links || {};
				res_sm.$links.$edit = res_sm.$links.$edit || {};
				if (sm.$factory && sp && !sp.hasFactoryRights(_)) {
					if (!adminMode) res_sm.$links.$edit.$isHidden = true;
					if (mm.$factory) {
						var mmEnt = mm.getEntity(_);
						if (mmEnt.$factoryExcludes && mmEnt.$factoryExcludes.indexOf("submodules") === -1) {
							res_sm.$capabilities = "";
						}
					}
				} /* else res_sm.$links.$edit.$isHidden = false;*/
			});
			if (adminMode || (page_m.submodules && page_m.submodules.length)) page.modules.push(page_m);
			page_m.$links = page_m.$links || {};
			page_m.$links.$edit = page_m.$links.$edit || {};
			if (mm.$factory && sp && !sp.hasFactoryRights(_)) {
				if (!adminMode) page_m.$links.$edit.$isHidden = true;
				if (np.$factory) {
					var npEnt = np.getEntity(_);
					if (npEnt.$factoryExcludes && npEnt.$factoryExcludes.indexOf("modules") === -1) {
						page_m.$capabilities = "";
					}
				}
			} /*else page_m.$links.$edit.$isHidden = false;*/
		});
		// now npModules are fully loaded, passe them to cache
		// crnit : new way of loading modules so we don't put them to cache here anymore
		//_modulesToCache(npModules, lastModified);
		//		});
		//
		return page;
	})(_);
	//);
}

function _filterEmptyLandingPages(_, arrayLandingPages) {
	if (arrayLandingPages && arrayLandingPages.length > 0) {
		return arrayLandingPages.filter_(_, function(_, lp) {
			return lp && lp.vignettes && lp.vignettes.length > 0;
		});
	} else {
		return arrayLandingPages;
	}
}

function _getLandingPage(_, context, params) {
	var role = params.role || context.getSelectedRoleId(_);
	var app = params.application && params.contract && adminHelper.getApplication(_, params.application, params.contract);
	var appId = app && app.$uuid;
	// TODO: no app strategy ?
	var selectedEp = params.endpoint && adminHelper.getEndpoint(_, {
		dataset: params.endpoint
	});
	var selectedEpId = selectedEp && selectedEp.$uuid;
	var editMode = (params && params.editMode) || (context.parameters && context.parameters.editMode) || "user";
	var adminMode = editMode === "admin";
	var cacheId = adminMode ? null : [params.representation, (selectedEp && selectedEpId) || "all", role, locale.current].join("_");
	//
	//	return _fromPrototypeCache(_, context, cacheId, "landingPage") || _toPrototypeCache(_, cacheId, "landingPage", (function(_) {
	// no cache anymore for now
	return (function(_) {
		function _serializeLandingPage(_, lp) {
			var res = {
				$uuid: lp.$uuid,
				$key: lp.$key,
				pageId: lp.$uuid,
				title: lp.title(_),
				pageName: lp.pageName(_),
				useCurrentEndpoint: lp.useCurrentEndpoint(_),
				vignettes: (lp.useCurrentEndpoint(_) && (selectedEp == null)) ? [] : lp.vignettes(_).toArray(_).filter_(_, function(_, lv) {
					if (lp.useCurrentEndpoint(_)) {
						//						var item = lv.vignette(_).pageItem(_);
						var item = lv.vignette(_);
						if (!item) return false;
						if (!item.application(_)) return true;
						if (item.endpoint(_) && (item.endpoint(_).$uuid === selectedEp.$uuid)) return true;
						if (item.application(_) && (item.application(_).$uuid === selectedEp.applicationRef(_).$uuid)) return true;
						return false;
					} else return true;
				}).map_(_, function(_, lv) {
					/*var lvep = lv.endpoint(_);
					 var lvRes = {
					 $uuid: lv.$uuid,
					 bind: (lv.vignette(_).code(_) || lv.vignette(_).$uuid) + (lvep ? "-" + lvep.dataset(_) : ""),
					 vignette: {
					 $uuid: lv.vignette(_).$uuid
					 },
					 $links: {
					 $location: lv.getLocationLink(_, "{$selectedEpBaseUrl}")
					 }
					 };
					 if (lv.endpoint(_)) lvRes.endpoint = {
					 $uuid: lv.endpoint(_).$uuid
					 };
					 return lvRes;*/
					return lv.serializeInstance(_);
				})
			};
			//
			if (pageName && (pageName === lp.pageName(_))) {
				selectedId = lp.$uuid;
				selectedTitle = lp.title(_);
			}
			//
			var cnt = plProxyEnt.getLayoutContentFromId(_, db, "landingPage." + lp.$uuid);
			if (cnt) res.stdLayout = {
				content: cnt
			};
			//
			// for now, stdLayout only for landing pages
			/*			var pl = db.fetchInstance(_, plEnt, {
			 page: lp.$uuid,
			 binding: up.user(_).$uuid
			 });
			 if (pl) res.userLayout = {
			 content: pl.content(_)
			 };*/
			//
			return res;
		}
		//
		function _getPagePrototype(_, canModifyPage, canModifyStdPref) {
			var pageProto = {
				$type: "application/x-array",
				$item: ldPageEnt.getPrototype(_, "landingPage", "$details")
			};
			pageProto.$item.$url = pageProto.$item.$url + "?representation=landingPage.$edit";
			//
			if (pageProto.$item && pageProto.$item.$links) delete pageProto.$item.$links.$edit;
			if (canModifyPage) {
				if (!adminMode) {
					var pageProtoLks = pageProto.$links = pageProto.$links || {};
					pageProtoLks.$create = ldPageEnt.getLink("$create", locale.format(module, "createLpTitle"), "originUser=" + up.user(_).$uuid, "landingPageReduced");
					pageProtoLks.$create.$target = "$edit";
				}
				//
				pageProto.$item.$links = pageProto.$item.$links || {};
				pageProto.$item.$links.$edit = ldPageEnt.getLink("$edit", "", "", "landingPageReduced");
				pageProto.$item.$links.$edit.$target = "$edit";
			} else delete pageProto.$item.$links;
			// layouts
			var stdPrefsProto = pageProto.$item.$properties.stdLayout = {
				$type: "application/x-object",
				$item: {
					$type: "application/json",
					$properties: {
						content: {
							$type: "application/json"
						}
					}
				}
			};
			if (canModifyStdPref) stdPrefsProto.$item.$links = {
				$save: {
					$url: "{$baseUrl}/pageLayoutProxies('landingPage.{pageId}')?representation=pageLayoutProxy.$edit",
					$method: "PUT"
				}
			};
			// for now, stdLayout only for landing pages
			/*			var userPrefsProto = pageProto.$item.$properties.userLayout = {
			 $type: "application/x-object",
			 $item: {
			 $type: "application/json",
			 $properties: {
			 content: {
			 $type: "application/json"
			 }
			 },
			 $links: {
			 $save: {
			 $url: "{$baseUrl}/pageLayoutProxies('landingPage.{pageId},user." + up.user(_).$uuid + "')?representation=pageLayoutProxy.$edit",
			 $method: "POST"
			 }
			 }
			 }
			 };*/
			//
			var pageVignettesProto = pageProto.$item.$properties.vignettes;
			pageVignettesProto.$bind = "{bind}";
			if (canModifyPage) {
				pageVignettesProto.$links = pageVignettesProto.$links || {};
				pageVignettesProto.$links.$select = {
					$title: locale.format(module, "selectVignette"),
					$url: adminBaseUrl + "/landingVignetteSelects/$template/$workingCopies?representation=landingVignetteSelect.$edit",
					$method: "POST"
				};
			}
			//
			return pageProto;
		}
		//
		var adminApp = adminHelper.getCollaborationApplication(_);
		var adminEp = adminHelper.getCollaborationEndpoint(_);
		var adminBaseUrl = adminEp.getBaseUrl(_);
		var page = {};
		//		page.$baseUrl = context.baseUrl;
		//
		var db = adminEp.getOrm(_);
		var ldPageEnt = db.getEntity(_, "landingPage");
		var plProxyEnt = db.getEntity(_, "pageLayoutProxy");
		//
		var rr = db.fetchInstance(_, db.getEntity(_, "role"), role);
		var up = context.getUserProfile(_);
		// desired page name
		var pageName = null;
		var selectedId = null;
		var selectedTitle = "";
		/*		var pref = up.user(_).getPreferences(_, true); // with create

		 if (params.representation === "*") {
		 pageName = (pref.lastLandingPageName(_));
		 } else {
		 pageName = params.representation;
		 pref.lastLandingPageName(_, pageName);
		 pref.save(_);
		 }*/
		pageName = params.representation;
		//
		if (adminMode) {
			var lpg = db.fetchInstance(_, ldPageEnt, {
				jsonWhere: {
					pageName: pageName
				}
			});
			if (lpg) {
				page.rolePages = [_serializeLandingPage(_, lpg)];
				page.rolePages = _filterEmptyLandingPages(_, page.rolePages);
				page.$selected = lpg.$uuid;
			}
		} else {
			page.rolePages = rr && rr.landingPages(_).toArray(_).map_(_, _serializeLandingPage);
			page.rolePages = _filterEmptyLandingPages(_, page.rolePages);
			page.userPages = up.user(_) && db.fetchInstances(_, ldPageEnt, {
				jsonWhere: {
					owner: up.user(_).$uuid
				}
			}).map_(_, _serializeLandingPage);
			page.$selected = selectedId;
		}
		page.$title = selectedTitle;
		//
		page.$prototype = {
			$title: selectedTitle,
			$properties: {}
		};
		// Prototype additions
		page.$prototype.$properties.rolePages = _getPagePrototype(_, adminMode, adminMode);
		page.$prototype.$properties.userPages = _getPagePrototype(_, true, true);
		//
		page.$prototype.$baseUrl = adminBaseUrl;
		page.$selectedEpBaseUrl = selectedEp && selectedEp.getBaseUrl(_);
		//
		return page;
	})(_);
	//);
}

exports.entity = {
	$isPersistent: false,
	$events: {},
	$staticFunctions: {
		// this function is used in portlet.js  service representation
		pageContent: function(_, context, params) {
			return _getPage(_, context, params);
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			// id = application.contract.representation.facet, [$page || trans], [{variant} || uuid_of_variant]
			var self = this;
			var params = _parsePageId(id);
			params.modelRepresentation = context.parameters && context.parameters.modelRepresentation;
			self._params = params;
			var page;
			switch (params.facet) {
				case "$navigation_edit":
					params.editMode = "admin";
					params.facet = "$navigation";
					page = _getNavigationPage(_, context, params);
					break;
				case "$navigation":
					if (!nocache) {
						var etag = _computeNavigationPageEtag(_, context, params);
						if (etag !== context.request.headers["if-none-match"]) {
							page = _getNavigationPage(_, context, params);
							// recompute etag as _getNavigationPage() can can have an impact on its value
							etag = _computeNavigationPageEtag(_, context, params);
							page._etag = etag;
						} else {
							page = {
								_etag: etag
							};
						}
					} else {
						page = _getNavigationPage(_, context, params);
					}
					break;
				case "$landing_edit":
					params.editMode = "admin";
					params.facet = "$landing";
				case "$landing":
					page = _getLandingPage(_, context, params);
					break;
				default:
					page = _getPage(_, context, params, self.$resource && self.$resource._etag);
			}

			// Do not store etag if page contains diagnose
			if (page.$diagnoses) delete page._etag;

			self.$resource = page || {};
			self.$resource.$uuid = self.$resource.$uuid || helpers.uuid.generate();
			self.$resource.$key = self.$resource.$uuid;
		},
		$serialize: function(_) {
			return this.$resource;
		},
		$save: function(_) {

		},
		$cacheEtag: function(_) {
			var self = this;
			var params = self._params;
			switch (params.facet) {
				case "$navigation_edit":
					//case "$navigation":
				case "$landing_edit":
				case "$landing":
					return null;
			}

			var etag = self.$resource && self.$resource._etag;

			if (etag) {
				delete self.$resource._etag;
				return etag;
			} else {
				return null;
			}
		}
	}
};