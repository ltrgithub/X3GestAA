"use strict";

exports.entity = {
	$titleTemplate: "Resource pack items",
	$properties: {
		fileName: {
			$title: "Export file name",
			$isMandatory: true
		}
	},
	$relations: {
		target: {
			$title: "Target",
			$isPlural: true,
			$variants: {
				genericExport: {
					$title: "Generic export profile",
					$type: "exportProfile"
				},
				persManagement: {
					$title: "Personalizations export profile",
					$type: "personalizationManagement"
				}
			}
		}
	}
};