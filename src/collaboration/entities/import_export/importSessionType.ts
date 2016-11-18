"use strict";

exports.entity = {
	$titleTemplate: "Import session types",
	$valueTemplate: "{entityName}",
	$properties: {
		entityName: {
			$title: "Entity"
		}
	},
	$relations: {
		createdObjects: {
			$title: "Created objects",
			$type: "importSessionTypes",
			$isDynamicType: true
		},
		updatedObjects: {
			$title: "Updated objects",
			$type: "importSessionTypes",
			$isDynamicType: true
		}
	},
	$functions: {
		undo: function(_, options) {
			var o = options || {};
			var self = this;
			var targetRel = options.created ? self.createdObjects(_) : options.updated ? self.updatedObjects(_) : null;
			targetRel && targetRel.toArray(_).forEach_(_, function(_, obj) {
				obj.deleteSelf(_);
				obj.getAllDiagnoses(_, self.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
				if (!(self.$diagnoses || []).some(function(d) {
					return d.severity === "error";
				})) targetRel.deleteInstance(_, obj.$uuid);
			});
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