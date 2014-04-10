// this little tool displays the license content in the database and can drop it
// It is mainly used for emergency when starting Syracuse is not possible any more

var mongodb = require('mongodb');
var util = require('util');
var path = require('path');
var fs = require('fs');
var helptext = true;
if (process.argv[2] === "--nohelp") {
	helptext = false;
	process.argv.splice(2, 1);
}
if (process.argv[2] !== "full" && process.argv[2] !== "short" && process.argv[2] !== "drop") {
	if (helptext) {
		console.error("Usage: Overview of stored licenses and policies: node " + process.argv[1] + " short");
		console.error("Full data of stored licenses and policies: node " + process.argv[1] + " full");
		console.error("Remove all data of stored licenses and policies: node " + process.argv[1] + " drop");
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

var db = new mongodb.Db(config.collaboration.dataset || "syracuse", new mongodb.Server(config.collaboration.hostname || "localhost", config.collaboration.port || 27017, {}), {
	w: "majority"
});


function finish(err) {
	db.close();
	if (err) {
		console.error("" + err);
		process.exit(1);
	}
}


db.open(function(err, db) {
	if (err) return finish(err);
	db.createCollection("license", function(err, collection) {
		if (err) return finish(err);
		// read or drop collection
		if (process.argv[2] === 'drop') {
			return collection.remove({}, function(err, count) {
				if (err) return finish(err);
				console.log("Removed " + count + " row(s). Please copy a valid license file to " + path.join(__dirname, "temp/license.json") + " before restarting Syracuse.");
				return finish();
			});
		}
		return collection.find().toArray(function(err, docs) {
			if (err) return finish(err);
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
			return finish();
		});
	});
});
