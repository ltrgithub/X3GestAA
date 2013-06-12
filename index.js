"use strict";

var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.error(ex);
}

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
	
	var stdoutOld = process.stdout;
	process.__defineGetter__("stdout", function() { return stream; });
	if (process.stdout === stdoutOld) {
		// process.stdout cannot be changed
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
	    console.log("Redefine console.log etc.");
	} else {
		process.__defineGetter__("stderr", function() { return stream; });		
	}
	console.log("Standard output redirected")
	console.error("Standard error redirected")
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
			trampoline: "nextTick"
	}
}

require('coffee-script');

require('syracuse-license').register(function(err, data) {
	if (err) console.log(""+err)
	else if (!data) console.log("No license")

	require("streamline").register(config.streamline);

	var waitData;
	if (process.argv[2] === "PATCH") {
		// patchtools are independent of Syracuse modules!
		var patchtools = require('syracuse-patch/lib/patchtools');
		patchtools.waitfunction(function(err) {
			if (err) {
				console.log("Error "+err);
			} else {
				var syracuse = require('syracuse-main/lib/syracuse');
			}
		});
	} else {
		var syracuse = require('syracuse-main/lib/syracuse');
		var port = syracuse.config.port || 8124;
		//Port init
		syracuse.config.sdata.httpRoot = syracuse.config.sdata.httpRoot || "http://localhost:" + port;
		// start http or mock server
		syracuse.server.listen(function() {
			console.log('Server running at http://localhost:' + port + '/');
		}, port);
		syracuse.integrationServer && syracuse.integrationServer.listen(function() {
			console.log('Integration server running at http://localhost:' + config.integrationServer.port + '/');
		}, syracuse.config.integrationServer.port);
	}
});

