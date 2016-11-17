"use strict";

var adminHelpers = require('syracuse-collaboration/lib/helpers');
var locale = require('streamline-locale');
var fs = require('streamline-fs');
var querystring = require('querystring');
var url = require('url');
var config = require('config');
var authHelper = require('../../src/auth/helpers');
var checkUser = require('../../src/auth/checkUser');
var loginPage = require('../../src/auth/loginPage');
var changePassword = require('../../src/auth/changePassword');
var forgetMePage = require('../../src/auth/forgetMePage');

function badRequest(_, request, response, message) {
	response.writeHead(400, {
		"content-type": "text/plain",
	});
	response.end(message);
	return false;
}

function invalidAuthMethod(_, request, response, tok) {
	return badRequest(_, request, response, "invalid authentication method: " + tok);
}

function _ensureUserProfileLoaded(_, session) {
	session && session.getUserProfile(_);
	return true;
}

var invalidAuthUrlRedirect = [
	".*workingCopies.*",
	".*trans.*sessions\\(.*",
	".*(png|jpg|ico)" //,
	//"((?!syracuse-main\/html\/main\.html).)*"
];



exports.ensureAuthenticated = function(_, request, response, params) {
	function filterUrlRedirect(url) {
		// check if the url that we want to be redirect is a correct one or not
		var ok = true;
		for (var i = 0; i < invalidAuthUrlRedirect.length && ok; i++) {
			ok = !(new RegExp(invalidAuthUrlRedirect[i], "ig").test(url));
		}
		return ok;

	}

	var session = request.session;
	if (!session) throw new Error("internal error: no session");

	var httpStatus, location;
	try {
		// Dispatch to authenticate handlers.
		// These handlers should throw if authentication fails and return true 
		// (without sending any response) if it succeeds.

		// handle persistent cookie: check if there is a login cookie and if it's valid

		// APS manage forget me
		if (params && params.forgetme) {
			if (session.checkPersistentCookie(_, request, false)) {
				session.removeLoginToken(_, request);
			}
		}


		// if session is already authenticated, invoke renew hook if any, otherwise we are ok
		if (session.authData) {
			if (!session.authData.renew) return true;
			return session.authData.renew(_, request, response);
		}



		if (session.checkPersistentCookie(_, request, true)) return true;

		if (config.hosting.sitecheck) {
			var redirectUrl = require('syracuse-health/lib/suspend').getSiteStatus(_, request, response);
			if (redirectUrl) {
				response.writeHead(303, {
					"content-type": "text/html",
					location: redirectUrl
				});
				response.end('<html>Site is currenctly unavailable. Please click on <a href="' + redirectUrl + '">status information</a> for more details</html>');
				return false;
			}
		}

		// if request is authenticated by a client-side certificate, handle it
		if (request.connection && request.connection.authorized) {
			var certAuth = authHelper.getAuthModule("certificate");
			// allow SSL with client authentication for normal users when authentication method "certificate" is switched off
			// if (!certAuth) return invalidAuthMethod(_, request, response, tok);
			if (certAuth) return certAuth.authenticate(_, request, response, request.session) && _ensureUserProfileLoaded(_, request.session);
		}

		// if request carries an authorization header, handle it
		if (request.headers.authorization) {
			var tok = request.headers.authorization.split(' ')[0].toLowerCase();
			var authModule = authHelper.getAuthModule(tok);
			if (!authModule) return invalidAuthMethod(_, request, response, tok);
			var isAuth = authModule.authenticate(_, request, response, request.session);
			if (isAuth) {
				if (params && params.keepConnected) session.setupPersistentCookie(_, request);
				_ensureUserProfileLoaded(_, request.session);
			}
			return isAuth;
		}
		if (session.loginCookie) {
			location = "/auth/forgetMe/page";
		} else {
			location = "/auth/login/page";
		}

		session.loginError = "";

	} catch (ex) {
		location = ex.$httpLocation || "/auth/login/page";
		session.loginError = ex.message;
	}

	if (!/^\/auth\//.test(request.url)) {

		session.authTargetUrl = request.url ? (filterUrlRedirect(request.url) ? request.url : '/') : '/';

		if (session.authTargetUrl.indexOf("device=phone") > -1) {
			// Mobile client uses only ajax calls, so we need to redirect to the main
			// html page doing the ajax request instead of the url catched by the dispatcher
			session.authTargetUrl = request.headers.referer;
		}

		// Tablet client 
		if (request.headers.referer && request.headers.referer.indexOf("syracuse-tablet") > -1) {
			session.authTargetUrl = request.headers.referer;
		}
	}


	authHelper.redirect(_, request, response, location);

	// we are not authenticated
	return false;
};

exports.dispatcher = authHelper.dispatcher(2, {
	login: loginPage.dispatch,
	forgetMe: forgetMePage.dispatch,
	changePassword: changePassword.dispatch,
	oauth2: require('../../src/auth/oauth2').dispatch,
	saml2: require('../../src/auth/saml2').dispatch,
	'sage-id': require('../../src/auth/sage-id').dispatch,
	userinfo: require('../../src/auth/userInfo').dispatch
});