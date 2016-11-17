"use strict";
// authentication using HTTP digest (RFC2617)
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var crypto = require('crypto');
var util = require('util');
var config = require('config');
var locale = require('streamline-locale');
var checkUser = require('syracuse-auth/lib/checkUser');
var authHelper = require('syracuse-auth/lib/helpers');
var changePassword = require('syracuse-auth/lib/changePassword').changePassword;

//	store a nonce for 20 minutes
var NONCE_STORE_THRESHOLD = 1200000;

//store nonce and time. Old nonces will be cleared after NONCE_STORE_THRESHOLD milliseconds
var nonces = [];

// store a new nonce (and throw away old nonces)

function pushNonce(nonce) {
	var now = Date.now();
	while (nonces.length > 0 && now - nonces[0] > NONCE_STORE_THRESHOLD) {
		nonces.splice(0, 2);
	}
	nonces.push(now, nonce);
}

// search for a given nonce (then throw away old nonces). Result: true, if the nonce has been found.
// The found nonce will be removed

function getNonce(nonce) {
	var found = false;
	for (var i = 1; i < nonces.length; i += 2) {
		if (nonces[i] === nonce) {
			nonces.splice(i - 1, 2);
			found = true;
			break;
		}
	}
	var now = Date.now();
	while (nonces.length > 0 && now - nonces[0] > NONCE_STORE_THRESHOLD) {
		nonces.splice(0, 2);
	}
	return found;
}

// generate random hex string

function randomHex(len) {
	var n = Math.floor(Math.random() * (1 << 24));
	var s = n.toString(16);
	return s.length >= len ? s.substring(0, len) : ("00000000".substring(0, len - s.length) + s);
};

//hash function from RFC2617

function h(value) {
	var hash = crypto.createHash('MD5');
	hash.update(value, "utf8");
	return hash.digest("hex");
}

function challenge() {
	var nonce = randomHex(6) + randomHex(6) + randomHex(6) + randomHex(6) + randomHex(6);
	pushNonce(nonce);
	return 'Digest realm="' + config.session.realm + '", ' + //
		'qop="auth", algorithm="MD5", nonce="' + nonce + '", opaque="00"';
}

function unauthorized() {
	return authHelper.unauthorized(challenge());
}

exports.authenticate = function(_, request, response, session) {
	var header = request.headers.authorization;
	var auth = {};
	var re = /(\w+)\=(?:(\w+)|\"([^\"]*)\")/g;
	var r;
	// get all items and values from authorization header
	while (r = re.exec(header)) {
		auth[r[1]] = (r[2] || "") + (r[3] || "");
	}

	// nonce must have been created before and must not have been used before
	if (!getNonce(auth.nonce)) throw unauthorized();

	// client nonce count must be 1
	if (!auth.cnonce || auth.nc * 1 !== 1) throw unauthorized();

	var user = checkUser.fromLoginPage(_, request, "digest", auth.username, function(hashPasswd) {
		var a2 = request.method + ":" + auth.uri;
		var result = h(hashPasswd + ":" + auth.nonce + ":" + auth.nc + ":" + auth.cnonce + ":" + auth.qop + ":" + h(a2));
		return result === auth.response;
	}, challenge());

	// redirect to password change dialog if requested by config
	if (user.mustChangePassword(_)) return changePassword(_, request, response, user);

	tracer && tracer("User authenticated.");
	// TODO: should not keep password around!
	session.authData = {
		user: auth.username,
		authorization: request.headers.authorization
	};
	return true;
};