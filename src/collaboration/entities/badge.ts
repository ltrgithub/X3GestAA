"use strict";

var util = require("util");
var fs = require('streamline-fs');
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var check = require('../../../../src/license/check');

//synchronize badge entity contents with data from policy file
exports.updateBadges = function(_) {
	// read badges
	var data = check.getParsedLicense(_);
	if (data === null || !data.badges) return;
	try {
		var db = adminHelper.getCollaborationOrm(_);
	} catch (e) {
		console.log("Cannot obtain ORM " + e);
		return;
	}
	var entity = db.model.getEntity(_, "badge");
	var dbBadges = {};
	var badges = entity.fetchInstances(_, db, {
		jsonWhere: {}
	});
	for (var i = 0; i < badges.length; i++) {
		dbBadges[badges[i].code(_)] = badges[i];
	}
	var keys = Object.keys(data.badges);
	for (var i = keys.length - 1; i >= 0; i--) {
		var key = keys[i];
		var badge = data.badges[key];
		var functionsj = badge.allFunc;
		var dbBadge = dbBadges[key];
		if (dbBadge) { // update existing badge
			var save = false;
			// compare localized titles
			var badgeTitle = badge.title;
			var keys1 = Object.keys(badgeTitle);
			var locales = dbBadge.getPropAllLocales(_, "title");
			if (keys1.some(function(key) {
					return badgeTitle[key] !== locales[key];
				})) {
				dbBadge.title(_, badgeTitle);
				save = true;
			}
			if (functionsj !== dbBadge.keyFunction(_)) {
				dbBadge.keyFunction(_, functionsj);
				save = true;
			}
			if (save) {
				dbBadge.noCheck(_, true);
				dbBadge.save(_);
			}
		} else if (dbBadge === "") { // already handled
			console.log("Double badge in policy file " + util.log(badge));
		} else { // not yet available
			var dbBadge = entity.createInstance(_, db, null);
			dbBadge.code(_, key);
			dbBadge.title(_, badge.title);
			dbBadge.keyFunction(_, functionsj);
			dbBadge.noCheck(_, true);
			dbBadge.save(_);
		}
		// mark as used
		dbBadges[key] = null;
	}

	// remove/invalidate badges which do not exist any more in license file
	var remaining = Object.keys(dbBadges);
	var i = remaining.length;
	while (--i >= 0) {
		var dbBadge = dbBadges[remaining[i]];
		if (dbBadge) { // not yet handled
			if (dbBadge.roles(_).toArray(_).length > 0) { // there are still roles attached to the badge: deactivate it
				if (dbBadge.keyFunction(_)) {
					dbBadge.keyFunction(_, ""); // do not allow functions from this badge any more
					dbBadge.noCheck(_, true);
					dbBadge.save(_);
				}
			} else { // no roles attached: delete it
				dbBadge.noCheck(_, true);
				dbBadge.deleteSelf(_, {
					ignoreRestrictions: true
				});
			}
		}
	}
	return;
};

exports.entity = {
	$canCreate: false,
	$allowFactory: true,
	$helpPage: "Administration-reference_Badges",
	$properties: {
		code: {
			$title: "Name",
			$isMandatory: true,
			$isUnique: true,
			$isReadOnly: true,
			$linksToDetails: true
		},
		title: {
			$title: "Description",
			$isReadOnly: true,
			$isLocalized: true
		},
		keyFunction: {
			$title: "Key Functions",
			$isReadOnly: true,
			$isHidden: true
		},
		keyFunction2: {
			$title: "Key Functions",
			$compute: function(_, instance) {
				return (instance.keyFunction(_) || "").replace(/,/g, ", ");
			}
		},
		noCheck: {
			$title: "noCheck",
			$type: "boolean",
			$default: false,
			$isHidden: true
		}
	},
	$titleTemplate: "Badges",
	$descriptionTemplate: "License badges",
	$valueTemplate: "{code}",
	$relations: {
		roles: {
			$title: "Roles",
			$type: "roles",
			$inv: "badges",
			$isComputed: true
		}
	},
	$searchIndex: {
		$fields: ["name"]
	},
	$services: {
		//			usersFromLdap : {
		//				$method : "PUT",
		//				$isMethod : true,
		//				$title : "Test functions",
		//				$execute : function(_, context, instance) {
		//					var lic = check.getParsedLicense(_);
		//					instance.$diagnoses = instance.$diagnoses || [];
		//					if (lic != null) {
		//						instance.$diagnoses.push({severity: "info", message: "Functions "+util.format(lic.badges[instance.code(_)].func)})
		//					} else {
		//						instance.$diagnoses.push({severity: "info", message: "No license information"});
		//					}
		//				}
		//			}
	},
	$events: {
		$beforeSave: [

			function(_, instance) { // named user check
				if (instance.noCheck(_)) {
					instance.noCheck(_, false);
					return;
				}
				instance.$diagnoses = instance.$diagnoses || [];

				if (check.checkNamed(_, instance, instance.$diagnoses)) {
					// tell other servers about this change after saving
					instance.tmpLicenseChangeMarker = true;
				} else {
					if (instance.tmpLicenseChangeMarker) instance.tmpLicenseChangeMarker = null;
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

	}
};