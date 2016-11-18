"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../../../src/orm/dataModel");
var registry = require("../../../../src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var jsonImport = require("syracuse-import/lib/jsonImport");
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var sys = require("util");

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
		var server = new mongodb.Server(endPoint.datasets.mongodb_demo.hostname, endPoint.datasets.mongodb_demo.port, {});
		var db = testAdmin.newMongoDb(endPoint.datasets.mongodb_demo.database, server, {});
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

	var body;
	// cookies map
	var cookies = {};
	// security profiles
	var sp, rp;
	// storage volume
	var volumes = {};
	// users
	var users = {};
	// teams
	var teams = {};
	// roles
	var roles = {};
	// prints
	var prints = {};
	// documents
	var docs = {};

	// still use the same document's bone for tests
	var sampleTeam, sampleVolume, sampleDoc = {
		description: "UnitTest",
		content: {
			contentType: "text/plain",
			fileName: "unitTest.txt"
		}
	};

	function trace(json) {
		console.log("Trace: " + JSON.stringify(json, null, 2));
	}

	function fetchRole(_, db, description) {
		var role = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: description
			}
		});
		ok(role != null, description + " role fetch ok");
		return role;
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

	function fetchTeam(_, db, description) {
		var team = db.fetchInstance(_, db.getEntity(_, "team"), {
			jsonWhere: {
				description: description
			}
		});
		ok(team != null, description + " team fetch ok");
		return team;
	}

	function modifySampleDoc(_, owner, volume, team) {
		if (owner) sampleDoc.owner = {
			$uuid: owner.$uuid,
		};
		if (volume) sampleDoc.volume = {
			$uuid: volume.$uuid
		};
		if (team) sampleDoc.teams = [{
			$uuid: team.$uuid
		}];
		sampleDoc.$uuid = helpers.uuid.generate();
		delete sampleDoc.$actions;
	}

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	it('data setup', function(_) {
		var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_demo);
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "syracuse-admin-demo.json", {
			$diagnoses: diag
		});
		//console.log("import demo db diags (134): "+sys.inspect(diag));
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
		roles.admin = fetchRole(_, db, "Super administrator");
		roles.ep = fetchRole(_, db, "Endpoint administrator");
		roles.accountant = fetchRole(_, db, "Accountant");
		roles.auditor = fetchRole(_, db, "Auditor");
		roles.sales = fetchRole(_, db, "Sales manager");

		// users
		users.admin = fetchUser(_, db, "admin");
		// phgat is member of "Global Team"
		users.phgat = fetchUser(_, db, "phgat");
		// jglec is author of "Global Team"
		users.jglec = fetchUser(_, db, "jglec");
		// symul is member of "Global Team"
		users.symul = fetchUser(_, db, "symul");
		// cadbe has no rights on Storage Area
		users.cadbe = fetchUser(_, db, "cadbe");
		// cadbe has rights on Storage Area but is not a member of "Global Team"
		users.paric = fetchUser(_, db, "paric");

		// teams
		teams.global = fetchTeam(_, db, "Global Team");
		teams.sales = fetchTeam(_, db, "Sales");

		// create some security profiles
		// Full profile
		var p = db.getEntity(_, "securityProfile").createInstance(_, db);
		p.code(_, "full");
		p.description(_, "full");
		p.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			it.canCreate(_, true);
			it.canRead(_, true);
			it.canWrite(_, true);
			it.canDelete(_, true);
			it.canExecute(_, true);
		});
		p.roles(_).set(_, roles.admin);
		p.save(_);
		// Storage profile only
		sp = db.getEntity(_, "securityProfile").createInstance(_, db);
		sp.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			// can acces "myProfile"
			if (it.code(_) === "myProfile") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, true);
			} else if (it.code(_) === "collaborationArea") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, true);
			}
		});
		sp.code(_, "storage");
		sp.description(_, "storage");
		sp.roles(_).set(_, roles.ep);
		sp.roles(_).set(_, roles.auditor);
		sp.roles(_).set(_, roles.accountant);
		sp.save(_);

		// Limited profile
		rp = db.getEntity(_, "securityProfile").createInstance(_, db);
		rp.profileItems(_).toArray(_).forEach_(_, function(_, it) {
			// can acces "myProfile"
			if (it.code(_) === "myProfile") {
				it.canCreate(_, true);
				it.canRead(_, true);
				it.canWrite(_, true);
				it.canDelete(_, true);
				it.canExecute(_, true);
			}
		});
		rp.code(_, "restricted");
		rp.description(_, "restricted");
		rp.roles(_).set(_, roles.sales);
		rp.save(_);

		// Create volume STD
		volumes.std = db.getEntity(_, "storageVolume").createInstance(_, db);
		volumes.std.code(_, "STD");
		volumes.std.description(_, "STD");
		volumes.std.save(_);

	});

	it('create sessions tests', function(_) {
		cookies.admin = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		cookies.phgat = testAdmin.getCookie(_, baseUrl, "phgat", "phgat");
		cookies.jglec = testAdmin.getCookie(_, baseUrl, "jglec", "jglec");
		cookies.symul = testAdmin.getCookie(_, baseUrl, "symul", "symul");
		cookies.cadbe = testAdmin.getCookie(_, baseUrl, "cadbe", "cadbe");
		cookies.paric = testAdmin.getCookie(_, baseUrl, "paric", "paric");

	});

	it('create restrictions on prints', function(_) {
		// ========== Prints =============
		// try to create a print with phgat user, should get 201
		modifySampleDoc(_, users.phgat);
		body = post(_, cookies.phgat, "printDocuments", sampleDoc, 201);
		prints.phgat = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Print creation allowed with user that has rights on storage area OK");

		// try to create a print with jglec user, should get 201
		modifySampleDoc(_, users.jglec);
		body = post(_, cookies.jglec, "printDocuments", sampleDoc, 201);
		prints.jglec = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Print creation allowed with user that has rights on storage area OK");

		// try to create a print with cadbe user, should get 403
		modifySampleDoc(_, users.cadbe);
		body = post(_, cookies.cadbe, "printDocuments", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Print creation forbidden with user that has no rigths on storage area OK (" + body.$diagnoses[0].$message + ")");

		// console.log("prints: "+JSON.stringify(prints,null,2));
		//	prints: {
		//	  "phgat": "c4484cd7-3ac2-4664-800b-df6c29781ccb",
		//	  "jglec": "878886f5-2943-4ff6-b6d7-f242d7069e68"
		//	}
	});

	it('create restrictions on storage volumes', function(_) {
		// ========== Storage Volumes ===========
		// create a volume
		sampleVolume = {
			code: "SAMPLE",
			description: "SAMPLE"
		};
		// try to create a volume
		body = post(_, cookies.phgat, "storageVolumes", sampleVolume, 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume creation forbidden with user that have no rights on users OK (" + body.$diagnoses[0].$message + ")");

		body = post(_, cookies.admin, "storageVolumes", sampleVolume, 201);
		volumes.sample = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Storage volume creation allowed with user that have rights on technical settings OK");


	});

	it('create restrictions on teams', function(_) {
		// ========== Teams ===========
		// create a team with phgat user as administrator
		sampleTeam = {
			description: "Sample Team 0",
			administrator: {
				$uuid: users.phgat.$uuid
			}
		};
		// try to create a team with users that have no righs on users, should get 403
		body = post(_, cookies.phgat, "teams", sampleTeam, 201);
		ok(onlyInfo(body.$diagnoses), "Team creation allowed with user that is administrator of the team (but no rights on users) OK");

		sampleTeam = {
			description: "Sample Team1",
			administrator: {
				$uuid: users.phgat.$uuid
			},
			authors: [{
				$uuid: users.jglec.$uuid
			}],
			members: [{
				$uuid: users.symul.$uuid
			}]
		};
		body = post(_, cookies.jglec, "teams", sampleTeam, 400);
		tracer && tracer("(342) body", sys.inspect(body, null, 6));
		var dd = body.$diagnoses;
		ok(!onlyInfo(dd), "Team creation forbidden with user that is author of the team (but no rights on users) OK (" + dd[0].$message + ")");

		sampleTeam = {
			description: "Sample Team1",
			administrator: {
				$uuid: users.phgat.$uuid
			},
			authors: [{
				$uuid: users.jglec.$uuid
			}],
			members: [{
				$uuid: users.symul.$uuid
			}]
		};
		body = post(_, cookies.symul, "teams", sampleTeam, 400);
		var dd = body.$diagnoses;
		ok(!onlyInfo(dd), "Team creation forbidden with user that is member of the team (but no rights on users) OK (" + dd[0].$message + ")");

		// Try with admin that has rights on Users
		sampleTeam.description = "Sample Team 2";
		sampleTeam.administrator = users.cadbe.$uuid;
		body = post(_, cookies.admin, "teams", sampleTeam, 201);
		teams.sample2 = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Team creation allowed with user that isn't the team (but have rights on users) OK");

	});

	it('create restrictions on documents', function(_) {
		// ========== Documents =============
		// try to create a document with cadbe user, should get 403
		modifySampleDoc(_, users.cadbe, volumes.std);
		body = post(_, cookies.cadbe, "documents", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Document creation forbidden with user that has no rigths on storage area OK (" + body.$diagnoses[0].$message + ")");

		// Same with working copy
		body = post(_, cookies.cadbe, "documents/$template/$workingCopies", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "WC Document (WC) creation forbidden with user that has no rigths on storage area OK (" + body.$diagnoses[0].$message + ")");

		/////
		// try to create a document with phgat user, should get 201
		modifySampleDoc(_, users.phgat, volumes.std);
		body = post(_, cookies.phgat, "documents", sampleDoc, 201);
		docs.phgat = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Document creation allowed without team for user that has rights on storage area OK");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		body = post(_, cookies.phgat, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (with save) allowed without team for user that has rights on storage area OK");

		// Same without save
		modifySampleDoc(_, users.phgat);
		body = post(_, cookies.phgat, "documents/$template/$workingCopies?representation=document.$edit", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (without save) allowed without team for user that has rights on storage area OK");

		// Try to save working copy
		body = put(_, cookies.phgat, "$workingCopies('" + body.$trackingId + "')?representation=document.$edit", {
			description: "UnitTest saved",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Document (WC) save allowed without team for user that has rights on storage area OK");

		/////
		// try to create a document with phgat user and associate the "Global Team", should get 201
		modifySampleDoc(_, users.phgat, volumes.std, teams.global);
		body = post(_, cookies.phgat, "documents", sampleDoc, 201);
		tracer && tracer("(430)", sys.inspect(body, null, 6));
		docs.phgat_admin = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Document creation allowed with team's administrator OK");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		body = post(_, cookies.phgat, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (with save) allowed with team's administrator OK");

		// Same without save
		modifySampleDoc(_, users.phgat, volumes.std, teams.global);
		body = post(_, cookies.phgat, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (without save) allowed with team's administrator OK");

		// Try to save working copy
		body = put(_, cookies.phgat, "$workingCopies('" + body.$trackingId + "')?representation=document.$edit", {
			description: "UnitTest saved",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		docs.wc_phgat_admin = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Document (WC) save allowed with team's administrator OK");

		/////
		// try to create a document with jglec user and associate the "Global Team", should get 201
		modifySampleDoc(_, users.jglec);

		body = post(_, cookies.jglec, "documents", sampleDoc, 201);
		docs.jglec_author = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Document creation allowed with team's author OK");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		body = post(_, cookies.jglec, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (with save) allowed with team's author OK");

		// Same without save
		modifySampleDoc(_, users.jglec);
		body = post(_, cookies.jglec, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (without save) allowed with team's author OK");

		// Try to save working copy
		body = put(_, cookies.jglec, "$workingCopies('" + body.$trackingId + "')?representation=document.$edit", {
			description: "UnitTest saved",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		docs.wc_jglec_author = body && body.$uuid;
		ok(onlyInfo(body.$diagnoses), "Document (WC) save allowed with team's author OK");

		/////
		// try to create a document with symul user and associate the "Global Team", should get 403
		modifySampleDoc(_, users.symul);

		// Wait for 400 instead of 403 until we can solve the problem
		body = post(_, cookies.symul, "documents", sampleDoc, 400); // temporary 400
		ok(!onlyInfo(body.$diagnoses), "Document creation forbidden with team's member that has rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		body = post(_, cookies.symul, "documents/$template/$workingCopies", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Document (WC) creation (with save) forbidden with team's member that has rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		// Same without save
		modifySampleDoc(_, users.symul);
		body = post(_, cookies.symul, "documents/$template/$workingCopies", sampleDoc, 201);
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation (without save) allowed with team's member that has rights on storage area OK");

		// Try to save working copy
		body = put(_, cookies.symul, "$workingCopies('" + body.$trackingId + "')?representation=document.$edit", {
			description: "UnitTest saved",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Document (WC) save forbidden with team's member that has rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		/////
		// try to create a document with cadbe user and associate the "Global Team", should get 403
		modifySampleDoc(_, users.cadbe);

		body = post(_, cookies.cadbe, "documents", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Document creation forbidden with team's member that has no rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		body = post(_, cookies.cadbe, "documents/$template/$workingCopies", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Document (WC) creation (with save) forbidden with team's member that has no rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		// Same without save
		modifySampleDoc(_, users.cadbe);
		body = post(_, cookies.cadbe, "documents/$template/$workingCopies", sampleDoc, 403);
		ok(!onlyInfo(body.$diagnoses), "Document (WC) creation (without save) forbidden with team's member that has no rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		/////
		// try to create a document with paric user and associate the "Global Team", should get 403
		modifySampleDoc(_, users.paric);

		body = post(_, cookies.paric, "documents", sampleDoc, 400); // temporary 400
		tracer && tracer("(553)", sys.inspect(body, null, 6));
		var dd = body.$properties.teams.$diagnoses;
		ok(!onlyInfo(dd), "Document creation forbidden with paric that is not a member of the team but have rights on collaboration area OK (" + dd[0].$message + ")");

		// Same with working copy
		sampleDoc.$actions = {
			$save: {
				$isRequested: true
			}
		};
		// status will be 201 but there will be error diagnoses
		body = post(_, cookies.paric, "documents/$template/$workingCopies", sampleDoc, 201);
		tracer && tracer("(563)", sys.inspect(body, null, 6));
		var dd = body.$properties.teams.$diagnoses;
		ok(!onlyInfo(dd), "Document (WC) creation forbidden with paric that is not a member of the team but have rights on collaboration area OK (" + dd[0].$message + ")");

		// Same without save
		modifySampleDoc(_, users.paric);
		body = post(_, cookies.paric, "documents/$template/$workingCopies", sampleDoc, 201);
		tracer && tracer("(569)", sys.inspect(body, null, 6));
		ok(onlyInfo(body.$diagnoses), "Document (WC) creation forbidden with paric that is not a member of the team but have rights on collaboration area OK");

		// Try to save working copy: wc will be saved but without a team
		body = put(_, cookies.paric, "$workingCopies('" + body.$trackingId + "')?representation=document.$edit", {
			description: "UnitTest saved",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		body = get(_, cookies.paric, "documents('" + body.$uuid + "')", 200);
		tracer && tracer("(584)", sys.inspect(body, null, 6));
		ok(body.teams == null || (Array.isArray(body.teams) && body.teams.length === 0), "Document (WC) save with paric that is not a member of the team the team is not associated");


		/////
		// Try to create a document with phgat user and associate two teams (one ok and one not ok) should get 403

		// TEMPORARY DISABLED TEST
		// TODO : Fix problem of two teams (one authorized and one not to a document
		//	modifySampleDoc(_, users.phgat, volumes.std, teams.global);
		//	// Add second team
		//	sampleDoc.teams.push({
		//		"$uuid": teams.sample2
		//	});
		//	body = post(_, cookies.phgat, "documents", sampleDoc, 403);
		//	ok(!onlyInfo(body.$diagnoses), "Document creation allowed with team's administrator OK (" + body.$diagnoses[0].$message + ")");




		// console.log("docs: " + JSON.stringify(docs, null, 2));
		// UUIDs here in comments are fakes
		//	docs: {
		//	  "phgat": "329c816d-547c-44e2-a1a1-c5e9d55ef569",
		//	  "phgat_admin": "3fba9354-1326-4826-bd7c-81a1aed68887",
		//	  "wc_phgat_admin": "b32d4b6e-3b8e-45fd-9578-feca8ab02814",
		//	  "jglec_author": "19a28f0f-97d8-4020-b321-b6740830611e",
		//	  "wc_jglec_author": "5890ab46-c3fa-4642-a0a2-b8eabbcd59c1"
		//	}
	});

	it('read restrictions on prints', function(_) {
		// ========== Prints =============
		body = get(_, cookies.phgat, "printDocuments?representation=printDocument.$query", 200);
		ok(onlyInfo(body.$diagnoses) && body.$resources.length === 1, "Print query allowed with owner phgat OK");
		strictEqual(body.$resources[0].owner.$uuid, users.phgat.$uuid, "Document's owner ok");
		strictEqual(body.$resources[0].$uuid, prints.phgat, "Document's uuid ok");

		body = get(_, cookies.phgat, "printDocuments('" + prints.phgat + "')?representation=printDocument.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Print details allowed with owner phgat OK");

		body = get(_, cookies.phgat, "printDocuments('" + prints.jglec + "')?representation=printDocument.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Print details not found with owner phgat OK (" + body.$diagnoses[0].$message + ")");

		body = get(_, cookies.jglec, "printDocuments?representation=printDocument.$query", 200);
		ok(onlyInfo(body.$diagnoses) && body.$resources.length === 1, "Print query allowed with owner jglec OK");
		strictEqual(body.$resources[0].owner.$uuid, users.jglec.$uuid, "Document's owner ok");
		strictEqual(body.$resources[0].$uuid, prints.jglec, "Document's uuid ok");

		body = get(_, cookies.jglec, "printDocuments('" + prints.jglec + "')?representation=printDocument.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Print details allowed with owner jglec OK");

		body = get(_, cookies.jglec, "printDocuments('" + prints.phgat + "')?representation=printDocument.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Print details not found with owner jglec OK (" + body.$diagnoses[0].$message + ")");

	});


	it('read restrictions on storage volumes', function(_) {
		// ========== Storage Volumes ===========
		// try to read a volume
		body = get(_, cookies.cadbe, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume details forbidden with user that have no rights on storage area and technical settings OK (" + body.$diagnoses[0].$message + ")");

		body = get(_, cookies.phgat, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Storage volume details allowed with user that have rights on storage area OK");

		body = get(_, cookies.admin, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Storage volume details allowed with user that have rights on technical settings OK");

	});

	it('read restrictions on teams', function(_) {
		// ========== Teams ===========
		// Who can read sample team ?

		// make sure is there, create it with admin
		sampleTeam = {
			description: "Sample Team",
			administrator: {
				$uuid: users.phgat.$uuid
			},
			authors: [{
				$uuid: users.jglec.$uuid
			}],
			members: [{
				$uuid: users.symul.$uuid
			}]
		};
		body = post(_, cookies.admin, "teams", sampleTeam, 201);
		teams.sample = body && body.$uuid;
		//
		body = get(_, cookies.admin, "teams('" + teams.sample + "')?representation=team.$details", 200);
		tracer && tracer("(663)", sys.inspect(body, null, 6));
		ok(onlyInfo(body.$diagnoses), "Team details allowed with user that isn't the team (but have rights on users) OK");
		body = get(_, cookies.phgat, "teams('" + teams.sample + "')?representation=team.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team details allowed with user that is administrator of the team (but have no rights on users) OK");
		body = get(_, cookies.jglec, "teams('" + teams.sample + "')?representation=team.$details", 200);
		tracer && tracer("(668)", sys.inspect(body, null, 6));
		ok(onlyInfo(body.$diagnoses), "Team details allowed with user that is author of the team (but have no rights on users) OK");
		body = get(_, cookies.symul, "teams('" + teams.sample + "')?representation=team.$details", 200);
		tracer && tracer("(671)", sys.inspect(body, null, 6));
		ok(onlyInfo(body.$diagnoses), "Team details allowed with user that is member of the team (but have no rights on users) OK");
		body = get(_, cookies.paric, "teams('" + teams.sample + "')?representation=team.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team details not found with user that is not member of the team (and have no rights on users) OK (" + body.$diagnoses[0].$message + ")");
		body = get(_, cookies.cadbe, "teams('" + teams.sample + "')?representation=team.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team details forbidden with user that is not member of the team (and have no rights at all) OK (" + body.$diagnoses[0].$message + ")");

	});

	it('read restrictions on documents', function(_) {
		// ========== Documents =============	
		// Who can read document that is not associated to a team
		body = get(_, cookies.phgat, "documents('" + docs.phgat + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Simple document details allowed with user phgat OK");
		body = get(_, cookies.jglec, "documents('" + docs.phgat + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Simple document details allowed with user jglec OK");
		body = get(_, cookies.symul, "documents('" + docs.phgat + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Simple document details allowed with user symul OK");
		body = get(_, cookies.paric, "documents('" + docs.phgat + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Simple document details allowed with user paric OK");
		body = get(_, cookies.cadbe, "documents('" + docs.phgat + "')?representation=document.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Simple document details forbidden with user cadbe OK (" + body.$diagnoses[0].$message + ")");

		// Who can read document created by the team's administrator ? phgat_admin
		body = get(_, cookies.phgat, "documents('" + docs.phgat_admin + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by the administrator) details allowed with user phgat (administrator) OK");
		body = get(_, cookies.jglec, "documents('" + docs.phgat_admin + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by the administrator) details allowed with user jglec (author) OK");
		body = get(_, cookies.symul, "documents('" + docs.phgat_admin + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by the administrator) details allowed with user symul (member) OK");
		body = get(_, cookies.paric, "documents('" + docs.phgat_admin + "')?representation=document.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by the administrator) details not found with user paric (not member) OK (" + body.$diagnoses[0].$message + ")");
		body = get(_, cookies.cadbe, "documents('" + docs.phgat_admin + "')?representation=document.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by the administrator) details forbidden with user cadbe (no rights) OK (" + body.$diagnoses[0].$message + ")");

		// Who can read document created by the team's authors ? jglec_author
		body = get(_, cookies.phgat, "documents('" + docs.jglec_author + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by an author) details allowed with user phgat (administrator) OK");
		body = get(_, cookies.jglec, "documents('" + docs.jglec_author + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by an author) details allowed with user jglec (author) OK");
		body = get(_, cookies.symul, "documents('" + docs.jglec_author + "')?representation=document.$details", 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by an author) details allowed with user symul (member) OK");
		body = get(_, cookies.paric, "documents('" + docs.jglec_author + "')?representation=document.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by an author) details not found with user paric (not member) OK (" + body.$diagnoses[0].$message + ")");
		body = get(_, cookies.cadbe, "documents('" + docs.jglec_author + "')?representation=document.$details", 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by an author) details forbidden with user cadbe (no rights) OK (" + body.$diagnoses[0].$message + ")");

	});

	it('update restrictions on storage volumes', function(_) {
		// ========== Storage Volumes ===========
		// try to update a volume
		body = put(_, cookies.cadbe, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$edit", {
			description: "Sample volume modified one times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume update forbidden with user that have no rights on storage area and technical settings OK (" + body.$diagnoses[0].$message + ")");

		body = put(_, cookies.phgat, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$edit", {
			description: "Sample volume modified two times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume update forbidden with user that have rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		body = put(_, cookies.admin, "storageVolumes('" + volumes.sample + "')?representation=storageVolume.$edit", {
			description: "Sample volume modified three times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Storage volume update allowed with user that have rights on technical settings OK");

	});

	it('update restrictions on teams', function(_) {
		// ========== Teams =============
		// Who can read sample team ?
		var body = put(_, cookies.admin, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified one time"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Team update allowed with user that isn't the team (but have rights on users) OK");
		body = put(_, cookies.phgat, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified two times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Team update allowed with user that is administrator of the team (but have no rights on users) OK");
		body = put(_, cookies.jglec, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified three times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team update forbidden with user that is author of the team (but have no rights on users) OK (" + body.$diagnoses[0].$message + ")");
		body = put(_, cookies.symul, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified four times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team update forbidden with user that is member of the team (but have no rights on users) OK (" + body.$diagnoses[0].$message + ")");
		body = put(_, cookies.paric, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified five times"
		}, 404);
		strictEqual(body, null, "Team update not found with user that is not member of the team (and have no rights on users) OK");
		body = put(_, cookies.cadbe, "teams('" + teams.sample + "')?representation=team.$edit", {
			description: "Sample team modified six times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team update forbidden with user that is not member of the team (and have no rights at all) OK (" + body.$diagnoses[0].$message + ")");

	});

	it('update restrictions on documents', function(_) {
		// ========== Documents =============
		// Who can update document that is not associated to a team
		body = put(_, cookies.phgat, "documents('" + docs.phgat + "')?representation=document.$edit", {
			description: "UnitTest modified one time"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Simple document update allowed with user phgat OK");
		body = put(_, cookies.jglec, "documents('" + docs.phgat + "')?representation=document.$edit", {
			description: "UnitTest modified two times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Simple document update allowed with user jglec OK");
		body = put(_, cookies.symul, "documents('" + docs.phgat + "')?representation=document.$edit", {
			description: "UnitTest modified three times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Simple document update allowed with user symul OK");
		body = put(_, cookies.paric, "documents('" + docs.phgat + "')?representation=document.$edit", {
			description: "UnitTest modified four times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Simple document update allowed with user paric OK");
		body = put(_, cookies.cadbe, "documents('" + docs.phgat + "')?representation=document.$edit", {
			description: "UnitTest modified five times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Simple document update allowed with user cadbe OK");

		// Who can update document created by the team's administrator ? phgat_admin
		body = put(_, cookies.phgat, "documents('" + docs.phgat_admin + "')?representation=document.$edit", {
			description: "UnitTest modified one time"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by the administrator) update allowed with user phgat (administrator) OK");
		body = put(_, cookies.jglec, "documents('" + docs.phgat_admin + "')?representation=document.$edit", {
			description: "UnitTest modified two times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by the administrator) update forbidden with user jglec (author) OK");
		body = put(_, cookies.symul, "documents('" + docs.phgat_admin + "')?representation=document.$edit", {
			description: "UnitTest modified three times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by the administrator) update forbidden with user symul (member) OK");
		body = put(_, cookies.paric, "documents('" + docs.phgat_admin + "')?representation=document.$edit", {
			description: "UnitTest modified four times"
		}, 404); // temporary 404
		strictEqual(body, null, "Team's document (created by the administrator) update not found with user paric (not member) OK");
		body = put(_, cookies.cadbe, "documents('" + docs.phgat_admin + "')?representation=document.$edit", {
			description: "UnitTest modified five times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by the administrator) update forbidden with user cadbe (no rights) OK");

		// Who can update document created by the team's authors ? jglec_author
		body = put(_, cookies.phgat, "documents('" + docs.jglec_author + "')?representation=document.$edit", {
			description: "UnitTest modified one time"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by an author) update allowed with user phgat (administrator) OK");
		body = put(_, cookies.jglec, "documents('" + docs.jglec_author + "')?representation=document.$edit", {
			description: "UnitTest modified two times"
		}, 200);
		ok(onlyInfo(body.$diagnoses), "Team's document (created by an author) update allowed with user jglec (author) OK");
		body = put(_, cookies.symul, "documents('" + docs.jglec_author + "')?representation=document.$edit", {
			description: "UnitTest modified three times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by an author) update forbidden with user symul (member) OK");
		body = put(_, cookies.paric, "documents('" + docs.jglec_author + "')?representation=document.$edit", {
			description: "UnitTest modified four times"
		}, 404); // temporary 404
		strictEqual(body, null, "Team's document (created by an author) update not found with user paric (not member) OK");
		body = put(_, cookies.cadbe, "documents('" + docs.jglec_author + "')?representation=document.$edit", {
			description: "UnitTest modified five times"
		}, 403);
		ok(!onlyInfo(body.$diagnoses), "Team's document (created by an author) update forbidden with user cadbe (no rights) OK");

		// prepare instances for deletion tests
		// crnit: temporarely removed, phgat cannot give the rights to an user he cannot read
		/*	body = put(_, cookies.phgat, "documents('" + docs.wc_phgat_admin + "')?representation=document.$edit", {
		 owner: {
		 $uuid: users.jglec.$uuid
		 }
		 }, 200);
		 ok(onlyInfo(body.$diagnoses), "Change document's owner OK");
		 */
	});

	it('delete restrictions on prints', function(_) {

		// ========== Prints =============
		// Try to delete print with not owner - should fail
		var body = del(_, cookies.phgat, "printDocuments('" + prints.jglec + "')", 404); // temporary 404
		strictEqual(body, null, "User that isn't owner can't delete prints OK");
		body = del(_, cookies.jglec, "printDocuments('" + prints.phgat + "')", 404); // temporary 404
		strictEqual(body, null, "User that isn't owner can't delete prints OK");

		// Delete prints with owners
		body = del(_, cookies.phgat, "printDocuments('" + prints.phgat + "')", 200);
		ok(onlyInfo(body.$diagnoses), "User that is owner can delete prints OK");
		body = del(_, cookies.jglec, "printDocuments('" + prints.jglec + "')", 200);
		ok(onlyInfo(body.$diagnoses), "User that is owner can delete prints OK");

	});

	it('delete restrictions on storage volumes', function(_) {
		// ========== Storage Volumes ===========
		// try to delete a volume
		body = del(_, cookies.cadbe, "storageVolumes('" + volumes.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume delete forbidden with user that have no rights on storage area and technical settings OK (" + body.$diagnoses[0].$message + ")");

		body = del(_, cookies.phgat, "storageVolumes('" + volumes.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Storage volume delete forbidden with user that have rights on storage area OK (" + body.$diagnoses[0].$message + ")");

		body = del(_, cookies.admin, "storageVolumes('" + volumes.sample + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Storage volume delete allowed with user that have rights on technical settings OK");

	});

	it('delete restrictions on teams', function(_) {
		// ========== Teams =============	
		// Who can delete a document not associated to a team ? phgat
		body = del(_, cookies.cadbe, "teams('" + teams.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete team is forbidden with user cadbe (no rights at all) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.paric, "teams('" + teams.sample + "')", 404);
		strictEqual(body, null, "Delete team is forbidden with user paric (not member and no users rights) OK");
		body = del(_, cookies.symul, "teams('" + teams.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete team is forbidden with user symul (member) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.jglec, "teams('" + teams.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete team is forbidden with user jglec (author) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.phgat, "teams('" + teams.sample + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete team is forbidden with user phgat (administrator) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.admin, "teams('" + teams.sample + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Delete team is allowed with user admin (users rights) OK");


	});

	it('delete restrictions on documents', function(_) {
		// ========== Documents =============	
		// Who can delete a document not associated to a team ? phgat
		body = del(_, cookies.cadbe, "documents('" + docs.phgat + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document not associated to a team is forbidden with user cadbe (no rights) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.paric, "documents('" + docs.phgat + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Delete document not associated to a team is allowed with user paric (storage area rights) OK");

		// Who can delete document associated to a team and created by the teams's administrator ? phgat_admin
		body = del(_, cookies.cadbe, "documents('" + docs.phgat_admin + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document (created by teams's administrator) is forbidden with user cadbe (no rights) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.paric, "documents('" + docs.phgat_admin + "')", 404); // temporary 404
		strictEqual(body, null, "Delete document (created by teams's administrator) is forbidden with user paric (sa rights but not member) OK");
		body = del(_, cookies.symul, "documents('" + docs.phgat_admin + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document (created by teams's administrator) is forbidden with user symul (only member) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.jglec, "documents('" + docs.phgat_admin + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document (created by teams's administrator) is forbidden with user jglec (author but not owner) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.phgat, "documents('" + docs.phgat_admin + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Delete document (created by teams's administrator) is allowed with user phgat (administrator and owner) OK");
		// crnit : temporarely removed because preparation removed (see comment in document update test)
		//	body = del(_, cookies.jglec, "documents('" + docs.wc_phgat_admin + "')", 200);
		//	ok(onlyInfo(body.$diagnoses), "Delete document (created by teams's administrator but owner updated) is allowed with user jglec (author and owner) OK");

		// Who can delete document associated to a team and created by a teams's author ? jglec_author
		body = del(_, cookies.cadbe, "documents('" + docs.jglec_author + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document (created by teams's author) is forbidden with user cadbe (no rights) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.paric, "documents('" + docs.jglec_author + "')", 404); // temporary 404
		strictEqual(body, null, "Delete document (created by teams's author) is forbidden with user paric (sa rights but not member) OK");
		body = del(_, cookies.symul, "documents('" + docs.jglec_author + "')", 403);
		ok(!onlyInfo(body.$diagnoses), "Delete document (created by teams's author) is forbidden with user symul (only member) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.jglec, "documents('" + docs.jglec_author + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Delete document (created by teams's author) is allowed with user jglec (author and owner) OK (" + body.$diagnoses[0].$message + ")");
		body = del(_, cookies.phgat, "documents('" + docs.wc_jglec_author + "')", 200);
		ok(onlyInfo(body.$diagnoses), "Delete document (created by teams's author) is allowed with user phgat (administrator but not owner) OK");
	});
});