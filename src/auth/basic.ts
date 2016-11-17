"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var config = require('config');
var locale = require('streamline-locale');
var checkUser = require('../../src/auth/checkUser');
var authHelper = require('../../src/auth/helpers');
var changePasswordError = require('../../src/auth/changePassword').changePasswordError;

function unauthorized() {
	return authHelper.unauthorized('Basic realm=' + config.session.realm);
}

exports.authenticate = function(_, request, response, session) {
	var credentials = /^basic\s([\w\+\/]+\=*)/i.exec(request.headers.authorization);
	if (!(credentials && credentials[1])) throw unauthorized();
	var usrpwd = new Buffer(credentials[1], "base64");
	// use UTF8 for new login screen
	usrpwd = usrpwd.toString("utf8");
	var index = usrpwd.indexOf(':');
	if (index < 0) throw unauthorized();

	var login = usrpwd.substr(0, index);
	var pass = usrpwd.substr(index + 1);

	if (!(login && pass)) throw unauthorized();

	var user = checkUser.fromLoginPage(_, request, "basic", login, pass, 'Basic realm=' + config.session.realm);

	// redirect to password change dialog if requested by config
	if (user.mustChangePassword(_)) throw changePasswordError(_, request, response, user);

	tracer && tracer("User authenticated.");
	session.authData = {
		user: login,
		authorization: request.headers.authorization
	};
	return true;
};