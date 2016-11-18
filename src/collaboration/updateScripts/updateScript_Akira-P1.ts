"use strict";

var fs = require('streamline-fs');
var fsp = require('path');
var helpers = require('@sage/syracuse-core').helpers;

exports.tracer; // = console.log;

var _scripts = [];

_scripts[1] = function(_, db) {
	// Do nothing Script 1 was here before, but since errors were encountered, we need to reexecute on some environments
};
_scripts[2] = function(_, db) {
	// Do nothing Script 2 was here before, but since errors were encountered, we need to reexecute on some environments
};

_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; delete admin (lowercase) profile");
	db.db.collection("SecurityProfile", _).remove({
		code: "admin"
	}, _);
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; Create new sections 'pages' and 'preferences' in existing security profiles");
	//

	var profile = JSON.parse(fs.readFile(fsp.join(__dirname, "../security/profile.json"), _));

	function createProfileItem(code, model, items) {
		var modelItem = items.filter(function(i) {
			return i.code === model;
		})[0];
		var _p = profile[code];
		if (modelItem && _p) {
			items.push({
				code: code,
				description: {
					"en-us": _p.title,
					"default": _p.title
				},
				canCreate: modelItem.canCreate,
				canRead: modelItem.canRead,
				canWrite: modelItem.canWrite,
				canDelete: modelItem.canDelete,
				canExecute: modelItem.canExecute,
				_uuid: helpers.uuid.generate('-'),
				_creUser: modelItem._creUser,
				_creDate: new Date(),
				_updUser: modelItem._updUser
			});
		}
	}

	function reorderSections(items) {
		var reordered = [];
		Object.keys(profile).forEach(function(key, idx) {
			var it = items.filter(function(i) {
				return i.code === key;
			})[0];
			if (it) {
				it._index = idx;
				reordered.push(it);
			}
		});
		return reordered;
	}

	var coll = db.db.collection("SecurityProfile", _);
	var profiles = coll.find({}).toArray(_);
	if (profiles && profiles.length > 0) {
		profiles.forEach_(_, function(_, p) {
			if (p.profileItems) {
				var items = [];
				var pagesExists = false;
				var prefsExists = false;

				p.profileItems.forEach(function(i) {
					if (i.code === "pages") pagesExists = true;
					if (i.code === "preferences") prefsExists = true;
					items.push(i);
				});
				if (!pagesExists) {
					createProfileItem("pages", "authoring", items);
				}

				if (!prefsExists) {
					createProfileItem("preferences", "technicalSettings", items);
				}

				// UPDATE
				coll.update({
					_id: p._id
				}, {
					$set: {
						_updDate: new Date(),
						profileItems: reorderSections(items)
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; add default value for x3historic property on endpoints instances");
	//
	var collEp = db.db.collection("EndPoint", _);

	var eps = collEp.find({
		"x3Historic": null
	}).toArray(_);

	eps && eps.forEach_(_, function(_, ep) {
		collEp.update({
			_id: ep._id
		}, {
			$set: {
				x3Historic: false
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});

	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 6; set salt");

	var collection = db.db.collection("User", _);
	var users = collection.find().toArray(_);
	users.forEach_(_, function(_, user) {
		if (!user.salt) {
			exports.tracer && exports.tracer("Salt for " + user.login);
			var res = collection.update({
				_id: user._id
			}, {
				$set: {
					salt: user.login,
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
	exports.tracer && exports.tracer("Update script to version: 6 executed");
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
	fileId: "cfa507cd7c4f", // this id MUST never change and MUST be unique over all update scripts
	description: "Akira P1 update script" // !important, some description, optional and can change
};