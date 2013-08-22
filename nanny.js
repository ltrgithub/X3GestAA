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
if(config.collaboration && config.collaboration.cacheDir) { // user dependent cache directory to avoid access conflicts
	config.streamline.cacheDir = config.collaboration.cacheDir + "/"+ (process.env.USER || process.env.USERNAME || "");
}
config.streamline.lines = config.streamline.lines || "preserve";

require("streamline").register(config.streamline);

require("syracuse-load/lib/balancer").startCb(config, function(err) {
	if (err) {
		console.log("Error: "+err.message+" "+err.stack);
	}
});
