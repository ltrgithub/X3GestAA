"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var types = require('@sage/syracuse-core').types;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var ez = require('ez-streams');
var sys = require("util");
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
//
var tracer; // = console.log;
//
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
var acceptLanguage = "fr,fr-fr";

function getCookie(_, login, pass, status) {
	var resp = testAdmin.getCookie(_, baseUrl, login, pass, true, status);
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
		var db = testAdmin.newMongoDb(config.collaboration.dataset, server, {});
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

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	function hasErrors(body) {
		var hasErr = body.$diagnoses && body.$diagnoses.some(function(diag) {
			return diag.$severity == "error" || diag.severity === "error";
		});
		if (!hasErr) {
			for (var key in body) {
				if (typeof body[key] === "object") hasErr = hasErr || hasErrors(body[key]);
			};
		}
		//
		return hasErr;
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

	function _encodePass(login, pass) {
		return testAdmin.encodePassword(login, pass);
	}

	var users = [{
		login: "owken",
		firstName: "Obi Wan",
		lastName: "Kenobi",
		password: _encodePass("owken", "owken")
	}, {
		login: "lusky",
		firstName: "Luke",
		lastName: "Skywalker",
		password: _encodePass("lusky", "lusky")
	}, {
		login: "yoda",
		lastName: "Yoda",
		password: _encodePass("yoda", "yoda")
	}, {
		login: "rex",
		firstName: "Rex",
		lastName: "The Clone",
		password: _encodePass("rex", "rex")
	}];
	var endPoints = [{
		description: "Coruscant",
		dataset: "Coruscant",
		enableSearch: false,
		protocol: "syracuse",
		databaseDriver: "mongodb",
		databaseHost: "localhost",
		databasePort: config.collaboration.port || 27017
	}, {
		description: "Endor",
		dataset: "Endor",
		enableSearch: false,
		protocol: "syracuse",
		databaseDriver: "mongodb",
		databaseHost: "localhost",
		databasePort: config.collaboration.port || 27017
	}, {
		description: "Dagobah",
		dataset: "Dagobah",
		enableSearch: false,
		protocol: "x3"
	}, {
		description: "Administration",
		dataset: "mongodb_admin_test",
		enableSearch: false,
		protocol: "syracuse",
		databaseDriver: "mongodb",
		databaseHost: "localhost",
		databasePort: config.collaboration.port || 27017
	}];
	var roles = [{
		code: "MJ",
		description: "Master Jedi"
	}, {
		code: "J",
		description: "Jedi"
	}, {
		code: "P",
		description: "Padawan"
	}, {
		code: "C",
		description: "Clone"
	}];
	var groups = [{
		description: "Universe"
	}, {
		description: "Separatists"
	}, {
		description: "Independent Market"
	}, {
		description: "Trade Federation"
	}, {
		description: "Clones"
	}];

	var cookie = "";
	var applicationId;
	var applicationX3Id;

	it('create objects', function(_) {
		requestCount++;
		var body;
		cookie = getCookie(_);
		// check init script
		var userNames = get(_, cookie, "users").$resources.map(function(item) {
			return item.login;
		});
		ok(userNames.indexOf("admin") >= 0, "Admin ok");
		ok(userNames.indexOf("guest") >= 0, "Guest ok");
		ok(userNames.length == 3, "Users count ok");
		// get main application
		var app = adminHelper.getApplication(_, "syracuse", "collaboration");
		ok(app != null, "Application fetch ok");
		applicationId = app.$uuid;
		var app = adminHelper.getApplication(_, "x3", "erp");
		ok(app != null, "Application X3 fetch ok");
		applicationX3Id = app.$uuid;
		//
		body = get(_, cookie, "securityProfiles(code eq 'ADMIN')?representation=securityProfile.$details");
		tracer && tracer("body (315) " + sys.inspect(body, null, 4));
		var spUUID = body.$uuid;
		// x3solution
		body = post(_, cookie, "x3solutions", {
			code: "X3 S1",
			description: "X3 S1",
			solutionName: "X3 S1",
			serverHost: "localhost",
			serverPort: 1,
			application: {
				$uuid: applicationX3Id
			}
		});
		var x3sId = body.$uuid;
		// create users
		tracer && tracer("create users");
		users.forEach_(_, function(_, user) {
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
		});
		// create roles
		roles.forEach_(_, function(_, item) {
			var body = post(_, cookie, "roles/$template/$workingCopies?trackingId=" + uuid.generate(), {});
			var data = helpers.object.clone(item);
			item.$uuid = body.$uuid;
			data.$key = item.$uuid;
			data.$etag = body.$etag;
			data.securityProfile = {
				$uuid: spUUID
			};
			data.$actions = {
				$save: {
					$isRequested: true
				}
			};
			body = put(_, cookie, body.$url, data);
			tracer && tracer("body: " + sys.inspect(body, null, 4));
			ok(onlyInfo(body.$actions.$save.$diagnoses), "create role " + item.description + " ok");
		});
		// create groups
		groups.forEach_(_, function(_, item) {
			var body = post(_, cookie, "groups/$template/$workingCopies?trackingId=" + uuid.generate(), {});
			tracer && tracer("body after post: " + sys.inspect(body, null, 4));
			var data = helpers.object.clone(item);
			item.$uuid = body.$uuid;
			data.$key = item.$uuid;
			data.$etag = body.$etag;
			data.$actions = {
				$save: {
					$isRequested: true
				}
			};
			body = put(_, cookie, body.$url, data);
			ok(onlyInfo(body.$actions.$save.$diagnoses), "create group " + item.description + " ok");
		});
		// create endpoints
		endPoints.forEach_(_, function(_, item) {
			var body = post(_, cookie, "endPoints/$template/$workingCopies?trackingId=" + uuid.generate(), {});
			var data = helpers.object.clone(item);
			item.$uuid = body.$uuid;
			data.$key = item.$uuid;
			data.$etag = body.$etag;
			data.applicationRef = {
				$uuid: (item.protocol === "syracuse" ? applicationId : applicationX3Id)
			};
			if (item.protocol === "x3") {
				data.serverFolder = item.name,
					data.x3solution = {
						$uuid: x3sId
					};
			}
			data.$actions = {
				$save: {
					$isRequested: true
				}
			};
			body = put(_, cookie, body.$url, data);
			tracer && tracer("create endpoint " + item.description + " body: " + sys.inspect(body));
			ok(onlyInfo(body.$actions.$save.$diagnoses), "create endPoint " + item.description + " ok");
		});
		// create an x3 endpoint, by step like in edit form
		// get x3/erp application
		var app = adminHelper.getApplication(_, "x3", "erp");
		ok(app != null, "X3 Application fetch ok");
		// x3solution
		body = post(_, cookie, "x3solutions", {
			"code": "SUPDVLP",
			"description": "X3 Developpement Server",
			"solutionName": "SUPDVLP",
			"serverHost": "172.28.16.106",
			"serverPort": 17000,
			"proxy": false,
			application: {
				$uuid: app.$uuid
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 201);
		var srvrId = body.$uuid;
		body = post(_, cookie, "endPoints/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
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
		tracer && tracer("create x3 endpoint body (443)" + sys.inspect(body, null, 4));
		ok(onlyInfo(body.$diagnoses), "save X3 endPoint body diag ok");
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save X3 endPoint action ok");
		var epId = body.$uuid;
		// try to get it
		body = get(_, cookie, "endPoints('" + body.$uuid + "')", 200);
		strictEqual(body.$uuid, epId, "Saved endPoint get ok");

	});

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
	it('link user and groups', function(_) {
		requestCount++;
		// var cookie = getCookie(_);
		var body = null;
		//

		function _addGroupToUser(_, user, group, index) {
			var userUuid = _findUuid(users, "login", user);
			// Fetch user WC
			body = post(_, cookie, "users('" + userUuid + "')/$workingCopies?trackingId=" + uuid.generate(), {});
			// add the group to the group list
			tracer && tracer("add group to user start");
			body = put(_, cookie, body.$url, {
				$key: userUuid,
				$etag: body.$etag,
				groups: [{
					$uuid: _findUuid(groups, "description", group),
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
			ok(onlyInfo(body.$actions.$save.$diagnoses), "group " + group + " added to " + user);
		}

		function _addRoleToGroup(_, role, group) {
			var groupUuid = _findUuid(groups, "description", group);
			// Fetch user WC
			body = put(_, cookie, "groups('" + groupUuid + "')", {
				$key: groupUuid,
				//			$etag: body.$etag,
				role: {
					$uuid: _findUuid(roles, "description", role)
				}
			}, 200);
			tracer && tracer("body (516) " + sys.inspect(body, null, 4));
		}
		//
		_addRoleToGroup(_, "Clone", "Clones");
		_addGroupToUser(_, "owken", "Independent Market", 0);
		_addGroupToUser(_, "owken", "Trade Federation", 1);
		_addGroupToUser(_, "rex", "Clones", 0);
		//
		body = get(_, cookie, "users('" + _findUuid(users, "login", "owken") + "')", 200, "user.$details");
		tracer && tracer("body(525): " + sys.inspect(body, null, 4));
		strictEqual(body.groups.length, 2, "Groups count test");
		// get the group, check if user is in
		body = get(_, cookie, "groups('" + _findUuid(groups, "description", "Trade Federation") + "')", 200, "group.$details");
		tracer && tracer("body: " + sys.inspect(body));
		strictEqual(body.users.length, 1, "Users count test");
		strictEqual(body.users[0].$uuid, _findUuid(users, "login", "owken"), "User owken associated test");
		//
		_addGroupToUser(_, "yoda", "Universe", 0);
		body = get(_, cookie, "users('" + _findUuid(users, "login", "yoda") + "')", 200, "user.$details");
		tracer && tracer("body: " + sys.inspect(body));
		strictEqual(body.groups.length, 1, "Groups count test");
		strictEqual(body.groups[0].description, "Universe", "Groups description test");
		//
		_addGroupToUser(_, "lusky", "Independent Market", 0);
		body = get(_, cookie, "users('" + _findUuid(users, "login", "lusky") + "')", 200, "user.$details");
		strictEqual(body.groups.length, 1, "Groups count test");
		strictEqual(body.groups[0].description, "Independent Market", "Groups description test");
		//
		_addRoleToGroup(_, "Jedi", "Independent Market");
		body = get(_, cookie, "groups('" + _findUuid(groups, "description", "Independent Market") + "')", 200, "group.$details");
		strictEqual(body.role.$uuid, _findUuid(roles, "description", "Jedi"), "Role of Independent Maket = Jedi ok");

	});

	it('link groups and endpoints', function(_) {
		requestCount++;
		// var cookie = getCookie(_);
		var body = null;
		//

		function _addEndPointToGroup(_, endpoint, group, index) {
			body = post(_, cookie, "groups('" + _findUuid(groups, "description", group) + "')/$workingCopies?trackingId=" + uuid.generate(), {});
			// add the group to the group list
			body = put(_, cookie, body.$url, {
				$key: _findUuid(groups, "description", group),
				$etag: body.$etag,
				endPoints: [{
					$uuid: _findUuid(endPoints, "description", endpoint),
					$index: index || 0
				}],
				$actions: {
					$save: {
						$isRequested: true
					}
				}
			});
			ok(onlyInfo(body.$actions.$save.$diagnoses), "endpoint " + endpoint + " added to " + group);
		}
		//
		_addEndPointToGroup(_, "Coruscant", "Independent Market", 0);
		_addEndPointToGroup(_, "Endor", "Independent Market", 0);
		_addEndPointToGroup(_, "Endor", "Trade Federation", 1);
		_addEndPointToGroup(_, "Dagobah", "Trade Federation", 0);
		// check
		body = get(_, cookie, "groups('" + _findUuid(groups, "description", "Trade Federation") + "')", 200, "group.$details");
		strictEqual(body.endPoints.length, 2, "EndPoints count test");
		body = get(_, cookie, "groups('" + _findUuid(groups, "description", "Independent Market") + "')", 200, "group.$details");
		strictEqual(body.endPoints.length, 2, "EndPoints count test");
		body = get(_, cookie, "endPoints('" + _findUuid(endPoints, "description", "Coruscant") + "')", 200, "endPoint.$details");
		strictEqual(body.groups.length, 1, "Group count test");
		//
	});

	var nonAffectedPageUuid; // not affected to users or roles
	var nonAffectedQueryPageUuid; // not affected to users or roles, facet is $query
	var jediPadawanPageUuid; // affected to roles Jedi and Padawan
	var yodaLuskyPageUuid; // affected to users Yoda and Lusky
	it('create page datas', function(_) {
		requestCount++;
		var body;
		// var cookie = getCookie(_);
		// create a page for /syracuse/collaboration//group, unaffected
		body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		var page1Uuid = body.$uuid;
		nonAffectedPageUuid = page1Uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page1",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$details",
			content: "{ \"testName\": \"UnaffectedPage\", \"$category\": \"tabs\", \"$items\": [{ \"$title\": \"Default vertical grid\"	}, \"$testEscape\", 5]}",
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		//	tracer && tracer("create page datas.create page 1==============");
		body = put(_, cookie, body.$url, data);
		tracer && tracer("create page datas.create page 1 (633):" + sys.inspect(body, null, 5));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create page 1 ok");
		// check escaping
		body = get(_, cookie, "pageDatas('" + page1Uuid + "')", 200, "pageData.$details");
		// there is no escape anymore as we store it as string
		//ok(body.content.hasOwnProperty("$category"), "mongodb store and escape ok");
		//tracer && tracer("create page datas.create page 1:" + sys.inspect(body, null, 4));
		// create page def
		var page1VarUuid = uuid.generate();
		body = post(_, cookie, "pageDefs", {
			$uuid: uuid.generate(),
			code: "syracuse.sollaboration.group.$details",
			title: "page1",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$details",
			variants: [{
				$uuid: page1VarUuid,
				pageData: {
					$uuid: page1Uuid
				},
				$index: 0
			}]
		}, 201);
		// get the page
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$details,$page')", 200);
		tracer && tracer("create page datas.create page 1:" + sys.inspect(body, null, 4));
		strictEqual(body.$authorUrl, baseUrl + contractUrl + "pageAuths('" + page1VarUuid + "')/$workingCopies?representation=pageAuth.$edit&pageContext=syracuse.collaboration.mongodb_admin_test.group.$details&device=desktop", "Author url test");
		// create a page for /syracuse/collaboration//group.$query, unaffected
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		var page1Uuid = body.$uuid;
		nonAffectedQueryPageUuid = page1Uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page2",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$query",
			content: "{ \"testName\": \"UnaffectedQueryPage\", \"$category\": \"tabs\", \"$items\": [{ \"$title\": \"Default vertical grid\"	}, \"$testEscape\", 5]}",
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create page query ok");
		tracer && tracer("create page (713)");
		body = post(_, cookie, "pageDefs", {
			$uuid: uuid.generate(),
			code: "syracuse.collaboration.group.$query",
			title: "page2",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$query",
			variants: [{
				$uuid: uuid.generate(),
				pageData: {
					$uuid: nonAffectedQueryPageUuid
				},
				$index: 0
			}]
		}, 201);
		var groupQueryPageUuid = body.$uuid;
		tracer && tracer("before body (731): " + sys.inspect(body, null, 4));
		body = get(_, cookie, "pageDefs('" + groupQueryPageUuid + "')?representation=pageDef.$details", 200);
		tracer && tracer("body (731): " + sys.inspect(body, null, 4));
		// create a page for /syracuse/collaboration//group.$query.compact (variant), unaffected
		/*	var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		var page1Uuid = body.$uuid;
		nonAffectedQueryPageUuid = page1Uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page3",
			application: {$uuid: applicationId},
			representation: "group",
			facet: "$query",
			variant: "compact",
			content: {
				"testName": "UnaffectedQueryCompactPage",
				"$category": "tabs",
				"$items": [{
					"$title": "Default vertical grid"
				}, "$testEscape", 5]
			},
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create page query compact ok");
		*/
		// create a page affected to the roles Jedi and Padawan
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		var page2Uuid = body.$uuid;
		jediPadawanPageUuid = page2Uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page4",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$query",
			content: "{ \"testName\": \"JediPadawanPage\", \"$category\": \"tabs\", \"$items\": [{ \"$title\": \"Jedi and Padawan Page\"	}, \"$testEscape\", 5]}",
			roles: [{
				$uuid: _findUuid(roles, "description", "Jedi"),
				$index: 0
			}, {
				$uuid: _findUuid(roles, "description", "Padawan"),
				$index: 1
			}],
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create page 2 ok");
		tracer && tracer("before body (807): " + sys.inspect(body));
		body = put(_, cookie, "pageDefs('" + groupQueryPageUuid + "')", {
			variants: [{
				$uuid: uuid.generate(),
				roles: [{
					$uuid: _findUuid(roles, "description", "Jedi")
				}, {
					$uuid: _findUuid(roles, "description", "Padawan")
				}],
				pageData: {
					$uuid: jediPadawanPageUuid
				},
				$index: 0
			}]
		}, 200);
		tracer && tracer("body (807): " + sys.inspect(body));
		// create a page affected to Yoda and Luke
		var body = post(_, cookie, "pageDatas/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		var page2Uuid = body.$uuid;
		yodaLuskyPageUuid = page2Uuid;
		var data = {
			$key: body.$uuid,
			$etag: body.$etag,
			//
			title: "page5",
			application: {
				$uuid: applicationId
			},
			representation: "group",
			facet: "$query",
			content: "{ \"testName\": \"YodaLuskyPage\", \"$category\": \"tabs\", \"$items\": [{ \"$title\": \"Yoda and Lusky Page\"	}, \"$testEscape\", 5]}",
			users: [{
				$uuid: _findUuid(users, "login", "yoda")
			}, {
				$uuid: _findUuid(users, "login", "lusky")
			}],
			//
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};
		body = put(_, cookie, body.$url, data, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "create page 3 ok");
		body = put(_, cookie, "pageDefs('" + groupQueryPageUuid + "')", {
			variants: [{
				$uuid: uuid.generate(),
				users: [{
					$uuid: _findUuid(users, "login", "yoda")
				}, {
					$uuid: _findUuid(users, "login", "lusky")
				}],
				pageData: {
					$uuid: yodaLuskyPageUuid
				},
				$index: 1
			}]
		}, 200);
		//
	});

	it('connect without role', function(_) {
		function _addRoleToGroup(_, role, group) {
			var groupUuid = _findUuid(groups, "description", group);
			// Fetch user WC
			var body = put(_, cookie, "groups('" + groupUuid + "')", {
				role: {
					$uuid: _findUuid(roles, "description", role)
				}
			});
		}
		var testcookie = getCookie(_, "yoda", "yoda", 401);
		_addRoleToGroup(_, "Master Jedi", "Universe");
		testcookie = getCookie(_, "yoda", "yoda", 200);

	});

	it('test page fetch', function(_) {
		requestCount++;
		var body;
		// page fetch for yoda : must get yodaLuskyPageUuid
		cookie = getCookie(_, "yoda", "yoda");
		tracer && tracer("page fetch test: 1");
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$query,$page')?role=" + _findUuid(roles, "description", "Master Jedi"), 200);
		tracer && tracer("page fetch test: 2");
		strictEqual(body.testName, "YodaLuskyPage", "YodaLuskyPage fetch ok");
		// page fetch for owken : must get JediPadawanPage
		cookie = getCookie(_, "owken", "owken");
		tracer && tracer("page fetch(679)");
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$query,$page')?role=" + _findUuid(roles, "description", "Jedi"), 200);
		strictEqual(body.testName, "JediPadawanPage", "JediPadawanPage fetch ok");
		tracer && tracer("page fetch(682) body: " + sys.inspect(body));
		// page fetch for owken : must get UnaffectedPage has no role
		cookie = getCookie(_, "rex", "rex");
		tracer && tracer("page fetch(826)");
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$details,$page')", 200);
		strictEqual(body.testName, "UnaffectedPage", "UnaffectedPage fetch ok");
		tracer && tracer("page fetch(829) body: " + sys.inspect(body));
		body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$query,$page')", 200);
		strictEqual(body.testName, "UnaffectedQueryPage", "UnaffectedQueryPage fetch ok");
		//	body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$query.compact,$page')", 200);
		//	strictEqual(body.testName, "UnaffectedQueryCompactPage", "UnaffectedQueryPage compact fetch ok");
		// missing variant, must get an empty page
		//	body = get(_, cookie, "pages('syracuse.collaboration.mongodb_admin_test.group.$query.extended,$page')", 200);
		//	equal(body.testName, null, "UnaffectedQueryPage extended fetch ok");
		//	tracer && tracer("body: " + sys.inspect(body, null, 4));
		//
	});

	it('Dashboards fetch test', function(_) {
		var body;
		//
		cookie = getCookie(_, "yoda", "yoda");
		// get user profile
		var resp = post(_, cookie, "userProfiles/$template/$workingCopies?representation=userProfile.$edit&trackingId=" + uuid.generate(), {}, 201, true);
		var profileUrl = resp.body.$url;
		tracer && tracer("profile url (861): " + profileUrl);
		// ensure user profile endpoint is null
		resp = put(_, cookie, profileUrl, {
			$etag: resp.body.$etag,
			selectedEndpoint: null,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200, true);
		// APPLICATION AFFECT TEST
		var app = adminHelper.getApplication(_, "syracuse", "collaboration");
		ok(app != null, "Admin Application fetch ok");
		var app1uuid = app.$uuid;
		app = adminHelper.getApplication(_, "x3", "erp");
		ok(app != null, "X3 Application fetch ok");
		var app2uuid = app.$uuid;
		// dahsboard variants selection by endpoint:
		// if an endpoint is selected in user profile: choose the variant with the same application or with "allApplications". best score for AllApplications
		// if NO endpoint is selected in user profile: best score for "allApplications"
		var v1uuid = helpers.uuid.generate();
		var v2uuid = helpers.uuid.generate();
		var v3uuid = helpers.uuid.generate();
		body = post(_, cookie, "dashboardDefs", {
			dashboardName: "d1",
			title: "d1",
			variants: [{
				$uuid: v1uuid,
				code: "v1",
				application: {
					$uuid: app1uuid
				}
			}, {
				$uuid: v2uuid,
				code: "v2",
				application: {
					$uuid: app2uuid
				}
			}, {
				$uuid: v3uuid,
				code: "v3",
				allApplications: true
			}]
		}, 201);
		// profile has no selected EP, variant should be v3
		body = get(_, cookie, "pages('syracuse.collaboration.syracuse.d1.$dashboard,$page')", 200);
		tracer && tracer("body (906):" + sys.inspect(body, null, 4));
		// check variant uuid
		ok(true, "Deactivated test");
		//	strictEqual(body.$authorUrl, baseUrl + contractUrl + "dashboardAuths('" + v3uuid + "')/$workingCopies?representation=dashboardAuth.$edit", "Got Variant 3 ok");
		// select a syracuse type endpoint
		resp = put(_, cookie, profileUrl, {
			$etag: resp.body.$etag,
			selectedEndpoint: {
				$uuid: _findUuid(endPoints, "description", "Coruscant")
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200, true);
		tracer && tracer("body (923):" + sys.inspect(body));
		body = get(_, cookie, "pages('syracuse.collaboration.syracuse.d1.$dashboard,$page')", 200);
		// check variant uuid
		strictEqual(body.$authorUrl, baseUrl + contractUrl + "dashboardAuths('" + v1uuid + "')/$workingCopies?representation=dashboardAuth.$edit&pageContext=syracuse.collaboration.syracuse.d1.$dashboard&device=desktop", "Got Variant 1 ok");
		//
		// ROLES TEST
		//
	});

	it('user profile test', function(_) {
		// language part========
		cookie = getCookie(_, "yoda", "yoda");
		// accept language should be from default language
		strictEqual(acceptLanguage.toLowerCase(), "fr", "Accept language after first connect test");
		// get userProfile WC
		var resp = post(_, cookie, "userProfiles/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201, true);
		tracer && tracer("userProfile.body: " + sys.inspect(resp, null, 4));
		// should get http header locale (fr-FR)
		strictEqual(resp.body.selectedLocale.code.toLowerCase(), "fr-fr", "Default locale from header ok");
		strictEqual(resp.headers["content-language"].toLowerCase(), "fr", "Content-Language ok");
		// check application prototype "title"
		var body = get(_, cookie, "$prototypes('application.$detail')", 200);
		tracer && tracer("userProfile.body (2): " + sys.inspect(body, null, 4));
		strictEqual(body.$properties.contract.$title, "Contrat", "'Contrat' title ok");
		// get locale en-US
		body = get(_, cookie, "localePreferences?representation=localePreference.$query&where=" + encodeURIComponent("(code eq \"en-US\")"), 200);
		tracer && tracer("userProfile.body (3): " + sys.inspect(body, null, 4));
		// set lang en-US
		resp = put(_, cookie, resp.body.$url, {
			selectedLocale: {
				$uuid: body.$resources[0].$uuid
			},
			$etag: resp.body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200, true);
		strictEqual(resp.body.selectedLocale.code, "en-US", "Locale changed ok");
		strictEqual(resp.headers["content-language"].toLowerCase(), "en-us", "Locale header ok");
		acceptLanguage = "en-us";
		// check application prototype "title"
		var body = get(_, cookie, "$prototypes('application.$detail')", 200);
		tracer && tracer("userProfile.body (4): " + sys.inspect(body, null, 4));
		strictEqual(body.$properties.contract.$title, "Contract name", "'Contract' title ok");
		// add personalized locales to rex
		tracer && tracer("add locales to rex (982)");
		var locId = uuid.generate();
		body = put(_, cookie, "users('" + _findUuid(users, "login", "rex") + "')", {
			locales: [{
				$uuid: locId,
				code: "fr-FR",
				shortDate: "yyyy/MM/dd",
				numberDecimalSeparator: ",",
				numberGroupSeparator: " ",
				numberGroupSize: 3
			}]
		}, 200);
		// must modify because of the propagate on "code" which will override the settings
		// !! should also fix this behaviour
		body = put(_, cookie, "users('" + _findUuid(users, "login", "rex") + "')", {
			locales: [{
				$uuid: locId,
				shortDate: "yyyy/MM/dd"
			}]
		}, 200);
		//	body = get(_, cookie, "users('"+_findUuid(users, "login", "rex")+"')?representation=user.$details", 200);
		tracer && tracer("userProfile.body (5): " + sys.inspect(body, null, 6));
		cookie = getCookie(_, "rex", "rex");
		// get userProfile WC
		var resp = post(_, cookie, "userProfiles/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201, true);
		tracer && tracer("userProfile.body (6): " + sys.inspect(resp, null, 4));
		// should get http header locale (fr-FR)
		strictEqual(resp.body.selectedLocale.code, "fr-FR", "Default locale from header ok");
		strictEqual(resp.body.selectedLocale.shortDate, "yyyy/MM/dd", "Locale short date ok");
		// change language test
		tracer && tracer("userProfile before create (993)");
		var resp = post(_, cookie, "userProfiles/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201, true);
		var profileUrl = resp.body.$url;
		var resp = put(_, cookie, profileUrl, {
			selectedLocale: {
				$url: contractUrl + "localePreferences(code eq \"en-US\")"
			}
		}, 200, true);
		var body = get(_, cookie, resp.body.$url);
		tracer && tracer("userProfile before after (999): " + sys.inspect(body, null, 4));
		strictEqual(body.selectedLocale.code, "en-US", "Locale set as en-US ok");

	});

	it('group add passing a code (error mngmt)', function(_) {
		cookie = getCookie(_, "yoda", "yoda");
		var body = put(_, cookie, "users('" + _findUuid(users, "login", "rex") + "')", {
			groups: [{
				description: "notAllowed",
				$index: 0
			}]
		});
		tracer && tracer("errors test (1029): " + sys.inspect(body, null, 6));
		strictEqual(body.$properties.groups.$diagnoses[0].$severity, "warning", "Group update got warning ok");
		var body = put(_, cookie, "users('" + _findUuid(users, "login", "rex") + "')", {
			groups: [{
				description: "Universe",
				$index: 0
			}]
		});
		tracer && tracer("errors test (1036): " + sys.inspect(body, null, 6));
		strictEqual(body.groups.filter(function(gg) {
			return gg.description === "Universe";
		})[0].description, "Universe", "Group Universe added");
		// reference by $value test
		var body = put(_, cookie, "groups('" + _findUuid(groups, "description", "Universe") + "')", {
			role: {
				description: "Jedi"
			}
		});
		tracer && tracer("errors test (1046): " + sys.inspect(body, null, 6));
		strictEqual(body.role.description, "Jedi", "Role Jedi set by $value ok");

	});

	it('Scheduler test', function(_) {
		ok(true, "NYI");
	});

	it('logout test', function(_) {
		ok(true, "NYI");
	});
});