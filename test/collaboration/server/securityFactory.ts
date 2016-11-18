"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var config = require('syracuse-main/lib/nodeconfig').config; // must be first syracuse require
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var jsonImport = require("syracuse-import/lib/jsonImport");
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;

helpers.pageFileStorage = false;

var tracer; // = console.log;

var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_demo");

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;

function _getModel() {
	return dataModel.make(registry.applications.syracuse.contracts.collaboration, "mongodb_demo");
}

function get(_, cookie, url, statusCode, fullResponse) {
	return testAdmin.get(_, cookie, url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, statusCode, fullResponse);
}

function post(_, cookie, url, data, statusCode, fullResponse) {
	return testAdmin.post(_, cookie, url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, data, statusCode, fullResponse);
}

function put(_, cookie, url, data, statusCode, fullResponse) {
	return testAdmin.put(_, cookie, url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, data, statusCode, fullResponse);
}

function del(_, cookie, url, statusCode, fullResponse) {
	return testAdmin.del(_, cookie, url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, statusCode, fullResponse);
}

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('init database', function(_) {
		var server = new mongodb.Server(endPoint.datasets["mongodb_demo"].hostname, endPoint.datasets["mongodb_demo"].port, {});
		var db = testAdmin.newMongoDb(endPoint.datasets["mongodb_demo"].database, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		ok(true, "mongodb initialized");
	});

	//start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	var secondEntity = {
		$titleTemplate: "Unit test second entity",
		$valueTemplate: "{id}",
		$allowFactory: true,
		$factoryIncludes: ["id", "sp"],
		$properties: {
			id: {
				$title: "Id",
				$isUnique: true
			},
			sp: {
				$title: "Property 1"
			},
			spA: {
				$title: "Property 2"
			}
		}
	};
	var mainEntity = {
		$allowFactory: true,
		$factoryExcludes: ["mpA"],
		$titleTemplate: "Unit test main entity",
		$valueTemplate: "{id}",
		$properties: {
			id: {
				$title: "Id",
				$isUnique: true
			},
			mp: {
				$title: "Property 1"
			},
			mpA: {
				$title: "Property 2"
			},
		},
		$relations: {
			secondChild: {
				$title: "Child",
				$type: "second",
				$isChild: true
			},
			secondChildA: {
				$title: "ChildA",
				$type: "second",
				$isChild: true
			},
			secondRel: {
				$title: "Relation",
				$type: "second",
			},
			secondRelA: {
				$title: "RelationA",
				$type: "second",
			},
			secondChildren: {
				$title: "Child",
				$type: "seconds",
				$isChild: true
			},
			secondRels: {
				$title: "Relation",
				$type: "seconds",
			}
		}
	};

	it('register test entities', function() {
		var model = registry.getContract('syracuse', 'collaboration').models.all;
		var entities = {
			main: mainEntity,
			second: secondEntity
		};
		model.registerEntities(entities);
		ok(Object.keys(model.entities).indexOf("main") !== -1 && Object.keys(model.entities).indexOf("second") !== -1, "Fake entities registered");
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	function fetchUser(_, db, login) {
		var user = db.fetchInstance(_, db.getEntity(_, "user"), {
			jsonWhere: {
				login: login
			}
		});
		ok(user != null, login + " user fetch ok");
		user._oldPwdSet = true;
		user.password(_, testAdmin.encodePassword(login, login));
		user.save(_);
		return user;
	}

	//cookies map
	var cookies = {};
	//users
	var users = {};

	it('data setup', function(_) {
		var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_demo);
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "syracuse-admin-demo.json", {
			$diagnoses: diag
		});
		console.log("import demo db diags (134): " + JSON.stringify(diag, null, 2));
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
		var partnerRole = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: "Partner"
			}
		});
		var superRole = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: "Super administrator"
			}
		});
		var guestRole = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: "Endpoint administrator"
			}
		});
		ok(partnerRole != null, "Partner role fetch ok");
		ok(superRole != null, "Admin role fetch ok");
		ok(guestRole != null, "Guest role fetch ok");


		// users
		// admin has Sage factory profile
		users.admin = fetchUser(_, db, "admin");
		// admin has Partner factory profile
		users.partner = fetchUser(_, db, "partner");
		// admin has User factory profile
		users.guest = fetchUser(_, db, "phgat");

		// create some security profiles
		function createFullSecurityProfile(_, id, authLevel, role) {
			var p = db.getEntity(_, "securityProfile").createInstance(_, db);
			p.code(_, id);
			p.description(_, id);
			p.authoringLevel(_, "admin");
			if (authLevel === "sage") p.sageOwner(_, true);
			if (authLevel === "partner") p.factoryOwner(_, PARTNERID);
			p.profileItems(_).toArray(_).forEach_(_, function(_, it) {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, true);
			});
			p.roles(_).set(_, role);
			p.save(_);
		}

		createFullSecurityProfile(_, "Sage", "sage", superRole);
		createFullSecurityProfile(_, "Partner", "partner", partnerRole);
		createFullSecurityProfile(_, "User", "user", guestRole);

		// Init sessions
		cookies.admin = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		cookies.partner = testAdmin.getCookie(_, baseUrl, "partner", "partner");
		cookies.guest = testAdmin.getCookie(_, baseUrl, "phgat", "phgat");

	});

	var PARTNERID = "UNITTEST INC.";
	var seconds = {};
	var mains = {};
	it('data initialization', function(_) {

		var second = {
			id: "second1",
			sp: "Prop 1",
			spA: "Prop 2",
			$factory: true
		};
		// try to create a second instance with user that have Sage factory profile
		var body = post(_, cookies.admin, "seconds", second, 201);
		seconds.second1 = body && body.$uuid;
		ok(onlyInfo(body.$actions.$save.$diagnoses), "'Second' instance creation allowed with Sage factory profile OK");

		// try to create a second instance with user that have Partner factory profile
		second.id = "second2";
		second.$factory = true;
		body = post(_, cookies.partner, "seconds", second, 201);
		seconds.second2 = body && body.$uuid;
		ok(onlyInfo(body.$actions.$save.$diagnoses), "'Second' instance creation allowed with Partner factory profile OK");

		// try to create a third instance with user that have User factory profile (with $factory)
		second.id = "second3";
		body = post(_, cookies.guest, "seconds", second, 400);
		ok(!onlyInfo(body.$diagnoses), "'Second' instance creation rejected with User factory profile ($factory = true) OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		// try to create a third instance with user that have User factory profile (without $factory)
		second.id = "second3";
		delete second.$factory;
		body = post(_, cookies.guest, "seconds", second, 201);
		seconds.second3 = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "'Second' instance creation allowed with User factory profile OK");
		ok(onlyInfo(body.$actions.$save.$diagnoses), "'Second' instance creation allowed with User factory profile OK");

		var prop1 = "Prop 1";
		var prop2 = "Prop 2";

		var childSp = "child prop 1";
		var childSpA = "child prop 2";
		var childASp = "childA prop 1";
		var childASpA = "childA prop 2";
		var main = {
			id: "main1",
			mp: prop1,
			mpA: prop2,
			$factory: true,
			secondRel: {
				$uuid: seconds.second1
			},
			secondRelA: {
				$uuid: seconds.second1
			},
			secondChild: {
				sp: childSp,
				spA: childSpA
			},
			secondChildA: {
				sp: childASp,
				spA: childASpA
			},
		};
		// try to create a main instance with user that have Sage factory profile
		body = post(_, cookies.admin, "mains", main, 201);
		console.log("BODY: " + JSON.stringify(body, null, 2));
		mains.main1 = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "'Main' instance creation allowed with Sage factory profile OK");
		strictEqual(body.$factory, true, "Factory property set OK");
		strictEqual(body.$factoryOwner, "SAGE", "Factory owner property set (" + body.$factoryOwner + ") OK");
		strictEqual(body.mp, prop1, "Modify property 1 OK");
		strictEqual(body.mpA, prop2, "Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second1, "Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second1, "Modify singular relation (factory allowed) OK");
		strictEqual(body.secondChild.sp, childSp, "Modify singular child relation property OK");
		strictEqual(body.secondChild.spA, childSpA, "Modify singular child relation property (factory allowed) OK");
		strictEqual(body.secondChildA.sp, childASp, "Modify singular child relation (factory allowed) property OK");
		strictEqual(body.secondChildA.spA, childASpA, "Modify singular child relation (factory allowed) property (factory allowed) OK");

		// try to create a main instance with user that have Partner factory profile
		main.id = "main2";
		body = post(_, cookies.partner, "mains", main, 201);
		mains.main2 = body && body.$uuid;
		ok(onlyInfo(body.$actions.$save.$diagnoses), "'Main' instance creation allowed with Sage factory profile OK");
		strictEqual(body.$factory, true, "Factory property set OK");
		strictEqual(body.$factoryOwner, PARTNERID, "Factory owner property set (" + body.$factoryOwner + ") OK");


		// try to create a main instance with user that have Partner factory profile
		delete main.$factory;
		delete main.secondChild.$factory;
		main.id = "main3";
		body = post(_, cookies.guest, "mains", main, 201);
		mains.main3 = body && body.$uuid;
		ok(onlyInfo(body.$actions.$save.$diagnoses), "'Main' instance creation allowed with User factory profile OK");
		strictEqual(body.$factory, undefined, "Factory property not set OK");
		strictEqual(body.$factoryOwner, undefined, "Factory owner property not set OK");

	});

	function traceBody(body) {
		console.log("Body: " + JSON.stringify(body, null, 2));
	}

	it('Orm check/uncheck factory behavior', function(_) {

		var cookie = cookies.admin;


		var body = post(_, cookie, "applications?representation=application.$edit", {
			application: "test",
			contract: "test",
			description: "test"
		}, 201);

		body = get(_, cookie, "applications('" + body.$uuid + "')?representation=application.$details", 200);
		strictEqual(body.application, "test", "Application OK");
		strictEqual(body.contract, "test", "Contract OK");
		strictEqual(body.description, "test", "Contract OK");
		strictEqual(body.$factory, undefined, "Factory undefined OK");
		strictEqual(body.$fatoryOwner, undefined, "Factory Owner undefined OK");

		body = put(_, cookie, "applications('" + body.$uuid + "')?representation=application.$edit", {
			$factory: true,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		strictEqual(body.$factory, true, "Factory set OK");
		strictEqual(body.$factoryOwner, "SAGE", "Factory Owner set OK");


		body = put(_, cookie, "applications('" + body.$uuid + "')?representation=application.$edit", {
			$factory: false,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		strictEqual(body.$factory, false, "Factory unset OK");
		strictEqual(body.$factoryOwner, null, "Factory Owner unset OK");


		// check with orm to be sure of mongodb value!!!
		var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_demo);
		var _app = db.fetchInstance(_, db.getEntity(_, "application"), {
			jsonWhere: {
				$uuid: body.$uuid
			}
		});
		strictEqual(_app.$factory, false, "Mongo value of Factory unset OK");
		strictEqual(_app.$factoryOwner, null, "Mongo value of Factory Owner unset OK");


	});

	it('Sage factory instance data updates with Sage factory profile', function(_) {

		var cookie = cookies.admin;
		// Sage try to modify factory sage instance
		var prop1 = "Prop 1 modified by Sage";
		var prop2 = "Prop 2 modified by Sage";

		var childSp = "child prop 1 modified by Sage";
		var childSpA = "child prop 2 modified by Sage";
		var childASp = "childA prop 1 modified by Sage";
		var childASpA = "childA prop 2 modified by Sage";
		var body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mp: prop1,
			mpA: prop2,
			secondRel: {
				$uuid: seconds.second2
			},
			secondRelA: {
				$factory: true,
				$uuid: seconds.second2
			},
			secondChild: {
				$factory: true,
				sp: childSp,
				spA: childSpA
			},
			secondChildA: {
				$factory: true,
				sp: childASp,
				spA: childASpA
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);

		body = get(_, cookie, "mains(id eq 'main1')?representation=main.$details", 200);
		strictEqual(body.mp, prop1, "Modify property 1 OK");
		strictEqual(body.mpA, prop2, "Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second2, "Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second2, "Modify singular relation (factory allowed) OK");
		strictEqual(body.secondChild.sp, childSp, "Modify singular child relation property OK");
		strictEqual(body.secondChild.spA, childSpA, "Modify singular child relation property (factory allowed) OK");
		strictEqual(body.secondChildA.sp, childASp, "Modify singular child relation (factory allowed) property OK");
		strictEqual(body.secondChildA.spA, childASpA, "Modify singular child relation (factory allowed) property (factory allowed) OK");

		// ==============================================
		// modify factory sage instance property by delta
		prop1 = "Prop 1 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mp: prop1
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on property1 granted OK");

		prop2 = "Prop 2 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mpA: prop2
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on property2 granted OK");

		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondRel: {
				$uuid: seconds.second3
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation granted OK");

		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondRelA: {
				$uuid: seconds.second3
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK");

		childSp = "child prop 1 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChild: {
				sp: childSp
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK");

		childSpA = "child prop 2 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChild: {
				spA: childSpA
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK");

		childASp = "childA prop 1 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChildA: {
				sp: childASp
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK");

		childASpA = "childA prop 2 modified (delta) by Sage";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChildA: {
				spA: childASpA
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK");

		body = get(_, cookie, "mains(id eq 'main1')?representation=main.$details", 200);
		strictEqual(body.mp, prop1, "DELTA : Modify property 1 OK");
		strictEqual(body.mpA, prop2, "DELTA : Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second3, "DELTA : Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second3, "DELTA : Modify singular relation (factory allowed) OK");
		strictEqual(body.secondChild.sp, childSp, "DELTA : Modify singular child relation property OK");
		strictEqual(body.secondChild.spA, childSpA, "DELTA : Modify singular child relation property (factory allowed) OK");
		strictEqual(body.secondChildA.sp, childASp, "DELTA : Modify singular child relation (factory allowed) property OK");
		strictEqual(body.secondChildA.spA, childASpA, "DELTA : Modify singular child relation (factory allowed) property (factory allowed) OK");

		// ==============================================
		// Same with working copies
		body = post(_, cookie, "mains(id eq 'main1')/$workingCopies?representation=main.$edit?trackingId=" + uuid.generate(), null, 201);
		ok(onlyInfo(body.$diagnoses), "Create working copy on Sage factory instance OK");

		prop1 = "Prop 1 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			mp: prop1
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on property1 granted OK");

		prop2 = "Prop 2 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			mpA: prop2
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on property2 granted OK");

		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondRel: {
				$uuid: seconds.second1
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation granted OK");

		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondRelA: {
				$factory: true,
				$uuid: seconds.second1
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory allowed) granted OK");

		childSp = "child prop 1 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			$uuid: body.secondChild.$uuid,
			secondChild: {
				sp: childSp
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory allowed) granted OK");

		childSpA = "child prop 2 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondChild: {
				spA: childSpA
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory allowed) granted OK");

		childASp = "childA prop 1 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondChildA: {
				sp: childASp
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory allowed) granted OK");

		childASpA = "childA prop 2 modified (wc delta) by Sage";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondChildA: {
				spA: childASpA
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory allowed) granted OK");

		// Save
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Save using working copy OK");

		body = get(_, cookie, "mains(id eq 'main1')?representation=main.$details", 200);
		strictEqual(body.mp, prop1, "WC DELTA : Modify property 1 OK");
		strictEqual(body.mpA, prop2, "WC DELTA : Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second1, "WC DELTA : Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second1, "WC DELTA : Modify singular relation (factory allowed) OK");
		strictEqual(body.secondChild.sp, childSp, "WC DELTA : Modify singular child relation property OK");
		strictEqual(body.secondChild.spA, childSpA, "WC DELTA : Modify singular child relation property (factory allowed) OK");
		strictEqual(body.secondChildA.sp, childASp, "WC DELTA : Modify singular child relation (factory allowed) property OK");
		strictEqual(body.secondChildA.spA, childASpA, "WC DELTA : Modify singular child relation (factory allowed) property (factory allowed) OK");
	});

	it('Sage factory instance data updates with Partner factory profile', function(_) {
		var cookie = cookies.partner;

		var prop1 = "Prop 1 modified by Partner";
		var prop2 = "Prop 2 modified by Partner";
		var childSp = "child prop 1 modified by Partner";
		var childSpA = "child prop 2 modified by Partner";
		var childASp = "childA prop 1 modified by Partner";
		var childASpA = "childA prop 2 modified by Partner";
		var body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mp: prop1,
			mpA: prop2,
			secondRel: {
				$uuid: seconds.second2
			},
			secondRelA: {
				$uuid: seconds.second2
			},
			secondChild: {
				sp: childSp,
				spA: childSpA
			},
			secondChildA: {
				sp: childASp,
				spA: childASpA
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 400);
		ok(!onlyInfo(body.$diagnoses), "One shot update rejected for parter on Sage factory instance (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		// ==============================================
		// Partner try to modify factory sage instance property by delta
		prop1 = "Prop 1 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mp: prop1
		}, 400);
		ok(!onlyInfo(body.$diagnoses), "Delta update on property1 rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		prop2 = "Prop 2 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			mpA: prop2
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on property2 granted OK");

		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondRel: {
				$uuid: seconds.second3
			}
		}, 400);

		ok(!onlyInfo(body.$diagnoses), "Delta update on singular relation rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");
		strictEqual(body.secondRel.$uuid, seconds.second1, "Reject modification on singular relation OK");

		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondRelA: {
				$uuid: seconds.second3
			}
		}, 400);
		ok(!onlyInfo(body.$diagnoses), "Delta update on singular relation (factory protected by SAGE) rejected OK");

		childSp = "child prop 1 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChild: {
				sp: childSp
			}
		}, 400);
		ok(!onlyInfo(body.$diagnoses), "Delta update on singular child relation (factory protected by SAGE) rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		childSpA = "child prop 2 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChild: {
				spA: childSpA
			}
		}, 400);

		ok(!onlyInfo(body.$diagnoses), "Delta update on singular relation (factory allowed) granted OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		childASp = "childA prop 1 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChildA: {
				sp: childASp
			}
		}, 400);
		ok(onlyInfo(body.secondChildA.$diagnoses), "Delta update on singular relation (factory allowed) granted OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		childASpA = "childA prop 2 modified (delta) by Partner";
		body = put(_, cookie, "mains(id eq 'main1')?representation=main.$edit", {
			secondChildA: {
				spA: childASpA
			}
		}, 400);
		ok(!onlyInfo(body.$diagnoses), "Delta update on singular relation (factory protected by SAGE) rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		body = get(_, cookie, "mains(id eq 'main1')?representation=main.$details", 200);
		ok(body.mp !== prop1, "DELTA : Reject modification on property 1 OK");
		strictEqual(body.mpA, prop2, "DELTA : Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second1, "DELTA : Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second1, "DELTA : Modify singular relation (factory allowed) OK");
		ok(body.secondChild.sp !== childSp, "DELTA : Reject modification on singular child relation property OK");
		ok(body.secondChild.spA !== childSpA, "DELTA : Reject modification on singular child relation property (factory allowed) OK");
		ok(body.secondChildA.sp !== childASp, "DELTA : Reject modification on singular child relation (factory allowed) property OK");


		// ==============================================
		// Same with working copies
		body = post(_, cookie, "mains(id eq 'main1')/$workingCopies?representation=main.$edit", {}, 201);
		ok(onlyInfo(body.$diagnoses), "Create working copy on Sage factory instance OK");

		prop1 = "Prop 1 modified (wc delta) by Partner";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			mp: prop1
		}, 200);
		ok(!onlyInfo(body.$diagnoses), "Delta update using working copy on property1 rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		prop2 = "Prop 2 modified (wc delta) by Partner";
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			mpA: prop2
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Delta update on property2 granted thanks to $factoryExcludes OK");

		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondRel: {
				$uuid: seconds.second2
			}
		}, 200);
		ok(!onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");
		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$etag: body.$etag,
			secondRelA: {
				$uuid: seconds.second2
			}
		}, 200);
		ok(!onlyInfo(body.$diagnoses), "Delta update using working copy on singular relation (factory protected by SAGE) rejected OK (" + (body.$diagnoses && body.$diagnoses[0].$message) + ")");

		body = put(_, cookie, "$workingCopies('" + body.$trackingId + "')?representation=main.$edit", {
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Save using working copy OK");


		body = get(_, cookie, "mains(id eq 'main1')?representation=main.$details", 200);
		ok(body.mp !== prop1, "DELTA : Reject modification on property 1 OK");
		strictEqual(body.mpA, prop2, "DELTA : Modify property 2 OK");
		strictEqual(body.secondRel && body.secondRel.$uuid, seconds.second1, "DELTA : Modify singular relation OK");
		strictEqual(body.secondRelA && body.secondRelA.$uuid, seconds.second1, "DELTA : Modify singular relation (factory allowed) OK");
		ok(body.secondChild.sp !== childSp, "DELTA : Reject modification on singular child relation property OK");
		ok(body.secondChild.spA !== childSpA, "DELTA : Reject modification on singular child relation property (factory allowed) OK");
		ok(body.secondChildA.sp !== childASp, "DELTA : Reject modification on singular child relation (factory allowed) property OK");
	});
});