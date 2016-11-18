"use strict";

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; import of patch data 7P2_SAM96824_#3528");
	var config = require('config');
	if (config.system && config.system.protectSettings) {
		exports.tracer && exports.tracer("Settings protected on this server, will not execute default settings import");
		return;
	}
	var importHandler = require("syracuse-import/lib/jsonImport");
	var diag = [];
	exports.tracer && exports.tracer("Importing initialization file: patch/7P2_SAM96824_#3528.json");
	importHandler.jsonImport(_, db, "patch/7P2_SAM96824_#3528.json", {
		importMode: "update", // leave update because of include before / after, we can modify even in intialization
		$diagnoses: diag
	});
	exports.tracer && exports.tracer("Patch import diagnoses: " + sys.inspect(diag, null, 4));
	//
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	// don't import this elements anymore, taken care by automatic init
	/*	function _applyScript(_, script) {
		var diag = [];
		exports.tracer && exports.tracer("Importing initialization file: " + script);
		importHandler.jsonImport(_, db, script, {
			importMode: "update", // leave update because of include before / after, we can modify even in intialization
			$diagnoses: diag
		});
	};
	exports.tracer && exports.tracer("Executing update script to version: 2; import standard authorings, menus, dashboard");
	exports.tracer && exports.tracer("!!! EXECUTION OF THIS SCRIPT MAY TAKE UP TO 5 MINUTES, DON'T STOP YOUR SERVER !!!");
	var config = require('config');
	if (config.system && config.system.protectSettings) {
		exports.tracer && exports.tracer("Settings protected on this server, will not execute default settings import");
		return;
	}
	var importHandler = require("syracuse-import/lib/jsonImport");
	//
	[ "syracuse-admin-templates.json", "x3-init.json", "x3-dashboards-user.json", "x3-dashboards-home.json", "x3-pages.json"].forEach_(_, _applyScript);
	//
	exports.tracer && exports.tracer("Update script to version: 2 executed");*/
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
	fileId: "2e7e0f894cdd", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 2 branch update script" // !important, some description, optional and can change
};