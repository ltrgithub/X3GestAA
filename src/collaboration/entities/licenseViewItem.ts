"use strict";
var locale = require('streamline-locale');

exports.entity = {
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$titleTemplate: "License usage information item",
	$properties: {
		prod: {
			$title: "Product"
		},
		count: {
			$title: "Counter"
		},
		warn: {
			$title: "Warning"
		},
		openfield: {
			$title: "expand",
			$type: "boolean",
			$isHidden: true,
			$default: false
		},


	},
	$functions: {
		$setId: function(_, context, id) {}
	}
};