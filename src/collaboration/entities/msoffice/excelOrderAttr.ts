"use strict";

exports.entity = {
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true
		},
		title: {
			$title: "Title",
			$isMandatory: true
		},
		order: {
			$title: "Order",
			$enum: [{
				$value: "asc",
				$title: "Ascending"
			}, {
				$value: "desc",
				$title: "Descending"
			}],
			$default: "asc"
		}
	},
	$defaultOrder: [
		["name", true]
	]
};