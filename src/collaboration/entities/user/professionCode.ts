"use strict";
// This entity is only necessary because the framework only accepts selection lists from entities
var locale = require('streamline-locale');

// return an error message
function _error(msg) {
	var diags = [{
		"$severity": "error",
		"$message": "" + msg
	}];
	return {
		$diagnoses: diags
	};
}

exports.getProfessionCodesForUser = function(_, user, endpoint) {
	var result = [];
	var db = endpoint._db;
	var mappings = endpoint.roleToProfessionCodes(_);
	if (!mappings) {
		return _error(locale.format(module, "noRoles"));
	}
	var mappings = mappings.toArray(_, true);
	if (!mappings.length) {
		return _error(locale.format(module, "noRoles"));
	}
	var translation = []; // corresponding $uuid of role
	translation.length = mappings.length;
	var j = mappings.length;
	while (--j >= 0) { // need real loop because of parallel iteration through 2 arrays
		var role = mappings[j].role(_);
		if (role) translation[j] = role.$uuid;
	}
	var codmets = [];
	// loop over the groups of the user
	var groups = user.groups(_).toArray(_, true); // do not consider instances which have been marked for deletion				
	var j = groups.length; // need real loop because of parallel iteration through several arrays
	var entity = db.getEntity(_, "professionCode");
	while (--j >= 0) {
		var group = groups[j];
		var roleId = group.role(_).$uuid;
		var k = translation.length;
		while (--k >= 0) {
			if (translation[k] === roleId) {
				var codmet = mappings[k].professionCode(_);
				if (codmet && codmets.indexOf(codmet) < 0) {
					codmets.push(codmet);
					var instance = entity.createInstance(_, db);
					instance.codmet(_, codmet);
					instance.$uuid = codmet;
					result.push(instance);
				}
			}
		}
	};
	return result;
};

exports.entity = {
	//	$signed: ["login", "endpoint"],
	$isPersistent: false,
	$key: "{codmet}",
	$properties: {
		codmet: {
			$title: "Profession code",
			// $isMandatory: true,
			$displayLength: 10
		}
	},
	$titleTemplate: "{codmet}",
	$functions: {
		$setId: function(_, context, id) {
			this.codmet(_, id);
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var result = [];
		var self = this;
		try {
			if (!parameters.data) return [];
			var parts = parameters.data.split(/\~/);
			// at the moment: does not work in non-edit mode
			// crnit 150121: SAM104606 now it does work in details mode
			//if (!parts[2]) return _error(locale.format(module, "onlyEdit"));
			if (!parts[0] || !parts[1]) return [];

			var endpoint = context.db.fetchInstance(_, context.db.model.getEntity(_, "endPoint"), {
				jsonWhere: {
					$uuid: parts[0]
				}
			});
			if (endpoint.protocol(_) !== "x3") {
				return _error(locale.format(module, "noX3Endpoint"));
			}


			if (parts[2]) { // this is tracking ID in order to obtain the working copy of the user instance!
				var user = context.httpSession[parts[2]];
			} else {
				var user = context.db.fetchInstance(_, context.db.model.getEntity(_, "user"), {
					jsonWhere: {
						$uuid: parts[1]
					}
				});
			}
			if (!user) return _error(locale.format(module, "nouser"));

			result = exports.getProfessionCodesForUser(_, user, endpoint);

			if (result.length === 0) return _error(locale.format(module, "noFitRoles"));
		} catch (e) {
			console.error("Error during loading professional codes " + e.stack);
			return _error(e);
		}
		return result;
	},
};