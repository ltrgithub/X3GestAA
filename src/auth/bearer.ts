"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var config = require('config');
var locale = require('streamline-locale');
var checkUser = require('../../src/auth/checkUser');
var authHelper = require('../../src/auth/helpers');
var changePasswordError = require('../../src/auth/changePassword').changePasswordError;
var oauth2 = require('./oauth2');
var adminHelpers = require('../../src/collaboration/helpers');
var jsxml = require('js-xml');
var url = require('url');

function unauthorized() {
	return authHelper.unauthorized('Basic realm=' + config.session.realm);
}

// When the access token for OAuth2 is already present in authentication header, OAuth2 authentication can be done in batch mode (for Web services)

exports.authenticate = function(_, request, response, session) {
	var parsedUrl = url.parse(request.url, true);
	if (!parsedUrl.query || !parsedUrl.query.oauth2) throw unauthorized();
	var oauth2Server = parsedUrl.query.oauth2;

	var credentials = /^Bearer\s+(\S+)/.exec(request.headers.authorization);
	if (!(credentials && credentials[1])) throw unauthorized();

	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var server = db.fetchInstance(_, db.model.getEntity(_, "oauth2"), {
		jsonWhere: {
			batchAuthentication: true,
			name: oauth2Server
		}
	});
	if (!server) throw authHelper.error(404, "internal error: no OAuth2 server with batch authentication found");
	if (!server.active(_)) throw authHelper.error(403, "internal error: oauth2 server not active: " + server.name(_));

	if (server.name(_) !== 'sageid') {
		var json = oauth2.getUserInfo(_, credentials[1], server.dataRequestURL(_));
		tracer && tracer("Result of user name ", json);
		var userField = server.userField(_) || "user";
		var login = userField.split('.').reduce(function(obj, field) {
			var m = /^(\w+)\[(\d+)\]$/.exec(field);
			return m ? obj[m[1]][m[2]] : obj[field];
		}, json);
		var user = checkUser.fromLoginPage(_, request, 'oauth2', login, null, null, server);
	} else {
		var sageIdOAuth = (config.sage_id && config.sage_id.oauth) ? config.sage_id.oauth : {};
		var login = oauth2.sageIdTokenValidation(_, request, response, credentials[1]);
		var user = checkUser.fromLoginPage(_, request, 'sage-id', login, null);
	}

	tracer && tracer("User authenticated.");
	session.authData = {
		user: login,
		authorization: request.headers.authorization
	};
	return true;
};