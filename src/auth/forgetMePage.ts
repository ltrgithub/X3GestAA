"use strict";

var locale = require('streamline-locale');
var authHelper = require('syracuse-auth/lib/helpers');
var helpers = require('@sage/syracuse-core').helpers;


function genPage(_, request, response) {


	var params = {};
	params['productName'] = authHelper.getProductName();

	['loginLabel', 'enterLabel', 'passwordLabel', 'keepConnectedLabel', 'dbGo', 'ldapGo', 'oauth2Title', 'sageIdTitle', 'sageIdSignOn', 'sageIdRegister', 'sageIdRegisterExist', 'loggedAtLabel', 'keepConnectedLabel', 'forgetMeLabel'].forEach(function(label) {
		params[label] = locale.format(module, label);
	});
	['basic', 'digest', 'ldap', 'oauth2', 'sage-id'].forEach(function(method) {
		params[method + "Visibility"] = authHelper.isAllowed(method) ? 'visible' : 'hidden';
	});
	params.passwordVisibility = params.basicVisibility || params.digestVisibility || params.sageerpx3Visibility || params.ldapVisibility;

	params.js$oauth2s = JSON.stringify(require('syracuse-auth/lib/oauth2').getServerList(_));

	params.js$login = request.session.getTokenLoginUser(_, request);
	params.js$hasCookie = request.session.checkPersistentCookie(_, request, false);

	// set error message if last authentication failed
	if (request.session && request.session.loginError) {
		params.errorMessage = request.session.loginError;
		// display it only once
		request.session.loginError = "";
	} else {
		params.errorMessage = "";
	}

	authHelper.genPage(_, response, __dirname + "/../html/forgetme.html", params);

}

function submit(_, request, response) {
	var params = request.readAll(_);
	if (helpers.http.parseHeaders(request.headers || {})["content-type"] === "application/json") params = JSON.parse(params);
	if (!require('syracuse-auth/lib/dispatcher').ensureAuthenticated(_, request, response, params)) return;

	authHelper.redirect(_, request, response, request.session.authTargetUrl || '/', false);
}

exports.dispatch = authHelper.dispatcher(3, {
	page: genPage,
	submit: submit,
});