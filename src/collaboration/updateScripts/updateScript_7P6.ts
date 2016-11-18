"use strict";

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; remove Badges 'ERPDEV','ERPTRAN','ERPFIN' from Role 'ERP-SYSTADMIN'");
	//
	var badgesToRemove = ["ERPDEV", "ERPTRAN", "ERPFIN"];
	var roColl = db.db.collection("Role", _);
	var baColl = db.db.collection("Badge", _);
	var role = roColl.find({
		code: "ERP-SYSTADMIN"
	}).toArray(_)[0];
	if (role) {
		var badges = [];
		if (role.badges && role.badges.length > 1) {
			role.badges.forEach_(_, function(_, b) {
				var badge = baColl.find({
					_id: b._uuid
				}).toArray(_)[0];
				if (badge && badgesToRemove.indexOf(badge.code) === -1) {
					badges.push({
						_uuid: badge._id
					});
				}
			});
		}
		// Remove unwanted badges from ERP-SYSTADMIN role
		roColl.update({
			_id: role._id
		}, {
			$set: {
				badges: badges,
				_updDate: new Date()
			}
		}, {
			safe: true,
			multi: true
		}, _);

	}
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
	fileId: "2r735c2645fe", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 6 branch update script" // !important, some description, optional and can change
};