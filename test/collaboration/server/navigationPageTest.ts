"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var config = require('config'); // must be first syracuse require
var sys = require("util");
var jsonImport = require("syracuse-import/lib/jsonImport");
var jsonExport = require("syracuse-import/lib/jsonExport");
var fsp = require("path");

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

helpers.pageFileStorage = false;

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;

var tracer; // = console.log;
var testUrl = baseUrl + "/sdata/syracuse/collaboration/unit_test";

var doStop = false;
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var db;
	it('init server', function(_) {
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	it('database initialization test', function(_) {
		// check groups
		var guest = db.fetchInstance(_, db.getEntity(_, "group"), {
			jsonWhere: {
				"description.en-us": "Super administrators"
			}
		});
		strictEqual(guest.description(_), "Super administrators", "Admin group fetched");
		strictEqual(guest.role(_).description(_), "Super administrator", "Admin role fetched ok");
		//
	});

	it('import unit test navigation page', function(_) {
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "test/syracuse-admin-navi-unittest.json", {
			$diagnoses: diag
		});
		tracer && tracer("import demo db diags (134): " + sys.inspect(diag));
		ok(onlyInfo(diag), "Demo database import ok");
		// check page here
		var page = db.fetchInstance(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "home"
			}
		});
		ok(page != null, "Page found ok");
		strictEqual(page.modules(_).getLength(), 2, "Modules count ok");

	});

	it('Get navigation page tests', function(_) {
		var cookie = testAdmin.getCookie(_, baseUrl);
		var resp = testAdmin.get(_, cookie, testUrl + "/pages('syracuse.collaboration.syracuse.home.$navigation,$page,')", 200, true);
		//tracer && tracer("response (87)" + sys.inspect(resp, null, 6));
		strictEqual(resp.body.modules.length, 1, "Modules count ok"); // just one is on this application
		var etag = resp.headers.etag;
		ok(etag != null, "Got an etag");
		// simulate cache
		var resp = testAdmin.get(_, cookie, testUrl + "/pages('syracuse.collaboration.syracuse.home.$navigation,$page,')", 304, true, {
			"if-none-match": etag
		});
		ok(resp.body == null, "Got body from cache");
		// modify an menu entry
		var menu = db.fetchInstance(_, db.getEntity(_, "menuItem"), {});
		menu.description(_, "changed description");
		menu.save(_);
		// get
		var resp = testAdmin.get(_, cookie, testUrl + "/pages('syracuse.collaboration.syracuse.home.$navigation,$page,')", 200, true, {
			"if-none-match": etag
		});
		ok(resp.headers.etag != etag, "Changed etag ok");

	});

	// navigation page update test
	// initial structure :
	//  F_TEST_PAGE
	//      F_MOD1
	//          F_B1
	//              F_SB1
	//                  F_IT1
	//                  U_IT1
	//                  F_IT2
	//          U_B1
	//          F_B2
	//              U_SB2
	//              F_SB2
	//                  F_IT3
	//              F_IT5
	//      U_MOD1

	// updated structure 1
	//  F_TEST_PAGE
	//      F_MOD1
	//          F_B1
	//              F_SB1 // removed F_IT2 and reordered with F_IT4 in first position and F_IT1 in third
	//                  F_IT4 // added
	//                  F_IT1
	//                  U_IT1
	//          U_B1
	//          F_B2 // removed F_IT3, F_IT5 and removed FSB2
	//              U_SB2
	//      U_MOD1

	it('navigation page update test', function(_) {
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, fsp.join(__dirname, "../fixtures/import/np-update-initial.json"), {
			importMode: "update",
			$diagnoses: diag,
			tracer: tracer
		});
		tracer && tracer("import demo db diags (135): " + sys.inspect(diag));
		ok(onlyInfo(diag), "Initial diags ok");
		// check page here
		var page = db.fetchInstance(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "F_TEST_PAGE"
			}
		});
		ok(page != null, "Page found ok");
		strictEqual(page.modules(_).getLength(), 2, "Modules count ok");
		var mod1 = page.modules(_).toArray(_)[0];
		strictEqual(mod1.code(_), "F_MOD1", "Mod1 code ok");
		var sm1 = mod1.submodules(_).toArray(_)[0];
		strictEqual(sm1.code(_), "F_B1", "Submod1 code ok");
		var sb1 = sm1.items(_).toArray(_)[0];
		strictEqual(sb1.code(_), "F_SB1", "Subblock1 code ok");
		strictEqual(sb1.items(_).toArray(_)[0].code(_), "F_IT1", "F_IT1 code ok");

		// perform update
		tracer && tracer("before update import (155)");
		var diag = [];
		var deffered = []; // try deffered post
		jsonImport.jsonImport(_, db, fsp.join(__dirname, "../fixtures/import/np-update-final.json"), {
			importMode: "update",
			$diagnoses: diag,
			tracer: tracer,
			defferedPostScripts: deffered
		});
		strictEqual(deffered.length, 1, "Scripts are deffered ok");
		deffered.forEach_(_, function(_, scr) {
			scr(_);
		});
		tracer && tracer("import demo db diags (160): " + sys.inspect(diag));
		ok(onlyInfo(diag), "Update diags ok");
		// check page here
		var page = db.fetchInstance(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "F_TEST_PAGE"
			}
		});
		ok(page != null, "Page found ok");
		strictEqual(page.modules(_).getLength(), 2, "Modules count ok");
		//tracer && tracer("(170) modules", page.modules(_).toArray(_));
		var mod1 = page.modules(_).toArray(_)[0];
		strictEqual(mod1.code(_), "F_MOD1", "Mod1 code ok");
		var sm1 = mod1.submodules(_).toArray(_)[0];
		strictEqual(sm1.code(_), "F_B1", "Submod1 code ok");
		var sb1 = sm1.items(_).toArray(_)[0];
		strictEqual(sb1.code(_), "F_SB1", "Subblock1 code ok");
		strictEqual(sb1.items(_).toArray(_)[0].code(_), "F_IT4", "F_IT4 code ok");
		strictEqual(sb1.items(_).toArray(_)[1].code(_), "F_IT1", "F_IT1 code ok");
		strictEqual(sb1.items(_).toArray(_)[2].code(_), "U_IT1", "U_IT1 code ok");
		var sm2 = mod1.submodules(_).toArray(_)[2];
		strictEqual(sm2.code(_), "F_B2", "Submod2 code ok");
		var items = sm2.items(_).toArray(_);
		strictEqual(items.length, 1, "F_B2 has one item ok");
		strictEqual(items[0].code(_), "U_SB2", "Got U_SB2 item ok");

	});
	it('stop tests', function(_) {
		doStop = true;

	});
});