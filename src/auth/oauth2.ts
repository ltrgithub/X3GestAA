"use strict";

var nodelocal = require("config");
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var url = require("url");
var querystring = require("querystring");
var checkUser = require('../../src/auth/checkUser');
var authHelper = require('../../src/auth/helpers');
var adminHelpers = require('syracuse-collaboration/lib/helpers');
var httpClient = require('../../src/http-client/httpClient');
var mongodb = require('mongodb');
var jsxml = require('js-xml');
var crypto = require('crypto');

//tracer = console.log;

function create(config, redirectUri) {
	return new function() {
		var self = this;

		/// first step of authentication: redirect to OAuth2 server
		this.loginStart = function(_, request, response, session) {
			// Insert record in Web API mongoDB only if system is hosted in cloud
			if (nodelocal.hosting && nodelocal.hosting.multiTenant)
				insertSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, request.session.id);

			var params = {};
			params.redirect_uri = redirectUri;
			params.response_type = 'code';
			params.scope = config.scope;
			params.state = request.session.id;
			params.client_id = config.clientId;
			var redirectUrl = config.baseSite + config.authorizePath + '?' + querystring.stringify(params);
			response.writeHead(303, {
				"content-type": "text/html",
				location: redirectUrl
			});
			response.end('<html>Use <a href="' + redirectUrl + '">Login</a> if redirect does not work automatically</html>');
			return false;
		};

		function getAccessToken(_, code, params) {
			params.client_id = config.clientId,
				params.client_secret = config.clientSecret,
				params[params.grant_type === 'refresh_token' ? 'refresh_token' : 'code'] = code;
			var body = querystring.stringify(params);
			var result = httpClient.httpRequest(_, {
				method: 'POST',
				url: config.baseSite + config.accessTokenPath,
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					'content-length': body.length,
				}
			}).end(body).response(_).checkStatus(200).readAll(_);
			// response should be JSON according to http://tools.ietf.org/html/draft-ietf-oauth-v2-07
			// but some sites return urlencoded
			result = result[0] === '{' ? JSON.parse(result) : querystring.parse(result);
			return result;
		}

		/// second step of authentication: obtain access token and user name
		this.loginCallback = function(_, request, response) {
			var parsed = url.parse(request.url);
			var queryData = querystring.parse(parsed.query);
			if (queryData.error) throw authHelper.error(403, queryData.error);
			if (!queryData.code) throw authHelper.error(403, "internal error: authorization code missing");
			var params = {};
			params.redirect_uri = redirectUri;
			// params['state'] = queryData.state;
			params.grant_type = 'authorization_code';

			tracer && tracer("Before getting access token");
			// get access token 
			var tokens = getAccessToken(_, queryData.code, params);
			// get user name
			tracer && tracer("Result of access token ", tokens);
			var json = getUserInfo(_, tokens.access_token, config.dataRequestURL);
			tracer && tracer("Result of user name ", json);
			var userField = config.userField || "user";
			var login = userField.split('.').reduce(function(obj, field) {
				var m = /^(\w+)\[(\d+)\]$/.exec(field);
				return m ? obj[m[1]][m[2]] : obj[field];
			}, json);
			var user = checkUser.fromLoginPage(_, request, 'oauth2', login, null, null, config.name);

			request.session.authData = {
				user: user.login(_),
				password: tokens.access_token
			};
			authHelper.redirect(_, request, response, request.session.authTargetUrl || '/', true);
		};

		this.sageIdStart = function(_, request, response) {
			var params = {};
			params.response_type = 'code';
			params.scope = config.scope;
			params.client_id = config.client_id;
			params.redirect_uri = redirectUri;
			params.state = request.session.id;

			// Insert record in Web API mongoDB only if system is hosted in cloud
			if (nodelocal.hosting && nodelocal.hosting.multiTenant)
				insertSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, request.session.id);

			var resp = httpClient.httpRequest(_, {
				method: 'GET',
				url: config.baseUrl + '/OAuthService/WebStartAuthorisationAttempt?' + querystring.stringify(params),
			}).end().response(_).checkStatus(302);

			var redirectUrl = '';
			if (resp.headers.location)
				redirectUrl = resp.headers.location;
			else
				throw authHelper.error(404, 'Invalid OAuth start request');

			response.writeHead(302, {
				"content-type": "text/html",
				location: redirectUrl
			});
			response.end('<html>Use <a href="' + redirectUrl + '">Login</a> if redirect does not work automatically</html>');
			return false;
		};

		this.sageIdCallback = function(_, request, response) {
			var parsed = url.parse(request.url, true);
			var code = decodeURIComponent(parsed.query.code);

			var params = {};
			params.grant_type = 'authorization_code';
			params.code = code;
			params.redirect_uri = redirectUri;

			var json = getSageIdToken(_, params);
			var decryptedXML = decryptToken(config.key, config.iv, json.access_token, request);
			var decryptedJSON = jsxml.parse(decryptedXML);
			var email = decryptedJSON["AuthenticationToken"]["Subject"]["UserPrincipal"]["EmailAddress"];

			var user = checkUser.fromLoginPage(_, request, 'sage-id', email, null);
			request.session.authData = {
				user: user,
				password: json.access_token
			};
			request.session.getUserProfile(_);
			authHelper.redirect(_, request, response, request.session.authTargetUrl || '/', true);
		};

		function getSageIdToken(_, params) {
			var client_secret = config.client_id + ':' + config.secret_key;
			var base64Key = new Buffer(client_secret).toString('base64');

			var clientOptions = {
				method: 'POST',
				url: config.baseUrl + '/OAuthService/WebGetAccessToken',
				headers: {
					'Authorization': 'Basic ' + base64Key,
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
				}
			};

			var result = httpClient.httpRequest(_, clientOptions).end(querystring.stringify(params)).response(_).readAll(_);
			var json = JSON.parse(result);
			return json;
		};
	};
};

exports.getServerList = function(_) {
	if (!authHelper.isAllowed("oauth2")) return [];
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	// fetch OAuth2 server data
	return db.fetchInstances(_, db.model.getEntity(_, "oauth2"), {
		sdataWhere: ""
	}).filter_(_, function(_, oauth2) {
		return oauth2.active(_);
	}).map_(_, function(_, oauth2) {
		var name = oauth2.name(_);
		var href = "/auth/oauth2/" + name + '/loginStart';
		if (name === 'sageid')
			href = "/auth/oauth2/" + name + '/sageIdStart';
		return {
			href: href,
			title: oauth2.displayName(_) || name,
		};
	});
};

function loginStart(_, request, response) {
	return request.oauth2.loginStart(_, request, response);
}

function loginCallback(_, request, response) {
	return request.oauth2.loginCallback(_, request, response);
}

function sageIdStart(_, request, response) {
	return request.oauth2.sageIdStart(_, request, response);
}

function sageIdCallback(_, request, response) {
	return request.oauth2.sageIdCallback(_, request, response);
}

function getUserInfo(_, accessToken, dataRequestURL) {
	var parsed = url.parse(dataRequestURL);

	var resp = httpClient.httpRequest(_, {
		method: 'GET',
		url: dataRequestURL,
		headers: {
			authorization: 'Bearer ' + accessToken,
			host: parsed.host,
			'content-length': 0,
		},
	}).end().response(_);
	var result = resp.readAll(_);
	if (!result || result[0] !== '{') throw authHelper.error(resp.statusCode, "getUserInfo request failed: " + resp.statusCode);
	result = JSON.parse(result);
	if (result.error && result.error.message) throw authHelper.error(resp.statusCode, result.error.message);
	return result;
}

exports.getUserInfo = getUserInfo;

var dispatcher = authHelper.dispatcher(4, {
	loginStart: loginStart,
	loginCallback: loginCallback,
	sageIdStart: sageIdStart,
	sageIdCallback: sageIdCallback
});

exports.dispatch = function(_, request, response) {
	var m = /\/[^\/]*\/[^\/]*\/([^\/]*)\//.exec(request.url);
	if (!m || !m[1]) throw authHelper.error(404, "internal error: bad url: " + request.url);
	var name = m[1];
	if (name !== 'sageid') {
		var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
		var server = db.fetchInstances(_, db.model.getEntity(_, "oauth2"), {
			jsonWhere: {
				name: name,
			}
		})[0];
		if (!server) throw authHelper.error(404, "internal error: oauth2 server not found: " + name);
		if (!server.active(_)) throw authHelper.error(403, "internal error: oauth2 server not active: " + name);
		var redirectUri = ("authorized" in request.connection ? "https://" : "http://") + (request.headers['x-forwarded-host'] || request.headers.host) + server.redirectPath(_);
		if (nodelocal.hosting && nodelocal.hosting.multiTenant)
			redirectUri = ((nodelocal.mongoNotify && nodelocal.mongoNotify.apiHost) ? nodelocal.mongoNotify.apiHost : "https://devapi.dev-sageerpx3online.com") + server.apiPath(_);
		request.oauth2 = create(server._data, redirectUri);
	} else {
		var sageIdOAuth = (nodelocal.sage_id && nodelocal.sage_id.oauth) ? nodelocal.sage_id.oauth : {};
		request.oauth2 = create(sageIdOAuth, sageIdOAuth.redirectUrl);
	}
	return dispatcher(_, request, response);
};

function insertSessionNotification(_, host, sessionId) {
	var mongoConfig = nodelocal.mongoNotify || {};
	if (!mongoConfig.oauthCollection) {
		console.error("Missing oauthCollection in mongoNotify in nodelocal.js for OAuth2 session notification");
		return;
	}
	var db = initializeMongoDB(mongoConfig.oauthHost, mongoConfig.port, mongoConfig.database);
	db.open(_).collection(mongoConfig.oauthCollection, _).update({
		_id: sessionId,
		host: host
	}, {
		_id: sessionId,
		host: host
	}, {
		upsert: true
	}, _);
	db.close(_);
}

function initializeMongoDB(mongoHost, mongoPort, mongoDatabase) {
	var hostArray = mongoHost.split(",");
	var opt = (nodelocal.mongodb || {}).options || {
		db: {
			w: 1
		}
	};
	if (hostArray.length > 1) {
		var servers = [];
		for (var i = 0; i < hostArray.length; i++) {
			servers[i] = new mongodb.Server(hostArray[i] || 'localhost', mongoPort || 27017, opt.server);
		}
		var replicaSet = new mongodb.ReplSet(servers, opt.replSet);
		var db = new mongodb.Db(mongoDatabase || 'syracuse', replicaSet, opt.db);
	} else {
		var server = new mongodb.Server(mongoHost || 'localhost', mongoPort || 27017, opt.server);
		var db = new mongodb.Db(mongoDatabase || 'syracuse', server, opt.db);
	}
	return db;
}

// add optional request parameter for loginError message
function decryptToken(key, iv, encryptedToken, request) {
	var keyBuf = new Buffer(key, 'base64');
	var ivBuf = new Buffer(iv, 'base64');
	var tokenBuf = new Buffer(encryptedToken, 'base64');
	try {
		var decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
		var decryptString = decipher.update(tokenBuf, 'base64', 'utf8');
		decryptString += decipher.final('utf8');
		return decryptString;
	} catch (ex) {
		console.error(new Date().toISOString(), ex.stack);
		if (request) request.session.loginError = ex.message;
		return authHelper.unauthorized("Invalid access token");
	}
}

exports.decryptToken = decryptToken;

exports.sageIdTokenValidation = sageIdTokenValidation;

function sageIdTokenValidation(_, request, response, accessToken) {
	var sageIdOAuth = (nodelocal.sage_id && nodelocal.sage_id.oauth) ? nodelocal.sage_id.oauth : {};
	var decryptedXML = decryptToken(sageIdOAuth.key, sageIdOAuth.iv, accessToken, request);
	var decryptedJSON = jsxml.parse(decryptedXML);
	var expirationDate = decryptedJSON["AuthenticationToken"]["Scope"]["Validity"]["NotValidAfter"];
	var valid = validateToken(expirationDate);
	if (valid)
		return decryptedJSON["AuthenticationToken"]["Subject"]["UserPrincipal"]["EmailAddress"];
	else
		throw authHelper.unauthorized("Access token expired");
};

function validateToken(expirationDate) {
	var valid = true;
	var currentDate = new Date();
	var newExpirationDate = new Date(expirationDate);
	if (currentDate > newExpirationDate)
		valid = false;
	return valid;
};