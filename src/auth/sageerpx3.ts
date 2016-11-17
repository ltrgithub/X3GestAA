"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var config = require('config');
var locale = require('streamline-locale');
var checkUser = require('syracuse-auth/lib/checkUser');
var authHelper = require('syracuse-auth/lib/helpers');
var changePassword = require('syracuse-auth/lib/changePassword').changePassword;

function unauthorized() {
	return authHelper.unauthorized('SageERPX3');
}

exports.authenticate = function(_, request, response, session) {
	var credentials = (request.headers.authorization || "").split(" ");
	if (!(credentials && credentials[1])) throw unauthorized();
	var usrpwd = new Buffer(credentials[1], "base64");
	// Chrome uses UTF8 for authentication
	var agent = request.headers["user-agent"];
	if (agent && (agent.indexOf(" Chrome/") >= 0)) {
		usrpwd = usrpwd.toString("utf8");
	} else {
		usrpwd = usrpwd.toString("binary");
	}
	var index = usrpwd.indexOf(':');
	if (index < 0) throw unauthorized();

	var login = usrpwd.substr(0, index);
	var pass = usrpwd.substr(index + 1);

	if (!(login && pass)) throw unauthorized();

	// var passHash = computeHash(login, pass);
	var user = checkUser.fromLoginPage(_, request, "sageerpx3", login, pass);

	// redirect to password change dialog if requested by config
	if (user.mustChangePassword(_)) return changePassword(_, request, response, user);

	tracer && tracer("User authenticated.");
	session.authData = {
		user: login,
		authorization: request.headers.authorization
	};
	return true;
};