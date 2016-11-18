"use strict";

exports.tracer; // = console.log;
var config = require("syracuse-main/lib/nodeconfig").config;
var adminHelpers = require('../../../src/collaboration/helpers');
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; ensure expiration index on mongodb collections");

	var admEp = adminHelpers.AdminHelper.getCollaborationEndpoint(_);
	var db = admEp.getOrm(_);
	var entities = db.model.getEntities();

	if (entities) {
		for (var name in entities) db.ensureExpireIndex(_, entities[name]);
	}

	exports.tracer && exports.tracer("Update script to version: 1 executed");
};



exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.error;
	//
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "de6cfc5df5e5", // this id MUST never change and MUST be unique over all update scripts
	description: "V7 P14 update script" // !important, some description, optional and can change
};