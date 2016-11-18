"use strict";
var config = require('config'); // must be first syracuse require

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var adminTestFixtures = require("../../../test/collaboration/fixtures/adminTestFixtures");
var ez = require('ez-streams');
var mongodb = require('mongodb');
var dataModel = require("../../..//src/orm/dataModel");
var x3Mock = require("syracuse-x3/test/fixtures/x3Mock");
var x3MockServer;
var x3port = (config.unit_test && config.unit_test.x3mockPort) || 3005;


//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;

helpers.pageFileStorage = false;
var acceptLanguage = "fr,fr-fr";

var tracer; // = console.log;

var contractUrl = "/sdata/syracuse/collaboration/mongodb_admin_test/";

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var endPoint = adminTestFixtures.modifyCollaborationEndpoint("mongodb_admin_test");

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	function _findUuid(coll, searchProp, searchVal) {
		var uuid = null;
		coll.forEach(function(item) {
			if (item[searchProp] == searchVal) {
				tracer && tracer("found: " + sys.inspect(item));
				uuid = item.$uuid;
			}
		});
		return uuid;
	}

	function _encodePass(login, pass) {
		return adminTestFixtures.encodePassword(login, pass);
	}

	function onlyInfo(diags) {
		return adminTestFixtures.onlyInfo(diags);
	}

	function hasErrors(body) {
		var hasErr = body.$diagnoses && body.$diagnoses.some(function(diag) {
			return diag.$severity == "error" || diag.severity === "error";
		});
		if (!hasErr) {
			for (var key in body) {
				if (typeof body[key] === "object") hasErr = hasErr || hasErrors(body[key]);
			}
		}
		//
		return hasErr;
	}

	function getCookie(_, login, pass, status) {
		var resp = adminTestFixtures.getCookie(_, baseUrl, login, pass, true, status);
		acceptLanguage = resp.headers["content-language"] || acceptLanguage;
		return resp.headers["set-cookie"];
	}

	function post(_, cookie, url, data, statusCode, returnFullResponse) {
		var response = ez.devices.http.client({
			method: "post",
			url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
			headers: {
				"content-type": "application/json",
				"Accept-Language": acceptLanguage,
				cookie: cookie
			}
		}).end(JSON.stringify(data)).response(_);
		strictEqual(response.statusCode, statusCode || 201, "status verified");
		if (returnFullResponse) return {
			headers: response.headers,
			body: JSON.parse(response.readAll(_))
		};
		else return JSON.parse(response.readAll(_));
	}

	function put(_, cookie, url, data, statusCode, returnFullResponse) {

		console.log("request \n url=" + url + "\ndata=" + JSON.stringify(data, null, 2));

		var response = ez.devices.http.client({
			method: "put",
			url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
			headers: {
				"content-type": "application/json",
				"Accept-Language": acceptLanguage,
				cookie: cookie
			}
		}).end(JSON.stringify(data)).response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		if (returnFullResponse) return {
			headers: response.headers,
			body: JSON.parse(response.readAll(_))
		};
		else return JSON.parse(response.readAll(_));
	}

	function get(_, cookie, url, statusCode, facet) {
		var type = facet || "generic.$details";
		console.log(url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url);
		var response = ez.devices.http.client({
			method: "get",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
			headers: {
				cookie: cookie,
				"Accept-Language": acceptLanguage,
				accept: "application/json;vnd.sage=syracuse"
			}
		}).end().response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		return JSON.parse(response.readAll(_));
	}

	function del(_, cookie, url, statusCode) {
		var response = ez.devices.http.client({
			method: "delete",
			url: baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
			headers: {
				cookie: cookie
			}
		}).end().response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		return JSON.parse(response.readAll(_));
	}



	it('init database', function(_) {
		var server = new mongodb.Server(endPoint.datasets["mongodb_admin_test"].hostname, endPoint.datasets["mongodb_admin_test"].port, {});
		var db = adminTestFixtures.newMongoDb(config.collaboration.dataset, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		//
		ok(true, "mongodb initialized");

	});

	//start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	function _addGroupToUser(_, userUuid, cookie, groupUuid, index) {
		// Fetch user WC
		var body = post(_, cookie, "users('" + userUuid + "')/$workingCopies?trackingId=" + uuid.generate(), {});

		console.log('body ' + JSON.stringify(body, null, 2));
		// add the group to the group list
		tracer && tracer("add group to user start");
		body = put(_, cookie, body.$url, {
			$key: userUuid,
			$etag: body.$etag,
			groups: [{
				$uuid: groupUuid,
				$index: index || 0
			}]
		});
		tracer && tracer("link user group body(1): " + sys.inspect(body, null, 4));
		body = put(_, cookie, body.$url, {
			$key: userUuid,
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		//		tracer && tracer("link user group body(2): "+sys.inspect(body,null,4));
	}

	it('initialize x3 application mock server', function(_) {
		//tracer && tracer("creating server");
		x3MockServer = x3Mock.create(_, x3port);
		ok(true, "server created");
	});

	it('initialization for x3 task test ', function(_) {
		var cookie = getCookie(_, 'admin', 'admin', 200);


		// create supdvlp solution
		// x3solution
		var app = adminHelper.getApplication(_, "x3", "erp");

		var body = post(_, cookie, "x3solutions", {
			code: "X3 stub server",
			description: "X3 stub server",
			solutionName: "LOCALSUPV6",
			serverHost: "localhost",
			serverPort: x3port,
			proxy: false,
			application: {
				$uuid: app.$uuid
			},
			serverTimeout: 60000,
			runtimes: [{
				$creUser: "admin",
				$etag: 1,
				$index: 0,
				$key: "d024a6f4-6a23-4b34-8298-858a8117fddb",
				$parent_uuid: "4ac9401e-9589-43b6-b3e0-e8c6728b28b7",
				$properties: {},
				$updUser: "admin",
				$uuid: "d024a6f4-6a23-4b34-8298-858a8117fddb",
				$value: "localhost:" + x3port,
				autoConfig: true,
				banTimeout: 60,
				banned: false,
				description: "localhost:" + x3port,
				disabled: false,
				errorTry: 0,
				exclusive: false,
				serverHost: "localhost",
				serverPort: x3port,
				tag: "MAIN"
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 201);

		var srvrId = body.$uuid;
		var body = post(_, cookie, "endPoints/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			description: "X3 ERP endpoint"
		}, 200);
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			applicationRef: {
				$uuid: app.$uuid
			}
		}, 200);
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			dataset: "superv"
		}, 200);
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			x3solution: {
				$uuid: srvrId
			},
			x3ServerFolder: "superv"
		}, 200);
		ok(!hasErrors(body), "No errors ok");
		// should be able to save now
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);

		// create user AP
		var user = {
			login: "AP",
			firstName: "Obi Wan",
			lastName: "Kenobi",
			password: _encodePass("AP", "AP")
		};
		var body = post(_, cookie, "users/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var data = helpers.object.clone(user);
		user.$uuid = body.$uuid;
		data.$key = user.$uuid;
		data.$etag = body.$etag;
		data.$actions = {
			$save: {
				$isRequested: true
			}
		};
		tracer && tracer("create user =======================");
		body = put(_, cookie, body.$url, data);
		tracer && tracer("create user body: " + sys.inspect(body, null, 4));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create user: " + user.login + " ok");
		// get admin group
		var dbAdmin = adminHelper.getCollaborationOrm(_);
		var adminGroup = dbAdmin.fetchInstance(_, dbAdmin.model.getEntity(_, "group"), {
			jsonWhere: {
				description: "Super administrators"
			}
		});
		var user = dbAdmin.fetchInstance(_, dbAdmin.model.getEntity(_, "user"), {
			jsonWhere: {
				login: "AP"
			}
		});
		_addGroupToUser(_, user.$uuid, cookie, adminGroup.$uuid, 0);
	});

	it('Test x3 task behavior ', function(_) {


		var cookie = getCookie(_, 'AP', 'AP', 200);

		// get the working copy of x3 task
		var resp = get(_, cookie, "x3Tasks/$template/$workingCopies?representation=x3Task.$edit&$method=POST", 201, "$edit");

		var url = resp.$url;
		/*{
        "$etag":2,
        "$uuid":"9ef67c33-ec1e-4be4-b945-7994322d7b10",
        "endpoint":{"$uuid":"a879499c-593f-4e0c-be53-30a53285da80"},
        "$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('7df19c9c-8c0e-4d73-9bda-67a5fb423602')?representation=x3Task.$edit&count=50"
      }
     */
		var endpoint = adminHelper.getEndpoint(_, {
			dataset: "SUPERV"
		});
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			endpoint: {
				$uuid: endpoint.$uuid
			},
			$url: url
		}, 200, "$edit");

		/*
     {
        "$etag":1,
        "$uuid":"9ef67c33-ec1e-4be4-b945-7994322d7b10",
        "className":"AQTCRUD",
        "$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('7df19c9c-8c0e-4d73-9bda-67a5fb423602')?representation=x3Task.$edit&count=50"
     }
     */
		// set bad className
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			className: "tt",
			$url: url
		}, 200, "$edit");
		ok(!onlyInfo(resp.body.$diagnoses), "bad className tt not valid ");


		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			className: "AQTCRUD",
			$url: url
		}, 200, "$edit");
		ok(onlyInfo(resp.body.$diagnoses), "good className ok");


		//lookup for action
		//x3ClassActions?representation=x3ClassAction.$lookup&role=846a6754-97c1-4f5c-996e-da4a285d1df5&trackingId=d120eedc-f365-4d90-8976-4786d9b4f435&binding=actionName&class=AQTCRUD&rep=x3Task.$edit&facet=$edit&ep=a879499c-593f-4e0c-be53-30a53285da80&count=50
		var respAction = get(_, cookie, "x3ClassActions?representation=x3ClassAction.$lookup&trackingId=d120eedc-f365-4d90-8976-4786d9b4f435&binding=actionName&class=AQTCRUD&rep=x3Task.$edit&facet=$edit&ep=" + endpoint.$uuid + "&count=50", 200, "$edit");
		strictEqual(respAction.$resources && respAction.$resources.length, 6, "list of action for AQTCRUD OK");

		// set the last one to generate parameters
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			actionName: respAction.$resources[5],
			$url: url
		}, 200, "$edit");

		strictEqual(resp.body.parameters && resp.body.parameters.length, 4, "parameters added ok");

		// set the last one to generate parameters
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			actionName: respAction.$resources[1],
			$url: url
		}, 200, "$edit");

		strictEqual(resp.body.parameters && resp.body.parameters.length, 0, "change action with no parameter ok");

		// change endpoint
		var adminEndpoint = adminHelper.getEndpoint(_, {
			dataset: "syracuse"
		});
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			endpoint: {
				$uuid: adminEndpoint && adminEndpoint.$uuid
			},
			$url: url
		}, 200, "$edit");

		strictEqual(resp.body.parameters && resp.body.parameters.length, 0, "reset parameter ok");
		strictEqual(!resp.body.className, true, "reset className ok");


	});

	it('Test x3 task call ', function(_) {

		var cookie = getCookie(_, 'AP', 'AP', 200);

		// get the working copy of x3 task
		var resp = get(_, cookie, "x3Tasks/$template/$workingCopies?representation=x3Task.$edit&$method=POST", 201, "$edit");

		var url = resp.$url;
		/*{
     "$etag":2,
     "$uuid":"9ef67c33-ec1e-4be4-b945-7994322d7b10",
     "endpoint":{"$uuid":"a879499c-593f-4e0c-be53-30a53285da80"},
     "$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('7df19c9c-8c0e-4d73-9bda-67a5fb423602')?representation=x3Task.$edit&count=50"
     }
     */
		var endpoint = adminHelper.getEndpoint(_, {
			dataset: "SUPERV"
		});
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			endpoint: {
				$uuid: endpoint.$uuid
			},
			$url: url
		}, 200, "$edit");

		/*
     {
     "$etag":1,
     "$uuid":"9ef67c33-ec1e-4be4-b945-7994322d7b10",
     "className":"AQTCRUD",
     "$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('7df19c9c-8c0e-4d73-9bda-67a5fb423602')?representation=x3Task.$edit&count=50"
     }
     */


		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			className: "AQTCRUD",
			$url: url
		}, 200, "$edit");
		ok(onlyInfo(resp.body.$diagnoses), "good className ok");


		//lookup for action
		//x3ClassActions?representation=x3ClassAction.$lookup&role=846a6754-97c1-4f5c-996e-da4a285d1df5&trackingId=d120eedc-f365-4d90-8976-4786d9b4f435&binding=actionName&class=AQTCRUD&rep=x3Task.$edit&facet=$edit&ep=a879499c-593f-4e0c-be53-30a53285da80&count=50
		var respAction = get(_, cookie, "x3ClassActions?representation=x3ClassAction.$lookup&trackingId=d120eedc-f365-4d90-8976-4786d9b4f435&binding=actionName&class=AQTCRUD&rep=x3Task.$edit&facet=$edit&ep=" + endpoint.$uuid + "&count=50", 200, "$edit");
		strictEqual(respAction.$resources && respAction.$resources.length, 6, "list of action for AQTCRUD OK");

		// set the last one to generate parameters
		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			actionName: respAction.$resources[5],
			$url: url
		}, 200, "$edit");

		strictEqual(resp.body.parameters && resp.body.parameters.length, 4, "parameters added ok");

		// run action

		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			$actions: {
				run: {
					$isRequested: true,
					$parameters: {}
				}
			},
			$url: url
		}, 200, "$edit");
		strictEqual(resp.body.$diagnoses && resp.body.$diagnoses.length, 1, "diagnoses info ok");
		strictEqual(resp.body.$diagnoses[0].$severity, "info", "severity ok");
		strictEqual(resp.body.$diagnoses[0].$message, "=>>param1 Decimal=0 param2 Date=000000 Param3 alphanum= Param4 entier=0", "message  ok");

		// change action

		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			actionName: respAction.$resources[4],
			$url: url
		}, 200, "$edit");

		resp = put(_, cookie, url, {
			$uuid: resp.$uuid,
			$etag: resp.$etag,
			$actions: {
				run: {
					$isRequested: true,
					$parameters: {}
				}
			},
			$url: url
		}, 200, "$edit");
		strictEqual(resp.body.$diagnoses && resp.body.$diagnoses.length, 1, "diagnoses info ok");
		strictEqual(resp.body.$diagnoses[0].$severity, "info", "severity ok");
		strictEqual(resp.body.$diagnoses[0].$message, "=>>My AQTCRUD AddT DCB1+TDCB2=TDCB=0", "message  ok");

	});

	it('cleanup', function() {
		if (x3MockServer) {
			x3MockServer.close();
		}
	});
});