"use strict";

exports.entity = {
	$properties: {
		key: {
			$title: "Key",
			$isMandatory: true,

			$isUnique: true
		},
		title: {
			$title: "Title",
			$isMandatory: true
		},

	},

};