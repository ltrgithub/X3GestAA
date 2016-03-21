"use strict";

exports.tracer; // = console.log;
var pageLayoutProxy = require('syracuse-collaboration/lib/entities/page/pageLayoutProxy');

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Remove pageLayouts localizations upper-cased");
	//
	var collPl = db.db.collection("PageLayout", _);
	var pls = collPl.find({
		"page._variantType": "landingPage"
	}).toArray(_);

	if (pls && pls.length > 0) {
		pls.forEach_(_, function(_, pl) {
			if (pl.localization != null && pl.content != null) {
				var layoutId = "landingPage." + pl.page._uuid;
				var content = JSON.parse(pl.content);
				content.$localization = JSON.parse(pl.localization);
				pageLayoutProxy.cleanLocalizations(_, content, {
					_layoutId: layoutId
				}, exports.tracer);

				collPl.update({
					_id: pl._id
				}, {
					$set: {
						_updDate: new Date(),
						localization: JSON.stringify(content.$localization)
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
	fileId: "0acceec56e2e", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 13 branch update script" // !important, some description, optional and can change
};