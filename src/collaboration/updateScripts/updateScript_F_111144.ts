"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

exports.tracer = null;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; first day of week for localePreference");
	//
	var coll = db.db.collection("LocalePreference", _);
	// ISO value as default
	coll.update({}, {
		$set: {
			firstWeekOfYear: 4
		}
	}, {
		safe: true,
		multi: true
	}, _);
	// for USA and China: 1 January
	coll.update({
		code: "en-US"
	}, {
		$set: {
			firstWeekOfYear: 1
		}
	}, {
		safe: true,
		multi: true
	}, _);
	coll.update({
		code: "zh-CN"
	}, {
		$set: {
			firstWeekOfYear: 1
		}
	}, {
		safe: true,
		multi: true
	}, _);
	exports.tracer && exports.tracer("Update script to version: 4 executed");
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
	fileId: "ea111144fb4cdd", // this id MUST never change and MUST be unique over all update scripts
	description: "feature branch F111144 update script" // !important, some description, optional and can change
};