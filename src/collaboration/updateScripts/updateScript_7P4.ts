"use strict";

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; remove forcedExecution parameter");
	//
	var miColl = db.db.collection("MenuItem", _);
	var menus = miColl.find({
		isFactory: true,
		"parameters.name": "forcedExecution"
	}).toArray(_);
	menus.forEach_(_, function(_, menu) {
		miColl.update({
			_id: menu._id
		}, {
			$set: {
				parameters: menu.parameters.filter(function(pp) {
					return pp.name !== "forcedExecution";
				})
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	//
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; remove old dashboard menus from sitemap");
	//
	var miColl = db.db.collection("MenuItem", _);
	var blockColl = db.db.collection("MenuBlock", _);
	var menus = miColl.find({
		code: {
			$in: ["S_DASHBOARDS", "S_VIGNETTES"]
		}
	}).toArray(_);
	menus.forEach_(_, function(_, menu) {
		var blocks = blockColl.find({
			"items._uuid": menu._id
		}).toArray(_);
		exports.tracer && exports.tracer("Removing entry: " + menu.code + "; found " + blocks.length + " submodules");
		blocks.forEach_(_, function(_, bk) {
			blockColl.update({
				_id: bk._id
			}, {
				$set: {
					items: bk.items.filter(function(it) {
						return it._uuid !== menu._id;
					}),
					_updDate: new Date()
				}
			}, {
				safe: true,
				multi: true
			}, _);
		});
	});
	//
	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	function _applyScript(_, script) {
		var diag = [];
		exports.tracer && exports.tracer("Importing initialization file: " + script);
		var importHandler = require("syracuse-import/lib/jsonImport");
		importHandler.jsonImport(_, db, script, {
			importMode: "update", // leave update because of include before / after, we can modify even in intialization
			$diagnoses: diag
		});
	};
	exports.tracer && exports.tracer("Executing update script to version: 3; remove old dashboard menus from sitemap and data import");
	//
	var miColl = db.db.collection("MenuItem", _);
	var blockColl = db.db.collection("MenuBlock", _);
	var menus = miColl.find({
		code: {
			$in: ["SUP_AMIGPORT"]
		}
	}).toArray(_);
	menus.forEach_(_, function(_, menu) {
		var blocks = blockColl.find({
			"items._uuid": menu._id
		}).toArray(_);
		exports.tracer && exports.tracer("Removing entry: " + menu.code + "; found " + blocks.length + " submodules");
		blocks.forEach_(_, function(_, bk) {
			blockColl.update({
				_id: bk._id
			}, {
				$set: {
					items: bk.items.filter(function(it) {
						return it._uuid !== menu._id;
					}),
					_updDate: new Date()
				}
			}, {
				safe: true,
				multi: true
			}, _);
		});
	});
	//
	// no more import, automatic import will do the job.
	/* exports.tracer && exports.tracer("!!! EXECUTION OF THIS SCRIPT MAY TAKE UP TO 5 MINUTES, DON'T STOP YOUR SERVER !!!");
	var config = require('config');
	if (config.system && config.system.protectSettings) {
		exports.tracer && exports.tracer("Settings protected on this server, will not execute default settings import");
		return;
	}
	var importHandler = require("syracuse-import/lib/jsonImport");
	//
	["syracuse-admin-templates.json", "x3-init.json", "x3-global-modules.json", "x3-erp-menus.json",
		"x3-global-sitemap.json", "x3-erp-homepages.json", "x3-pages.json"
	].forEach_(_, _applyScript);*/
	//
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; add badge ERPDEV to ADMIN role");
	//
	var roleColl = db.db.collection("Role", _);
	var badgeEnt = db.model.getEntity(_, "badge");
	var badge = db.fetchInstance(_, badgeEnt, {
		jsonWhere: {
			"code": "ERPDEV"
		}
	});
	if (!badge) {
		console.log("No badge");
		badge = badgeEnt.factory.createInstance(_, null, db);
		badge.code(_, "ERPDEV");
		badge.keyFunction(_, 'APATCH,APATCHA,BUDAPP,CPTQUIT,FIYEND,FUNAUTINVC,FUNAUTINVD,FUNAUTINVO,FUNAUTINVS,FUNAUTINVT,FUNCFMINV,FUNMAUTR,FUNPIH,GESACLA,GESACTX,GESAFC,GESAMK,GESAOB,GESARP,GESASU,GESASW,GESATB,GESATY,GESAWI,GESBAP,GESBIC,GESCON,GESENV,GESEXS,GESFAS,GESGAS,GESLOF,GESMAC,GESMFG,GESMTK,GESOPP,GESPAY,GESPIH,GESPOH,GESPSH,GESPTH,GESROU,GESSCO,GESSDH,GESSIH,GESSMO,GESSMR,GESSMX,GESSOH,GESSQH,GESSRE,GESSTQ,GESTSK,LETTRAGE,LETTRAUTO,PAYPROPAL,RELBANK,VXAPT');
		badge.title(_, {
			'de-de': 'Entwickler',
			default: 'Developer',
			'en-gb': 'Developer',
			'en-us': 'Developer',
			'es-es': 'Desarrollador',
			'fr-fr': 'Développeur',
			'it-it': 'Sviluppatore',
			'pl-pl': 'Deweloper',
			'pt-pt': 'Programador',
			'ru-ru': 'Developer',
			'zh-cn': '开发人员'
		});
		badge.noCheck(_, false);
		badge.save(_);
		var diags = [];
		badge.getAllDiagnoses(_, diags);
	}
	var role = roleColl.find({
		code: "ADMIN"
	}).toArray(_);
	role.forEach_(_, function(_, menu) {
		var role0 = db.fetchInstance(_, db.model.getEntity(_, "role"), {
			jsonWhere: {
				'code': 'ADMIN'
			}
		});
		if (role0) {
			console.log("Role");
			var badges = role0.badges(_);
			if (badges.isEmpty(_)) {
				console.log("Role add badge");
				badges.set(_, badge);
			}
			role0.save(_);
		}
	});
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; remove X3 administration module from navigation page");
	var x3admMod = (db.db.collection("MenuModule", _).find({
		code: "S_MOD_SUPERVADMIN"
	}).toArray(_) || [])[0];
	if (x3admMod) {
		var npColl = db.db.collection("NavigationPage", _);
		var np = (npColl.find({
			pageName: "home"
		}).toArray(_) || [])[0];
		if (np && np.modules && Array.isArray(np.modules)) {
			var mods = np.modules.filter(function(it) {
				return it._uuid !== x3admMod._id;
			});
			npColl.update({
				_id: np._id
			}, {
				$set: {
					modules: mods,
					_updDate: new Date()
				}
			}, {
				safe: true,
				multi: true
			}, _);
		}
	}
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {
	function _updateColl(_, coll) {
		coll.find({
			code: {
				"$regex": "^X3_ERP.*"
			}
		}).toArray(_).forEach_(_, function(_, mi) {
			coll.update({
				_id: mi._id
			}, {
				$set: {
					code: "STD_" + mi.code,
					_updDate: new Date()
				}
			}, {
				safe: true,
				multi: true
			}, _);
		});
	}
	exports.tracer && exports.tracer("Executing update script to version: 6; rename menu items and modules");
	_updateColl(_, db.db.collection("MenuItem", _));
	_updateColl(_, db.db.collection("MenuModule", _));
	_updateColl(_, db.db.collection("MenuSubblock", _));
	exports.tracer && exports.tracer("Update script to version: 6 executed");
};

_scripts[7] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 7; set helpBaseUrl as non localizable");
	// update helpBaseUrl of type Object to String
	var eps = db.db.collection("EndPoint", _).find({
		helpBaseUrl: {
			$type: 3
		}
	}).toArray(_);
	var op, url, best;
	eps.forEach_(_, function(_, ep) {
		exports.tracer && exports.tracer("Updating endpoint: " + (ep.description["en-US"] || ep.description["default"]));
		exports.tracer && exports.tracer("Updating endpoint - helpBaseUrl: " + JSON.stringify(ep.helpBaseUrl));
		url = ep.helpBaseUrl["en-us"] || ep.helpBaseUrl["en-US"] || ep.helpBaseUrl["default"];
		op = url ? {
			$set: {
				helpBaseUrl: url
			}
		} : {
			$unset: {
				helpBaseUrl: ""
			}
		};
		exports.tracer && exports.tracer("Updating endpoint - helpBaseUrl.op: " + JSON.stringify(op));
		db.db.collection("EndPoint", _).update({
			_id: ep._id
		}, op, {
			safe: true,
			multi: true
		}, _);
	});

	exports.tracer && exports.tracer("Update script to version: 7 executed");
};

exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.log;
	//
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "2r731d8925fd", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 4 branch update script" // !important, some description, optional and can change
};