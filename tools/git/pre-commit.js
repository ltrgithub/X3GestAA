"use strict";
var fs = require('fs');
var exec = require('child_process').exec;
var beautify = require('js-beautify/beautify').js_beautify;

// rootDir is the root of the git repo on disk, regardless of where git commit was run from.
var rootDir = process.cwd();

var beautifyCount = 0;
var errCount = 0;

function error(msg) {
	console.error("ERROR: " + msg);
	errCount++;
}

function info(msg) {
	console.log(msg);
} 

function preCommit(file) {
	if (!fs.existsSync(file)) return; // file deleted by commit
	var contents = fs.readFileSync(file, 'utf8');
	if (contents.substring(0, 13) !== '"use strict";') error(file + ': "use strict" missing at top of file (must be first line)');
	var beautified = beautify(contents, {
		indent_char: '\t',
		indent_size: 1,
	});
	if (beautified !== contents) {
		info(file + ": beautified");
		beautifyCount++;
		fs.writeFileSync(file, beautified, 'utf8');
	}
}

exec('git diff --cached --name-only', function(err, stdout, stderr) {
	if (err) throw err;
	if (stderr) throw new Error(stderr);
	var files = stdout.split('\n');
	files = files.filter(function(f) {
		var ext = f.substring(f.lastIndexOf('.'));
		if (ext !== '.js' && ext !== '._js') return false;
		if (f.indexOf('syracuse-') < 0) return false;
		if (f.indexOf('/deps/') > 0 || f.indexOf('/node_modules/') > 0) return false;
		return true;
	});
	files.forEach(preCommit);
	if (beautifyCount > 0) console.error(beautifyCount + " files have been beautified. Please run commit again!");
	if (errCount > 0) console.error(errCount + " errors detected by pre-commit hook. Aborting!")
	process.exit(errCount > 0 || beautifyCount > 0);
})
