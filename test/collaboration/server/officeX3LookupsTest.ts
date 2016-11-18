"use strict";

var config = require('config'); // must be first syracuse require
var syracuse = require('syracuse-main/lib/syracuse');
var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var flows = require('streamline-runtime').flows;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

var lookupEnts = ["lookupX3Legislation", "lookupX3Company", "lookupX3ActivityCode"];
var templatePurposes = ["Quote", "Foreign Quote", "Draft", "Copy"];

var dataset = "SUPERV";
var user = "admin";
var tracer; // = console.log;

// skip the test if not enabled by config
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	if (config.unit_test && config.unit_test.suppress && config.unit_test.suppress.officeX3Lookup) {
		it('TESTS SKIPPED: module is suppressed in nodelocal.js', function() {});
	} else {
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

		if (testAdmin.getX3TestEndpointData() != null) {
			// conditional tests
			var _findX3Enpoint = function(_) {
				var eps = adminHelper.getEndpoints(_, {});
				var epMatch;
				flows.each(_, eps, function(_, ep) {
					if ("x3" === ep.protocol(_) && dataset === ep.dataset(_)) {
						epMatch = ep;
					}
				});
				return epMatch;
			};

			it('Test lookups X3', 1 + lookupEnts.length * 2, function(_) {
				var epData = _findX3Enpoint(_);
				strictEqual(epData != null, true, "X3 endpoint w. dataset " + dataset + " defined");

				var db = adminHelper.getCollaborationOrm(_);
				flows.each(_, lookupEnts, function(_, entName) {
					var entity = db.model.getEntity(_, entName);
					strictEqual(true, entity != null, "Entity " + entName + " known");

					var instances = [];
					if (entity) {
						instances = entity.$fetchInstances(_, {}, {
							"application": epData.application(_),
							"contract": epData.contract(_),
							"dataset": epData.dataset(_)
						});
					}
					strictEqual(instances.length > 0, true, "Fetching data with " + entName + " worked, count: " + instances.length);
				});

			});

			it('Test lookup templatePurpose', 3 + templatePurposes.length * 4, function(_) {
				var db = adminHelper.getCollaborationOrm(_);
				var entity = db.model.getEntity(_, "msoWordTemplateDocument");
				var instances = [];
				var purposeUuid = helpers.uuid.generate();
				var tplClass = "testcasetemplate.$query_" + purposeUuid;

				strictEqual(true, entity != null, "Entity msoWordTemplateDocument known");
				flows.each(_, templatePurposes, function(_, purpose) {
					// insert twice to test "distinct selection"
					flows.each(_, [0, 1], function(_, dummy) {
						var instance = entity.factory.createInstance(_, null, db);
						var descr = "TESTCASE: " + helpers.uuid.generate();
						instance.description(_, descr);
						instance.templateClass(_, tplClass);
						instance.templateType(_, "report");
						instance.templatePurpose(_, purpose + "_" + purposeUuid);
						instance.save(_);

						var diagnoses = [];
						instance.getAllDiagnoses(_, diagnoses);
						strictEqual(diagnoses.length, 0, "msoWordTemplateDocument instance correctly saved");
						if (diagnoses.length > 0) {
							tracer && tracer(util.format(diagnoses));
						} else {
							instances.push(instance);
						}
					});
				});

				entity = db.model.getEntity(_, "lookupTemplatePurposes");
				strictEqual(true, entity != null, "Entity lookupTemplatePurposes known");

				var purposes = [];
				if (entity) {
					purposes = entity.$fetchInstances(_, {}, {
						"templateClass": tplClass,
						"templateType": "report"
					});
				}

				strictEqual(templatePurposes.length, purposes.length, "Lookup returned expected amount of results: " + purposes.length);

				// Look over created instances
				flows.each(_, instances, function(_, purpSaved) {
					var match = false;
					flows.each(_, purposes, function(_, purpLookup) {
						if (purpLookup.name(_) === purpSaved.templatePurpose(_)) match = true;
					});

					strictEqual(true, match, "Lookup returned template purpose: " + purpSaved.templatePurpose(_));
				});

				flows.each(_, instances, function(_, purpSaved) {
					purpSaved.deleteSelf(_);
				});

			});
		} else {
			it('TESTS SKIPPED: test endpoint data missing', function() {});

		}
	}
});