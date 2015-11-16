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
		user: {
			$isUnique: true,
			$type: "userProxy",
			$isMandatory: true,
			$isChild: true,
			$lookup: {
				parameters: "dataset={dataset}"
			}
		},
	}
};