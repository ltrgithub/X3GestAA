"use strict";

var globals = require('streamline-runtime').globals;
var sys = require("util");

exports.entity = {
	$titleTemplate: "Menu module",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Menu-modules",
	$allowFactory: true,
	$factoryExcludes: ["description", "submodules", "endpoints", "navigationPages"],
	$properties: {
		code: {
			$title: "Code",
			$isUnique: true,
			$isMandatory: true,
			$linksToDetails: true
		},
		title: {
			$title: "Title",
			$isMandatory: true,
			$isLocalized: true,
			$linksToDetails: true
		},
		description: {
			$title: "Description",
			$isHidden: true,
			$isLocalized: true
		}
	},
	$relations: {
		submodules: {
			$title: "Submodules",
			$type: "menuBlocks",
			$capabilities: "sort,reorder,delete",
			$lookupFilter: {
				application: "{application}"
			}
		},
		application: {
			$title: "Application",
			$type: "application",
			$isMandatory: true,
			defaultValue: function(_, instance) {
				var up = globals.context.session && globals.context.session.getUserProfile(_);
				if (up && up.selectedEndpoint(_)) return up.selectedEndpoint(_).applicationRef(_);
			}
		},
		endpoints: {
			$title: "Endpoints",
			$type: "endPoints"
		},
		navigationPages: {
			$title: "Navigation pages",
			$type: "navigationPages",
			$inv: "modules",
			$isComputed: true,
			$nullOnDelete: true
		}
	},
	$functions: {
		fullLoad: function(_, menus) {
			this.submodules(_).toArray(_).forEach_(_, function(_, sm) {
				sm.fullLoad(_, menus);
			});
		}
	},
	$events: {
		$afterSave: [

			function(_, instance, params) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("navigationPage");
				// add module to origin page
				if (params && params.originPage) {
					var page = instance._db.fetchInstance(_, instance._db.getEntity(_, "navigationPage"), params.originPage);
					if (page) {
						page.modules(_).set(_, instance);
						page.save(_, null, {
							shallowSerialize: true
						});
					}
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["code", "title", "description", "application", "navigationPages"]
	}
};