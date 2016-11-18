"use strict";
var fs = require('fs');
var os = require('os');
var fsp = require('path');
var mongodb = require('mongodb');
var util = require('util');
var path = require('path');
// this code runs before the license system is enabled. Therefore load nodelocal directly
var config = {};
try {
	config = require("../../nodelocal").config || {};
	config.streamline.fast = false;
} catch (ex) {
	console.error(ex);
}
config.system = config.system || {};
config.system.root = config.system.root || path.join(__dirname, "../..");

var POLICY_FOLDER = fsp.join(config.system.root, 'policies');
var PARTNER_FILE = fsp.join(config.system.root, 'partner.json');
if (!(config.system && config.system.enableDevelopmentFeatures)) {
	config.noDevLic = true;
} else if (!config.noDevLic) {
	var LICENSE_FILE = fsp.join(config.system.root, 'devLic/license.json');
	if (!fs.existsSync(LICENSE_FILE)) {
		config.noDevLic = true;
	} else console.log("Developer license");
}
if (config.noDevLic) {
	var LICENSE_FILE = (process.argv[2] === "PATCH" ? fsp.join(config.system.root, 'license.json') : fsp.join(config.system.root, 'temp/license.json'));
}
exports.LICENSE_FILE = LICENSE_FILE;

exports.load = function(name) {
	var arch = os.platform() + '-' + os.arch();
	var v8 = 'v8-' + /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
	return require(`../bin/${arch}-${v8}/${name}`);
};

// add policies from policies folder
function addPolicies(licenseData) {
	try {
		var policies = fs.readdirSync(POLICY_FOLDER);
		policies.forEach(function(policy) {
			if (/\.json$/.test(policy)) {
				console.log("Policy " + policy);
				try {
					licenseData.push(fs.readFileSync(POLICY_FOLDER + "/" + policy, "utf8"));
				} catch (e) {
					if (e.code !== "ENOENT") console.error("Error when reading policy " + policy + ": " + e);
				}
			}
		});
	} catch (e) {
		if (e.code !== "ENOENT") console.error("Error when reading policies: " + e);
	}
}

// extract version data from license or policy file
function extractData(item) {
	return item.product.code + "\0" + item.product.version + "\0" + item.policy.code + "\0" + item.policy.version;
}


exports.register = function(callback, options) {
	var l = exports.load("license");
	if (l) {
		if (fs.existsSync(LICENSE_FILE)) { // read license from file
			console.log("License from file");
			var licenseData = [fs.readFileSync(LICENSE_FILE, "utf8")];
			addPolicies(licenseData);
			try {
				licenseData.push(fs.readFileSync(PARTNER_FILE, "utf8"));
			} catch (e) {
				if (e.code !== "ENOENT") console.error("Error when reading partner file: " + e);
			}
			try {
				return callback(null, l.register(require, licenseData, options, process));
			} catch (e) {
				return callback(e);
			}
		} else { // read license from database
			return exports.readLicenses(function(error, data) {
				if (error) return callback(error);
				if (data && data.length > 0) {
					console.log("License from database");
					// if there is no policy in database, also read policies from file system
					var policies = [];
					var nonpolicies = [];
					var licenseVersions = [];
					try {
						data.forEach(function(item) {
							if (!item) return;
							var itemjson = JSON.parse(item);
							if (itemjson.fileType === "Policy" && !itemjson.partnerId) {
								policies.push(itemjson);
							} else {
								nonpolicies.push(item);
								if (itemjson.fileType === "License" && !itemjson.partnerId) {
									licenseVersions.push(extractData(itemjson));
								}
							}
						});
						if (licenseVersions.length > 0 && !policies.some(function(item) {
								return (licenseVersions.indexOf(extractData(item)) >= 0);
							})) {
							data = nonpolicies;
							console.log("Add policies");
							addPolicies(data);
						}
					} catch (e) {
						console.error("Error during comparison of licenses and policies " + e.stack);
					}
				}
				return callback(null, l.register(require, data, options, process));
			});
		}
	} else {
		return callback(null, false);
	}
};

// the database connection for licenses
// crnit: obsolete to use new connect function (allows to pass more options like replSet)
/*exports.getDatabase = function(tenantId) {
	config.collaboration = config.collaboration || {};
	config.collaboration.driver = config.collaboration.driver || "mongodb";
    var mongoOptions = (config.mongodb || {}).options || {};
	if (config.collaboration.driver !== "mongodb") throw new Error("Only MongoDB supported for handling licenses");
	return new mongodb.Db((tenantId ? tenantId + "-" : "") + (config.collaboration.dataset || "syracuse"), 
                         new mongodb.Server(config.collaboration.hostname || "localhost", config.collaboration.port || 27017, mongoOptions.server || {}), 
                         mongoOptions.db || { w: 1 });
};
*/

exports.connectDatabase = function(callback, tenantId) {
	config.collaboration = config.collaboration || {};
	config.collaboration.driver = config.collaboration.driver || "mongodb";
	if (config.collaboration.driver !== "mongodb") return callback && callback("Only MongoDB supported for handling licenses");
	var dbUrl = "mongodb://" + (config.collaboration.connectionString || (config.collaboration.hostname || "localhost") + ":" + (config.collaboration.port || 27017)) + "/" + ((tenantId ? tenantId + "-" : "") + (config.collaboration.dataset || "syracuse"));
	mongodb.MongoClient.connect(dbUrl, (config.mongodb || {}).options || {
		db: {
			w: 1
		}
	}, callback);
};

exports.readLicenses = function(callback, tenantId) {
	//var db = exports.getDatabase(tenantId);
	// Establish connection to db
	//	db.open(function(err, db) {
	exports.connectDatabase(function(err, db) {
		if (err) {
			console.error("Cannot connect to database. Error: " + err);
			process.exit(7);
			// callback(err);
		}
		db.createCollection('license', function(err, collection) {
			if (err) {
				db.close();
				return callback(err);
			}
			collection.find().toArray(function(err, docs) {
				db.close();
				var result = docs.map(function(doc) {
					return doc.text;
				});
				return callback(err, result);
			});
		});
	}, tenantId);
};