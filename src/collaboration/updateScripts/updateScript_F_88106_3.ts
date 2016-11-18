"use strict";

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; create expire index on loginToken");
	//
	db.ensureExpireIndex(_, db.getEntity(_, "loginToken"));
	//
	exports.tracer && exports.tracer("Update script to version: 1 executed");
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
	fileId: "2e7e0de94cdd", // this id MUST never change and MUST be unique over all update scripts
	description: "feature branch F88106-3 update script" // !important, some description, optional and can change
};