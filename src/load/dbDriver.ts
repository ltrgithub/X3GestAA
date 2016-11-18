"use strict";
var util = require('util');
var mongodb = require('mongodb');
var ez = require('ez-streams');

var tracer; // = console.log;

exports.close = function(db) {
	if (db) db.close();
};

exports.open = function(configdata, _, tenant) {
	var config = {};
	try {
		config = require("../../../nodelocal").config || {};
		config.streamline.fast = false;
	} catch (ex) {
		console.log(ex);
	}

	if (!configdata) {
		configdata = config.collaboration || {};
	}
	tracer && tracer("Open with config " + util.format(configdata));
	var dataset = configdata.dataset || "syracuse";
	// maybe set tenant ID for database
	if (tenant) {
		dataset = tenant + "-" + dataset;
	} else {
		for (var i = 2; i < process.argv.length; i++) {
			var arg = process.argv[i];
			if (arg.substr(0, 9) === "tenantId=") {
				dataset = arg.substr(9) + "-" + dataset;
				console.log("Dataset " + dataset);
				break;
			}
		}
	}

	//	var db1 = new mongodb.Db(dataset, new mongodb.Server(configdata.hostname || "localhost", configdata.port || 27017, {}), {
	//		w: "majority"
	//	});
	var db;
	try {
		//		var db = db1.open(_);
		var dbUrl = "mongodb://" + (config.collaboration.connectionString || (configdata.hostname || "localhost") + ":" + (configdata.port || 27017)) + "/" + dataset;
		var mongoOpt = (config.mongodb || {}).options;
		var db = mongodb.MongoClient.connect(dbUrl, mongoOpt || {
			db: {
				w: 1
			}
		}, _);
	} catch (e) {
		if (db) db.close();
		console.error("Cannot open database " + e + " for URL " + dbUrl + " and options " + require('util').format(mongoOpt));
		return null;
	}
	if (!db) console.error("Cannot open database for URL " + dbUrl + " and options " + require('util').format(mongoOpt));
	return db;
};

exports.createCollection = function(db, name, _) {
	if (!db) return undefined;
	return db.createCollection(name, _);
};

exports.find = function(collection, condition, _) {
	return collection.find(condition).toArray(_);
};

exports.count = function(collection, condition, _) {
	return collection.count(condition, _);
};

exports.insert = function(collection, entry, _) {
	collection.insert(entry, {
		safe: true
	}, _);
};

exports.update = function(collection, condition, set, _) {
	collection.update(condition, {
		$set: set
	}, {
		safe: true
	}, _);
};

exports.updateAll = function(collection, condition, set, _) {
	collection.update(condition, {
		$set: set
	}, {
		safe: true,
		multi: true
	}, _);
};

exports.remove = function(collection, condition, _) {
	collection.remove(condition, {
		safe: true
	}, _);
};

exports.time = function(db, _) {
	if (!db._syracuseFinalCode) {
		db._syracuseFinalCode = new mongodb.Code("Date.now()");
	}
	var t = db.eval(db._syracuseFinalCode, null, {
		nolock: true
	}, _);
	return t;
};

// finds related instance of other entity related to the foreign id information of that field.
// returns the instance which must be put into that field, e. g. instance.ab = findInstance(instance.ab, list)
// is idempotent when found instance does not include _uuid attribute.
// if extraName is set, look for that value of the attribute whose name is contained in 'extraName'. 
exports.findInstance = function(attr, list, extraName) {
	if (!attr) return null;
	var id = attr._uuid;
	// console.log("Find instance ID "+util.format(attr))
	if (id) {
		for (var i = list.length - 1; i >= 0; i--) {
			var element = list[i];
			//	console.log(id+" Element "+element._id)
			if (element._id === id) {
				return element;
			}
		}
		return null;
	} else if (extraName) {
		for (var i = list.length - 1; i >= 0; i--) {
			var element = list[i];
			//	console.log(id+" Element "+element._id)
			if (element[extraName] === attr[extraName]) {
				return element;
			}
		}
		return null;
	}
	return attr;
};

// returns the "foreign key" for this instance
exports.setRelatedInstance = function(related) {
	return related ? {
		_uuid: related._id
	} : null;
};

exports.binaryContent = function(db, field, _) {
	// console.log("Binary "+util.format(field))
	if (field) {
		if (field._uuid) {
			var gs = new mongodb.GridStore(db, field._uuid, "r");
			var str = ez.devices.node.reader(gs.open(_).stream(true));
			return str.read(_, -1);
		} else return field;
	};
	return null;
};