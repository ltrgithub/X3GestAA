"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var config = require('config'); // must be first syracuse require
var adminTestFixtures = require("syracuse-collaboration/test/fixtures/adminTestFixtures");
var util = require('util');


var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;


import {
	assert
} from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	var port = (config.unit_test && config.unit_test.serverPort) || 3004;

	var realm = 'Syracuse';
	var crypto = require('crypto');
	//  hash function from RFC2617
	function _h(value) {
		var hash = crypto.createHash('MD5');
		hash.update(value, "utf8");
		return hash.digest("hex");
	}


	var db;
	it("init environnement", function(_) {
		//
		db = adminTestFixtures.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//

	});

	var signatureAuth = require("../../../src/auth/signatureAuth");

	var PASSWORD = "testtestpass";
	var SIGNATURE = "testtestsig";
	var USERNAME = "testtest";

	it("put signature", function(_) {
		try {
			var entity = db.model.getEntity(_, "user");
			var instance = db.fetchInstance(_, entity, {
				jsonWhere: {
					login: USERNAME
				}
			});

			strictEqual(instance, null, "User does not yet exist");

			var wronguser = signatureAuth._sign(_, SIGNATURE, USERNAME);
			strictEqual(wronguser.$diagnoses.length, 1, "DB auth - ");
			console.log("Message for wrong user " + JSON.stringify(wronguser));


			var instance = entity.factory.createInstance(_, null, db);
			instance.login(_, USERNAME);
			instance.lastName(_, USERNAME);
			instance.setPassword(_, PASSWORD);
			instance.authentication(_, "db");
			instance.signature(_, _h(instance.login(_) + ":" + realm + ":" + SIGNATURE));
			instance.active(_, true);
			instance.save(_);
			console.log("$diagnoses for save " + USERNAME + " " + JSON.stringify(instance.$diagnoses));

			var correctAuth = signatureAuth._sign(_, PASSWORD, USERNAME);
			strictEqual(correctAuth.$diagnoses.length, 0, "DB auth - correct password");
			console.log("Message for correct auth " + JSON.stringify(correctAuth));
			var wrongpwd = signatureAuth._sign(_, SIGNATURE, USERNAME);
			console.log("Message for wrong password " + JSON.stringify(wrongpwd));
			strictEqual(wrongpwd.$diagnoses.length, 1, "DB auth - wrong password");
			strictEqual(JSON.stringify(wrongpwd.$diagnoses[0]) === JSON.stringify(wronguser.$diagnoses[0]), false, "Different text wrong user - wrong password");


			instance.authentication(_, "sage-id");
			instance.save(_);

			var wrongpwd2 = signatureAuth._sign(_, PASSWORD, USERNAME);
			console.log("Second message for wrong password " + JSON.stringify(wrongpwd2));
			strictEqual(wrongpwd2.$diagnoses.length, 1, "sage-id auth - wrong password");
			strictEqual(JSON.stringify(wrongpwd2.$diagnoses[0]) === JSON.stringify(wrongpwd.$diagnoses[0]), true, "sage-id auth - wrong password: same text");
			strictEqual(signatureAuth._sign(_, SIGNATURE, USERNAME).$diagnoses.length, 0, "sage-id auth - correct password");
			instance.deleteSelf(_);
		} catch (e) {
			console.error("Error " + e.stack);
		}
		console.log(5);

	});
});