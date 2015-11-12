var exec = require('child_process').exec;
var fs = require('fs');

var config = {};

try {
	config = require("./nodelocal").config || {};
} catch (ex) {
	console.error(ex);
}

// invocation of git
var git = "git";
if (config.patch && config.patch.git) git = config.patch.git;

var cmdline = git+" branch -v --no-abbrev --no-color"; 
exec(cmdline, function(error, stdout, stderr) {
	if (error !== null) {
		console.error("Error invoking '"+cmdline+"': "+error);
		process.exit(1);
	}
	if (stderr) {
		console.error("Error message invoking '"+cmdline+"': "+stderr);
		process.exit(2);		
	}
	// analyze result
	var res = /^\*\s+(\S+)\s+(\w+)\s(.*)/m.exec(stdout);
	if (!res) {
		console.error("Result of '"+cmdline+"' does not have correct format "+stdout);
		process.exit(3);		
	}
	// maybe old version file exists - increase patch number if necessary
	var filename = __dirname+"/version.json";
	var result = {};
	// commit, sha1: not available
	// relNumber: current date, e. g. 2014.06.11
	result.streamline = config.streamline || {
		fibers: false,
		verbose: true,
		cache: true,
	};
	result.src = res[2];
	result.comment = res[1]+" "+res[3];
	result.relNumber = new Date().toISOString().substr(0, 10).replace(/\-/g, ".");
	result.patchNumber = 0;
	var oldversion = {};
	try {
		oldversion = JSON.parse(fs.readFileSync(filename, "utf8"));
	} catch (e) { // ignore error
	}
	if (oldversion.src === result.src) {
		console.log("No change in version");
		process.exit(0);
	}
	if (oldversion.relNumber === result.relNumber) {
		result.patchNumber = (oldversion.patchNumber || 0)+1;
	}
	
	try {
		fs.writeFileSync(filename, JSON.stringify(result), "utf8");
		console.log("Successfully written "+filename);
	} catch (e) {
		console.error("Cannot write '"+filename+"': "+e);
		process.exit(4);
	}
});
