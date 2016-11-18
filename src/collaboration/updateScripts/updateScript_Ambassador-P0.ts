"use strict";

exports.tracer; // = console.log;
var helpers = require('@sage/syracuse-core').helpers;
var helperAdmin = require("syracuse-collaboration/lib/helpers");
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Change security levels 0 to 1 (except for ADMIN)");
	//
	var coll = db.db.collection("SecurityProfile", _);
	var elts = coll.find({
		code: {
			$ne: "ADMIN"
		},
		securityLevel: 0
	}).toArray(_);

	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			exports.tracer && exports.tracer("Set securityLevel 1 on security profile " + e.code);

			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					securityLevel: 1
				}
			}, {
				safe: true,
				multi: true
			}, _);

		});
	}
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; add contrast theme css");
	var collTheme = db.db.collection("Theme", _);
	var contrast = collTheme.find({
		code: "contrast"
	}).toArray(_);

	var contrastTheme = {
		"code": "contrast",
		"description": "contrast",
		"cssFiles": [{
			"path": "contrast",
			"_creUser": "admin",
			"_creDate": new Date(),
			"_uuid": helpers.uuid.generate("-"),
			"_updUser": "admin",
			"_updDate": new Date(),
			"_index": 0
		}],
		"_creUser": "admin",
		"_creDate": new Date(),
		"_updUser": "admin",
		"_updDate": new Date()
	};

	if (contrast && contrast.length) {
		collTheme.update({
			_id: contrast[0]._id
		}, {
			$set: contrastTheme
		}, {
			safe: true,
			multi: true
		}, _);
	} else {
		contrastTheme._id = helpers.uuid.generate("-");
		collTheme.insert(contrastTheme, _);
	}
	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; Change syracuse admin endpoint to use localDatabase");
	//
	var coll = db.db.collection("EndPoint", _);
	var elts = coll.find({
		application: "syracuse",
		databaseDriver: "mongodb",
		contract: "collaboration"
	}).toArray(_);

	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			exports.tracer && exports.tracer("Set localDatabase true on endpoint " + e.application);

			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					localDatabase: true
				}
			}, {
				safe: true,
				multi: true
			}, _);

		});
	}
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; Change sub-modules codes: X3_ERP_XXX -> STD_X3_ERP_XXX");
	//
	var coll = db.db.collection("MenuBlock", _);
	var elts = coll.find({
		code: {
			$regex: /^X3_ERP_/
		},
		_factory: true,
		_factoryOwner: "SAGE"
	}).toArray(_);
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					code: "STD_" + e.code
				}
			}, {
				safe: true,
				multi: true
			}, _);
		});
	}
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

function findX3Application(_, db, contract) {
	var apps = db.db.collection("Application", _).find({
		application: 'x3',
		contract: contract
	}, {
		_id: 1
	}).toArray(_);
	if (apps && apps.length === 1) return apps[0];
}

_scripts[5] = function(_, db) {

	exports.tracer && exports.tracer("Executing update script to version: 5; Change menu items codes: STD_XXX -> STD_X3_ERP_XXX");
	//

	var erpApp = findX3Application(_, db, "erp");

	var coll = db.db.collection("MenuItem", _);
	var elts = coll.find({
		code: {
			$regex: /^STD_/
		},
		linkType: "$function",
		_factory: true,
		_factoryOwner: "SAGE",
		application: {
			_uuid: erpApp._id
		}
	}).toArray(_);
	if (elts && elts.length > 0) {
		var updated = 0,
			ignored = 0;
		elts.forEach_(_, function(_, e) {
			if (e.code.indexOf("STD_X3_") === -1) {
				//				// UPDATE
				coll.update({
					_id: e._id
				}, {
					$set: {
						_updDate: new Date(),
						code: "STD_X3_ERP_" + e.code.slice(4)
					}
				}, {
					safe: true,
					multi: true
				}, _);
				updated++;
			} else {
				ignored++;
			}
		});
		exports.tracer && exports.tracer(updated + " MenuItems have been updated");
		exports.tracer && exports.tracer(ignored + " MenuItems have been ignored because already contained STD_X3_ERP_ prefix");
	}
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {

	exports.tracer && exports.tracer("Executing update script to version: 6; Fix missing _ on several environments");
	//

	var erpApp = findX3Application(_, db, "erp");

	var coll = db.db.collection("MenuItem", _);
	var elts = coll.find({
		code: {
			$regex: /^STD_X3_ERP/
		},
		linkType: "$function",
		_factory: true,
		_factoryOwner: "SAGE",
		application: {
			_uuid: erpApp._id
		}
	}).toArray(_);
	if (elts && elts.length > 0) {
		var updated = 0;
		elts.forEach_(_, function(_, e) {
			if (e.code.indexOf("STD_X3_ERP_") === -1) {
				// UPDATE
				updated++;
				coll.update({
					_id: e._id
				}, {
					$set: {
						_updDate: new Date(),
						code: "STD_X3_ERP_" + e.code.slice(10)
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
		exports.tracer && exports.tracer(updated + " MenuItems have been updated");
	}
	exports.tracer && exports.tracer("Update script to version: 6 executed");
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
	fileId: "0ab23c6d32e5", // this id MUST never change and MUST be unique over all update scripts
	description: "Ambassdor P0 update script" // !important, some description, optional and can change
};