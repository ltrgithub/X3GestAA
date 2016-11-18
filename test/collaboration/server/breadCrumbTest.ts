"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var locale = require('streamline-locale');
var jsonImport = require("syracuse-import/lib/jsonImport");


var config = require('syracuse-main/lib/nodeconfig').config; // must be first syracuse require
var navPageHelper = require("../../../src/collaboration/entities/page/navPageHelper");

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var adminTestFixtures = require("syracuse-collaboration/test/fixtures/adminTestFixtures");

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
//no integration server
config.integrationServer = null;

helpers.pageFileStorage = false;

var tracer; // = console.log;


var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;

var done;
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var db;
	it('init server', function(_) {
		//
		locale.setCurrent(_, "en-US");
		db = adminTestFixtures.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//
	});

	it('import unit test navigation page', function(_) {
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "test/syracuse-admin-navi-unittest-breadcrumb.json", {
			$diagnoses: diag
		});
		// check page here
		var page = db.fetchInstance(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "home"
			}
		});
		ok(page != null, "Page found ok");
		strictEqual(page.modules(_).getLength(), 2, "Modules count ok");


	});

	it('Test breadcrumb generation ', function(_) {
		var date = new Date().getTime();
		var id = "syracuse.collaboration.user";
		var breadCrumb = navPageHelper.getBreadcrumb(_, date, id);

		strictEqual(breadCrumb.length, 4, "Collaboration Level count ok");
		strictEqual(breadCrumb[0].title, "All", "Collaboration Title level 0 ok");
		strictEqual(breadCrumb[1].title, "Administration", "Collaboration Title level 1 ok");
		strictEqual(breadCrumb[2].title, "Administration", "Collaboration Title level 2 ok");
		strictEqual(breadCrumb[3].title, "Users", "Collaboration Title level 3 ok");

		strictEqual(navPageHelper.hasChanged(date), false, "check updated date for menuMap");

		// unknow key
		breadCrumb = navPageHelper.getBreadcrumb(_, date, "");
		strictEqual(breadCrumb.length, 0, "bread crumb for user ok (syracuse collaboration)");
		strictEqual(navPageHelper.hasChanged(date), false, "check updated date for menuMap");

		// id for erp
		id = "x3.erp.GESAUS";
		breadCrumb = navPageHelper.getBreadcrumb(_, date, id);

		strictEqual(breadCrumb.length, 3, "X3 Level count ok");
		strictEqual(breadCrumb[0].title, "All", "X3 Title level 0 ok");
		strictEqual(breadCrumb[1].title, "Setup", "X3 Title level 1 ok");
		strictEqual(breadCrumb[2].title, "Users", "X3 Title level 2 ok");
		strictEqual(navPageHelper.hasChanged(date), false, "check updated date for menuMap");

		id = "syracuse.collaboration.user";
		breadCrumb = navPageHelper.getBreadcrumb(_, date, id);

		strictEqual(breadCrumb.length, 4, "Collaboration Level count ok");
		strictEqual(breadCrumb[0].title, "All", "Collaboration Title level 0 ok");
		strictEqual(breadCrumb[1].title, "Administration", "Collaboration Title level 1 ok");
		strictEqual(breadCrumb[2].title, "Administration", "Collaboration Title level 2 ok");
		strictEqual(breadCrumb[3].title, "Users", "Collaboration Title level 3 ok");
		strictEqual(navPageHelper.hasChanged(date), false, "check updated date for menuMap");
	});
});