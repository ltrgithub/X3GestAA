"use strict";

exports.entity = {
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true
		},
		/*title: {
			$title: "Title",
			$isMandatory: true
		},
		type: {
			$title: "Type",
			$isMandatory: true
		},*/

	},
	$defaultOrder: [
		["name", true]
	]
};