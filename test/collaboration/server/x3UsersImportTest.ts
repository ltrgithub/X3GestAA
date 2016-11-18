"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../../../src/orm/dataModel");
var registry = require("../../../../src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var sys = require("util");
var factory = require("../../../../src/orm/factory");

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;

var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_demo");

var testData = require('../fixtures/stubContract/contract');
var testEndPoint = testData.endpoint;

testEndPoint.datasets = {
	test: {
		driver: "mongodb",
		database: "test",
		hostname: "localhost",
		port: config.collaboration.port || 27017
	}
};

config.sdata.endpoints.push(testEndPoint);

var tracer; // = console.log;

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var acceptLanguage = "fr,fr-fr";
//var syracuse = require('syracuse-main/lib/syracuse');

var cookie = "";
var x3sId;
var applicationId;
var adminEp;

function _getAdminModel() {
	return dataModel.make(registry.applications.syracuse.contracts.collaboration, "mongodb_demo");
}

function _getSamplesModel() {
	return dataModel.make(registry.applications.x3stub.contracts.erp, "test");
}

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var franceID = "";
	var usID = "";

	var adminDb;
	var samplesDb;

	it('init database', function(_) {
		ok(testAdmin.makeSessionStub(_), "Session stub ok");
		//
		var server = new mongodb.Server(testEndPoint.datasets.test.hostname, testEndPoint.datasets.test.port, {});
		var db = testAdmin.newMongoDb(testEndPoint.datasets.test.database, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		var server = new mongodb.Server(testEndPoint.datasets.test.hostname, testEndPoint.datasets.test.port, {});
		var db = testAdmin.newMongoDb("mongodb_demo", server, {});
		db = db.open(_);
		db.dropDatabase(_);
		ok(true, "mongodb initialized");

	});

	//start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	var stubEp;
	var r1, r2;
	it('data setup', function(_) {
		adminDb = dataModel.getOrm(_, _getAdminModel(), endPoint.datasets.mongodb_demo);
		samplesDb = dataModel.getOrm(_, _getSamplesModel(), testEndPoint.datasets.test);
		// security
		var spEnt = adminDb.getEntity(_, "securityProfile");
		var sp = adminDb.fetchInstance(_, spEnt, {
			jsonWhere: {
				code: "ADMIN"
			}
		});
		// roles
		var roleEnt = adminDb.getEntity(_, "role");
		var r = r1 = roleEnt.createInstance(_, adminDb);
		r.code(_, "R1");
		r.description(_, "R1");
		r.securityProfile(_, sp);
		r.save(_);
		r2 = roleEnt.createInstance(_, adminDb);
		r2.code(_, "R2");
		r2.description(_, "R2");
		r2.securityProfile(_, sp);
		r2.save(_);
		// endpoint
		var appEnt = adminDb.getEntity(_, "application");
		var a = appEnt.createInstance(_, adminDb);
		a.description(_, "x3stub");
		a.protocol(_, "syracuse");
		a.application(_, "x3stub");
		a.contract(_, "erp");
		a.save(_);
		//
		var epEnt = adminDb.getEntity(_, "endPoint");
		var e = stubEp = epEnt.createInstance(_, adminDb);
		e.description(_, "x3stub");
		e.applicationRef(_, a);
		e.dataset(_, "test");
		e.databaseDriver(_, "mongodb");
		e.databaseHost(_, testEndPoint.datasets.test.hostname);
		e.databasePort(_, testEndPoint.datasets.test.port);
		var m = e.menuProfileToRoles(_).add(_);
		m.role(_, r);
		m.menuProfile(_, "PRFMEN1");
		var m = e.menuProfileToRoles(_).add(_);
		m.role(_, r2);
		m.menuProfile(_, "PRFMEN2");
		e.save(_);
		// check ep save
		e = adminDb.fetchInstance(_, epEnt, {
			jsonWhere: {
				dataset: "test"
			}
		});
		m = e.menuProfileToRoles(_).toArray(_);
		ok(m.some_(_, function(_, mr) {
			return mr.menuProfile(_) === "PRFMEN1";
		}), "Endpoint created ok");

	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	it('import user with group creation', function(_) {
		// create sample user
		var sUserEnt = samplesDb.getEntity(_, "AUTILISINI");
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "USR1");
		su.LOGIN(_, "USRLOGIN1"); // underscore not allowed in X3 user names!
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "usr1@sage.com");
		su.PRFMEN(_, "PRFMEN1");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "USR1 saved ok");
		//
		su = samplesDb.fetchInstance(_, sUserEnt, {
			jsonWhere: {
				USR: "USR1"
			}
		});
		strictEqual(su.USR(_), "USR1", "USR1 fetched ok");
		// create import profile
		var impProfEnt = adminDb.getEntity(_, "x3UserImport");
		var imp = impProfEnt.createInstance(_, adminDb);
		imp.endpoint(_, stubEp);
		imp.description(_, "GRP_CRE_ROLE_MAP1");
		imp.x3NameFormat(_, "firstLast");
		imp.keyProperty(_, "USR");
		imp.groupPolicy(_, "menuProfile");
		imp.createGroupPolicy_menuProf(_, "create");
		imp.createGroupPolicy_create(_, "functionProfile");
		imp.filter(_, "USR eq \"USR1\"");
		imp.save(_);
		// do it
		var diags = [];
		imp.importUser(_, su, {
			$diagnoses: diags
		});
		tracer && tracer("Diagnoses (188): " + sys.inspect(diags));
		ok(onlyInfo(diags), "X3 user USR1 imported ok");
		// fetch user
		var userEnt = adminDb.getEntity(_, "user");
		var u = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "USR1"
			}
		});
		strictEqual(u.firstName(_), "firstName", "First name decoded ok");
		strictEqual(u.lastName(_), "lastName", "Last name decoded ok");
		var g = u.groups(_).toArray(_)[0];
		ok(g != null, "USR1 has one group ok");
		strictEqual(g.role(_).description(_), "R1", "Group has role R1 ok");
		// is endpoint login associated ?
		ok(u.endpoints(_).toArray(_).some_(_, function(_, ue) {
			return (ue.endpoint(_).$uuid === stubEp.$uuid) && (ue.login(_) === "USRLOGIN1");
		}), "Endpoint associated to USR1 ok");

	});

	it('import user with existing group detection', function(_) {
		// create sample user
		var sUserEnt = samplesDb.getEntity(_, "AUTILISINI");
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "USR2");
		su.LOGIN(_, "USRLOGIN2");
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "usr2@sage.com");
		su.PRFMEN(_, "PRFMEN1");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "USR2 saved ok");
		//
		su = samplesDb.fetchInstance(_, sUserEnt, {
			jsonWhere: {
				USR: "USR2"
			}
		});
		strictEqual(su.USR(_), "USR2", "USR2 fetched ok");
		// create a group for R1 having stub EP
		var grpEnt = adminDb.getEntity(_, "group");
		var g = grpEnt.createInstance(_, adminDb);
		g.description(_, "GRP1");
		g.role(_, r1);
		g.endPoints(_).set(_, stubEp);
		var res = g.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "GRP1 saved ok");
		// create import profile
		var impProfEnt = adminDb.getEntity(_, "x3UserImport");
		var imp = impProfEnt.createInstance(_, adminDb);
		imp.endpoint(_, stubEp);
		imp.description(_, "GRP_CRE_ROLE_MAP2");
		imp.x3NameFormat(_, "firstLast");
		imp.keyProperty(_, "USR");
		imp.groupPolicy(_, "menuProfile");
		imp.createGroupPolicy_menuProf(_, "create");
		imp.createGroupPolicy_create(_, "functionProfile");
		imp.filter(_, "USR eq \"USR2\"");
		imp.save(_);
		// do it
		var diags = [];
		tracer && tracer("Before import (249)");
		imp.importUser(_, su, {
			$diagnoses: diags
		});
		tracer && tracer("Diagnoses (252): " + sys.inspect(diags));
		ok(onlyInfo(diags), "X3 user USR2 imported ok");
		// fetch user
		var userEnt = adminDb.getEntity(_, "user");
		var u = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "USR2"
			}
		});
		strictEqual(u.firstName(_), "firstName");
		strictEqual(u.groups(_).getLength(), 1, "USR2 has one group ok");
		var g = u.groups(_).toArray(_)[0];
		strictEqual(g.description(_), "GRP1", "USR2 associated to GRP1 ok");
		// is endpoint login associated ?
		ok(u.endpoints(_).toArray(_).some_(_, function(_, ue) {
			return (ue.endpoint(_).$uuid === stubEp.$uuid) && (ue.login(_) === "USRLOGIN2");
		}), "Endpoint associated to USR2 ok");

	});

	it('import user without endpoint map entry', function(_) {
		// create sample user
		var sUserEnt = samplesDb.getEntity(_, "AUTILISINI");
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "USR3");
		su.LOGIN(_, "USRLOGIN3"); // underscore not allowed in X3 user names!
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "usr3@sage.com");
		su.PRFMEN(_, "UNKN_PRF_MEN");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "USR3 saved ok");
		//
		su = samplesDb.fetchInstance(_, sUserEnt, {
			jsonWhere: {
				USR: "USR3"
			}
		});
		strictEqual(su.USR(_), "USR3", "USR3 fetched ok");
		// create import profile
		var impProfEnt = adminDb.getEntity(_, "x3UserImport");
		var imp = impProfEnt.createInstance(_, adminDb);
		imp.endpoint(_, stubEp);
		imp.description(_, "GRP_CRE_ROLE_MAP3");
		imp.x3NameFormat(_, "firstLast");
		imp.keyProperty(_, "USR");
		imp.groupPolicy(_, "menuProfile");
		imp.createGroupPolicy_menuProf(_, "create");
		imp.createGroupPolicy_create(_, "functionProfile");
		imp.filter(_, "USR eq \"USR3\"");
		imp.save(_);
		// do it
		var diags = [];
		tracer && tracer("Before import (306)");
		imp.importUser(_, su, {
			$diagnoses: diags
		});
		tracer && tracer("Diagnoses (310): " + sys.inspect(diags));
		ok(diags.some(function(d) {
			var s = d.$severity || d.severity;
			return s === "warning";
		}), "X3 user USR3 has some warnings ok");
		// fetch user
		var userEnt = adminDb.getEntity(_, "user");
		var u = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "USR3"
			}
		});
		strictEqual(u.firstName(_), "firstName");
		var g = u.groups(_).toArray(_)[0];
		ok(g != null, "USR1 has one group ok");
		ok(g.role(_) == null, "Group has no role ok");

	});

	it('import several users with group creation', function(_) {
		// create sample user
		var sUserEnt = samplesDb.getEntity(_, "AUTILISINI");
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "MU1");
		su.LOGIN(_, "MULOGIN1"); // underscore not allowed in X3 user names!
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "mu1@sage.com");
		su.PRFMEN(_, "PRFMEN1");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "MU1 saved ok");
		//
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "MU2");
		su.LOGIN(_, "MULOGIN2"); // underscore not allowed in X3 user names!
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "mu2@sage.com");
		su.PRFMEN(_, "PRFMEN1");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "MU2 saved ok");
		//
		var su = sUserEnt.createInstance(_, samplesDb);
		su.USR(_, "MU3");
		su.LOGIN(_, "MULOGIN3"); // underscore not allowed in X3 user names!
		su.INTUSR(_, "firstName, lastName");
		su.ADDEML(_, "mu3@sage.com");
		su.PRFMEN(_, "PRFMEN2");
		var res = su.save(_);
		ok(onlyInfo(res.$actions.$save.$diagnoses), "MU3 saved ok");
		//
		// create import profile
		var impProfEnt = adminDb.getEntity(_, "x3UserImport");
		var imp = impProfEnt.createInstance(_, adminDb);
		imp.endpoint(_, stubEp);
		imp.description(_, "GRP_MLTGRP_MLTROLE_MAP1");
		imp.x3NameFormat(_, "firstLast");
		imp.keyProperty(_, "USR");
		imp.groupPolicy(_, "create");
		imp.createGroupPolicy_create(_, "functionProfile");
		imp.filter(_, "USR like \"MU\%\"");
		imp.save(_);
		// do it
		tracer && tracer("Before execute (372)");
		var diags = imp.$diagnoses = [];
		impProfEnt.$services.execute.$execute(_, {}, imp);
		tracer && tracer("Diagnoses (377): " + sys.inspect(diags));
		ok(onlyInfo(diags), "X3 user MU* imported ok");

		// checks
		var userEnt = adminDb.getEntity(_, "user");
		// first two users must have one group, the same
		var mu1 = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "MU1"
			}
		});
		var mu2 = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "MU2"
			}
		});
		var mu3 = adminDb.fetchInstance(_, userEnt, {
			jsonWhere: {
				login: "MU3"
			}
		});
		strictEqual(mu1.groups(_).toUuidArray(_)[0], mu2.groups(_).toUuidArray(_)[0], "Same group for MU1 and MU2 ok");
		ok(mu1.groups(_).toUuidArray(_)[0] !== mu3.groups(_).toUuidArray(_)[0], "Different group for MU1 and MU3 ok");
	});
});