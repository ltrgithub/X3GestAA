"use strict";

var fs = require('streamline-fs');
var config = require("etna/lib/util/nodeconfig").config.etna;

config.SUPERV.scriptsRoot = __dirname;
var supervisor = require('etna/lib/supervisor/supervisor');

var superv = supervisor.create(_, "SUPERV");

function run(_, name) {
	console.log("running " + name);
	var script = superv.loadScript(_, name);
	require("etna/lib/engine/runtime/variables").initStack(superv);
	script.MAIN(_);
}

if (process.argv.length > 2) {
	run(_, process.argv[2]);
} else {
	fs.readdir(__dirname, _).forEach_(_, function(_, name) {
		if (/test(Db|All|Dom2)\.src/.test(name)) return; // FIX LATER
		if (/\.src$/.test(name)) run(_, name.substring(0, name.length - 4));
	});
}
process.exit(0);