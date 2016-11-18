"use strict";

const helpers = require('@sage/syracuse-core').helpers;
const config = require('config'); // must be first syracuse require
const globals = require('streamline-runtime').globals;
const flows = require('streamline-runtime').flows;
const jwt = require('jsonwebtoken');
const connAppHelper = require('syracuse-4gl-api/lib/connectedApp');
const adminTestFixtures = require("../../collaboration/fixtures/adminTestFixtures");

const adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
const testAdmin = require('@sage/syracuse-core').apis.get('test-admin');


const port = (config.unit_test && config.unit_test.serverPort) || 3004;
const baseUrl = "http://localhost:" + port;

let tracer; // = console.log;

import {
	assert
} from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	var db;
	
	it("init server", function(_) {
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	function hasErrors(body) {
		let hasErr = body.$diagnoses && body.$diagnoses.some(function(diag) {
			return diag.$severity == "error" || diag.severity === "error";
		});
		if (!hasErr) {
			for (let key in body) {
				if (typeof body[key] === "object") hasErr = hasErr || hasErrors(body[key]);
			}
		}
		//
		return hasErr;
	}



	let user = "admin";
	globals.context = globals.context || {};
	globals.context.session = {
		host: "http://localhost:3004",
		id: helpers.uuid.generate(),
		getUserLogin: function(_) {
			return user;
		},
		getUserProfile: function(_) {
			return {
				user: function(_) {
					let db = adminHelper.getCollaborationOrm(_);
					return db.fetchInstance(_, db.model.getEntity(_, "user"), {
						jsonWhere: {
							login: user
						}
					});
				},
				selectedLocale: function(_) {
					let db = adminHelper.getCollaborationOrm(_);
					let loc = db.fetchInstance(_, db.model.getEntity(_, "localePreference"), {
						jsonWhere: {
							code: "en-US"
						}
					});
					return loc;
				},
			};
		},
		getSecurityProfile: function(_) {
			return null;
		},
		getData: function(code) {
			return null;
		}
	};

	const apps = [{
		name: "My connected application",
		url: "http://myconnectedapp:3000"
	}, {
		name: "My connected application 2",
		url: "http://myconnectedapp:3000/root_path/"
	}, {
		name: "My connected application 3",
		url: "http://myconnectedapp:3000/root_path"
	}, ];
	let appInst;

	function testAppCreate(_, connAppEntity, app) {
		let appInst = connAppEntity.createInstance(_, db);
		appInst.name(_, app.name);
		appInst.url(_, app.url);
		appInst.expiration(_, "2");
		appInst.save(_);

		strictEqual(appInst.name(_), app.name, `${app.name} name OK ${appInst.name(_)}`);
		strictEqual(appInst.url(_), app.url, `${app.name} url OK ${appInst.url(_)}`);
		strictEqual(appInst.active(_), true, `${app.name} active by default OK`);

		app.clientId = appInst.clientId(_);
		app.secret = appInst.secretCreated(_);
		ok(app.clientId != null, `Client ID generated OK ${app.clientId}`);
		ok(app.secret != null, `Secret generated OK ${app.secret}`);
		return appInst;
	}

	it("Create connected application", function(_) {

		let connAppEntity = db.model.getEntity(_, "connectedApplication");
		appInst = testAppCreate(_, connAppEntity, apps[0]);
		testAppCreate(_, connAppEntity, apps[1]);
		testAppCreate(_, connAppEntity, apps[2]);
	});

	it("generate tokens", function(_) {

		let tokenParams1 = `auth:\n  - auth1\n  - auth2\n  - auth3\nsite: SITE1`;

		let token = apps[0].token = connAppHelper.getConnectedAppToken(_, apps[0].clientId, tokenParams1);
		ok(token != null, `Token generated OK ${token}`);

		// generate a second token to be sure we can have several :)
		let tokenParams2 = `auth: \n  - auth3\n  - auth4\nsite: SITE2`;
		let formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[0].clientId, "/path/to/resource", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/path/to/resource?') === 0, `Generated formatted URL OK ${formattedUrl}`);

		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[0].clientId, "/path/to/resource?site=SITE2", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/path/to/resource?site=SITE2&') === 0, `Generated formatted URL OK ${formattedUrl}`);

		// generate token with escaped char
		tokenParams2 = `auth:\n  - auth3\n  - auth4\nsite: '*'`;
		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[0].clientId, "/path/to/resource", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/path/to/resource?') === 0, `Generated formatted URL OK ${formattedUrl}`);

		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[0].clientId, "/path/to/resource?site=*", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/path/to/resource?site=*&') === 0, `Generated formatted URL OK ${formattedUrl}`);

		// use the second app with a url including a path
		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[1].clientId, "/path/to/resource", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/path/to/resource?') === 0, `Generated formatted URL OK ${formattedUrl}`);

		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[1].clientId, "path/to/resource", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/root_path/path/to/resource?') === 0, `Generated formatted URL OK ${formattedUrl}`);

		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[1].clientId, "path/to/resource?site=*", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/root_path/path/to/resource?site=*&') === 0, `Generated formatted URL OK ${formattedUrl}`);

		formattedUrl = connAppHelper.formatConnectedAppUrl(_, apps[2].clientId, "path/to/resource?site=*", tokenParams2);
		ok(formattedUrl.indexOf('http://myconnectedapp:3000/root_path/path/to/resource?site=*&') === 0, `Generated formatted URL OK ${formattedUrl}`);
	});

	it("verify tokens", function(_) {
		let db = adminHelper.getCollaborationOrm(_);
		let model = db.model;
		let entity = model.getEntity(_, "tokenInfo");
		let filter = {
			sdataWhere: "app.clientId eq '" + apps[0].clientId + "'"
		};
		let tokenInfos = db.fetchInstances(_, entity, filter);
		let tokenInst = tokenInfos[0];

		strictEqual(tokenInfos.length, 5, `Eight tokens generated for ${apps[0].name} OK`);

		filter = {
			sdataWhere: "app.clientId eq '" + apps[1].clientId + "'"
		};
		tokenInfos = db.fetchInstances(_, entity, filter);
		strictEqual(tokenInfos.length, 3, `Three tokens generated for ${apps[1].name} OK`);

		ok(tokenInst.jti(_) != null, `Token ID generated OK ${tokenInst.jti(_)}`);
		ok(tokenInst.clientId(_) != null, `Connected app ID linked to token OK ${tokenInst.clientId(_)}`);
		let info = tokenInst.info(_);
		ok(info.auth && info.auth.length === 3, `Auth info count OK ${info.auth.length}`);
		strictEqual(info.auth && info.auth[0], 'auth1', `Auth info first value OK ${info.auth[0]}`);
		strictEqual(info.auth && info.auth[1], 'auth2', `Auth info second value OK ${info.auth[1]}`);
		strictEqual(info.auth && info.auth[2], 'auth3', `Auth info third value OK ${info.auth[2]}`);
		strictEqual(info.site, 'SITE1', `Site info value OK ${info.site}`);

		let token = apps[0].token;
		let secret = apps[0].secret;
		let tokenToVerify = token;
		let decoded = jwt.verify(tokenToVerify, secret);

		strictEqual(decoded.jti, tokenInst.jti(_), `jti verified OK ${decoded.jti}`);
		strictEqual(decoded.sub, 'admin', `sub verified OK ${decoded.sub}`);
		ok(decoded.iss != null, `Token issuer OK ${decoded.iss}`);
		ok(decoded.aud != null, `Token audience OK ${decoded.aud}`);
		ok(decoded.exp != null, `Token expire OK ${decoded.exp}`);
		ok(decoded.iat != null, `Token issued at OK ${decoded.iat}`);
		ok(decoded.auth && decoded.auth.length === 3, `Auth decoded count verified OK ${decoded.auth.length}`);
		strictEqual(decoded.auth && decoded.auth[0], 'auth1', `Auth decoded first value verified OK ${decoded.auth[0]}`);
		strictEqual(decoded.auth && decoded.auth[1], 'auth2', `Auth decoded second value verified OK ${decoded.auth[1]}`);
		strictEqual(decoded.auth && decoded.auth[2], 'auth3', `Auth decoded third value verified OK ${decoded.auth[2]}`);
		strictEqual(decoded.site, 'SITE1', `Site decoded value OK ${decoded.site}`);

		let error;
		try {
			jwt.verify(tokenToVerify, "Bad secret");
		} catch (e) {
			error = e;
		} finally {
			ok(error != null, "First verification failed because of invalid secret OK");
			strictEqual(error.name, 'JsonWebTokenError', `Name of bad secret token error OK ${error.name}`);
			strictEqual(error.message, 'invalid signature', `Message of bad secret token error OK ${error.message}`);
		}
		error = null;

		flows.sleep(_, 2000);
		try {
			jwt.verify(tokenToVerify, secret);
		} catch (e) {
			error = e;
		} finally {
			ok(error != null, "Second verification failed because of expiration OK");
			strictEqual(error.name, 'TokenExpiredError', `Name of expiration token error OK ${error.name}`);
			strictEqual(error.message, 'jwt expired', `Message of expiration token error OK ${error.message}`);
			ok(error.expiredAt != null, `Date of expiration token error OK ${error.expiredAt}`);
		}
		error = null;
	});

	it("userinfo dispatch failures", function(_) {
		let token = apps[0].token;
		let secret = apps[0].secret;
		let headers = {
			authorization: `Bearer ${token}`
		};
		let res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 30: Invalid token", "tokenInfo expired and deleted OK");


		appInst.active(_, false);
		appInst.save(_);

		// regenerate a new token
		let tokenParams1 = `auth:\n  - auth5\n  - auth6\nsite: SITE3`;

		token = connAppHelper.getConnectedAppToken(_, apps[0].clientId, tokenParams1);
		ok(token != null, `Token generated OK ${token}`);

		let decoded = jwt.decode(token, secret);
		ok(decoded.iss != null, `Token issuer OK ${decoded.iss}`);
		ok(decoded.sub != null, `Token subject OK ${decoded.sub}`);
		ok(decoded.aud != null, `Token audience OK ${decoded.aud}`);
		ok(decoded.exp != null, `Token expire OK ${decoded.exp}`);
		ok(decoded.iat != null, `Token issued at OK ${decoded.iat}`);
		ok(decoded.jti != null, `Token Id OK ${decoded.jti}`);
		//////////
		// retrieve the tokenInfo in order to get his uuid and delete the event time associated (to prevent ttl delete)
		//////////
		let db = adminHelper.getCollaborationOrm(_);
		let model = db.model;
		let jti = decoded.jti;
		let entity = model.getEntity(_, "tokenInfo");
		let filter = {
			sdataWhere: "jti eq '" + jti + "'"
		};
		let tokenInfo = db.fetchInstance(_, entity, filter);
		let tiUuid = tokenInfo.$uuid;
		// delete eventTime
		let eventTimeEntity = model.getEntity(_, "eventTime");
		let filterET = {
			sdataWhere: `key eq 'tokenInfo_${tiUuid}_${tiUuid}'`
		};
		let eventTime = db.fetchInstance(_, eventTimeEntity, filterET);
		eventTime.deleteSelf(_);
		//////////
		//////////

		// try with missing jti
		let fakeData1 = helpers.object.clone(decoded);
		delete fakeData1.jti;
		headers.authorization = `Bearer ${jwt.sign(fakeData1, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 10: Invalid token", "token with missing jti should be rejected OK");

		// try with iat in the future
		let fakeData2 = helpers.object.clone(decoded);
		fakeData2.iat = (Date.now() + 20000) / 1000; // set iat in the future
		headers.authorization = `Bearer ${jwt.sign(fakeData2, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 20: Invalid token", "token with iat in the future should be rejected OK");

		// even with correct data it should be rejected because the app in inactive
		let fakeData3 = helpers.object.clone(decoded);
		headers.authorization = `Bearer ${jwt.sign(fakeData3, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 40: Invalid token", "token associated to inactive connected application should be rejected OK");

		// re-activate the conn app
		appInst.active(_, true);
		appInst.save(_);

		// try with bad iss
		let fakeData3_1 = helpers.object.clone(decoded);
		fakeData3_1.iss = "1234567890";
		headers.authorization = `Bearer ${jwt.sign(fakeData3_1, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 41: Invalid token", "token with mismatch iss should be rejected OK");

		// try with missing sub
		let fakeData4 = helpers.object.clone(decoded);
		delete fakeData4.sub;
		headers.authorization = `Bearer ${jwt.sign(fakeData4, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 60: Invalid token", "token with missing sub should be rejected OK");

		// try with non existing sub
		let fakeData5 = helpers.object.clone(decoded);
		fakeData5.sub = "test";
		headers.authorization = `Bearer ${jwt.sign(fakeData5, secret)}`;
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 70: Invalid token", "token with non existing user should be rejected OK");

		// change the secret without using generateSecret
		appInst.secret(_, "Secret modified");
		appInst.save(_);

		// try again with same data, it should be rejected as the secret is not the same
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 50: Invalid token: JsonWebTokenError: invalid signature", "token with invalid signature should be rejected OK");

		// change the secret without using generateSecret to set the correct secret
		appInst.secret(_, secret);
		appInst.save(_);

		// wait for expiration
		flows.sleep(_, 2000);
		// try again with same data, it should be rejected as the secret is not the same
		res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 401, false, headers);
		strictEqual(res.$diagnoses && res.$diagnoses[0] && res.$diagnoses[0].$message, "Error 50: Invalid token: TokenExpiredError: jwt expired", "token expired should be rejected OK");
	});

	it("userinfo dispatch success", function(_) {
		let token = apps[0].token;
		let secret = apps[0].secret;

		// regenerate a new token
		let tokenParams1 = `auth:\n  - auth7\n  - auth8\nsite: SITE4`;

		token = connAppHelper.getConnectedAppToken(_, apps[0].clientId, tokenParams1);
		ok(token != appInst, `Token generated OK ${token}`);

		// Validate userinfo call
		let headers = {
			authorization: `Bearer ${token}`
		};
		let res = adminTestFixtures.get(_, null, baseUrl + "/auth/userinfo", 200, false, headers);
		strictEqual(res.auth && res.auth.length, 2, "userinfo auth data length OK");
		strictEqual(res.auth && res.auth[0], "auth7", "userinfo auth entry 1 OK");
		strictEqual(res.auth && res.auth[1], "auth8", "userinfo auth entry 2 OK");
		strictEqual(res.site, "SITE4", "userinfo site OK");
		strictEqual(res.locale, "en-US", "locale OK");
		strictEqual(res.name, "Super administrator", "name OK");
		strictEqual(res.sub, "admin", "subject OK");
		ok(res.iss === undefined, "Token issuer not included");
		ok(res.aud === undefined, "Token audience not included");
		ok(res.exp === undefined, "Token expired not included");
		ok(res.iat === undefined, "Token issued at not included");
		ok(res.jti === undefined, "Token Id not included");

		// generate one more token
		token = connAppHelper.getConnectedAppToken(_, apps[0].clientId, tokenParams1);
		// check the tokens exist
		let db = adminHelper.getCollaborationOrm(_);
		let model = db.model;
		let entity = model.getEntity(_, "tokenInfo");
		let filter = {
			sdataWhere: "app.clientId eq '" + apps[0].clientId + "'"
		};
		let tokenInfos = db.fetchInstances(_, entity, filter);
		ok(tokenInfos.length === 3, `Three tokens are still here (because ttl have been deleted OK`);

		// regenerate secret
		appInst.generateSecret(_);
		appInst.save(_);
		tokenInfos = db.fetchInstances(_, entity, filter);
		ok(tokenInfos.length === 0, `All tokens should have been deleted after reseting the secret OK`);
	});
});