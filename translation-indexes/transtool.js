"use strict";

require("streamline").register({
	fibers: true,
	fast: true,
	verbose: true,
	cache: true
});

var fsp = require("path");
var transHelpers = require("syracuse-translation/lib/helpers");

var argv = process.argv.slice(2),
	arg;

// Exemple of use:
// node translation-indexes/transtool.js --export text

transHelpers.processCmd(argv);