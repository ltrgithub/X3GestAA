"use strict";
/// Agent for restarting the Syracuse service and for handling patch integration
/// This file is completely independent of the other source files of the Syracuse installation
/// and will be copied to a separate place in the setup. 

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');
var config = require('./parameters').config;
if (config.serviceName.charAt(0) === '$') config.serviceName = 'syracuse';

if (process.platform === 'win32') {
	var SHELL_EXT = '.cmd';
	var SVC_CTRL = 'net';
	var LIST_SERVICES = 'net start';
	var AGENT_NAME = 'Agent ' + config.serviceName;
	var STARTED_MESSAGE = '\r\n   ' + config.serviceName + '\r\n';
} else {
	config.serviceName = config.serviceName.toLowerCase().replace(/ /g, "");
	var SHELL_EXT = '.sh';
	var SVC_CTRL = config.serviceCtrl;
	var LIST_SERVICES = ((SVC_CTRL == 'initctl') ? 'initctl list' : 'systemctl show ' + config.serviceName);
	var AGENT_NAME = config.serviceName + "-agent";
	var STARTED_MESSAGE = ((SVC_CTRL == 'systemctl') ? 'ActiveState=active' : '\n' + config.serviceName + ' start/running,');
}
var TEMP_PATH = path.join(config.basePath, config.temporaryPath);
var AGENT_FILE = path.join(TEMP_PATH, 'node_modules/@sage/syracuse-lib/src/load-balancer/syragent.js');
var NODE_FILE = path.join(TEMP_PATH, config.nodePath, 'node');
var AUTOUPDATE = path.join(__dirname, 'autoupdate' + SHELL_EXT);
var SHUTDOWN_SEMAPHORE = path.join(__dirname, 'shutdown.txt');
var VERSION_FILE = path.join(config.basePath, 'version.json');
var TEMP_VERSION_FILE = path.join(TEMP_PATH, 'version.json');
var START_SYRACUSE = SVC_CTRL + ' start "' + config.serviceName + '"';
var STOP_SYRACUSE = SVC_CTRL + ' stop "' + config.serviceName + '"';
var START_AGENT = SVC_CTRL + ' start "' + AGENT_NAME + '"';
var START_AGENT_LOG = path.join(config.logPath, "agent_" + config.serviceName + "_autoupdate.log");

function debugTrace(error, stdout, stderr) {
	if (config.debugMode) {
		if (error !== null) {
			console.log('exec error: ' + error.toString());
		}
		console.log('stdout:');
		console.log(stdout);
		console.log('stderr:');
		console.log(stderr);
	}
}

function printError(error, stdout, stderr) {
	console.log('exec error: ' + error.toString());
	console.log('stdout:');
	console.log(stdout);
	console.log('stderr:');
	console.log(stderr);
}

function startService(error, stdout, stderr) {
	debugTrace(error, stdout, stderr);
	if (error !== null) {
		console.log(new Date().toISOString() + ' Could not start service "' + config.serviceName + '" !');
		printError(error, stdout, stderr);
		setTimeout(agentCallback, config.timeoutDelay);
	} else {
		console.log(new Date().toISOString() + ' Service started successfully !');
		setTimeout(agentCallback, config.timeoutDelay);
	}
}

function doPatch(error, stdout, stderr) {
	debugTrace(error, stdout, stderr);
	if (error !== null) {
		console.log(new Date().toISOString() + ' Error during patch integration !');
		printError(error, stdout, stderr);
		console.log(new Date().toISOString() + ' Emergency exit !');
		emergencyExit();
	} else {
		console.log(new Date().toISOString() + ' Patch integration finished successfully !');
		console.log(new Date().toISOString() + ' Starting service "' + config.serviceName + '" ...');
		exec(START_SYRACUSE, startService);
	}
}

function emergencyExit() {
	//shutdown in progress
	console.log(new Date().toISOString() + ' Current thread must exit !');
	try {
		fs.unlinkSync(SHUTDOWN_SEMAPHORE);
	} catch (e) {
		console.log(new Date().toISOString() + ' ' + e.message);
	}
	console.log(new Date().toISOString() + ' Semaphore removed');
	process.exit(0);
}

function checkService(error, stdout, stderr) {
	debugTrace(error, stdout, stderr);
	if (error !== null) {
		console.log(new Date().toISOString() + ' Could not check service "' + config.serviceName + '" !');
		printError(error, stdout, stderr);
		emergencyExit();

	} else {
		if (stdout.indexOf(STARTED_MESSAGE) >= 0) {
			if (config.debugMode) {
				console.log(new Date().toISOString() + ' Service "' + config.serviceName + '" is up and running !');
			}
			setTimeout(agentCallback, config.timeoutDelay);
		} else {

			if (fs.existsSync(SHUTDOWN_SEMAPHORE)) {
				emergencyExit();

			} else {

				console.log(new Date().toISOString() + ' Service "' + config.serviceName + '" is down !');
				console.log(new Date().toISOString() + ' Checking for patch integration before starting the service ...');

				if (fs.existsSync(VERSION_FILE) && fs.existsSync(TEMP_VERSION_FILE)) {
					var baseVersion = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
					var tempVersion = JSON.parse(fs.readFileSync(TEMP_VERSION_FILE, "utf8"));

					console.log(new Date().toISOString() + ' Base version: ' + baseVersion.relNumber + '.' + baseVersion.patchNumber);
					console.log(new Date().toISOString() + ' Patch version: ' + tempVersion.relNumber + '.' + tempVersion.patchNumber);

					//var data = { release: version.relNumber, patch: version.patchNumber };
					if (baseVersion.relNumber === tempVersion.relNumber && baseVersion.patchNumber === tempVersion.patchNumber) {
						console.log(new Date().toISOString() + ' No need to patch!');
						console.log(new Date().toISOString() + ' Starting service "' + config.serviceName + '" ...');
						exec(START_SYRACUSE, startService);
					} else {
						console.log(new Date().toISOString() + ' Need to patch!');
						// Agent should only restart itself when its source file has changed
						if (fs.existsSync(AGENT_FILE) && fs.readFileSync(AGENT_FILE, "utf8") !== fs.readFileSync(__filename, "utf8")) {
							agentPatch();

						} else {
							console.log(new Date().toISOString() + ' Applying patch ...');
							exec('"' + NODE_FILE + '" index.js PATCH', {
								cwd: TEMP_PATH,
								maxBuffer: 1024 * 1024
							}, doPatch);
						}
					}
				} else {
					console.log(new Date().toISOString() + ' File ' + VERSION_FILE + ' not found !');
					console.log(new Date().toISOString() + ' Could not check for patch integration !');
					console.log(new Date().toISOString() + ' Starting service "' + config.serviceName + '" ...');
					exec(START_SYRACUSE, startService);
				}
			}
		}
	}
}

function agentCallback() {
	if (config.debugMode) {
		console.log(new Date().toISOString() + ' Checking service "' + config.serviceName + '" ...');
	}
	exec(LIST_SERVICES, checkService);
}


function agentPatch() {
	console.log(new Date().toISOString() + ' Agent patch found!');
	console.log(new Date().toISOString() + ' Need to auto-update ...');

	var content;

	var REDIR = ' >>"' + START_AGENT_LOG + '" 2>&1';
	if (process.platform === 'win32') {
		content = 'copy /y "' + AGENT_FILE + '" "' + __dirname + '\\syragent.js" ' + REDIR + '\r\n' + 'if ERRORLEVEL 1 EXIT/B 0\r\n' + 'copy /y "' + NODE_FILE + '.exe' + '" "' + __dirname + '\\node.exe" ' + REDIR + '\r\n' + 'if ERRORLEVEL 1 EXIT/B 0\r\n' + START_AGENT + REDIR + '\r\n';
	} else {
		content = 'if cp -f "' + AGENT_FILE + '" "' + __dirname + '/syragent.js"' + REDIR + ' && ' + 'cp -f "' + NODE_FILE + '" "' + __dirname + '/node"' + REDIR + ' ; then\n' + START_AGENT + REDIR + ' ; fi\n';
	}
	fs.writeFileSync(AUTOUPDATE, content);

	var command = "";
	var date = new Date(Date.now() + 80000);
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	console.log(new Date().toISOString() + ' Scheduling autoupdate task ...');
	if (process.platform === 'win32') {
		command = 'at ' + hour + ':' + min + ' cmd /c "' + AUTOUPDATE + '"';
	} else {
		command = 'at -f "' + AUTOUPDATE + '" ' + hour + ':' + min;
	}
	exec(command, function(error, stdout, stderr) {
		var output = "Invoke " + command + "\n";
		if (error) {
			output += "Error: " + error;
		}
		if (stdout) {
			output += "stdout: " + stdout;
		}
		if (stderr) {
			output += "stderr: " + stderr;
		}
		fs.writeFileSync(START_AGENT_LOG, output);
		console.log(new Date().toISOString() + ' Exiting now.');
		process.exit(0);
	});
}

function _checkPath(path) {
	try {
		fs.statSync(path);
	} catch (e) {
		return false;
	}
	return true;
}

function _copy(srcRoot, dstRoot, name) {
	var srcDir = path.join(srcRoot, name);
	if (srcDir.match(/\.git.*/)) return;
	var stSrc = fs.statSync(srcDir);
	if (stSrc.isDirectory()) {
		var destDir = path.join(dstRoot, name);
		if (!_checkPath(destDir)) fs.mkdirSync(destDir);
		var files = fs.readdirSync(srcDir);
		files.forEach(function(ff) {
			_copy(srcDir, destDir, ff);
		});
	}
	if (stSrc.isFile()) {
		var destFile = path.join(dstRoot, name);
		fs.writeFileSync(destFile, fs.readFileSync(srcDir)); // TODO: Use streams !
	}
}

function startAgent() {
	if (fs.existsSync(AUTOUPDATE)) fs.unlinkSync(AUTOUPDATE);
	if (fs.existsSync(SHUTDOWN_SEMAPHORE)) fs.unlinkSync(SHUTDOWN_SEMAPHORE);
	// copy extension files into node_modules directory
	try {
		var nodeconfig = path.join(config.basePath, "nodelocal.js");
		var nodeconfig = require(nodeconfig).config;
		if (nodeconfig && nodeconfig.extensions && nodeconfig.extensions.modules) {
			var modules_path = path.join(config.basePath, "node_modules");
			var rr = nodeconfig.extensions.root || path.join(config.basePath, "..", "extensions");
			var root = ((path.isAbsolute ? path.isAbsolute(rr) : /^(?:\/|(?:[A-Za-z]\:)?\/)/.test(rr)) || _checkPath(rr)) ? rr : path.join(config.basePath, rr);
			//
			nodeconfig.extensions.modules.forEach(function(ee) {
				if (ee.active === false) return;
				if (!ee.path) return console.log("No path defined for extension package");
				var pp = _checkPath(ee.path) ? ee.path : path.join(root, ee.path);
				if (!_checkPath(pp)) return console.log("Invalid path for extension '" + pp + "'");
				var pkgPath = path.join(pp, "package.json");
				if (!_checkPath(pkgPath)) return console.log("package.json not found at '" + pkgPath + '"');
				//
				try {
					var pkg = JSON.parse(fs.readFileSync(pkgPath));
					if (!pkg.name) return console.log("Missing 'name' property in package.json at '" + pkgPath + "'");
					// check if extension is present
					var destPath = path.join(modules_path, pkg.name);
					if (_checkPath(destPath) && ee.forceAgentUpdate !== true) {
						// extension is there : TODO - check the version then update if more recent
					} else {
						console.log("Copy extension '" + ee.path + "' to " + destPath);
						_copy(pp, destPath, "");
					}
				} catch (e) {
					console.log("Error installing extension at '" + pp + "', error: " + e.message);
				}
			});
		}
	} catch (e) {
		console.error("Error during extension handling: " + e);
	}

	console.log(new Date().toISOString() + " START!");
	agentCallback();
}

if (process.argv.length >= 3) {
	if (process.argv[2] === 'stop') {
		console.log(new Date().toISOString() + ' About to exit ...');
		console.log(new Date().toISOString() + ' Stopping service "' + config.serviceName + '" ...');
		fs.writeFileSync(SHUTDOWN_SEMAPHORE, new Date().toISOString() + ' Shutting down "Agent ' + config.serviceName + '"\r\n');
		exec(STOP_SYRACUSE, function(error, stdout, stderr) {
			process.exit(0);
		});
		console.log(new Date().toISOString() + ' Exiting now.');

	} else {
		// improper use
		// do nothing for now
		// TODO throw exception and exit
	}
} else startAgent();