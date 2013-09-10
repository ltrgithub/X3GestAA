"use strict";

require("streamline").register({
	fibers: false,
	verbose: true,
	cache: true
});

var gen = require("syracuse-github/lib/changelog");
var sys = require("util");

gen.makeChangelog(function(err, res) {
	if (err) return console.error(err);
	console.log(sys.inspect(res));
}, "Sage-ERP-X3", "Syracuse");