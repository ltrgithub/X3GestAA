"use strict";

exports.entity = {
	$properties: {
		product: {
			$title: "Product",
			$isMandatory: true,
		},
		period: {
			$title: "Period"
		},
		counter: {
			$title: "Count",
			$type: "integer",
			$default: 0
		},
		server: {
			$title: "Server",
			$isHidden: true
		}
	},
	$titleTemplate: "Tenants",
	$valueTemplate: "{tenantId}",
};