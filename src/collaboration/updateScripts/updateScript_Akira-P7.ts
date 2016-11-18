"use strict";

exports.tracer; // = console.log;
var pageLayoutProxy = require('../../../src/collaboration/entities/page/pageLayoutProxy');

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Encryption for OAuth2 secret");
	var base64 = require('../../..//src/license/index').load('license');
	//
	var coll = db.db.collection("Oauth2", _);
	var pls = coll.find({}).toArray(_);

	if (pls && pls.length > 0) {
		pls.forEach_(_, function(_, pl) {
			if (pl.clientSecret != null && pl.clientSecret.length < 88) { // not yet encrypted
				var secret = base64.license(0, pl.clientSecret, new Boolean(true));
				coll.update({
					_id: pl._id
				}, {
					$set: {
						clientSecret: secret
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
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
	fileId: "6afc2ae2617a", // this id MUST never change and MUST be unique over all update scripts
	description: "8 patch 7 branch update script" // !important, some description, optional and can change
};