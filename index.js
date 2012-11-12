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
//
require('coffee-script');

require('syracuse-license').register();

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
	// start  liveServer
	config.useLive && syracuse.liveServer.listen(syracuse.server);
	// start  http liveServer
	syracuse.server.listen(function() {
		console.log('Server running at http://localhost:' + port + '/');
	}, port);
}