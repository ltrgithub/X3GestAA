"use strict";

exports.entity = {
	$properties: {
		tenantId: {
			$title: "Tenant ID",
			$isMandatory: true,
		},
		active: {
			$title: "active",
			$type: "boolean",
			$default: true
		}
	},
	$titleTemplate: "Tenants",
	$valueTemplate: "{tenantId}",
};