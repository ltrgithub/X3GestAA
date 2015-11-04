"use strict";
require('npm-shadow')();
var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.log(ex);
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

if (config.streamlineFromCI) {
	try {
		var version = require("./version.json") || {};
		if (version.streamline) {
			console.log("Streamline from version file");
			config.streamline = version.streamline;
		}
	} catch (ex) {
		console.error(ex);
	}
}

if (config.collaboration && config.collaboration.cacheDir) { // user dependent cache directory to avoid access conflicts
	config.streamline.cacheDir = config.collaboration.cacheDir + "/" + (process.env.USER || process.env.USERNAME || "");
}

require('syracuse-core/lib/streamline-loader')(config.streamline);

require("syracuse-load/lib/balancer").startCb(config, function(err) {
	if (err) {
		console.log("Error: " + err.message + " " + err.stack);
		process.exit(1);
	}
});
