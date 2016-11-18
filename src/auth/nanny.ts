"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var config = require('config');
var syracuse;
var mock = require('../load-balancer/mock');
var config = require('config');
var checkUser = require('../auth/checkUser');
var authHelper = require('../auth/helpers');
var changePasswordError = require('../auth/changePassword').changePasswordError;

// Authorization for internal requests which are redirected from child process to child process internally within one load balancer (nanny).
// The authorization header must contain "Nanny" followed by a space and the login name UTF8 encoded, then base64 encoded.
// This does not work for external requests, because "fromNanny" must be set
// please ensure that the login name exists and has all the rights because otherwise there will be a redirection to a login page (which is nonsense)
exports.authenticate = function(_, request, response, session) {
	var credentials = /^Nanny\s([\w\+\/]+\=*)/.exec(request.headers.authorization);
	if (!(credentials && credentials[1])) return false;
	var usr = new Buffer(credentials[1], "base64");
	usr = usr.toString("utf8");

	if (!usr) return false;
	syracuse = syracuse || require('syracuse-main/lib/syracuse');

	if (syracuse.server instanceof mock.MockStreamServer && (request.fromNanny || (request._request && request._request.fromNanny))) {
		checkUser.checkUserLogin(_, session, usr);

		session.authData = {
			user: usr
		};
		return true;
	}
	return false;
};