"use strict";

var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;

var locale = require('streamline-locale');
var config = require('config'); // must be first syracuse require

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Patches",
	$descriptionTemplate: "Patches",
	$helpPage: "Patches",
	$properties: {
		name: {
			$title: "Name",
			$isDisabled: true
		},
		description: {
			$title: "Description",
			$isDisabled: true
		},
		mandatory: {
			$title: "Mandatory",
			$type: "boolean",
			$isDisabled: true
		},
		apply: {
			$title: "Apply",
			$type: "boolean",
			$isDisabled: function(_, instance) {
				return instance.mandatory(_);
			},
		},
		type: {
			$title: "Type",
			$isDisabled: true,
			$isHidden: true,
		},
		path: {
			$title: "Path",
			$isDisabled: true,
			$isHidden: true,
		},
		firstMaintenance: {
			$title: "firstMaintenance",
			$type: "integer",
			$isDisabled: true,
			$isHidden: true,
		},
		lastMaintenance: {
			$title: "lastMaintenance",
			$type: "integer",
			$isDisabled: true,
			$isHidden: true,
		},
		legislation: {
			$title: "Legislation",
			$isDisabled: true
		}
	},
	$relations: {},
	// $init: function(_, instance) {
	// 	instance.apply(_, instance.apply(_) || true);
	// },
	$functions: {},
	$services: {}
};