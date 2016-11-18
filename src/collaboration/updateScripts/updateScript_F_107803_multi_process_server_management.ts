"use strict";
var helpers = require('@sage/syracuse-core').helpers;
exports.tracer; // = console.log;

var _scripts = [];

function createX3Solution(_, db, x3serverData, solutionName, app) {
	x3serverData._id = helpers.uuid.generate('-');
	var descr = x3serverData.description["en-us"] || x3serverData.description["default"];
	x3serverData.code = solutionName + (descr ? " - " + descr : "");
	x3serverData.solutionName = solutionName;

	x3serverData.proxy = false;
	x3serverData.application = app;

	exports.tracer && exports.tracer("Create X3 solution: " + x3serverData.solutionName + " - " + x3serverData.code);
	var coll = db.db.collection("X3solution", _);
	coll.insert(x3serverData, _);
	_solutions[x3serverData.solutionName] = x3serverData._id;
	return x3serverData._id;
}

var _servers = {};
var _solutions = {};

function getX3server(_, db, uuid) {
	if (!_servers[uuid]) {
		var coll = db.db.collection("X3server", _);
		var srvs = coll.find({
			_id: uuid
		}).toArray(_);
		if (srvs && srvs.length > 0) {
			var srv = srvs[0];
			_servers[uuid] = srv;
			return srv;
		}
	} else {
		return _servers[uuid];
	}
}

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; replace x3servers by x3solutions");
	//
	var collEp = db.db.collection("EndPoint", _);

	var eps = collEp.find({
		"protocol": "x3",
		"x3server": {
			"$ne": null
		},
		"x3SolutionName": {
			"$ne": null
		},
		"x3solution": null
	}).toArray(_);

	eps && eps.forEach_(_, function(_, ep) {
		if (ep.x3server && ep.x3server._uuid) {
			var srv = getX3server(_, db, ep.x3server._uuid);
			if (srv) {
				var solUuid = _solutions[ep.x3SolutionName] || createX3Solution(_, db, srv, ep.x3SolutionName, ep.applicationRef);
				collEp.update({
					_id: ep._id
				}, {
					$set: {
						x3solution: {
							_uuid: solUuid
						}
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		}
	});

	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; force x3solutions save action to set x3 runtimes");
	//
	var solutions = db.fetchInstances(_, db.model.getEntity(_, "x3solution"));
	solutions.forEach_(_, function(_, s) {
		s.synchronize(_);
		s.save(_);
	});

	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; add default value for x3historic property on endpoints instances");
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

	exports.tracer && exports.tracer("Update script to version: 3 executed");
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
	fileId: "a246fC7e891a", // this id MUST never change and MUST be unique over all update scripts
	description: "F_107803_multi_process_server_management" // !important, some description, optional and can change
};