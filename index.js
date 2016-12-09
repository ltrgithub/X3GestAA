"use strict";
require('npm-shadow')();

(function() {
	var matches = process.version.match(/^v(\d+)\.(\d+).*$/);
	if (!(matches && (matches[1] > 0 || matches[2] >= 10))) throw new Error("unsupported node version: " + process.version + " - please upgrade to 0.10.x or more recent");
})();

var config = {};

try {
	config = require("./nodelocal1").config || {};
} catch (ex) {
	console.error(ex);
	process.exit(6);	
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

if (config.collaboration && config.collaboration.cacheDir) { // user dependent cache directory to avoid access conflicts
	config.streamline.cacheDir = config.collaboration.cacheDir + "/" + (process.env.USER || process.env.USERNAME || "");
}
// automatically enable 'aggressive' optimisation in fibers fast mode
//if (config.streamline.fast && config.streamline.fibers) config.streamline.aggressive = true;

require('syracuse-core/streamline-loader')(config.streamline);

(function() {
	if (config.concurix) {
		var cx = require('concurix-monitor')({
		   accountKey: config.concurix.accountKey,
		});
		cx.start();
	}
})();

(function() {
    if (config.look) {
        var look = require('look');
        look.start(3000, '127.0.0.1');
    }
})();

// make 2-digit number
function _ext(number) {
	if (number < 10) return "0" + number;
	return number;
}
//redirect standard output to file in cluster
if (/^[NWB]\d+$/.test(process.argv[2])) {
	var os = require('os');
	var fs = require('fs');
	var util = require('util');
	var logpath = ((config.collaboration && config.collaboration.logpath) ? config.collaboration.logpath : __dirname);
	var now = new Date();
	var logname = logpath + "/" + now.getFullYear() + "-" + _ext(1 + now.getMonth()) + "-" + _ext(now.getDate()) + "_" + os.hostname() + "-" + process.argv[2] + ".log";
	var buffer = null;
	var stream = fs.createWriteStream(logname, {
		flags: 'a'
	});

	// node.js v0.10: process.stdout cannot be changed any more
	var buffer = null;
	stream.on('drain', function() {
		if (buffer && buffer.length) {
			buffer = (stream.write(buffer) ? null : "");
		} else {
			buffer = null;
		}
	});
	process.stdoutOld = process.stdout;
	var output = function() {
		var content = util.format.apply(this, arguments) + '\n';
		if (buffer === null) {
			if (!stream.write(content)) buffer = "";
		} else {
			buffer += content;
		}
	};
	var log = console.log;
	console.log = console.error = console.info = console.warn = console.trace = output;
	if (log === console.log) {
		console.error("Output	streams	cannot	be	changed.");
		process.exit(1);
	}
	console.log("Standard output redirected");
	console.error("Standard error redirected");
}


//require('coffee-script/lib/coffee-script/extensions');

require('syracuse-license').register(function(err, data) {
	if (err) console.log("" + err);
	else if (!data) console.log("No license");

	// streamline is now registered with babel, at the very beginning
	//require("streamline").register(config.streamline);
	if (config.streamline.flamegraph) require("streamline/lib/globals").emitter = new (require('events').EventEmitter)();

	var waitData;
	if (process.argv[2] === "PATCH") {
		// patchtools are independent of Syracuse modules!
		var patchtools = require('syracuse-patch/lib/patchtools');
		patchtools.waitfunctionCb(function(err) {
			if (err) {
				console.log("Error " + err +" "+err.stack);
			} else {
				var syracuse = require('syracuse-main/lib/syracuse');
				syracuse.runPatchCb(function(err) {
					console.log("Error during patching " + err +" "+err.stack);
				});
			}
		});
	} else {
		try {
			var syracuse = require('syracuse-main/lib/syracuse');

            syracuse.main(function(err) {
            	if (err) throw err;
            });
		} catch (e) {
			var fs = require('fs');
			if (fs.existsSync(__dirname + '/node_modules/syracuse-main/lib/syracuse.jsc') && !require.extensions['.jsc']) {
				console.error("Need a license to start. " + e);
				process.exit(5);
			} else {
				console.log("Startup error "+e+" "+e.stack);
			}
		}
	}
});
