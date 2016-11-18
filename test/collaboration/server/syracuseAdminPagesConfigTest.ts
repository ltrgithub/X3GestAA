"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var types = require('@sage/syracuse-core').types;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var sys = require("util");
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var tracer; // = console.log;

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;
helpers.pageFileStorage = false;

var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var requestCount = 0;
var MAX_REQUESTS = 11;

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var contractUrl = "/sdata/syracuse/collaboration/mongodb_admin_test/";
var ez = require('ez-streams');

function getCookie(_, login, pass) {
	var response = new ez.devices.http.client({
		url: baseUrl + "/syracuse-main/html/main.html",
		user: login || "guest",
		password: pass || "guest"
	}).end().response(_);
	response.readAll(_);
	strictEqual(response.statusCode, 200, "user authenticated");
	return response.headers["set-cookie"];
}

function post(_, cookie, url, data, statusCode) {
	var response = ez.devices.http.client({
		method: "post",
		url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).end(JSON.stringify(data)).response(_);
	strictEqual(response.statusCode, statusCode || 201, "status verified");
	return JSON.parse(response.readAll(_));
}

function put(_, cookie, url, data, statusCode) {
	var response = ez.devices.http.client({
		method: "put",
		url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).end(JSON.stringify(data)).response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified");
	return JSON.parse(response.readAll(_));
}

function get(_, cookie, url, statusCode, facet) {
	var type = facet || "generic.$details";
	var response = ez.devices.http.client({
		method: "get",
		url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
		headers: {
			cookie: cookie,
			accept: "application/json;vnd.sage.syracuse.representation=example.admin.mongodb_admin_test." + type
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

function _getModel() {
	return dataModel.make(registry.applications.syracuse.contracts.collaboration, "mongodb_admin_test");
}

function _createDataContext() {
	return new DataContext(_getModel(), true);
}

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var franceID = "";
	var usID = "";

	it('init database', function(_) {
		var server = new mongodb.Server(endPoint.datasets["mongodb_admin_test"].hostname, endPoint.datasets["mongodb_admin_test"].port, {});
		var db = testAdmin.newMongoDb(endPoint.datasets["mongodb_admin_test"].database, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		ok(true, "mongodb initialized");
	});

	//start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	var _data = {};
	var _session = {
		setData: function(name, value) {
			var old = _data[name];
			if (old == value) return;

			if (old && old.onDestroy) {
				old.onDestroy();
			}
			if (typeof value == "undefined") delete _data[name];
			else _data[name] = value;
		},
		getData: function(name) {
			return _data[name];
		},
		_reset: function() {
			_data = {};
		}
	};

	function _resetSession() {
		_data = {};
	}

	function _createRequest(method, url, data, set) {
		var baseUrl = "http://localhost/sdata/syracuse/collaboration/mongodb_admin_test";
		return {
			session: _session,
			method: method,
			url: (set ? url : (baseUrl + url)).replace(/'/g, "%27"),
			context: {
				parseBody: function(_) {
					return data;
				}
			},
			headers: {
				cookie: "fake cookie"
			}
		};
	}

	function _checkStatus(response, statusCode, message) {
		strictEqual(response.statusCode, statusCode, message);
		if (response.statusCode != statusCode) {
			tracer && tracer(response);
			throw new Error("aborting test");
		}
	}

	var configs = [{
		version: "1.0.0.0"
	}, {
		version: "1.1.0.0"
	}, {
		version: "2.0.0.0"
	}, {
		version: "2.1.0.0"
	}];

	function _findObj(coll, searchProp, searchVal) {
		var obj = null;
		coll.forEach(function(item) {
			if (item[searchProp] == searchVal) {
				obj = item;
			}
		});
		return obj;
	}

	function _findUuid(coll, searchProp, searchVal) {
		var obj = _findObj(coll, searchProp, searchVal);
		return obj && obj.$uuid;
	}

	it('create configurations', function(_) {
		requestCount++;
		var cookie = getCookie(_);
		//
		var body = post(_, cookie, "configurations/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var cf10uuid = body.$uuid;
		_findObj(configs, "version", "1.0.0.0").$uuid = body.$uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			description: "1.0",
			version: "1.0.0.0",
			enable: true,
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create config 1.0 ok");
		//
		var body = post(_, cookie, "configurations/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		_findObj(configs, "version", "1.1.0.0").$uuid = body.$uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			description: "1.1",
			version: "1.1.0.0",
			enable: true,
			parent: {
				$uuid: cf10uuid
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create config 1.1 ok");
		//
		var body = post(_, cookie, "configurations/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var cf20uuid = body.$uuid;
		_findObj(configs, "version", "2.0.0.0").$uuid = body.$uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			description: "2.0",
			version: "2.0.0.0",
			enable: true,
			parent: {
				$uuid: cf10uuid
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create config 2 ok");
		//
		var body = post(_, cookie, "configurations/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		_findObj(configs, "version", "2.1.0.0").$uuid = body.$uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			description: "2.1",
			version: "2.1.0.0",
			enable: false,
			parent: {
				$uuid: cf20uuid
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		tracer && tracer("create config 2.1.0.0============");
		body = put(_, cookie, body.$url, data);
		//	tracer && tracer("body: "+sys.inspect(body, null, 4));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create config 2.1 ok");
		strictEqual(body.allParents.length, 2, "2.1 allParents test ok");
		tracer && tracer("create config end============");
		//
	});

	var applicationId;
	/*
	it('page create for configuration', function(_) {
		requestCount++;
		var cookie = getCookie(_);
		// get application
		var app = adminHelper.getApplication(_, "syracuse", "collaboration");
		ok(app != null, "Application fetch ok");
		applicationId = app.$uuid;
		// create a page for /syracuse/collaboration//group, unaffected, version 1.0.0.0
		config.currentConfigVersion = "1.0.0.0";
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page1",
			application: {$uuid: applicationId},
			representation: "group",
			facet: "$details",
			content: {
				"testName": "version1000"
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		strictEqual(body.configuration.$uuid, _findUuid(configs, "version", "1.0.0.0"), "Page linked to 1.0.0.0 ok");
		// create a page for /syracuse/collaboration//group, unaffected, version 2.0.0.0
		config.currentConfigVersion = "2.0.0.0";
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page2",
			application: {$uuid: applicationId},
			representation: "group",
			facet: "$details",
			content: {
				"testName": "version2000"
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		strictEqual(body.configuration.$uuid, _findUuid(configs, "version", "2.0.0.0"), "Page linked to 2.0.0.0 ok");
		// create a page for /syracuse/collaboration//group, unaffected, version 2.0.0.0
		config.currentConfigVersion = "2.1.0.0";
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page3",
			application: {$uuid: applicationId},
			representation: "group",
			facet: "$details",
			content: {
				"testName": "version2100"
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data);
		strictEqual(body.configuration.$uuid, _findUuid(configs, "version", "2.1.0.0"), "Page linked to 2.1.0.0 ok");
		//
	});

	it('page fetch for configuration', function(_) {
		requestCount++;
		var cookie = getCookie(_);
		var body;
		// page fetch test : with currentConfig null, must get 2.0.0.0 (last enabled version)
		tracer && tracer("page fetch test============");
		config.currentConfigVersion = null;
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group,$page,')", 200);
		tracer && tracer("page fetch test body:" + sys.inspect(body, null, 4));
		strictEqual(body.testName, "version2000", "Last enable version get ok");
		// fetch explicit version
		config.currentConfigVersion = "2.1.0.0";
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group,$page,')", 200);
		strictEqual(body.testName, "version2100", "2.1.0.0 version get ok");
		// fetch explicit version but w/o pageData (must get first parent version)
		config.currentConfigVersion = "1.1.0.0";
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group,$page,')", 200);
		strictEqual(body.testName, "version1000", "1.0.0.0 version get ok");
		//
	});

	it('page modification history', function(_) {
		requestCount++;
		var cookie = getCookie(_);
		var body;
		// typical use case : fetch a page, use authorUrl to get pageData in authoring mode, then modify
		config.currentConfigVersion = "2.1.0.0";
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group,$page,')", 200);
		strictEqual(body.testName, "version2100", "2.1.0.0 version get ok");
		var pageUrl = body.$authorUrl.replace("{$baseUrl}", baseUrl + contractUrl.substring(0, contractUrl.length - 1));
		// create a working copy
		body = post(_, cookie, pageUrl, 200);
		var pageDataUuid = body.$uuid;
		// modify testName, add a $ field
		body.content.testName = "version2100 mod(1)";
		body.content.$testValue1 = "A dollar property";
		body.$actions = {
			$save: {
				$isRequested: true
			}
		};
		tracer && tracer("modify page (1)");
		body = put(_, cookie, pageUrl, body, 200);
		tracer && tracer("modify page body(1): " + sys.inspect(body, null, 4));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "modify page");
		// get page history
		body = get(_, cookie, "pageDataHistories?where=pageData%20eq%20'" + pageDataUuid + "'&orderBy=version%20desc&count=2", 200);
		tracer && tracer("body(385): " + sys.inspect(body, null, 4));
		strictEqual(body.$resources[0].version, 0, "version ok");
		strictEqual(body.$resources[0].content.testName, "version2100", "value ok");
		strictEqual(body.$resources[0].historyItems[0].version, 1, "item version ok");
		strictEqual(body.$resources[0].historyItems[0].content.testName, "version2100 mod(1)", "item value ok");
		// modify (is using the same WC !!!) (2)
		body = get(_, cookie, pageUrl, 200);
		// modify testName, add a $ field
		body.content.testName = "version2100 mod(2)";
		body.$actions = {
			$save: {
				$isRequested: true
			}
		};
		tracer && tracer("1==========================================");
		body = put(_, cookie, pageUrl, body);
		tracer && tracer("modify page body(2): " + sys.inspect(body, null, 4));
		//
		body = get(_, cookie, "pageDataHistories?where=pageData%20eq%20'" + pageDataUuid + "'&orderBy=version%20desc&count=1", 200);
		tracer && tracer("body(399): " + sys.inspect(body, null, 4));
		// only 1 as count = 1
		strictEqual(body.$resources.length, 1, "length ok");
		strictEqual(body.$resources[0].historyItems[1].version, 2, "item version ok");
		strictEqual(body.$resources[0].historyItems[1].content.testName, "version2100 mod(2)", "item value ok");

	});*/
});