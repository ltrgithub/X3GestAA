"use strict";

var config = require('config');
var globals = require('streamline-runtime').globals;
var flows = require('streamline-runtime').flows;

var sessionManager; // reference to this singleton will be provided

var _sessions = [];

var counters = {
	alloc: 0,
	reuse: 0,
	recycle: 0,
	discard: 0,
};

function httpError(status, message) {
	var error = new Error(message);
	error.$httpStatus = status;
	return error;
}

exports.allocSession = function(_, request, response, sessionManager0) {
	var tenantId = globals.context.tenantId;
	sessionManager = sessionManager0;
	var tenantSessions = _sessions[tenantId] || (_sessions[tenantId] = {});
	//if (!request.headers.authorization) throw httpError(401, "Authorization header missing");
	var poolKey = request.headers.authorization + '/' + request.headers['accept-language'];
	var bucket = tenantSessions[poolKey] || (tenantSessions[poolKey] = {
		sessions: []
	});
	bucket.touchTime = Date.now();
	var session;
	bucket.sessions = bucket.sessions.filter(function(session) {
		return !session.destroyed;
	});
	if (bucket.sessions.length > 0) {
		counters.reuse++;
		session = bucket.sessions.pop();
		globals.context.session = request.session = session;
	} else {
		counters.alloc++;
		var ignoreCookie = require('syracuse-soap/lib/server/soapUtils').notTesterSoap(request);
		session = sessionManager.ensureSession(_, request, response, false, ignoreCookie);
	}
	response.on('finish', function() {
		if (session.authData) {
			counters.recycle++;
			bucket.sessions.push(session);
		} else {
			counters.discard++;
		}
	});
	return session;
};

// timeout milliseconds for api1 session pool
var timeoutMillis = (config.session.api1SessionTimeout || 2) * 60 * 1000;

// Note: we don't need to worry about globals in this cleanup loop as it does *not* notify applicative code
setInterval(function() {
	if (sessionManager) {
		var now = Date.now();
		(function(_) {
			Object.keys(_sessions).forEach_(_, function(cb, tenantId) {
				globals.withContext(function() {
					(function(_) {
						var tenantSessions = _sessions[tenantId];
						var keepTenant = false;
						Object.keys(tenantSessions).forEach_(_, function(_, key) {
							var bucket = tenantSessions[key];
							if (now > bucket.touchTime + timeoutMillis) {
								delete tenantSessions[key];
								bucket.sessions.forEach_(_, function(_, sess) {
									sessionManager.deleteSession(_, sess.id);
								});
							} else keepTenant = true;
						});
						if (!keepTenant) delete _sessions[tenantId];
					})(cb);
				}, {
					tenantId: tenantId
				})();
			});
		})(flows.check);
	}
}, timeoutMillis);