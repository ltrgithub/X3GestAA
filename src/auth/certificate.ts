"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");
var checkUser = require('syracuse-auth/lib/checkUser');
var authHelper = require('syracuse-auth/lib/helpers');

var tracer; // = console.log;

exports.authenticate = function(_, request, response, session) {
	// replace request.client with request.connection
	if (!request.connection.authorized) throw authHelper.unauthorized();
	var login = ((request.connection.getPeerCertificate() || {}).subject || {}).CN;
	if (!login) throw authHelper.unauthorized();
	var user = checkUser.fromCertificate(_, request.session, login);

	tracer && tracer("User authenticated via certficate: " + login);
	session.authData = {
		user: login,
	};
	return true;
};