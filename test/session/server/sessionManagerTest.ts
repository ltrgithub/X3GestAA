"use strict";

var config = require('config'); // must be first syracuse require
var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");
//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;

var authCookieKey = (config.session || {}).key || "syracuse.sid" + "." + port;
var loginCookieKey = (config.session || {}).key || "syracuse.sid.login" + "." + port;

var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var tracer; // = console.log;

var ez = require('ez-streams');

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	function extractCookie(ckHeader, name) {
		if (Array.isArray(ckHeader)) ckHeader = ckHeader.join("");
		var cookies = helpers.http.parseCookie(ckHeader);
		return cookies && cookies[name];
	}

	function getCookie(_) {
		var response = new ez.devices.http.client({
			url: baseUrl + "/syracuse-main/html/main.html",
			user: "admin",
			password: "admin"
		}).end().response(_);
		response.readAll(_);
		strictEqual(response.statusCode, 200, "user authenticated");
		return extractCookie(response.headers["set-cookie"], authCookieKey);
	}

	function logout(_, cookie) {
		var response = new ez.devices.http.client({
			method: "POST",
			url: baseUrl + "/logout",
			headers: {
				cookie: cookie,
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
	}

	var db;
	it('init database', function(_) {
		db = testAdmin.initializeTestEnvironnement(_);
		//
		ok(true, "mongodb initialized");

	});

	it('sessionManager - createSession', function(_) {
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		strictEqual(response.statusCode, 401, "Authorization Required");
	});

	it('sessionManager - useSession', function(_) {
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			user: "admin",
			password: "admin",
			headers: {
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		strictEqual(response.statusCode, 200, "user authenticated with user / pass");
		var sessionCk = extractCookie(response.headers["set-cookie"], authCookieKey);
		ok(sessionCk != null, "cookie set");
		// send right cookie
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				cookie: authCookieKey + "=" + sessionCk + "; path=/",
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		resp = response.readAll(_);
		strictEqual(response.statusCode, 200, "user authenticated with cookie");
		// send wrong cookie
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				cookie: authCookieKey + "=wrong; path=/",
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		strictEqual(response.statusCode, 401, "user not authenticated with wrong cookie");

	});

	it('sessionManager - Authenticate with form', function(_) {
		var response = new ez.devices.http.client({
			url: baseUrl + "/auth/login/submit",
			user: "admin",
			password: "admin",
			headers: {
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		//
		strictEqual(response.statusCode, 200, "user authenticated");
		tracer && tracer("(89) cookie : " + response.headers["set-cookie"]);
		var sessionCk = extractCookie(response.headers["set-cookie"], authCookieKey);
		ok(sessionCk != null, "cookie set");
		ok(extractCookie(response.headers["set-cookie"], loginCookieKey) == null, "login cookie not set");
		// logout
		logout(_, authCookieKey + "=" + sessionCk + "; path=/");
		// create new session with remember me option
		var response = new ez.devices.http.client({
			method: "POST",
			user: "admin",
			password: "admin",
			url: baseUrl + "/auth/login/submit",
			headers: {
				"content-type": "application/json",
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end(JSON.stringify({
			keepConnected: true
		})).response(_);
		tracer && tracer("(159) cookie : " + response.headers["set-cookie"]);
		resp = response.readAll(_);
		var respCookie = response.headers["set-cookie"];
		if (Array.isArray(respCookie)) respCookie = respCookie.join("");
		var loginCk = extractCookie(response.headers["set-cookie"], loginCookieKey);
		var loginCkParts = (loginCk || "").split("/");
		tracer && tracer("(163) login cookie is " + loginCkParts);
		var token = loginCkParts.pop();
		var serie = loginCkParts.pop();
		var login = loginCkParts.join("/");
		strictEqual(login, "admin", "Login admin found ok");
		ok(serie != null, "Got serie ok");
		ok((token != null) && (token != ""), "Got token ok");
		// logout
		logout(_, respCookie);
		// make a request with right token, should get 200, new token, same serie
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				cookie: respCookie,
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		resp = response.readAll(_);
		var respCookie2 = response.headers["set-cookie"];
		if (Array.isArray(respCookie2)) respCookie2 = respCookie2.join("");
		strictEqual(response.statusCode, 200, "user authenticated login cookie");
		var loginCk = extractCookie(response.headers["set-cookie"], loginCookieKey);
		loginCkParts = (loginCk || "").split("/");
		var token2 = loginCkParts.pop();
		var serie2 = loginCkParts.pop();
		var login = loginCkParts.join("/");
		strictEqual(login, "admin", "Login admin found ok");
		ok(serie2 != null, "Got serie 2 ok");
		ok((token2 != null) && (token2 != ""), "Got token 2 ok");
		ok(serie === serie2, "Got same serie 2 ok");
		ok(token != token2, "Got different token 2 ok");
		// 
		logout(_, respCookie2);
		// make request with first token (wrong) should fail and receive diagnoses
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				cookie: respCookie,
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		strictEqual(response.statusCode, 401, "token reuse fails ok");
		// make request with right token (good) should fail also because of the first failed attempt
		var response = new ez.devices.http.client({
			url: baseUrl + "/sdata",
			headers: {
				cookie: respCookie2,
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end().response(_);
		var resp = response.readAll(_);
		strictEqual(response.statusCode, 401, "token reuse fails ok");
		// authenticate again to recreate triple
		var response = new ez.devices.http.client({
			method: "POST",
			user: "admin",
			password: "admin",
			url: baseUrl + "/auth/login/submit",
			headers: {
				"content-type": "application/json",
				"accept-language": "en-us",
				"accept": "application/json"
			}
		}).end(JSON.stringify({
			keepConnected: true
		})).response(_);
		var resp = response.readAll(_);
		// check expiration date
		var loginCk = extractCookie(response.headers["set-cookie"], loginCookieKey);
		var loginCkParts = (loginCk || "").split("/");
		var token = loginCkParts.pop();
		var serie = loginCkParts.pop();
		var login = loginCkParts.join("/");
		var rec = db.db.collection("LoginToken", _).find({
			_id: serie,
			login: login,
			token: token
		}).toArray(_)[0];
		ok(rec != null, "Token record found");
		ok((rec || {})._expire != null, "Has expiration date ok");
	});
});