"use strict";

var config = require('config'); // must be first syracuse require
var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var helpers = require('@sage/syracuse-core').helpers;
var types = require('@sage/syracuse-core').types;
var mongodb = require('mongodb');
var ez = require('ez-streams');
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var sys = require("util");
var dataModel = require('../../../../src/orm/dataModel');
var forEachKey = helpers.object.forEachKey;
var sdataRegistry = require('syracuse-sdata/lib/sdataRegistry');
var patchtools = require('syracuse-patch/lib/patchtools');
var jsurl = require("jsurl");

var tracer; // = console.log;

// force basic auth
config.session = config.session || {};
config.session.auth = "basic";
// no integration server
config.integrationServer = null;

var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var testData = require('../fixtures/testDB');
var testEndPoint = testData.endpoint;

testEndPoint.datasets = {
	test: {
		driver: "mongodb",
		database: "test",
		hostname: "localhost",
		port: config.collaboration.port || 27017
	}
};

// tracer && tracer("TEST ANFANG......................................");

config.sdata.endpoints.push(testEndPoint);

var requestCount = 0;
var MAX_REQUESTS = 13;
var cookie;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('init database', function(_) {
		var server = new mongodb.Server(testEndPoint.datasets.test.hostname,
			testEndPoint.datasets.test.port, {});
		var db = testAdmin.newMongoDb(testEndPoint.datasets.test.database,
			server, {});
		db = db.open(_);
		db.dropDatabase(_);
		// tracer && tracer("dropping admin db");
		var server = new mongodb.Server(testEndPoint.datasets.test.hostname,
			testEndPoint.datasets.test.port, {});
		var db = testAdmin.newMongoDb("mongodb_admin_test", server, {});
		db = db.open(_);
		db.dropDatabase(_);
		ok(true, "mongodb initialized");

	});

	// start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	function getCookie(_, login, pass) {
		var response = new ez.devices.http.client({
			url: baseUrl + "/syracuse-main/html/main.html",
			user: login || "admin",
			password: pass || "admin"
		}).end().response(_);
		response.readAll(_);
		strictEqual(response.statusCode, 200, "user authenticated");
		return response.headers["set-cookie"];
	}

	function post(_, cookie, url, data, statusCode, adminUrl) {
		var response = ez.devices.http.client({
			method: "post",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: {
				"content-type": "application/json",
				cookie: cookie
			}
		}).end(JSON.stringify(data)).response(_);
		strictEqual(response.statusCode, statusCode || 201, "status verified");
		var answer = response.readAll(_);
		return JSON.parse(answer);
	}

	function postasync(_, cookie, url, data, statusCode, notDelete) {
		var response = ez.devices.http.client({
			method: "post",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: {
				"content-type": "application/json",
				cookie: cookie
			}
		}).end(JSON.stringify(data)).response(_);
		strictEqual(response.statusCode, 202, "accepted status");
		var location = response.headers.location;
		strictEqual(!!location, true, "Location available");
		var body = undefined;
		while (!body) {
			// tracer && tracer("Vor timeout get2");
			setTimeout(_, 500);
			// tracer && tracer("Vor get2 " + location + " " + statusCode);
			body = get2(_, cookie, baseUrl + location, undefined, statusCode);
			// tracer && tracer("BODYx " + sys.format(body) + " ");
		}
		if (notDelete) {
			notDelete.location = location;
		} else {
			del(_, cookie, baseUrl + location, 204);
		}
		return body;
	}

	function put(_, cookie, url, data, statusCode) {
		var response = ez.devices.http.client({
			method: "put",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: {
				"content-type": "application/json",
				cookie: cookie
			}
		}).end(JSON.stringify(data)).response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		return JSON.parse(response.readAll(_));
	}

	function get(_, cookie, url, statusCode, headers) {
		var head = {
			cookie: cookie,
			"accept": "application/json"
		};
		headers && forEachKey(headers, function(key, value) {
			head[key] = value;
		});
		var response = ez.devices.http.client({
			method: "get",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: head
		}).end().response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		var resp = response.readAll(_);
		try {
			return JSON.parse(resp);
		} catch (ex) {
			return resp;
		}
	}

	function get2(_, cookie, url, headers, statusCode) {
		var head = {
			cookie: cookie
		};
		headers && forEachKey(headers, function(key, value) {
			head[key] = value;
		});
		var response = ez.devices.http.client({
			method: "get",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: head
		}).end().response(_);
		if (response.statusCode !== 202) {
			// tracer && tracer("RESPPPP " + response.statusCode);
			statusCode = statusCode || 200;
			strictEqual(response.statusCode, statusCode, "status code verified: " + statusCode);
			var resp = response.readAll(_);
			try {
				return JSON.parse(resp);
			} catch (ex) {
				return resp;
			}
		} else {
			return null;
		}
	}

	function del(_, cookie, url, statusCode) {
		var response = ez.devices.http.client({
			method: "delete",
			url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/qunit/sdataTest/test/" + url,
			headers: {
				cookie: cookie
			}
		}).end().response(_);
		strictEqual(response.statusCode, statusCode || 200, "status verified");
		return JSON.parse(response.readAll(_));
	}
	/*
	 * it('environnement init', function(_) { requestCount++; cookie =
	 * getCookie(_); // var body = post(_, cookie, "applications", { application:
	 * "qunit", contract: "sdataTest", protocol: "syracuse" }, 201); var appId =
	 * body.$uuid; // tracer && tracer("environnement init body(1): "+sys.inspect(body,
	 * null, 4)); // // start(); });
	 */

	/*
	it('environnement init', function(_) {
		requestCount++;
		cookie = getCookie(_);
		//
		var body = post(_, cookie, "applications", {
			application: "qunit",
			contract: "sdataTest",
			protocol: "syracuse"
		}, 201);
		var appId = body.$uuid;
		// tracer && tracer("environnement init body(1): "+sys.inspect(body, null, 4));
		//
		//
	});
	*/

	it('Sync protocol', function(_) {
		var endpoint2 = "http://www.example.com/sdata/syracuse/collaboration/syracuse/users";
		requestCount++;
		cookie = getCookie(_);
		// obtain existing digest
		// tracer && tracer("xVORHER");
		var body = get(_, cookie, "syncEntitySyncs/$syncDigest");
		// tracer && tracer("xNACHHER " + sys.format(body));
		strictEqual(body.$resources.length, 1, "Correct number of resources in digest");
		strictEqual(body.$resources[0].$tick, 2, "Correct tick");
		strictEqual(body.$resources[0].$conflictPriority, 5, "Correct conflict priority");
		// digest for an entitiy without synchronization
		body = get(_, cookie, "pageds/$syncDigest", 400);
		// tracer && tracer("DRITTENS");
		// create a new instance
		body = post(_, cookie, "syncEntitySyncs", {
			name: "n1"
		});
		// tracer && tracer("VIERTENS " + sys.format(body));
		var key1 = body.$key;
		var uuid1 = body.$uuid;
		// tracer && tracer("uuid1 " + uuid1);
		var body = get(_, cookie, "syncEntitySyncs/$syncDigest");
		strictEqual(body.$resources.length, 1, "Correct number of resources in digest");
		strictEqual(body.$resources[0].$tick, 3, "Correct tick");
		var retInfo = {};
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		});

		// test contents of body
		// Body:

		//'$syncMode': 'catchUp',
		//	  '$digest': 
		//{ '$origin': 'http://VIL-003603-NB:8124/sdata/qunit/sdataTest/test/syncEntitySyncs',
		//	     '$resources': [ [Object] ] },
		//'$resources': 
		//[ { '$uuid': 'e72fa889-4f68-4f8d-8d81-519a76ef3ffd',
		//'$key': '682c519d-7205-46b8-a432-b11d88b537ce',
		//'$url': '/sdata/qunit/sdataTest/test/syncEntitySyncs(\'682c519d-7205-46b8-a432-b11d88b537ce\')',
		//'$etag': 1,
		//'$creUser': 'guest',
		//'$creDate': '2013-12-10T09:52:19.543Z',
		//'$updUser': 'guest',
		//'$updDate': '2013-12-10T09:52:19.543Z',
		//'$properties': {},
		//'$tick': 2,
		//'$endpoint': 'http://VIL-003603-NB:8124/sdata/qunit/sdataTest/test/syncEntitySyncs',
		//'$stamp': '2013-12-10T09:52:19.543Z',
		//name: 'n1' } ] }
		//
		strictEqual(body.$syncMode, "catchUp", "Sync source request (1 undeleted row, foreign endpoint) - Sync mode");
		var endpoint = body.$digest.$origin;
		strictEqual(body.$digest.$resources.length, 1, "Number of endpoints");
		strictEqual(endpoint, body.$digest.$resources[0].$endpoint, "Endpoint name");
		strictEqual(body.$digest.$resources[0].$tick, 3, "Endpoint tick");
		strictEqual(body.$resources.length, 1, "Number of resources");
		strictEqual(body.$resources[0].$endpoint, body.$digest.$origin, "Endpoint in digest and row");
		strictEqual(body.$resources[0].$tick, 2, "Tick in row");
		strictEqual(body.$resources[0].name, "n1", "Name of key");
		strictEqual(body.$resources[0].$updDate, body.$resources[0].$stamp, "Timestamp");
		strictEqual(body.$resources[0].$isDeleted, undefined, "not deleted");
		var urlpart = body.$resources[0].$url.substr(0, body.$resources[0].$url.indexOf("("));
		// tracer && tracer("URLPART " + urlpart);
		strictEqual(endpoint.indexOf(urlpart), endpoint.indexOf("/sdata"), "URL fits to endpoint");

		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}, {
				$endpoint: endpoint,
				$tick: 2,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		}, 200);
		strictEqual(body.$digest.$resources[0].$tick, 3, "Sync source request (1 undeleted row, own endpoint) - Endpoint tick");
		strictEqual(body.$resources.length, 1, "Number of resources");
		strictEqual(body.$resources[0].$endpoint, body.$digest.$origin, "Endpoint in digest and row");
		strictEqual(body.$resources[0].$tick, 2, "Tick in row");
		strictEqual(body.$resources[0].name, "n1", "Name of key");
		strictEqual(body.$resources[0].$updDate, body.$resources[0].$stamp, "Timestamp");
		strictEqual(body.$resources[0].$isDeleted, undefined, "not deleted");
		// up to date sync
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}, {
				$endpoint: endpoint,
				$tick: 3,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		});
		strictEqual(body.$resources.length, 0, "Sync source request (1 undeleted row, own endpoint, up to date) - Number of resources");
		// delete instance
		del(_, cookie, "syncEntitySyncs('" + key1 + "')");
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}, {
				$endpoint: endpoint,
				$tick: 3,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		}, 200);
		// tracer && tracer("POST-RE5S " + sys.format(body));
		strictEqual(body.$digest.$resources.length, 1, "Sync source request (1 deleted row, own endpoint) - Number of endpoints");
		strictEqual(endpoint, body.$digest.$resources[0].$endpoint, "Endpoint name");
		strictEqual(body.$digest.$resources[0].$tick, 4, "Endpoint tick");
		strictEqual(body.$resources.length, 1, "Number of resources");
		strictEqual(body.$resources[0].$endpoint, body.$digest.$origin, "Endpoint in digest and row");
		strictEqual(body.$resources[0].$tick, 3, "Tick in row");
		strictEqual(body.$resources[0].name, undefined, "Name of key");
		strictEqual(body.$resources[0].$isDeleted, true, "deleted");

		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		}, 200);
		strictEqual(body.$syncMode, "catchUp", "correct sync mode");
		strictEqual(body.$digest.$resources.length, 1, "Sync source request (1 deleted row, foreign endpoint) - Number of endpoints");
		strictEqual(endpoint, body.$digest.$resources[0].$endpoint, "Endpoint name");
		strictEqual(body.$digest.$resources[0].$tick, 4, "Endpoint tick");
		strictEqual(body.$resources.length, 1, "Number of resources");
		strictEqual(body.$resources[0].$endpoint, body.$digest.$origin, "Endpoint in digest and row");
		strictEqual(body.$resources[0].$tick, 3, "Tick in row");
		strictEqual(body.$resources[0].name, undefined, "Name of key");
		strictEqual(body.$resources[0].$isDeleted, true, "deleted");
		// create some more rows
		body = post(_, cookie, "syncEntitySyncs", {
			name: "n2"
		});
		// tick: 4
		var uuid2 = body.$uuid;
		// tracer && tracer("uuid2 " + uuid2);
		body = post(_, cookie, "syncEntitySyncs", {
			name: "n3"
		});
		// tick: 5
		var uuid3 = body.$uuid;
		// tracer && tracer("uuid3 " + uuid3);
		body = post(_, cookie, "syncEntitySyncs", {
			name: "n4"
		});
		// tick: 6
		var uuid4 = body.$uuid;
		// tracer && tracer("uuid4 " + uuid4);
		body = post(_, cookie, "syncEntitySyncs", {
			name: "n5"
		});
		// tick: 7
		var uuid5 = body.$uuid;
		// tracer && tracer("uuid5 " + uuid5);
		// uuid for a new instance
		var uuid6 = uuid5 + "a";
		// tracer && tracer("uuid6 " + uuid6);
		var date6 = new Date();
		// Tick in the endpoint digest must now be 8
		var body = get(_, cookie, "syncEntitySyncs/$syncDigest");
		strictEqual(body.$resources.length, 1, "Correct number of resources in digest");
		strictEqual(body.$resources[0].$tick, 8, "Correct tick");
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		});
		// tracer && tracer("UIOP " + sys.format(body));
		// wait for 50ms in order to have different times
		setTimeout(_, 50);
		// put changes	
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "catchUp",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 7
				}, {
					$endpoint: endpoint,
					$tick: 6,
					$stamp: new Date(),
					$conflictPriority: 5
				}]
			},
			$resources: [{ // newly created instance
				$uuid: uuid6,
				name: "n6",
				$endpoint: endpoint2,
				$tick: 3,
				$stamp: date6
			}, { // changed instance - no conflict (rule 2)
				$uuid: uuid3,
				name: "n31", // new name
				$endpoint: endpoint2,
				$tick: 4,
				$stamp: date6
			}, { // unchanged instance - with conflict
				$uuid: uuid4,
				name: "n41", // new name
				$endpoint: endpoint,
				$tick: 2,
				$stamp: date6
			}, { // deleted instance - no conflict (rule 2)
				$uuid: uuid2,
				$isDeleted: true,
				$endpoint: endpoint2,
				$tick: 5,
				$stamp: date6
			}]
		});
		strictEqual(body.$resources.length, 4, "Correct number of resources");
		strictEqual(body.$resources[0].$uuid, uuid6, "occurrence 1: Correct uuid");
		strictEqual(body.$resources[0].$httpMethod, "POST", "Correct method");
		strictEqual(body.$resources[0].$httpStatus, 200, "Correct status");
		strictEqual(body.$resources[0].name, "n6", "Correct name");
		strictEqual(body.$resources[1].$uuid, uuid3, "occurrence 2: Correct uuid");
		strictEqual(body.$resources[1].$httpMethod, "PUT", "Correct method");
		strictEqual(body.$resources[1].name, "n31", "Correct name");
		strictEqual(body.$resources[1].$httpStatus, 200, "Correct status");
		strictEqual(body.$resources[2].$uuid, uuid4, "occurrence 3: Correct uuid");
		strictEqual(body.$resources[2].$httpMethod, "GET", "Correct method");
		strictEqual(body.$resources[2].name, "n4", "Correct name");
		strictEqual(body.$resources[2].$httpStatus, 200, "Correct status");
		strictEqual(body.$resources[3].$uuid, uuid2, "occurrence 4: Correct uuid");
		strictEqual(body.$resources[3].$httpMethod, "DELETE", "Correct method");
		strictEqual(body.$resources[3].name, undefined, "Correct name");
		strictEqual(body.$resources[3].$httpStatus, 200, "Correct status");
		var body = get(_, cookie, "syncEntitySyncs/$syncDigest");
		strictEqual(body.$resources.length, 2, "Correct number of resources in digest");
		strictEqual(body.$resources[0].$tick, 8, "Correct tick of local endpoint");
		strictEqual(body.$resources[0].$endpoint, endpoint, "Correct endpoint");
		strictEqual(body.$resources[1].$tick, 6, "Correct tick of other endpoint");
		strictEqual(body.$resources[1].$endpoint, endpoint2, "Correct endpoint");
		// get details of data rows
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 1,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		}, 200);
		strictEqual(body.$resources.length, 4, "Number of resources");
		strictEqual(body.$resources[0].$uuid, uuid6, "resource 1 (new): Correct uuid");
		strictEqual(body.$resources[0].name, "n6", "correct name");
		strictEqual(body.$resources[0].$endpoint, endpoint2, "correct endpoint");
		strictEqual(body.$resources[0].$tick, 3, "correct tick");
		strictEqual(body.$resources[0].$stamp, date6.toISOString(), "correct timestamp");
		strictEqual(body.$resources[1].$uuid, uuid3, "resource 3 (changed): Correct uuid");
		strictEqual(body.$resources[1].name, "n31", "correct name");
		strictEqual(body.$resources[1].$endpoint, endpoint2, "correct endpoint");
		strictEqual(body.$resources[1].$tick, 4, "correct tick");
		strictEqual(body.$resources[2].$uuid, uuid4, "resource 4 (unchanged): Correct uuid");
		strictEqual(body.$resources[2].name, "n4", "correct name");
		strictEqual(body.$resources[2].$endpoint, endpoint, "correct endpoint");
		var date_n4 = body.$resources[2].$stamp;
		strictEqual(body.$resources[2].$tick, 6, "correct tick");
		strictEqual(body.$resources[3].$uuid, uuid5, "resource 5 (unchanged): Correct uuid");
		strictEqual(body.$resources[3].name, "n5", "correct name");
		strictEqual(body.$resources[3].$endpoint, endpoint, "correct endpoint");
		strictEqual(body.$resources[3].$tick, 7, "correct tick");
		var date_n5 = body.$resources[3].$stamp;
		// conflict handling
		// tracer && tracer("ZEITEN " + date_n4 + " " + (Date.parse(date_n4)) + " ");
		var date_n41 = new Date(Date.parse(date_n4) - 1000);
		var date_n51 = new Date(Date.parse(date_n5) + 1000);
		// put changes	
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "catchUp",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5 // same conflict priority
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}]
			},
			$resources: [{ // conflict: earlier timestamp
				$uuid: uuid4,
				name: "n4.2",
				$endpoint: endpoint2,
				$tick: 13,
				$stamp: date_n41
			}, { // conflict: later timestamp
				$uuid: uuid5,
				name: "n5.2", // new name
				$endpoint: endpoint2,
				$tick: 14,
				$stamp: date_n51
			}]
		});
		strictEqual(body.$resources[0].$httpMethod, "GET", "Timestamp comparison (conflict): earlier time");
		strictEqual(body.$resources[0].name, "n4", "no change");
		strictEqual(body.$resources[1].$httpMethod, "PUT", "Timestamp comparison (conflict): later time");
		strictEqual(body.$resources[1].name, "n5.2", "changed");
		var body = get(_, cookie, "syncEntitySyncs/$syncDigest");
		var ticks = {};
		body.$resources.forEach(function(part) {
			ticks[part.$endpoint] = part.$tick;
		});
		strictEqual(ticks[endpoint], 8, "Correct digest tick after syncTarget (endpoint 1)");
		strictEqual(ticks[endpoint2], 20, "Correct digest tick after syncTarget (endpoint 2)");
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "catchUp",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5 // same conflict priority
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}]
			},
			$resources: [{ // conflict: same timestamp
				$uuid: uuid4,
				name: "n4.3",
				$endpoint: endpoint2,
				$tick: 13,
				$stamp: date_n4
			}, { // no conflict, same tick: should not take it
				$uuid: uuid5,
				name: "n4.9",
				$endpoint: endpoint2,
				$tick: 14,
				$stamp: new Date()
			}]
		});
		strictEqual(body.$resources[0].$httpMethod, (endpoint < endpoint2) ? "GET" : "PUT", "Conflict: same timestamp");
		strictEqual(body.$resources[0].$httpStatus, 200, "correct status");
		strictEqual(body.$resources[1].$httpMethod, "GET", "no conflict, same endpoint, same stamp");
		strictEqual(body.$resources[1].$httpStatus, 200, "correct status");
		strictEqual(body.$resources[1].name, "n5.2", "correct name");
		// test with 3 endpoints
		var endpoint3 = "xyz";
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "catchUp",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5 // same conflict priority
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint3,
					$tick: 7,
					$stamp: new Date(),
					$conflictPriority: 3
				}]
			},
			$resources: [{ // no conflict: delete row
				$uuid: uuid5,
				$isDeleted: true,
				$endpoint: endpoint2,
				$tick: 15,
				$stamp: date_n4
			}]
		});
		strictEqual(body.$resources[0].$httpMethod, "DELETE", "deleted row with 3 endpoints");
		strictEqual(body.$resources[0].$httpStatus, 200, "correct status");
		strictEqual(body.$resources[0].$uuid, uuid5, "correct uuid");
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint3,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 15, // include resource with tick 15
				$stamp: new Date(),
				$conflictPriority: 2
			}, {
				$endpoint: endpoint3,
				$tick: 7,
				$stamp: new Date(),
				$conflictPriority: 3
			}, {
				$endpoint: endpoint,
				$tick: 7, // exclude resource with tick 6
				$stamp: new Date(),
				$conflictPriority: 4
			}]
		}, 200);
		strictEqual(body.$resources.length, 1, "One deleted resource");
		strictEqual(body.$resources[0].$uuid, uuid5, "correct uuid");
		strictEqual(body.$resources[0].$isDeleted, true, "deleted");
		strictEqual(body.$resources[0].$stamp, date_n4, "timestamp");
		// immediate mode: test for contiguous ticks
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "immediate",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint3,
					$tick: 9,
					$stamp: new Date(),
					$conflictPriority: 1
				}]
			},
			$resources: [{ // conflict: undelete resource
				$uuid: uuid5,
				$endpoint: endpoint3,
				$tick: 7,
				$stamp: date_n4,
				name: "n5.55"
			}]
		}, 200);
		strictEqual(body.$resources[0].$httpMethod, "POST", "re-create deleted instance in immediate mode: POST");
		strictEqual(body.$resources[0].$httpStatus, 200, "status");
		strictEqual(body.$resources[0].name, "n5.55", "correct name");
		strictEqual(body.$resources[0].$uuid, uuid5, "correct uuid");
		// tracer && tracer("ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "immediate",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint3,
					$tick: 9,
					$stamp: new Date(),
					$conflictPriority: 1
				}]
			},
			$resources: [{ // now wrong tick!
				$uuid: uuid5,
				$endpoint: endpoint3,
				$tick: 7,
				$stamp: date_n4,
				name: "n5.56"
			}]
		}, 400);
		// duplicate key
		var uuid7 = helpers.uuid.generate();
		body = postasync(_, cookie, "syncEntitySyncs/$syncTarget?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$syncMode: "catchUp",
			$digest: {
				$origin: endpoint2,
				$resources: [{
					$endpoint: endpoint2,
					$tick: 20,
					$stamp: new Date(),
					$conflictPriority: 5 // same conflict priority
				}, {
					$endpoint: endpoint,
					$tick: 2,
					$stamp: new Date(),
					$conflictPriority: 5
				}, {
					$endpoint: endpoint3,
					$tick: 7,
					$stamp: new Date(),
					$conflictPriority: 3
				}]
			},
			$resources: [{ // no conflict: delete row
				$uuid: uuid7,
				$endpoint: endpoint2,
				$tick: 16,
				$stamp: date_n4,
				name: "n5.55"
			}]
		});
	});

	it('Sync protocol paging', function(_) {
		requestCount++;
		var cookie = getCookie(_);
		var endpoint2 = "http://www.example.com/sdata/syracuse/collaboration/syracuse/users";
		// feed
		for (var ii = 0; ii <= 20; ii++) {
			var body = post(_, cookie, "syncEntitySyncs", {
				name: "n" + (100 + ii)
			});
		}
		var loc = {};
		body = postasync(_, cookie, "syncEntitySyncs/$syncSource?trackingID=abc6&runName=x&runStamp=2013-12-06T13:05:30", {
			$origin: endpoint2,
			$resources: [{
				$endpoint: endpoint2,
				$tick: 1,
				$stamp: new Date(),
				$conflictPriority: 2
			}],
		}, 200, loc);
		strictEqual(body.$resources.length, 20, "20 resources");
		strictEqual(!!(body.$links.$next), true, "link to next page available");
		body = get(_, cookie, baseUrl + body.$links.$next.$url, 200);
		strictEqual(body.$resources.length < 20, true, "Some resources");
		strictEqual(!!(body.$links.$first), true, "link to next page available");
		body = get(_, cookie, baseUrl + body.$links.$first.$url, 200);
		strictEqual(body.$resources.length, 20, "20 resources");
		strictEqual(!!(body.$links.$next), true, "link to next page available");

		if (loc.location) {
			del(_, cookie, baseUrl + loc.location, 204);
		}
	});

	var s1uuid;
	it('various strings', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "strings", {
			string: "01234567890123456789",
			stringTiny: "01234567890123456789",
			stringNormal: "01234567890123456789",
			string10: "0123456789",
			string100: "01234567890123456789",
			string1000: "01234567890123456789",
			stringNullable1: "01234567890123456789",
			stringNullable2: null
		});
		s1uuid = body.$uuid;
		//	tracer && tracer("various strings (177) body: "+sys.inspect(body, null, 4));
		strictEqual(body.string, "01234567890123456789", "string roundtrip");
		strictEqual(body.stringTiny, "01234567890123456789", "string roundtrip");
		strictEqual(body.stringNormal, "01234567890123456789", "string roundtrip");
		strictEqual(body.string10, "0123456789", "string10 roundtrip");
		strictEqual(body.string100, "01234567890123456789", "string100 roundtrip");
		strictEqual(body.string1000, "01234567890123456789", "string1000 roundtrip");
		strictEqual(body.stringNullable1, "01234567890123456789", "stringNullable roundtrip");
		strictEqual(body.stringNullable2, null, "stringNullable  null roundtrip");
		strictEqual(body.stringDef1, "", "string default empty roundtrip");
		strictEqual(body.stringDef2, "a'b", "string default non empty roundtrip");
		strictEqual(body.stringDefNull, null, "string default null roundtrip");
		var uuid = body.$uuid;
		var body = get(_, cookie, "strings('" + uuid + "')");
		strictEqual(body.string, "01234567890123456789", "string roundtrip");
		strictEqual(body.stringTiny, "01234567890123456789", "string roundtrip");
		strictEqual(body.stringNormal, "01234567890123456789", "string roundtrip");
		strictEqual(body.string10, "0123456789", "string10 roundtrip");
		strictEqual(body.string100, "01234567890123456789", "string100 roundtrip");
		strictEqual(body.string1000, "01234567890123456789", "string1000 roundtrip");
		strictEqual(body.stringNullable1, "01234567890123456789", "stringNullable roundtrip");
		strictEqual(body.stringNullable2, null, "stringNullable  null roundtrip");
		strictEqual(body.stringDef1, "", "string default empty roundtrip");
		strictEqual(body.stringDef2, "a'b", "string default non empty roundtrip");
		strictEqual(body.stringDefNull, null, "string default null roundtrip");
	});

	it('Batch Link protocol', function(_) {
		requestCount++;
		cookie = getCookie(_);
		// create 2 instances
		var body = post(_, cookie, "pageds", {
			name: "n1"
		});
		var key1 = body.$key;
		var url1 = body.$url;
		var url1Short = body.$url.substr(body.$url.indexOf("/sdata/")) // reduce;
			// to
			// path
		var body = post(_, cookie, "pageds", {
			name: "n2"
		});
		var key2 = body.$key;
		var url2 = body.$url;
		var url2Short = body.$url.substr(body.$url.indexOf("/sdata/")) // reduce;
			// to
			// path

		body = get(_, cookie, url1, 200);
		try {
			// assign global UUID to first entry
			var uuid1 = helpers.uuid.generate();

			// batch request
			var req = {
				$resources: [{
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')",
					$httpMethod: "GET",
					$uuid: uuid1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked",
					$httpMethod: "POST",
					$uuid: uuid1,
					$url: url1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')",
					$httpMethod: "GET",
					$uuid: uuid1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')?select=",
					$httpMethod: "GET",
					$uuid: uuid1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked",
					$httpMethod: "POST",
					$uuid: uuid1,
					$url: url1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked",
					$httpMethod: "POST",
					$uuid: uuid1 + "a",
					$url: url1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked",
					$httpMethod: "POST",
					$url: url2
				}]
			};

			var body = post(_, cookie, "pageds/$linked/$batch", req, 200);
			var resources = body.$resources;
			strictEqual(resources.length, 7, "Correct number of resources");
			// fetch by uuid
			strictEqual(resources[0].$httpStatus, 404,
				"non existent global UUID");
			strictEqual(resources[0].$httpMethod, "GET",
				"non existent global UUID");
			// put UUID to first instance
			strictEqual(resources[1].$key, key1, "correct key");
			strictEqual(resources[1].$uuid, uuid1, "correct global uuid");
			strictEqual(resources[1].$httpMethod, "POST", "correct method");
			strictEqual(resources[1].$httpStatus, 201, "correct status");
			// then select instance by global UUID
			strictEqual(resources[2].$key, key1,
				"get by global uuid: correct key after loading");
			strictEqual(resources[2].$url, url1Short,
				"correct url after loading");
			strictEqual(resources[2].$uuid, uuid1,
				"correct global uuid after loading");
			strictEqual(resources[2].name, "n1",
				"correct value after loading");
			strictEqual(resources[2].$httpMethod, "GET", "correct method");
			strictEqual(resources[2].$httpStatus, 200, "correct status");
			// select short version of instance with "select=" parameter
			// body = get(_, cookie, "pageds/$linked('"+uuid1+"')?select=",
			// 200);
			strictEqual(resources[3].$key, undefined,
				"get by global uuid with select: correct key after loading");
			strictEqual(resources[3].$uuid, uuid1,
				"correct global uuid after loading");
			strictEqual(resources[3].$url, url1Short,
				"correct url after loading");
			strictEqual(resources[3].name, undefined,
				"correct value after loading");
			strictEqual(resources[3].$httpMethod, "GET", "correct method");
			strictEqual(resources[3].$httpStatus, 200, "correct status");
			// assign same UUID to instance
			// body = post(_, cookie, "pageds/$linked", { $url: url1, $uuid:
			// uuid1}, 201);
			strictEqual(resources[4].$key, key1, "correct key");
			strictEqual(resources[4].$uuid, uuid1,
				"correct global uuid (2)");
			strictEqual(resources[4].$httpMethod, "POST", "correct method");
			strictEqual(resources[4].$httpStatus, 201, "correct status");
			// assign different UUID to instance
			// body = post(_, cookie, "pageds/$linked", { $url: url1, $uuid:
			// uuid1+"a"}, 400);
			strictEqual(resources[5].$httpMethod, "POST", "correct method");
			strictEqual(resources[5].$httpStatus, 400, "correct status");
			strictEqual(resources[5].$uuid, uuid1 + "a",
				"correct global uuid (3)");

			// assign global UUID to second instance, generated by receiver
			// body = post(_, cookie, "pageds/$linked", { $url: url2}, 201);
			var uuid2 = resources[6].$uuid;
			strictEqual(resources[6].$key, key2,
				"make global uuid of second instance: correct key of second instance");
			strictEqual(resources[6].$httpMethod, "POST", "correct method");
			strictEqual(resources[6].$httpStatus, 201, "correct status");

			var req = {
				$resources: [{
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid2 + "')",
					$httpMethod: "GET",
					$uuid: uuid2
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid2 + "')",
					$httpMethod: "DELETE",
					$uuid: uuid2,
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid2 + "')",
					$httpMethod: "DELETE",
					$uuid: uuid2,
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds",
					$httpMethod: "POST",
					$uuid: uuid1,
					$url: url2
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')",
					$httpMethod: "PUT",
					$uuid: uuid1,
					$url: url2
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')",
					$httpMethod: "GET",
					$uuid: uuid1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid2 + "')",
					$httpMethod: "PUT",
					$uuid: uuid2,
					$url: url2
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid1 + "')",
					$httpMethod: "PUT",
					$url: url1,
					$uuid: uuid1
				}, {
					$location: baseUrl + "/sdata/qunit/sdataTest/test/pageds/$linked('" + uuid2 + "')",
					$httpMethod: "GET",
					$uuid: uuid2
				}]
			};

			var body = post(_, cookie, "pageds/$linked/$batch", req, 200);
			var resources = body.$resources;
			strictEqual(resources.length, 9, "Correct number of resources");
			// body = get(_, cookie, "pageds/$linked('"+uuid2+"')", 200);
			strictEqual(resources[0].$key, key2,
				"fetch second instance: correct key after loading");
			strictEqual(resources[0].$uuid, uuid2,
				"correct global uuid after loading");
			strictEqual(resources[0].$httpMethod, "GET", "correct method");
			strictEqual(resources[0].$httpStatus, 200, "correct status");
			// del(_, cookie, "pageds/$linked('"+uuid2+"')", 200);
			strictEqual(resources[1].$uuid, uuid2,
				"delete instance: correct UUID");
			strictEqual(resources[1].$httpMethod, "DELETE",
				"correct method");
			strictEqual(resources[1].$httpStatus, 200, "correct status");
			// del(_, cookie, "pageds/$linked('"+uuid2+"')", 404);
			strictEqual(resources[2].$uuid, uuid2,
				"delete instance again: correct UUID");
			strictEqual(resources[2].$httpMethod, "DELETE",
				"correct method");
			strictEqual(resources[2].$httpStatus, 404, "correct status");

			// send a duplicate UUID
			// post(_, cookie, "pageds/$linked", { $url: url2, $uuid:
			// uuid1}, 400);
			strictEqual(resources[3].$uuid, uuid1,
				"correct global uuid (2)");
			strictEqual(resources[3].$httpMethod, "POST", "correct method");
			strictEqual(resources[3].$httpStatus, 400, "correct status");
			// assign uuid1 to second instance
			// body = put(_, cookie, "pageds/$linked('"+uuid1+"')", {$url:
			// url2, $uuid: uuid1}, 200);
			strictEqual(resources[4].$key, key2,
				"reassigning uuid1 to second instance: correct key");
			strictEqual(resources[4].$uuid, uuid1,
				"correct global uuid (3)");
			strictEqual(resources[4].$httpMethod, "PUT", "correct method");
			strictEqual(resources[4].$httpStatus, 200, "correct status");
			// body = get(_, cookie, "pageds/$linked('"+uuid1+"')", 200);
			strictEqual(resources[5].$key, key2,
				"find second instance by uuid1: correct key");
			strictEqual(resources[5].$uuid, uuid1,
				"find second instance by uuid1: correct uuid");
			strictEqual(resources[5].name, "n2",
				"find second instance by uuid1: correct value");
			strictEqual(resources[5].$httpMethod, "GET", "correct method");
			strictEqual(resources[5].$httpStatus, 200, "correct status");

			// put new UUID to second instance
			// body = put(_, cookie, "pageds/$linked('"+uuid2+"')", {$url:
			// url2, $uuid: uuid2}, 200);
			strictEqual(resources[6].$key, key2,
				"put uuid2 to second instance again: correct key");
			strictEqual(resources[6].$uuid, uuid2, "correct uuid");
			strictEqual(resources[6].name, "n2", "correct value");
			strictEqual(resources[6].$httpMethod, "PUT", "correct method");
			strictEqual(resources[6].$httpStatus, 200, "correct status");
			// put UUID to first instance
			// body = put(_, cookie, "pageds/$linked('"+uuid1+"')", {$url:
			// url1, $uuid: uuid1}, 200);
			strictEqual(resources[7].$key, key1,
				"put uuid1 to first instance again: correct key");
			strictEqual(resources[7].$uuid, uuid1, "correct uuid");
			strictEqual(resources[7].name, "n1", "correct value");
			strictEqual(resources[7].$httpMethod, "PUT", "correct method");
			strictEqual(resources[7].$httpStatus, 200, "correct status");
			// test whether second instance has not been changed
			// body = get(_, cookie, "pageds/$linked('"+uuid2+"')", 200);
			strictEqual(resources[8].$key, key2,
				"test whether second instance still has same UUID: correct key");
			strictEqual(resources[8].$uuid, uuid2, "correct uuid");
			strictEqual(resources[8].name, "n2", "correct value");
			strictEqual(resources[8].$httpMethod, "GET", "correct method");
			strictEqual(resources[8].$httpStatus, 200, "correct status");

		} finally {
			// delete instances
			del(_, cookie, "pageds('" + key1 + "')", 200);
			del(_, cookie, "pageds('" + key2 + "')", 200);
		}
	});

	it(
		"Link protocol",
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			// create 2 instances
			var body = post(_, cookie, "pageds", {
				name: "n1"
			});
			var key1 = body.$key;
			var url1 = body.$url;
			var url1Short = body.$url.substr(body.$url.indexOf("/sdata/")) // reduce;
				// to
				// path
			var body = post(_, cookie, "pageds", {
				name: "n2"
			});
			var key2 = body.$key;
			var url2 = body.$url;
			var url2Short = body.$url.substr(body.$url.indexOf("/sdata/")) // reduce;
				// to
				// path

			body = get(_, cookie, url1, 200);
			// assign global UUID to first entry
			var uuid1 = helpers.uuid.generate();
			body = post(_, cookie, "pageds/$linked", {
				$url: url1,
				$uuid: uuid1
			}, 201);
			strictEqual(body.$key, key1, "correct key");
			strictEqual(body.$uuid, uuid1, "correct global uuid");
			// then select instance by global UUID
			body = get(_, cookie, "pageds/$linked('" + uuid1 + "')", 200);
			strictEqual(body.$key, key1,
				"get by global uuid: correct key after loading");
			strictEqual(body.$url, url1Short, "correct url after loading");
			strictEqual(body.$uuid, uuid1, "correct global uuid after loading");
			strictEqual(body.name, "n1", "correct value after loading");
			// select short version of instance with "select=" parameter
			body = get(_, cookie, "pageds/$linked('" + uuid1 + "')?select=",
				200);
			strictEqual(body.$key, undefined,
				"get by global uuid with select: correct key after loading");
			strictEqual(body.$uuid, uuid1, "correct global uuid after loading");
			strictEqual(body.$url, url1Short, "correct url after loading");
			strictEqual(body.name, undefined, "correct value after loading");
			// assign same UUID to instance
			body = post(_, cookie, "pageds/$linked", {
				$url: url1,
				$uuid: uuid1
			}, 201);
			strictEqual(body.$key, key1, "correct key");
			strictEqual(body.$uuid, uuid1, "correct global uuid (2)");
			// assign different UUID to instance
			body = post(_, cookie, "pageds/$linked", {
				$url: url1,
				$uuid: uuid1 + "a"
			}, 400);
			// assign global UUID to second instance, generated by receiver
			body = post(_, cookie, "pageds/$linked", {
				$url: url2
			}, 201);
			var uuid2 = body.$uuid;
			strictEqual(body.$key, key2,
				"make global uuid of second instance: correct key of second instance");
			body = get(_, cookie, "pageds/$linked('" + uuid2 + "')", 200);
			strictEqual(body.$key, key2,
				"fetch second instance: correct key after loading");
			strictEqual(body.$uuid, uuid2, "correct global uuid after loading");
			del(_, cookie, "pageds/$linked('" + uuid2 + "')", 200);
			del(_, cookie, "pageds/$linked('" + uuid2 + "')", 404);
			get(_, cookie, "pageds/$linked('" + uuid2 + "')", 404);
			// send a duplicate UUID
			post(_, cookie, "pageds/$linked", {
				$url: url2,
				$uuid: uuid1
			}, 400);
			// assign uuid1 to second instance
			body = put(_, cookie, "pageds/$linked('" + uuid1 + "')", {
				$url: url2,
				$uuid: uuid1
			}, 200);
			strictEqual(body.$key, key2,
				"reassigning uuid1 to second instance: correct key");
			strictEqual(body.$uuid, uuid1,
				"reassigning uuid1 to second instance: correct uuid");
			body = get(_, cookie, "pageds/$linked('" + uuid1 + "')", 200);
			strictEqual(body.$key, key2,
				"find second instance by uuid1: correct key");
			strictEqual(body.$uuid, uuid1,
				"find second instance by uuid1: correct uuid");
			strictEqual(body.name, "n2",
				"find second instance by uuid1: correct value");
			body = get(_, cookie, "pageds('" + key1 + "')", 200);
			strictEqual(body.$key, key1,
				"find first instance by key: correct key");
			strictEqual(body.$uuid, key1,
				"find first instance by key: correct uuid (non SData compliant!!)");
			strictEqual(body.name, "n1",
				"find first instance by key: correct value");
			// put new UUID to second instance
			body = put(_, cookie, "pageds/$linked('" + uuid2 + "')", {
				$url: url2,
				$uuid: uuid2
			}, 200);
			strictEqual(body.$key, key2,
				"put uuid2 to second instance again: correct key");
			strictEqual(body.$uuid, uuid2, "correct uuid");
			strictEqual(body.name, "n2", "correct value");
			// put UUID to first instance
			body = put(_, cookie, "pageds/$linked('" + uuid1 + "')", {
				$url: url1,
				$uuid: uuid1
			}, 200);
			strictEqual(body.$key, key1,
				"put uuid1 to first instance again: correct key");
			strictEqual(body.$uuid, uuid1, "correct uuid");
			strictEqual(body.name, "n1", "correct value");
			// test whether second instance has not been changed
			body = get(_, cookie, "pageds/$linked('" + uuid2 + "')", 200);
			strictEqual(body.$key, key2,
				"test whether second instance still has same UUID: correct key");
			strictEqual(body.$uuid, uuid2, "correct uuid");
			strictEqual(body.name, "n2", "correct value");

			// delete instances
			del(_, cookie, "pageds('" + key1 + "')", 200);
			del(_, cookie, "pageds('" + key2 + "')", 200);
		});

	it(
		"various strings",
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			var body = post(_, cookie, "strings", {
				string: "01234567890123456789",
				stringTiny: "01234567890123456789",
				stringNormal: "01234567890123456789",
				string10: "0123456789",
				string100: "01234567890123456789",
				string1000: "01234567890123456789",
				stringNullable1: "01234567890123456789",
				stringNullable2: null
			});
			// tracer && tracer("various strings (177) body: "+sys.inspect(body,
			// null, 4));
			strictEqual(body.string, "01234567890123456789", "string roundtrip");
			strictEqual(body.stringTiny, "01234567890123456789",
				"string roundtrip");
			strictEqual(body.stringNormal, "01234567890123456789",
				"string roundtrip");
			strictEqual(body.string10, "0123456789", "string10 roundtrip");
			strictEqual(body.string100, "01234567890123456789",
				"string100 roundtrip");
			strictEqual(body.string1000, "01234567890123456789",
				"string1000 roundtrip");
			strictEqual(body.stringNullable1, "01234567890123456789",
				"stringNullable roundtrip");
			strictEqual(body.stringNullable2, null,
				"stringNullable  null roundtrip");
			strictEqual(body.stringDef1, "", "string default empty roundtrip");
			strictEqual(body.stringDef2, "a'b",
				"string default non empty roundtrip");
			strictEqual(body.stringDefNull, null,
				"string default null roundtrip");
			var uuid = body.$uuid;
			var body = get(_, cookie, "strings('" + uuid + "')");
			strictEqual(body.string, "01234567890123456789", "string roundtrip");
			strictEqual(body.stringTiny, "01234567890123456789",
				"string roundtrip");
			strictEqual(body.stringNormal, "01234567890123456789",
				"string roundtrip");
			strictEqual(body.string10, "0123456789", "string10 roundtrip");
			strictEqual(body.string100, "01234567890123456789",
				"string100 roundtrip");
			strictEqual(body.string1000, "01234567890123456789",
				"string1000 roundtrip");
			strictEqual(body.stringNullable1, "01234567890123456789",
				"stringNullable roundtrip");
			strictEqual(body.stringNullable2, null,
				"stringNullable  null roundtrip");
			strictEqual(body.stringDef1, "", "string default empty roundtrip");
			strictEqual(body.stringDef2, "a'b",
				"string default non empty roundtrip");
			strictEqual(body.stringDefNull, null,
				"string default null roundtrip");
		});
	it('various booleans', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "bools", {
			bool1: true,
			bool2: false,
			boolNullable1: false,
			boolNullable2: null
		});
		strictEqual(body.bool1, true, "bool true roundtrip");
		strictEqual(body.bool2, false, "bool false roundtrip");
		strictEqual(body.boolNullable1, false, "bool nullable false roundtrip");
		strictEqual(body.boolNullable2, null, "bool null roundtrip");
		strictEqual(body.boolDef1, false, "bool default roundtrip");
		strictEqual(body.boolDef2, true, "bool default true roundtrip");
		strictEqual(body.boolDefNull, null, "bool default null roundtrip");

		var uuid = body.$uuid;
		var body = get(_, cookie, "bools('" + uuid + "')");
		strictEqual(body.bool1, true, "bool true roundtrip");
		strictEqual(body.bool2, false, "bool false roundtrip");
		strictEqual(body.boolNullable1, false, "bool nullable false roundtrip");
		strictEqual(body.boolNullable2, null, "bool null roundtrip");
		strictEqual(body.boolDef1, false, "bool default roundtrip");
		strictEqual(body.boolDef2, true, "bool default true roundtrip");
		strictEqual(body.boolDefNull, null, "bool default null roundtrip");
	});
	it(
		"various integers",
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			var body = post(_, cookie, "integers", {
				int1: 0,
				int2: 1,
				intTiny1: 127,
				intTiny2: -128,
				intSmall1: 0x7fff,
				intSmall2: -0x7fff - 1,
				intMedium1: 0x7fffff,
				intMedium2: -0x7fffff - 1,
				intNormal1: 0x7fffffff,
				intNormal2: -0x7fffffff - 1,
				intBig1: 0x003fffffffffffff,
				intBig2: -0x003fffffffffffff - 1,
				intNullable1: 0,
				intNullable2: null
			});
			strictEqual(body.int1, 0, "integer 0 roundtrip");
			strictEqual(body.int2, 1, "integer 1 roundtrip");
			strictEqual(body.intTiny1, 127, "integer tiny max roundtrip");
			strictEqual(body.intTiny2, -128, "integer tiny min roundtrip");
			strictEqual(body.intSmall1, 0x7fff, "integer small max roundtrip");
			strictEqual(body.intSmall2, -0x7fff - 1,
				"integer small min roundtrip");
			strictEqual(body.intMedium1, 0x7fffff,
				"integer medium max roundtrip");
			strictEqual(body.intMedium2, -0x7fffff - 1,
				"integer medium min roundtrip");
			strictEqual(body.intNormal1, 0x7fffffff,
				"integer normal max roundtrip");
			strictEqual(body.intNormal2, -0x7fffffff - 1,
				"integer normal min roundtrip");
			strictEqual(body.intBig1, 0x003fffffffffffff,
				"integer big max roundtrip");
			strictEqual(body.intBig2, -0x003fffffffffffff - 1,
				"integer big min roundtrip");
			strictEqual(body.intNullable1, 0, "integer nullable 0 roundtrip");
			strictEqual(body.intNullable2, null, "integer null roundtrip");
			strictEqual(body.intDef1, 0, "integer default 0 roundtrip");
			strictEqual(body.intDef2, 1, "integer default 1 roundtrip");
			strictEqual(body.intDefNull, null, "integer default null roundtrip");
			var uuid = body.$uuid;
			var body = get(_, cookie, "integers('" + uuid + "')");
			strictEqual(body.int1, 0, "integer 0 roundtrip");
			strictEqual(body.int2, 1, "integer 1 roundtrip");
			strictEqual(body.intTiny1, 127, "integer tiny max roundtrip");
			strictEqual(body.intTiny2, -128, "integer tiny min roundtrip");
			strictEqual(body.intSmall1, 0x7fff, "integer small max roundtrip");
			strictEqual(body.intSmall2, -0x7fff - 1,
				"integer small min roundtrip");
			strictEqual(body.intMedium1, 0x7fffff,
				"integer medium max roundtrip");
			strictEqual(body.intMedium2, -0x7fffff - 1,
				"integer medium min roundtrip");
			strictEqual(body.intNormal1, 0x7fffffff,
				"integer normal max roundtrip");
			strictEqual(body.intNormal2, -0x7fffffff - 1,
				"integer normal min roundtrip");
			strictEqual(body.intBig1, 0x003fffffffffffff,
				"integer big max roundtrip");
			strictEqual(body.intBig2, -0x003fffffffffffff - 1,
				"integer big min roundtrip");
			strictEqual(body.intNullable1, 0, "integer nullable 0 roundtrip");
			strictEqual(body.intNullable2, null, "integer null roundtrip");
			strictEqual(body.intDef1, 0, "integer default 0 roundtrip");
			strictEqual(body.intDef2, 1, "integer default 1 roundtrip");
			strictEqual(body.intDefNull, null, "integer default null roundtrip");
		});

	it('postReals', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "reals", {
			real1: 0,
			real2: 1,
			realSmall1: 3.40282e38,
			realSmall2: -3.40282e38,
			realNormal1: 1.79769313486231e308,
			realNormal2: -1.79769313486231e308,
			realNullable1: 0,
			realNullable2: null
		});
		strictEqual(body.real1, 0, "real 0 roundtrip");
		strictEqual(body.real2, 1, "real 1 roundtrip");
		strictEqual(body.realSmall1, 3.40282e38, "real small max roundtrip");
		strictEqual(body.realSmall2, -3.40282e38, "real small min roundtrip");
		strictEqual(body.realNormal1, 1.79769313486231e308,
			"real normal max roundtrip");
		strictEqual(body.realNormal2, -1.79769313486231e308,
			"real normal min roundtrip");
		strictEqual(body.realNullable1, 0, "real nullable 0 roundtrip");
		strictEqual(body.realNullable2, null, "real null roundtrip");
		strictEqual(body.realDef1, 0, "real default 0 roundtrip");
		strictEqual(body.realDef2, 1, "real default 1 roundtrip");
		strictEqual(body.realDefNull, null, "real default null roundtrip");
		var uuid = body.$uuid;
		var body = get(_, cookie, "reals('" + uuid + "')", null);
		strictEqual(body.real1, 0, "real 0 roundtrip");
		strictEqual(body.real2, 1, "real 1 roundtrip");
		strictEqual(body.realSmall1, 3.40282e38, "real small max roundtrip");
		strictEqual(body.realSmall2, -3.40282e38, "real small min roundtrip");
		strictEqual(body.realNormal1, 1.79769313486231e308,
			"real normal max roundtrip");
		strictEqual(body.realNormal2, -1.79769313486231e308,
			"real normal min roundtrip");
		strictEqual(body.realNullable1, 0, "real nullable 0 roundtrip");
		strictEqual(body.realNullable2, null, "real null roundtrip");
		strictEqual(body.realDef1, 0, "real default 0 roundtrip");
		strictEqual(body.realDef2, 1, "real default 1 roundtrip");
		strictEqual(body.realDefNull, null, "real default null roundtrip");
	});
	it('postDateTimes', function(_) {
		requestCount++;
		var datetimeBefore = types.datetime.now(false);
		cookie = getCookie(_);
		var body = post(_, cookie, "datetimes", {
			datetime1: testData.testDateTime,
			datetimeNullable1: testData.testDateTime,
			datetimeNullable2: null
		});
		strictEqual(body.datetime1, testData.testDateTime,
			"datetime test roundtrip 1");
		strictEqual(body.datetimeNullable1, testData.testDateTime,
			"datetime nullable test roundtrip");
		strictEqual(body.datetimeNullable2, null, "datetime null roundtrip");
		strictEqual(body.datetimeDef1, testData.testDateTime,
			"datetime default roundtrip");
		ok(body.datetimeDefNow >= datetimeBefore.toString(),
			"datetime default now roundtrip 1");
		ok((body.datetimeDefNow <= types.datetime.now(false).toString()),
			"datetime default now roundtrip 2");
		strictEqual(body.datetimeDefNull, null, "datetime default null roundtrip");
		var uuid = body.$uuid;
		var body = get(_, cookie, "datetimes('" + uuid + "')", null);
		strictEqual(body.datetime1, testData.testDateTime,
			"datetime test roundtrip 2");
		strictEqual(body.datetimeNullable1, testData.testDateTime,
			"datetime nullable test roundtrip");
		strictEqual(body.datetimeNullable2, null, "datetime null roundtrip");
		strictEqual(body.datetimeDef1, testData.testDateTime,
			"datetime default roundtrip");
		ok(body.datetimeDefNow >= datetimeBefore.toString(),
			"datetime default now roundtrip 3");
		ok(body.datetimeDefNow <= types.datetime.now(false).toString(),
			"datetime default now roundtrip 4");
		strictEqual(body.datetimeDefNull, null, "datetime default null roundtrip");
	});
	it('postDates', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "dates", {
			date1: testData.testDate,
			dateNullable1: testData.testDate,
			dateNullable2: null
		});
		strictEqual(body.date1, testData.testDate, "date test roundtrip 1");
		strictEqual(body.dateNullable1, testData.testDate,
			"date nullable test roundtrip");
		strictEqual(body.dateNullable2, null, "date null roundtrip");
		strictEqual(body.dateDef1, testData.testDate, "date default roundtrip");
		strictEqual(body.dateDefToday, types.date.today().toString(),
			"date def today roundtrip");
		strictEqual(body.dateDefNull, null, "date default null roundtrip");
		var uuid = body.$uuid;
		var body = get(_, cookie, "dates('" + uuid + "')", null);
		strictEqual(body.date1, testData.testDate, "date test roundtrip 2");
		strictEqual(body.dateNullable1, testData.testDate,
			"date nullable test roundtrip");
		strictEqual(body.dateNullable2, null, "date null roundtrip");
		strictEqual(body.dateDef1, testData.testDate, "date default roundtrip");
		strictEqual(body.dateDefToday, types.date.today().toString(),
			"date def today roundtrip");
		strictEqual(body.dateDefNull, null, "date default null roundtrip");
	});
	it(
		"postTimes",
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			var timeBefore = types.time.now();
			var body = post(_, cookie, "times", {
				time1: testData.testTime,
				timeNullable1: testData.testTime,
				timeNullable2: null
			});
			strictEqual(body.time1, testData.testTime, "time test roundtrip");
			strictEqual(body.timeNullable1, testData.testTime,
				"time nullable test roundtrip");
			strictEqual(body.timeNullable2, null, "time null roundtrip");
			strictEqual(body.timeDef1, testData.testTime,
				"time default roundtrip");
			ok(body.timeDefNow >= timeBefore.toString(),
				"time def now roundtrip >=");
			ok(body.timeDefNow <= types.time.now().toString(),
				"time def now roundtrip <=");
			strictEqual(body.timeDefNull, null, "time default null roundtrip");
			var uuid = body.$uuid;
			var body = get(_, cookie, "times('" + uuid + "')", null);
			strictEqual(body.time1, testData.testTime, "time test roundtrip 2");
			strictEqual(body.timeNullable1, testData.testTime,
				"time nullable test roundtrip 2");
			strictEqual(body.timeNullable2, null, "time null roundtrip 2");
			strictEqual(body.timeDef1, testData.testTime,
				"time default roundtrip 2");
			ok(body.timeDefNow >= timeBefore.toString(),
				"time def now roundtrip 2 >=");
			ok(body.timeDefNow <= types.time.now().toString(),
				"time def now roundtrip 2 <=");
			strictEqual(body.timeDefNull, null, "time default null roundtrip 2");
		});
	it('postUuids',
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			var body = post(_, cookie, "uuids", {
				uuid1: testData.testUuid,
				uuidNullable1: testData.testUuid,
				uuidNullable2: null
			});
			strictEqual(body.uuid1, testData.testUuid, "uuid test roundtrip");
			strictEqual(body.uuidNullable1, testData.testUuid,
				"uuid nullable test roundtrip");
			strictEqual(body.uuidNullable2, null, "uuid null roundtrip");
			strictEqual(body.uuidDef1, testData.testUuid,
				"uuid default roundtrip");
			strictEqual(body.uuidDefAuto, testData.testUuid,
				"uuid def auto roundtrip");
			strictEqual(body.uuidDefNull, null, "uuid default null roundtrip");
			var uuid = body.$uuid;
			var body = get(_, cookie, "uuids('" + uuid + "')", null);
			strictEqual(body.uuid1, testData.testUuid, "uuid test roundtrip");
			strictEqual(body.uuidNullable1, testData.testUuid,
				"uuid nullable test roundtrip");
			strictEqual(body.uuidNullable2, null, "uuid null roundtrip");
			strictEqual(body.uuidDef1, testData.testUuid,
				"uuid default roundtrip");
			strictEqual(body.uuidDefAuto, testData.testUuid,
				"uuid def auto roundtrip");
			strictEqual(body.uuidDefNull, null, "uuid default null roundtrip");
		});
	it('postJsons',
		function(_) {
			requestCount++;
			cookie = getCookie(_);
			var body = post(_, cookie, "jsons", {
				json1: testData.testJson,
				jsonNullable1: testData.testJson,
				jsonNullable2: null
			});
			same(body.json1, testData.testJson, "json test roundtrip");
			same(body.jsonNullable1, testData.testJson,
				"json nullable test roundtrip");
			strictEqual(body.jsonNullable2, null, "json null roundtrip");
			same(body.jsonDef1, testData.testJson, "json default roundtrip");
			strictEqual(body.jsonDefNull, null, "json default null roundtrip");
			var uuid = body.$uuid;
			var body = get(_, cookie, "jsons('" + uuid + "')", null);
			same(body.json1, testData.testJson, "json test roundtrip");
			same(body.jsonNullable1, testData.testJson,
				"json nullable test roundtrip");
			strictEqual(body.jsonNullable2, null, "json null roundtrip");
			same(body.jsonDef1, testData.testJson, "json default roundtrip");
			strictEqual(body.jsonDefNull, null, "json default null roundtrip");
		});

	it('postParent', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "others", {
			name: "other1"
		});
		strictEqual(body.name, "other1", "other1 test roundtrip");
		var other1 = body.$uuid;
		var body = post(_, cookie, "others", {
			name: "other2"
		});
		strictEqual(body.name, "other2", "other2 test roundtrip");
		var other2 = body.$uuid;
		var body = post(_, cookie, "refers", {
			name: "ref1"
		});
		strictEqual(body.name, "ref1", "ref1 test roundtrip");
		var ref1 = body.$uuid;
		var body = post(_, cookie, "refers", {
			name: "ref2"
		});
		strictEqual(body.name, "ref2", "ref2 test roundtrip");
		var ref2 = body.$uuid;
		var body = post(_, cookie, "associates", {
			name: "associate1"
		});
		strictEqual(body.name, "associate1", "associate1 test roundtrip");
		var associate1 = body.$uuid;
		var body = post(_, cookie, "associates", {
			name: "associate2"
		});
		strictEqual(body.name, "associate2", "associate2 test roundtrip");
		var associate2 = body.$uuid;
		var body = post(_, cookie, "associates", {
			name: "associate3"
		});
		strictEqual(body.name, "associate3", "associate3 test roundtrip");
		var associate3 = body.$uuid;
		var mcuuid = helpers.uuid.generate();
		var body = post(_, cookie, "parents?include=associates", {
			name: "parent1",
			children: [{
				$uuid: helpers.uuid.generate(),
				name: "child1"
			}, {
				$uuid: helpers.uuid.generate(),
				name: "child2"
			}, {
				$uuid: helpers.uuid.generate(),
				name: "child3"
			}],
			mandatoryChild: {
				$uuid: mcuuid,
				name: "mandatoryChild"
			},
			mandatoryRef: {
				$uuid: ref1
			},
			associates: [{
				$uuid: associate1
			}, {
				$uuid: associate2
			}]
		});
		strictEqual(body.name, "parent1", "parent name test roundtrip");
		strictEqual(body.children.length, 3, "children length");
		strictEqual(body.children[0].name, "child1", "first child name");
		strictEqual(body.children[1].name, "child2", "second child name");
		strictEqual(body.children[2].name, "child3", "third child name");
		strictEqual(body.mandatoryChild != null, true,
			"mandatoryChild exists 1");
		strictEqual(body.mandatoryChild.name, "mandatoryChild",
			"mandatory child name");
		strictEqual(body.mandatoryChild.$uuid, mcuuid,
			"mandatory child $uuid");
		strictEqual(body.optionalChild, null, "optional child is null");
		strictEqual(body.mandatoryRef != null, true, "mandatoryRef exists");
		strictEqual(body.mandatoryRef.$uuid, ref1, "mandatoryRef ok");
		strictEqual(body.optionalRef, null, "optionalRef null");
		strictEqual(body.associates != null, true, "associates != null");
		strictEqual(body.associates.length, 2, "associates length 1");
		var gotKeys = body.associates.map(function(elt) {
			return elt.$uuid;
		});
		var expectedKeys = [associate1, associate2];
		gotKeys.sort();
		expectedKeys.sort();
		same(gotKeys, expectedKeys, "associates keys ok");
		var parentKey = body.$uuid;
		var body = get(_, cookie, "parents('" + parentKey + "')?include=$children", null);
		strictEqual(body.name, "parent1", "parent name test roundtrip");
		strictEqual(body.children.length, 3, "children length");
		strictEqual(body.children[0].name, "child1", "first child name");
		strictEqual(body.children[1].name, "child2", "second child name");
		strictEqual(body.children[2].name, "child3", "third child name");
		strictEqual(body.mandatoryChild != null, true,
			"mandatoryChild exists 2");
		strictEqual(body.mandatoryChild.name, "mandatoryChild",
			"mandatory child name");
		strictEqual(body.optionalChild, null, "optional child is null");
		strictEqual(body.mandatoryRef != null, true, "mandatoryRef exists");
		strictEqual(body.mandatoryRef.$uuid, ref1, "mandatoryRef ok");
		strictEqual(body.optionalRef, null, "optionalRef null");
		var body = body;
		var body = put(_, cookie, "parents('" + parentKey + "')?include=associates", {
			name: "parent1",
			children: [{
				$uuid: helpers.uuid.generate(),
				name: "child4"
			}, {
				$uuid: body.children[1].$uuid,
			}],

			optionalChild: {
				$uuid: helpers.uuid.generate(),
				name: "optionalChild"
			},
			optionalRef: {
				$uuid: ref2
			},
			associates: [{
				$uuid: associate3
			}, {
				$uuid: associate1
			}],
			$properties: {
				children: {
					$deleteMissing: true
				},
				associates: {
					$deleteMissing: true
				}
			}

		});
		strictEqual(body.name, "parent1", "parent name test roundtrip");
		strictEqual(body.children.length, 2, "children length 2");
		strictEqual(body.children[0].name, "child4", "first child name");
		strictEqual(body.children[1].name, "child2", "second child name");
		strictEqual(body.mandatoryChild != null, true,
			"mandatoryChild exists 3");
		strictEqual(body.mandatoryChild.name, "mandatoryChild",
			"mandatory child name");
		strictEqual(body.optionalChild != null, true,
			"optional child exists");
		strictEqual(body.optionalChild.name, "optionalChild",
			"optional child name");
		strictEqual(body.mandatoryRef != null, true, "mandatoryRef exists");
		strictEqual(body.mandatoryRef.$uuid, ref1, "mandatoryRef ok");
		strictEqual(body.optionalRef != null, true, "optionalRef exists");
		strictEqual(body.optionalRef.$uuid, ref2, "optionalRef ok");

		strictEqual(body.associates.length, 2, "associates length 2");
		var gotKeys = body.associates.map(function(elt) {
			return elt.$uuid;
		});
		//var expectedKeys = [associate1, associate3];
		//gotKeys.sort();
		//expectedKeys.sort();
		same(gotKeys, [associate3, associate1], "associates keys ok");
		// change order
		var body = put(_, cookie, "parents('" + parentKey + "')?include=associates", {
			associates: [{
				$uuid: associate1
			}, {
				$uuid: associate3
			}]
		});
		var gotKeys = body.associates.map(function(elt) {
			return elt.$uuid;
		});
		same(gotKeys, [associate1, associate3], "associates roundtrip order ok");
		var body = get(_, cookie, "parents('" + parentKey + "')?include=associates", null);
		var gotKeys = body.associates.map(function(elt) {
			return elt.$uuid;
		});
		same(gotKeys, [associate1, associate3], "associates fetch order ok");
		var body = get(_, cookie, "parents('" + parentKey + "')?include=$children", null);
		strictEqual(body.name, "parent1", "parent name test roundtrip");
		strictEqual(body.children.length, 2, "children length");
		strictEqual(body.children[0].name, "child4", "first child name");
		strictEqual(body.children[1].name, "child2", "second child name");
		strictEqual(body.mandatoryChild != null, true,
			"mandatoryChild exists 4");
		strictEqual(body.mandatoryChild.name, "mandatoryChild",
			"mandatory child name");
		strictEqual(body.optionalChild != null, true,
			"optional child exists");
		strictEqual(body.optionalChild.name, "optionalChild",
			"optional child name");
		strictEqual(body.mandatoryRef != null, true, "mandatoryRef exists");
		strictEqual(body.mandatoryRef.$uuid, ref1, "mandatoryRef ok");
		strictEqual(body.optionalRef != null, true, "optionalRef exists");
		strictEqual(body.optionalRef.$uuid, ref2, "optionalRef ok");
		// test change on refs
		var data = {
			mandatoryRef: {
				$uuid: ref2
			},
			optionalRef: null,
		};
		var body = put(_, cookie, "parents('" + parentKey + "')", data);
		strictEqual(body.mandatoryRef != null, true, "mandatoryRef exists");
		strictEqual(body.mandatoryRef.$uuid, ref2, "mandatoryRef ok");
		strictEqual(body.optionalRef == null, true, "optionalRef null");
		// create parent without mandatory ref. must fail
		body = post(_, cookie, "parents", {
			name: "parent2",
			mandatoryChild: {
				$uuid: mcuuid,
				name: "mandatoryChild"
			}
		}, 400);
		// tracer && tracer("postParent body(1):" + sys.inspect(body, null, 4));
		// must not have been saved
		body = get(_, cookie, "parents('" + body.$uuid + "')", 404);

	});

	it('paging', function(_) {
		requestCount++;
		cookie = getCookie(_);
		var body = post(_, cookie, "pageds", {
			name: "r1"
		});
		var body = post(_, cookie, "pageds", {
			name: "r2"
		});
		var body = post(_, cookie, "pageds", {
			name: "r3"
		});
		var body = get(_, cookie, "pageds?orderBy=name&count=1", null);
		strictEqual(body.$totalResults, 3, "totalResults ok(1)");
		strictEqual(body.$itemsPerPage, 1, "itemsPerPage ok");
		strictEqual(body.$resources.length, 1, "length ok");
		strictEqual(body.$resources[0].name, "r1", "name ok");
		// first IS null for the first page
		// ok(body.$links.$first != null, "first != null");
		ok(body.$links.$first == null, "first == null");
		ok(body.$links.$last != null, "last != null");
		ok(body.$links.$next != null, "next != null");
		ok(body.$links.$previous == null, "previous == null");
		var feed1 = body;
		var nextLink = body.$links.$next.$url;
		var body = get(_, cookie, feed1.$links.$next.$url, null);
		strictEqual(body.$totalResults, 3, "totalResults ok(2)");
		strictEqual(body.$itemsPerPage, 1, "itemsPerPage ok");
		strictEqual(body.$resources.length, 1, "length ok");
		strictEqual(body.$resources[0].name, "r2", "name ok");
		ok(body.$links.$first.$url != null, "first ok");
		var firstLink = body.$links.$first.$url;
		strictEqual(body.$links.$last.$url, feed1.$links.$last.$url, "last ok");
		strictEqual(body.$links.$next.$url, feed1.$links.$last.$url, "next ok");
		// strictEqual(body.$links.$previous.$url, feed1.$links.$first.$url,
		// "previous ok");
		var feed2 = body;
		var body = get(_, cookie, feed2.$links.$next.$url, null);
		strictEqual(body.$totalResults, 3, "totalResults ok(3)");
		strictEqual(body.$itemsPerPage, 1, "itemsPerPage ok");
		strictEqual(body.$resources.length, 1, "length ok");
		strictEqual(body.$resources[0].name, "r3", "name ok");
		strictEqual(body.$links.$first.$url, firstLink, "first ok");
		ok(body.$links.$last == null, "last ok");
		strictEqual(body.$links.$next, undefined, "next ok");
		strictEqual(body.$links.$previous.$url, nextLink, "previous ok");
	});

	it(
		"concurrency test",
		function(_) {
			requestCount++;
			tracer && tracer("get cookie (701) ");
			var initialCookie = getCookie(_, "guest", "guest");
			var body = post(_, initialCookie, "strings", {
				string: "01234567890123456789",
				stringTiny: "01234567890123456789",
				stringNormal: "01234567890123456789",
				string10: "0123456789",
				string100: "01234567890123456789",
				string1000: "01234567890123456789",
				stringNullable1: "01234567890123456789",
				stringNullable2: null,
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			});
			var uuid = body.$uuid;
			var initialUpdStamp = body.$updDate;
			strictEqual(body.$creUser, "guest", "creUser ok");
			strictEqual(body.$updUser, "guest", "updUser ok");
			ok(body.$creDate != null, "creDate ok");
			ok(body.$updDate != null, "updDate ok");
			// create a different session to read the instance, to make sure we
			// have the database etag
			body = get(_, initialCookie, "strings('" + uuid + "')", 200);
			strictEqual(body.$creUser, "guest", "creUser dbread ok");
			strictEqual(body.$updUser, "guest", "updUser dbread ok");
			strictEqual(body.$creDate, initialUpdStamp, "creDate dbread ok");
			strictEqual(body.$updDate, initialUpdStamp, "updDate dbread ok");
			// modify
			body = put(_, initialCookie, "strings('" + uuid + "')", {
				string: "0123",
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			});
			ok(body.$updDate > initialUpdStamp, "First modify updStamp ok");
			ok(body.$updDate > body.$creDate, "Cre/mod date different");
			initialUpdStamp = body.$updDate;
			// create a working copy for modify (initialSession)
			body = post(_, initialCookie, "strings('" + uuid + "')/$workingCopies?trackingId=" + helpers.uuid.generate());
			var wcUrl = body.$url;
			// modify, don't save
			body = put(_, initialCookie, wcUrl, {
				string: "1234",
				$etag: body.$etag
			});
			var lastEtag = body.$etag;
			// make a chage, other session
			var secondCookie = getCookie(_, "admin", "admin");
			body = put(_, secondCookie, "strings('" + uuid + "')", {
				string: "2345",
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			});
			strictEqual(body.$creUser, "guest", "creUser unchanged");
			strictEqual(body.$updUser, "admin", "updUser updated");
			ok(body.$updDate > initialUpdStamp, "updDate increased");
			// save the WC, must get an error
			body = put(_, initialCookie, wcUrl, {
				$etag: lastEtag,
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			}, 200);
			strictEqual(body.$actions.$save.$diagnoses[0].$severity, "error",
				"Has an error");
			//
			// PESSIMIST lock test (locked is pessimist)
			body = post(_, cookie, "lockeds", {
				description: "First",
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			});
			uuid = body.$uuid;
			// create an WC on the initial session
			body = post(_, initialCookie,
				"lockeds('" + uuid + "')/$workingCopies?trackingId=" + helpers.uuid.generate(), null, 201);
			wcUrl = body.$url;
			// try to create an WC on second session, MUST fail
			body = post(_, secondCookie,
				"lockeds('" + uuid + "')/$workingCopies?trackingId=" + helpers.uuid.generate(), null, 201);
			ok(body.$diagnoses[0].$severity == "error", "Has an error(2)");
			// logout initial cookie, second WC should succeed as the lock
			// should be removed
			// get the userProfileWC
			body = post(_, initialCookie, baseUrl + "/logout", null, 200);
			// next get on initial cookie should status 401
			body = get(_, initialCookie, "lockeds", 401);
			// !!!!! AT THIS POINT initialCookie is logged out !!!!!
			// // tracer && tracer("initial cookie: "+initialCookie+" - secondCookie:
			// "+secondCookie);
			// now try to recreate a WC on second cookie
			body = post(_, secondCookie,
				"lockeds('" + uuid + "')/$workingCopies?trackingId=" + helpers.uuid.generate(), null, 201);

		});

	it(
		"where as details key test",
		function(_) {
			cookie = getCookie(_);
			var body = post(_, cookie, "strings", {
				string: "where_as_details_test",
				stringTiny: "01234567890123456789",
				stringNormal: "01234567890123456789",
				string10: "0123456789",
				string100: "01234567890123456789",
				string1000: "01234567890123456789",
				stringNullable1: "01234567890123456789",
				stringNullable2: null
			}, 201);
			var testUuid = body.$uuid;
			body = get(
				_,
				cookie,
				"strings(string eq \"where_as_details_test\")?representation=string.$details",
				200);
			strictEqual(body.$uuid, testUuid, "Detail fetched ok");

		});

	it(
		"sdata filters test",
		function(_) {
			var body = post(_, cookie, "strings", {
				string: "T1",
				stringTiny: "01234567890123456789",
				stringNormal: "01234567890123456789",
				string10: "0123456789",
				string100: "01234567890123456789",
				string1000: "01234567890123456789",
				stringNullable1: "01234567890123456789",
				stringNullable2: null
			}, 201);
			body = post(_, cookie, "strings", {
				string: "T2",
				stringTiny: "01234567890123456789",
				stringNormal: "01234567890123456789",
				string10: "0123456789",
				string100: "01234567890123456789",
				string1000: "01234567890123456789",
				stringNullable1: "01234567890123456789",
				stringNullable2: null
			}, 201);
			// in operator
			body = get(
				_,
				cookie,
				"strings?representation=string.$query&where=string in (\"T1\",\"T2\")",
				200);
			strictEqual(body.$resources.length, 2, "In operator ok");

		});

	it(
		"proxy class and inline reference storage",
		function(_) {
			tracer && tracer("Create (970)");
			var body = post(_, cookie, "inlineStoreRefTests", {
				proxyClass: {
					$key: "CODE1~DESC1",
					$uuid: helpers.uuid.generate(),
					$value: "DESC1"
				}
			}, 201);
			tracer && tracer("Body (978): " + sys.inspect(body, null, 4));
			var resUrl = body.$url;
			strictEqual(body.proxyClass.$key, "CODE1~DESC1",
				"proxyClass return key ok");
			strictEqual(body.proxyClass.code, "CODE1", "proxyClass has code ok");
			// force load
			var body = get(_, cookie, resUrl, 200);
			tracer && tracer("Body (983): " + sys.inspect(body, null, 4));
			strictEqual(body.proxyClass.$key, "CODE1~DESC1",
				"proxyClass return key ok (from get)");
			strictEqual(body.proxyClass.code, "CODE1",
				"proxyClass has code ok (from get)");
		});

	it('polymorphic relations', function(_) {
		var body = post(_, cookie, "polymorphTests", {
			code: "T1",
			polyMixt: {
				stringRef: {
					$uuid: s1uuid
				}
			}
		}, 201);
		ok(body && body.polyMixt && body.polyMixt.stringRef && body.polyMixt.stringRef.$uuid != null, "Return correct serialized structure for polyMixt.stringRef");
		// test fetch
		body = get(_, cookie, "polymorphTests(code eq 'T1')", 200);
		ok(body && body.polyMixt && body.polyMixt.stringRef && body.polyMixt.stringRef.$uuid != null, "Fetch correct serialized structure for polyMixt.stringRef");
		tracer && tracer("Body (1140): " + sys.inspect(body, null, 4));
		//
		var body = post(_, cookie, "polymorphTests", {
			code: "T2",
			polyMixt: {
				stringChild: {
					string: "01234567890123456789"
				}
			}
		}, 201);
		ok(body && body.polyMixt && body.polyMixt.stringChild && body.polyMixt.stringChild.string === "01234567890123456789", "Return correct serialized structure for polyMixt.stringChild");
		// test fetch
		body = get(_, cookie, "polymorphTests(code eq 'T2')", 200);
		tracer && tracer("Body (1152): " + sys.inspect(body, null, 4));
		ok(body && body.polyMixt && body.polyMixt.stringChild && body.polyMixt.stringChild.string === "01234567890123456789", "Fetch correct serialized structure for polyMixt.stringChild");

		// modify reference
		body = put(_, cookie, "polymorphTests(code eq 'T1')", {
			polyMixt: {
				stringChild: {
					string: "987654321"
				}
			}
		}, 200);
		tracer && tracer("Body (1171): " + sys.inspect(body, null, 4));
		ok(body && body.polyMixt && body.polyMixt.stringChild && body.polyMixt.stringChild.string === "987654321", "Return correct serialized after relation modification - polyMixt.stringChild");
		body = get(_, cookie, "polymorphTests(code eq 'T1')", 200);
		ok(body && body.polyMixt && body.polyMixt.stringChild && body.polyMixt.stringChild.string === "987654321", "Fetch correct serialized after relation modification - polyMixt.stringChild");

		// plurals
		var body = post(_, cookie, "polymorphTests", {
			code: "T3",
			polyMixts: [{
				stringChild: {
					string: "01234567890123456789"
				}
			}, {
				stringRef: {
					$uuid: s1uuid
				}
			}]
		}, 201);
		tracer && tracer("Body (1189): " + sys.inspect(body, null, 4));
		body = get(_, cookie, "polymorphTests(code eq 'T3')", 200);
		strictEqual(body && body.polyMixts && body.polyMixts.length, 2, "Has 2 items ok");
		ok(body && body.polyMixts && body.polyMixts.every(function(it) {
			return (it.stringChild && it.stringChild.string === "01234567890123456789") || (it.stringRef && it.stringRef.$uuid != null);
		}), "Fetch correct serialized after relation modification");

	});

	it('history test', function(_) {
		cookie = getCookie(_);
		tracer && tracer("before get with histo");
		var shortUrl = "/sdata/qunit/sdataTest/test/strings?representation=string.$query";
		var url = baseUrl + shortUrl;
		var body = get(_, cookie, url, 200, {
			"x-history-title": "Strings get",
			"x-history-agent": "browser"
		});
		// this test might fail as the historisation is done "no wait"
		var body = get(
			_,
			cookie,
			baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/navHistories?representation=navHistory.$query",
			200);
		tracer && tracer("Body(871): " + sys.inspect(body));
		strictEqual(body.$resources.length, 1, "has one history ok");
		strictEqual(body.$resources[0].url, shortUrl, "url check ok");

	});

	it('prototypes test', function(_) {
		tracer && tracer("Before (1040)");
		var body = get(_, cookie, "$prototypes('polymorphTest.$details')", 200);
		tracer && tracer("Body (1040): " + sys.inspect(body, null, 6));
		// reference
		strictEqual(body.$properties.reference.$type, "application/x-reference", "Reference type ok");
		strictEqual(body.$properties.reference.$item.$value, "{$key}", "Reference $value ok");
		// child
		strictEqual(body.$properties.child.$type, "application/x-object", "Child type ok");
		ok(body.$properties.child.$item.$properties.string != null, "Child has properties ok");
		// list
		strictEqual(body.$properties.references.$type, "application/x-array", "List type ok");
		strictEqual(body.$properties.references.$item.$type, "application/x-reference", "List item type ok");
		strictEqual(body.$properties.references.$item.$item.$value, "{$key}", "List item $value ok");
		// children
		strictEqual(body.$properties.children.$type, "application/x-array", "Children type ok");
		strictEqual(body.$properties.children.$item.$type, "application/json", "Children $item type ok");
		ok(body.$properties.children.$item.$properties.string != null, "Child has properties ok");
		// poly reference
		strictEqual(body.$properties.polyRef.$type, "application/x-variant", "Poly Reference type ok");
		strictEqual(body.$properties.polyRef.$variants.string.$type, "application/x-reference", "Poly Reference type ok");
		strictEqual(body.$properties.polyRef.$variants.string.$item.$value, "{$key}", "Poly Reference $value ok");
		// poly child
		strictEqual(body.$properties.polyChild.$type, "application/x-variant", "Poly Child type ok");
		strictEqual(body.$properties.polyChild.$variants.string.$type, "application/x-object", "Poly Child type ok");
		ok(body.$properties.polyChild.$variants.string.$item.$properties.string != null, "Poly Child has properties ok");
		strictEqual(body.$properties.polyChild.$variants.tree.$item.$type, "application/x-pointer", "Poly Child tree item ok");
		// poly list
		strictEqual(body.$properties.polyRefs.$type, "application/x-array", "Poly List type ok");
		strictEqual(body.$properties.polyRefs.$item.$type, "application/x-variant", "Poly List item type ok");
		strictEqual(body.$properties.polyRefs.$item.$variants.string.$type, "application/x-reference", "Poly List item type ok");
		strictEqual(body.$properties.polyRefs.$item.$variants.string.$item.$value, "{$key}", "Poly List item $value ok");
		// children
		strictEqual(body.$properties.polyChildren.$type, "application/x-array", "Poly Children type ok");
		strictEqual(body.$properties.polyChildren.$item.$type, "application/x-variant", "Poly Children $item type ok");
		strictEqual(body.$properties.polyChildren.$item.$variants.string.$type, "application/x-object", "Poly Children $item type ok");
		ok(body.$properties.polyChildren.$item.$variants.string.$item.$properties.string != null, "Poly Children has properties ok");
		// poly mixt
		strictEqual(body.$properties.polyMixt.$type, "application/x-variant", "Poly Mixt type ok");
		strictEqual(body.$properties.polyMixt.$variants.stringRef.$type, "application/x-reference", "Poly Mixt has stringRef variant");
		ok(body.$properties.polyMixt.$variants.stringRef.$item.$properties.string == null, "Poly Mixt stringRef is reference proto ok");
		strictEqual(body.$properties.polyMixt.$variants.stringChild.$type, "application/x-object", "Poly Mixt has stringChild variant");
		ok(body.$properties.polyMixt.$variants.stringChild.$item.$properties.string != null, "Poly Mixt stringChild is child proto ok");
		// poly mixts
		strictEqual(body.$properties.polyMixts.$type, "application/x-array", "Poly Mixts type ok");
		strictEqual(body.$properties.polyMixts.$item.$type, "application/x-variant", "Poly Mixts type ok");
		strictEqual(body.$properties.polyMixts.$item.$variants.stringRef.$type, "application/x-reference", "Poly Mixts has stringRef variant");
		ok(body.$properties.polyMixts.$item.$variants.stringRef.$item.$properties.string == null, "Poly Mixts stringRef is reference proto ok");
		strictEqual(body.$properties.polyMixts.$item.$variants.stringChild.$type, "application/x-object", "Poly Mixts has stringChild variant");
		ok(body.$properties.polyMixts.$item.$variants.stringChild.$item.$properties.string != null, "Poly Mixts stringChild is child proto ok");
		// edit
		var body = get(_, cookie, "$prototypes('polymorphTest.$edit')", 200);
		tracer && tracer("Body (2411): " + sys.inspect(body, null, 4));
		ok(body.$properties.polyMixts.$links.$select.$variants.stringRef.$url != null, "Poly mixts $select link ref ok");
		ok(body.$properties.polyMixts.$links.$select.$variants.stringChild == null, "Poly mixts $select link child ok");
		// loop test
		var body = get(_, cookie, "$prototypes('loopTest1.$details')", 200);
		tracer && tracer("Body (2415): " + sys.inspect(body, null, 6));
		strictEqual(body.$id, "loopTest1", "Loop test $id ok");
		strictEqual(body.$properties.selfLoopChild.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.selfLoopChild.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");
		strictEqual(body.$properties.selfLoopChildren.$item.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.selfLoopChildren.$item.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");
		strictEqual(body.$properties.loop2Child.$item.$properties.loop1Child.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.loop2Child.$item.$properties.loop1Child.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");
		strictEqual(body.$properties.loop2Child.$item.$properties.loop1Children.$item.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.loop2Child.$item.$properties.loop1Children.$item.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");
		strictEqual(body.$properties.loop2Children.$item.$properties.loop1Child.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.loop2Children.$item.$properties.loop1Child.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");
		strictEqual(body.$properties.loop2Children.$item.$properties.loop1Children.$item.$item.$type, "application/x-pointer", "Self loop child prototype ok");
		strictEqual(body.$properties.loop2Children.$item.$properties.loop1Children.$item.$item.$prototype, "#loopTest1", "Self loop child prototype url ok");

	});

	it('services test', function(_) {
		// test data
		var body = post(_, cookie, "serviceTests?representation=serviceTest.$edit", {
			serviceChildTest: {
				sample: "before service"
			}
		}, 201);
		var testId = body.$uuid;
		var shortUrl = body.$shortUrl;
		tracer && tracer("Body (2514): " + sys.inspect(body, null, 6));
		body = get(_, cookie, "serviceTests('" + testId + "')?representation=serviceTest.$details", 200);
		strictEqual(body.serviceChildTest.sample, "before service", "data setup ok");
		// prototype
		var body = get(_, cookie, "$prototypes('serviceTest.$details')", 200);
		var srvUrl = body.$properties.serviceChildTest.$item.$links.test.$url;
		strictEqual(srvUrl, "{$shortUrl}/$service/test?representation={$representation}.$details", "Got child service url ok");
		// service call
		srvUrl = srvUrl.replace("{$shortUrl}", baseUrl + shortUrl + "/serviceChildTest").replace("{$representation}", "serviceChildTest");
		tracer && tracer("service url: " + srvUrl);
		body = post(_, cookie, srvUrl, null, 200);
		tracer && tracer("Body (2510): " + sys.inspect(body, null, 6));
		strictEqual(body.serviceChildTest.sample, "executed", "result after execution ok");
		strictEqual(body.serviceChildTest.$links.test.$isDisabled, true, "isDisabled test ok");

	});

	//UNIT TEST FOR syracuse-collaboration/lib/entities/about._js
	it('about test', function(_) {
		cookie = getCookie(_);
		var body = get(_, cookie, baseUrl + "/sdata/syracuse/collaboration/syracuse/abouts('''')?representation=about.$details");
		var version;
		var sourceCommit;
		var comment;
		var streamline;
		var rolloutCommit;

		try {
			var versionData = patchtools.readVersionFile(patchtools.BASE_DIRECTORY, _);
			strictEqual(versionData.relNumber + "-" + versionData.patchNumber, body.version, "version OK");
			sourceCommit = versionData.src;
			comment = versionData.comment;
			streamline = JSON.stringify(versionData.streamline);
			rolloutCommit = versionData.commit;

		} catch (e) {
			strictEqual(!!body.version, true, "version OK2")
		}
		strictEqual(sourceCommit, body.sourceCommit, "source commit OK")
		if (comment) {
			strictEqual(comment, body.comment, "comment OK")
		} else
			strictEqual(true, true, "comment OK (dummy test)")
		strictEqual(streamline, body.streamline, "streamline OK")
			// strictEqual(rolloutCommit, body.rolloutCommit, "commit OK")
	});


	it('method override', function(_) {
		var body = get(_, cookie, "strings", 200);
		ok(body.$resources != null, "Get w/o method override ok");
		body = get(_, cookie, "strings?$method=POST&$payload=" + jsurl.stringify({
			string: "create_by_method_override",
			stringTiny: "01234567890123456789",
			stringNormal: "01234567890123456789",
			string10: "0123456789",
			string100: "01234567890123456789",
			string1000: "01234567890123456789",
			stringNullable1: "01234567890123456789",
			stringNullable2: null
		}), 201);
		// check by fetching the object
		ok(body.$uuid != null, "Got created uuid");
		ok(body.$url.indexOf("$method") < 0, "$method not in return url ok");
		body = get(_, cookie, "strings('" + body.$uuid + "')", 200);
		strictEqual(body.string, "create_by_method_override", "Got post body response ok");
		// WC test
		body = get(_, cookie, "strings/$template/$workingCopies?$method=POST&$payload=" + jsurl.stringify({
			string: "wc_create_by_method_override",
			stringTiny: "01234567890123456789",
			stringNormal: "01234567890123456789",
			string10: "0123456789",
			string100: "01234567890123456789",
			string1000: "01234567890123456789",
			stringNullable1: "01234567890123456789",
			stringNullable2: null
		}), 201);
		strictEqual(body.string, "wc_create_by_method_override", "Got post wc body response ok");
		ok(body.$url.indexOf("$method") < 0, "$method not in return url ok");
	});
});