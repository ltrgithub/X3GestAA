"use strict";

var locale = require('streamline-locale');
var authHelper = require('../../src/auth/helpers');
var helpers = require('@sage/syracuse-core').helpers;
var config = require('config');

function genPage(_, request, response) {

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

	// check if all endpoint have only on product associated. If it's the case we return the product name in order to be displayed in the page else nothin
	var params = {};
	params['productName'] = authHelper.getProductName();

	['signInLabel', 'loginLabel', 'passwordLabel', 'keepConnectedLabel', 'dbGo', 'ldapGo', 'extTitle', 'oauth2Title', 'saml2Title', 'sageIdTitle', 'sageIdSignOn', 'sageIdRegister', 'sageIdRegisterExist'].forEach(function(label) {
		params[label] = locale.format(module, label);
	});

	var oauth2s = require('../../src/auth/oauth2').getServerList(_);
	var saml2s = require('../../src/auth/saml2').getServerList(_);

	// set visibility flags for the different authentication methods which do not provide several servers
	['basic', 'digest', 'ldap', 'sage-id'].forEach(function(method) {
		params[method + "Visibility"] = authHelper.isAllowed(method) ? 'visible' : 'hidden';
	});
	// for saml2 and oauth2 there must be servers
	params["saml2Visibility"] = (authHelper.isAllowed("saml2") && saml2s.length) ? 'visible' : 'hidden';
	params["oauth2Visibility"] = (authHelper.isAllowed("oauth2") && oauth2s.length) ? 'visible' : 'hidden';

	params.extVisibility = (params.oauth2Visibility === 'visible' || params.saml2Visibility === 'visible') ? 'visible' : 'hidden';
	params.passwordVisibility = (params.basicVisibility === 'visible' || params.digestVisibility === 'visible' || params.sageerpx3Visibility === 'visible' || params.ldapVisibility === 'visible') ? 'visible' : 'hidden';

	params.js$oauth2s = JSON.stringify(oauth2s);
	params.js$saml2s = JSON.stringify(saml2s);
	params.js$hasCookie = request.session.checkPersistentCookie(_, request, false);

	// set error message if last authentication failed
	if (request.session && request.session.loginError) {
		params.errorMessage = request.session.loginError;
		// display it only once
		request.session.loginError = "";
	} else {
		params.errorMessage = "";
	}

	authHelper.genPage(_, response, __dirname + "/../../public/auth/login.html", params);


}

function submit(_, request, response) {
	var params = request.readAll(_);
	if (helpers.http.parseHeaders(request.headers || {})["content-type"] === "application/json") params = JSON.parse(params);
	if (!require('../../src/auth/dispatcher').ensureAuthenticated(_, request, response, params)) return;


	authHelper.redirect(_, request, response, request.session.authTargetUrl || '/', true);
}

exports.dispatch = authHelper.dispatcher(3, {
	page: genPage,
	submit: submit,
});