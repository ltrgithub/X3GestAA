"use strict";

var util = require("util");
var check = require('../../..//src/license/check');
var fs = require('streamline-fs');
var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("../../collaboration/helpers").AdminHelper;
var globals = require('streamline-runtime').globals;
var syracuseDate = require('@sage/syracuse-core').types.date;
var htmlEscape = helpers.string.htmlEscape;
var config = require('syracuse-main/lib/nodeconfig').config;
var devMode = config && config.system && config.system.enableDevelopmentFeatures;

var tracer; // = console.log

exports.entity = {
	$isPersistent: false,
	$autoRecreateWorkingCopy: true,
	$canDelete: false,
	$canSave: false,
	$properties: {
		content: {
			$title: "Content"
		},
		upload: {
			$title: "Upload",
			$contentType: "application/octet-stream",
			$type: "binary",
			$storage: "db_file"
		}
	},
	$titleTemplate: "License upload",
	$valueTemplate: "License upload",
	$descriptionTemplate: "License upload",
	$helpPage: "Administration-reference_License-data",
	$functions: {},
	$services: {
		/*
		$test: {
			$method: "POST",
			$isMethod: true,
			$title: "Test mail",
			$execute: function(_, context, instance) {
				var db = adminHelper.getCollaborationOrm(_);
				var events = db.fetchInstances(_, db.model.getEntity(_, "notificationEvent"), {
				});
				if (events.length > 0) {
					console.log("Testmail "+events[0].code(_))
					var executionTime = Date.now();
					var parameters =  { expiryDate:
						'2013-10-25',
						  partnerId: '',
						  productCode: 'ERP',
						  productTitle: { 'en-us': 'Sage ERP X3', 'fr-fr': 'Sage ERP X3' },
						  productVersion: '7.0',
						  policyCode: 'ERPSTD',
						  policyTitle: { 'en-us': 'Standard edition', 'fr-fr': 'Edition standard' },
						  daysBefore: 11,
						  policyVersion: '1.0' };
					events[0].schedule(_, executionTime, executionTime+15000, parameters, 2);					
				}
			}
		},
		*/
		/* test function which changes the `check` module and therefore will cause the license system to stop working
		$test: {
			$method: "POST",
			$isMethod: true,
			$title: "Destroy",
			$execute: function(_, context, instance) {
			
				var t = check.checkConcurrent;
				// checkConcurrent(_, session, role, userName, device, diagnoses)
				require('../../..//src/license/index').load('license').unsinn = 1;
				check.checkConcurrent = function(_, session, role, userName, device, diagnoses) {
					return t(_, session, role, userName, device, diagnoses);
				};
			}
		},
		*/
		current: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "current",
			$execute: function(_, context) {
				return check.validLicenses();
			}
		},
		usedBadges: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "used badges",
			$execute: function(_, context) {
				var syracuse = require('syracuse-main/lib/syracuse');
				var res = check.findUsedBadges(_, globals.context.session && globals.context.session.device);
				return res;
			}
		},
		$x3Info: {
			$method: "POST",
			$isMethod: true,
			$title: "Get X3 Info",
			$parameters: {
				$properties: {
					"product": {
						$title: "Product",
						$type: "application/x-string",
						$value: ""
					},
					"version": {
						$title: "Version",
						$type: "application/x-string",
						$value: "",
					},
				}
			},
			$isDefined: function(_, instance) {
				return devMode;
			},
			$execute: function(_, context, instance, parameters) {
				if (!parameters) {
					parameters = context.parameters;
				}
				instance.$diagnoses = instance.$diagnoses || [];
				var res = check.getX3LicenseInfo(_, parameters.product, parameters.version, context.request.session, instance.$diagnoses);
				if (res) instance.content(_, util.format(res));
				return;
			},
		},
		x3infos: {
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "x3infos",
			$execute: function(_, context, parameters) {
				if (!parameters) {
					parameters = context.parameters;
				}
				if (!parameters || !parameters.product || !parameters.version) return "Need parameters 'product' and 'version'";
				var diags = [];
				var res = check.getX3LicenseInfo(_, parameters.product, parameters.version, context.request.session, diags);
				if (diags.length) return diags;
				return res;
			},
		},
		$loadLicense: {
			$method: "PUT",
			$isMethod: true,
			$title: "Upload license",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				var upload = instance.upload(_);
				if (upload.fileExists(_)) {
					content = upload.createReadableStream(_).read(_, -1).toString("utf8");
				} else {
					var content = instance.content(_);
					if (content) {
						content = content.trim();
					} else {
						instance.$diagnoses.push({
							severity: "error",
							message: locale.format(module, "noContent")
						});
						return;
					}
				}
				try {
					check.licenseChange(content, instance.$diagnoses, _);
					if (instance.$diagnoses.length === 0) instance.$diagnoses.push({
						severity: "info",
						message: locale.format(module, "OK")
					});
				} catch (e) {
					console.log(e.stack);
					instance.$diagnoses.push({
						severity: "error",
						message: "" + e
					});
				}
			}
		}
	}
};