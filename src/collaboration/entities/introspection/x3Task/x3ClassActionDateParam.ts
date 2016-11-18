"use strict";

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "X3 action parameters",
	$descriptionTemplate: "Parameters for actions of X3 class",
	$valueTemplate: "{name}",

	$properties: {
		name: {
			$title: "Parameter name",
			$isDisabled: true

		},
		type: {
			$title: "type",
			$isHidden: true
		},
		value: {
			$title: "Value",
			$type: "date"
		}


	},
	$relations: {},
	$services: {}
};