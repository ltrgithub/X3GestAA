"use strict";

var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;


exports.propsAvailable = ["canCreate", "canRead", "canWrite", "canDelete", "canExecute"];
//
exports.canModifyProperty = function(_, itemsCode, propName) {
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (!sp) return true;
	var spItems = sp && sp.profileItems(_).toArray(_).filter_(_, function(_, pi) {
		return itemsCode === pi.code(_);
	});
	var spSameItem = spItems.length === 1 ? spItems[0] : null;
	var refValue = spSameItem && spSameItem[propName] && spSameItem[propName](_);
	return refValue === true;
};

exports.entity = {
	$titleTemplate: "Security profile items",
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$isReadOnly: true
		},
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,
			$isReadOnly: true
		},
		canCreate: {
			$title: "Create",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return !exports.canModifyProperty(_, instance.code(_), "canCreate");
			}
		},
		canRead: {
			$title: "Read",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return !exports.canModifyProperty(_, instance.code(_), "canRead");
			}
		},
		canWrite: {
			$title: "Update",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return !exports.canModifyProperty(_, instance.code(_), "canWrite");
			}
		},
		canDelete: {
			$title: "Delete",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return !exports.canModifyProperty(_, instance.code(_), "canDelete");
			}
		},
		canExecute: {
			$title: "Execute",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return !exports.canModifyProperty(_, instance.code(_), "canExecute");
			}
		}
	},
	$functions: {
		// canCreateClass returns:
		//   true if the user can create an instance in the class
		//   false if the user cannot create an instance in the class

	},
	$events: {
		$canSave: [

			function(_, instance) {

				var canSave = true;
				exports.propsAvailable.forEach_(_, function(_, p) {
					if (instance[p](_) === true && !exports.canModifyProperty(_, instance.code(_), p)) {
						instance.$addError(locale.format(module, "propRestricted", p, instance.code(_)));
						canSave = false;
					}
				});
				return canSave;
			}
		]
	},
};