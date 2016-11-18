"use strict";

var jsonExport = require("syracuse-import/lib/jsonExport");
var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var jsurl = require("jsurl");
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;

exports.entity = {
	$titleTemplate: "Personnalizations management",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Personalization-management",
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$linksToDetails: true
		},
		description: {
			$title: "Description",
			$isMandatory: true
		},
		dashboardsExport: {
			$title: "Export dashboards",
			$description: "Dashboards, associated vignettes and menus will be exported",
			$type: "boolean"
		},
		dashboardFilter: {
			$title: "Dashboard filter",
			$description: "An empty filter means all elements will be selected",
			$type: "filter",
			$filterRepresentation: "dashboardDef",
			$isDefined: function(_, instance) {
				return instance.dashboardsExport(_);
			}
		},
		dashboardVignetteFilter: {
			$title: "Dashboard variants filter",
			$type: "filter",
			$filterRepresentation: "dashboardVariant",
			$isDefined: function(_, instance) {
				return instance.dashboardsExport(_);
			}
		},
		dashboardInnerJoin: {
			$title: "Export dashboard if at least one variant matches the filter",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return true;
				//				return instance.dashboardsExport(_) && (((instance.dashboardFilter(_) || "") != "") || ((instance.dashboardVignetteFilter(_) || "")  != ""));
			},
			$isNullable: true
		},
		pagesExport: {
			$title: "Export pages",
			$type: "boolean"
		},
		pageFilter: {
			$title: "Page filter",
			$description: "An empty filter means all elements will be selected",
			$type: "filter",
			$filterRepresentation: "pageDef",
			$isDefined: function(_, instance) {
				return instance.pagesExport(_);
			}
		},
		pageVignetteFilter: {
			$title: "Page variants filter",
			$type: "filter",
			$filterRepresentation: "pageVariant",
			$isDefined: function(_, instance) {
				return instance.pagesExport(_);
			}
		},
		pageInnerJoin: {
			$title: "Export page if at least one variant matches the filter",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return true;
				//				return instance.pagesExport(_) && (((instance.pageFilter(_) || "") != "") || ((instance.pageVignetteFilter(_) || "")  != ""));
			},
			$isNullable: true
		},
		navPagesExport: {
			$title: "Export navigation pages",
			$type: "boolean"
		},
		navPageFilter: {
			$title: "Navigation page filter",
			$description: "An empty filter means all elements will be selected",
			$type: "filter",
			$filterRepresentation: "navigationPage",
			$isDefined: function(_, instance) {
				return instance.navPagesExport(_);
			}
		},
		navPageModulesFilter: {
			$title: "Navigation page modules filter",
			$type: "filter",
			$filterRepresentation: "menuModule",
			$isDefined: function(_, instance) {
				return instance.navPagesExport(_);
			}
		},
		navPageSubmodulesFilter: {
			$title: "Navigation page sub-modules filter",
			$type: "filter",
			$filterRepresentation: "menuBlock",
			$isDefined: function(_, instance) {
				return instance.navPagesExport(_);
			}
		},
		navPageInnerJoin: {
			$title: "Export navigation page if at least one module / sub-module matches the filter",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return instance.navPagesExport(_);
			},
			$isNullable: true
		},
		navPageCleanupScript: {
			$title: "Enable navigation page cleanup scripts. Filter on factoryOwner is required for this option",
			$type: "boolean",
			$isDefined: function(_, instance) {
				var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
				return instance.navPagesExport(_) && sp && sp.sageOwner(_);
			},
			$isNullable: true
		},
		navPageFactoryOwner: {
			$title: "Factory owner for navigation page cleanup scripts",
			$isDefined: function(_, instance) {
				return instance.navPageCleanupScript(_);
			},
			$default: function(_) {
				var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
				return sp && sp.factoryOwner(_);
			}
		},
		homepagesExport: {
			$title: "Export home pages",
			$description: "Home pages, associated vignettes and menus will be exported",
			$type: "boolean"
		},
		homepageFilter: {
			$title: "Home page filter",
			$description: "An empty filter means all elements will be selected",
			$type: "filter",
			$filterRepresentation: "landingPage",
			$isDefined: function(_, instance) {
				return instance.homepagesExport(_);
			}
		},
		menusExport: {
			$title: "Export menus",
			$description: "Menus will be exported",
			$type: "boolean"
		},
		menuFilter: {
			$title: "Menus filter",
			$description: "An empty filter means all elements will be selected",
			$type: "filter",
			$filterRepresentation: "menuItem",
			$isDefined: function(_, instance) {
				return instance.menusExport(_);
			}
		}
	},
	$relations: {
		locales: {
			$title: "Locales",
			$type: "localePreferences"
		}
	},
	$functions: {
		// standard function for resource pack
		generateContent: function(_, options) {
			return this.exportPersonalizations(_, options);
		},
		exportPersonalizations: function(_, options) {
			var opt = options;
			var instance = this;
			//
			if ((!opt.locales || !opt.locales.length) && instance.locales(_).getLength()) opt.locales = instance.locales(_).toArray(_).map_(_, function(_, it) {
				return it.code(_);
			});
			// make an temp export profile
			var ep = adminHelper.getCollaborationEndpoint(_);
			var db = ep.getOrm(_);
			var profEntity = db.getEntity(_, "exportProfile");
			var profile = profEntity.createInstance(_, db);
			profile.endpoint(_, ep);
			if (instance.dashboardsExport(_)) {
				var ent = db.getEntity(_, "dashboardDef");
				var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
				if (instance.dashboardVignetteFilter(_)) stdProfileItem.$relations.variants.$filter = instance.dashboardVignetteFilter(_);
				stdProfileItem.$relations.variants.$exportParentIfEmpty = !instance.dashboardInnerJoin(_);
				//
				var dItem = profile.exportProfileItem(_).add(_);
				dItem.className(_, "dashboardDef");
				dItem.standardProfile(_, true);
				if (instance.dashboardFilter(_)) dItem.filter(_, instance.dashboardFilter(_));
				else dItem.exportAll(_, true);
				dItem._stdExportProfile = stdProfileItem;
			}
			if (instance.pagesExport(_)) {
				var ent = db.getEntity(_, "pageDef");
				var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
				if (instance.pageVignetteFilter(_)) stdProfileItem.$relations.variants.$filter = instance.pageVignetteFilter(_);
				stdProfileItem.$relations.variants.$exportParentIfEmpty = !instance.pageInnerJoin(_);
				//
				var dItem = profile.exportProfileItem(_).add(_);
				dItem.className(_, "pageDef");
				dItem.standardProfile(_, true);
				if (instance.pageFilter(_)) dItem.filter(_, instance.pageFilter(_));
				else dItem.exportAll(_, true);
				dItem._stdExportProfile = stdProfileItem;
			}
			if (instance.navPagesExport(_)) {
				var ent = db.getEntity(_, "navigationPage");
				var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
				if (instance.navPageModulesFilter(_)) stdProfileItem.$relations.modules.$filter = instance.navPageModulesFilter(_);
				stdProfileItem.$relations.modules.$exportParentIfEmpty = !instance.navPageInnerJoin(_);
				if (instance.navPageSubmodulesFilter(_)) stdProfileItem.$relations.modules.$relations.submodules.$filter = instance.navPageSubmodulesFilter(_);
				stdProfileItem.$relations.modules.$relations.submodules.$exportParentIfEmpty = !instance.navPageInnerJoin(_);
				//
				var dItem = profile.exportProfileItem(_).add(_);
				dItem.className(_, "navigationPage");
				dItem.standardProfile(_, true);
				if (instance.navPageFilter(_)) dItem.filter(_, instance.navPageFilter(_));
				else dItem.exportAll(_, true);
				dItem._stdExportProfile = stdProfileItem;
				// check if factory export
				if (instance.navPageCleanupScript(_) && instance.navPageFilter(_)) {
					dItem._scripts = {
						$options: {
							unmark: "pre_import"
						},
						"$scriptsBefore": [{
							"module": "../../../src/collaboration/advancedScripts/pre-import-sitemap",
							"options": {
								"homepagesFilter": instance.navPageFilter(_),
								"modulesFilter": instance.navPageModulesFilter(_),
								"submodulesFilter": instance.navPageSubmodulesFilter(_),
								"factoryOwner": instance.navPageFactoryOwner(_)
							}
						}],
						"$scriptsAfter": [{
							"module": "../../../src/collaboration/advancedScripts/post-import-sitemap",
							"options": {
								"homepagesFilter": instance.navPageFilter(_),
								"modulesFilter": instance.navPageModulesFilter(_),
								"submodulesFilter": instance.navPageSubmodulesFilter(_),
								"factoryOwner": instance.navPageFactoryOwner(_)
							}
						}]
					};
				}
			}
			if (instance.homepagesExport(_)) {
				var ent = db.getEntity(_, "landingPage");
				var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
				//
				var dItem = profile.exportProfileItem(_).add(_);
				dItem.className(_, "landingPage");
				dItem.standardProfile(_, true);
				if (instance.homepageFilter(_)) dItem.filter(_, instance.homepageFilter(_));
				else dItem.exportAll(_, true);
				dItem._stdExportProfile = stdProfileItem;
			}
			if (instance.menusExport(_)) {
				var ent = db.getEntity(_, "menuItem");
				var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
				//
				var dItem = profile.exportProfileItem(_).add(_);
				dItem.className(_, "menuItem");
				dItem.standardProfile(_, true);
				if (instance.menuFilter(_)) dItem.filter(_, instance.menuFilter(_));
				else dItem.exportAll(_, true);
				dItem._stdExportProfile = stdProfileItem;
			}
			//

			return jsonExport.jsonExport(_, profile, opt);
		}
	},
	$services: {
		exportPerso: {
			$title: "Export personalizations",
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
					opt.$diagnoses = instance.$diagnoses;
				}
				if (!opt.path) opt.path = instance.code(_);
				if (t && opt && opt.targetType === "download") {
					t.replyLink = "$download";
				}

				var pers = instance.exportPersonalizations(_, opt);

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
				return JSON.stringify(pers, null, opt.beautify ? "\t" : null);
			}
		},
		schedule: {
			$method: "POST",
			$title: "Schedule personalizations update",
			$isMethod: true,
			$parameters: {
				$url: "{$baseUrl}/selectPMSchedulers/$template/$workingCopies?representation=selectPMScheduler.$edit&role={$role}",
				$method: "POST",
				$properties: {
					parameters: {
						$type: "application/x-string"
					}
				}
			},
			//			$urlParameters: "parameters={parameters}",
			$execute: function(_, context, instance, parameters) {
				if (!parameters || !parameters.parameters) parameters = context.parameters.parameters && jsurl.parse(context.parameters.parameters);
				else {
					parameters = jsurl.parse(parameters.parameters);
				}
				if (!parameters) return;
				if (!parameters.scheduler) return;
				//
				var a = instance._db.fetchInstance(_, instance._db.getEntity(_, "automate"), parameters.scheduler.$uuid);
				if (!a) return;
				var taskExec = instance._db.getEntity(_, "exportPersonalization").createInstance(_, instance._db);
				taskExec.profile(_, instance);
				parameters.selectTarget.$uuid = helpers.uuid.generate();
				var options = instance._db.getEntity(_, "selectExportTarget").createInstance(_, instance._db, parameters.selectTarget);
				taskExec.options(_, options);
				var diag = a.defineNewTask(_, locale.format(module, "pmTaskLabel"), taskExec);
				if (diag.some(function(d) {
						return d.severity === "error";
					})) diag.forEach(function(d) {
					instance.$addDiagnose(d.severity, d.message);
				});
				else instance.$addDiagnose("success", locale.format(module, "taskCreated", a.description(_)));
			}
		}
	}
};