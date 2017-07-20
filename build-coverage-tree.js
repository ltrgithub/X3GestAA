"use strict";
var fsp = require('path');
var fs = require('fs');

var target = '../syracuse-coverage';
var verbose = true;

require('npm-shadow')();
require('streamline').register({ runtime: 'fibers' });

var transformJs = require('streamline/lib/transformSync').transformFileSync;

function mkdirp(path) {
	if (fs.existsSync(path)) return;
	mkdirp(fsp.join(path, '..'));
	fs.mkdirSync(path);
}

function writeFile(path, text) {
	if (verbose) console.log('Creating ' + path);
	fs.writeFileSync(path, text, 'utf8');
}

function copyFile(src) {
	var dst = fsp.join(target, src);
	mkdirp(fsp.dirname(dst));
	fs.writeFileSync(fsp.join(__dirname, dst), fs.readFileSync(fsp.join(__dirname, src)));
}

function compileFile(fname) {
	var srcPath = fsp.join(__dirname, fname);
	var dstPath = fsp.join(__dirname, target, fname);
	var needsTransform = (/node_modules(\/|\\)(@sage|syracuse-).*\.(js|_js|ts)$/.test(srcPath) && 
		!/node_modules(\/|\\)@sage.*node_modules/.test(srcPath)) || (/\.(js|_js|ts)$/.test(srcPath) && 
		(!/shadow-modules/.test(srcPath) || /(streamline-require)/.test(srcPath)));
	if (needsTransform) dstPath = dstPath.replace(/\.(_js|ts)$/, '.js');
	try {
		var dstStat = fs.lstatSync(dstPath);
		var srcStat = fs.lstatSync(srcPath);
		if (srcStat.mtime.getTime() < dstStat.mtime.getTime()) return;
	} catch (ex) {}
	// take care of binary copy first
	if (/\.(node|pdf)$/.test(srcPath)) {
		fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
		return;
	}
	var source = fs.readFileSync(srcPath, 'utf8');
	var transformed = {};
	if (needsTransform) { // && !/[\///](shadow-modules|\.bin)[\///]/.test(srcPath)) {
		if (verbose) console.log("Transforming", srcPath);
		transformed = transformJs(srcPath, {
			babel: { compact: false },
		});
	} else {
		transformed.code = source;
	}
	if (transformed.code != null) writeFile(dstPath, transformed.code);
	// maps are invalid because of istanbul instrumentation
	//if (transformed.map) writeFile(dstPath.replace(/\.[^\.]+$/, '.map'), transformed.map);
}

function compileDir(dir) {
	fs.readdirSync(fsp.join(__dirname, dir)).forEach(function(sub) {
		// ignore some directories
		if (/^(lint|codecheck|html|syracuse-ui|deps|js-beautify|tedious|qunit|autoUI|node_modules|tools)$/.test(sub)) return;
		var fname = fsp.join(dir, sub);
		if (fs.lstatSync(fsp.join(__dirname, fname)).isDirectory()) {
			compileDir(fname);
		} else if (/(^coffee|\.(ts|js|_js|json|node|txt|opts|pdf))$/.test(sub) // allowed extensions
			&& !/\.d\.ts$/.test(sub) // except .d.ts
			&& (/^(([^\///]*[\///]){2}(lib|test)[\///]|([^\///]*[\///]){0,2}[^\///]*$)/.test(fname) // allowed directories
				|| /(^(import|shadow-modules)[\///])/.test(fname))) {
			mkdirp(fsp.join(__dirname, target, dir));
			compileFile(fname);
		} else copyFile(fname);
	})
}

function copyDir(dir) {
	fs.readdirSync(fsp.join(__dirname, dir)).forEach(function(sub) {
		// ignore some directories
		var fname = fsp.join(dir, sub);
		if (fs.lstatSync(fsp.join(__dirname, fname)).isDirectory()) {
			copyDir(fname);
		} else {
			mkdirp(fsp.join(__dirname, target, dir));
			copyFile(fname);
		}
	})
}

var os = require('os');

var shadowDir = 'shadow-modules/' + os.platform() + '-' + os.arch() + '-v8-' + /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
copyDir(shadowDir);
compileDir(shadowDir + "/node_modules/streamline-require");
compileDir('node_modules');
compileDir('import');
compileFile('nodelocal.js');
// we don't copy the html directories but we need this one for the cookie request
copyFile('node_modules/syracuse-main/html/main.html');
copyDir("devLic");
copyDir("node_modules/test-contract/test-fixtures");

process.exit(0);
