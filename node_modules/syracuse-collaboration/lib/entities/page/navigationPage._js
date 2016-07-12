"use strict";

var globals = require('streamline-runtime').globals;
var locale = require('streamline-locale');
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var navPageHelper = require('syracuse-collaboration/lib/entities/page/navPageHelper');

exports.entity = {
	$titleTemplate: "Navigation",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Navigation-pages",
	$allowFactory: true,
	$factoryExcludes: ["title", "description", "modules", "roles"],
	$properties: {
		pageName: {
			$title: "Page name",
			$isUnique: true,
			$isMandatory: true,
			$pattern: "^[a-zA-Z0-9_]*$",
			$patternMessage: "Page name can only contain a to z, A to Z, 0 to 9 and _ caracters",
			$linksToDetails: true
		},
		title: {
			$title: "Title",
			$isMandatory: true,
			$linksToDetails: true,
			$isLocalized: true
		},
		description: {
			$title: "Description",
			$isLocalized: true,
			$isHidden: true
		}
	},
	$relations: {
		modules: {
			$title: "Modules",
			$type: "menuModules",
			$capabilities: "sort,reorder,delete",
			$inv: "navigationPages",
			$nullOnDelete: true
		},
		roles: {
			$title: "Roles",
			$type: "roles",
			$inv: "navigationPage",
			$isComputed: true,
			$nullOnDelete: true
		}
	},
	$functions: {
		fullLoad: function(_, mm) {
			// load the full navigation page using a menu map
			var self = this;
			var db = self._db;
			var menus = mm || db.fetchInstances(_, db.getEntity(_, "menuItem"), {}).reduce_(_, function(_, prev, crt) {
				prev[crt.$uuid] = crt;
				return prev;
			}, {});
			self.modules(_).toArray(_).forEach_(_, function(_, module) {
				module.fullLoad(_, menus);
			});
		}
	},
	$links: function(_, instance) {
		var res = {};
		var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
		var entity = instance.getEntity(_);
		// reuse the titles of the links of the landingPage entity
		var stringRes = entity.contract.resources && entity.contract.resources() || {};

		if (!sp || !sp.authoringLevel(_) || sp.canUpdateClass(_, instance.getEntity(_).name)) res.admin = {
			"$title": stringRes["landingPage.$links.admin.$title"] || "Edit page content",
			"$url": "?representation={pageName}.$navigation_edit",
			"$method": "GET"
		};
		res.display = {
			"$title": stringRes["landingPage.$links.display.$title"] || "Preview",
			"$url": "?representation={pageName}.$navigation",
			"$method": "GET"
		};
		return res;
	},
	$services: {
		// could be useful !
		//		reorderModules: {
		//			$title: "Reorder modules",
		//			$description: "Reorder modules by application",
		//			$isMethod: true,
		//			$method: "POST",
		//			$execute: function(_, context, instance, parameters) {
		//				var db = adminHelper.getCollaborationOrm(_);
		//				navPageHelper.reorderModules(_, db, instance.pageName(_), {tracer: console.error});
		//				instance.$addDiagnose("info", locale.format(module, "modulesReordered", instance.pageName(_)));
		//			}
		//		}
	},
	$events: {

		$afterSave: [

			function(_) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("navigationPage");
			}
		]
	},
	$searchIndex: {
		$fields: ["pageName", "title", "description", "modules"]
	},
	$exportProfile: {
		$key: "pageName",
		$properties: ["title", "description"],
		$relations: {
			modules: {
				$key: "code",
				$properties: ["title", "description"],
				$relations: {
					application: {
						$key: ["application", "contract"]
					},
					submodules: {
						$key: "code",
						$properties: ["title", "description"],
						$relations: {
							application: {
								$key: ["application", "contract"]
							},
							items: {
								$variants: {
									menuBlock: {
										$key: "code",
										$id: "menuBlock",
										$properties: ["code", "title"],
										$relations: {
											items: {
												$variants: {
													menuBlock: {
														$type: "pointer",
														$id: "menuBlock"
													},
													menuItem: {
														$key: "code",
														$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
															"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
															"dashboard", "target", "processName", "processMenu", "processLeg",
															"statName", "requestName", "requestLevel"
														],
														$relations: {
															application: {
																$key: ["application", "contract"]
															},
															endpoint: {
																$key: "dataset"
															},
															representationRef: {
																$properties: ["entity", "representation"]
															},
															module: {
																$key: "code"
															},
															categories: {
																$key: "code",
																$properties: ["code", "description"]
															},
															parameters: {
																$key: "name",
																$properties: ["name", "title", "prompt", "value"]
															}
														}
													}
												}
											}
										}
									},
									menuItem: {
										$key: "code",
										$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
											"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
											"dashboard", "target", "processName", "processMenu", "processLeg",
											"statName", "requestName", "requestLevel"
										],
										$relations: {
											application: {
												$key: ["application", "contract"]
											},
											endpoint: {
												$key: "dataset"
											},
											representationRef: {
												$properties: ["entity", "representation"]
											},
											module: {
												$key: "code"
											},
											categories: {
												$key: "code",
												$properties: ["code", "description"]
											},
											parameters: {
												$key: "name",
												$properties: ["name", "title", "prompt", "value"]
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
};