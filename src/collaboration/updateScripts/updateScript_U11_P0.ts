"use strict";

exports.tracer; // = console.log;
var _scripts = [];

function addConnRepresentationToApp(_, app, coll, reprName) {
	coll.update({
		_id: app._id
	}, {
		$set: {
			connRepresentation: reprName
		}
	}, {
		safe: true,
		multi: true
	}, _);
}

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; add connexion representation on X3 ERP application");

	var appColl = db.db.collection("Application", _);
	var x3apps = appColl.find({
		protocol: 'x3',
		contract: 'erp'
	}).toArray(_);

	if (x3apps.length > 0) {
		addConnRepresentationToApp(_, x3apps[0], appColl, "ACHGENVX3");
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
	fileId: "ecb645641def", // this id MUST never change and MUST be unique over all update scripts
	description: "U11 P0 update script" // !important, some description, optional and can change
};