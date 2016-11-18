"use strict";

var config = (require("../../nodelocal").config || {});
var conf_sage_id = config.sage_id || {};
conf_sage_id.certOK = conf_sage_id.pfx = conf_sage_id.cert = conf_sage_id.key = undefined;
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer('session.trace');
var mongodb = require('mongodb');
var sessionManager = require('../..//src/session/sessionManager').sessionManager;
var checkUser = require('../../src/auth/checkUser');
var urlHelper = require('url');
var authHelper = require('../../src/auth/helpers');
var fs = require('streamline-fs');
var certTools = require('../../src/load-balancer/certTools');
var sageId = require("../../src/sage-id");

// Temp for debugging
tracer = tracer || console.log;

exports.getSageIdOptions = getOptions;

function getOptions(_, request) {
	if (!conf_sage_id.baseUrl || (!conf_sage_id.pfxFile && !conf_sage_id.certName)) {
		conf_sage_id.baseUrl = undefined;
		console.error("Sage ID not loaded: config missing");
		throw new Error("Sage ID not loaded: config missing");
	}
	if (conf_sage_id.certOK === undefined) { // do these checks only once
		conf_sage_id.certOK = false;
		try {
			if (conf_sage_id.pfxFile) {
				conf_sage_id.pfx = fs.readFile(conf_sage_id.pfxFile, _);
				conf_sage_id.certOK = true;
			} else if (conf_sage_id.certName) {
				if (!config.collaboration.certdir)
					throw new Error("No certificate directory");
				var lcHostName = require('os').hostname().toLowerCase();
				var certDirectory = config.collaboration.certdir + "/" + lcHostName + "/";
				// get certificate
				conf_sage_id.cert = fs.readFile(certDirectory + conf_sage_id.certName + ".crt", "utf8", _);
				conf_sage_id.key = fs.readFile(certDirectory + conf_sage_id.certName + ".key", "utf8", _);
				var passphrases = certTools.readPassphrases(certDirectory, _);
				conf_sage_id.passphrase = passphrases[conf_sage_id.certName];
				conf_sage_id.certOK = true;
			}
		} catch (e) {
			console.error("Error during loading Sage ID configuration: " + e);
			throw new Error("Error during Sage ID configuration loading");
		}
	}
	if (!conf_sage_id.certOK) throw new Error("No sage-id configuration");
	return {
		httpClient: require('../../src/http-client/httpClient').httpRequest,
		baseUrl: conf_sage_id.baseUrl,
		pfx: conf_sage_id.pfx,
		cert: conf_sage_id.cert,
		passphrase: conf_sage_id.passphrase,
		key: conf_sage_id.key,
		callbackBase: request.session.host + "/auth/sage-id/",
		failureUri: request.session.host + "/auth/sage-id/failure",
		cancelAllowed: true,
		sessionLengthMinutes: conf_sage_id.sessionLengthMinutes || 60,
		signOnAfterSuccess: true,
		activateAfterSuccess: true,
	};
}

// Determine which action is necessary for session based on last activity time and timeout
// Execute respected sage-id method to extend or end session
function extendSession(request, response, session, data, _) {
	if (data.notificationType === 'ExpiryDue') {
		var expirationDate = data.expireDate;
		var lastActivity = session.lastAccess;
		var newExpirationDate = new Date(lastActivity.getTime() + 1800000);
		if (newExpirationDate > expirationDate) return true;

		// Mark session as expiration due
		// If any activity is done, session must be extended
		session.expireDue = true;
	}

	return false;
};

function redirect(_, response, url) {
	response.writeHead(307, {
		location: url,
	});
	response.end();
}

function logout(_, request, response, session) {
	var options = getOptions(_, request);
	options.sessionEnd = false;
	options.sessionId = "";
	if (!session)
		session = request.session;
	if (sageId.create(options).logout(request, response, session, _)) {
		// logout successful
		request.session.authData = null;
	}
}

function renew(_, request, response) {
	var session = request.session;
	// sanity check
	if (!session || !session.authData || !session.authData.auth) throw new Error("internal error: renew outside of auth context");
	// if we don't need to renew, auth is ok so return true.
	if (!session.expireDue) return true;

	var options = getOptions(_, request);
	var authData = sageId.create(options).sessionExtend(request, response, session, _);
	if (!authData || !authData.auth) throw authHelper.unauthenticated();
	else
		validateUser(_, request, response, session, authData);
	return session.authData.auth;
}

function validateUser(_, request, response, session, authData) {
	var user = checkUser.fromLoginPage(_, request, 'sage-id', authData.email, null);

	authData.logout = logout;
	authData.renew = renew;
	session.authData = {
		user: request.session.getData('userLogin'),
		password: authData.accessToken,
		logout: logout,
		renew: renew,
		auth: true
	};
	session.getUserProfile(_);
}

// Update session with new sessionId provided by Sage ID
// This is required as when the session is extended it will need to be able to find
// session to update accessToken
function updateSessionWithID(request, response, session, cookie, authData, _) {
	var sessions = sessionManager.getTenantSessions();
	delete sessions[cookie];
	session.id = authData.sessionId;
	sessions[authData.sessionId] = session;
};

exports.dispatch = function(_, request, response) {
	var session = request.session;

	// intercept /auth/sage-id/failure URL
	if (/^\/auth\/sage-id\/failure/.test(request.url)) {
		session.loginError = "Sage ID operation cancelled!";
		authHelper.redirect(_, request, response, "/auth/login/page");
		return false;
	}

	var sageIdAuth = sageId.create(getOptions(_, request));
	var authData = sageIdAuth.dispatch(request, response, session, _);
	if (!authData) return; // sage-id redirected user to the Sage ID site.
	if (authData.auth) {
		// Validate user and save variables
		validateUser(_, request, response, session, authData);
		updateSessionWithID(request, response, session, session.id, authData, _);
		//checkForAuthenticatedUser(request, response, session, _);
		authHelper.redirect(_, request, response, session.authTargetUrl || '/', true);
	} else if (authData.sessionNotify) {
		session = sessionManager.sessionById(authData.sessionId);
		var extend = extendSession(request, response, session, authData, _);
		if (extend) {
			authData = sageIdAuth.sessionExtend(request, response, session, _);
			validateUser(_, request, response, session, authData);
		}

		if (authData.notificationType == "Ended" && session) {
			sageId.deleteSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, authData.sessionId);
			session.authData = null;
		}
	}
};

function checkForAuthenticatedUser(request, response, session, _) {
	var listOfSessions = sessionManager.getTenantSessions();
	var sessions = Object.keys(listOfSessions).map(function(k) {
		return listOfSessions[k];
	});
	for (var i = 0; i < sessions.length; i++) {
		var searchSession = sessions[i];
		if (searchSession.EndSignOnAttemptResponse || searchSession.EndRegistrationAttemptResponse) {
			var searchIdentity = searchSession.EndSignOnAttemptResponse.IdentityId || searchSession.EndRegistrationAttemptResponse.IdentityId;
			var searchSessionId = searchSession.EndSignOnAttemptResponse.SessionId || searchSession.EndRegistrationAttemptResponse.SessionId;
			var currentIdentity = session.EndSignOnAttemptResponse.IdentityId || session.EndRegistrationAttemptResponse.IdentityId;
			var currentSessionId = session.EndSignOnAttemptResponse.SessionId || session.EndRegistrationAttemptResponse.SessionId;
			if (searchIdentity === currentIdentity && searchSessionId != currentSessionId) {
				session.loginError = "User already logged in";
				return sessionManager.logout(_, request, response, session);
			}
		}
	};
}

// Export extendSession function for unit test
exports.extendSession = function(request, response, session, data, _) {
	if (data.notificationType === 'ExpiryDue') {
		var expirationDate = data.expireDate;
		var lastActivity = session.lastAccess;
		var newExpirationDate = new Date(lastActivity.getTime() + 1800000);
		if (newExpirationDate > expirationDate) return true;

		// Mark session as expiration due
		// If any activity is done, session must be extended
		session.expireDue = true;
	}

	return false;
};