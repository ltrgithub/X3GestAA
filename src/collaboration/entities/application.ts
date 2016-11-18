"use strict";
var locale = require('streamline-locale');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
exports.entity = {
	$withCache: true,
	$titleTemplate: "Applications",
	$descriptionTemplate: "Application and contract names identifies a service",
	$helpPage: "Administration-reference_Applications",
	$valueTemplate: "{description}",
	$createActionTitle: "New application",
	$listTitle: "List of applications",
	$allowFactory: true,
	$factoryExcludes: ["description", "endpoints", "defaultEndpoint"],
	$properties: {
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isLocalized: true,
			$isMandatory: true,
			$isUnique: true
		},
		protocol: {
			$title: "Type",
			$enum: [{
				$value: "syracuse",
				$title: "Syracuse"
			}, {
				$value: "x3",
				$title: "X3"
			}],
			$isMandatory: true,
			$default: "syracuse",
			$control: function(_, instance, val) {
				// can change only if there are no endpoints associated
				if (val && !instance.endpoints(_).isEmpty()) throw new Error(locale.format(module, "protocolChange", instance.code(_)));
			},
			$isDisabled: function(_, instance) {
				// can change only if there are no endpoints associated
				return !instance.endpoints(_).isEmpty();
			}
		},
		application: {
			$title: "Name",
			$isMandatory: true
		},
		contract: {
			$title: "Contract",
			$isMandatory: true
		},
		productCode: {
			$title: "Product code"
		},
		iddn: {
			$title: "IDDN"
		},
		connRepresentation: {
			$title: "Application connection representation",
			$isDefined: function(_, instance) {
				return instance.protocol(_) === "x3";
			}
		}
	},
	$relations: {
		endpoints: {
			$title: "Endpoints",
			$type: "endPoints",
			$inv: "applicationRef",
			$capabilities: "sort,filter",
			$isDisabled: true,
			$isComputed: true,
		},
		defaultEndpoint: {
			$title: "Default endpoint",
			$type: "endPoint",
			$nullOnDelete: true,
			$lookup: function(_, instance) {
				var eps = [];
				instance.endpoints(_).toArray(_).forEach(function(ep) {
					eps.push("'" + ep.$uuid + "'");
				});
				return {
					$type: "application/json",
					$url: "/sdata/syracuse/collaboration/syracuse/endPoints?representation=endPoint.$lookup&binding=selectedEndpoint&count=50&where=($uuid in (" + eps.join(',') + "))"
				};
			}
		}
	},
	$events: {
		$beforeSave: [

			function(_, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				// default endpoint check
				var def = instance.defaultEndpoint(_);
				if (def) {
					var uuid = def.$uuid;
					var eps = instance.endpoints(_).toArray(_);
					var equalEndpoint;
					// set default endpoint to null when it is not contained in the list of endpoints or when it has just been deleted
					if (!eps.some(function(ep) {
							if (ep.$uuid === uuid) {
								equalEndpoint = ep;
								return true;
							}
						}) || equalEndpoint.$isDeleted) {
						instance.$addDiagnose("info", locale.format(module, "removeDefault"));
						instance.defaultEndpoint(_, null);
					}
				}
			}
		],
	},
	$searchIndex: {
		$fields: ["description", "application", "contract", "productCode", "menuItems", "portlets", "endpoints"]
	},
	$uniqueConstraints: [
		["description"],
		["application", "contract"]
	]
};