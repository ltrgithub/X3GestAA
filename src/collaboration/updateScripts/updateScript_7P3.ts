"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	function _updateCollection(_, collName) {
		var coll = db.db.collection(collName, _);
		coll.update({
			"isFactory": null
		}, {
			$set: {
				"isFactory": false
			}
		}, {
			safe: true,
			multi: true
		}, _);
	}
	exports.tracer && exports.tracer("Executing update script to version: 1; initialize isFactory property");
	//
	_updateCollection(_, "MenuItem");
	_updateCollection(_, "MenuBlock");
	_updateCollection(_, "MenuModule");
	_updateCollection(_, "NavigationPage");
	_updateCollection(_, "LandingPage");
	//
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	//
	var base64 = require('../../../../src/license/index').load('license');
	var coll = db.db.collection("Ldap", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.adminPassword;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				adminPassword: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	//
	var base64 = require('../../../../src/license/index').load('license');
	var coll = db.db.collection("BoServer", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.adminPassword;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				adminPassword: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	//
	var base64 = require('../../../../src/license/index').load('license');
	var coll = db.db.collection("BoProfile", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.password;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				password: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	var coll = db.db.collection("RestWebService", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.password;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				password: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	var coll = db.db.collection("ProxyConfiguration", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.password;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				password: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

_scripts[5] = function(_, db) {
	//
	var base64 = require('../../../../src/license/index').load('license');
	var coll = db.db.collection("SoapStub", _);
	coll.find({}).toArray(_).forEach_(_, function(_, entry) {
		var password = entry.authPassword;
		password = base64.license(0, password, new Boolean(true));
		coll.update({
			_id: entry._id
		}, {
			$set: {
				authPassword: password
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 6; pageLayout code init");
	//
	var coll = db.db.collection("PageLayout", _);
	coll.find({
		"code": null
	}).toArray(_).forEach_(_, function(_, pl) {
		coll.update({
			"_id": pl._id
		}, {
			$set: {
				"code": pl._id
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	//
	exports.tracer && exports.tracer("Update script to version: 6 executed");
};

_scripts[7] = function(_, db) {
	// replaced by script 8
	exports.tracer && exports.tracer("Executing update script to version: 7;");
	exports.tracer && exports.tracer("Update script to version: 7 executed");
};

_scripts[8] = function(_, db) {
	// don't import this elements anymore, taken care by automatic init
	/*	function _applyScript(_, script) {
		var diag = [];
		exports.tracer && exports.tracer("Importing initialization file: " + script);
		importHandler.jsonImport(_, db, script, {
			importMode: "update", // leave update because of include before / after, we can modify even in intialization
			$diagnoses: diag
		});
	};
	exports.tracer && exports.tracer("Executing update script to version: 8; import standard authorings, menus, dashboard");
	exports.tracer && exports.tracer("!!! EXECUTION OF THIS SCRIPT MAY TAKE UP TO 5 MINUTES, DON'T STOP YOUR SERVER !!!");
	var config = require('config');
	if (config.system && config.system.protectSettings) {
		exports.tracer && exports.tracer("Settings protected on this server, will not execute default settings import");
		return;
	}
	var importHandler = require("syracuse-import/lib/jsonImport");
	//
	["syracuse-admin-templates.json", "x3-init.json", "x3-global-modules.json", "x3-erp-menus.json",
		"x3-global-sitemap.json", "x3-erp-homepages.json", "x3-pages.json"
	].forEach_(_, _applyScript);
	//
	exports.tracer && exports.tracer("Update script to version: 8 executed");*/
};

_scripts[9] = function(_, db) {
	// don't import this elements anymore, taken care by automatic init
	/*	function _applyScript(_, script) {
		var diag = [];
		exports.tracer && exports.tracer("Importing initialization file: " + script);
		importHandler.jsonImport(_, db, script, {
			importMode: "update", // leave update because of include before / after, we can modify even in intialization
			$diagnoses: diag
		});
	};
	exports.tracer && exports.tracer("Executing update script to version: 9; import standard authorings, menus, dashboard");
	exports.tracer && exports.tracer("!!! EXECUTION OF THIS SCRIPT MAY TAKE UP TO 5 MINUTES, DON'T STOP YOUR SERVER !!!");
	var config = require('config');
	if (config.system && config.system.protectSettings) {
		exports.tracer && exports.tracer("Settings protected on this server, will not execute default settings import");
		return;
	}
	var importHandler = require("syracuse-import/lib/jsonImport");
	//
	["x3-mobile-dashboards.json"].forEach_(_, _applyScript);
	//
	exports.tracer && exports.tracer("Update script to version: 9 executed");*/
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
	fileId: "5e730f8922dd", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 3 branch update script" // !important, some description, optional and can change
};