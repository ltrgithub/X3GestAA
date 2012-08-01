#!/usr/bin/env _node

"use strict";
var fs = require("fs");

var binExts = [".png", ".ico", ".msi", ".exe", ".xlsx", ".mdp", ".as", ".dll", ".pdb", ".cache", ".jpg", ".jpeg", ".swf", ".doc", ".dfont", ".gif", ".pdf", ".zip", ".ttc", ".ttf", ".db", ".ds_store"];

var CR = '\r'.charCodeAt(0);
var LF = '\n'.charCodeAt(0);

function checkFile(path, buf) {
	var line = 1;
	for (var i = 0, len = buf.length; i < len; i++) {
		var ch = buf[i];
		if (ch === CR) {
				console.log(path + ":" + line + ": CR");
			return;
		} else if (ch === LF) {
			line++;
		} else if ((ch & 0x80) === 0 && ((ch = buf[i + 1]) & 0x80) !== 0) {
			var n = 1;
			while (n <= 8 && (ch & (1 << (7 - n))) !== 0) n++;
			var ok = true;
			if (n === 1) ok = false; // first byte cannot be 10xxxxxx
			for (var j = 2; j <= n; j++) {
				if ((buf[i + n] & 0xc0) !== 0x80) ok = false; // following byte is not 10xxxxxx
			}
			if (!ok) {
				console.log(path + ":" + line + ": non UTF-8");
				return;
			}
		}
	}
}

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
			var data = fs.readFile(f, _);
			checkFile(f, data);
		}
	}
}

try {
	scan(_, process.argv[2] || '.');
} catch (ex) {
	console.error("ERROR: " + ex);
}