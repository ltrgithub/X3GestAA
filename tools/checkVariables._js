#!/usr/bin/env _node

// Usage: _node checkVariables <Directory or File>
// outputs all undeclared variables in the files (symbols known to node.js will be filtered; for files which are obviously from the client,
// also some client symbols will be filtered

"use strict";
var fs = require("fs");
var util = require("util")
var uglify = require('uglifyjs2');

var nodeGlobals = {'Buffer':'', 'require':'', 'console':'', 'process':'', '__dirname':'', '__filename':'', 'module':'', 'exports':'', 
		'Error':'', 'Array':'', 'undefined':'', 'JSON':'', 'Object':'', 'Math':'', 'TypeError':'', 'RegExp':'',
		'_':'', 'NaN':'', 'Infinity':"", 'String':'', 'Boolean':'', 'Date':'', 'Function':'', 'Number':'', 'eval':'', 'isFinite':'',
		'isNaN': '','parseInt':'','parseFloat':'','encodeURI':'', 'decodeURI':'', 'encodeURIComponent':'', 'decodeURIComponent':'',
		'setTimeout': '', 'clearTimeout': '', 'setInterval': '', 'clearInterval': ''};

var clientGlobals = { '$': '', 'document': '', 'alert': '', 'window': '', 'jQuery': ''};

var testGlobals = { 'assert': '', 'QUnit': '', 'asyncTest': '', 'start': '', 'strictEqual': '', 'ok': '', 'equals': '', 'equal': '', 'deepEqual': '', 'test': ''}

function checkFile(path, buf) {
	if (/node_modules.*node_modules/.test(path) || path.indexOf('/deps/') > 0 || path.indexOf('/test/') > 0) return;
	var code = buf.toString('utf8');
	// remove shebang
  code = code.replace(/^\#\!.*/, '');
  code = '(function(){'+code+'})';
  try {
	var top = uglify.parse(code)
	var clientCode = (path.indexOf('syracuse-ui') >= 0 || path.indexOf('/ui/') >= 0|| path.indexOf('/html/') >= 0|| path.indexOf('/client/') >= 0|| path.indexOf('/browser/') >= 0)
	var testCode = (path.indexOf('test') >= 0);
	top.figure_out_scope()
	var globals = top.globals;
	var header = path;
	var unknown = {};
	globals.each(function(a, name) {
		if (name !== 'arguments' && !(name in nodeGlobals) && !(clientCode && (name in clientGlobals))
				&& !(testCode && (name in testGlobals))){
			unknown[name] = (unknown[name] || "") + a.orig.map(function(entry) { return "["+entry.start.line+":"+entry.start.col+"]" }).join();
		}
	})
	unknown = Object.keys(unknown).sort().map(function(key) { return key+unknown[key] }).join(', ');
	if (unknown)
		console.log(path+": "+unknown)
  } catch (e) {
	  console.log("Parse error for "+path)
	  // console.log(path+": Parser error: "+e);
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
		if (ext === '.js' || ext === '._js') {
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