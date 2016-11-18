"use strict";

var locale = require('streamline-locale');
var datetime = require('@sage/syracuse-core').types.datetime;

exports.entity = {
	$titleTemplate: "Import session",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Import-Session",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true,
			$linksToDetails: true,
			$isLocalized: true
		},
		importDate: {
			$title: "Import date",
			$type: "datetime",
			$isMandatory: true
		},
		errorDiags: {
			$title: "Errors",
			$isArray: true
		},
		warnDiags: {
			$title: "Warnings",
			$isArray: true
		}
	},
	$relations: {
		importTypes: {
			$type: "importSessionTypes",
			$isChild: true
		},
		endpoint: {
			$type: "endPoint"
		}
	},
	$init: function(_, instance) {
		instance.importDate(_, datetime.now());
	},
	$functions: {
		undo: function(_, options) {
			var o = options || {};
			var self = this;
			self.importTypes(_).toArray(_).forEach_(_, function(_, t) {
				t.undo(_, options);
			});
			self.save(_);
			if (!self.hasErrors(_)) self.$addDiagnose("info", locale.format(module, "undoExecuted"));
		}
	},
	$services: {
		undoCreated: {
			$title: "Delete created objects",
			$description: "Remove all created objects",
			$confirm: "This operation will delete all objects created by this import session. Do you want to continue ?",
			$method: "POST",
			$isMethod: true,
			$execute: function(_, context, instance, parameters) {
				instance.undo(_, {
					created: true
				});
			}
		},
		undoUpdated: {
			$title: "Delete updated objects",
			$description: "Remove all updated objects",
			$confirm: "This operation will delete all objects updated by this import session. Do you want to continue ?",
			$method: "POST",
			$isMethod: true,
			$execute: function(_, context, instance, parameters) {
				instance.undo(_, {
					updated: true
				});
			}
		}
	}
};