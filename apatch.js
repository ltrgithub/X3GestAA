"use strict";
// Special entry file for patch creation
require('npm-shadow')();

var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.error(ex);
}
if (config.streamlineFromCI) {
	try {
		var version = require("./version.json") || {};
		if (version.streamline) {
			console.log("Streamline config from version.json");
			config.streamline = version.streamline;
		}
	} catch (ex) {
		console.error(ex);
	}
}

//crnit: allow passing the HOMEPATH variable, important to execute syracuse as windows service, under local system account
if (config.streamline) {
	if (config.streamline.homedrive)
		process.env.HOMEDRIVE = config.streamline.homedrive;
	if (config.streamline.homepath)
		process.env.HOMEPATH = config.streamline.homepath;
} else {
	config.streamline = {};
}

config.patch = config.patch || {};

if (config.collaboration && config.collaboration.cacheDir) { // user dependent cache directory to avoid access conflicts
	config.streamline.cacheDir = config.collaboration.cacheDir + "/" + (process.env.USER || process.env.USERNAME || "");
}

// require("streamline").register(config.streamline);
require('syracuse-core/lib/streamline-loader')(config.streamline);
var arg = process.argv[2];
require('syracuse-patch/lib/patchcreate').cmdLinePatchCb(config, function(err, result) {
	if (err) {
		console.error("Error " + err + " " + err.stack);
		process.exit(err.special_status || 1);
	} else {
		process.exit(result || 0);
	}
});
