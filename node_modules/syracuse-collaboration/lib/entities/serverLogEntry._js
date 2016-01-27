"use strict";

exports.entity = {
	$titleTemplate: "Server log entry",
	$valueTemplate: "{description}/{logDate}",
	$canCreate: false,
	$canEdit: false,
	$helpPage: "Administration-reference_Server-logs",
	$properties: {
		severity: {
			$title: "Severity",
			$isMandatory: true,
		},
		message: {
			$title: "Message",
			$isMandatory: true,
		}
	},
};