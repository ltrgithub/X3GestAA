"use strict";

exports.tracer; // = console.log;
var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; set salt2 for signature");

	var collection = db.db.collection("User", _);
	var users = collection.find().toArray(_);
	users.forEach_(_, function(_, user) {
		if (!user.salt2) {
			exports.tracer && exports.tracer("Salt for " + user.login);
			var res = collection.update({
				_id: user._id
			}, {
				$set: {
					salt2: user.login,
					_updDate: new Date()
				}
			}, {
				safe: true,
				multi: true
			}, _);
			exports.tracer && exports.tracer("Res " + res);
		} else {
			exports.tracer && exports.tracer("No Salt for " + user.login);
		}
	});
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
	fileId: "bf0233e93edf8ed06", // this id MUST never change and MUST be unique over all update scripts
	description: "Avenger P2 update script" // !important, some description, optional and can change
};