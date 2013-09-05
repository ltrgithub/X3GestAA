"use strict";

(function() {
	var matches = process.version.match(/^v(\d+)\.(\d+).*$/);
	if (!(matches && (matches[1] > 0 || matches[2] >= 10))) throw new Error("unsupported node version: " + process.version + " - please upgrade to 0.10.x or more recent");	
})();

var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.error(ex);
}

if (!config.streamline || !(config.streamline.fibers || config.streamline.generators) || !config.streamline.fast)
	throw new Error('invalid streamline configuration, please set "fibers" and "fast" options to true in nodelocal.js');
//redirect standard output to file in cluster
if (/^N\d+$/.test(process.argv[2])) {
	var os = require('os');
	var fs = require('fs');
	var util = require('util');
	var logpath = ((config.collaboration && config.collaboration.logpath) ? config.collaboration.logpath : __dirname) 
	var name = logpath+"/"+os.hostname()+"-"+process.argv[2]+".log";
	// fs.unlinkSync(name)
	var buffer = null;
	var stream = fs.createWriteStream(name);
	
	// node.js v0.10: process.stdout cannot be changed any more
	var buffer = null;
    stream.on('drain', function() { if (buffer && buffer.length) { buffer = (stream.write(buffer) ? null : ""); } else { buffer = null; } });
	process.stdoutOld = process.stdout;
	var output = function() { var content = util.format.apply(this, arguments) + '\n';
        if (buffer === null) {
            if (!stream.write(content)) buffer = "";
        } else {
            buffer += content;
        }
    }
	var log = console.log;
    console.log = console.error = console.info = console.warn = console.trace = output;
    if (log === console.log) {
    	console.error("Output streams cannot be changed.")
    	process.exit(1);
    }
	console.log("Standard output redirected")
	console.error("Standard error redirected")
}

if (config.streamlineFromCI) {
	try {
		var version =  require("./version.json") || {};
		if (version.streamline) {
			console.log("Versionaa")
			config.streamline = version.streamline;
		}
	} catch (ex) {
		console.error(ex);
	}
}

//crnit: allow passing the HOMEPATH variable, important to execute syracuse as windows service, under local system account
if(config.streamline) {
	if(config.streamline.homedrive)
		process.env.HOMEDRIVE = config.streamline.homedrive;
	if(config.streamline.homepath)
		process.env.HOMEPATH = config.streamline.homepath;
} else {
	config.streamline = {
			fibers: false,
			verbose: true,
			cache: true,
	}
}
if(config.collaboration && config.collaboration.cacheDir) { // user dependent cache directory to avoid access conflicts
	config.streamline.cacheDir = config.collaboration.cacheDir + "/"+ (process.env.USER || process.env.USERNAME || "");
}
config.streamline.lines = config.streamline.lines || "preserve";

require('coffee-script');

require('syracuse-license').register(function(err, data) {
	if (err) console.log(""+err)
	else if (!data) console.log("No license")

	require("streamline").register(config.streamline);
	require("syracuse-core/lib/localeWrapper");

	var waitData;
	if (process.argv[2] === "PATCH") {
		// patchtools are independent of Syracuse modules!
		var patchtools = require('syracuse-patch/lib/patchtools');
		patchtools.waitfunction(function(err) {
			if (err) {
				console.log("Error "+err.stack);
			} else {
				var syracuse = require('syracuse-main/lib/syracuse');
				syracuse.runPatchCb(function(err) {
					console.log("Error "+err.stack);
				});
			}
		});
	} else {
		var syracuse = require('syracuse-main/lib/syracuse');
		syracuse.main();
	}
});
