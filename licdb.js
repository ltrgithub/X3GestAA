"use strict";
// this little tool displays the license content in the database and can drop it
// It is mainly used for emergency when starting Syracuse is not possible any more
require('npm-shadow')();
var mongodb = require('mongodb');
var util = require('util');
var path = require('path');
var fs = require('fs');
var helptext = true;
var command;
if (process.argv[2] === "--command") {
	command = process.argv[3];
	process.argv.splice(2,2);
}
if (process.argv[2] === "--nohelp") {
	helptext = false;
	process.argv.splice(2, 1);
}
if (process.argv[2] !== "full" && process.argv[2] !== "short" && process.argv[2] !== "drop") {
	if (helptext) {
		command = command || "node licdb";
		console.error("Usage: Overview of stored licenses and policies: "+command+" short");
		console.error("Full data of stored licenses and policies: "+command+" full");
		console.error("Remove all data of stored licenses and policies: "+command+" drop");
	} else {
		console.error("Wrong option: " + process.argv[2]);
	}
	process.exit(1);
}


try {
	var config = require('./nodelocal').config;
} catch (e) {
	console.error("Error when reading configuration: " + e);
	process.exit(1);
}
config.collaboration = config.collaboration || {};
if (config.collaboration.driver && config.collaboration.driver !== "mongodb") {
	console.error("Only MongoDB supported at the moment");
	process.exit(1);
}

var tenantId = process.argv[3]; // optional tenantId
if (tenantId && tenantId.substr(0, 9) === "tenantId=") tenantId = tenantId.substr(9);

function finish(db, err) {
	db && db.close();
	if (err) {
		console.error("" + err);
		process.exit(1);
	}
}

var mongoOpt = (config.mongodb || {}).options;
var dbUrl = "mongodb://" + (config.collaboration.connectionString || (config.collaboration.hostname || "localhost") + ":" + (config.collaboration.port || 27017)) + "/" + (tenantId ? tenantId+"-" : "")+ (config.collaboration.dataset || "syracuse");
//db.open(function(err, db) {
mongodb.MongoClient.connect(dbUrl, mongoOpt || {
    db: {
        w: 1
    }
}, function(err, db) {
	if (err) return finish(db, err);
	db.createCollection("license", function(err, collection) {
		if (err) return finish(db, err);
		// read or drop collection
		if (process.argv[2] === 'drop') {
			return collection.remove({}, function(err, count) {
				if (err) return finish(db, err);
				console.log("Removed " + count + " row(s). Please copy a valid license file to " + path.join(__dirname, "temp/license.json") + " before restarting Syracuse.");
				return finish(db);
			});
		}
		return collection.find().toArray(function(err, docs) {
			if (err) return finish(db, err);
			if (docs.length === 0) console.log("No information available");
			var full = (process.argv[2] === 'full');
			docs.forEach(function(doc) {
				var content = doc.text;
				if (content) {
					var obj = JSON.parse(content);
					var output = obj.fileType + " file from " + (obj.partnerId ? "'" + obj.partnerId + "'" : "SAGE");
					if (obj.product) {
						output += " for " + obj.product.code + " version " + obj.product.version;
					}
					if (obj.policy) {
						output += " policy " + obj.policy.code + " version " + obj.policy.version;
					}
					console.log(output);
					if (full) console.log(util.inspect(obj, {
						depth: 5
					}) + "\n");
				} else {
					console.error("Wrong content " + util.format(doc));
				}
			});
			return finish(db);
		});
	});
});
 