"use strict";

exports.tracer; // = console.log;
var config = require('config');
var adminHelpers = require('../../../src/collaboration/helpers');
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Set user autentication for ldap instances");
	//
	var coll = db.db.collection("Ldap", _);
	var elts = coll.find({}).toArray(_);

	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			exports.tracer && exports.tracer("Set user autentication ldap on ldap server " + e.name);

			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					userAuthentication: "ldap"
				}
			}, {
				safe: true,
				multi: true
			}, _);

		});
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
	fileId: "99861bfeb898", // this id MUST never change and MUST be unique over all update scripts
	description: "Ambassdor P5 update script" // !important, some description, optional and can change
};