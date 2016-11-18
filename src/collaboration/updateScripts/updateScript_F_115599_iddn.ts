"use strict";

exports.tracer; // = console.log;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Update IDDN");
	// create applications
	[{
		"application": "x3",
		"contract": "erp",
		"productCode": "1",
		"iddn": "IDDN.FR.001.120009.xxx.2016"
	}, {
		"application": "x3",
		"contract": "hrm",
		"productCode": "3",
		"iddn": "IDDN.FR.001.120010.xxx.2016"
	}].forEach_(_, function(_, appData) {
		var app = db.fetchInstance(_, db.model.getEntity(_, "application"), {
			jsonWhere: {
				application: {
					$regex: "^" + appData.application + "$",
					$options: "i"
				},
				contract: {
					$regex: "^" + appData.contract + "$",
					$options: "i"
				},
			}
		});
		if (!app) {
			return;
		}
		app.productCode(_, appData.productCode);
		app.iddn(_, appData.iddn);
		app.save(_);
	});
	//
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
	fileId: "76221572ed36", // this id MUST never change and MUST be unique over all update scripts
	description: "F_115599_iddn update script" // !important, some description, optional and can change
};