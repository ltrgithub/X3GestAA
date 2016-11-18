"use strict";

exports.entity = {
	$titleTemplate: "Application connection item",
	$descriptionTemplate: "Items identifies connection properties",
	$createActionTitle: "New application connection item",
	$listTitle: "List of application connection items",
	$properties: {
		data: {
			$title: "Data",
			$type: "json",
			$isMandatory: true
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isDisabled: true
		},
	}
};