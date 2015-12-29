"use strict";

var scr_helpers = require("./helpers");
var dbg_tracer; // = console.log;

exports.execute = function(_, db, options) {
	function _unmark(item) {
		if (item._mark) {
			delete item._mark.pre_import;
			if (Object.keys(item._mark).length === 0) delete item._mark;
		}
		return true; // chaining
	}

	function _checkMenuItem(item) {
		var mi = miMap[item._uuid];
		if (mi && mi._factory && mi._factoryOwner === options.factoryOwner) {
			dbg_tracer && dbg_tracer("Unmarking menu", mi.code, item._mark);
			return !(item._mark && item._mark.pre_import);
		} else return true;
	}

	function _unmarkItem(item) {
		dbg_tracer && dbg_tracer("Unmarking item", item._uuid, item.code);
		//
		if (item._variantType === "menuBlock") {
			if (item._factory && item._factoryOwner === options.factoryOwner && item.items && item.items.length) {
				item.items = item.items.filter(function(it) {
					if (it.items) return _unmark(it) && _unmarkItem(it);
					else return _checkMenuItem(it);
				});
				// 
				return !(!item.items.length && item._mark && item._mark.pre_import) && _unmark(item);
			}
		} else {
			return _checkMenuItem(item);
		}
		return _unmark(item);
	}

	function _unmarkBlock(mb) {
		if (mb.items && mb.items.length) {
			mb.items = mb.items.filter(_unmarkItem);
			modedBlocks[mb._id] = mb;
		}
	}

	function _unmarkModule(mod) {
		if (mod.submodules && mod.submodules.length) {
			// mark all factory submodules with "pre_import":true
			mod.submodules = mod.submodules.filter(function(sm) {
				var item = mbMap[sm._uuid];
				dbg_tracer && dbg_tracer("Unmarking submodule", sm._uuid, item && item.code);
				if (item && item._factory && item._factoryOwner === options.factoryOwner && item.items && item.items.length) {
					_unmarkBlock(item);
					return !(!item.items.length && sm._mark && sm._mark.pre_import) && _unmark(sm);
				}
				return _unmark(sm);
			});
			modedModules[mod._id] = mod;
		}
	}
	// mark list elements in filter as to be imported
	var _tracer = options.tracer && options.tracer.info ? options.tracer.info : options.tracer;
	var err_tracer = options.tracer && options.tracer.error ? options.tracer.error : options.tracer;
	//
	dbg_tracer && dbg_tracer("Executing post-import-sitemap");
	//
	var mark = {
		"pre_import": true
	};
	var factoryFilter = "($factory eq true) and ($factoryOwner eq \"" + (options.factoryOwner || "SAGE") + "\")";
	//
	// Menu Items map
	var miMap = scr_helpers.loadMenusMap(_, db, factoryFilter);
	// MenuBlock map
	var collMb = db.db.collection("MenuBlock", _);
	var modedBlocks = {};
	var mbMap = scr_helpers.loadBlocksMap(_, db, factoryFilter, options.submodulesFilter);
	// Menu modules map
	var collMm = db.db.collection("MenuModule", _);
	var modedModules = {};
	var mmMap = scr_helpers.loadModulesMap(_, db, factoryFilter, options.modulesFilter);
	//
	var collNav = db.db.collection("NavigationPage", _);
	var homes = scr_helpers.loadNavPages(_, db, options.homepagesFilter);
	homes.forEach_(_, function(_, home) {
		if (home.modules && home.modules.length) {
			// mark all factory submodules with "pre_import":true
			home.modules = home.modules.filter(function(mm) {
				var item = mmMap[mm._uuid];
				if (item && item._factory && item._factoryOwner === options.factoryOwner && item.submodules && item.submodules.length) {
					dbg_tracer && dbg_tracer("Unmarking module", item.code);
					//
					_unmarkModule(item);
					return !(!item.submodules.length && mm._mark && mm._mark.pre_import) && _unmark(mm);
				}
				return _unmark(mm);
			});
			// Update navigation page home keeping only non factory modules
			collNav.update({
				_id: home._id
			}, {
				$set: {
					modules: home.modules
				}
			}, {
				safe: true,
				multi: true
			}, _);
		}
	});
	//
	Object.keys(modedModules).forEach_(_, function(_, mmKey) {
		var mod = modedModules[mmKey];
		dbg_tracer && dbg_tracer("Saving submodule", mod.code);
		collMm.update({
			_id: mod._id
		}, {
			$set: {
				submodules: mod.submodules
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	//
	Object.keys(modedBlocks).forEach_(_, function(_, mmKey) {
		var mb = modedBlocks[mmKey];
		dbg_tracer && dbg_tracer("Saving block", mb.code);
		collMb.update({
			_id: mb._id
		}, {
			$set: {
				items: mb.items
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};