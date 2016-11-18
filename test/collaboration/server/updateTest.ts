"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var config = require('config'); // must be first syracuse require
var sys = require("util");

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var factory = require("../../../../src/orm/factory");

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;

var tracer = console.log;
var testUrl = baseUrl + "/sdata/syracuse/collaboration/unit_test";

var doStop = false;
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var hacked = {};

	var db;
	var cookie;
	it('init server', function(_) {
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		// hack endpoint service
		var model = adminHelper.getCollaborationModel();
		var ent = model.getEntity(_, "endPoint");
		hacked.endpoint_getService = ent.getService;
		ent.$functions.getService = function(_, service, parameters) {
			//console.log("HACKED");
		};
		ent.factory = new factory.Factory(ent);
		// hack solution getFoldersJson
		var ent = model.getEntity(_, "x3solution");
		hacked.solution_getFolders = ent.getFoldersJson;
		ent.$functions.getFoldersJson = function(_) {
			if (this.solutionName(_) === "SOL1") return [{
				name: "FOL1",
				mother: []
			}];
			if (this.solutionName(_) === "SOL2") return [{
				name: "FOL2",
				mother: ["FOL1"]
			}, {
				name: "FOL1",
				mother: []
			}];
			if (this.solutionName(_) === "SOL3") return [{
				name: "FOL2",
				mother: ["FOL1"]
			}, {
				name: "FOL1",
				mother: ["ABC"]
			}];
		};
		ent.factory = new factory.Factory(ent);
		// auth
		cookie = testAdmin.getCookie(_, baseUrl);
		//
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	function _createSolution(_, code, folder, folder2) {
		var body = testAdmin.post(_, cookie, testUrl + "/x3solutions?representation=x3solution.$edit", {
			code: code,
			description: code,
			solutionName: code,
			serverHost: "1.2.3.4",
			serverPort: 1111,
			application: {
				$url: testUrl + "/applications(application eq 'x3')"
			}
		}, 201);
		//    tracer && tracer("body(48)", body);
		var body = testAdmin.post(_, cookie, testUrl + "/endPoints?representation=endPoint.$edit", {
			dataset: code + folder,
			description: code + folder,
			x3solution: {
				$url: testUrl + "/x3solutions(code eq '" + code + "')"
			},
			x3ServerFolder: folder,
			applicationRef: {
				$url: testUrl + "/applications(application eq 'x3')"
			}
		}, 201);
		if (folder2) {
			var body = testAdmin.post(_, cookie, testUrl + "/endPoints?representation=endPoint.$edit", {
				dataset: code + folder2,
				description: code + folder2,
				x3solution: {
					$url: testUrl + "/x3solutions(code eq '" + code + "')"
				},
				x3ServerFolder: folder2,
				applicationRef: {
					$url: testUrl + "/applications(application eq 'x3')"
				}
			}, 201);
		}
		//    tracer && tracer("body(57)", body);
	}

	it('Update remote api test', function(_) {
		// create update without url
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply", null, 400);
		// invalid update file test
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/invalid_patch_sample.zip"), null, 400);
		// inexistent update file test
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/inexistent_patch_sample.zip"), null, 500);
		// create update sync mode, no solution, no folder in database
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip"), null, 400);
		// create one solution and one endpoint
		_createSolution(_, "SOL1", "FOL1");
		//
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip"), null, 200);
		// tracer && tracer("(81)body", body);
		// get update created
		var body = testAdmin.get(_, cookie, baseUrl + body.$url, 200);
		//tracer && tracer("(84)body", body);
		strictEqual(body.version, "9.0.1", "Version check ok");
		strictEqual(body.name, "X3V9_P1", "Name check ok");

		// create a multifolder solution
		_createSolution(_, "SOL2", "FOL1", "FOL2");
		// create update should fail because no solution specified
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip"), null, 400);
		// create succesfull on FOL1
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL2", null, 200);
		var body = testAdmin.get(_, cookie, baseUrl + body.$url, 200);
		strictEqual(body.endpoints[0].endpoint.description, "SOL2FOL1", "Created on FOL1 ok");
		// create succesfull on FOL2
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL2&folder=FOL2", null, 200);
		var body = testAdmin.get(_, cookie, baseUrl + body.$url, 200);
		strictEqual(body.endpoints[0].endpoint.description, "SOL2FOL2", "Created on FOL2 ok");
		// create a scheduled update
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL2&folder=FOL1&schedule=" + encodeURIComponent("2020-01-01T10:10:00.000Z"), null, 200);
		// get update created
		var body = testAdmin.get(_, cookie, baseUrl + body.$url, 200);
		tracer && tracer("body(110)", body.endpoints[0]);
		strictEqual(body.scheduleDateTime, "2020-01-01T10:10:00.000Z", "Schedule date ok");
		strictEqual(body.endpoints[0].endpoint.description, "SOL2FOL1", "Endpoint description ok");

		// create a no root folder" solution
		_createSolution(_, "SOL3", "FOL1", "FOL2");
		// create should fail as there is no root folder
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL3", null, 400);
		// create succesfull on FOL1
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL3&folder=FOL1", null, 200);
		var body = testAdmin.get(_, cookie, baseUrl + body.$url, 200);
		strictEqual(body.endpoints[0].endpoint.description, "SOL3FOL1", "Created on SOL3FOL1 ok");

		// async mode test
		var body = testAdmin.post(_, cookie, testUrl + "/updates/$service/remoteApply?patch_url=" + encodeURIComponent(baseUrl + "/test-fixtures/patch_sample.zip") + "&solution=SOL2&folder=FOL2&trackngId=" + uuid.generate(), null, 202, true);
		var stop = 0;
		while (body.statusCode === 202 && stop++ < 100) {
			setTimeout(_, 200); // real life should be "pollingMillis" property
			body = testAdmin.get(_, cookie, baseUrl + body.body.location, 202, true, null, true);
		}
		strictEqual(body.statusCode, 200, "Got finished result ok");
		// get reply
		body = testAdmin.get(_, cookie, baseUrl + body.body.location + "?reply=true", 200);
		// check reply value
		ok(body.$url.match("/sdata/syracuse/collaboration/unit_test/updates"), "Return update ok");

	});

	it('restore hacked functions', function(_) {
		// hack endpoint service
		var model = adminHelper.getCollaborationModel();
		var ent = model.getEntity(_, "endPoint");
		ent.getService = hacked.endpoint_getService;
		ent.factory = new factory.Factory(ent);
		// hack solution getFoldersJson
		var ent = model.getEntity(_, "x3solution");
		ent.getFoldersJson = hacked.solution_getFolders;
		ent.factory = new factory.Factory(ent);

		ok(true, "functions restored");
	});
});