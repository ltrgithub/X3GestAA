"use strict";

exports.tracer; // = console.log;
var _scripts = [];


exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.error;
	//
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "1eb2ec4332c7", // this id MUST never change and MUST be unique over all update scripts
	description: "Avenger P0 update script" // !important, some description, optional and can change
};