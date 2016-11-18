"use strict";

var flows = require('streamline-runtime').flows;
var globals = require('streamline-runtime').globals;
var locale = require('streamline-locale');
var adminHelper = require("../../../collaboration/helpers").AdminHelper;

exports.tracer = null;
var _tracer; // = console.error;


//
// Nav page cache helpers
//

var modulesCacheFunnel = flows.funnel(1);
// map compliant multitenant
var modulesCache = {};
var breadCrumbMap = {};
var _modAdmin = {}; //


function getBreadCrumbByTenant() {
	var id = globals.context.tenantId || 0;
	breadCrumbMap[id] = breadCrumbMap[id] ||  {};
	return breadCrumbMap[id];
}

function _getModuleCacheByTenant() {
	var id = globals.context.tenantId || 0;
	modulesCache[id] = modulesCache[id] ||  {
		modules: {},
		menus: {}
	};
	return modulesCache[id];
}

function _loadAllMenus(_, db, lastModified) {
	_tracer && _tracer("Fetch menus lastModified: " + lastModified + " full load");
	var modCacheTenant = _getModuleCacheByTenant();
	modCacheTenant.menus = {};
	var mm = db.fetchInstances(_, db.getEntity(_, "menuItem"), {});
	var cnt = mm.length;
	for (var ii = 0; ii < cnt; ii++) {
		modCacheTenant.menus[mm[ii].$uuid] = mm[ii];
	}
	//_tracer && _tracer("MENUS: "+require('util').inspect(modCacheTenant && modCacheTenant.menus,null,2));
	return modCacheTenant && modCacheTenant.menus;
}

function _modulesToCache(modules, lastModified) {
	var modCacheTenant = _getModuleCacheByTenant();

	modules.forEach(function(mod) {
		modCacheTenant.modules[mod.$uuid] = mod;
	});
	modCacheTenant.lastModified = lastModified;
	modCacheTenant.modulesArr = modules;
	// chaining
	return modules;
}




function getAdminModule(_, db) {
	var id = globals.context.tenantId ||  0;
	if (!_modAdmin[id]) {
		_modAdmin[id] = db.fetchInstance(_, db.getEntity(_, "menuModule"), {
			jsonWhere: {
				code: "S_MOD_ADMIN"
			}
		});
	}
	return _modAdmin[id];
}

function isFactorySageUser(_) {
	var up = globals.context && globals.context.session && globals.context.session.getUserProfile(_);
	if (!up) return false;
	var usr = up.user(_);
	return usr.$factory && usr.$factoryOwner === "SAGE";
}

var hasChanged = exports.hasChanged = function(lastModified) {
	var modCacheTenant = _getModuleCacheByTenant();
	return ((lastModified || "").toString() !== (modCacheTenant.lastModified || "").toString()) || !modCacheTenant.lastModified;
};

exports._fetchNavPageModules = function(_, np, lastModified) {
	var db = adminHelper.getCollaborationOrm(_);

	if (!np) {
		// if no specified nav page, we consider 'home' to be able to compute breadcrumb
		np = db.fetchInstance(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "home"
			}
		});

	}
	if (!np) return [];

	var adminMod = getAdminModule(_, db);
	var moduleIds = np.modules(_).toUuidArray(_);
	var modArr = np.modules(_).toArray(_);


	if (hasChanged(lastModified)) {
		return modulesCacheFunnel(_, function(_) {
			var modCacheTenant = _getModuleCacheByTenant();
			if (hasChanged(lastModified)) {
				_tracer && _tracer("Fetch modules lastModified: " + lastModified + " full load");
				// reload np and cache it
				var menus = _loadAllMenus(_, db, lastModified);
				// important ! fullLoad must be called before setting breadcrumb
				np.fullLoad(_, menus);
				// dedicated map for breadcrumb
				for (var i in menus) {
					var key = menus[i].applicationName(_) + "." + menus[i].contractName(_) + "." + (menus[i].fusionFunction(_) ? menus[i].fusionFunction(_) : menus[i].representation(_));
					if (menus[i]._parent) getBreadCrumbByTenant()[key] = menus[i].$uuid;
				}
				// Always show admin module for SAFE factory users
				if (isFactorySageUser(_) && adminMod && moduleIds.indexOf(adminMod.$uuid) === -1) {
					//console.error("Force display of ADMIN module");
					modArr.splice(0, 0, adminMod);
				}
				var mods = _modulesToCache(modArr, lastModified);
				//_buildMenuItemMap(_);
				return mods;
			} else {
				return modCacheTenant.modulesArr;
			}
		});
	}
	// cache is valid, take modules from cache
	_tracer && _tracer("Fetch modules lastModified: " + lastModified + " cache hit");

	// Always show admin module
	if (isFactorySageUser(_) && adminMod && moduleIds.indexOf(adminMod.$uuid) === -1) {
		//console.error("Force display of ADMIN module");
		moduleIds.splice(0, 0, adminMod.$uuid);
	}
	//
	return moduleIds.map_(_, function(_, mid) {
		var modCacheTenant = _getModuleCacheByTenant();
		if (modCacheTenant && modCacheTenant.modules && modCacheTenant.modules[mid]) {
			return modCacheTenant.modules[mid];
		} else {
			// new module, load it
			var mm = adminMod && mid === adminMod.$uuid ? adminMod : np.modules(_).get(_, mid);
			if (modCacheTenant && modCacheTenant.menus) mm.fullLoad(_, db, modCacheTenant.menus);
			modCacheTenant.modules[mid] = mm;
			return mm;
		}
	});
};

exports.getMenuItemMap = function() {
	return getBreadCrumbByTenant();
};

exports.getLastChangeTime = function() {
	return _getModuleCacheByTenant().lastModified;
};

exports.getBreadcrumb = function(_, lastModified, id, facet) {
	// check if we need to generate the map of item because something change in syracuse menuItem, module etc...
	var modCacheTenant = _getModuleCacheByTenant();
	if (modCacheTenant.lastModified == null) exports._fetchNavPageModules(_, null, lastModified);
	var current = modCacheTenant.menus[getBreadCrumbByTenant()[id]];
	var breadcrumb = [];
	if (current) {
		current = current && current._parent;
		while (current) {
			var elem = {
				//$url: current.instance.getItemUrl && current.instance.getItemUrl(_, endpoint, "{$baseUrl}"),
				title: current.title(_),
				$uuid: current.$uuid
			};
			breadcrumb.push(elem);
			current = current && current._parent;
		}
	}

	breadcrumb.length > 0 && breadcrumb.push({
		title: locale.format(module, '$all')
	});
	var res = breadcrumb.reverse();
	return res;
};

//
// Nav page cleanup helpers
//

function isFactory(_, db, collName, id) {
	var coll = db.db.collection(collName, _);
	var docs = coll.find({
		"_id": id
	}).toArray(_);
	if (docs.length > 0) {
		var doc = docs[0];
		return (doc._factory && doc._factoryOwner === "SAGE") || doc.isFactory;
	}
	throw new Error(collName + " [" + id + "] not found");
}

var modulesOrder = [
	null,
	"collaboration",
	"support",
	"erp",
	"hrm",
	"geode"
];

exports.reorderModules = function(_, db, navPageName, options) {
	var tracer = options && options.tracer;
	var collNav = db.db.collection("NavigationPage", _);
	var home = collNav.find({
		"pageName": navPageName
	}).toArray(_)[0];

	var collMm = db.db.collection("MenuModule", _);
	var collApp = db.db.collection("Application", _);
	var _mods = {};

	function getMod(_, modUuid) {
		var foundMod = _mods[modUuid] = _mods[modUuid] || collMm.find({
			"_id": modUuid
		}).toArray(_)[0];
		return foundMod;
	}
	var _apps = {};

	function getApp(_, appUuid) {
		var foundApp = _apps[appUuid] = _apps[appUuid] || collApp.find({
			"_id": appUuid
		}).toArray(_)[0];
		return foundApp;
	}
	if (home) {
		tracer && tracer(" <-- Beging reorder navigation page (" + navPageName + ") modules following application order [" + modulesOrder.join(' ; ') + "]");
		// can not use sort because sort is based on unicode
		var reordered = [];
		var reorderedMap = {};
		home.modules && home.modules.forEach_(_, function(_, m, idx) {
			var _m = getMod(_, m._uuid);
			if (_m) {
				tracer && tracer("Module (" + _m.code + " : factory:" + (_m._factory) + " : owner: " + _m._factoryOwner);

				var _c = getApp(_, _m.application._uuid).contract;
				tracer && tracer("Contract: " + _c);
				var _multiplier;
				if (_m._factory && _m._factoryOwner !== "SAGE") {
					_multiplier = 200;
				} else if ((_m._factory && _m._factoryOwner === "SAGE") || (_m._factory == null && _m.isFactory)) {
					_multiplier = 100;
				} else {
					_multiplier = 300;
				}
				var newIdx = idx + (modulesOrder.indexOf(_c) * _multiplier);
				tracer && tracer("Module (" + _m.code + " : " + (_m.title && _m.title['default']) + ") had old index [" + idx + "] and have been positionned at [" + newIdx + "]");
				reorderedMap[newIdx] = m;
			}
		});
		var keys = Object.keys(reorderedMap).sort(function(k1, k2) {
			return parseInt(k1, 10) - parseInt(k2, 10);
		});
		keys.forEach(function(k) {
			reordered.push(reorderedMap[k]);
		});

		if (reordered.length > 0) {
			// Update navigation page home keeping only non factory modules
			collNav.update({
				_id: home._id
			}, {
				$set: {
					modules: reordered
				}
			}, {
				safe: true,
				multi: true
			}, _);
			tracer && tracer(" --> End reorder navigation page");
		}
	}
};

function checkItem(_, db, it) {
	if (it._type === "menuItem") {
		_tracer && _tracer("Check menuItem " + it._uuid);
		try {
			if (!isFactory(_, db, "MenuItem", it._uuid)) {
				return it;
			}
		} catch (e) {
			console.error(e.message);
		}
	} else if (it._type === "menuSubblock") {
		_tracer && _tracer("Check menuSubblock " + it.code + " (" + (it.title && it.title['default']) + ")");
		if (it.items && it.items.length > 0) {
			var keepIt = [];
			it.items.forEach_(_, function(_, _it) {
				var _obj = checkItem(_, db, _it);
				if (_obj) keepIt.push(_obj);
			});
			if (keepIt.length > 0) {
				// reset indexes
				keepIt.forEach(function(_it, idx) {
					_it._index = idx;
				});
				it.items = keepIt;
				return it;
			}
		}
	}
}

exports.cleanNavPage = function(_, db, application, contract, options) {
	var tracer = options.tracer;
	var appUuid;
	var coll = db.db.collection("Application", _);
	var apps = coll.find({
		"$and": [{
			"application": application
		}, {
			"contract": contract
		}]
	}).toArray(_);
	if (!apps[0]) throw new Error("Syracuse collaboration application not found");
	appUuid = apps[0]._id;

	// Handle MenuBlock collection
	var collMb = db.db.collection("MenuBlock", _);
	var filter = {
		"$and": [{
			"$or": [{
				"_factory": true,
				"_factoryOwner": "SAGE"
			}, {
				"isFactory": true
			}]
		}, {
			"application._uuid": appUuid
		}]
	};

	var modsUuids = [],
		subModsUuids = [];

	var menuBlocks = collMb.find(filter).toArray(_);
	menuBlocks.forEach_(_, function(_, mb) {
		var keepItems = [];
		_tracer && _tracer("====\nCheck menu block: " + mb.code);
		if (mb.items) {
			var idx = 0;
			mb.items.forEach_(_, function(_, it) {
				var obj = checkItem(_, db, it);
				if (obj) {
					// reset indexes
					obj._index = idx;
					// keep item
					keepItems.push(obj);
					idx++;
				}
			});
			_tracer && _tracer("Keep items: " + JSON.stringify(keepItems, null, 2));
			collMb.update({
				_id: mb._id
			}, {
				$set: {
					items: keepItems
				}
			}, {
				safe: true,
				multi: true
			}, _);
		}
		subModsUuids.push(mb._id);
	});


	// Handle MenuModule collection
	var collMm = db.db.collection("MenuModule", _);
	filter = {
		"$and": [{
			"$or": [{
				"_factory": true,
				"_factoryOwner": "SAGE"
			}, {
				"isFactory": true
			}]
		}, {
			"application._uuid": appUuid
		}]
	};

	var mods = collMm.find(filter).toArray(_);
	mods.forEach_(_, function(_, mod) {
		var keep = [],
			nbUnlink = 0;
		mod.submodules && mod.submodules.forEach(function(sm) {
			if (subModsUuids.indexOf(sm._uuid) === -1) {
				// Keep non factory submodules
				keep.push(sm);
			} else {
				nbUnlink++;
			}
		});
		// Update each module keeping only non factory submodules
		collMm.update({
			_id: mod._id
		}, {
			$set: {
				submodules: keep
			}
		}, {
			safe: true,
			multi: true
		}, _);
		tracer && tracer("\t" + nbUnlink + " submodules unlinked from module '" + mod.code + "'");
		// Store factory modules uuid
		modsUuids.push(mod._id);
	});

	var navPageName = "home";
	// remove modules references in navigation page
	var collNav = db.db.collection("NavigationPage", _);
	var home = collNav.find({
		"pageName": navPageName
	}).toArray(_)[0];



	if (home) {
		var keep = [],
			nbUnlink = 0;
		home.modules && home.modules.forEach(function(m) {
			if (modsUuids.indexOf(m._uuid) === -1) {
				keep.push(m);
			} else {
				nbUnlink++;
			}
		});
		// Update navigation page home keeping only non factory modules
		collNav.update({
			_id: home._id
		}, {
			$set: {
				modules: keep
			}
		}, {
			safe: true,
			multi: true
		}, _);
		tracer && tracer("\t" + nbUnlink + " modules unlinked from navigation page 'home'");
	}
	// re import everything !!!
	var importHandler = require("syracuse-import/lib/jsonImport");
	var sName = application + "-" + contract + "-init.json";
	tracer && tracer(" <-- Beging import: " + sName);
	importHandler.jsonImport(_, db, sName, {
		importMode: "update",
		$diagnoses: []
	});
	tracer && tracer(" --> End import: " + sName);
};