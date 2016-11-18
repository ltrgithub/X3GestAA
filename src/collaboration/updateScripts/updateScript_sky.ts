"use strict";

var adminHelper = require("../../collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; force security profile on roles");
	// 
	var cnt = 0;
	var spAdmin = db.db.collection("SecurityProfile", _).find({
		code: "ADMIN"
	}).toArray(_)[0];
	if (spAdmin && spAdmin._id) {
		var rolesColl = db.db.collection("Role", _);
		cnt = rolesColl.update({
			"securityProfile._uuid": null
		}, {
			$set: {
				"securityProfile._uuid": spAdmin._id
			}
		}, {
			safe: true,
			multi: true
		}, _);
	}
	//
	exports.tracer && exports.tracer("Update script to version: 1 executed; " + cnt + " roles updated");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; initialize security level on security profile");
	//
	var cnt = db.db.collection("SecurityProfile").update({
		securityLevel: null
	}, {
		$set: {
			securityLevel: 0
		}
	}, {
		safe: true,
		multi: true
	}, _);
	//
	exports.tracer && exports.tracer("Update script to version: 2 executed; " + cnt + " security profiles updated");
};


_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; Customer admin import");
	require("syracuse-import/lib/jsonImport").jsonImport(_, db, "syracuse-sky-init.json");
	// ensure admin SecurityLevel is 0
	db.db.collection("SecurityProfile").update({
		code: "ADMIN"
	}, {
		$set: {
			securityLevel: 0
		}
	}, {
		safe: true
	}, _);
	// copy landing pages from admin
	var rolesColl = db.db.collection("Role", _);
	var adminRole = rolesColl.find({
		code: "ADMIN"
	}).toArray(_)[0];
	adminRole && rolesColl.update({
		code: "CADMIN"
	}, {
		$set: {
			"landingPages": adminRole.landingPages
		}
	}, {
		safe: true,
		multi: true
	}, _);
	//
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; Rename CADMIN to ADMCA");
	db.db.collection("SecurityProfile").update({
		code: "CADMIN"
	}, {
		$set: {
			code: "ADMCA",
			_updDate: new Date()
		}
	}, {
		safe: true
	}, _);

	db.db.collection("Role").update({
		code: "CADMIN"
	}, {
		$set: {
			code: "ADMCA",
			_updDate: new Date()
		}
	}, {
		safe: true
	}, _);

	db.db.collection("User").update({
		login: "cadmin"
	}, {
		$set: {
			login: "admca",
			password: "059174f3815009ac754c27d21fa8246a",
			_updDate: new Date()
		}
	}, {
		safe: true
	}, _);
	//
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

// This script is needed because of a bad commit that let both ADMCA and CADMIN exist.
_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; Ensure CADMIN doesn't exists anymore");
	var oldSecProfile = db.db.collection("SecurityProfile").find({
		code: "CADMIN"
	}).toArray(_)[0];

	var newSecProfile = db.db.collection("SecurityProfile").find({
		code: "ADMCA"
	}).toArray(_)[0];

	if (oldSecProfile && newSecProfile) {
		db.db.collection("SecurityProfile", _).remove({
			code: "ADMCA"
		}, {
			safe: true
		}, _);
		exports.tracer && exports.tracer("CADMIN was still there, so script 4 will be reapplied");
		_scripts[4](_, db);
	} else if (oldSecProfile && !newSecProfile) {
		exports.tracer && exports.tracer("CADMIN was still there, so script 4 will be reapplied");
		_scripts[4](_, db);
	} else {
		exports.tracer && exports.tracer("Nothing to do...");
	}
	//
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {

	exports.tracer && exports.tracer("Executing update script to version: 6; Fix security profile name and right");
	//
	// getting the administration ORM
	// the metamodel is associated to the orm

	var coll = db.db.collection("SecurityProfile", _);
	var elts = coll.find({}).toArray(_);
	if (elts && elts.length > 0) {
		var updated = 0;
		elts.forEach_(_, function(_, e) {
			// UPDATE
			var statusUsageFound = false;
			e.profileItems && e.profileItems.forEach(function(item, idx, arr) {

				if (item.code === "maintenanceAndStatus" || item.code === "statusAndUsage") {
					if (!statusUsageFound) {
						item.code = "statusAndUsage";
						statusUsageFound = true;
					} else {
						// delete this entity because it has been already updated
						arr.splice(idx, 1);
					}
				}
				if (item.code === "preferences") {
					arr.splice(idx, 1);
				}
				if (e.code === "User") {
					if (item.code === "myProfile") {
						item.canCreate = true;
						item.canRead = true;
						item.canWrite = true;
						item.canDelete = false;
						item.canExecute = false;
					}
				}
				if (e.code === "ADMCA") {
					// change right
					if (item.code !== "development" && item.code !== "technicalSettings") {
						item.canCreate = true;
						item.canRead = true;
						item.canWrite = true;
						item.canDelete = true;
						item.canExecute = true;
					} else {
						item.canCreate = false;
						item.canRead = false;
						item.canWrite = false;
						item.canDelete = false;
						item.canExecute = false;

					}
				}
			});

			updated++;
			coll.update({
				_id: e._id
			}, {
				$set: e
			}, {
				safe: true,
				multi: true
			}, _);
		});
	}

	exports.tracer && exports.tracer("Update script to version: 6 executed");
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
	fileId: "5dfrhd8925fd", // this id MUST never change and MUST be unique over all update scripts
	description: "7 sky branch update script" // !important, some description, optional and can change
};