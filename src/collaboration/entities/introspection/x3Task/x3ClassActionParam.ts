"use strict";
var locale = require('streamline-locale');

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
			$description: function(_, instance) {
				return instance.type(_);
			},
			$propagate: function(_, instance, val) {
				// check if the value correspond to the type and raise an error if it's not the case
				switch (instance.type(_)) {
					case "application/x-decimal":
						if (isNaN(parseFloat(val, 10))) {
							instance.$diagnoses = instance.$diagnoses || [];
							instance.$diagnoses.push({
								$severity: "error",
								$message: locale.format(module, "notDecimal", val, instance.name(_)),
							});
						}
						break;
					case "application/x-integer":
						if (isNaN(parseInt(val, 10))) {
							instance.$diagnoses = instance.$diagnoses || [];
							instance.$diagnoses.push({
								$severity: "error",
								$message: locale.format(module, "notInteger", val, instance.name(_)),
							});

						}

						break;
					default:
						//nothin
				}
			}
		}


	},
	$relations: {},
	$services: {}
};