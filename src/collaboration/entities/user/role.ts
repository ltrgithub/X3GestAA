"use strict";

var sys = require("util");
var check = require("../../../../../src/license/check");

exports.entity = {
	$properties: {
		code: {
			$title: "Code",
			$linksToDetails: true,
			$isMandatory: true,
			$isUnique: true
		},
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isLocalized: true,
			$isMandatory: true,
			$isUnique: true
		},
		explorer: {
			$title: "Explorer",
			$type: "graph",
			$format: "force-layout",
			$relations: {
				groups: {
					users: {
						$selected: false,
					},
				},
				badges: {
					$selected: false
				},
				securityProfile: {
					$selected: false
				},
			}
		}
	},
	$titleTemplate: "Role",
	$descriptionTemplate: "Roles allows personalized configurations for users",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Roles",
	$allowFactory: true,
	$factoryIncludes: ["code", "description"],
	$relations: {
		groups: {
			$title: "Groups",
			$type: "groups",
			$inv: "role",
			isComputed: true
		},
		badges: {
			$title: "Badges",
			$type: "badges",
			$inv: "roles"
		},
		securityProfile: {
			$title: "Security profile",
			$type: "securityProfile",
			$inv: "roles",
			$isMandatory: true
		},
		boProfiles: {
			$title: "Business Objects Profiles",
			$type: "roleBoProfiles",
			isChild: true
		},
		navigationPage: {
			$title: "Navigation page",
			$type: "navigationPage",
			$inv: "roles"
		},
		landingPages: {
			$title: "Landing pages",
			$type: "landingPages",
			$inv: "roles",
			$lookupFilter: {
				owner: null
			}
		},
		mobileApplications: {
			$title: "Mobile applications",
			$type: "mobileApplications",
			$inv: "roles",
			$nullOnDelete: true
		},
		endPoints: {
			$title: "Endpoints role",
			$type: "endPoints",
			$isHidden: true,
			$nullOnDelete: true
		}
	},

	$events: {
		$canSave: [

			function(_, instance) {
				// verify security level for role against current user level security level
				var curr = (instance && instance.securityProfile(_)) ? instance.securityProfile(_).canSaveSecLevel(_, instance) : true;
				var prev = instance.$snapshot && instance.$snapshot.securityProfile(_) ? instance.$snapshot.securityProfile(_).canSaveSecLevel(_, instance) : true;
				return curr && prev;
			}
		],
		$beforeSave: [

			function(_, instance) { // named user check
				instance.$diagnoses = instance.$diagnoses || [];

				if (check.checkNamed(_, instance, instance.$diagnoses)) {
					// tell other servers about this change after saving
					instance.tmpLicenseChangeMarker = true;
				} else {
					if (instance.tmpLicenseChangeMarker)
						instance.tmpLicenseChangeMarker = null;
				}
			}
		],

		$afterSave: [

			function(_, instance) { // named user check
				if (instance.tmpLicenseChangeMarker) {
					check.propagateChange(_);
					instance.tmpLicenseChangeMarker = null;
				}
			}
		]
	},
	$functions: {
		setEndpoints: function(_) {
			var self = this;
			// add to the collection endpoints the list of endpoint link the group
			self.groups(_).toArray(_).forEach_(_, function(_, group) {
				if (group && group.endPoints(_).toArray(_).length) {
					group.endPoints(_).toArray(_).forEach_(_, function(_, endpoint) {
						self.endPoints(_).set(_, endpoint);
					});
				}
			});
		},
		computeEndpoints: function(_) {
			var self = this;
			var endpoints = [];
			self.groups(_).toArray(_).forEach_(_, function(_, group) {
				if (group && group.endPoints(_).toArray(_).length) {
					group.endPoints(_).toArray(_).forEach_(_, function(_, endpoint) {
						endpoints.push(endpoint);
					});
				}
			});
			return endpoints;
		}
	},
	$searchIndex: {
		$fields: ["code", "description", "groups"]
	}
};