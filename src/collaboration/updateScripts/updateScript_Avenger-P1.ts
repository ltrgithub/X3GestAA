"use strict";

exports.tracer; // = console.log;
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Remove menuItems belongs to factory owner SAGESI");
	//
	db.db.collection("MenuItem", _).remove({
		_factory: true,
		_factoryOwner: "SAGESI",
	}, _);
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; remove reference to SAGESI import script");
	var dbParam = db.db.collection('dbParam', _);
	var params = dbParam.find().toArray(_);
	if (params && params.length > 0) {
		params.forEach_(_, function(_, doc) {
			var etags = doc.collaboration.automaticImportEtags;
			for (var k in etags) {
				if (/\bsi_menu_entry$/.test(k)) {
					var unset = {};
					unset['collaboration.automaticImportEtags.' + k] = "";
					dbParam.update({
						_id: doc._id
					}, {
						$unset: unset
					}, {
						safe: true,
					}, _);
					return true;
				}
			}
		});

	}
	exports.tracer && exports.tracer("Update script to version: 2 executed");
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
	fileId: "3ba2ec2651c7", // this id MUST never change and MUST be unique over all update scripts
	description: "Avenger P1 update script" // !important, some description, optional and can change
};