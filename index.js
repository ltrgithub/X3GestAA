var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.log(ex);
}
//crnit: allow passing the HOMEPATH variable, important to execute syracuse as windows service, under local sytem account
if(config.streamline) {
	if(config.streamline.homedrive)
		process.env.HOMEDRIVE = config.streamline.homedrive;
	if(config.streamline.homepath)
		process.env.HOMEPATH = config.streamline.homepath;
}
//
require('coffee-script');
require("streamline").register(config.streamline || {
	fibers: false,
	verbose: true,
	cache: true,
	trampoline: "nextTick"
});
var syracuse = require('syracuse-main/lib/syracuse');
var port = syracuse.config.port || 8124;
//Port init
syracuse.config.sdata.httpRoot = syracuse.config.sdata.httpRoot || "http://localhost:" + port;
// start  liveServer
config.useLive && syracuse.liveServer.listen(syracuse.server);
// start  http liveServer
syracuse.server.listen(function() {
	console.log('Server running at http://localhost:' + port + '/');
}, port);