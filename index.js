//redirect standard output to file in cluster
if (/^N\d+$/.test(process.argv[2])) {
	var fs = require('fs')	
	var name = __dirname+"/"+process.argv[2]+".log";
	// fs.unlinkSync(name)
	var stream = fs.createWriteStream(name);
	process.stdoutOld = process.stdout;
	process.__defineGetter__("stdout", function() { return stream; });
	process.__defineGetter__("stderr", function() { return stream; });
	console.log("Standard output redirected")
	console.error("STDERR redirected")
}

var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.log(ex);
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

	var syracuse = require('syracuse-main/lib/syracuse');
	var port = syracuse.config.port || 8124;
	//Port init
	syracuse.config.sdata.httpRoot = syracuse.config.sdata.httpRoot || "http://localhost:" + port;

	// special mode for patch integration on temp directory
	if (process.argv[2] && process.argv[2].substr(0, 5) === "PATCH") {
		syracuse.patchintegration(function(error) {
			if (error)
				console.log("Error in patch integration "+error);
			else
				console.log("Patch integrated");
			process.kill(process.pid);
		});
	} else {
		// start http or mock server
		syracuse.server.listen(function() {
			console.log('Server running at http://localhost:' + port + '/');
		}, port);
		syracuse.integrationServer && syracuse.integrationServer.listen(function() {
			console.log('Integration server running at http://localhost:' + port + '/');
		}, syracuse.config.integrationServer.port);
	}
});

