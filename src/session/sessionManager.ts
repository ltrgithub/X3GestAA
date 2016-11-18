"use strict";

var events = require('events');
var config = require('config');
var sessionMod = require('./session');
var Session = sessionMod.Session;
var sessionPool = require('./sessionPool');
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("../collaboration/helpers").AdminHelper;
var os = require("os");
var traceHelper = require('syracuse-trace/lib/helper');
var globals = require('streamline-runtime').globals;
var check = require('../license/check');
var locale = require('streamline-locale');
var sys = require("util");
var url = require('url');
var adminHelpers = require('../collaboration/helpers');
var path = require('path');
var fs = require('streamline-fs');
var querystring = require('querystring');
var SocketHandler = require("syracuse-notification/lib/socketHandler");
var flows = require('streamline-runtime').flows;

var tracer = require('@sage/syracuse-core').getTracer("sessionManager.session");

var _sessions = {};
exports.localSessions = function() {
	return Object.keys(_sessions).map(function(t) {
		var ts = _sessions[t];
		return t + ": " + (ts ? Object.keys(ts).join(",") : "-");
	}).join(";");
};
var _mustTerminate = false;
var _terminateOrigin = "";

var checkIfIE = helpers.http.checkIfIE;

var _listSocketIoBySession = {};
// get device of current session

/**
 * Session Manager Object
 * Settings:
 *	- key 				The Cookie key to store sessionId in
 * 	- timeout              	Number of minutes that a session can remain idle
 * 	- checkInterval		The interval (in seconds) between checks for expired sessions
 */
exports.sessionManager = new function() {
	events.EventEmitter.call(this);
	var _timer = null;
	// number of active sessions
	var _count = 0;
	// Active sessions
	var _settings;
	var self = this;


	this.setup = function(settings) {
		var socketIoHandler = null; //SocketHandler.getSocketHandler();

		socketIoHandler && socketIoHandler.register("/session", function(io, handshake) {
			// nothin'
			var cookie = helpers.http.parseCookie(handshake.headers.cookie);
			var sessionId = cookie[_getSessionCookieName((handshake.headers['x-forwarded-host'] || handshake.headers.host).split(':')[1])];

			_listSocketIoBySession[sessionId] = _listSocketIoBySession[sessionId] || {
				number: 0
			};
			console.log(new Date().toISOString(), "IO session id " + sessionId) // useful message always;
			_listSocketIoBySession[sessionId].number++;
			// clear the timeout if a new connection is coming

		}, function(io, handshake) {

			var cookie = helpers.http.parseCookie(handshake.headers.cookie);
			var sessionId = cookie[_getSessionCookieName((handshake.headers['x-forwarded-host'] || handshake.headers.host).split(':')[1])];

			function dropSession(_) {
				// try to find session by searching all tenants
				var session;
				Object.keys(_sessions).forEach(function(tenantId) {
					if (sessionId in _sessions[tenantId]) {
						session = _sessions[tenantId][sessionId];
						if ((session.tenantId || "") !== tenantId) {
							session = undefined;
						}
					}
				});
				// also delete sessionInfo
				console.log("Drop session due to socket.io " + sessionId + " " + session);
				_deleteSession(!_, sessionId, session, true);
			};
			// manage refresh of browser . we don't close the session until a certain time. and we clear the timeout if we receive connection on the same session
			_listSocketIoBySession[sessionId] = _listSocketIoBySession[sessionId] || {
				number: 1
			};
			_listSocketIoBySession[sessionId].number--; // decrement session
			if (_listSocketIoBySession[sessionId].number === 0) { // check in 10 seconds if the number of socket io client is still 0 or to delete session
				if (config.hosting.multiTenant) console.log(new Date().toISOString(), "Session start IO timeout " + sessionId) // info message ;

				setTimeout(function() {
					if (_listSocketIoBySession[sessionId].number === 0) {
						dropSession(function(err) {
							if (err) throw err;
						});
					}
				}, (settings && settings.ioTimeout) || 10000); // check for 10 seconds TODO maybe make this value configurable
			}

		});

		//
		_settings = helpers.object.clone(settings || {});
		_settings.key = _settings.key || "syracuse.sid";
		_settings.timeout = _settings.timeout || 20;
		this.sessionTimeout = _settings.timeout;
		this.retryOnError = _settings.retryOnError ||  3;

		_settings.checkInterval = _settings.checkInterval || 5 * 60;
		_settings.statelessTimeout = _settings.statelessTimeout || 1;
		// Start expiration timer for sessions
		if (!_settings.disabled)
			_timer = setInterval(_checkExpired, _settings.checkInterval * 1000);
		//
		sessionMod.setup(settings);
	};

	function _getSessionCookieName(port) {
		return _settings.key + "." + port;
	}

	function _getLoginCookieName(port) {
		return _settings.key + ".login." + port;
	}

	function totalSessionCount() {
		return Object.keys(_sessions).reduce(function(total, tenantId) {
			return total + Object.keys(_sessions[tenantId]).length;
		}, 0);
	}


	function _checkExpired() {
		// // if memory limit is defined and no sessions anymore, stop server, it will be restarted by the load balancer or the agent
		// var limit = config && config.system && config.system.memoryLimit;
		// if (limit == null) limit = 0; // test with null as it might be 0 and in this case shouldn't be changed
		// if (limit > 0 && totalSessionCount() === 0) {
		// 	var hu = process.memoryUsage().heapUsed / 1024 / 1024;
		// 	if (hu > limit) {
		// 		console.error(locale.format(module, "memoryLimit", hu, limit));
		// 		process.exit(0);
		// 	}
		// }
		//
		var expired = +new Date() - (_settings.timeout + 5) * 60 * 1000; // add 5 minutes to Syracuse session timeout to allow Covergence sessions to safelly terminate
		tracer.info && tracer.info("sessionManager.session check expired, lastAccess < " + expired);
		for (var tenantId in _sessions) {
			var sessions = _sessions[tenantId];
			for (var key in sessions) {
				var session = sessions[key];
				var expirationForced = (session.expirationStamp && session.expirationStamp <= Date.now());
				if (session && (session.lastAccess < expired || expirationForced)) {
					tracer.info && tracer.info("sessionManager.session " + key + " expired");
					if (expirationForced) console.log("Delete session 2 " + key + " " + session.lastAccess);
					_deleteSession(!_, key, session, expirationForced);

				} else {
					if (_mustTerminate) {
						if (!session.hasCvgSessions()) _deleteSession(!_, key, null, false);
					} else session.isAuthenticated() && session.updateSessionInfo(!_, true, true);
				}
			}
		}
		//
		if (_mustTerminate) {
			if (Object.keys(_sessions).length === 0) {
				// halt all logging
				traceHelper.haltRecording(function(err) {
					if (err) {
						console.error("Error during halt recording " + err);
					}
					console.error(locale.format(module, "gentlyTerminateExit", (new Date()).toISOString(), _terminateOrigin));
					process.exit(1);
				});
			} else {
				console.error(locale.format(module, "gentlyTerminateSessions", (new Date()).toISOString(), Object.keys(_sessions).length));
			}
		}
	}



	function _deleteSession(_, key, session, forceDbDelete) {
		if (session) {
			tracer.info && tracer.info("sessionManager.deleteSession found: " + key);
			// delete SocketIo link to the session
			if (config.hosting.multiTenant && forceDbDelete) console.log(new Date().toISOString(), "Delete session " + key + " tenant " + globals.context.tenantId + " " + forceDbDelete + " " + new Error(2).stack);

			var sessions = _sessions[session.tenantId || ""];

			if (sessions) {
				delete sessions[key];
				_count--;
			} else {
				console.error("deleteSession: session key not found!");
			}
			// close all fusion sessions
			session.destroy(_, forceDbDelete);
		} else {
			tracer.info && tracer.info("sessionManager.deleteSession not found: " + key + "; will delete sessionInfo");
			var db = adminHelper.getCollaborationOrm(_);
			var si = db.fetchInstance(_, db.getEntity(_, "sessionInfo"), {
				jsonWhere: {
					sid: key
				}
			});
			si && si.deleteSelf(_, {
				ignoreRestrictions: true
			});
		}
	}
	this.formatSessionCookie = function(sid, port) {
		return _settings.key + (port ? ("." + port) : "") + "=" + sid + '; path=/; expires=';
	};
	// This is called by license check, in the context of a tenant
	this.deleteSession = function(_, sid) {
		_deleteSession(_, sid, tenantSession(sid), true);
	};

	// creates session for scheduler. Authentication is not necessary
	this.createBatchSession = function(_, user, role, locale, diagnoses) {
		if (!user || !role) { // can't create a batch server session no user or role define in the task
			return null;
		}
		var session = new Session(null, _allocSID(), null);
		var login = user.login(_);
		tracer.info && tracer.info("Create batch session for: " + login);
		session.device = 'desktop'; // for now
		session.setData("userID", user.$uuid);
		session.setData("userLogin", login);
		session.host = "http://localhost:9999"; // dummy host (necessary for Supervisor)
		self.authData = {
			user: login
		};
		// license check
		if (!check.checkConcurrent(_, session, role, login, session.device, diagnoses, true)) { // try to find new session
			return null;
		}
		if (globals.context) {
			globals.context.session = session;
		}
		var up = session.getUserProfile(_);
		up.selectedRole(_, role);
		if (locale) up.selectedLocale(_, locale);
		session.updateSessionInfo(_, true);
		var tenantId = globals.context.tenantId || "";
		var sessions = _sessions[tenantId] || (_sessions[tenantId] = {});
		sessions[session.id] = session;
		_count++;
		return session;
	};



	this.destroy = function(_) {
		for (var tenantId in _sessions) {
			var sessions = _sessions[tenantId];
			for (var key in sessions) {
				_deleteSession(_, key, sessions[key], true);
			}
		}
	};

	this.getSettings = function(_) {
		return helpers.object.clone(_settings);
	};

	function _allocSID() {
		return helpers.uuid.generate();
	}

	function tenantSessions() {
		return _sessions[globals.context.tenantId || ""] || {};
	}

	function tenantSession(key) {
		return tenantSessions()[key];
	}

	this.getTenantSessions = function() {
		return tenantSessions();
	};
	this.sessionById = function(key) {
		return tenantSession(key);
	};
	this.sessionByCookie = function(cookie, port) {
		var cookies = helpers.http.parseCookie(cookie);

		var key = cookies[_getSessionCookieName(port)];
		return key ? tenantSession(key) : null;
	};
	this.getSyracuseCookie = function(session, port) {
		return _settings.key + "." + port + "=" + session.id;
	};
	this.secureCookie = function(secure, value) {
		if (secure) value += '; Secure';
		value += '; HttpOnly';

		return value;
	};

	function _getSession(_, request, response, useSessionPool, ignoreCookie) {
		var clientCookie = !ignoreCookie ? request.headers.cookie : null;
		var cookies = helpers.http.parseCookie(clientCookie);
		var port = request.connection.localPort;
		var sessionName = _getSessionCookieName(port);
		var cookie = cookies[sessionName] || "";
		if (checkIfIE(request.headers['user-agent']))
			cookie = cookies["client.id"];
		var session = null;
		if (cookie) {
			session = tenantSession(cookie);
			if (request.headers.authorization && session && session.authData && session.authData.authorization && (session.authData.authorization !== request.headers.authorization)) {
				if (session.authData.authorization.substr(0, 6) === "Digest") {
					// digest authentication looks different each time because of nonce. Ignore nonce.
					var auth1 = session.authData.authorization;
					var auth2 = request.headers.authorization;
					auth1 = auth1.replace(/\b(response|nc|cnonce)\="\w+"/g, "");
					auth2 = auth2.replace(/\b(response|nc|cnonce)\="\w+"/g, "");
					if (auth1 !== auth2) session = null;
				} else session = null;
			}

			if (session) {
				session.touch();
				request.session = session;
			} else {
				tracer.info && tracer.info((new Date()).toISOString() + ": Session (" + cookie + ") not found.");
				// force new authorization, needed for logout
				//				request.headers.authorization = "";
			}
		}

		if (!session) {
			if (config.shutDownMarker || _mustTerminate) {
				tracer.info && tracer.info("No new session during shutdown");
				var err = new Error(locale.format(module, "noNewSession"));
				err.$httpStatus = 503;
				throw err;
			}
			_internalCreateSession(_, request, response, cookies, sessionName);
			// if there was a session that doesn't exists anymore (expired or logged out),
			// create a non authenticated session and force browser to login
			if (cookie && !useSessionPool) {
				// set cookie to the new session id
				_setSessionCookie(_, request, response);
			}
		}
		//
		if (globals.context) {
			globals.context.session = request.session;
			globals.context.request = request;
			globals.context.response = response;
		}
	}

	function _internalCreateSession(_, request, response, cookies, sessionName) {
		// create session object
		var clientId = null;
		if (cookies && cookies["client.id"]) {
			clientId = cookies["client.id"];
		}
		// reuseSid: Chrome doesn't update the session cookie if a 401 response so this ends up in an failure for user
		// to connect, even with proper credentials. So create a new session with the same session id to prevent this issue.
		// It's OK on all other browsers tested
		// crnit UPDATE: cannot reuse the session Id because the client uses it to detect session change and asks
		// for a new user profile and reload of source code
		//		var session = new Session(request, reuseSid || _allocSID(), clientId);
		// erbou UPDATE: reuseSid has been deleted in order to deal with cookie by using the cookies parsed objet
		var session = new Session(request, _allocSID(), clientId);

		var port = request.connection.localPort;

		session.loginCookieName = _getLoginCookieName(port);
		if (checkIfIE(request.headers['user-agent']))
			session.id = session.clientId;

		session.device = 'desktop'; // for now

		session.ignoreStoreSession = _settings.ignoreStoreSession;

		var secure = (config.hosting && config.hosting.https) || ('authorized' in request.connection);

		var cookie = self.getSyracuseCookie(session, port); //_settings.key + "." + port + "=" + session.id;
		if (checkIfIE(request.headers['user-agent']))
			cookie = "client.id=" + session.clientId;

		session.host = (secure ? "https" : "http") + "://" + (request.headers['x-forwarded-host'] || request.headers.host);
		session.cookie = cookie;

		request.session = session;

		cookies[sessionName] = session.id;
		// set cookie in request
		request.headers.cookie = Object.keys(cookies).map(function(k) {
			return k + "=" + cookies[k];
		}).join("; ");
		var tenantId = globals.context.tenantId || "";

		var sessions = _sessions[tenantId] || (_sessions[tenantId] = {});
		sessions[request.session.id] = session;
		_count++;
		tracer.info && tracer.info("Create syracuse session for " + request.url + " (sessionId=" + session.id + ").");
		// session.authModule = _authModule;
		// store session in DB
		tracer.info && tracer.info("Store syracuse session for " + request.url + " (sessionId=" + session.id + ").");
		session.touch();
	}

	function _setSessionCookie(_, request, response) {
		function _hasCookie(cookies, value) {
			return cookies.some(function(ck) {
				return ck.indexOf(value) >= 0;
			});
		}

		var secure = (request.hosting && request.hosting.https) || ('authorized' in request.connection);

		function _secureCookie(value) {
			var prefix = (value[value.length - 1] === ";") ? "" : ";";
			if (secure) value += prefix + 'Secure;';
			value += prefix + 'HttpOnly;';
			return value;
		}
		tracer.info && tracer.info("_setSessionCookie: has response: " + (response != null));
		if (!response) throw new Error("cannot set session cookie: no response!");

		var writeHead = response.writeHead;
		response.writeHead = function(statusCode, headers) {
			if (request.session) {
				request.session.touch();
				// Send the cookie to the browser
				headers = headers || {};
				var cookie = headers["set-cookie"];
				// multiple cookies
				cookie = cookie || [];
				if (!Array.isArray(cookie))
					cookie = [cookie];

				var expired = new Date(+new Date + _settings.timeout * 60 * 1000);
				var expireGMTString = (new Date(+new Date + 200 * 86400 * 1000)).toUTCString(); // 200 days
				var port = request.connection.localPort;

				if (!_hasCookie(cookie, _getSessionCookieName(port))) {
					var syraCookie = _secureCookie(_getSessionCookieName(port) + "=" + request.session.id + '; path=/');
					cookie.push(syraCookie);
				}
				if (!_hasCookie(cookie, _getLoginCookieName(port)) && request.session.loginCookie) {
					var ck = _secureCookie(_getLoginCookieName(port) + "=" + request.session.loginCookie + '; path=/; expires=' + (new Date(+new Date + 4 * 7 * 86400 * 1000)).toGMTString()); // 4 weeks
					cookie.push(ck);
				}
				// client ID
				if (!_hasCookie(cookie, "client.id")) {
					var clientId = _secureCookie("client.id=" + request.session.clientId + "; path=/; expires=" + expireGMTString);
					if (checkIfIE(request.headers['user-agent']))
						clientId = _secureCookie("client.id=" + request.session.id + "; path=/; expires=" + expireGMTString);
					cookie.push(clientId);
				}
				// user profile
				if (!_hasCookie(cookie, "user.profile." + port) && request.session.userProfileCookie) {
					// Do not add HttpOnly on this cookie to allow cookie modification by client
					var userProfileCookie = _secureCookie("user.profile." + port + "=" + request.session.userProfileCookie + "; path=/; expires=" + expireGMTString);
					cookie.push(userProfileCookie);
				}
				headers['set-cookie'] = cookie;
				// locales
				if (!headers["content-language"])
					headers["content-language"] = locale.current;
			}
			response.writeHead = writeHead;
			return response.writeHead(statusCode, headers);
		};
	}

	/*
	 * options:
	 * ** authRequired = true--> the user must be logged to execute service
	 * ** forceAuth = true --> when user isn't logged and authRequired=true  try to logon
	 *                       = false --> when user isn't logged and authRequired=true  the request is refused
	 */
	this.ensureSession = function(_, request, response, useSessionPool, ignoreCookie) {
		if (useSessionPool && ignoreCookie) return sessionPool.allocSession(_, request, response, this);
		//tracer.info && tracer.info("Session manager options: " + sys.inspect(options));

		if (_settings.disabled) throw new Error("configuration error: sessions are disabled!");
		if (_count === 0 && !("mockServer" in config)) { // in cluster it is not necessary to check license again when there are no sessions
			// because all running Syracuse processes will be notified even when they do not have sessions
			check.updateFromDB(_);
		}
		_getSession(_, request, response, useSessionPool, ignoreCookie);
		//
		if (!useSessionPool) _setSessionCookie(_, request, response);
		if (!request.session) throw new Error("internal error: request.session not set");

		// set locales (needs _setSessionCookie be executed first)
		// language url param has priority over accept-language header
		var params = helpers.url.parseQueryString(request.url.split("?")[1]);
		var lang = params && params.language;
		//
		request.session.setLocales(_, lang || locale.extractLocaleCode(request.headers["accept-language"]));
		// only now the session can be stored in database, after _setSessionCookie that forces the user profile to load
		if (request.session && request.session.isAuthenticated() && !request.session.sessionInfo) request.session.updateSessionInfo(!_, true);
		//
		return request.session;
	};

	// SAM 98078 - in case of endpoint change we have to disconnect syracuse session
	this.disconnectX3Sessions = function(_, request, response) {
		_getSession(_, request, response);
		request.session.disconnectX3Sessions(_);
	};

	//
	this.logout = function(_, request, response, session) {
		// DO NOT delete session cookie. It will allow us to detect a logged out session and force the browser to login again
		tracer.info && tracer.info("sessionManager.Logout enter");
		var pck = helpers.http.parseCookie(request.headers.cookie) || {};
		var port = request.connection.localPort;

		var cookie = pck[_getSessionCookieName(port)];
		if (request.headers['user-agent'] && checkIfIE(request.headers['user-agent']))
			cookie = pck["client.id"];
		var errorExists = false;
		tracer.info && tracer.info((new Date()).toISOString() + "; Logout cookie is " + cookie);
		if (cookie) {

			traceHelper.removeSessionTracers(_, cookie);
			tracer.info && tracer.info("sessionManager.logout deleting session: " + cookie);
			session = _sessions[cookie];
			if (!session)
				session = tenantSession(cookie);
			// do not logout if there are convergence sessions, unless force=true parameter
			if (session && session.hasCvgSessions()) {
				var query = helpers.url.parseQueryString(request.url.split("?")[1] || "");
				if (!query || !query.force) {
					response.writeHead(403, {
						"content-type": "application/json"
					});
					return response.end(JSON.stringify({
						$diagnoses: [{
							$severity: "warning",
							$message: locale.format(module, "cannotLogoutHasConvergence")
						}]
					}));
				}
			}
			tracer.info && tracer.info("sessionManager.logout deleting session: " + cookie);
			if (session && session.authData && session.authData.logout) {
				request.session = session;
				if (globals.context) {
					globals.context.session = session;
				}
				session.authData.logout(_, request, response);
			}
			tracer.info && tracer.info((new Date()).toISOString() + "; sessionManager.logout deleting session: " + cookie);
			// delete session
			if (session && session.loginError) {
				errorExists = true;
				require('../auth/helpers').redirect(_, request, response, "/auth/login/page");
			}
			_deleteSession(_, cookie, session, true);
		}

		if (!errorExists) {
			var h = {
				location: "/auth/forgetMe/page",
				"content-type": "application/json"
			};
			response.writeHead(200, h);
			return response.end(JSON.stringify({
				$diagnoses: [{
					$severity: "success",
					$message: "Logged out"
				}]
			}));
		}
	};
	//
	this.cleanupSessionInfos = function(_) {
			var db = adminHelper.getCollaborationOrm(_);
			var sessionInfos = db.fetchInstances(_, db.model.getEntity(_, "sessionInfo"), {
				jsonWhere: {
					serverName: config.servername
				}
			});
			tracer.info && tracer.info("session.close - nbSess: " + sessionInfos.length + " - server name: " + config.servername);
			// only close sessions of non existing processes
			var pids = {}; // cache in order to invoke process.kill not more often than necessary
			sessionInfos.forEach_(_, function(_, sessionInfo) {
				var pid = sessionInfo.pid(_);
				if (!(pid in pids)) {
					try {
						process.kill(pid, 0);
						pids[pid] = true;
					} catch (e) { // process does not exist
						pids[pid] = false;
					}
				}
				if (!pids[pid]) {
					var sid = sessionInfo.sid(_);
					tracer.info && tracer.info("\tsession.close close session: " + sid);
					// delete all locks for this session
					adminHelper.releaseSessionLocks(_, sid);
					sessionInfo.deleteSelf(_, {
						ignoreRestrictions: true
					});
				}
			});
		}, // FDB - Returns an array that contains all convergence sessions info
		// -> for all Syracuse session if sid==null
		// -> for one Syracuse session if sid!=null
		this.cvgAdmSessInfos = function(_, sid) {
			var res = [],
				self = this;
			var sessions = tenantSessions();
			var keys = sid ? keys = [sid] : Object.keys(sessions);
			keys.forEach_(_, function(_, sessId) {
				var syraSess = sessions[sessId];
				if (syraSess) {
					var cvgSessions = syraSess.getCvgSessions(_);
					if (cvgSessions && cvgSessions.length > 0) {
						cvgSessions.forEach_(_, function(_, cvgSess) {
							res.push(self._getSessionInfo(_, syraSess, cvgSess));
						});
					}
				}
			});
			return res;
		}, //Append syraSessioninfo to cvgSessions instance
		this._getSessionInfo = function(_, syraSess, cvgSess) {
			var i = cvgSess.cvgAdmSessInfo(_);
			// display inactivity time / sessionTimeout
			i.timeout = "" + Math.floor((new Date().getTime() - syraSess.lastAccess) / 1000) + "/" + Math.floor(_settings.timeout * 60), i.syraid = syraSess.id;
			i.syralogin = syraSess.getData("userLogin");
			return i;
		}, // FDB - Returns convergence fusion with given sid
		this.cvgAdmSessInfo = function(_, cvgid) {
			var self = this;
			var sessions = tenantSessions();
			for (var id in sessions) {
				var sess = sessions[id];
				if (sess) {
					var cvgSess = sess.getCvgSession(cvgid);
					if (cvgSess) {
						return self._getSessionInfo(_, sess, cvgSess);
					}
				}
			}
			return null;
		};

	/* Tablet needs - Temporarily to manage a login form in tablet client*/
	this.tabletCheckLogin = function(_, request, response) {
		var cookies = helpers.http.parseCookie(request.headers.cookie);
		var port = request.connection.localPort;
		var cookie = cookies[_settings.key + "." + port] || "";
		if (cookie) {
			var session = tenantSession(cookie);
			if (session) {
				var expired = +new Date() - _settings.timeout * 60 * 1000;
				var res = {
					authenticated: session.isAuthenticated(),
					expired: session.lastAccess < expired
				};
				res.ok = res.authenticated && !res.expired;
				return res;
			}
		}
		return {
			ok: false
		};
	};


	/* Tablet needs - Temporarily to manage the login action trough a form in tablet client*/
	this.tabletDoLogin = function(_, request, response) {
		var cookies = helpers.http.parseCookie(request.headers.cookie);
		var port = request.connection.localPort;
		var cookie = cookies[_settings.key + "." + port] || "";
		if (cookie) {
			var session = tenantSession(cookie);
			if (session) {
				var expired = +new Date() - _settings.timeout * 60 * 1000;
				var res = {
					authenticated: session.isAuthenticated(),
					expired: session.lastAccess < expired
				};
				res.ok = res.authenticated && !res.expired;
				return res;
			}
		}
		return {
			ok: false
		};
	};
};


exports.gentlyTerminate = function(_, origin, withReply) {
	_mustTerminate = true;
	_terminateOrigin = origin;
	console.error(locale.format(module, "gentlyTerminateRequested", (new Date()).toISOString(), _terminateOrigin));
	//
	if (withReply) {
		if (globals.context && globals.context.response) {
			var rr = globals.context.response;
			rr.writeHead(500, {
				"x-syracuse-restrict": "on",
				"content-type": "application/json"
			});
			rr.end(JSON.stringify({
				$diagnoses: [{
					"$severity": "error",
					"$message": locale.format(module, "serverErrorRestrict")
				}]
			}));
			rr.__isEnded = true;
		}
	}
};

// Security risk here: only the globals dump utility should use this
exports.getGlobals = function() {
	return _sessions;
};