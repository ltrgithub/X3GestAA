"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var sys = require('util');
var flows = require('streamline-runtime').flows;

var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var mobileAppEntity = require("syracuse-tablet/lib/entities/mobileApplication").entity;

var db;
var mobileApp;
var mobileDash;
var dataset = "unit_test";
var user = "admin";
var gadgets = [];
var role = "Super administrator";
var roleInstance;

// Representations that must be in the result since the are referenced by the root entity mobileApplication.
// There will be more but these ones will be checked

var pagesToCheck = {
	"mobileApplication.$query": {},
	"mobileApplication.$edit": {},
	"mobileDashboard.$lookup": {},
	"mobileApplication.$details": {},
	"mobileDashboard.$edit": {},
	"mobileDashboard.$details": {},
	"mobileDashboard.$query": {},
	"mobileGadget.$lookup": {},
	"mobileGadget.$edit": {},
	"mobileGadget.$details": {},
	"mobileGadget.$query": {
		"cacheType": "$filtered",
		"filter": "gadgetType eq '$filtered'"
	}
};

var gadgetsToCheck = {};

globals.context = globals.context || {};
globals.context.session = {
	id: helpers.uuid.generate(),
	getUserLogin: function(_) {
		return user;
	},
	getUserProfile: function(_) {
		return {
			user: function(_) {
				var db = adminHelper.getCollaborationOrm(_);
				return db.fetchInstance(_, db.model.getEntity(_, "user"), {
					jsonWhere: {
						login: user
					}
				});
			},
			selectedLocale: function(_) {
				var db = adminHelper.getCollaborationOrm(_);
				var locale = db.fetchInstance(_, db.model.getEntity(_, "localePreference"), {});
				return locale;
			},
			selectedEndpoint: function(_) {
				var eps = adminHelper.getEndpoints(_, {});
				var epMatch;
				flows.each(_, eps, function(_, ep) {
					if ("syracuse" === ep.protocol(_) && dataset === ep.dataset(_)) {
						epMatch = ep;
					}
				});
				return epMatch;
			},
			getRepresentationPrefs: function(_, rep, facet) {

			}
		};
	},
	getSecurityProfile: function(_) {
		return null;
	},
	getData: function(code) {
		return null;
	}
};

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('init environment', function(_) {
		db = testAdmin.initializeTestEnvironnement(_);

		roleInstance = db.fetchInstance(_, db.getEntity(_, "role"), {
			jsonWhere: {
				description: role
			}
		});
		ok(roleInstance != null, "Role found: " + role);
		ok(db != null, "Environnement initialized");
	});

	it('create mobile gadgets', function(_) {
		var entity = db.model.getEntity(_, "mobileGadget");
		var instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 1");
		instance.title(_, "Test 1");
		instance.description(_, "Test 1");
		instance.gadgetType(_, "$representation");
		instance.entity(_, "mobileApplication");
		instance.representation(_, "mobileApplication");
		instance.action(_, "$query");
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			entity: "mobileApplication",
			action: "$query",
			representation: "mobileApplication",
			facet: "$query"
		};

		instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 2");
		instance.title(_, "Test 2");
		instance.description(_, "Test 2");
		instance.gadgetType(_, "$process");
		instance.processName(_, "myprocess");
		instance.processLeg(_, "processLeg");
		instance.processMenu(_, "processMenu");
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			processName: "myprocess",
			processLeg: "processLeg",
			processMenu: "processMenu"
		};

		instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 3");
		instance.title(_, "Test 3");
		instance.description(_, "Test 3");
		instance.gadgetType(_, "$request");
		instance.requestName(_, "myrequest");
		instance.requestLevel(_, 1);
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			requestName: "myrequest",
			requestLevel: 1
		};

		instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 4");
		instance.title(_, "Test 4");
		instance.description(_, "Test 4");
		instance.gadgetType(_, "$stats");
		instance.statName(_, "mystats");
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			statName: "mystats"
		};

		instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 5");
		instance.title(_, "Test 5");
		instance.description(_, "Test 5");
		instance.gadgetType(_, "$dashboard");
		instance.mobileDashboard(_, "UNITTEST-DASHBOARD-2");
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			dashboardName: "UNITTEST-DASHBOARD-2"
		};

		instance = entity.factory.createInstance(_, null, db);
		instance.code(_, "UNITTEST 6");
		instance.title(_, "Test 6");
		instance.description(_, "Test 6");
		instance.gadgetType(_, "$external");
		instance.externalUrl(_, "http://www.sage.com");
		instance.save(_);
		gadgets.push(instance);
		gadgetsToCheck[instance.$uuid] = {
			externalUrl: "http://www.sage.com"
		};

		ok(true, "Gadgets created");
	});


	it('create mobile dashboard', function(_) {
		var entity = db.model.getEntity(_, "mobileDashboard");
		var list = db.fetchInstances(_, entity, {
			jsonWhere: {
				dashboardName: "UNITTEST"
			}
		});
		strictEqual(list.length, 0, "no test case instance already there");
		if (list.length === 0) {
			var instance = entity.factory.createInstance(_, null, db);
			instance.dashboardName(_, "UNITTEST");
			instance.description(_, "Test");
			instance.title(_, "Test");

			flows.each(_, gadgets, function(_, gadget) {
				var vignette = instance.vignettes(_).add(_);
				vignette.gadget(_, gadget);
			});

			instance.save(_);
			mobileDash = instance;

			instance = entity.factory.createInstance(_, null, db);
			instance.dashboardName(_, "UNITTEST-DASHBOARD-2");
			instance.description(_, "Test 2");
			instance.title(_, "Test 2");

			instance.save(_);
		} else {
			mobileDash = list[0];
		}
	});

	/*
	it('create mobile application', function(_) {
		var entity = db.model.getEntity(_, "mobileApplication");
		var list = db.fetchInstances(_, entity, {
			jsonWhere: {
				applicationName: "UNITTEST"
			}
		});
		
		strictEqual(list.length, 0, "no test case instance already there");
		if (list.length === 0) {
			var instance = entity.factory.createInstance(_, null, db);
			instance.applicationName(_, "UNITTEST");
			instance.description(_, "Test");
			instance.title(_, "Test");
			instance.homeDashboard(_, mobileDash);
			instance.endPoints(_).reset(_);
			instance.endPoints(_).set(_, adminHelper.getCollaborationEndpoint(_));

			var rep = instance.representations(_).add(_);
			rep.name(_, "mobileGadget");
			rep.facet(_, "$query");
			rep.cacheType(_, "$filtered");
			rep.filter(_, "gadgetType eq '$filtered'");

			instance.save(_);
			mobileApp = instance;
		} else {
			mobileApp = list[0];
		}
	});

	it('list mobile apps', function(_) {
		var res;
		mobileAppEntity.$services.availableApplications.$execute(_, {
			db: db,
			reply: function(_, code, data) {
				res = data;
			},
			parameters: {
				allApps: true
			}
		});
		var len = res && res.$resources && res.$resources.length;
		strictEqual(len, 1, "return exactly one app");
		if (len === 1) {
			var app = res.$resources[0];
			strictEqual(app.$uuid, mobileApp.$uuid, "uuid match");
			strictEqual(app.title, "Test", "title match");
			strictEqual(app.description, "Test", "description match");
		}

	});

	it('get mobile app meta data', function(_) {
		var res;

		mobileAppEntity.$services.applicationMetaData.$execute(_, {
			db: db,
			model: db.model,
			reply: function(_, code, data) {
				res = data;
			},
			getSelectedRoleId: function(_) {
				return roleInstance.$uuid;
			},
			getUserProfile: globals.context.session.getUserProfile,
			parameters: {

			},
			baseUrl: "http://localhost:8124/sdata/syracuse/collaboration/syracuse",
			instanceId: "syracuse.collaboration.syracuse.user.$query,user." + mobileApp.$uuid
		}, mobileApp);

		strictEqual(res != null, true, "returned meta data");
		if (res != null) {
			strictEqual(res.$application.$uuid, mobileApp.$uuid, "uuid match");
			strictEqual(res.$application.title, "Test", "title match");
			strictEqual(res.$application.description, "Test", "description match");

			strictEqual(res.$application.$homeDashboard.dashboardName, "UNITTEST", "homedashboard set");
			strictEqual(res.$dashboards[mobileDash.$uuid] != null, true, "homedashboard in meta data");

			Object.keys(pagesToCheck).forEach_(_, function(_, page) {
				strictEqual(res.$pages[page] != null, true, "page exists in result: " + page);
				var cache = res.$pages[page].$cache;
				var test = pagesToCheck[page];
				ok(test.cacheType ? cache.cacheType === test.cacheType : cache.cacheType === '$auto', "Cache type: " + cache.cacheType);
				ok(test.filter ? cache.filter === test.filter : cache.filter === null, "Cache filter: " + cache.filter);
			});

			Object.keys(gadgetsToCheck).forEach_(_, function(_, key) {
				var test = gadgetsToCheck[key];
				var cmp = res.$gadgets[key];
				strictEqual(cmp != null, true, "gadget exists: " + key);

				Object.keys(test).forEach_(_, function(_, prop) {
					strictEqual(test[prop], cmp[prop], "properties do match:" + prop + ": " + test[prop]);
				});
			});
		}

	});
	*/
});