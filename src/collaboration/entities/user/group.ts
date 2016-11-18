"use strict";

var locale = require('streamline-locale');
var sys = require("util");
var check = require("../../../../../src/license/check");
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.entity = {
	$properties: {
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
				endPoints: {
					$selected: false,
					applicationRef: {
						$selected: false
					}
				},
				role: {},
				users: {}
			}
		},
		x3serverTags: {
			$title: "X3 server TAGS",
			$description: "Tags can be used to prefer some X3 process server defined in X3 solution"
		},
		ldapGroup: {
			$title: "LDAP group",
			$description: "LDAP group mapping",
			$lookup: {
				entity: "ldapGroup",
				field: "name",
				parameters: "name={ldapGroup}"
			}
		}
	},
	$titleTemplate: "Group",
	$descriptionTemplate: "Access administration, groups associates users with roles and endpoints",
	$helpPage: "Administration-reference_Groups",
	$valueTemplate: "{description}",
	$allowFactory: true,
	$factoryIncludes: ["description", "role"],
	$relations: {
		endPoints: {
			$title: "Endpoints",
			$type: "endPoints",
			$inv: "groups",
			$nullOnDelete: true
		},
		/*		parent: {
			$title: "Parent",
			$type: "group",
			$inv: "children"
		},
		children: {
			$title: "Children",
			$type: "groups",
			$inv: "parent",
			isComputed: true
		},*/
		users: {
			$title: "Users",
			$type: "users",
			$inv: "groups",
			isComputed: true
		},
		role: {
			$title: "Role",
			$type: "role",
			$inv: "groups"
		},
		defaultX3Endpoint: {
			$title: "Default X3 endpoint",
			$description: "Reference endpoint for model browse",
			$type: "endPoint",
			$nullOnDelete: true,
			$lookup: function(_, instance) {
				var eps = [];
				instance.endPoints(_).toArray(_).forEach(function(ep) {
					eps.push("'" + ep.$uuid + "'");
				});
				return {
					$type: "application/json",
					$url: "/sdata/syracuse/collaboration/syracuse/endPoints?representation=endPoint.$lookup&binding=selectedEndpoint&count=50&where=(protocol eq 'x3' and $uuid in (" + eps.join(',') + "))"
				};
			}
		}
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// verify security level for group against current user level security level
				var curr = instance.role(_) && instance.role(_).securityProfile(_) ? instance.role(_).securityProfile(_).canSaveSecLevel(_, instance) : true;
				// snapshot may not exist yet, then it means that snapshot is identical to instance
				var prev = !instance.$snapshot || (instance.$snapshot.role(_) && instance.$snapshot.role(_).securityProfile(_) ? instance.$snapshot.role(_).securityProfile(_).canSaveSecLevel(_, instance) : true);
				return curr && prev;
			}
		],
		$beforeSave: [

			function(_, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				// named user check
				if (check.checkNamed(_, instance, instance.$diagnoses)) {
					// tell other servers about this change after saving
					instance.tmpLicenseChangeMarker = true;
				} else {
					if (instance.tmpLicenseChangeMarker) instance.tmpLicenseChangeMarker = null;
				}

				// default endpoint check
				var def = instance.defaultX3Endpoint(_);
				if (def) {
					var uuid = def.$uuid;
					var eps = instance.endPoints(_).toArray(_);
					var equalEndpoint;
					// set default endpoint to null when it is not contained in the list of endpoints or when it has just been deleted
					if (!eps.some(function(ep) {
							if (ep.$uuid === uuid) {
								equalEndpoint = ep;
								return true;
							}
						}) || equalEndpoint.$isDeleted) {
						instance.$addDiagnose("info", locale.format(module, "removeDefault"));
						instance.defaultX3Endpoint(_, null);
					}
				}
			}
		],

		$afterSave: [

			function(_, instance) {
				instance.$diagnoses = instance.$diagnoses || [];

				// named user check
				if (instance.tmpLicenseChangeMarker) {
					check.propagateChange(_);
					instance.tmpLicenseChangeMarker = null;
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["description", "endPoints", "users", "role"]
	}
};