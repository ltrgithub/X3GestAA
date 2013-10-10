"use strict";

var util = require('util');

exports.entity = {
	$titleTemplate: "License part data",
	$valueTemplate: "",
	$descriptionTemplate: "Version",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,
	$listTitle: "List of license parts",
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
		availability: {
			$title: "Availability",
			$isReadOnly: true,
			$enum: [{
				$value: "licensed",
				$title: "licensed"
			}, {
				$value: "never",
				$title: "never"
			}, {
				$value: "always",
				$title: "always"
			}, {
				$value: "unlicensed",
				$title: "not licensed"
			}]
		},
		valStart: {
			$title: "Start of validity",
			$type: "date",
			$isReadOnly: true
		},
		valEnd: {
			$title: "End of validity",
			$type: "date",
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