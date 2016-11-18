"use strict";
// Syracuse Load balancer
var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;
var http = require('http');
var https = require('https');
var dbDriver = require('./dbDriver');
var util = require('util');
var os = require('os');
var fs = require('streamline-fs');
var child_process = require('child_process');
var mock = require('./mock');
var recorder = require('./recorder');
var jsx509 = require('jsx509');
var crypto = require('crypto');
var certTools = require('./certTools');
var flows = require('streamline-runtime').flows;
var EngineioClient = require('engine.io-client');

var certificateFunnel = flows.funnel(1);
var startChildrenFunnel = flows.funnel(1);
var balancerFunnel = flows.funnel(1);


// store data for second request of certificate generation tool
var certGenToolData;

var tracer; //= console.log;
var sessionTracer; //= console.log;
var sessionTracer; //= console.log;

//requests which are not in a session, are counted here. They will be regarded for load balancing in addition to the
//sessions according to the session table
var currentNewRequests = {};

// redirects should be returned to the same server
var redirects = {};

// restricted sessions belong to a child process in restricted mode. This child process can still accept requests of active sessions but cannot
// accept any new sessions any more.
var restrictedSessions = {}; //
var restrictedServers = []; // child processes with too much memory consumption will be moved here

// dedicated sessions: session id has been assigned to a certain Syracuse process using nannyCommand/attach
// this will be used to find the correct Syracuse process until a real new Syracuse session has been created.
// (then the corresponding key will be deleted)
var dedicated = {};

// Currently balanced sessions. It may happen that there are 2 requests from the same client which have to do with the same new session but the 
// second request comes before the first has been balanced. Then the second request must wait until the first has been balanced, and then will receive the 
// chosen host of the first request. Keys: if there is a syracuse.sid cookie for this request, this will be the key, otherwise the key will be the local 
// port number plus the complete cookie content (when there is no cookie, it is assumed that there will be no
// parallel requests - this usually only happens in the very beginning). When the first balancing is done, the value will be an array with empty 
// first entry. When there are more balancing requests before the first balancing has been done, the callbacks of them will be appended to this array.
// When the first balancing is finished, the previously collected callbacks will be called (with the obtained host data) and the array replaced by an array
// consisting of hostdata and the current time. When there are more balancing requests, they can directly obtain the hostdata.
// The key will be removed when there is a new syracuse.sid at the end of the request or otherwise after 10 minutes.
var currentlyBalanced = {};

//http servers for nanny
var httpServers = [];

//certificates for internal purpose
var ownCertificate = null;
//Diffie Hellman object (only initialized when there are certificates available)
var diffieHellman;
var caHash = null;
//list of certificates (from DB and from files)
var certificates;
var caCertificates;

//local directory with certificates
var certDirectory;
// local host name in lowercase
var lcHostName = os.hostname().toLowerCase();

// local load balancing
var localBalancer;


// session collection for load balancing
var sessionCollection;

var config;
var db = null; // Database handle

var tenantDbObject; // Database for tenant: object with tenantId, timestamp of last use, actual database connection
var tenantDbCollection = []; // Collection of tenant databases (for some caching)

//file for version information at customer's site (redundant name - also in syracuse-patch/lib/patchtools._js)
var VERSION_FILE = "version.json";
//special header for transporting client authorization information during load balancing
var SSL_HEADER = "syracusesslheader"; // special Http header for passing load balancing information

// wait time between starting Syracuse instances
var STARTUP_WAIT_TIME = 100;

//maximal allowed time difference between servers in milliseconds
var TIME_THRESHOLD = 600000;
//maximal number of requests between database time checks (will be multiplied with number of hosts)
var REQUEST_THRESHOLD = 1000;
//time in milliseconds for a child process to wait after it has started (allow long lasting database initialization)
var PING_TIMEOUT = 1000000;
//polling interval for looking into database during stopping sessions
var POLL_INTERVAL = 3000;
//time which will remain to stop sessions
var POLL_TIME = 60000;
//10 seconds timeout for nanny stop function
var STOP_TIMEOUT = 10000;
//200 seconds timeout for get requests to other nanny processes
var REQUEST_TIMEOUT = 200000;

//status values: >= 0: notify for database updates, >= STATUS_INIT: child processes are possible; === STATUS_READY: notify for normal requests; <0: host cannot be used because of errors
//this list must fit to the status property of the host entity
var STATUS_INACTIVE = 0; // nanny inactive
var STATUS_INIT = 1; // initial status
var STATUS_START = 2; // starting child processes
var STATUS_READY = 3; // ready OK
var STATUS_FINISHING = 4; // server will stop soon (waiting for local sessions to stop)
var STATUS_FINISHING2 = 5; // server will stop soon (waiting for all sessions to stop)
var STATUS_LOW_VERSION = -1; // host has low version compared to database entries
var STATUS_WRONG_VERSION = -2; // host has wrong version in cluster
var STATUS_TIME_DIFFERENCE = -3; // host deactivated because of time difference
var STATUS_RESPAWN = -4; // respawn limit of child processes exceeded
var STATUS_FOREIGN = -5; // initial status for foreign server
var STATUS_NOT_REACHABLE = -6; // timeout when reaching server
var STATUS_NOT_STARTED = -7; // server has not been started
var STATUS_NO_DB = -8; // no database connection
var STATUS_NO_LICENSE = -9; // no license

var CHILD_PING2_TIMEOUT = 10000; // default value for timeout for child status pinging (millis)
var CHILD_PING2_POLLING = 60000; // default value for polling for child status (millis)
var MAX_RESTRICTED_CHILDREN = 10; // maximal number of restricted former child processes
var CHILD_SLIDING_MEAN = 20; // the old entry counts as this percentage, the new value will be added by the remaining percentage
var BALANCING_WAIT_TIME = 600; // wait this number of milliseconds to get results of other servers

var databaseTimeFunnel = flows.funnel(1);
//time and number of requests since last database time comparison, diff: is the database time minus the local time
//(this means that an approximation for database time can be obtained by Date.now()+diff)
var databaseTime = {
	time: 0,
	requests: 0,
	diff: 0,
	handled: false,
	getTime: function(_, check) {
		var now = Date.now();
		if (now < this.time || now - this.time > TIME_THRESHOLD || ++this.requests > REQUEST_THRESHOLD * hosts.length) {
			var self = this;
			self.handled = false;
			// avoid multiple database queries because of race conditions
			databaseTimeFunnel(_, function(_) {
				if (!self.handled) {
					self.time = now;
					self.requests = 0;
					self.handled = true;
					// get time from database
					try {
						var dbTime = dbDriver.time(db, _);
					} catch (e) {
						localHost.status = STATUS_NO_DB;
						self.diff = 0;
						console.error("Error during database time check " + e);
						return;
					}
					if (dbTime == undefined) { // null or undefined, therefore comparison with "=="
						localHost.status = STATUS_NO_DB;
						self.diff = 0;
						console.error("Database time is null or undefined");
						return;
					}
					self.diff = dbTime - now;
					tracer && tracer("database time check--" + dbTime + " difference " + self.diff);
				}
			});
		}
		if (check && (this.diff > TIME_THRESHOLD || -this.diff > TIME_THRESHOLD)) {
			throw new Error(locale.format(module, "timeDiff"));
		}
		return now + this.diff;
	},
	getReducedTime: function(_) {
		return Math.floor(this.getTime(_) / 180000);
	}
};

//list of sessions known to this balancer
var sessions = {}; // keys are Syracuse session ID's, values are corresponding server names and ports (as an array)
// list of sessions known to this balancer which have not yet been found in the database
var nonDBSessions = {};
var hosts = []; // list of different Syracuse hosts, with attributes from host entity and the following extra attributes:
//version: Syracuse version (system is only usable when all versions are equal)
//status: see STATUS_... constants above
//missingCert, missingCA: missing certificate data (contains the logical names of the instances of the (CA) certificate entity
// loaddata: load data for children
//for which there are no files or corrupt files in the file system
var hostsByName = {};
var localHost = null; // local host within hosts array
hosts.mainVersion = ""; // main version of the cluster (will be set upon first response of another server or when no server responds)
var children = []; // child processes ("N"+ind will be logical port of child with index 'ind')
var wsChildren = []; // child processes for Web services ("W"+ind will be logical port of child with index 'ind')
var batchChild = null; // child process for batch server 
var lastWs = 0; // index of last web service call
var startupText = {
	cnt: 0,
	err: ""
}; // Log messages during startup (in status STATUS_START)

function _copyFluentData(target, source) {
	target.version = source.version;
	target.status = source.status;
	target.missingCert = source.missingCert;
	if (localHost && source.hostname === localHost.hostname) {
		// use compact format to transfer child data to other hosts
		target.loaddata0 = children.map(function(child) {
			if (child) {
				return child.syratime;
			} else {
				return undefined;
			}
		});
	} else {
		if (source.loaddata)
			target.loaddata = source.loaddata;
		if (source.loaddata0) { // expand compact format, only update/set 'syratime'
			if (!target.loaddata) {
				target.loaddata = source.loaddata0.map(function(entry) {
					return {
						syratime: entry
					};
				});
			} else {
				var i = target.loaddata.length = source.loaddata0.length;
				while (--i >= 0) {
					if (target.loaddata[i]) target.loaddata[i].syratime = source.loaddata0[i];
					else target.loaddata[i] = {
						syratime: source.loaddata0[i]
					};
				}
			}
		}
	}

	if (target.deactivated && target.status > STATUS_INACTIVE) target.status = STATUS_INACTIVE;
	target.missingCA = source.missingCA;
	target.untrusted = source.untrusted;
	target.batchChildren = source.batchChildren;
}

//stringifies information for host array. Only stringifies the non-database fields and the hostname

function _stringifyHosts(h) {
	return JSON.stringify(h.map(function(host) {
		return _minifyHost(host);
	}));
}

function _minifyHost(h, extra) {
	var result = {
		hostname: h.hostname,
		extra: extra
	};
	_copyFluentData(result, h);
	tracer && tracer("Minify host " + util.format(result));
	return result;
}

//fills in SSL options

function sslOptions(connectionData, options) {
	if (connectionData.ssl) {
		if (!ownCertificate) return http; // TODO: or error message?
		options.ca = getCaCertificates(connectionData.serverCert);
		if (connectionData.clientAuth) {
			var cert = (connectionData.clientCert ? connectionData.clientCert : ownCertificate);
			options.cert = cert.certificate;
			var cas = getCaCertificates(cert);
			if (cas) {
				options.ca = options.ca || [];
				cas.forEach(function(caCert) {
					options.ca.push(caCert);
				});
			}
			options.key = cert.key;
			// options.ca = getCaCertificates(cert);
			options.passphrase = cert.pass;
			options.agent = false;
		}
		// console.log("OPTIONS "+util.format(options))
		tracer && tracer("Client https");
		return https;
	} else {
		tracer && tracer("Client http");
		return http;
	}

}


function findClient(request) {
	tracer && tracer("FIND CLIENT");
	mock.getLocalPort(request);
	if (request.headers && request.headers[mock.BALANCER_HEADER]) {
		var re = /^N(\d+)/.exec(request.headers[mock.BALANCER_HEADER]);
		if (re) {
			console.log("Direct to child " + re[1] + " // " + request.headers[mock.BALANCER_HEADER]);
			return children[re[1]].mockClient;
		}
	}

	var newSession = _getSyracuseCookie(request);
	var hostport = sessions[newSession];
	if (!hostport) {
		console.log(new Date().toISOString() + "Session not available: " + newSession + " " + request.connection.localPort + " " + mock.getLocalPort(request) + " " + request.headers.cookie);
		return undefined;
	}
	if (hostport[0].hostname !== localHost.hostname) {
		tracer && tracer("Mock client of " + hostport[0].hostname);
		if (!request.headers[mock.BALANCER_HEADER]) {
			request.headers[mock.BALANCER_HEADER] = hostport[1];
			tracer && tracer("SET IO balancer HEADER " + hostport[1]);
		}
		return hostport[0].mockClient;
	}
	var child = children[hostport[1].substr(1)];
	if (!child) { // child process is restarted - session does not exist any more. Wait for new client
		return undefined;
	}
	var client = child.mockClient;
	tracer && tracer("Found child " + hostport[1].substr(1));
	return client;
}

function _onResponseError(err) {
	console.log("Response error " + (err.stack || err));
}

function startServer(_) {
	if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
	var i;

	function generateListener(localPort) {
		return function(request, response) {
			response.on('error', _onResponseError) // there must be at least one error handler;
			return requestListener(request, response, function(error, data) {
				if (error) {
					console.error("Error " + util.format(error) + (error.stack ? " stack " + error.stack : ""));
				}
			}, localPort || 0);
		};
	};
	for (i = 0; i < localHost.connectionData.length; i++) {
		var connectionData = localHost.connectionData[i];
		if (!httpServers[i] && connectionData.active) {
			var port0 = connectionData.port;
			if (connectionData.ssl) {
				var cert = connectionData.serverCert;
				if (cert && cert.key && cert.certificate) {
					var ca = getCaCertificates(cert);
					if (connectionData.clientAuth) {
						// add CA certificates of client certificate
						ca = ca || [];
						var clcert = connectionData.clientCert;
						if (i === 0 && !clcert) { // for internal connections
							clcert = ownCertificate;
						}
						var cas = getCaCertificates(clcert);
						cas = cas || [];
						if (clcert && cas.length === 0) {
							cas.push(clcert.certificate);
						}
						cas.forEach(function(caCert) {
							ca.push(caCert);
						});
					}
					var options = {
						key: cert.key,
						cert: cert.certificate,
						passphrase: cert.pass,
						ca: ca,
						requestCert: connectionData.clientAuth,
						rejectUnauthorized: connectionData.clientAuth
					};
					tracer && tracer("SSL options " + util.format(options));
					httpServers[i] = https.createServer(options, generateListener(port0));
					console.log("SSL Server running at " + port0);
				} else {
					console.error("Not enough certificate information to start SSL connection on port " + port0);
					continue;
				}
			} else {
				httpServers[i] = http.createServer(generateListener(port0));
				console.log("Server running at " + port0);
			}
			mock.attachEngineIO(null, httpServers[i], findClient, transferSocket);
			httpServers[i].on('error', function(err) {
				if (err.code == 'EADDRINUSE') console.error(locale.format(module, "eaddrinuse", port0));
				else console.error("Error on port " + port0 + ": " + err.stack);
				process.exit(1);
			});
			httpServers[i].listen(port0, config.system.bindIP); // if bindIP is null, listen to IP_ANY => IPV4

		}
	}
}

function getCaCertificates(cert) {
	if (cert && !cert.name && ownCertificate) { // internal certificate of other server is deliberately not available (see addCertificateData): set CA certificate of local server
		cert = ownCertificate;
	}
	if (!cert) return [];
	var cacerts = cert.caCertificates;
	var ca;
	if (cacerts && cacerts.length) {
		ca = cacerts.map(function(caCert) {
			if (caCert) {
				return caCert.certificate;
			} else {
				return null;
			}
		});
	}
	return ca;
}

// kill child processes, allowing them to stop logging
// if index is undefined, shut down all child processes
// otherwise shut down the named process
function killWithNotification(_, index, ws, batch) {
	var options = {
		path: "/logging/halt",
		method: "GET",
		fromNanny: true
	};
	if (index === undefined) {
		var futures = [];
		for (var i = children.length - 1; i >= 0; i--) {
			console.log("Stop logging N" + i);
			var child = children[i];
			if (child) futures.push(child.mockClient.simpleRequest(options, undefined, !_));
		}
		for (var i = wsChildren.length - 1; i >= 0; i--) {
			console.log("Stop logging W" + i);
			var child = wsChildren[i];
			if (child) futures.push(child.mockClient.simpleRequest(options, undefined, !_));
		}
		if (batchChild) {
			console.log("Stop logging B0");
			futures.push(batchChild.mockClient.simpleRequest(options, undefined, !_));
		}
		var i = futures.length;
		while (--i >= 0) {
			if (futures[i]) {
				try {
					futures[i](_);
				} catch (e) {
					console.log("Error stopping logging at N" + i + ": " + (e.stack || e));
				}
			}
		}
		var i = children.length;
		while (--i >= 0) {
			var child = children[i];
			if (child) {
				children[i] = undefined;
				child.terminate = true;
				child.kill();
			}
		}
		var i = wsChildren.length;
		while (--i >= 0) {
			var child = wsChildren[i];
			if (child) {
				wsChildren[i] = undefined;
				child.terminate = true;
				child.kill();
			}
		}
		if (batchChild) {
			if (localHost) localHost.batchChildren = 0;
			batchChild.terminate = true;
			batchChild.kill();
			batchChild = undefined;
		}

	} else {
		console.error("Kills " + index);
		if (batch) {
			var child = batchChild;
		} else {
			var childList = (ws ? wsChildren : children);
			var child = childList[index];
		}
		if (child) {
			console.error("Kills " + index);
			child.mockClient.simpleRequest(options, undefined, _);
			if (batch) {
				batchChild = undefined;
				if (localHost) localHost.batchChildren = 0;
			} else childList[index] = undefined;
			child.terminate = true;
			child.kill();
		}
	}

}

// terminate child processes immediately
function killChildren() {
	if (children.length > 0) {
		tracer && tracer("Kill child processes");
		children.forEach(function(child) {
			if (child) {
				child.terminate = true;
				child.kill();
			}
		});
		children.length = 0;
	}
	if (wsChildren.length > 0) {
		tracer && tracer("Kill ws child processes");
		wsChildren.forEach(function(child) {
			if (child) {
				child.terminate = true;
				child.kill();
			}
		});
		wsChildren.length = 0;
	}
	if (batchChild) {
		tracer && tracer("Kill batch child process");
		batchChild.terminate = true;
		batchChild.kill();
	}
}

process.on('exit', function() {
	dbDriver.close(db);
	killChildren();
});

//send a http request to a host.
//host: in hosts array
//command: command to send
//return: data of response.

function get(hostdata, method, path, data, _, timeout) {
	var address;
	if (hostdata.local) {
		address = "localhost";
	} else {
		address = hostdata.hostname;
		if (hostdata.tcpHostName) {
			address = hostdata.tcpHostName;
		}
	}
	var options = {
		method: method || 'GET',
		hostname: address,
		port: hostdata.connectionData[0].port,
		path: path,
		timeout: timeout
	};
	try {
		var foundHost = hostsByName[hostdata.hostname]; // set pending request (always get foundHost from hostsByName - there may have been an update request which
		// has updated the hosts array
		if (foundHost) {
			foundHost.pendingRequest = true;
		}
		var client = sslOptions(hostdata.connectionData[0], options);
		var result = mock.simpleRequest(client, options, data, _);
		foundHost = hostsByName[hostdata.hostname];
		if (foundHost) {
			foundHost.pendingRequest = false;
		}
		return result;
	} catch (e) {
		if (!e.STATUS_CODE || e.STATUS_CODE >= 500) {
			var foundHost = hostsByName[hostdata.hostname];
			if (foundHost && foundHost.pendingRequest) { // maybe the other host has sent a start signal inbetween (and therefore set 'pendingRequest' to false).
				// in this case the timeout should not make the server unreachable.
				foundHost.pendingRequest = false;
				foundHost.status = STATUS_NOT_REACHABLE;
				_markTrusted(foundHost, true); // unreachable host cannot be untrusted
				console.log("not reachable " + hostdata.hostname);
			}
		}
		console.error("Warning: " + hostdata.hostname + " " + e);
		throw e;
	}
}

// mark a host as untrusted or trusted. Return code: has this resulted in changes?

function _markTrusted(host, trusted) {
	tracer && tracer("MARK TRUSTED " + host.hostname + " " + trusted);
	if (!localHost.untrusted) return false;
	var index = localHost.untrusted.indexOf(host.hostname);
	if (!trusted) {
		if (index < 0) {
			localHost.untrusted.push(host.hostname);
			return true;
		}
	} else {
		if (index >= 0) {
			localHost.untrusted.splice(index, 1);
			return true;
		}
	}
	return false;
}

//update certificate data

function _fillData(certInstance, certObject) {
	var changed = false;
	var value = certObject.issuer;
	if (!certTools.deepEqual(certInstance.issuer, value)) {
		certInstance.issuer = value;
		changed = true;
	}
	value = certObject.subject;
	if (!certTools.deepEqual(certInstance.subject, value)) {
		certInstance.subject = value;
		changed = true;
	}
	value = new Date(certObject.notBefore).toISOString();
	if (certInstance.notBefore !== value) {
		certInstance.notBefore = value;
		changed = true;
	}
	value = new Date(certObject.notAfter).toISOString();
	if (certInstance.notAfter !== value) {
		certInstance.notAfter = value;
		changed = true;
	}
	return changed;
}

/// main function

function start(conf, _) {
	switch (process.argv[2]) {
		case "?":
		case "help":
		case "--help":
			console.log("Valid commands: ");
			console.log("node nanny install <Port> <Number> [license file]\n  Install process with port <Port> for nanny process, <Number> child processes.\n  The optional license file argument allows to include a license file into database");
			console.log("node nanny\n (or: node nanny run) start nanny process");
			console.log("node nanny stop\n  ask running nanny process to stop");
			console.log("node nanny remove\n  Remove data for host process");
			console.log("node nanny help\n  This help text");
			helpers.uuid.clearTimeout();
			return 0;
	}
	config = conf;
	config.servername = os.hostname();
	if (/^host=/.test(process.argv[2])) {
		config.servername = process.argv[2].substr(5);
		lcHostName = config.servername.toLowerCase();
		process.argv.splice(2, 1);
	}
	config.collaboration = config.collaboration || {};
	config.hosting = config.hosting || {};
	config.system = config.system || {};
	config.nanny = config.nanny || {};
	CHILD_PING2_POLLING = config.nanny.childPingStatusPolling || CHILD_PING2_POLLING;
	CHILD_PING2_TIMEOUT = config.nanny.childPingStatusTimeout || CHILD_PING2_TIMEOUT;
	CHILD_SLIDING_MEAN = (config.nanny.childSlidingMean || CHILD_SLIDING_MEAN) / 100;
	if (CHILD_SLIDING_MEAN < 0 || CHILD_SLIDING_MEAN > 1) throw new Error("Value of childSlidingMean must be between 0 and 100");
	BALANCING_WAIT_TIME = config.nanny.balancingWaitTime || BALANCING_WAIT_TIME;
	if (!tracer && config.nanny) {
		tracer = config.nanny.tracer;
	}
	if (!sessionTracer && config.nanny) {
		sessionTracer = config.nanny.sessionTracer;
	}
	if (config.collaboration.certdir) {
		certDirectory = config.collaboration.certdir + "/" + lcHostName + "/";
	}
	localBalancer = conf.hosting.localBalancer;
	if (config.collaboration.startupWaitTime) {
		STARTUP_WAIT_TIME = config.collaboration.startupWaitTime;
	}
	console.log("Server name " + config.servername);
	// Establish connection to db
	db = dbDriver.open(config.collaboration, _);
	try {
		var hostsCollection = dbDriver.createCollection(db, 'Host', _);
		if (process.argv[2] === "adjust") {
			// disable database check for version (after manual patching)
			if (!db) throw new Error("No database connection");
			try {
				dbDriver.updateAll(hostsCollection, {}, {
					patchStatus: "0"
				}, _);
				helpers.uuid.clearTimeout();
				return 0;
			} finally {
				dbDriver.close(db);
			}
		}
		if (process.argv[2] === "install") {
			if (!db) throw new Error("No database connection");
			try {
				var tcpHostName = "";
				if (process.argv.length < 5) {
					throw new Error("Usage node nanny install <Port> <Number of child processes> [<Number of Web service child processes>]");
					//return 1;
				}
				if (process.argv[3].substr(0, 3) === "-d=") {
					tcpHostName = process.argv[3].substr(3);
					tcpHostName = tcpHostName.replace(/^["']/, "").replace(/["']$/, "");
					process.argv.splice(2, 1);
				}
				var wsChildCount = 0;
				if (!/^\d+$/.test(process.argv[3])) throw new Error(locale.format(module, "invalidPort", process.argv[3]));
				if (!/^\d\d?$/.test(process.argv[4])) throw new Error(locale.format(module, "invalidChildCount", process.argv[4]));
				if (/^\d+$/.test(process.argv[5])) {
					wsChildCount = +process.argv[5];
					process.argv.splice(5, 1);
				}
				var port = +process.argv[3];
				// connection test
				var server = http.createServer(function(req, res) {
					res.writeHead(200, {
						'Content-Type': 'text/plain'
					});
					res.end('OK');
				});
				try {
					server.listen(port, config.system.bindIP || 'localhost');
					var result = mock.simpleRequest(http, {
						port: port,
						host: "localhost",
						method: "GET",
						path: "/"
					}, "", _);
				} catch (e) {
					console.error(locale.format(module, "connectTestFailed", e));
					helpers.uuid.clearTimeout();
					return 1;
				} finally {
					server.close(_);
				}
				// write into database
				var childCount = +process.argv[4];
				var localHosts = dbDriver.find(hostsCollection, {
					hostname: config.servername
				}, _);
				if (localHosts.length > 0) {
					throw new Error(locale.format(module, "alreadyInstalled"));
				} else {
					// new host
					var hostId = helpers.uuid.generate();
					var newHost = {
						_id: hostId,
						hostname: config.servername,
						connectionData: [{
							port: port,
							active: true,
							ssl: false,
							clientAuth: false,
							serverCert: null,
							clientCert: null,
							host: {
								_uuid: hostId
							},
							_uuid: helpers.uuid.generate()
						}],
						children: childCount,
						wsChildren: wsChildCount,
						_creUser: "setup",
						_updUser: "setup",
						_updDate: new Date(),
						deactivated: false,
						started: false,
						respawnCount: 10,
						respawnTime: 120,
						returnRequestTimeout: 30,
						tcpHostName: tcpHostName
					};
					dbDriver.insert(hostsCollection, newHost, _);
					console.log("Host inserted " + config.servername);
				}
				_fileConnectionData(_, port, ""); // set connection data for the case that the database is not available
				if (process.argv[5]) { // optional license file
					var content = fs.readFile(process.argv[5], "utf8", _);
					// the following code comes from src/license/check._js
					// remove beginning and end
					content = content.replace(/^[^\{\}]*\{/, "").replace(/\}[^\{\}]*$/, "");
					// split into parts and add curly braces (AND add text attribute)
					var parts = content.split(/\}[^\{\},]*[\n\r][^\{\},]*\{/).map(function(part) {
						return {
							text: "{" + part + "}"
						};
					});
					var licenseCollection = dbDriver.createCollection(db, "license", _);
					dbDriver.insert(licenseCollection, parts, _);
				}
				helpers.uuid.clearTimeout();
				return 0;
			} finally {
				dbDriver.close(db);
			}
		}
		//	updateHostData is not interesting for install 
		updateHostData(false, _, true);
		var result;
		var certname = null;
		switch (process.argv[2]) {
			case "run":
			case undefined:
			case "":
				// read version file
				if (!localHost) {
					dbDriver.close(db);
					throw new Error("Service has not been installed");
				}
				try {
					var ver = JSON.parse(fs.readFile(VERSION_FILE, _));
					localHost.version = ver.relNumber + "-" + ver.patchNumber;
				} catch (e) {
					console.log("Error in version file " + e);
					localHost.version = "-";
				}
				// read certificate data
				// find out whether there is newer server
				if (!process.argv[2] && db) {
					hosts.forEach(function(host) {
						var parts = (host.patchStatus || "0").split(";");
						if (host.hostname !== localHost.hostname && !host.deactivated && helpers.relNumberCmp(parts[0], localHost.version) > 0) {
							// current version is not newest version
							console.log("The host " + host.hostname + " has newer version " + parts[0] + " according to database");
							localHost.status = STATUS_LOW_VERSION;
						}
					});
				} else {
					console.log("Avoid version test against database");
				}
				var tcpName;
				if (certDirectory) {
					tcpName = _loadCertificates(_);
				}
				_fileConnectionDataUpdate(_);
				console.log("Start nanny with code version " + localHost.version);
				if (db) {
					var update = {
						started: true,
						pid: process.pid
					};
					if (tcpName) {
						update.tcpHostName = tcpName;
					}
					dbDriver.update(hostsCollection, {
						hostname: config.servername
					}, update, _);
				}
				startServer(_);
				// send signal (without waiting) to all active servers that this server is started.
				// also send version number so that versions can be compared
				if (db) firstStartSignal(!_);
				return 0;
			case "stop":
				if (db) {
					var res = dbDriver.update(hostsCollection, {
						hostname: (process.argv[3] || config.servername)
					}, {
						started: false
					}, _);
					dbDriver.close(db);
				}
				if (!process.argv[3]) {
					try {
						process.kill(+localHost.pid, 0) // does process exist?;
						try {
							console.log(new Date().toISOString(), "Stopping process")
							result = get(localHost, "PUT", "/nannyCommand/stop", null, _, STOP_TIMEOUT);
							console.log(new Date().toISOString(), "Stopped " + result);
						} catch (e) {
							console.log(new Date().toISOString(), "Could not stop nanny (PID " + localHost.pid + "), error " + e);
							// TODO: when unauthorized connection via HTTPS with missing client certificates, do not give up but send SIGINT, wait 2 seconds,
							//  try again connection, when the same error occurs, send SIGTERM
						}
					} catch (e) {
						console.log("Process already stopped");
					}
				}
				helpers.uuid.clearTimeout();
				process.exit(0);
			case "patch":
				var action = "batch";
				if (process.argv[3] === "--unlock") {
					action = "unlock";
				} else {
					// patch integration in batch mode
					if (!process.argv[3]) {
						console.error("No patch file given");
						helpers.uuid.clearTimeout();
						return 1;
					}
					if (!fs.exists(process.argv[3])) {
						console.error("Patch file " + process.argv[3] + " does not exist");
						helpers.uuid.clearTimeout();
						return 1;
					}
				}
				dbDriver.close(db);
				try {
					result = get(localHost, "PUT", "/nannyCommand/notifyOne/patch/integration/" + action, process.argv[3], _, REQUEST_TIMEOUT);
					var lines = result.split(/[\r\n]+/);
					lines.forEach(function(line) {
						if (line.charAt(0) === '{') {
							var childData = JSON.parse(line);
							var message = childData.message;
							if (!message) throw new Error("No message in " + result);
							var index = message.indexOf(";");
							if (index >= 0) {
								console.log(message.substr(index + 1));
								process.exit(+message.substr(0, index));
							} else {
								console.log(message);
								process.exit(0);
							}
						}
					});
					throw new Error("No answer in " + result);
				} catch (e) {
					console.log("Error in patch integration " + e);
					helpers.uuid.clearTimeout();
					return 1;
				}
				helpers.uuid.clearTimeout();
				return 0;
			case "passphrase2":
				certname = process.argv.splice(3, 1)[0];
				// no break!
			case "passphrase":
			case "passphrasehex":
				if (!certDirectory) {
					console.error("No certificate directory");
					helpers.uuid.clearTimeout();
					return 1;
				}
				var argpassphrase = (process.argv[2] === "passphrasehex" ? new Buffer(process.argv[3], "hex").toString("utf8") : process.argv[3]);
				try {
					var passphrases = {};
					try {
						passphrases = certTools.readPassphrases(certDirectory, _, true);
					} catch (e) {
						if (argpassphrase) {
							console.log("No passphrase file yet");
						} else {
							if (e.code === 'ENOENT') console.error(locale.format(module, "noExPhrases"));
							else console.error(locale.format(module, "noPhrases", e));
							helpers.uuid.clearTimeout();
							return 1;
						}
					}
					// normal certificate
					if (certname) {
						var certificateCollection = dbDriver.createCollection(db, 'Certificate', _);
						certificates = dbDriver.find(certificateCollection, {
							name: certname
						}, _);
						if (certificates.length < 1) {
							console.error("No certificate with name " + certname);
							helpers.uuid.clearTimeout();
							return 1;
						}
						checkFileCertificates(_, certificates[0], false, passphrases, argpassphrase, certname ? null : [caCert.certificate]);
					} else {
						// CA certificate
						var caCert = checkFileCertificates(_, null, true);
						checkFileCertificates(_, null, false, passphrases, argpassphrase, [caCert.certificate]);
					}
					if (!argpassphrase) {
						console.log("Integrity check of local certificate OK");
						helpers.uuid.clearTimeout();
						return 0;
					}
					passphrases[certname ? certname : lcHostName] = argpassphrase;
					try {
						passphrases = certTools.writePassphrases(certDirectory, passphrases, _);
						console.log("Passphrase written successfully");
					} catch (e) {
						console.log("Exception when writing keys " + e);
						return 1;
					}
					// notify nanny process
					if (localHost.started) {
						try {
							result = get(localHost, "PUT", "/nannyCommand/reloadCertificates", null, _, REQUEST_TIMEOUT);
							console.log("Certificates reloaded " + result);
						} catch (e) {
							if (e.code !== "ECONNREFUSED") {
								console.log("Could not contact nanny " + e.stack);
								return 1;
							}
						}
					}
					helpers.uuid.clearTimeout();
					return 0;
				} catch (e) {
					console.error("Exception in certificate " + e);
					helpers.uuid.clearTimeout();
					return 1;
				} finally {
					dbDriver.close(db);
				}
				break;
			case "remove":
				if (!db) throw new Error("No database connection!");
				try {
					dbDriver.remove(hostsCollection, {
						hostname: (process.argv[3] || config.servername)
					}, _);
					var certificateCollection = dbDriver.createCollection(db, 'Certificate', _);
					dbDriver.remove(certificateCollection, {
						name: config.servername.toLowerCase()
					}, _);
				} finally {
					dbDriver.close(db);
				}
				// remove connection file
				try {
					fs.unlink("temp/conn_" + lcHostName + ".bbb", _);
				} catch (e) {
					if (e.code !== "ENOENT") {
						console.log("Warning: problem when removing connection file: " + e);
					}
				}
				console.log("Host removed");
				process.exit(0);
			default:
				throw new Error("Wrong commmand line argument " + process.argv[2] + ". Type node nanny help to get a list of all commands");

		}
		helpers.uuid.clearTimeout();
		return 1;
	} catch (e) {
		// close DB connection so that node can stop
		dbDriver.close(db);
		throw e;
	}
}

// this function takes a real callback, therefore streamline must be notified about this
exports.startCb = function(conf, cb) {
	return start(conf, cb);
};


//loads the certificates from the file system and returns the TCP hostname
// use funnel: execute contents only once in parallel!
// write data to ownCertificate, caCertificates, certificates, localHost.missingCert, localHost.missingCA, localHost.untrusted
// in the very end after the last asynchronous call
function _loadCertificates(_) {
	var tcp = certificateFunnel(_, function(_) {
		var tcpName; // TCP hostname from own certificate (result)
		var passphrases = {};
		// put data into temporary local variables first (for consistency of output)
		var LmissingCert = [];
		var LmissingCA = [];
		var Luntrusted = [];
		var Lcertificates = [];
		var LownCertificate;
		var LcaCertificates;
		console.log("Certificate directory " + certDirectory);
		var files = fs.readdir(certDirectory, _);
		try {
			passphrases = certTools.readPassphrases(certDirectory, _);
		} catch (e) {
			console.log("Exception when reading passphrases: " + e);
		}
		var ownCaCertificate, newCertificate;
		if (db) {
			var certificateCollection = dbDriver.createCollection(db, 'Certificate', _);
			Lcertificates = dbDriver.find(certificateCollection, null, _);
			var caCertificateCollection = dbDriver.createCollection(db, 'CaCertificate', _);
			LcaCertificates = dbDriver.find(caCertificateCollection, null, _);
		} else {
			LcaCertificates = [];
			Lcertificates = [];
			// console.log("FILE CERT")
			files.forEach(function(file) {
				if (file.substr(file.length - 6) === ".cacrt") {
					LcaCertificates.push({
						name: file.substr(0, file.length - 6),
						internal: (file === "ca.cacrt")
					});
				}
				if (file.substr(file.length - 4) === ".crt") {
					Lcertificates.push({
						name: file.substr(0, file.length - 4),
						internal: (file.toLowerCase() === lcHostName + ".crt")
					});
				}
			});
			tracer && tracer("Certificates from file system " + util.format(LcaCertificates) + " " + util.format(Lcertificates));
		}
		// check CA certificates
		// is there the internal CA certificate available?

		if (db && !LcaCertificates.some(function(certificate) {
				return (certificate.name.toLowerCase() === "ca");
			})) {
			console.log("Insert entry for CA cert");
			// no special instance available: generate it
			newCertificate = {
				_id: helpers.uuid.generate(),
				name: "ca",
				internal: true,
				_creUser: "setup",
				_updUser: "setup",
				_updDate: new Date()
			};
			dbDriver.insert(caCertificateCollection, newCertificate, _);
			LcaCertificates = dbDriver.find(caCertificateCollection, null, _);
		}

		var checked;
		LcaCertificates.forEach_(_, function(_, certificate) {
			var lcName = certificate.name.toLowerCase();
			if (lcName === "ca") {
				if (!certificate.internal) {
					console.error("CA Certificate " + lcName + " already exists as a user-defined certificate");
					return;
				}
			}
			certificate.certificate = null;
			try {
				checked = checkFileCertificates(_, certificate, true, null, null, null, files);
			} catch (e) {
				console.error("Error in CA certificate " + lcName + ": " + e);
				LmissingCA.push(lcName);
				return;
			}
			certificate.certificate = checked.certificate;
			if (certificate.internal) {
				ownCaCertificate = certificate;
				// 	fill data (issuer, dates)
				if (db && _fillData(certificate, checked.cert)) {
					dbDriver.update(caCertificateCollection, {
						name: "ca"
					}, {
						issuer: checked.cert.issuer,
						subject: checked.cert.subject,
						notBefore: certificate.notBefore,
						notAfter: certificate.notAfter
					}, _);
				}
				// console.log("JJJJ"+util.format(certificate))
				var hash = crypto.createHash("SHA256");
				hash.update(checked.cert.publicKey);
				caHash = new Buffer(hash.digest("binary").substr(0, 32), "binary");
			}
		});
		if (ownCaCertificate) {
			// maybe generate special instance
			if (db && !Lcertificates.some(function(certificate) {
					return (certificate.name.toLowerCase() === lcHostName);
				})) {
				tracer && tracer("Create database entry for certificate");
				// no special instance available
				newCertificate = {
					_id: helpers.uuid.generate(),
					name: lcHostName,
					internal: true,
					keyExists: true,
					caCertificates: [dbDriver.setRelatedInstance(ownCaCertificate)],
					_creUser: "setup",
					_updUser: "setup",
					_updDate: new Date(),
					server: dbDriver.setRelatedInstance(localHost)
				};
				dbDriver.insert(certificateCollection, newCertificate, _);
				Lcertificates = dbDriver.find(certificateCollection, null, _);
			}
			var i;
			// real loop because of 'splice' statement
			for (i = Lcertificates.length - 1; i >= 0; i--) {
				var certificate = Lcertificates[i];
				var lcName = certificate.name.toLowerCase();
				certificate.server = dbDriver.findInstance(certificate.server, hosts);
				certificate.certificate = null;
				certificate.key = null;
				// ignore server certificates of other servers
				if (certificate.server && certificate.server.hostname && certificate.server.hostname !== localHost.hostname) {
					Lcertificates.splice(i, 1); // delete this instance
					continue;
				}
				//
				if (lcName === lcHostName && !certificate.internal) {
					console.error("Certificate " + lcName + " already exists as a user-defined certificate");
					continue;
				}
				var cas = certificate.caCertificates;
				if (db && certificate.internal && (!cas || !cas.length)) {
					tracer && tracer("Add user defined CA certificate");
					cas = certificate.caCertificates = [dbDriver.setRelatedInstance(ownCaCertificate)];
					dbDriver.update(certificateCollection, {
						name: certificate.name
					}, {
						caCertificates: cas
					}, _);
				}
				var j;
				if (cas) {
					for (j = cas.length - 1; j >= 0; j--) {
						cas[j] = dbDriver.findInstance(cas[j], LcaCertificates, "name");
					}
				}
				try {
					checked = checkFileCertificates(_, certificate, false, passphrases, null, cas, files);
				} catch (e) {
					console.error("Error in certificate " + certificate.name + ": " + e);
					LmissingCert.push(lcName);
					continue;
				}
				certificate.certificate = checked.certificate;
				certificate.key = checked.key;
				if (certificate.internal) {
					LownCertificate = certificate;
					tcpName = checked.cert.subject.commonName;
					if (db && _fillData(certificate, checked.cert)) {
						dbDriver.update(certificateCollection, {
							name: lcHostName
						}, {
							issuer: checked.cert.issuer,
							subject: checked.cert.subject,
							notBefore: certificate.notBefore,
							notAfter: certificate.notAfter
						}, _);
					}
				}
			}
		}
		if (LownCertificate) {
			// delete remaining files
			if (db) {
				files.forEach_(_, function(_, f) {
					if (/\.(?:crt|cacrt|key)$/.test(f)) {
						try {
							fs.unlink(certDirectory + f);
							console.log("Delete " + f);
						} catch (e) {
							console.error("Error when deleting " + f + ": " + e);
						}
					}
				});
			}
		}
		var inactiveTenants = [];
		if (LownCertificate && db && config.hosting.multiTenant) { // search certificates of all tenants
			var tenantsCollection = dbDriver.createCollection(db, 'Tenant', _);
			var tenants = dbDriver.find(tenantsCollection, null, _);
			tenants.forEach_(_, function(_, tenant) {
				// open tenant database
				var tenantId = tenant.tenantId;
				console.log("Certificate for " + tenantId);
				if (!tenant.active) {
					inactiveTenants.push(tenantId);
					return;
				}
				var files = [];
				var passphrases = {};
				var certDir = certDirectory + tenantId + "/";
				try {
					files = fs.readdir(certDir, _);
				} catch (e) {
					if (e.code !== "ENOENT")
						console.log("Exception when reading certificates for tenant " + tenantId + ": " + e);
				}
				try {
					passphrases = certTools.readPassphrases(certDir, _);
				} catch (e) {
					console.log("Exception when reading passphrases for tenant " + tenantId + ": " + e);
				}
				var dbTenant = dbDriver.open(config.collaboration, _, tenantId);
				if (!dbTenant) return;
				try {
					var collection = dbDriver.createCollection(dbTenant, 'Certificate', _);
					var certs = dbDriver.find(collection, null, _);
					collection = dbDriver.createCollection(dbTenant, 'CaCertificate', _);
					var cacerts = dbDriver.find(collection, null, _);
					// test integrity and find files
					cacerts.forEach_(_, function(_, cert) {
						try {
							var integ = checkFileCertificates(_, cert, true, null, null, null, files, tenantId);
							cert.certificate = integ.certificate;
						} catch (e) {
							console.error("Error in CA certificate " + certificate.name + ": " + e);
							LmissingCA.push(cert.name + "@" + tenantId);
						}
					});
					certs.forEach_(_, function(_, cert) {
						try {
							var cas = cert.caCertificates;
							if (cas) {
								for (j = cas.length - 1; j >= 0; j--) {
									cas[j] = dbDriver.findInstance(cas[j], cacerts, "name");
								}
							}
							var integ = checkFileCertificates(_, cert, false, passphrases, null, null, files, tenantId);
							cert.certificate = integ.certificate;
						} catch (e) {
							console.error("Error in certificate " + certificate.name + ": " + e);
							LmissingCert.push(cert.name + "@" + tenantId);
						}
					});
					files.forEach_(_, function(_, f) {
						if (/\.(?:crt|cacrt|key)$/.test(f)) {
							try {
								fs.unlink(certDir + f);
								console.log("Delete " + tenantId + "/" + f);
							} catch (e) {
								console.error("Error when deleting " + f + ": " + e);
							}
						}
					});
				} finally {
					dbTenant.close();
				}
			});
		}

		// no asynchronous function calls from now on until end of function!
		localHost.missingCert = LmissingCert;
		localHost.missingCA = LmissingCA;
		localHost.untrusted = Luntrusted;
		ownCertificate = LownCertificate;
		certificates = Lcertificates;
		caCertificates = LcaCertificates;
		if (LownCertificate) {
			// console.log("REMAINING "+util.format(files))
			if (!diffieHellman) {
				diffieHellman = crypto.getDiffieHellman('modp14');
				diffieHellman.generateKeys();
			}
			// add certificate data to connections
			addCertificateData(hosts);
		} else {
			Luntrusted.push(localHost.hostname);
		}

		return tcpName;
	});
	return tcp;
}


//send start signal to all nannies on active servers. This signal tells the other servers that this server has been started and tells about
//code version of this server. The response tells this server about the code version of the other servers. When the versions differ,

function startSignal(host, _, first) {
	if (host.local || !host.started || host.status <= STATUS_NOT_REACHABLE || (!first && host.status <= STATUS_FOREIGN)) return;
	tracer && tracer("Host with start signal " + util.format(_minifyHost(host)));
	var challenge;
	var extra; // will be not empty for first invocation - either containing certificate information or being empty object
	// for subsequent i
	// include certificate information
	if (first) {
		if (ownCertificate) {
			var time = databaseTime.getReducedTime(_);
			var ownChallenge = host.hostname + " " + time;
			challenge = helpers.uuid.generate();
			host.challenge = challenge;
			var signature = _signText(ownChallenge);
			extra = {
				time: time,
				sign: signature,
				challenge: challenge,
				cert: ownCertificate.certificate,
				dh: diffieHellman.getPublicKey('base64')
			};
			// encrypt it
			extra = _securePack(JSON.stringify(extra));
			_markTrusted(host, false); // mark host as untrusted first
		} else {
			// when own host is not trusted, do not mark other hosts as untrusted
			host.certificate = host.dhKey = undefined;
			extra = {};
		}
	}
	var data = get(host, "POST", "/nannyCommand/started", JSON.stringify(_minifyHost(localHost, extra)), _, REQUEST_TIMEOUT);
	tracer && tracer("Start signal sent " + data);
	// check versions
	var infos = JSON.parse(data);
	// console.log("INFOS "+data)
	_copyFluentData(host, infos);
	host.latestContact = Date.now(); // obtained data
	if (host.status < STATUS_INIT) {
		_markTrusted(host, true); // when host cannot be used, mark it as trustworthy
	}
	if (!hosts.mainVersion) {
		hosts.mainVersion = infos.extra;
		checkVersions(_);
	}
}

var stream = require('stream');

function WritableIOStream(socket) {
	stream.Stream.call(this);
	this.writable = true;
	this.readable = false;
	this.socket = socket;

}
util.inherits(WritableIOStream, stream.Stream);
WritableIOStream.prototype.write = function(data, enc) {
	// console.log("Write data "+data)
	var self = this;
	// waiting for drain event is not good because data will be collected and sent later
	this.socket.write(data);
	return true;
};

WritableIOStream.prototype.end = function(data, enc) {
	// console.log("End data "+data)
	if (this.socket) {
		if (data)
			this.socket.write(data);
		this.socket.close();
		this.socket = undefined;
	}
	this.writable = false;
};

WritableIOStream.prototype.destroy = function() {
	if (this.socket) {
		this.socket.close();
		this.socket = undefined;
	}
	this.writable = false;
};

function ReadableIOStream(socket) {
	stream.Stream.call(this);
	this.writable = false;
	this.readable = true;
	this._paused = false;
	this.cache = [];
	this.socket = socket;
	var self = this;
	socket.on('message', function(data) {
		if (self._paused || self.cache.length) {
			self.cache.push(data);
		} else {
			self.emit('data', data);
		}
	});
	socket.on('error', function(err) {
		self.emit('error', err);
		self.readable = false;
	});
	socket.on('close', function() {
		tracer && tracer("CLSE " + this.socket);
		if (self.socket) {
			tracer && tracer("CLSE2");
			self.emit('close');
			self.readable = false;
			self.socket = undefined;
		}
	});
}
util.inherits(ReadableIOStream, stream.Stream);
ReadableIOStream.prototype.pause = function() {
	console.log("Pause");
	this._paused = true;
};

ReadableIOStream.prototype.resume = function() {
	this._paused = false;
	if (this.cache.length) this.makeEmpty();
};

function makeEmpty() {
	console.log("Make empty " + this.cache.length);
	var self = this;
	process.nextTick(function() {
		var size = self.cache.length;
		if (size > 0) {
			self.emit('data', self.cache.shift());
			if (size > 1) makeEmpty();
		}
	});
}

function transferSocket(hostname, socket) {
	var host = hostsByName[hostname];
	if (!host) {
		throw new Error("Kein Host!!!") // TODO;
	}
	console.log("Connect to " + hostname);
	host.mockClient = new mock.Mock(new WritableIOStream(socket), new ReadableIOStream(socket), undefined);
	host.mockClient.setIdent(hostname);
	if (!host.mockClient._mockEngine) {
		host.mockClient.makeMockEngine();
		mock.attachEngineIO(host.mockClient._mockEngine, null, findClient);
	}
	host.mockClient.on('close', function() {
		console.log("Disconnect from " + (host.mockClient || {})._ident);
		host.status = STATUS_NOT_REACHABLE;
		host.mockClient = undefined;
	});
}


//send a start signal to all started nannies. This will also detect unreachable nannies.

function firstStartSignal(_) {
	var futures = [];
	var i = hosts.length;
	while (--i >= 0) {
		var host = hosts[i];
		if (!host.local && host.started) {
			var signal = startSignal(host, !_, true);
			if (!host.deactivated) futures[i] = signal; // do not wait for answers of inactive servers!
		}
	}
	var i = futures.length;
	while (--i >= 0) {
		if (futures[i]) {
			try {
				futures[i](_);
			} catch (e) {
				console.log("Error connecting host " + hosts[i].hostname + ":" + hosts[i].connectionData[0].port + ": " + e.stack);
			}
		}
	}
	// start web sockets
	var i = hosts.length;
	while (--i >= 0) {
		var host = hosts[i];
		makeEngineIOClient(host);
		if (futures[i]) {
			try {
				futures[i](_);
			} catch (e) {
				console.log("Error connecting host " + hosts[i].hostname + ":" + hosts[i].connectionData[0].port + ": " + e.stack);
			}
		}
	}

	// maybe no host could be contacted
	checkVersions(_);
}

function makeEngineIOClient(host) {
	if (host.mockClient || !host.started) return;
	tracer && tracer("Make engine IO client " + host.mockClient);
	if (host.hostname < localHost.hostname) {
		var uri = (host.connectionData[0].ssl ? "https://" : "http://") + (host.tcpHostName || host.hostname) + ":" + host.connectionData[0].port;
		var socket = new EngineioClient(uri, {
			path: "/socket.io"
		});
		transferSocket(host.hostname, socket);
		socket.write("INIT " + localHost.hostname);
	}
}

// check version with foreign host and start child processes if version matches; set new status

function checkVersions(_) {
	console.log("CHECK " + localHost.status + " " + hosts.mainVersion);
	if (localHost.status !== STATUS_INIT) return;
	var commonVersion;
	if (hosts.mainVersion) {
		if (hosts.mainVersion === localHost.version) {
			commonVersion = hosts.mainVersion;
		}
	} else { // no main version yet: test for common version
		commonVersion = localHost.version;
		hosts.forEach(function(host) {
			// only active hosts
			if (host.status > 0 && !host.local) {
				if (commonVersion && commonVersion !== host.version) {
					commonVersion = null;
				}
			}
		});
		if (commonVersion) {
			hosts.mainVersion = commonVersion;
		}
	}
	if (commonVersion) {
		startChildProcesses(true, _);
	} else {
		localHost.status = STATUS_WRONG_VERSION;
	}
}

// Extracts Syracuse cookie using port number. When the optional second
// parameter is not set, use request.headers.cookie, otherwise use contents
// of that parameter
function _getSyracuseCookie(request, text) {
	text = text || request.headers.cookie || "";
	var port = mock.getLocalPort(request);
	tracer && tracer("Port " + port + " Cookietext " + text);
	var search = "syracuse.sid." + port + "=";
	var index = text.indexOf(search);
	if (index >= 0) {
		var res = text.substr(index + search.length, 36);
		//console.log("SID found "+res);
		tracer && tracer("SID found " + res);
		return res;
	}
}




function startChildProcesses(force, _) {
	if (localHost.status > STATUS_INIT || force) {
		startChildrenFunnel(_, function(_) {
			// new number of children
			var newChildCount = (localHost.status >= STATUS_INIT) ? localHost.children : 0;
			// new number of web service children
			var newWsChildCount = (localHost.status >= STATUS_INIT) ? localHost.wsChildren : 0;
			// 	current number of children
			var oldChildCount = children.length;
			// 	current number of children
			var oldWsChildCount = wsChildren.length;
			// batch processes
			var oldBatchCount = (batchChild ? 1 : 0);
			var cnt0 = 0;
			// start B0 process when current server is alphabetically first *started* process
			while (hosts[cnt0] && !hosts[cnt0].local && !hosts[cnt0].started) {
				cnt0++; // skip not started processes
			}
			var newBatchCount = (hosts && localHost && hosts[cnt0] && hosts[cnt0].hostname === localHost.hostname) ? 1 : 0;
			tracer && tracer("Start child processes " + oldChildCount + " " + newChildCount + " " + oldWsChildCount + " " + newWsChildCount + " " + oldBatchCount + " " + newBatchCount);
			if (oldChildCount !== newChildCount) {
				if (oldChildCount === 0 && (newChildCount > 1 || newWsChildCount > 0)) {
					// first start one process, then other processes
					_startMessage("First process");
					localHost.status = STATUS_START;
					createProcess(undefined, "N0");
					_childping(_, children[0]);
					oldChildCount = 1;
					_startMessage("First process started");
					startupText.cnt = 1;
				}
				var i;
				var init = true;
				for (i = newChildCount - 1; i >= oldChildCount; i--) {
					if (init) {
						init = false;
					} else {
						wait(STARTUP_WAIT_TIME, _);
					}
					createProcess(undefined, "N" + i);
				}
				while (children.length > newChildCount) {
					tracer && tracer("Kill child process N" + children.length);
					killWithNotification(_, children.length - 1);
					children.pop();
				}
			}
			if (oldWsChildCount !== newWsChildCount) {
				for (i = newWsChildCount - 1; i >= oldWsChildCount; i--) {
					if (init) {
						init = false;
					} else {
						wait(STARTUP_WAIT_TIME, _);
					}
					createProcess(undefined, "W" + i);
				}
				while (wsChildren.length > newWsChildCount) {
					tracer && tracer("Kill child process W" + wsChildren.length);
					killWithNotification(_, wsChildren.length - 1, true);
					wsChildren.pop();
				}
			}
			if (oldBatchCount !== newBatchCount) {
				// batch processes necessary?
				if (!batchChild) {
					if (init) {
						init = false;
					} else {
						wait(STARTUP_WAIT_TIME, _);
					}
					createProcess(undefined, "B0");
				} else {
					killWithNotification(_, 0, false, true);
				}
			}
			if (newChildCount > 0 && localHost.status < STATUS_START) {
				localHost.status = STATUS_START;
			}
			if (localHost.status === STATUS_START) {
				// send ping signal to all child processes, then mark process ready
				var futures = [];
				children.forEach(function(child) {
					if (child) futures.push(_childping(!_, child));
				});
				wsChildren.forEach(function(child) {
					if (child) futures.push(child.mockClient.ping(!_, PING_TIMEOUT));
				});
				if (batchChild) {
					futures.push(batchChild.mockClient.ping(!_, PING_TIMEOUT));
				}
				// wait for results of child processes (collect results of futures).
				// This function is called as a future!
				startedChildProcesses(futures, !_);
			}
		});
	}
}

function startedChildProcesses(futures, _) {
	var i = futures.length;
	var ok = true;
	while (--i >= 0) {
		try {
			futures[i](_);
			if (startupText) startupText.cnt++;
		} catch (e) {
			ok = false;
			_startMessage("Error starting child process: " + e.stack, true);
		}
	}
	if (ok) {
		localHost.status = STATUS_READY;
		startupText = undefined;
		_startMessage("Notify other servers about successful start of child processes");
		// send start signal again (as a future, because it is not necessary to wait for the result
		hosts.forEach(function(host) {
			return startSignal(host, !_);
		});
		healthLoop(!_);
	}
}


// find out status of child processes
function healthLoop(_) {
	if (localHost.status !== STATUS_READY) // do not perform health checks except for normal running mode
		return;
	var futures = [];
	for (var i = 0; i < children.length; i++) {
		if (children[i] && children[i].syratime != undefined) {
			var future = children[i].mockClient.ping2(!_, CHILD_PING2_TIMEOUT);
			future.extra = ["N" + i, children[i]];
			futures.push(future);
		}
	}
	restrictedServers.forEach(function(server) {
		var future = server.mockClient.ping2(!_, CHILD_PING2_TIMEOUT);
		if (children[i]) {
			future.extra = [undefined, children[i]];
			futures.push(future);
		}
	});
	futures.forEach_(_, function(_, future) {
		try {
			var result = future(_);
			future.extra[1].syratime = result[0] + (future.extra[1].syratime - result[0]) * CHILD_SLIDING_MEAN;
			tracer && tracer("Load computation " + result[0] + " " + result[1] + " " + future.extra[1].syratime);
			if (result[1] !== "0" && future.extra[0])
				_restrict(future.extra[0]);
		} catch (e) {
			console.log("" + e + " " + future.extra[0]);
			// child process overloaded or unusable: kill it
			if (future.extra[0])
				_restrict(future.extra[0], true);
			else {
				var childprocess = future.extra[1];
				if (childprocess) {
					var index = restrictedServers.indexOf(childprocess);
					if (index >= 0) restrictedServers.splice(index, 1);
					childprocess.terminate = true;
					childprocess.kill();
				}
			}
		}
	});
	setTimeout(function() {
		return healthLoop(function(err) {
			if (err) throw err;
		});
	}, CHILD_PING2_POLLING);
}


function _startMessage(text, error) {
	if (error && startupText) {
		startupText.err += "\n" + text;
	}
	text = new Date().toISOString() + " " + text;
	console.log(text);
}

/// createProcess(exitCode, port, extraArgument)
/// creates child process listening at the given port and puts its object into the `children` instance.
/// when the process finishes, the process will be restarted unless `children.terminate` is set.
/// extraArgument: extra argument for child process
/// ws: web service process?
function createProcess(code, port, extraArgument) {
	var startTime = Date.now();
	var startCount = 0;
	var childList;
	var portNumber = port.substr(1);
	if (port[0] !== "B") {
		childList = (port[0] === "W" ? wsChildren : children);
		var child = childList[+portNumber];
	} else
		var child = batchChild;
	if (code === undefined) {
		_startMessage("Start process " + port);
	} else {
		if (code === 5) {
			_startMessage("License problem: no license " + port);
			localHost.status = STATUS_NO_LICENSE;
			// tell other servers
			hosts.forEach(function(host) {
				return startSignal(host, !_);
			});
			killChildren();
		} else {
			_startMessage("Restarting server " + port + " (exit code " + code + ")", true);
			var respawnTime = 1000 * localHost.respawnTime;
			if (child && respawnTime && startTime - child.startTime < respawnTime) {
				startTime = child.startTime;
				startCount = (child.startCount || 0) + 1;
				if (child.startCount > localHost.respawnCount) {
					// child processes unavailable
					console.log("RESPAWN COUNT");
					localHost.status = STATUS_RESPAWN;
					// tell other servers
					hosts.forEach(function(host) {
						return startSignal(host, !_);
					});
					killChildren();
				}
			}
		}
	}

	if (!child || !child.terminate) { // restart processes (unless terminating all processes is intended)
		var cmdline = ['.', port, localHost.returnRequestTimeout, extraArgument || ""];
		if (config.hosting && config.hosting.dbUnlock) cmdline.push("--dbUnlock");
		if (config.hosting && config.hosting.nodeOptions) cmdline.unshift(config.hosting.nodeOptions);

		child = child_process.spawn(process.argv[0], cmdline, {
			stdio: ['pipe', process.stdout, process.stderr, 'pipe']
		});
		child.startTime = startTime;
		child.startCount = startCount;
		if (childList)
			childList[portNumber] = child;
		else {
			batchChild = child;
			if (localHost) localHost.batchChildren = 1;
		}
		// attach mock client to child process
		child.mockClient = new mock.Mock(child.stdin, child.stdio[3], function(request, response, _) {
			request.fromNanny = true; // mark these requests as internal requests
			return requestListener(request, response, _);
		});
		child.mockClient.setIdent(port);

		// error handler
		child.on('error', function(error) {
			console.error("Child process could not be started " + error);
			localHost.status = STATUS_RESPAWN;
			// tell other servers
			hosts.forEach(function(host) {
				return startSignal(host, !_);
			});
			killChildren();
		});
		// exit handler for restarting process
		child.on('exit', function(code) {
			// maybe there are restricted sessions for this process
			for (var sess in restrictedSessions) {
				if (restrictedSessions[sess] === child) {
					tracer && tracer("delete restricted session of terminated restricted process " + sess);
					delete restrictedSessions[sess];
				}
			}
			if (child.terminate) {
				console.log("Stop child");
			} else {
				return createProcess(code, port);
			}
		});
	}
}

//returns an array of all status information

function statusString() {
	return hosts.map(function(host) {
		return host.status;
	}).join(',');
}

//resolve references to certificate data

function addCertificateData(hosts) {
	// add certificate information
	if (certificates) {
		hosts.forEach(function(host) {
			host.connectionData.forEach(function(conn) {
				if (host.hostname === localHost.hostname) { // add only server certificates of localhost. This is deliberate (cf. getCaCertificates)
					conn.serverCert = dbDriver.findInstance(conn.serverCert, certificates, "name");
					if (conn.noDbExtraCas && conn.serverCert) {
						conn.serverCert.caCertificates = [];
						conn.noDbExtraCas.forEach(function(caCert) {
							var res = dbDriver.findInstance({
								name: caCert
							}, caCertificates, "name");
							if (res) conn.serverCert.caCertificates.push(res);
						});
					}

				}
				conn.clientCert = dbDriver.findInstance(conn.clientCert, certificates, "name");
			});
		});
	}
}

//read configuration data of hosts from database and update local configuration.
//startChildren:

function updateHostData(startChildren, _, init) {
	if (!db) { // try to reconnect to database
		try {
			db = dbDriver.open(config.collaboration, _);
		} catch (e) {
			// cannot open connection:
			console.error("Cannot open database connection " + e);
			db = null;
		}
	}
	if (!db) {
		// if there is no database available - read from file
		var data = _fileConnectionData(_);
		var conn = {
			port: data.port,
			active: true
		};
		if (data.serverCert) {
			conn.ssl = true;
			conn.serverCert = {
				name: data.serverCert
			};
			conn.noDbExtraCas = data.cas;
			if (data.clientCert) {
				conn.clientAuth = true;
				conn.clientCert = {
					name: data.clientCert
				};
			}
		}
		localHost = {
			children: 0,
			wsChildren: 0,
			started: true,
			status: STATUS_NO_DB,
			hostname: os.hostname(),
			connectionData: [conn]
		};
		hosts = [localHost];
		hostsByName[localHost.hostname] = localHost;
		return;
	}
	var hostsCollection = dbDriver.createCollection(db, 'Host', _);
	var newHosts = dbDriver.find(hostsCollection, null, _);
	// add the references to certificates
	if (!init) {
		addCertificateData(newHosts);
	}
	hosts = _updateHosts(hosts, newHosts, config.servername);
	if (!localHost) { // data for local host not available
		console.error("No data for local nanny");
		process.exit(2);
	}
	// update file connection data
	if (!init) {
		_fileConnectionDataUpdate(_);
	}
	// maybe stop nanny
	if (localHost.stop) { // data for local host have changed
		console.log("Connection data changed - restart nanny");
		shutdown(!_, undefined, true);
	} else {
		startChildProcesses(startChildren, !_);
	}
}

// returns true when connections are equal
function _compareConnection(conn1, conn2) {
	if (+conn1.port !== +conn2.port || !conn1.active !== !conn2.active || !conn1.ssl !== !conn2.ssl) return false;
	if (conn1.ssl) {
		if (!_compareCert(conn1.serverCert, conn2.serverCert)) return false;
		if (!conn1.clientAuth !== !conn2.clientAuth) return false;
		if (conn1.clientAuth && !_compareCert(conn1.clientCert, conn2.clientCert)) return false;
	};
	return true;
}

function _compareCert(cert1, cert2) {
	if (!cert1 !== !cert2) return false;
	if (cert1 && ((cert1.name !== cert2.name) || (cert1.certificateHash !== cert2.certificateHash))) return false;
	return true;
}

// for unit tests
exports._cc = _compareConnection;

function _updateHosts(oldHosts, hosts, name) {
	// sort host data by hostname
	hosts = hosts.sort(function(host1, host2) {
		var h1 = host1.hostname;
		var h2 = host2.hostname;
		return (h1 > h2 ? 1 : (h1 < h2 ? -1 : 0));
	});
	var i = hosts.length;
	localHost = null;
	hostsByName = {};
	LOOP: while (--i >= 0) {
		var host = hosts[i];
		// Is first connection of every host existent and active?
		if (!host.connectionData || !host.connectionData.length || host.connectionData[0].deactivated) {
			throw new Error(locale.format(module, "errorConnectionData", host.hostname));
		}
		hostsByName[host.hostname] = host;
		if (host.hostname === name) {
			host.local = true;
			host.wsChildren = (host.wsChildren || 0);
			localHost = host;
		}
		var j = oldHosts.length;
		while (--j >= 0) {
			var oldHost = oldHosts[j];
			if (!oldHost) continue;
			if (oldHost.hostname === host.hostname) {
				_copyFluentData(host, oldHost);
				host.certificate = oldHost.certificate;
				host.challenge = oldHost.challenge;
				host.dhKey = oldHost.dhKey;
				host.latestContact = oldHost.latestContact; // time of latest response of status (for balancing)
				host.pendingRequest = oldHost.pendingRequest;
				host.mockClient = oldHost.mockClient;
				if (oldHost.hostname === name) {
					// have connection data of local host changed?
					var oldConnections = oldHost.connectionData;
					var connections = host.connectionData;
					var k;
					for (k = 0; k < oldConnections.length; k++) {
						var oldConn = oldConnections[k];
						if (oldConn.active && (!connections[k] || !_compareConnection(oldConn, connections[k]))) {
							localHost.stop = true;
							break;
						}
					}
				}
			}
		}
		// explicitly set certain status values
		if (host.deactivated && host.status > STATUS_INACTIVE) host.status = STATUS_INACTIVE;
		if (!host.local && !host.started) host.status = STATUS_NOT_STARTED;
		if (host.status === undefined || host.started && host.status === STATUS_NOT_STARTED || !host.deactivated && host.status === STATUS_INACTIVE) {
			// initialize status: a foreign host is not reachable unless it is known to be reachable
			host.status = (host.local ? (!host.deactivated ? STATUS_INIT : STATUS_INACTIVE) : STATUS_FOREIGN);
		}
	}
	hosts.mainVersion = oldHosts.mainVersion || "";
	return hosts;
}

function requestListener(request, response, _, localPort) {
	try {
		// console.error("RL " + request.connection + " " + localPort);
		if (request.connection) request.connection.__syra_localPort = localPort;
		return requestListener0(request, response, _);
	} catch (e) {
		writeError(response, (e instanceof Error ? e.message : "" + e));
		if (e instanceof Error) {
			console.log("TRACE " + e.trace + " " + e.stack);
		}
	}
}

function requestListener0(request, response, _) {
	tracer && tracer(">> " + request.url);
	request.pause();
	// exchange headers
	var headers = {};
	Object.keys(request.headers).forEach(function(head) {
		headers[head] = request.headers[head];
	});
	if (mock.TENANT_HEADER in headers) {
		tracer && tracer("TENANT header detected " + headers[mock.TENANT_HEADER]);
		headers['x-forwarded-host'] = headers.host = headers[mock.TENANT_HEADER];
		delete headers[mock.TENANT_HEADER];
	}
	request.headers = headers;
	var streamRecorder;
	var i, data, host;
	var sid; // Syracuse session ID
	// testSessions(sessionCollection, _);
	// special commands which will not be redirected
	if (request.url.substring(0, 14) === "/nannyCommand/") {
		var h = mock.getLocalPort(request);
		if (h && +h !== +localHost.connectionData[0].port) {
			// internal commands only on first port
			response.writeHead("404", {});
			return response.end("Resource not found.");
		}
		var command = request.url.substr(14).split('/');
		var resultText = localHost.hostname + ":\n";
		var futures = [],
			future; // invocations of other processes
		var commandType = command[0];
		var syraBalancerHeader = request.headers[mock.BALANCER_HEADER];

		switch (command[0]) {
			case 'restart':
				// attach this browser to a certain Syracuse process
				if (command[1]) {
					var reg = /^N(\d+)$/.exec(command[1]);
					if (reg && +reg[1] < children.length) {
						// kill process
						var number = reg[1];
						killWithNotification(_, number);
						createProcess(undefined, "N" + number);
						response.writeHead("200", {
							"Content-Type": "text/plain; charset=utf-8",
						});
						response.end(locale.format(module, "restartedProcess", command[1]));
						return;
					} else {
						response.end(locale.format(module, "wrongProcess", command[1]));
						return;
					}
					break;
				} else {
					response.end(locale.format(module, "noProcess"));
				}
			case 'attach':
				// attach this browser to a certain Syracuse process
				if (command[1]) {
					var reg = /^N(\d+)$/.exec(command[1]);
					if (reg && +reg[1] < children.length) {
						// already Syracuse session id available: set it to new host
						var newSession = _getSyracuseCookie(request);
						if (newSession) {
							sid = newSession;
							// delete corresponding Syracuse session
							if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
							deleteSession(sid, sessionCollection, _);
							sessionTracer && sessionTracer("attach Session: " + sid);
						} else {
							response.end(locale.format(module, "noSessionAvailable"));
						}
						dedicated[sid] = sessions[sid] = [localHost, command[1], Date.now()];
						sessionTracer && sessionTracer("Set dedicated session " + sid + " to " + command[1]);
						console.log("Set balancer cookie " + sid);
						response.writeHead("200", {
							"Content-Type": "text/html; charset=utf-8",
							"set-cookie": sid
						});
						response.end(locale.format(module, "startSession", command[1]));
						sid = undefined;
						return;
					} else {
						response.end(locale.format(module, "wrongProcess", command[1]));
						return;
					}
				} else {
					var i = 0;
					Object.keys(dedicated).forEach(function(key) {
						delete sessions[key];
						delete restrictedSessions[key];
						delete nonDBSessions[key];
						i++;
					});
					dedicated = {};
					response.end("Removed " + i + " attached sessions");
					return;
				}
				break;
			case 'notifyAllAndRestricted':
			case 'notifyAll':
			case 'notifyW':
			case 'notifyB':
				// notify all
				request.pause();
				var clientId = syraBalancerHeader;
				streamRecorder = new recorder.StreamRecorder(request);
				// Notify other servers (without waiting)
				if (clientId) {
					if (!db) throw new Error("No database available");
					delete request.headers[mock.BALANCER_HEADER];
					hosts.forEach(function(host) {
						if (!host.local && host.status === STATUS_READY && (command[0] !== 'notifyW' || host.wsChildren)) {
							tracer && tracer("Request to server " + i);
							futures.push(doRequestWithAnswer(streamRecorder, [host, null], !_));
						}
					});
				}
				request.url = request.url.replace(/^\/[^\/]+\/[^\/]+/, "");
				tracer && tracer("Local path " + request.url);
				streamRecorder._fromNanny = true; // mark internal call
				if (command[0] !== 'notifyW' && command[0] !== 'notifyB') {
					for (i = 0; i < children.length; i++) {
						var port = "N" + i;
						if (port !== clientId) {
							tracer && tracer("Request to local app " + port);
							future = doRequestWithAnswer(streamRecorder, [localHost, port], !_);
							future.extra = {
								port: port
							};
							futures.push(future);
						}
					}
				}
				if (command[0] !== 'notifyB') {
					for (i = 0; i < wsChildren.length; i++) {
						var port = "W" + i;
						if (port !== clientId) {
							tracer && tracer("Request to local app " + port);
							future = doRequestWithAnswer(streamRecorder, [localHost, port], !_);
							future.extra = {
								port: port
							};
							futures.push(future);
						}
					}
				}
				if (batchChild != null && command[0] != 'notifyW') {
					var port = "B0";
					if (port !== clientId) {
						tracer && tracer("Request to local app " + port);
						future = doRequestWithAnswer(streamRecorder, [localHost, port], !_);
						future.extra = {
							port: port
						};
						futures.push(future);
					}
				}
				if (command[0] === 'notifyAllAndRestricted') {
					// include restricted processes
					var alreadyNotified = [];
					for (var sess in restrictedSessions) {
						var child = restrictedSessions[sess];
						if (alreadyNotified.indexOf(child) < 0) {
							alreadyNotified.push(child);
							tracer && tracer("Request to local app " + port);
							future = doRequestWithAnswer(streamRecorder, [localHost, port], !_, child.mockClient);
							future.extra = {
								port: "R"
							};
							futures.push(future);
						}
					}
				}
				break;
			case "notifyOtherNannies":
				if (!db) throw new Error("No database available");
				// send the command (without '/notifyOtherNannies' in URL) to other nannies which have status OK and finish the request
				request.pause();
				// console.log("CLIENT ID "+clientId)
				streamRecorder = new recorder.StreamRecorder(request);
				request.url = request.url.replace(/^(\/[^\/]+)\/[^\/]+/, "$1"); // remove second part;
				tracer && tracer("Notify all running " + clientId + " " + request.url);
				// Notify other servers (without waiting)
				delete request.headers[mock.BALANCER_HEADER];
				hosts.forEach(function(host) {
					if (!host.local && host.status >= STATUS_READY) {
						tracer && tracer("Request to server " + host.hostname);
						futures.push(doRequestWithAnswer(streamRecorder, [host, null], !_));
					}
				});
				break;
			case "notifyNannies":
				if (!db) throw new Error("No database available");
				// send the command (without '/notifyOtherNannies' in URL) to all nannies which have status at least inactive.
				command.shift();
				request.pause();
				// console.log("CLIENT ID "+clientId)
				streamRecorder = new recorder.StreamRecorder(request);
				request.url = request.url.replace(/^(\/[^\/]+)\/[^\/]+/, "$1"); // remove second part
				tracer && tracer("Notify all started " + request.url);
				// Notify other servers (without waiting)
				delete request.headers[mock.BALANCER_HEADER];
				hosts.forEach(function(host) {
					if (!host.local && host.status >= STATUS_INACTIVE) {
						tracer && tracer("Request to server " + host.hostname);
						var fut = doRequestWithAnswer(streamRecorder, [host, null], !_);
						fut.infoinfo = host.hostname;
						futures.push(fut);
					} else {
						futures.push(null);
					}
				});
				break;
		}
		var d, foundHost, changes;
		switch (command[0]) {
			case 'stop':
				// request to stop server
				console.log(new Date().toISOString(), "Stop server 1")
				futures = [];
				for (i = 0; i < hosts.length; i++) {
					var host = hosts[i];
					if (host && host.status >= STATUS_INACTIVE && !host.local) {
						futures[i] = get(host, "PUT", "/nannyCommand/down/" + localHost.hostname, null, !_, STOP_TIMEOUT);
					}
				}
				// stop command should not last too long: therefore do an 'airbag' exit after 10 seconds
				setTimeout(function() {
					console.log("Exit process 2");
					process.exit(0);
				}, STOP_TIMEOUT);
				// Exceptional case here: call futures here because otherwise process.nextTick function will not allow them to be executed
				for (i = 0; i < futures.length; i++) {
					try {
						if (futures[i]) console.log("Answer from " + hosts[i].hostname + ": " + futures[i](_));
					} catch (e) {
						console.log("Exception when informing host " + hosts[i].hostname + ": " + e);
					}
				}
				console.log(new Date().toISOString(), "Stop server 2")
				killWithNotification(_);
				// killChildren();
				resultText = "OK1";
				futures = [];
				console.log(new Date().toISOString(), "Stop server 3")
					// exit the process after 2 seconds (not in next tick in order to allow response to be sent)
				setTimeout(function() {
					console.log("Exit process");
					process.exit(0);
				}, 1000);
				break;
			case 'notifyOne':
				// send request only to local server with lowest number of sessions (without '/nannyCommand/notifyOne')
				if (!db) throw new Error("No database available");
				data = _balanceInternal(_, true); // only local host
				if (!data) {
					data = [localHost, "N0"];
					tracer && tracer("No balancer result - set process N0");
				}
				if (!streamRecorder) {
					request.url = request.url.replace(/^\/[^\/]+\/[^\/]+/, ""); // remove first two parts
					streamRecorder = new recorder.StreamRecorder(request);
				} else {
					streamRecorder.originalStream.url = streamRecorder.originalStream.url.replace(/^\/[^\/]+\/[^\/]+/, ""); // remove first two parts
				}
				streamRecorder._fromNanny = true; // mark internal call
				try {
					future = doRequestWithAnswer(streamRecorder, data, !_);
					future.extra = {
						port: data[1],
						hostname: localHost.hostname
					};
					futures.push(future);
				} catch (e) {
					tracer && tracer("Host not available " + data[0].hostname + " Error " + e);
				}
				break;

			case 'stopSessions':
				// read request data fully before answering request
				if (streamRecorder) streamRecorder.loadFully(_);
				response.writeHead(200, {
					'Content-Type': 'text/plain'
				});
				response.end("OK"); // finish request
				console.log("STOP SESSIONS " + futures.length);
				// do not wait for answers of other servers
				// for (var i = 0; i<futures.length; i++) {
				//	try {
				//		if (futures[i]) console.log(futures[i].infoinfo+" ----- "+futures[i](_));
				//	} catch (e) {
				//		console.log("Exception when informing host "+hosts[i].hostname+": "+e+" "+e.stack+" "+e.trace);
				//	}
				// }
				// do not notify other hosts about status change
				shutdown(_, syraBalancerHeader);
				return;
			case 'update':
				updateHostData(true, _);
				// maybe start more connections
				startServer(_);
				resultText += "Host data updated";
				break;
			case 'adjust':
				if (!db) throw new Error("No database connection");
				var hostsCollection = dbDriver.createCollection(db, 'Host', _);
				dbDriver.updateAll(hostsCollection, {}, {
					patchStatus: "0"
				}, _);
				resultText += "Adjusted";
				break;
			case 'test':
				// test request
				resultText += "OK2";
				break;
			case 'pid':
				resultText += JSON.stringify(children.map(function(ch) {
					return (ch ? ch.pid : 0);
				}));
				break;
			case 'children':
				// ping to children
				if (localHost.status >= STATUS_START) {
					for (i = children.length - 1; i >= 0; i--) {
						if (!children[i]) continue;
						future = children[i].mockClient.ping(!_, 1000);
						future.extra = {
							hostname: localHost.hostname,
							port: "N" + i,
							requests: children[i].mockClient.numberRequests()
						};
						futures.push(future);
					}
					for (i = wsChildren.length - 1; i >= 0; i--) {
						if (!wsChildren[i]) continue;
						future = wsChildren[i].mockClient.ping(!_, 1000);
						future.extra = {
							hostname: localHost.hostname,
							port: "W" + i,
							requests: wsChildren[i].mockClient.numberRequests()
						};
						futures.push(future);
					}
				} else {
					resultText += JSON.stringify({
						hostname: localHost.hostname,
						message: "Children not yet started"
					}) + "\n";
				}
				if (commandType === "notifyNannies") { // extra information only from current host
					resultText += _stringifyHosts(hosts) + "\n";
				}
				break;
			case 'reloadCertificates':
				// reload local certificate data
				var tcpName = _loadCertificates(_);
				if (!db) resultText += "Cannot update host data in database";
				else {
					if (!localHost.tcpName) {
						tracer && tracer("Set tcpname " + tcpName);
						var update = {
							tcpHostName: tcpName,
						};
						var hostsCollection = dbDriver.createCollection(db, 'Host', _);
						dbDriver.update(hostsCollection, {
							hostname: config.servername
						}, update, _);
					}
					tracer && tracer("Update host data");
				}
				updateHostData(false, _);
				firstStartSignal(_);
				break;
			case 'transferCertificate': // get base certificate from Certificate generation tool
				if (!certDirectory) return _certToolResponse(response, null, "No certificate directory");
				if (!db) return _certToolResponse(response, null, "No database connection");
				var errortext;
				var buf = getDataBinary(streamRecorder ? streamRecorder.getStream() : request, _);
				switch (buf[0]) {
					case 0:
						if (certGenToolData && (Date.now() - certGenToolData.time) < 105000) return _certToolResponse(response, null, "Pending request");
						if (buf.length < 64) return _certToolResponse(response, null, "Too short");
						var resp;
						var caCertificate;
						if (!caCertificates.some(function(certificate) {
								if (certificate.name.toLowerCase() === "ca" && certificate.certificate) {
									caCertificate = certificate;
									return true;
								}
							})) {
							return _certToolResponse(response, null, "No CA certificate - please copy ca.cacrt manually to Syracuse server");
						}
						// decrypt key
						var short = caHash.slice(0, 16);
						var bf = crypto.createDecipheriv("bf-cbc", short, buf.slice(65, 73));
						try {
							var diffHell1 = bf.update(buf.slice(73));
							var diffHell2 = bf.final();
						} catch (e) {
							console.error("Decryption error " + e);
							return _certToolResponse(response, null, "Different CA certificate - please copy ca.cacrt manually to Syracuse server");
						}
						try {
							var diffieHellman2 = crypto.getDiffieHellman('modp2');
							diffieHellman2.generateKeys();
							var diffHell = Buffer.concat([diffHell1, diffHell2]);
							var secret = diffieHellman2.computeSecret(diffHell);
							var hash2 = crypto.createHash("SHA256");
							hash2.update(secret);
							secret = hash2.digest();
						} catch (e) {
							console.error("DH error " + e);
							return _certToolResponse(response, null, "Cannot compute Diffie-Hellman key");
						}
						// generate response
						var hash2 = crypto.createHash("SHA256");
						hash2.update(buf.slice(1, 65));
						hash2.update(caHash);
						var digest = hash2.digest();
						var challenge = _getRandom(64);
						var iv2 = _getRandom(8);
						var bf = crypto.createCipheriv("bf-cbc", short, iv2);
						var diffHell1 = bf.update(diffieHellman2.getPublicKey());
						var diffHell2 = bf.final();
						resp = Buffer.concat([digest, challenge, iv2, diffHell1, diffHell2]);
						certGenToolData = {
							secret: secret,
							challenge: challenge,
							time: Date.now(),
							cert: caCertificate.certificate
						};
						return _certToolResponse(response, resp);
					case 2: // second part
						// check time
						if (!certGenToolData) return _certToolResponse(response, null, "No data available");
						if (certGenToolData.time - Date.now() > 100000) {
							certGenToolData = undefined;
							return _certToolResponse(response, null, "Timeout for data");
						}
						// decrypt contents
						var signaturelength = buf.readUInt16BE(1);
						try {
							var bf = crypto.createDecipheriv("bf-cbc", certGenToolData.secret.slice(1, 17), buf.slice(3 + signaturelength, 11 + signaturelength));
							var res1 = bf.update(buf.slice(11 + signaturelength));
							var res2 = bf.final();
						} catch (e) {
							console.error("Decryption error " + e);
							// do not clear certGenToolData because it is likely that this request uses a wrong Diffie Hellman key and
							// the "correct" request will follow
							return _certToolResponse(response, null, "Decryption error");
						}
						try {
							// check signature
							tracer && tracer("Length of signature " + signaturelength);
							var verify = crypto.createVerify("RSA-SHA256");
							verify.update(certGenToolData.challenge);
							verify.update(buf.slice(3 + signaturelength));
							try {
								if (!verify.verify(certGenToolData.cert, buf.slice(3, 3 + signaturelength))) {
									return _certToolResponse(response, null, "Wrong signature");
								};
							} catch (e) {
								console.log(e);
								return _certToolResponse(response, null, "Error during verify");
							}
							// Result
							var res = Buffer.concat([res1, res2], res1.length + res2.length);
							var parts = res.toString("utf8").split("\0");
							if (parts[0].length !== 5) return _certToolResponse(response, null, "First part has wrong length");
							if (parts.length < 4 || parts.length > 5) return _certToolResponse(response, null, "Wrong number of items " + parts.length);
							// verify the new certificates
							if (parts[2] && !parts[4]) return _certToolResponse(response, null, "No passphrase for private key");
							var passphrases = undefined;
							if (!parts[2]) { // no key file
								tracer && tracer("Read private key from file system");
								try {
									passphrases = certTools.readPassphrases(certDirectory, _, true);
									parts[2] = fs.readFileSync(certDirectory + lcHostName + ".key", "utf8", _);
									parts[4] = passphrases[lcHostName];
								} catch (e) {
									return _certToolResponse(response, null, "Cannot read private key for this certificate: " + e);
								}
							}
							var integ = jsx509.integrity(parts[1], parts[2], parts[4], [parts[3] || certGenToolData.cert]);
							if (integ.error) {
								// Integrity check failed
								console.log("Integrity check for base certificate: " + integ.error);
								return _certToolResponse(response, null, "Certificate check error " + integ.error);
							}
							try {
								fs.writeFileSync(certDirectory + lcHostName + ".crt", parts[1], "utf8", _);
								if (parts[3]) {
									fs.writeFileSync(certDirectory + "ca.cacrt", parts[3], "utf8", _);
								}
								if (!passphrases) { // new private key
									try {
										passphrases = certTools.readPassphrases(certDirectory, _, true);
									} catch (e) {
										tracer && tracer("No passphrase file yet" + e);
										passphrases = {};
									}
									fs.writeFileSync(certDirectory + lcHostName + ".key", parts[2], "utf8", _);
									passphrases[lcHostName] = parts[4];
									passphrases = certTools.writePassphrases(certDirectory, passphrases, _);
								}
							} catch (e) {
								return _certToolResponse(response, null, "Error when writing files " + e);
							}
							// reload local certificate data
							try {
								var tcpName = _loadCertificates(_);
								if (localHost.tcpHostName !== tcpName) {
									if (!db) return _certToolResponse(response, null, "Cannot update host data in database");
									else {
										tracer && tracer("Set tcpname " + tcpName);
										var update = {
											tcpHostName: tcpName,
										};
										var hostsCollection = dbDriver.createCollection(db, 'Host', _);
										dbDriver.update(hostsCollection, {
											hostname: config.servername
										}, update, _);
									}
								}
								updateHostData(false, _);
							} catch (e) {
								return _certToolResponse(response, null, "Error during certificate reload " + e);
							}
							_certToolResponse(response, new Buffer(0));
							firstStartSignal(_);
						} finally {
							certGenToolData = undefined;
						}
						return;
					default:
						return _certToolResponse(response, null, "Wrong protocol");
				}

			case 'updateCertificate':
				// send/receive certificate information
				d = getData(streamRecorder ? streamRecorder.getStream() : request, _);
				if (!ownCertificate) {
					writeError(response, locale.format(module, "noBaseCert"));
					return;
				}
				var destination = request.headers[mock.BALANCER_HEADER];
				var sender;
				tracer && tracer("Update certificate for " + destination);
				if (destination) {
					if (destination === "*") { // send request to all servers
						delete request.headers[mock.BALANCER_HEADER];
						hosts.forEach(function(host) {
							if (!host.local && host.status >= STATUS_READY && host.dhKey) {
								tracer && tracer("Secure request to server " + host.hostname);
								futures.push(secureRequest(host, "POST", "/nannyCommand/updateCertificate", d, null, !_));
							}
						});
					} else {
						foundHost = hostsByName[destination];
						if (foundHost) {
							if (!foundHost.local) {
								if (foundHost.status >= STATUS_READY) {
									if (foundHost.dhKey) secureRequest(foundHost, "POST", "/nannyCommand/updateCertificate", d, null, _);
									else {
										writeError(response, locale.format(module, "notTrusted"));
									}
								} else {
									writeError(response, locale.format(module, "hostNotReady", destination));
									return;
								}
								d = null;
							}
						} else {
							d = null;
							writeError(response, locale.format(module, "hostNotFound", destination));
							return;
						}
					}
				} else {
					var unpacked = _secureUnpack(JSON.parse(d), _);
					d = unpacked[0];
					sender = hostsByName[unpacked[1]];
				}
				if (d) {
					changes = {};
					tracer && tracer("Request to parseRequestCert " + d);
					var answer;
					try {
						answer = certTools.parseRequestCert(_, JSON.parse(d), certificates, caCertificates, certDirectory, localHost, changes);
					} catch (e) {
						console.error("Error parsing certificates " + e.stack);
						writeError(response, "" + e, 409); // conflict which can be resolved
						return;
					}
					tracer && tracer("Answer to parseRequestCert " + answer);
					var answerJson = JSON.stringify(answer);
					if (!destination) {
						response.end(JSON.stringify(_securePack(answerJson, sender)));
					}
					if (changes.restart) { // restart server
						console.log("Connection data changed - restart server");
						// notify other hosts about status change (asynchronously!)
						shutdown(!_, undefined, true);
					} else {
						if (changes.missing && localHost.status === STATUS_READY) { // tell other hosts about changes in missing certificates
							hosts.forEach(function(host) {
								return startSignal(host, !_);
							});
						}
						if (changes.start) { // try to start connections anew
							console.log("Renew connections");
							startServer(_);
						}
					}
				}
				break;
			case 'details':
				// details information about children
				if (localHost.status === STATUS_READY) {
					var i = children.length;
					while (--i >= 0) {
						if (!children[i]) continue;
						future = children[i].mockClient.detail(!_, 1000);
						future.extra = {
							hostname: localHost.hostname,
							port: "N" + i
						};
						futures.push(future);
					}
					var i = wsChildren.length;
					while (--i >= 0) {
						if (!wsChildren[i]) continue;
						future = wsChildren[i].mockClient.detail(!_, 1000);
						future.extra = {
							hostname: localHost.hostname,
							port: "W" + i
						};
						futures.push(future);
					}
					if (batchChild) {
						future = batchChild.mockClient.detail(!_, 1000);
						future.extra = {
							hostname: localHost.hostname,
							port: "B0"
						};
						futures.push(future);
					}
				} else {
					resultText += JSON.stringify({
						hostname: localHost.hostname,
						message: "Children not yet started"
					}) + "\n";
				}
				if (commandType === "notifyNannies") { // extra information only from current host
					resultText += _stringifyHosts(hosts) + "\n";
				}
				break;
			case 'info':
				// info request
				resultText += util.inspect(hosts.map(function(host) {
					var result = {};
					Object.keys(host).forEach(function(key) {
						if (key.substr(0, 1) !== "_") {
							if ((key === "dhKey" || key === "certificate") && host[key]) {
								result[key] = "***";
							} else {
								result[key] = host[key];
							}
						}
					});
					return result;
				}), {
					depth: 3
				});
				var childResults = [];
				var now = Date.now();
				for (i = 0; i < children.length; i++) {
					var child = children[i];
					if (child) childResults.push("N" + i + ": " + child.mockClient.numberRequests() + " " + (child.syralast ? Math.max(0, child.syralast - now) : "-") + ";" + ("" + child.syratime).substr(0, 7));
				}
				for (i = 0; i < wsChildren.length; i++) {
					if (wsChildren[i]) childResults.push("W" + i + ": " + wsChildren[i].mockClient.numberRequests());
				}
				if (batchChild)
					childResults.push("B0" + ": " + batchChild.mockClient.numberRequests());
				// include restricted processes
				var alreadyNotified = [];
				for (var sess in restrictedSessions) {
					var child = restrictedSessions[sess];
					if (alreadyNotified.indexOf(child) < 0) {
						alreadyNotified.push(child);
						childResults.push("R: " + child.mockClient.numberRequests());
					}
				}
				resultText += "\n" + childResults.join(", ");
				break;
			case 'infojson':
				// info request
				resultText = _stringifyHosts(hosts);
				break;
			case 'started':
				// nanny has started
				try {
					d = getData(streamRecorder ? streamRecorder.getStream() : request, _);
					var hostData = JSON.parse(d);
					foundHost = null;
					for (var attempt = 0; attempt < 2; attempt++) {
						foundHost = hostsByName[hostData.hostname];
						if (foundHost && !foundHost.local) {
							_copyFluentData(foundHost, hostData);
							foundHost.started = true;
							foundHost.latestContact = Date.now();
							foundHost.pendingRequest = false; // maybe there is a get() request pending which will result in a timeout. It should not mark the host as unavailable.
							tracer && tracer("Host started " + foundHost.hostname);
							break;
						}
						console.log("Host found " + foundHost);
						if (!foundHost) updateHostData(false, _);
						else // maybe B0 process goes to different server
							startChildProcesses(true, !_);
					}
					if (!foundHost) {
						response.end(JSON.stringify(_minifyHost(localHost)));
						return;
					}
					checkVersions(_);
					// maybe update status of other host
					// console.log("HOST2 "+util.format(foundHost))
					if (foundHost && hosts.mainVersion !== foundHost.version) foundHost.status = STATUS_WRONG_VERSION;
					var returnValue = JSON.stringify(_minifyHost(localHost, hosts.mainVersion));
					tracer && tracer("return value on start request " + util.format(returnValue));
					response.end(returnValue); // send back local code version and main version
					// establish web socket?
					makeEngineIOClient(foundHost);
					var untrustedChange = false;
					// check security information
					if (foundHost.status >= STATUS_INIT && hostData.extra) { // first invocation: important for security information
						var security = _checkFirstData(null, hostData.extra, foundHost, _);
						if (security && foundHost) {
							foundHost = hostsByName[foundHost.hostname]; // maybe foundHost instance has changed during _checkFirstData
							var certs = [];
							if (_markTrusted(foundHost, true)) // host has passed checks and is trustworthy
								untrustedChange = true;
							certTools.pushMissing(foundHost, certs);
							tracer && tracer("Missing foreign certificates " + util.format(certs));
							certs = certTools.parseRequestCert(_, certs, certificates, caCertificates, certDirectory, foundHost);
							tracer && tracer("Answer " + util.format(certs));
							// add missing own certificates
							certTools.pushMissing(localHost, certs);
							tracer && tracer("Answer2 " + util.format(certs));
							// encode data
							security = _securePack(JSON.stringify(security));
							data = secureRequest(foundHost, "POST", "/nannyCommand/updateCertificate", JSON.stringify(certs), security, _);
							tracer && tracer("Answer3 " + util.format(data));
							var parsed = JSON.parse(data);
							changes = {};
							certs = certTools.parseRequestCert(_, parsed, certificates, caCertificates, certDirectory, localHost, changes);
							if (changes.restart) { // restart server
								console.log("Connection data changed - restart server");
								setTimeout(function() {
									process.exit(10);
								}, 1000);
							} else {
								if (changes.missing && localHost.status === STATUS_READY) { // tell other hosts about changes in missing certificates
									untrustedChange = false; // do not send another start signal
									hosts.forEach(function(host) {
										return startSignal(host, !_);
									});
								}
								if (changes.start) { // try to start connections anew
									console.log("Renew connections");
									startServer(_);
								}
							}
						} else {
							// host has not passed checks and is not trustworthy
							if (foundHost && _markTrusted(foundHost, false)) untrustedChange = true;
						}
						if (untrustedChange && localHost.status === STATUS_READY) {
							hosts.forEach(function(host) {
								return startSignal(host, !_);
							});
						}
					}
				} catch (e) {
					console.error("Error in start procedure " + e.stack);
					writeError(response, "Error in start procedure " + e);
				}
				return;
			case 'down':
				// nanny has stopped
				host = command[1];
				// update host data (nothing to do when host is not found)
				foundHost = hostsByName[host];
				if (foundHost && !foundHost.local) {
					foundHost.started = false;
					foundHost.status = STATUS_NOT_STARTED;
					tracer && tracer("Host down " + foundHost.hostname);
				}
				checkVersions(_);
				resultText += "OK - down\n";
				// maybe B0 process goes to different server
				startChildProcesses(true, !_);
				break;
			default:
				resultText += "OK " + command[0] + "\n";
		}

		tracer && tracer("Futures finished");
		for (i = 0; i < futures.length; i++) {
			if (!futures[i]) continue;
			var extra = futures[i].extra;
			try {
				var res = futures[i](_);
				if (extra instanceof Object) {
					extra.message = res;
					resultText += JSON.stringify(extra) + "\n";
				} else {
					resultText += (extra || "") + res + "\n";
				}
				tracer && tracer("result of future " + res + " ---- " + JSON.stringify(extra));
			} catch (e) {
				if (extra instanceof Object) {
					extra.message = "" + e;
					extra.failure = true;
					resultText += JSON.stringify(extra) + "\n";
				} else {
					resultText += (extra || "") + e + "\n";
				}
				console.log("error of future " + e);
			}
		}
		if (!sid) {
			response.writeHead(200, {
				'Content-Type': 'text/plain'
			});
			response.end(resultText);
			return;
		}
	}

	// console.log("==============================="+localHost.status)
	if (localHost.status < STATUS_READY) {
		var text;
		var temporary;
		switch (localHost.status) {
			case STATUS_START:
				temporary = 503;
				if (startupText.err) {
					text = locale.format(module, "beingStarted2", startupText.cnt, localHost.children + localHost.wsChildren + (localHost.batchChildren || 0), startupText.err);
				} else {
					text = locale.format(module, "beingStarted", startupText.cnt, localHost.children + localHost.wsChildren + (localHost.batchChildren || 0));
				}
				break;
			case STATUS_INIT:
				temporary = 503;
				text = locale.format(module, "notYetStarted");
				break;
			case STATUS_TIME_DIFFERENCE:
				text = locale.format(module, "timeDifference");
				break;
			case STATUS_WRONG_VERSION:
				text = locale.format(module, "wrongVersion", hosts.mainVersion, localHost.version);
				break;
			case STATUS_LOW_VERSION:
				text = locale.format(module, "lowVersion", localHost.version);
				break;
			case STATUS_RESPAWN:
				text = locale.format(module, "respawn");
				break;
			case STATUS_INACTIVE:
				text = locale.format(module, "inactive");
				break;
			case STATUS_NOT_REACHABLE:
				text = locale.format(module, "notReachable");
				break;
			case STATUS_NOT_STARTED:
				text = locale.format(module, "notStarted");
				break;
			case STATUS_NO_DB:
				text = locale.format(module, "noDB");
				break;
			case STATUS_NO_LICENSE:
				text = locale.format(module, "noLicense");
				break;
			default:
				text = locale.format(module, "wrongStatus", localHost.status);
		}
		writeError(response, text, temporary);
		return;
	}

	// the paths of all Web service requests start with "/soap-" and will be handled by a different pool of services
	if (request.url.substring(0, 6) === "/soap-" && request.method === "POST") {
		// Web service call
		if (wsChildren.length === 0) return writeError(response, locale.format(module, "noWs"), 503);
		if (config.hosting.multiTenant) {
			var tenantId = request.headers['x-forwarded-host'] || request.headers.host;
			if (tenantId) tenantId = tenantId.split(/[.:]/, 1)[0];
			lastWs = Math.abs(_hashCode(tenantId || "")) % wsChildren.length; // fixed process for each tenant
		} else {
			if (++lastWs >= wsChildren.length) lastWs = 0; // round robin
		}
		if (!wsChildren[lastWs]) {
			console.error("No ws process " + lastWs);
			writeError(response, locale.format(module, "wsError"), locale.format(module, "noWsChild", lastWs));
		}
		var client = wsChildren[lastWs].mockClient;
		var options = {};
		mock.extractDataFromRequest(request, options);
		var answered = false;
		var req = client.request(options, function(res) {
			response.writeHead(res.statusCode, res.headers);
			answered = true;
			res.pipe(response);
			res.resume();
		});
		req.on("error", function(error) {
			console.error("Web service invocation error " + error + " " + error.stack);
			if (!answered) {
				writeError(response, locale.format(module, "wsError"), error);
			}
		});
		request.pipe(req);
		request.resume();
		return;
	}


	streamRecorder = new recorder.StreamRecorder(request);
	if (mock.BALANCER_HEADER in request.headers) {
		if (localHost.status < STATUS_READY) {
			writeError(response, "Host not yet ready", true);
			return;
		}
		tracer && tracer("HEADER " + request.headers[mock.BALANCER_HEADER]);
		if (!/^N\d+(?:,\-?\d)*$/.test(request.headers[mock.BALANCER_HEADER])) {
			console.error("Wrong header " + request.headers[mock.BALANCER_HEADER]);
			writeError(response, "Incorrect balancer header " + request.headers[mock.BALANCER_HEADER]);
			return;
		}
		data = request.headers[mock.BALANCER_HEADER].split(",");
		var localPort = data[0];
		for (var attempts = 0; attempts < 2; attempts++) {
			var oldData; // has local or foreign host not been updated to current values in host table?
			if (data.length === hosts.length + 1) {
				for (i = data.length - 1; i > 0; i--) {
					var currHost = hosts[i - 1];
					if (currHost) {
						if (!currHost.local) {
							currHost.status = data[i];
							if (currHost.inactive && data[i] > STATUS_INACTIVE) {
								currHost.status = STATUS_INACTIVE;
								oldData = true;
							};
						}
						if (!currHost.inactive && data[i] === STATUS_INACTIVE) {
							oldData = true;
						}
					}
				}
			} else if (data.length > 1) {
				oldData = true;
			}
			if (oldData) {
				oldData = false;
				if (!attempts) {
					// first run: update local data
					updateHostData(true, _);
				} else {
					// second run: ask foreign servers to update its host data
					hosts.forEach(function(host) {
						if (!host.local && host.status >= STATUS_INACTIVE) {
							// invoke other servers as futures
							get(host, "GET", "/nannyCommand/update", null, !_, REQUEST_TIMEOUT);
						}
					});
				}
			}
		}
		tracer && tracer("balancer header " + localPort);
		var number = +localPort.substr(1);
		if (!(number in children)) {
			writeError(response, locale.format(module, "noChildNumber", localPort, localHost.hostname));
			return;
		}
		try {
			doRequest(streamRecorder, response, [localHost, localPort], _);
			return;
		} catch (e) {
			console.log("Error in local call to " + localPort + " " + e)
			writeError(response, locale.format(module, "giveUpLocal"));
		}
		return;
	}
	var sid;
	if (request.headers.cookie) {
		var newSession = _getSyracuseCookie(streamRecorder.originalStream);
		if (newSession) {
			sid = newSession;
			tracer && tracer("Session: " + sid);
		}
	}
	sessionTracer && sessionTracer((new Date()).toISOString() + "; request for: " + request.connection.remoteAddress + "; sid: " + sid);
	// check time with database time
	try {
		databaseTime.getTime(_, true);
	} catch (e) {
		localHost.status = STATUS_TIME_DIFFERENCE;
		writeError(response, locale.format(module, "timeDiffDatabase", localHost.hostname, TIME_THRESHOLD / 1000));
		startChildProcesses(true, _);
		return;
	}

	var redir = redirects[request.url];
	if (redir) {
		tracer && tracer("Redirect request " + request.url + " to same server");
		var hostport = redir[0];
		// delete redirection unless it is for change password page (because its url is fetched with GET and POST)
		if (request.url.substr(0, 11) !== "/auth/pwd--") {
			delete redirects[request.url];
		}
		doRequest(streamRecorder, response, hostport, _);
		tracer && tracer("Request finished");
		return;
	}

	if (sid) { // session available
		if (sid in restrictedSessions) { // session with special client
			var data = dbDriver.find(sessionCollection, {
				sid: sid
			}, _);
			if (data.length === 0) {
				sessionTracer && sessionTracer("Delete restricted session (not in database) " + sid);
				delete restrictedSessions[sid];
				delete nonDBSessions[sid];
				delete sessions[sid];
			} else {
				sessionTracer && sessionTracer("Use restricted session " + sid);
				doRequest(streamRecorder, response, sessions[sid], _, sid, null, restrictedSessions[sid].mockClient);
				return;
			}
		}
		if (sid in dedicated) {
			sessions[sid] = dedicated[sid];
		}
		if (sid in sessions) {
			host = sessions[sid][0];
			if (host.status < STATUS_READY) {
				sessionTracer && sessionTracer("Delete session " + sid + " " + util.format(host));
				if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
				deleteSession(sid, sessionCollection, _);
			} else {
				try {
					doRequest(streamRecorder, response, sessions[sid], _, sid);
					tracer && tracer("Request finished");
					return;
				} catch (e) {
					sessionTracer && sessionTracer("" + e + " Delete session " + sid + " " + util.format(host));
					if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
					deleteSession(sid, sessionCollection, _);
					tracer && tracer("Host not available " + host.hostname);
				}
			}
		}
		if (localHost.status === STATUS_FINISHING || localHost.status === STATUS_FINISHING2) {
			// no new sessions accepted during finish
			writeError(response, locale.format(module, "shuttingDown"));
			return;
		}
		// session not found - look into database whether it has been wrongly directed
		if (localBalancer) {
			if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
			var sess = dbDriver.find(sessionCollection, {
				sid: sid
			}, _);
			if (sess.length > 0 && sess[0].serverName.indexOf(config.servername) !== 0) {
				console.error("Session " + sid + " on server " + sess[0].serverName + " wrongly directed to " + config.servername);
			}
		}

		// there may be parallel requests from the same client at this part of the code. They must be directed to the same Syracuse process!
		data = _balanceload(_, sid, localBalancer);
		// maybe session is now known
		if (sid in sessions) {
			host = sessions[sid][0];
			if (host.status < STATUS_READY) {
				sessionTracer && sessionTracer("Delete session3 " + sid + " " + util.format(host));
				deleteSession(sid, sessionCollection, _);
			} else {
				try {
					doRequest(streamRecorder, response, sessions[sid], _, sid);
					return;
				} catch (e) {
					sessionTracer && sessionTracer("" + e + "Delete session4 " + sid + " " + util.format(host));
					deleteSession(sid, sessionCollection, _);
					console.log("Host not available1 " + host.hostname);
				}
			}
		}
	}

	// session not available any more
	if (localHost.status === STATUS_FINISHING || localHost.status === STATUS_FINISHING2) {
		// no new sessions accepted during finish
		writeError(response, locale.format(module, "shuttingDown"));
		return;
	}
	for (i = 0; i < 2; i++) {
		var balancerKey = sid; // key of currentlyBalanced 
		if (!data) {
			balancerKey = "" + mock.getLocalPort(request) + "." + request.headers.cookie;
			data = _balanceload(_, balancerKey, localBalancer);
			if (!data) {
				if (config.hosting.multiTenant)
					throw new Error("Cannot balance " + request.url)
				return differentVersionError(response);
			}
		}
		try {
			doRequest(streamRecorder, response, data, _, undefined, balancerKey);
			return;
		} catch (e) {
			console.log("Attempt " + i + ": host not available " + data[0].hostname + " Error " + e);
			data = null;
		}
	}
	writeError(response, locale.format(module, "giveUp"));
	return;
}

function _writeErrorStatus(response) {
	var text;
	var temporary;
	switch (localHost.status) {
		case STATUS_START:
			temporary = 503;
			if (startupText.err) {
				text = locale.format(module, "beingStarted2", startupText.cnt, localHost.children, startupText.err);
			} else {
				text = locale.format(module, "beingStarted", startupText.cnt, localHost.children);
			}
			break;
		case STATUS_INIT:
			temporary = 503;
			text = locale.format(module, "notYetStarted");
			break;
		case STATUS_TIME_DIFFERENCE:
			text = locale.format(module, "timeDifference");
			break;
		case STATUS_WRONG_VERSION:
			text = locale.format(module, "wrongVersion", hosts.mainVersion, localHost.version);
			break;
		case STATUS_LOW_VERSION:
			text = locale.format(module, "lowVersion", localHost.version);
			break;
		case STATUS_RESPAWN:
			text = locale.format(module, "respawn");
			break;
		case STATUS_INACTIVE:
			text = locale.format(module, "inactive");
			break;
		case STATUS_NOT_REACHABLE:
			text = locale.format(module, "notReachable");
			break;
		case STATUS_NOT_STARTED:
			text = locale.format(module, "notStarted");
			break;
		case STATUS_NO_DB:
			text = locale.format(module, "noDB");
			break;
		case STATUS_NO_LICENSE:
			text = locale.format(module, "noLicense");
			break;
		default:
			text = locale.format(module, "wrongStatus", localHost.status);
	}
	writeError(response, text, temporary);
}

var wait = function(time, callback) {
	setTimeout(callback, time);
};

// shutdown: finish sessions, close DB connection and then exit with status 10
// Parameters:
// exclude: exclude this Syracuse server (e. g. N0)
// notify: notify other hosts about status change and only consider sessions on local host (under this nanny process)
function shutdown(_, exclude, notify) {
	if (localHost.status === STATUS_FINISHING2 || notify && localHost.status === STATUS_FINISHING) {
		console.log("Shutdown stopped - already status " + localHost.status)
		return; // already global shutdown or local shutdown running
	}
	// a global shutdown (for patch integration) will override a local shutodwn
	if (db) {
		if (!sessionCollection) sessionCollection = dbDriver.createCollection(db, 'SessionInfo', _);
		try {
			stopSessions(sessionCollection, exclude, _, notify);
		} catch (e) {
			console.log("Exception stopSessions " + e);
		}
		console.log("After stopSessions");
		var hostsCollection = dbDriver.createCollection(db, 'Host', _);
		dbDriver.update(hostsCollection, {
			hostname: config.servername
		}, {
			started: false
		}, _);
		dbDriver.close(db);
	}
	console.log("END");
	process.nextTick(function() {
		console.log("Exit process");
		process.exit(10);
	});
}

var stopSessions = function(sessionCollection, exclude, callback, notify) {
	var remainingTime = POLL_TIME + POLL_INTERVAL;
	var count = 1; // number of sessions (will be set by database query)
	var wsCount = 0; // number of Web service processes with running web services
	var answerSent = false;
	// pattern for either all sessions on this host or for all sessions in the cluster
	var regexp = notify ? new RegExp("^" + config.servername + ":N".replace(/([\.\*\:\-\[\\\]\(\)])/g, "\\$1")) : /\:N\d+$/;
	tracer && tracer("Regexp for stopSessions " + regexp);

	function pollfunction() {
		try {
			remainingTime -= POLL_INTERVAL;
			console.log(answerSent + "Poll for sessions, count " + count + " wsCount " + wsCount + ", remaining " + remainingTime);
			// stop polling when local shutdown is overriden by global shutdown
			if (notify && localHost.status === STATUS_FINISHING2) {
				console.log("Local shutdown stopped")
				answerSent = true;
			}
			if (!answerSent) {
				if (count === 0 && wsCount === 0) {
					answerSent = true;
					return callback(null);
				}
				if (remainingTime <= 0) {
					console.log("Remove sessions");
					answerSent = true;
					dbDriver.remove(sessionCollection, {
						serverName: regexp
					}, callback);
					return;
				}
				if (remainingTime <= 0 || (count === 0 && wsCount === 0)) {
					console.log("");
					answerSent = true;
					return callback(null);
				}
				// start function again
				setTimeout(pollfunction, POLL_INTERVAL);
				// count web services
				wsCount = 0;
				var i = wsChildren.length;
				while (--i >= 0) {
					if (!wsChildren[i]) continue;
					var re = wsChildren[i].mockClient.numberRequests();
					if (re !== "0/0") {
						console.log("Web service process W" + i + ": " + re);
						wsCount++;
					}
				}
				if (batchChild) {
					var re = batchChild.mockClient.numberRequests();
					if (re !== "0/0") {
						console.log("Batch process B0: " + re);
						wsCount++;
					}
				}
				// start database query
				dbDriver.count(sessionCollection, {
					serverName: regexp
				}, function(error, cnt) {
					console.log("Session cnt Error: " + error + " count: " + cnt);
					if (error) {
						answerSent = true;
						return callback(error);
					}
					count = cnt;
				});
			}
		} catch (e) {
			console.log("Error in poll function " + e + " " + e.stack);
			if (!answerSent) {
				answerSent = true;
				return callback(e);
			}
		}
	}

	try {
		pollfunction();
		if (localHost.status < STATUS_READY) {
			// just stop the starting child processes
			console.log("stopSessions: Stop all child processes");
			localHost.status = STATUS_NOT_STARTED;
			children.forEach(function(child) {
				if (child) {
					child.terminate = true;
					child.kill();
				}
			});
			wsChildren.forEach(function(child) {
				if (child) {
					child.terminate = true;
					child.kill();
				}
			});
		} else {
			// notification to all Syracuse processes that sessions will expire
			console.log("stopSessions: notify all child processes");
			var options = {
				path: "/patch/notifyEnd",
				method: "GET",
				fromNanny: true
			};
			var futures = [];
			for (var i = children.length - 1; i >= 0; i--) {
				console.log("Stop session N" + i + " exclude " + exclude);
				if ("N" + i !== exclude && children[i]) futures.push(mock.simpleRequest(children[i].mockClient, options, !_));
			}
			var alreadyNotified = [];
			for (var sess in restrictedSessions) {
				var child = restrictedSessions[sess];
				if (alreadyNotified.indexOf(child) < 0) {
					alreadyNotified.push(child);
					console.log("Stop session restricted exclude " + exclude);
					futures.push(mock.simpleRequest(child.mockClient, options, !_));
				}
			}
		}
		localHost.status = notify ? STATUS_FINISHING : STATUS_FINISHING2;
		// notify other hosts about status change
		if (notify) hosts.forEach(function(host) {
			return startSignal(host, !_);
		});
	} catch (e) {
		console.log("Error in stop function " + e);
		if (!answerSent) {
			answerSent = true;
			return callback(e);
		}
	}
};

//check certificate etc. of other host
//when 'ownChallenge' is not set, a challenge (which has to do with the current time) will taken from data
//data is an object with fields:
//- time (optional): when present, this will be taken as challenge and will be verified with current time
//- challenge (optional): challenge to sign with own key
//- sign: signature of the challenge
//- cert: certificate
//- dh: Diffie-Hellman key (will be taken when checks are OK)
//result is null when checks are not OK
//When checks are OK and a foreign challenge is given, the foreign challenge will be signed.

function _checkFirstData(ownChallenge, data, host, _) {
	try {
		tracer && tracer("Check first data" + ownChallenge + " " + util.format(data));
		host.dhKey = null;
		host.certificate = null;
		if (!data) return null;
		tracer && tracer("Data available");
		// decipher data
		if (data.iv) {
			data = _secureUnpack(data, _)[0];
			data = JSON.parse(data);
		}
		if (!ownCertificate) return null;
		// verify data
		var challenge;
		if (!ownChallenge) {
			if (!data.time) return null;
			// compare the time
			var timediff = databaseTime.getReducedTime(_) - data.time;
			console.log("Compare time " + timediff);
			if (timediff < 0 || timediff > 1) return null;
			challenge = localHost.hostname + " " + data.time;
		} else {
			challenge = ownChallenge;
		}
		// verify the foreign challenge
		tracer && tracer("Verify challenge");
		if (!_verifyText(challenge, data.cert, data.sign)) return null;
		// verify the foreign certificate
		tracer && tracer("Verify certificate");
		if (host.certificate !== data.cert) {
			var certificate = new jsx509.Certificate(data.cert);
			if (!certificate.verify(ownCertificate.caCertificates[0].certificate)) return null;
			tracer && tracer("Store data locally");
			// check server name
			// !!! maybe recent database changes
			var tcpName = certificate.subject.commonName;
			tracer && tracer("Server name from Certificate " + tcpName + " known name " + host.tcpHostName);
			if (tcpName !== host.tcpHostName) { // maybe in the mean time, something has changed in the database
				tracer && tracer("Reload host data to find TCP name from database");
				updateHostData(false, _);
				host = hostsByName[host.hostname];
				tracer && tracer("New host " + util.format(host));
			}
			if (tcpName !== host.tcpHostName) {
				tracer && tracer("Wrong hostname in DB: " + host.tcpHostName + ", expected " + tcpName);
				return null;
			}
			tracer && tracer("Correct server name");
			host.certificate = data.cert;
		}
		host.dhKey = new Buffer(diffieHellman.computeSecret(data.dh, "base64", "binary").substr(0, 32), "binary");
		var signature;
		if (data.challenge) {
			tracer && tracer("Sign the new challenge" + util.format(challenge));
			// sign the challenge
			signature = _signText(data.challenge);
		}
		return {
			sign: signature,
			cert: ownCertificate.certificate,
			dh: diffieHellman.getPublicKey("base64")
		};

	} catch (e) {
		console.log("Error in check data: " + e + " " + e.stack);
		return null;
	}
}

//sign text with own private key. Output: base64

function _signText(text) {
	var sign = crypto.createSign("RSA-SHA1");
	sign.update(text, "utf8");
	return sign.sign(ownCertificate.key, "base64");
}

//verify text with given certificate. Signature must be in base64
// may return an exception when verification is not OK (dependent on node.js version)

function _verifyText(text, certificate, sign) {
	var verify = crypto.createVerify("RSA-SHA1");
	verify.update(text, "utf8");
	return verify.verify(certificate, sign, "base64");
}

/// read certificates from file system and perform checks
///
/// Parameters:
/// * certificate: object of database content of that (CA) certificate. When empty: consider internal (CA) certificate of local host
/// * ca: when true: CA certificate
/// * passphrases: object with passphrases
/// * newPassphrase: take that passphrase instead of passphrase from passphrases object
/// * cas: object with CA certificates (only necessary when certificate parameter is empty
/// * files: content of directory
/// * tenantId: ID of tenant
///
/// Result: object with attributes
/// * key: decrypted private key
/// * cert: certificate object
/// * certificate: certificate text (certificate file content) in PEM format

function checkFileCertificates(_, certificate, ca, passphrases, newPassphrase, cas, files, tenantId) {
	if (!certificate) {
		certificate = {
			name: (ca ? "ca" : lcHostName),
			internal: true
		};
	}
	// read certificate from file
	var basename = certificate.name + (ca ? ".cacrt" : ".crt");
	var directory = certDirectory + (tenantId ? tenantId + "/" : "");
	var cert, index;
	if (files) {
		index = files.indexOf(basename);
		if (index < 0) {
			throw new Error(locale.format(module, "noExCertFile", certificate.name));
		} else {
			files.splice(index, 1); // remove entry
			tracer && tracer("Found " + basename);
		}
	}

	try {
		cert = fs.readFile(directory + basename, "utf8", _);
	} catch (e) {
		if (e.code === 'ENOENT') throw new Error(locale.format(module, "noExCertFile", certificate.name));
		else throw new Error(locale.format(module, "noCertFile", certificate.name, e));
	}
	// check whether certificate fits to hash (not for internal certificates)
	if (db && !certificate.internal) {
		var hash = crypto.createHash('md5');
		hash.update(cert, "utf8");
		if (certificate.certificateHash !== hash.digest('hex')) {
			throw new Error(locale.format(module, "wrongHash", certificate.name));
		}
	}
	var key;
	if (!ca && (certificate.keyExists || certificate.internal)) {
		basename = certificate.name + ".key";
		if (files) {
			index = files.indexOf(basename);
			if (index < 0) {
				throw new Error(locale.format(module, "noExKeyFile", certificate.name));
			} else {
				files.splice(index, 1); // remove entry
				tracer && tracer("Found " + basename);
			}
		}
		try {
			key = fs.readFile(directory + basename, "utf8", _);
		} catch (e) {
			if (e.code === 'ENOENT') throw new Error(locale.format(module, "noExKeyFile", certificate.name));
			else throw new Error(locale.format(module, "noKeyFile", certificate.name, e));
		}
	}
	// prepare CA certificates
	if (certificate.caCertificates) {
		cas = certificate.caCertificates.map(function(cert) {
			return cert.certificate;
		});
	}
	// integrity check
	var integ = jsx509.integrity(cert, key, newPassphrase || passphrases && passphrases[certificate.name] || "", cas);
	if (integ.error) {
		// Integrity check failed
		console.log("Integrity check " + certificate.name + ": " + integ.error);
		throw new Error(integ.error);
	}
	integ.certificate = cert;
	return integ;
}

function _getRandom(length) {
	var result = new Buffer(length);
	for (var i = 0; i < length / 4; i++) {
		var n = Math.floor(Math.random() * (1 << 31));
		result.writeInt32LE(n, 4 * i);
	}
	return result;
}

//encrypts the data using the common Diffie-Hellman key, may include authentication information
//takes data (as string or buffer) and returns object

function _securePack(data, host, auth) {
	try {
		var iv = _getRandom(16);
		var cipher = crypto.createCipheriv("AES256", host ? host.dhKey : caHash, iv);
		// console.log("EN "+data)
		var encrypted = cipher.update(data, "utf8", "base64");
		encrypted += cipher.final("base64");
		var signature;
		if (host) { // sign the data
			signature = _signText(encrypted);
		}
		return {
			data: encrypted,
			iv: iv.toString("base64"),
			sender: host ? localHost.hostname : undefined,
			auth: auth,
			sign: signature
		};
	} catch (e) {
		console.log("Error in _securePack " + e + " " + e.stack + " " + e.trace);
	}
}

//decrypts the data using the common Diffie-Hellman key
//takes data as object and returns array with content: decrypted data and host name of sender

function _secureUnpack(parsed, _) {
	if (!ownCertificate) throw new Error(locale.format(module, "noCertificate"));
	var key;
	if (parsed.sender) {
		var host = hostsByName[parsed.sender];
		// console.log("HOST "+host.hostname+" "+host.certificate);
		if (!host.certificate) {
			if (parsed.auth && _checkFirstData(host.challenge, parsed.auth, host, _)) {
				host = hostsByName[parsed.sender]; // maybe host has changed during checkFirstData
				console.log("Secure unpack auth OK");
				host.challenge = undefined;
				_markTrusted(host, true); // host has proved to be trusted
			} else {
				throw new Error(locale.format(module, "noAuth"));
			}
		}
		key = host.dhKey;
		// verify signature
		if (!_verifyText(parsed.data, host.certificate, parsed.sign)) throw new Error(locale.format(module, "wrongSign"));
	} else {
		key = caHash;
	}
	var iv = new Buffer(parsed.iv, "base64");
	var decrypted;
	try {
		var decipher = crypto.createDecipheriv("AES256", key, iv);
		decrypted = decipher.update(parsed.data, "base64", "utf8");
		decrypted += decipher.final("utf8");
	} catch (e) {
		throw new Error(parsed.sender ? locale.format(module, "dhMismatch") : locale.format(module, "baseCAMismatch"));
	}
	var result = [decrypted, parsed.sender];
	// console.log("RESULT "+util.format(result));
	return result;
}

//sends and receives the request with encrypted data

function secureRequest(hostdata, method, path, data, auth, _) {
	tracer && tracer("Secure request " + method + " " + path);
	if (!hostdata.dhKey) throw new Error(locale.format(module, "noTrust", hostdata.hostname));
	var encryptedData = _securePack(data, hostdata, auth);
	var result = get(hostdata, method, path, JSON.stringify(encryptedData), _, REQUEST_TIMEOUT);
	tracer && tracer("Result " + util.format(result));
	var parsed = JSON.parse(result);
	return _secureUnpack(parsed, _)[0];
}

// delete a single Syracuse session from database

function deleteSession(session, sessionCollection, _) {
	delete sessions[session];
	delete restrictedSessions[session];
	delete nonDBSessions[session];
	dbDriver.remove(sessionCollection, {
		sid: session
	}, _);
}

//writes an error response. When parameter 'temporary' is set, it will be a 503 response (service not available)

function writeError(response, reason, temporary) {
	console.log("write error " + reason);
	response.writeHead(temporary ? temporary : 500, "Error", {
		"Content-Type": "text/plain",
		"Content-Length": new Buffer(reason, "utf8").length
	});
	response.end(reason);
}

function differentVersionError(response) {
	if (localHost.status >= STATUS_READY) {
		writeError(response, locale.format(module, "differentVersions", hosts.map(function(host) {
			return host.hostname + "/" + host.version;
		}).join(", ")));
	} else {
		_writeErrorStatus(response);
	}
}

// read all data from a stream
var getData = function(stream, callback) {
	stream.setEncoding('utf8');
	stream.resume();
	var result = "";
	stream.on('data', function(chunk) {
		result += chunk;
	});
	stream.on('end', function() {
		return callback(null, result);
	});
};

// answer to Certificate generation tool

function _certToolResponse(response, buf, errortext) {
	if (errortext) {
		buf = new Buffer(errortext, "utf8");
	}
	response.writeHead(200, "OK", {
		"Content-Type": "application/octet-stream",
		"Content-Length": 1 + buf.length
	});
	var resp = Buffer.concat([new Buffer([errortext ? 1 : 0]), buf], 1 + buf.length);
	response.end(resp);
	return;
}

//read all data from a stream into a buffer
var getDataBinary = function(stream, callback) {
	stream.resume();
	var result = [];
	stream.on('data', function(chunk) {
		result.push(chunk);
	});
	stream.on('end', function() {
		return callback(null, Buffer.concat(result));
	});
};

// Java hash code function of a string
function _hashCode(s) {
	var len = s.length;
	if (len === 0) return 0;
	var hash = 0;
	for (var i = 0; i < len; i++) {
		hash = ((hash << 5) - hash) + s.charCodeAt(i);
		hash |= 0;
	}
	return hash;
}

exports._h = _hashCode;

// find child process with lowest load
// function will contact other servers to find out load of their child processes. This will not be done when 
function _balanceInternal(_, local) {
	var now = Date.now();

	function _balanceHost(array, host) {
		var i = array.length;
		while (--i >= 0) {
			var child = array[i];
			tracer && tracer(host.hostname + " " + i + " " + child.syratime + " " + child.syralast + " " + now + " minimal " + minimal);
			if (!child || child.syratime == undefined) continue;
			var value = child.syratime;
			if (child.syralast) { // syralast: timestamp of last new session plus some value. This makes children with freshly assigned sessions less attractive for balancing
				var diff = child.syralast - now;
				if (diff <= 0) {
					child.syralast = undefined;
				} else {
					value += diff;
				}
			}
			if (value <= minimal) {
				minimal = value;
				goodhost = host;
				goodport = i;
				goodchild = child;
			}
		}
	}
	// each child process has some value (sliding mean of response times plus time for obtained new sessions)
	// aim is to get the child process with lowest value. Therefore in the beginning a very high value
	var minimal = 1000000000000000;
	var goodhost; // host which will do the session
	var goodport; // number of child on the host which will do the balancing
	var goodchild; // instance of object (local child instance or object with syratime and syralast values)
	if (!local) { // query other servers
		balancerFunnel(_, function(_) { // use funnel to avoid that parallel balancing actions (during wait time) again start requests to the other servers
				var contacted;
				hosts.forEach(function(host) {
						tracer && tracer("Host " + host.hostname + " " + (now - host.latestContact));
						if (host.local || host.status != STATUS_READY || host.latestContact && now - host.latestContact < CHILD_PING2_POLLING) return;
						tracer && tracer("will be contacted")
						contacted = true;
						startSignal(host, !_);
					})
					// wait for results for some fixed time, not longer (only here the function is asynchronous)
				if (contacted)
					wait(BALANCING_WAIT_TIME, _);
			})
			// collect results
		hosts.forEach(function(host) {
			if (host.local || host.status != STATUS_READY) return;
			// in some exceptional cases (renaming host while syracuse is running, then running setup which will create additional entry in host entity), 
			// loaddata are not yet set.
			if (!host.loaddata) console.log("Host not yet ready " + _minifyHost(host))
			else _balanceHost(host.loaddata, host);
		})
	}
	_balanceHost(children, localHost);
	// distribute new session
	if (!goodhost) { // airbag: take child 0 of current host as last possibility when nothing has been found
		goodchild = children[0];
		goodport = 0;
		goodhost = localHost;
	}
	if (goodchild) {
		if (goodchild.syralast && goodchild.syralast >= now) goodchild.syralast += CHILD_PING2_POLLING;
		else goodchild.syralast = now + CHILD_PING2_POLLING;
	}
	return [goodhost, "N" + goodport, now];
}


// load balancing with respect to load of sessions
// do balancing, handle parallel requests from the same client
// sessionId: session id for which there should be balancing
// local: only consider local host
function _balanceload(_, sessionId, local) {
	function _addWait(array, callback) {
		tracer && tracer("Wait for balancing for " + sessionId);
		array.push(callback);
		// callback will be called later!
	}
	if (!sessionId) {
		return _balanceInternal(_, local)
	}
	var array = currentlyBalanced[sessionId];
	if (array) {
		if (array[0]) return array[1]; // already first balancing done
		else return _addWait(array, _);
	} else {
		array = currentlyBalanced[sessionId] = [null]; // host not known yet
		var now = Date.now();
		// clean up old sessions
		var timeoutvalue = now - (30 + (config.session.timeout || 20)) * 60000; // 
		for (var key in sessions) {
			if (sessions[key][2] && sessions[key][2] < timeoutvalue) {
				sessionTracer && sessionTracer("Delete old session " + key + " " + (now - sessions[key][2]))
				delete sessions[key];
			}
		}
		var data;
		try {
			data = _balanceInternal(_, local);
		} finally {
			// clean up old entries
			for (var key in currentlyBalanced) {
				var value = currentlyBalanced[key];
				if (value[0] && value[1] && value[0] < now - 1000) {
					sessionTracer && sessionTracer("Delete key " + key + " time difference " + (now - value[0]));
					delete currentlyBalanced[key];
				}
			}
			currentlyBalanced[sessionId] = [now, data]; // host known
			// execute callbacks
			array.slice(1).forEach(function(item) {
				process.nextTick(function() {
					return item(null, data);
				});
			});
		}
		return data;
	}
}



function doRequestWithAnswer(streamRecorder, hostPort, _, client) {
	tracer && tracer("Do req with answer to " + hostPort[0].hostname + ":" + hostPort[1] + " " + streamRecorder.originalStream.url);
	var dummyResponse = new mock.MemoryStream();
	doRequest(streamRecorder, dummyResponse, hostPort, _, null, null, client);
	tracer && tracer("Answer from host " + dummyResponse.content);
	return dummyResponse.content;
}

var doRequest = function(streamRecorder, response, hostPort, callback, sessionId, cookieValue, client) {
	var options;
	var sessionHostName;
	var connectionData = hostPort[0].connectionData[0];
	var port = "" + (hostPort[1] ? hostPort[1] : connectionData.port);
	var foundHost = hostsByName[hostPort[0].hostname];
	if (hostPort[2]) hostPort[2] = Date.now();
	if (sessionTracer) {
		try {
			sessionTracer((new Date()).toISOString() + "; sid: " + (sessionId ? sessionId : "none") + "; hostname: " +
				(hostPort[0] || {}).hostname + "; port: " + hostPort[1]);
		} catch (e) {
			sessionTracer("Session tracer error : " + e.massage);
		}
	}
	if (foundHost) {
		foundHost.pendingRequest = true;
		// console.log("PENDING "+foundHost.hostname)
	}
	if (!sessionId) {
		sessionHostName = localHost.hostname + ":" + port;
		if (sessionHostName in currentNewRequests) {
			currentNewRequests[sessionHostName]++;
		} else {
			currentNewRequests[sessionHostName] = 1;
		}
	}
	var sslHeader;
	if (hostPort[0].hostname === localHost.hostname) {
		tracer && tracer("local request to " + hostPort[1]);
		options = mock.extractDataFromRequest(streamRecorder.originalStream);
		if (streamRecorder._fromNanny) options.fromNanny = true;
		if (mock.BALANCER_HEADER in streamRecorder.originalStream.headers) {
			delete streamRecorder.originalStream.headers[mock.BALANCER_HEADER];
			sslHeader = streamRecorder.originalStream.headers[SSL_HEADER];
			tracer && tracer("Remote connection information " + util.format(sslHeader));
			if (sslHeader) {
				try {
					var parsed = JSON.parse(sslHeader);
					if (parsed.length > 2) {
						options.connection = {
							remoteAddress: parsed[0],
							localPort: parsed[1],
							authorized: parsed[2],
							_peerCertificate: parsed[3]
						};
					} else {
						options.connection = {
							remoteAddress: parsed[0],
							localPort: parsed[1],
						};
					}
				} catch (e) {
					writeError(response, locale.format(module, "sslHeaderError", e, sslHeader));
					return;
				}
			} else {
				options.connection = {};
			}
		}
		// maybe use restricted server
		if (!client) {
			var child0;
			if (hostPort[1][0] === "B") child0 = batchChild;
			else child0 = (hostPort[1][0] === "W" ? wsChildren : children)[hostPort[1].substr(1)];
			if (child0) client = child0.mockClient;
			else {
				console.log("Cannot find child process " + hostPort[1])
				writeError(response, locale.format(module, "noChildProcess", hostPort[1]));
				return;
			}
		}
	} else {
		if (/^[NWB]/.test(port)) {
			streamRecorder.originalStream.headers[mock.BALANCER_HEADER] = hostPort[1] + "," + statusString();
			var conn = streamRecorder.originalStream.connection;
			if (conn) {
				// transfer relevant socket information in SSL_HEADER
				var connData = [conn.remoteAddress, conn.localPort];
				if ("authorized" in conn) {
					connData.push(conn.authorized, conn.getPeerCertificate());
				}
				streamRecorder.originalStream.headers[SSL_HEADER] = JSON.stringify(connData);
			}
			port = connectionData.port;
			tracer && tracer("Set port to nanny port " + port);
		}
		var address = hostPort[0].hostname;
		if (hostPort[0].tcpHostName) address = hostPort[0].tcpHostName;
		options = {
			connection: {},
			hostname: address,
			port: port,
			method: streamRecorder.originalStream.method,
			path: streamRecorder.originalStream.url,
			headers: streamRecorder.originalStream.headers
		};
		if (config.hosting.multiTenant) {
			var tenantHeader0 = (options.headers['x-forwarded-host'] || options.headers.host || options.headers.hostname);
			if (!tenantHeader0) console.error("No tenant header " + util.format(options));
			options.headers[mock.TENANT_HEADER] = tenantHeader0;
			tracer && tracer("Set tenant header " + options.headers[mock.TENANT_HEADER]);
		}
		client = sslOptions(connectionData, options);
	}
	var ress;
	var req = client.request(options, function(res) {
		ress = res;
		if (sessionHostName) {
			currentNewRequests[sessionHostName]--;
			sessionHostName = null;
		}
		var foundHost = hostsByName[hostPort[0].hostname];
		if (foundHost) foundHost.pendingRequest = false;
		res.pause();
		res.on('end', function() {
			callback(null);
		});
		var date;
		if (hostPort[0].hostname !== localHost.hostname) {
			date = res.headers.date;
			if (date) {
				var diff = Date.now() - new Date(date).getTime();
				tracer && tracer("Time difference " + diff);
				if (diff > TIME_THRESHOLD || -diff > TIME_THRESHOLD) {
					hostPort[0].status = STATUS_TIME_DIFFERENCE;
					console.error("Time difference error. Date header " + date + " local time " + new Date() + " difference " + diff + " URL " + util.format(options));
					writeError(response, locale.format(module, "timeDifference2", localHost.hostname, hostPort[0].hostname, (TIME_THRESHOLD / 1000)));
					return;
				}
			}
		}
		//redirect certain requests to same host
		if (res.statusCode === 303) {
			// console.log("HEAD " + util.format(res.headers));
			var redirectUrl = res.headers.Location || res.headers.location;
			date = _clearRedirects();
			if (redirectUrl && redirectUrl !== "/") {
				redirects[redirectUrl] = [hostPort, date];
				tracer && tracer("add redirect for " + redirectUrl + " " + sessionId);
			}
		}
		// mark a child process as restricted: this child process must not accept any new sessions any more
		if (res.statusCode === 500 && res.headers[mock.RESTRICT_HEADER] === 'on' && hostPort[0].hostname === localHost.hostname) {
			// get restricted process
			_restrict(hostPort[1]);
		}
		var cookies = res.headers['set-cookie'];
		if (cookies) {
			if (Array.isArray(cookies)) cookies = cookies.join(" ");
			if (cookies && streamRecorder.originalStream.connection && streamRecorder.originalStream.connection.__syra_localPort) {
				if (Array.isArray(cookies)) cookies = cookies.join(" ");
				var newSession = _getSyracuseCookie(streamRecorder.originalStream, cookies);
				if (newSession && newSession !== sessionId) {
					sessionTracer && sessionTracer("new session " + sessionId);
					if (sessionId) {
						delete sessions[sessionId];
						delete dedicated[sessionId];
						delete restrictedSessions[sessionId];
						delete currentlyBalanced[sessionId];
						delete nonDBSessions[sessionId];
					} else if (cookieValue) {
						sessionTracer && sessionTracer("DELETE CURRENTLY " + cookieValue);
						delete currentlyBalanced[cookieValue];
					}
					hostPort[2] = Date.now(); // for cleaning up old sessions
					sessions[newSession] = hostPort;
					nonDBSessions[newSession] = hostPort;
				}
			}
		}
		var resHeaders = res.headers;
		if ("date" in resHeaders) {
			delete resHeaders.date;
			if ("date" in resHeaders) { // maybe headers object is write protected
				resHeaders = {};
				Object.keys(res.headers).forEach(function(head) {
					if (head !== 'date') resHeaders[head] = res.headers[head];
				});
			}
		}
		response.writeHead(res.statusCode, resHeaders);
		res.resume();
		res.pipe(response);
	});
	req.on("error", function(err) {
		// mark server as down unavailable
		if (sessionHostName) {
			currentNewRequests[sessionHostName]--;
			sessionHostName = null;
		}
		tracer && tracer("Error " + util.format(hostPort[0]));
		tracer && tracer("Mark as down");
		var foundHost = hostsByName[hostPort[0].hostname];
		console.error("MARK " + new Date().toISOString() + " " + util.format(foundHost) + " hostport " + util.format(hostPort) + " Error " + err + " Options " + util.format(options) + " Response " + util.format(ress));
		if (foundHost.pendingRequest) {
			foundHost.pendingRequest = false;
			if (foundHost.local) {
				console.error("Child probably crashed during request: " + err + " " + err.stack + " Host data: " + util.format(hostPort) + " Request options: " + util.format(options));
				var text = new Buffer(locale.format(module, "childDied"), "utf8");
				var headers = {
					"content-length": text.length,
					"content-encoding": "utf-8",
					"content-type": "text-plain",
					"retry-after": 10
				};
				response.writeHead(503, headers);
				response.end(text);
			}
			//else foundHost.status = STATUS_NOT_REACHABLE; maybe just very long response time - delegate this to engine.io
		}
		// connection error - try to find other server
		tracer && tracer("Connection error " + err + " " + util.format(hostPort));
		return callback(err);
	});
	streamRecorder.newStream().pipe(req);
};

function _restrict(pseudoport, kill) {
	var childnumber = pseudoport.substr(1);
	console.log("Restricted process " + pseudoport + " " + kill);
	var childprocess = children[childnumber];
	if (childprocess) {
		childprocess.terminate = true; // do not restart this process any more
		if (kill) childprocess.kill();
		else {
			restrictedServers.push(childprocess);
			if (restrictedServers.length >= Math.max(1, MAX_RESTRICTED_CHILDREN)) {
				console.log("Kill last restricted process");
				restrictedServers.pop().kill();
			}
		}
		// get sessions of restricted process
		Object.keys(sessions).forEach(function(sess) {
			if (!(sess in restrictedSessions)) {
				var hostp = sessions[sess];
				if (hostp[1] === pseudoport && hostp[0].hostname === localHost.hostname) {
					restrictedSessions[sess] = childprocess;
					console.log("Session restricted " + sess);
				}
			}
		});
		// assign new child process
		children[childnumber] = null;
		createProcess(undefined, "N" + childnumber, 'no_cleanup');
		_childping(!_, children[childnumber]);
	}
}

function _childping(_, child) {
	if (child) {
		child.mockClient.ping(_, PING_TIMEOUT);
		child.syratime = 0;
	}
}

// remove outdated redirect data

function _clearRedirects() {
	var date = Date.now();
	var dateComp = date - 600000;
	for (var id in redirects) {
		if (redirects[id][1] < dateComp) {
			delete redirects[id];
		}
	}
	return date;
}

function _fileConnectionDataUpdate(_) {
	var conn = localHost.connectionData[0];
	var serverCert;
	var clientCert;
	var cas;
	if (conn.ssl) {
		if (conn.serverCert) {
			serverCert = conn.serverCert.name;
			if (conn.serverCert.caCertificates) {
				cas = conn.serverCert.caCertificates.map(function(caCert) {
					return caCert.name;
				});
			}
		}
		if (conn.clientAuth) {
			clientCert = localHost.clientCert ? localHost.clientCert.name : "";
		}
	}
	_fileConnectionData(_, conn.port, serverCert || "", cas, conn.clientAuth, clientCert || "");
}


function _fileConnectionData(_, port, serverCert, cas, clientAuth, clientCert) {
	var oldContent;
	var filename = "temp/conn_" + lcHostName + ".bbb";
	try {
		oldContent = JSON.parse(fs.readFile(filename, "utf8", _));
	} catch (e) {
		tracer && tracer("No old data " + e);
		oldContent = {};
	}
	tracer && tracer("connection data from file: " + util.format(oldContent));
	var change = false;
	if (port && oldContent.port !== port) {
		oldContent.port = port;
		change = true;
	}
	if (serverCert !== undefined && oldContent.serverCert !== serverCert) {
		oldContent.serverCert = serverCert;
		if (!serverCert) {
			oldContent.cas = undefined;
			oldContent.clientAuth = false;
			oldContent.clientCert = undefined;
			cas = undefined;
			clientAuth = undefined;
			clientCert = undefined;
		}
		change = true;
	}
	if (cas && (!oldContent.cas || oldContent.cas.sort().join(";") !== cas.sort().join(";"))) {
		oldContent.cas = cas;
		change = true;
	}
	if (clientAuth !== undefined && oldContent.clientAuth !== clientAuth) {
		oldContent.clientAuth = clientAuth;
		if (!clientAuth) {
			oldContent.clientCert = undefined;
			clientCert = undefined;
		}
		change = true;
	}
	if (clientCert !== undefined && oldContent.clientCert !== clientCert) {
		oldContent.clientCert = clientCert;
		change = true;
	}
	if (!change && !oldContent.port) { // if no port is available, take port from nodelocal.js
		oldContent.port = config.port;
	}
	if (change) {
		tracer && tracer("CHANGE connection data in file " + util.format(oldContent));
		try {
			fs.writeFile(filename, JSON.stringify(oldContent), "utf8", _);
		} catch (e) {
			console.error("Error writing connection file " + e);
		}
	}
	return oldContent;
}

//for unit tests
exports._updateHosts = _updateHosts;