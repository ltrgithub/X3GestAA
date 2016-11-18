"use strict";

var syracuse = require('syracuse-main/lib/syracuse');
var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var adminHelper = require("../../../src/collaboration/helpers");
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var flows = require('streamline-runtime').flows;
var util = require('util');

var user = "guest";
var db;

globals.context.session = {
	id: helpers.uuid.generate(),
	getUserLogin: function(_) {
		return user;
	},
	getUserProfile: function(_) {
		return {
			user: function(_) {
				//var db = adminHelper.getCollaborationOrm(_);
				return db.fetchInstance(_, db.model.getEntity(_, "user"), {
					jsonWhere: {
						login: user
					}
				});
			},
			selectedLocale: function(_) {
				//var db = adminHelper.getCollaborationOrm(_);
				var locale = db.fetchInstance(_, db.model.getEntity(_, "localePreference"), {});
				return locale;
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

globals.context.request = globals.context.request || {};
globals.context.request.context = globals.context.request.context || {};
globals.context.request.context.parameters = globals.context.request.context.parameters || {};

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('initialise', function(_) {
		var config = {
			application: "syracuse",
			contract: "collaboration",
			dataset: "unit_test"
		};
		adminHelper.setup(config);
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environment initialized");
	});

	var templateLocale = "de-DE";
	var repsToTest = [{
		"representation": "msoMailMergeTemplate.$edit",
		"expectedTemplateType": "mailmerge",
		"expectedTemplateClass": "testcase_mailmerge.$query",
		"expectedLocale": templateLocale
	}, {
		"representation": "msoReportTemplate.$edit",
		"expectedTemplateType": "report",
		"expectedTemplateClass": "testcase_report.$query",
		"expectedLocale": templateLocale
	}];

	// Test initialisation of workingcopy of entity msoWordTemplateDocument ($init)
	it('Test template initialisation', function(_) {
		var entity = db.model.getEntity(_, "msoWordTemplateDocument");
		strictEqual(true, entity != null, "Entity msoWordTemplateDocument known");

		flows.each(_, repsToTest, function(_, repr) {

			globals.context.request.context.parameters = {
				"representation": repr.representation,
				"templateClass": repr.expectedTemplateClass,
				"templateLocale": repr.expectedLocale
			};

			var instance = entity.factory.createInstance(_, null, db);
			var descr = "TESTCASE: " + helpers.uuid.generate();
			instance.code(_, "T1");
			instance.description(_, descr);
			instance.save(_);

			var diagnoses = [];
			instance.getAllDiagnoses(_, diagnoses, {
				addPropName: true
			});
			strictEqual(diagnoses.length, 0, "msoWordTemplateDocument instance correctly saved");

			if (diagnoses.length > 0) {
				console.error(util.format(diagnoses));
			}

			var instance2 = db.fetchInstance(_, entity, {
				jsonWhere: {
					localeCode: repr.expectedLocale,
					templateClass: repr.expectedTemplateClass,
					description: descr
				}
			});
			strictEqual(true, instance2 != null, "Created instance could be found querying by properties");

			var instance3 = db.fetchInstance(_, entity, {
				jsonWhere: {
					$uuid: instance.$uuid
				}
			});
			strictEqual(true, instance3 != null, "Created instance could be found querying by $uuid");

			strictEqual(instance3.description(_), descr, "Description matches: " + instance3.description(_));
			strictEqual(instance3.localeCode(_), repr.expectedLocale, "Locale code matches: " + instance3.localeCode(_));
			strictEqual(instance3.templateClass(_), repr.expectedTemplateClass, "Class matches: " + instance3.templateClass(_));
			strictEqual(instance3.templateType(_), repr.expectedTemplateType, "Type matches: " + instance3.templateType(_));

			instance.deleteSelf(_);
		});
	});
});