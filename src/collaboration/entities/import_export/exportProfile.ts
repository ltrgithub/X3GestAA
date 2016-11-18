"use strict";

var sys = require("util");
var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var jsonExport = require("syracuse-import/lib/jsonExport");
var jsurl = require("jsurl");

exports.entity = {
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$isUnique: true
		},
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isMandatory: true,
			$isUnique: true
		},
		applicationName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.application(_) && instance.application(_).application(_)) || "syracuse";
			}
		},
		contractName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.application(_) && instance.application(_).contract(_)) || "collaboration";
			}
		},
		endpointName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.endpoint(_) && instance.endpoint(_).dataset(_)) || "syracuse";
			}
		},

	},
	$titleTemplate: "Export",
	$descriptionTemplate: "Administration data export",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Export-profiles",
	$relations: {
		application: {
			$title: "Application",
			$type: "application",
			$isDefined: true,
			$isMandatory: true,
			defaultValue: function(_) {
				return adminHelper.getCollaborationApplication(_);
			}
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true,
			$isDefined: true,
			defaultValue: function(_) {
				return adminHelper.getCollaborationEndpoint(_);
			}
		},
		locales: {
			$title: "Locales",
			$type: "localePreferences"
		},
		exportProfileItem: {
			$title: "Profile Item",
			$type: "exportProfileItems",
			$capabilities: "sort,reorder,delete",
			//			$isMandatory: true,
			$isChild: true,
			$select: {
				$title: "Entities",
				$type: "lookupEntity", // "lookupRepresentation",
				$fieldMap: {
					className: "name",
					/* representation: "name",*/
					title: "title"
				},
				$parameters: "application={applicationName}&contract={contractName}&dataset={endpointName}"
			},
		},
	},
	$functions: {
		generateContent: function(_, options) {
			var opt = options || {};
			var instance = this;
			if ((!opt.locales || !opt.locales.length) && instance.locales(_).getLength()) opt.locales = instance.locales(_).toArray(_).map_(_, function(_, it) {
				return it.code(_);
			});
			//
			return jsonExport.jsonExport(_, this, opt);
		}
	},
	$services: {
		exportProfile: {
			$title: "Export",
			$method: "GET",
			$isMethod: true,
			$type: "application/x-export",
			$parameters: {
				$url: "{$baseUrl}/selectExportTargets/$template/$workingCopies?representation=selectExportTarget.$edit&targetTypes=download,file,db_file,server&role={$role}",
				$method: "POST",
				$properties: {
					parameters: {
						$type: "application/x-string"
					},
					linkType: {
						$type: "application/x-string"
					}
				}
			},
			$invocationMode: "async",
			$execute: function(_, context, instance) {
				var opt = context.parameters.parameters && jsurl.parse(context.parameters.parameters);

				var t = context.tracker;
				if (t) {
					t.$diagnoses = t.$diagnoses || [];
					opt.$diagnoses = t.$diagnoses;
					opt.tracker = t;

				} else {
					instance.$diagnoses = instance.$diagnoses || [];
				}
				if (!opt.path) opt.path = instance.code(_);
				if (t && opt && opt.targetType === "download") {
					t.replyLink = "$download";
				}
				if ((!opt.locales || !opt.locales.length) && instance.locales(_).getLength()) opt.locales = instance.locales(_).toArray(_).map_(_, function(_, it) {
					return it.code(_);
				});

				var exp = jsonExport.jsonExport(_, instance, opt);

				if (t && opt && opt.targetType === "download") {
					t.$links = t.$links || {};
					t.$links.$download = {
						$title: "Download",
						$url: t.location + "?reply=true",
						$method: "GET",
						$type: "application/json",
						$filename: opt.path + ".json"
					};
				}
				return JSON.stringify(exp, null, opt.beautify ? "\t" : null);
			}
		}
	},
	$searchIndex: {
		$fields: ["description"]
	}
};