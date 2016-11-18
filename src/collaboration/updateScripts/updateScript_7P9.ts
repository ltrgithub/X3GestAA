"use strict";

exports.tracer; // = console.log;

var _scripts = [];

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Remove representationRef property on non $reprentation menuItems");
	//
	var coll = db.db.collection("MenuItem", _);
	var elts = coll.find({
		linkType: {
			$ne: "$representation"
		}
	}).toArray(_);
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					representationRef: {}
				}
			}, {
				safe: true,
				multi: true
			}, _);

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
	fileId: "f2ebaecd6e2e", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 9 branch update script" // !important, some description, optional and can change
};