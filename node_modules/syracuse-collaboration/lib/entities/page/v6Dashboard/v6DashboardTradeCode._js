"use strict";

var locale = require('streamline-locale');

exports.entity = {
	$properties: {
		//		dashboardName: {
		//			$title: "Dashboard name",
		//			$isHidden: function(_, instance) {
		//				return instance.user(_) == null;
		//			},
		//			$isMandatory: true
		//		}
	},
	$relations: {
		trade: {
			$isUnique: true,
			$type: "tradeProfileProxy",
			$isMandatory: true,
			$isChild: true,
			$lookup: {
				parameters: "dataset={dataset}"
			}
		},
	}
};