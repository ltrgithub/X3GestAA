"use strict";

var util = require('util');

exports.entity = {
	$titleTemplate: "License badge data",
	$valueTemplate: "",
	$descriptionTemplate: "Version",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,
	$listTitle: "List of badge data in license",
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
		functions: {
			$title: "Functions",
			$isReadOnly: true
		}
	},
	$relations: {
		badge: {
			$title: "Badge",
			$type: "badge",
			$isReadOnly: true
		}

	},
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