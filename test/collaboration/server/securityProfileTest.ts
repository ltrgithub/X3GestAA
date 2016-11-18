"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../../../src/orm/dataModel");
var registry = require("../../../../src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var sys = require("util");
var factory = require("../../../../src/orm/factory");
var jsonImport = require("syracuse-import/lib/jsonImport");
var jsonExport = require("syracuse-import/lib/jsonExport");
var datetime = require('@sage/syracuse-core').types.datetime;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

import {
	assert
} from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	//force basic auth
	config.session = config.session || {};
	config.session.auth = "basic";
	//no integration server
	config.integrationServer = null;

	helpers.pageFileStorage = false;

	var tracer; // = console.error;

	var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_demo");
	//
	var requestCount = 0;
	var MAX_REQUESTS = 11;

	var port = (config.unit_test && config.unit_test.serverPort) || 3004;
	var baseUrl = "http://localhost:" + port;
	var contractUrl = "/sdata/syracuse/collaboration/mongodb_demo/";
	var acceptLanguage = "fr,fr-fr";

	var cookie = "";
	var x3sId;
	var applicationId;
	var adminEp;

	function _getModel() {
		return dataModel.make(registry.applications.syracuse.contracts.collaboration, "mongodb_demo");
	}

	function get(_, cookie, url, statusCode, fullResponse) {
		return testAdmin.get(_, cookie, url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, statusCode, fullResponse);
	}

	function post(_, cookie, url, data, statusCode, fullResponse) {
		return testAdmin.post(_, cookie, url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, data, statusCode, fullResponse);
	}

	function put(_, cookie, url, data, statusCode, fullResponse) {
		return testAdmin.put(_, cookie, url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, data, statusCode, fullResponse);
	}

	function del(_, cookie, url, statusCode, fullResponse) {
		return testAdmin.del(_, cookie, url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, statusCode, fullResponse);
	}


	var franceID = "";
	var usID = "";
	var printUuid = "";

	it("init database", function(_) {
		var server = new mongodb.Server(endPoint.datasets["mongodb_demo"].hostname, endPoint.datasets["mongodb_demo"].port, {});
		var db = testAdmin.newMongoDb(endPoint.datasets["mongodb_demo"].database, server, {});
		db = db.open(_);
		db.dropDatabase(_);

		ok(true, "mongodb initialized");

	});

	//start syracuse server
	it("initialize syracuse test server", function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");

	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	var limitedProfile = null;

	it("data setup", function(_) {
		tracer && tracer("(103) data setup enter");
		var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_demo);
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "syracuse-admin-demo.json", {
			$diagnoses: diag
		});
		ok(onlyInfo(diag), "Demo database import ok");
		// endpoint
		var ep = db.fetchInstance(_, db.getEntity(_, "endPoint"), {
			jsonWhere: {
				dataset: "syracuse"
			}
		});
		ep.dataset(_, "mongodb_demo");
		ep.save(_);
		// roles
		var guestRole = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: "Guest"
			}
		});
		var superRole = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: "Super administrator"
			}
		});
		ok(guestRole != null, "Guest role fetch ok");
		ok(superRole != null, "Super role fetch ok");
		// check groups
		// create some security profiles
		var p = db.getEntity(_, "securityProfile").createInstance(_, db);
		p.code(_, "full");
		p.description(_, "full");
		p.securityLevel(_, 0);
		p.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			it.canCreate(_, true);
			it.canRead(_, true);
			it.canWrite(_, true);
			it.canDelete(_, true);
			it.canExecute(_, true);
		});
		p.roles(_).set(_, superRole);
		p.save(_);
		var p = limitedProfile = db.getEntity(_, "securityProfile").createInstance(_, db);
		p.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			// can acces "myProfile"
			if (it.code(_) === "myProfile") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, true);
			}
		});
		p.code(_, "none");
		p.description(_, "none");
		p.roles(_).set(_, guestRole);
		p.save(_);


	});

	it("read restrictions tests", function(_) {
		var cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		tracer && tracer("before get guest (142)");
		var body = get(_, cookie, "users(login eq \"guest\")?representation=user.$details", 200);
		tracer && tracer("after get guest (144)");
		strictEqual(body.login, "guest", "Guest user fetched for admin ok");
		ok(body.groups && body.groups.some(function(g) {
			return g.description === "Guests";
		}), "Guest user fetched for admin ok (2)");

		cookie = testAdmin.getCookie(_, baseUrl, "guest", "guest");
		tracer && tracer("before get guest (157)");
		var resp = get(_, cookie, "users(login eq \"admin\")?representation=user.$details", 403, true);
		tracer && tracer("after get guest (159)" + sys.inspect(resp, null, 6));
		strictEqual(resp.statusCode, 403, "Admin user not found for guest ok");
		body = get(_, cookie, "users(login eq \"guest\")?representation=user.$details", 200);
		strictEqual(body.login, "guest", "Guest user found for guest ok");
		body = get(_, cookie, "users('" + body.$uuid + "')?representation=user.$details", 200);
		strictEqual(body.login, "guest", "Guest user found by uuid for guest ok");
		ok(body.groups == null, "Guest cannot read groups ok");


	});

	it("create restrictions tests", function(_) {
		// full rights user - should pass
		var cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		// try to create a group, should get 201
		var body = post(_, cookie, "groups", {
			$uuid: helpers.uuid.generate(),
			description: "Should pass"
		}, 201);
		// try to create a group wc, should get 201
		var body = post(_, cookie, "groups/$template/$workingCopies", {
			$uuid: helpers.uuid.generate(),
			description: "Should pass 1"
		}, 201);
		// DATA SETUP: allow limited profile to read users but not to create
		limitedProfile.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			// can acces "myProfile"
			if (it.code(_) === "users") {
				it.canCreate(_, false);
				it.canRead(_, true);
				it.canWrite(_, false);
				it.canDelete(_, false);
				it.canExecute(_, false);
			}
		});
		limitedProfile.save(_);
		// limited rights user - should fail
		cookie = testAdmin.getCookie(_, baseUrl, "guest", "guest");
		// get a query, "create" links should be masked
		body = get(_, cookie, "groups?representation=group.$query", 200);
		strictEqual(body.$links && body.$links.$create && body.$links.$create.$isHidden, true, "$create link hidden ok");
		// try to create a group, should return 403
		body = post(_, cookie, "groups", {
			$uuid: helpers.uuid.generate(),
			description: "Should fail"
		}, 403);
		// try to create a group wc, should return 403
		body = post(_, cookie, "groups/$template/$workingCopies", {
			$uuid: helpers.uuid.generate(),
			description: "Should fail"
		}, 403);


	});

	it("update restrictions tests", function(_) {
		// full rights user - should pass
		var cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		// add a group to user import, should pass
		var body = put(_, cookie, "users(login eq 'import')?representation=user.$edit", {
			groups: [{
				description: "Overseas CFO",
				$index: 0
			}]
		}, 200);
		// check group added
		tracer && tracer("body (247): " + sys.inspect(body, null, 4));
		body = get(_, cookie, "users(login eq 'import')?representation=user.$details", 200);
		tracer && tracer("body (232): " + sys.inspect(body, null, 4));
		ok(body.groups.some(function(g) {
			return g.description === "Overseas CFO";
		}), "Group added ok");
		// add a group using working copy, should pass
		//  tracer && tracer("(237)");
		body = post(_, cookie, "users(login eq 'import')/$workingCopies?representation=user.$edit", {
			groups: [{
				description: "Overseas auditors",
				$index: 1
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 201);
		// check group added
		body = get(_, cookie, "users(login eq 'import')?representation=user.$edit", 200);
		ok(body.groups.some(function(g) {
			return g.description === "Overseas auditors";
		}), "Group added ok (wc)");
		//
		// limited rights user - should fail
		cookie = testAdmin.getCookie(_, baseUrl, "guest", "guest");
		// cannot modify class group at all
		//  tracer && tracer("before modify group (256)");
		body = put(_, cookie, "groups(description eq 'Overseas CFO')?representation=group.$edit", {
			description: "My CFO"
		}, 403);
		//  tracer && tracer("body (259): "+sys.inspect(body, null, 4));
		//
		body = put(_, cookie, "users(login eq 'import')?representation=user.$edit", {
			groups: [{
				description: "Overseas accountants",
				$index: 2
			}]
		}, 403);
		// check group NOT added
		body = get(_, cookie, "users(login eq 'import')?representation=user.$details", 200);
		//  tracer && tracer("body (264): "+sys.inspect(body, null, 4));
		ok(!body.groups || body.groups.every(function(g) {
			return g.description !== "Overseas accountants";
		}), "Group NOT added ok");
		// add a group using working copy, should fail
		tracer && tracer("(267)");
		body = post(_, cookie, "users(login eq 'import')/$workingCopies?representation=user.$edit", {
			groups: [{
				description: "French CFO",
				$index: 1
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 403);
		//  tracer && tracer("body (285): "+sys.inspect(body, null, 4));
		// check group added
		body = get(_, cookie, "users(login eq 'import')?representation=user.$edit", 200);
		ok(!body.groups || body.groups.every(function(g) {
			return g.description !== "French CFO";
		}), "Group NOT added ok (2)");
		// I can modify my own firstName
		body = put(_, cookie, "users(login eq 'guest')?representation=user.$edit", {
			firstName: "New Guest Name"
		}, 200);
		body = get(_, cookie, "users(login eq 'guest')?representation=user.$edit", 200);
		strictEqual(body.firstName, "New Guest Name", "Changed own firstName Ok");

		// Add a group to guest by guest must return 403 with diagnoses because we ask to save the working copy
		body = post(_, cookie, "users(login eq 'guest')/$workingCopies?representation=user.$edit", {
			groups: [{
				description: "French CFO",
				$index: 1
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 403);
		// Add a group to guest by guest must return 201 because we keep it in memory and don't ask to save it.
		body = post(_, cookie, "users(login eq 'guest')/$workingCopies?representation=user.$edit", {
			groups: [{
				description: "French CFO",
				$index: 1
			}]
		}, 201);
		// check group added
		body = get(_, cookie, "users(login eq 'guest')?representation=user.$edit", 200);
		ok(body.groups.every(function(g) {
			return g.description !== "French CFO";
		}), "Group NOT added ok (3)");
		// get a query, "edit" and "save" links should be masked in $resources
		body = get(_, cookie, "groups?representation=group.$query", 200);
		tracer && tracer("body (312): " + sys.inspect(body, null, 4));
		var links = body.$resources && body.$resources[0] && body.$resources[0].$links;
		strictEqual(links && links.$edit && links.$edit.$isHidden, true, "$edit link hidden in $query ok");
		var actions = body.$resources && body.$resources[0] && body.$resources[0].$actions;
		strictEqual(actions && actions.$save && actions.$save.$isHidden, true, "$save link hidden in $query ok");
		// get a group, "edit" and "save" links should be masked in $resources
		body = get(_, cookie, "groups(description eq 'French CFO')?representation=group.$details", 200);
		links = body.$links;
		strictEqual(links && links.$edit && links.$edit.$isHidden, true, "$edit link hidden in $details ok");
		actions = body.$actions;
		strictEqual(actions && actions.$save && actions.$save.$isHidden, true, "$save link hidden in $details ok");


	});

	it("delete restrictions tests", function(_) {
		// full rights user - should pass
		var cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		// create a group
		var body = post(_, cookie, "groups", {
			description: "Expendable"
		}, 201);
		// ensure group is there
		body = get(_, cookie, "groups(description eq 'Expendable')", 200);
		// delete a group: should pass
		body = del(_, cookie, "groups(description eq 'Expendable')", 200);
		// check if deleted
		body = get(_, cookie, "groups(description eq 'Expendable')", 404);

		// create a group for guest test
		body = post(_, cookie, "groups", {
			description: "Expendable"
		}, 201);

		// limited rights user - should fail
		cookie = testAdmin.getCookie(_, baseUrl, "guest", "guest");
		// ensure group is there
		body = get(_, cookie, "groups(description eq 'Expendable')", 200);
		// delete a group: should fail
		body = del(_, cookie, "groups(description eq 'Expendable')", 403);
		// check if deleted: must still be there
		body = get(_, cookie, "groups(description eq 'Expendable')", 200);


	});

	it("Execute user rights test", function(_) {
		// full user rights - should pass
		var cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		// dataset operation call test
		var body = post(_, cookie, "$import", {
			$prototypes: {},
			$items: []
		}, 201);
		// entity service test
		body = post(_, cookie, "importTools/$template/$workingCopies", {
			importSrc: "file",
			fileName: "syracuse-admin-menu.json",
			endpoint: {
				description: "Syracuse administration"
			},
			$actions: {
				import: {
					$isRequested: true
				}
			}
		}, 201);
		tracer && tracer("body (385): " + sys.inspect(body, null, 4));
		ok(onlyInfo(body.$diagnoses), "Import executed ok");

		// create a dummy export profile
		body = post(_, cookie, "exportProfiles", {
			code: "TEST",
			description: "TEST",
			application: {
				description: "Syracuse Collaboration"
			},
			endpoint: {
				description: "Syracuse administration"
			}
		}, 201);
		// DATA SETUP: allow limited profile to create in import not to execute
		limitedProfile.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			// can acces "myProfile"
			if (it.code(_) === "importData") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, false);
			}
			if (it.code(_) === "exportData") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, false);
			}
		});
		limitedProfile.save(_);
		// limited user rights - should fail
		cookie = testAdmin.getCookie(_, baseUrl, "guest", "guest");
		// dataset operation call test
		body = post(_, cookie, "$import", {
			$prototypes: {},
			$items: []
		}, 403);
		// entity service test
		body = post(_, cookie, "importTools/$template/$workingCopies", {
			fileName: "syracuse-admin-menu.json",
			endpoint: {
				description: "Syracuse administration"
			},
			$actions: {
				import: {
					$isRequested: true
				}
			}
		}, 201);
		//  tracer && tracer("body (406): "+sys.inspect(body, null, 4));
		ok(body.$actions && body.$actions.import && body.$actions.import.$diagnoses && body.$actions.import.$diagnoses[0] && (body.$actions.import.$diagnoses[0].$severity === "error"), "Import error ok");
		// call as a service, must get 403
		body = get(_, cookie, "exportProfiles(code eq \"TEST\")/$service/exportProfile", 403);
		//  tracer && tracer("body (449): "+sys.inspect(body, null, 4));


	});
});