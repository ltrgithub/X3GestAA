"use strict";

exports.entity = {
	$titleTemplate: "Menu category",
	$descriptionTemplate: "Menu category",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Menu-categories",
	$allowFactory: true,
	$properties: {
		code: {
			$title: "Code",
			$isUnique: true
		},
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isLocalized: true
		}
	}
};