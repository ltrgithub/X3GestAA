"use strict";

var util = require('util');

exports.entity = {
	$titleTemplate: "License parameter data",
	$valueTemplate: "",
	$descriptionTemplate: "Version",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,
	$listTitle: "List of license parameters",
	$key: "",
	$properties: {
		title: {
			$title: "Title",
			$isReadOnly: true,
			$isLocalized: true
		},
		code: {
			$title: "Code",
			$isReadOnly: true
		},
		type: {
			$title: "Type",
			$isReadOnly: true
		},
		value: {
			$titel: "Value"
		}
	},
	$relations: {},
	$fetchInstances: function(_, context, parameters) {
		return [];
	},
	$functions: {
		$setId: function(_, context, id) {
			//
		}
	},
	$links: {}
	// ,
	// $defaultOrder: [["relNumber", true], ["patchNumber", true]]
};