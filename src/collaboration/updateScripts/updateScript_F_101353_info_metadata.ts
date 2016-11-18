"use strict";

exports.tracer; // = console.log;

var _scripts = [];

function changeChildrenInfoProperty(_, coll, elts, childName) {
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			if (e[childName] && e[childName].length > 0) {
				var array = [];
				e[childName].forEach_(_, function(_, c) {
					c._creUser = c._creUser || e._creUser;
					c._creDate = c._creDate || e._creDate;
					c._updUser = c._updUser || e._updUser;
					c._updDate = c._updDate || e._updDate;
					array.push(c);
				});
				var $set = {
					_updDate: new Date()
				};
				$set[childName] = array;
				// UPDATE
				coll.update({
					_id: e._id
				}, {
					$set: $set
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
}

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; set PageDef variants creation informations");
	//
	var coll = db.db.collection("PageDef", _);
	var elts = coll.find().toArray(_);
	changeChildrenInfoProperty(_, coll, elts, "variants");
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
	fileId: "2info7cda5fe", // this id MUST never change and MUST be unique over all update scripts
	description: "F_101353_info_metadata update script" // !important, some description, optional and can change
};