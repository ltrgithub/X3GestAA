"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var config = require('config'); // must be first syracuse require
var adminTestFixtures = require("../../../test/collaboration/fixtures/adminTestFixtures");
var sys = require('util');
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var ldap = require("../../../src/collaboration/entities/user/ldap");
var ldapjs = require("ldapjs");
var ldapPort = 1390;
var db;
var ldapInstance;


import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {


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
	registry.register([testEndPoint]);

	//------------------------
	// Init environnement test
	//------------------------
	it('Init environnement', function(_) {
		require('../../..//src/license/index').register(_);
		db = adminTestFixtures.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
	});


	//--------------------------
	// Create LDAP instance test
	//--------------------------
	it('Create LDAP instance', function(_) {

		var entity = db.model.getEntity(_, "ldap");
		var ldapInstances;

		ldapInstances = db.fetchInstances(_, entity, {
			jsonWhere: {
				name: "LDAPTEST"
			}
		});

		strictEqual(ldapInstances.length, 0, "No LDAP instance LDAPTEST");

		ldapInstance = entity.factory.createInstance(_, null, db);
		ldapInstance.name(_, "LDAPTEST");
		ldapInstance.url(_, "ldap://127.0.0.1:" + ldapPort);
		ldapInstance.adminDn(_, "cn=root");
		ldapInstance.adminPassword(_, "secret");
		ldapInstance.searchBase(_, "o=example");
		ldapInstance.searchFilter(_, "(objectClass=user)");
		ldapInstance.groupSearchFilter(_, "(objectClass=group)");
		ldapInstance.syncSearchFilter(_, "(objectClass=user)");
		ldapInstance.authenticationNameMapping(_, "uid");
		ldapInstance.userGroupNameMapping(_, "memberOf");
		ldapInstance.groupNameMapping(_, "cn");
		ldapInstance.firstNameMapping(_, "gn");
		ldapInstance.lastNameMapping(_, "sn");
		ldapInstance.emailMapping(_, "email");
		ldapInstance.save(_);


		var diags = [];
		ldapInstance.getAllDiagnoses(_, diags, {
			addEntityName: true,
			addPropName: true
		});
		strictEqual(JSON.stringify(diags), "[]", "Save LDAPTEST instance");


		ldapInstances = db.fetchInstances(_, entity, {
			jsonWhere: {
				name: "LDAPTEST"
			}
		});
		strictEqual(ldapInstances.length, 1, "Instance LDAP-TEST saved");

	});


	//-----------------------------------------------------
	// Create LDAP group/endpoint/application instances test
	//------------------------------------------------------
	it('Create LDAP group instance', function(_) {
		entity = db.model.getEntity(_, "application");
		var a = entity.createInstance(_, db);
		a.description(_, "LDAP-APPLICATION");
		a.protocol(_, "syracuse");
		a.application(_, "x3stub");
		a.contract(_, "erp");
		a.save(_);


		var entity = db.model.getEntity(_, "endPoint");
		var e = entity.createInstance(_, db);
		e.description(_, "X3-STUB-EP");
		e.applicationRef(_, a);
		e.dataset(_, "test");
		e.databaseDriver(_, "mongodb");
		e.databaseHost(_, testEndPoint.datasets.test.hostname);
		e.databasePort(_, testEndPoint.datasets.test.port);

		e.save(_);
		var diags = [];
		e.getAllDiagnoses(_, diags, {
			addEntityName: true,
			addPropName: true
		});

		var elist = db.fetchInstances(_, entity, {
			jsonWhere: {
				description: "X3-STUB-EP"
			}
		});
		strictEqual(elist.length, 1, "Instance X3-STUB-EP saved");

		entity = db.model.getEntity(_, "role");
		var role = db.fetchInstance(_, entity, {
			jsonWhere: {
				code: "ADMIN"
			}
		});
		ok(role, "Role ADMIN found");

		entity = db.model.getEntity(_, "group");
		var group = entity.createInstance(_, db);
		group.description(_, "LDAP-GROUP-TEST");
		group.ldapGroup(_, "ldap-group");
		group.endPoints(_).set(_, e);
		group.role(_, role);
		group.save(_);

		var rpc = e.roleToProfessionCodes(_).add(_);
		rpc.role(_, role);
		rpc.professionCode(_, "DIR");
		e.save(_);


		var groups = db.fetchInstances(_, entity, {
			jsonWhere: {
				description: "LDAP-GROUP-TEST"
			}
		});
		strictEqual(groups.length, 1, "Instance LDAP-GROUP-TEST saved");


		entity = db.model.getEntity(_, "user");
		var user = db.fetchInstance(_, entity, {
			jsonWhere: {
				login: "admin"
			}
		});
		ok(user, "User admin found");

		var ue = user.endpoints(_).add(_);
		ue.endpoint(_, e);
		ue.login(_, "LDAP");
		var res = user.save(_);
		ok(adminTestFixtures.onlyInfo(res.$actions.$save.$diagnoses), "User endpoint saved ok");

	});

	//------------------------------------------
	// Create sample database for stub  endpoint
	//------------------------------------------
	var mongodb = require('mongodb');
	var samplesDb;

	it('Init X3 sample database', function(_) {
		ok(adminTestFixtures.makeSessionStub(_), "Session stub ok");
		var server = new mongodb.Server(testEndPoint.datasets.test.hostname, testEndPoint.datasets.test.port, {});
		var db = adminTestFixtures.newMongoDb(testEndPoint.datasets.test.database, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		ok(db, "Mongodb X3 sample database initialized");
		samplesDb = dataModel.getOrm(_, dataModel.make(registry.applications.x3stub.contracts.erp, "test"), testEndPoint.datasets.test);
		ok(samplesDb, "ORM X3 initialized");

		// Create nex X3 profesional code
		var entity = samplesDb.getEntity(_, "ASYRMET");
		var cm = entity.createInstance(_, samplesDb);
		cm.CODMET(_, "DIR");
		var res = cm.save(_);
		ok(adminTestFixtures.onlyInfo(res.$actions.$save.$diagnoses), "X3 profesional code saved");

	});


	//-------------------------------------
	// Create minimal LDAP in-memory server
	//-------------------------------------
	var server = ldapjs.createServer();
	var suffix = 'o=example';
	var dbLdapServer = [];
	dbLdapServer["o=example"] = {
		topLevel: ["top"],
		objectClass: ['company']
	};
	dbLdapServer["cn=ldap-group, o=example"] = {
		gidNumber: ['ldap-group'],
		uid: ['ldap-group'],
		cn: ['ldap-group'],
		gn: ['Ldap group'],
		sn: ['sage'],
		email: ['ldap-group@sage.com'],
		memberOf: ['ldap-group'],
		objectClass: ['group']
	};
	dbLdapServer["cn=usera, o=example"] = {
		uid: ['aaa'],
		cn: ['usera'],
		gn: ['Sage'],
		sn: ['User A'],
		email: ['user-a@sage.com'],
		memberOf: ['ldap-group'],
		objectClass: ['user']
	};
	dbLdapServer["cn=userb, o=example"] = {
		uid: ['bbb'],
		cn: ['userb'],
		gn: ['Sage'],
		sn: ['User B'],
		email: ['user-b@sage.com'],
		memberOf: ['ldap-group', 'ldap-group-2,h'],
		objectClass: ['user']
	};
	dbLdapServer["cn=userc, o=example"] = {
		uid: ['ccc'],
		cn: ['userc'],
		gn: ['Sage'],
		sn: ['User C'],
		email: ['user-c@sage.com'],
		memberOf: ['ldap-group'],
		objectClass: ['user']
	};
	dbLdapServer["cn=userd, o=example"] = {
		uid: ['zU&SàEéRç{}/\-D+%^*'],
		cn: ['userc'],
		gn: ['Sage'],
		sn: ['User D'],
		email: ['user-d@sage.com'],
		memberOf: ['ldap-group'],
		objectClass: ['user']
	};


	it('Create LDAP in-memory server', function(_) {

		server.bind('cn=root', function(req, res, next) {
			if (req.dn.toString() !== 'cn=root' || req.credentials !== 'secret')
				return next(new ldapjs.InvalidCredentialsError());
			res.end();
			return next();
		});

		function authorize(req, res, next) {
			/* Any user may search after bind, only cn=root has full power */
			var isSearch = (req instanceof ldapjs.SearchRequest);
			if (!req.connection.ldap.bindDN.equals('cn=root') && !isSearch)
				return next(new ldapjs.InsufficientAccessRightsError());
			return next();
		}

		server.bind(suffix, function(req, res, next) {
			var dn = req.dn.toString();
			if (!dbLdapServer[dn])
				return next(new ldapjs.NoSuchObjectError(dn));
			if (!dbLdapServer[dn].userpassword)
				return next(new ldapjs.NoSuchAttributeError('userPassword'));
			if (dbLdapServer[dn].userpassword.indexOf(req.credentials) === -1)
				return next(new ldapjs.InvalidCredentialsError());
			res.end();
			return next();
		});


		server.search(suffix, authorize, function(req, res, next) {
			var dn = req.dn.toString();
			if (!dbLdapServer[dn])
				return next(new ldapjs.NoSuchObjectError(dn));

			var scopeCheck;
			switch (req.scope) {
				case 'sub':
					scopeCheck = function(k) {
						return (req.dn.equals(k) || req.dn.parentOf(k));
					};
					break;
			}

			Object.keys(dbLdapServer).forEach(function(key) {
				if (!scopeCheck(key))
					return;
				if (req.filter.matches(dbLdapServer[key])) {
					res.send({
						dn: key,
						attributes: dbLdapServer[key]
					});
				}
			});

			res.end();
			return next();
		});

		try {
			server.listen(ldapPort, _);
			ok(server.url, "LDAP server runing at " + server.url);
		} catch (error) {
			ok(false, error.message);
		}
	});

	//-------------------------------
	// Connection to LDAP server test
	//--------------------------------
	it('Connection test', function(_) {
		try {
			ldapInstance.connectionTest(_);
			ok(true, "Connected ");
		} catch (error) {
			ok(false, error.message);
		}

	});


	//----------------------------
	// LDAP get all attributes test
	//-----------------------------
	it('LDAP get all attributes test', function(_) {
		var attr = ldap.getLdapAttributes(ldapInstance, _);
		ok(attr.length != 0, "Get LDAP attributes ");
		ok(attr.indexOf("email") != -1, "Email attribute exist");
	});

	//-------------------------------------------------
	// LDAP get all groups 
	//-------------------------------------------------
	it('LDAP get all groups', function(_) {
		var groups = ldapInstance.getAllGroups(_);
		ok((Object.keys(groups).length) == 1, "Get LDAP groups ");
	});

	//-------------------------------------------------
	// LDAP import users test - new users
	//-------------------------------------------------
	it('LDAP import users test', function(_) {

		var diagnoses = ldapInstance.importUsers(_);
		//Reload instance for populaiting users list
		ldapInstance = db.fetchInstance(_, db.model.getEntity(_, "ldap"), {
			jsonWhere: {
				name: "LDAPTEST"
			}
		});
		//console.log("Diagnoses",diags);
		var users = ldapInstance.users(_).toArray(_);

		strictEqual(users.length, 4, "Import 4 users - Syracuse");
		strictEqual(users[0].lastName(_), "User A", "User A imported");
		strictEqual(users[1].lastName(_), "User B", "User B imported");
		strictEqual(users[2].lastName(_), "User C", "User C imported");

		var entity = samplesDb.getEntity(_, "ASYRAUS");
		var x3users = samplesDb.fetchInstances(_, entity);
		strictEqual(x3users.length, 4, "Import 4 users - X3");
		strictEqual(x3users[0].LASTNAME(_), "User A", "User A imported");
		strictEqual(x3users[1].LASTNAME(_), "User B", "User B imported");
		strictEqual(x3users[2].LASTNAME(_), "User C", "User C imported");

	});



	//-------------------------------------------------
	// LDAP import users test - update users
	//-------------------------------------------------
	it('LDAP update users', function(_) {
		//Change the user name and email
		dbLdapServer["cn=userc, o=example"]["sn"] = "User CC";
		dbLdapServer["cn=userc, o=example"]["email"] = "user-cc@sage.com";

		var diags = ldapInstance.importUsers(_);
		//Reload instance for populaiting users list
		ldapInstance = db.fetchInstance(_, db.model.getEntity(_, "ldap"), {
			jsonWhere: {
				name: "LDAPTEST"
			}
		});

		var users = ldapInstance.users(_).toArray(_);
		strictEqual(users.length, 4, "Update 4 users - Syracuse");
		strictEqual(users[2].lastName(_), "User CC", "User C updated");


		var entity = samplesDb.getEntity(_, "ASYRAUS");
		var x3users = samplesDb.fetchInstances(_, entity);
		strictEqual(x3users.length, 4, "Updates 4 users - X3");
		strictEqual(x3users[2].LASTNAME(_), "User CC", "User C last name updated");
		strictEqual(x3users[2].ADDEML(_), "user-cc@sage.com", "User C email updated");


	});

	//-------------------------------------------------
	// LDAP delete imported users
	//-------------------------------------------------
	/*
	it('LDAP delete users', function (_) {

	    
	    ldapInstance.deleteImportedUsers(_);
	    //Reload instance for populaiting users list
	    ldapInstance = db.fetchInstance(_, db.model.getEntity(_, "ldap"), {
	        jsonWhere: { name: "LDAPTEST" }
	    });

	    var users = ldapInstance.users(_).toArray(_);
	    strictEqual(users.length, 0, "All syracuse users have been deleted");
	    
	    var entity = samplesDb.getEntity(_, "ASYRAUS");
	    var x3users = samplesDb.fetchInstances(_, entity);
	    strictEqual(x3users.length, 0, "All x3 users have been deleted");
	});
	*/
});