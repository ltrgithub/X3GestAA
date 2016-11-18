"use strict";

var scr_helpers = require("./helpers");

var dbg_tracer; // = console.log;

exports.execute = function(_, db, options) {
	function _markItem(item) {
		dbg_tracer && dbg_tracer("Marking item", item._uuid, item.code);
		//
		if (item._variantType === "menuItem" && miMap[item._uuid]) {
			if (miMap[item._uuid]._factory && miMap[item._uuid]._factoryOwner === options.factoryOwner) {
				dbg_tracer && dbg_tracer("Marking menu", miMap[item._uuid].code);
				item._mark = mark;
			}
		} else if (item._factory && item._factoryOwner === options.factoryOwner) {
			if (item.items) item.items.forEach(_markItem);
			item._mark = mark;
		}
	}

	function _markBlock(mb) {
		if (mb.items && mb.items.length) {
			// mark all factory sub-blocks and items with "pre_import":true
			mb.items.forEach(_markItem);
			modedBlocks[mb._id] = mb;
		}
	}

	function _markModule(_, mod) {
		if (mod.submodules && mod.submodules.length) {
			// mark all factory submodules with "pre_import":true
			mod.submodules.forEach(function(sm) {
				var item = mbMap[sm._uuid];
				dbg_tracer && dbg_tracer("Marking submodule", sm._uuid, item && item.code);
				if (item && item._factory && item._factoryOwner === options.factoryOwner) {
					sm._mark = mark;
					_markBlock(item);
				}
			});
			modedModules[mod._id] = mod;
		}
	}
	// mark list elements in filter as to be imported
	var _tracer = options.tracer && options.tracer.info ? options.tracer.info : options.tracer;
	var err_tracer = options.tracer && options.tracer.error ? options.tracer.error : options.tracer;
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
			home.modules.forEach_(_, function(_, mm) {
				var item = mmMap[mm._uuid];
				if (item && item._factory && item._factoryOwner === options.factoryOwner) {
					dbg_tracer && dbg_tracer("Marking module", item.code);
					//
					_markModule(_, item);
					//
					mm._mark = mark;
				}
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