"use strict";

exports.entity = {
	$properties: {
		menuProfile: {
			$title: "Menu profile",
			$isMandatory: true
		},
	},
	$relations: {
		role: {
			$title: "Role",
			$type: "role",
			$isMandatory: true
		}
	}
};