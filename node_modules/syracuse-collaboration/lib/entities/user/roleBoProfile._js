"use strict";

var locale = require('streamline-locale');

exports.entity = {
	$properties: {

	},
	$relations: {
		boServer: {
			$isUnique: true,
			$type: "boServer",
			$isMandatory: true,
			$control: function(_, instance) {
				var existingProfiles = instance._parent.boProfiles(_).toArray(_);
				var duplicated = false;
				for (var i = 0; i < existingProfiles.length - 1 && !duplicated; i++) {
					if (existingProfiles[i].boServer(_).name(_) === instance.boServer(_).name(_)) {
						duplicated = true;
					}
				}
				(duplicated) && instance.$addError(locale.format(module, "onlyOneBoServer"));
			},
		},
		profile: {
			$type: "boProfile",
			$title: "Profile",
			$lookupFilter: {
				boServer: "{boServer}"
			},
			$isHidden: function(_, instance) {
				var boServer = instance.boServer(_);
				return boServer == null;
			},
			$isMandatory: true
		}
	}
};