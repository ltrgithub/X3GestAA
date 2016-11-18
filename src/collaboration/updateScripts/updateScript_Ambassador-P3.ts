"use strict";

exports.tracer; // = console.log;
var helpers = require('@sage/syracuse-core').helpers;
var config = require('config');

var helperAdmin = require("../../collaboration/helpers");
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; add automatically on automateTask the user, role");


	var elts = db.fetchInstances(_, db.getEntity(_, "automate"));

	var codeUSer = "admin";
	var codeRole = "ADMIN";

	if (config.hosting.multiTenant) {
		codeUSer = 'ADMCA';
		codeRole = 'ADMCA';

	}
	var role, user;
	user = db.fetchInstance(_, db.getEntity(_, "user"), {
		jsonWhere: {
			login: codeUSer
		}
	});
	role = db.fetchInstance(_, db.getEntity(_, "role"), {
		jsonWhere: {
			code: codeRole
		}
	});

	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			e.automateTasks(_) && e.automateTasks(_).toArray(_).filter_(_, function(_, e) { // take the automatetask that doesn't contian user or role
				return !e.role(_) || !e.user(_);
			}).forEach_(_, function(_, task) {
				task.user(_, user);
				task.role(_, role);
			});
			e.save(_);
			exports.tracer && exports.tracer("Set default user " + codeUSer + ", role " + codeRole + " on automateTask ");
		});
		// UPDATE

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
	fileId: "baf23c6d32e5", // this id MUST never change and MUST be unique over all update scripts
	description: "Ambassdor P3 update script" // !important, some description, optional and can change
};