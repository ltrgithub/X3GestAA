"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var config = require('config'); // must be first syracuse require
var sys = require("util");
var jsonImport = require("syracuse-import/lib/jsonImport");
var jsonExport = require("syracuse-import/lib/jsonExport");

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

helpers.pageFileStorage = false;

var tracer; // = console.log;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var db;
	it('init database', function(_) {
		//
		tracer && tracer("(33) before initialize environnement");
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

	it('import demo database', function(_) {
		// import
		var diag = [];
		jsonImport.jsonImport(_, db, "syracuse-admin-demo.json", {
			$diagnoses: diag
		});
		tracer && tracer("import demo db diags (134): " + sys.inspect(diag));
		//console.error("DIAG: " + JSON.stringify(diag, null, 2));
		ok(onlyInfo(diag), "Demo database import ok");
		// check roles
		var role = db.fetchInstance(_, db.model.getEntity(_, "role"), {
			jsonWhere: {
				description: "Sales manager"
			}
		});
		strictEqual(role.description(_), "Sales manager", "role fetch ok");
		var count = db.count(_, db.model.getEntity(_, "role"), {});
		strictEqual(count, 9, "roles count ok");
		// check endpoints
		var ep = db.fetchInstance(_, db.model.getEntity(_, "endPoint"), {
			jsonWhere: {
				description: "Global CRM"
			}
		});
		strictEqual(ep.description(_), "Global CRM", "endpoint fetch ok");
		var count = db.count(_, db.model.getEntity(_, "endPoint"), {});
		ok(count > 0, "endpoint count ok");
		// check groups
		var gp = db.fetchInstance(_, db.model.getEntity(_, "group"), {
			jsonWhere: {
				description: "Sales managers"
			}
		});
		strictEqual(gp.description(_), "Sales managers", "group fetch ok");
		strictEqual(gp.endPoints(_).getLength(), 3, "Sales managers enpoint count ok");
		var count = db.count(_, db.model.getEntity(_, "group"), {});
		strictEqual(count, 12, "group count ok");
		// check users
		var user = db.fetchInstance(_, db.model.getEntity(_, "user"), {
			jsonWhere: {
				login: "hedum"
			}
		});
		strictEqual(user.login(_), "hedum", "user fetch ok");
		strictEqual(user.groups(_).getLength(), 2, "hedum group count ok");
		var count = db.count(_, db.model.getEntity(_, "user"), {});
		strictEqual(count, 12, "user count ok");

	});

	var menuProto = {
		"menuItem": {
			"$key": "code",
			"application": {
				"$key": ["application", "contract"]
			},
			"representationRef": {
				"application": {
					"$key": ["application", "contract"]
				}
			}
		}
	};

	it('menu items import test', function(_) {
		var diag = jsonImport.jsonImportFromJson(_, null, {
			$prototypes: menuProto,
			$items: [{
				$type: "menuItem",
				code: "DEMO_UNIT_TEST_1",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": {
					"en-US": "Applications",
					"fr-FR": "Applications"
				},
				"description": {
					"en-US": "Applications management interface",
					"fr-FR": "Gestion des applications"
				},
				"linkType": "$representation",
				"facet": "$query"
			}]
		}, {
			tracer: tracer
		});
		tracer && tracer("import diags: (200) " + sys.inspect(diag));
		ok((diag.length == 1) && (diag[0].$severity === "info"), "Menu imported ok");
		// check if saved ok
		var m = db.fetchInstance(_, db.getEntity(_, "menuItem"), {
			jsonWhere: {
				code: "DEMO_UNIT_TEST_1"
			}
		});
		strictEqual(m.code(_), "DEMO_UNIT_TEST_1", "Fetched and code ok");
		strictEqual(m.representationRef(_).representation(_), "application", "Fetched representation ok");
		strictEqual(m.representationRef(_).entity(_), "applications", "Fetched entity ok");
		strictEqual(m.representationRef(_).application(_).application(_), "syracuse", "Fetched application ok");

	});
	/*
	var dashProto = {
		"dashboardDef": {
			"$key": "dashboardName",
			"variants": {
				"$key": "code",
				"application": {
					"$key": [
						"application",
						"contract"
					]
				},
				"vignettes": {
					"$key": [
						"portlet",
						"endpoint"
					],
					"portlet": {
						"$key": "code"
					},
					"endpoint": {
						"$key": "dataset"
					}
				},
				"pageData": {
					"$key": "code"
				},
				"$localized": [
					"title",
					"description"
				]
			},
			"$localized": [
				"title",
				"description"
			]
		}
	};
	it('dashboard modification test', function(_) {
		// before import checks
		var d = db.fetchInstances(_, db.getEntity(_, "dashboardDef"), {
			jsonWhere: {
				dashboardName: "home"
			}
		});
		strictEqual(d.length, 1, "(Before) One dashboard ok");
		d = d[0];
		strictEqual(d.variants(_).getLength(), 1, "(Before) One variant ok");
		var v = d.variants(_).toArray(_)[0];
		strictEqual(v.vignettes(_).getLength(), 5, "(Before) Vignettes count ok");
		// import dashboard again in modification to check if vignettes aren't doubled
		tracer && tracer("before modification test (281)");
		var diag = jsonImport.jsonImportFromJson(_, null, {
			$prototypes: dashProto,
			$items: [{
				"$type": "dashboardDef",
				"title": "title_ddbd5d6f-8d4a-46c8-b2da-06ed9a26db2e",
				"dashboardName": "home",
				"mobile": false,
				"variants": [{
					"$type": "dashboardVariant",
					"code": "S_ADMIN",
					"title": "title_4260a310-7481-4fd3-96f3-60d99a22ceae",
					"allApplications": false,
					"$factory": true,
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"vignettes": [{
						"$type": "dashboardVignette",
						"allEndpoints": true,
						"portlet": {
							"code": "S_ADMIN"
						},
						"endpoint": null
					}, {
						"$type": "dashboardVignette",
						"allEndpoints": true,
						"portlet": {
							"code": "S_COLL"
						},
						"endpoint": null
					}, {
						"$type": "dashboardVignette",
						"allEndpoints": true,
						"portlet": {
							"code": "S_PERS"
						},
						"endpoint": null
					}, {
						"$type": "dashboardVignette",
						"allEndpoints": true,
						"portlet": {
							"code": "S_TOOLS"
						},
						"endpoint": null
					}, {
						"$type": "dashboardVignette",
						"allEndpoints": true,
						"portlet": {
							"code": "SUPERVISOR_ADMIN"
						},
						"endpoint": null
					}],
					"pageData": null
				}]
			}],
			$localization: {
				"en-us": {
					"title_ddbd5d6f-8d4a-46c8-b2da-06ed9a26db2e": "Main(348)",
					"title_4260a310-7481-4fd3-96f3-60d99a22ceae": "Admin"
				}
			}
		}, {
			tracer: tracer,
			importMode: "update"
		});
		tracer && tracer("import diags: (355) " + sys.inspect(diag));
		// 
		var d = db.fetchInstances(_, db.getEntity(_, "dashboardDef"), {
			jsonWhere: {
				dashboardName: "home"
			}
		});
		strictEqual(d.length, 1, "One dashboard ok");
		d = d[0];
		strictEqual(d.title(_), "Main(348)", "Dashboard modified");
		strictEqual(d.variants(_).getLength(), 1, "One variant ok");
		var v = d.variants(_).toArray(_)[0];
		strictEqual(v.vignettes(_).toArray(_).length, 5, "Vignettes count ok");

	});
	*/
});