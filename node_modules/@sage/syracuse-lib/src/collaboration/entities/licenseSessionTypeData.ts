"use strict";

var util = require('util');

exports.entity = {
	$titleTemplate: "License session type data",
	$valueTemplate: "",
	$descriptionTemplate: "Version",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,
	$listTitle: "List of session type data in license",
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
		max: {
			$title: "Maximum",
			$isReadOnly: true,
			$type: "integer"
		},
		devices: {
			$title: "Devices",
			$isReadOnly: true
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