"use strict";

require("streamline").register({
	// fibers: true,
	// fast: true,
	verbose: true,
	cache: true
});

var fsp = require("path");
var transHelpers = require("syracuse-translation/lib/helpers");

var argv = process.argv.slice(2),
	arg;

// Exemple of use:
// node translation-indexes/transtool.js --export text

function processCmd() {
	var cmd = {}, param;
	console.log(argv);
	for (var i = 0, len = argv.length; i < len; i++) {
		arg = argv[i];
		if (arg.substr(0, 2) === '--') {
			arg = arg.substr(2).toLowerCase();
			switch (arg) {
			case "autofill":
				return transHelpers.autoFillIndexes(reportError);
			case "export":
				param = argv[i + 1];
				param = param.substr(0,1).toUpperCase() + param.substr(1).toLowerCase();
				return transHelpers["exportTo" + param](reportError);
			case "extract":
				param = argv[i + 1];
				param = param.substr(0,1).toUpperCase() + param.substr(1).toLowerCase();
				return transHelpers["extract" + param](reportError);
			case "tmx":
				return transHelpers.exportToTmx(reportError, fsp.join(__dirname, argv[i + 1]));
			}
		}
	}
}

function reportError(err, res) {
	if (err) return console.error(err);
}

processCmd();