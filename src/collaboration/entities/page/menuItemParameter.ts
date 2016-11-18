"use strict";

exports.entity = {
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true
		},
		title: {
			$title: "Title",
			$isLocalized: true
		},
		prompt: {
			$title: "Prompt",
			$description: "The user will be asked to enter a value for this parameter",
			$type: "boolean",
			$isNullable: true
		},
		value: {
			$title: "Value",
			$isMandatory: function(_, instance) {
				return !instance.prompt(_);
			}
		}
	},
	$defaultOrder: [
		["name", true]
	]
};