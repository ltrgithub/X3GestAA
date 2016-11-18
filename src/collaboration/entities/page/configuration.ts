"use strict";

var sys = require("util");
var config = require('config'); // must be first syracuse require
var factory = require("../../../../../src/orm/factory");

exports.entity = {
	$properties: {
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isMandatory: true,
			$isLocalized: true
		},
		version: {
			$title: "Version",
			$isMandatory: true
		},
		enable: {
			$title: "Enabled",
			$type: "boolean",
			$default: false
		}
	},
	$titleTemplate: "Configuration",
	$descriptionTemplate: "Configurations allows page versions management",
	$valueTemplate: "{description}",
	$relations: {
		parent: {
			$title: "Parent",
			$type: "configuration",
			$inv: "children",
			$propagate: function(_, instance, val) {
				// push all parents of the parent to the new object
				var allAncestors = val.allParents(_).toArray(_);
				// add the parent too
				allAncestors.push(val);
				//
				var allParentsColl = instance.allParents(_);
				allAncestors.forEach_(_, function(_, parent) {
					allParentsColl.set(_, parent);
				});
			}
		},
		children: {
			$title: "Children",
			$type: "configurations",
			$inv: "parent",
			isComputed: true
		},
		allParents: {
			$title: "All parents",
			$type: "configurations",
			$inv: "allChildrens"
		},
		allChildrens: {
			$title: "All childrens",
			$type: "configurations",
			$inv: "allParents",
			isComputed: true
		}
	},
	$services: {
		getActiveConfig: {
			$method: "get",
			$isMethod: false,
			$overridesReply: true,
			$execute: function(_, context) {
				var currentConfig;
				if (config.currentConfigVersion) {
					var configs = context.db.fetchInstances(_, context.model.getEntity(_, "configuration"), {
						jsonWhere: {
							version: config.currentConfigVersion
						}
					});
					if (configs && configs.length) currentConfig = configs[0];
				}
				if (!currentConfig) {
					// get the biggest config enabled
					var configs = context.db.fetchInstances(_, context.model.getEntity(_, "configuration"), {
						jsonWhere: {
							enable: true
						},
						orderBy: [{
							binding: "version",
							descending: true
						}]
					});
					if (configs && configs.length) currentConfig = configs[0];
				}
				//
				if (currentConfig) context.reply(_, 200, currentConfig.serializeInstance(_));
				else context.reply(_, 404);
			}
		}
	},
	$defaultOrder: [
		["version", true]
	]
};