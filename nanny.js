if (process.argv[2] === "-one") {
	// condense all output in a single console.log message (for PSExec)
    var stdout = "";
    process.argv.splice(2, 1); // remove argument
    var util = require('util');
    var logOrig = console.log;
	var output = function() { 
		var content = util.format.apply(this, arguments) + '\n';
        stdout += content;
    }
    console.log = console.error = console.info = console.warn = console.trace = output;
    process.on('exit', function() {
        logOrig(stdout);
    });
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

if (config.streamlineFromCI) {
	try {
		var version =  require("./version.json") || {};
		if (version.streamline) {
			console.log("Streamline from version file")
			config.streamline = version.streamline;
		}
	} catch (ex) {
		console.error(ex);
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
