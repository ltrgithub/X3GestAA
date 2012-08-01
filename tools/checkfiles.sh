#!/usr/bin/env _node

"use strict";
var fs = require("fs");

var binExts = [".png", ".msi", ".exe", ".xlsx", ".mdp", ".as", ".dll", ".pdb", ".cache", ".jpg", ".jpeg", ".swf", ".doc", ".dfont", ".gif", ".pdf", ".zip", ".ttc", ".ttf", ".db"];

function scan(_, f) {
	if (f.indexOf('socket.io/support/expresso/deps/jscoverage/tests') >= 0 //
	|| f.indexOf('/dotnet/') >= 0 //
	|| f.indexOf('/junk/') >= 0) return;
	var stat = fs.lstat(f, _);
	if (stat.isDirectory()) {
		fs.readdir(f, _).forEach_(_, function(_, n) {
			if (n !== '.git' && n !== '.svn') scan(_, f + "/" + n);
		});
	} else if (!stat.isSymbolicLink()) {
		var ext = f.substring(f.lastIndexOf('.')).toLowerCase();
		if (binExts.indexOf(ext) < 0) {
			var data = fs.readFile(f, "utf8", _);
			if (data.indexOf('\r') >= 0) console.log("CR: " + f);
		}
	}
}

try {
	scan(_, process.argv[2] || '.');
} catch (ex) {
	console.error("ERROR: " + ex);
}