"use strict";

require("streamline").register({
	// fibers: true,
	// fast: true,
	verbose: true,
	cache: true
});

var transHelpers = require("syracuse-translation/lib/helpers");

transHelpers.autoFillIndexes(function(err, res) {
	if (err) return console.error(err);
});