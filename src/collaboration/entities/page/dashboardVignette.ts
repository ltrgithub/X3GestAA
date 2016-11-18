"use strict";

exports.entity = {
	$properties: {
		allEndpoints: {
			$title: "Applies to current endpoint",
			$type: "boolean",
			$isNullable: true,
			$propagate: function(_, instance, val) {
				if (val) instance.endpoint(_, null);
			},
			$default: true
		},
		isTOC: {
			$title: "Display as Table of Contents",
			$type: "boolean",
			$isNullable: true
		}
	},
	$relations: {
		portlet: {
			$title: "Vignette",
			$type: "portlet",
			$isMandatory: true,
			$lookupFilter: {
				$or: [{
					application: "{$parent}.{application}"
				}, {
					application: null
				}]
			}
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: function(_, instance) {
				return !instance.allEndpoints(_);
			},
			$isDefined: function(_, instance) {
				return !instance.allEndpoints(_);
			},
			$lookupFilter: {
				applicationRef: "{$parent}.{application}"
			}
		}
	}
};