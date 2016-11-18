"use strict";

var fs = require('streamline-fs');
var fsp = require('path');
var getFactoryOwner = require("../../../../src/orm/serializer").getFactoryOwner;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;

var secProfile;

function _buildAuthByClass(_, profile) {
	var authByClass = {};
	secProfile = secProfile || JSON.parse(fs.readFile(fsp.join(__dirname, "../security/profile.json"), _));
	var settings = secProfile;
	profile.profileItems(_).toArray(_).forEach_(_, function(_, it) {
		var p = settings[it.code(_)];
		if (!p || !p.entities) return;
		//
		Object.keys(p.entities).forEach(function(pcName) {
			var a = authByClass[pcName] = authByClass[pcName] || {};
			// conditions
			var c = a.createConditions = a.createConditions || [];
			c.push({
				profileItem: it,
				condition: p.entities[pcName].createCondition || p.entities[pcName].condition || {},
				properties: p.entities[pcName].properties
			});
			var r = a.readConditions = a.readConditions || [];
			r.push({
				profileItem: it,
				condition: p.entities[pcName].readCondition || p.entities[pcName].condition || {},
				properties: p.entities[pcName].properties
			});
			var u = a.updateConditions = a.updateConditions || [];
			u.push({
				profileItem: it,
				condition: p.entities[pcName].updateCondition || p.entities[pcName].condition || {},
				properties: p.entities[pcName].properties
			});
			var d = a.deleteConditions = a.deleteConditions || [];
			d.push({
				profileItem: it,
				condition: p.entities[pcName].deleteCondition || p.entities[pcName].condition || {},
				properties: p.entities[pcName].properties
			});
			var e = a.execConditions = a.execConditions || [];
			e.push({
				profileItem: it,
				condition: p.entities[pcName].executeCondition || p.entities[pcName].condition || {},
				properties: p.entities[pcName].properties
			});
		});
		//
		if (p.entityServices) {
			Object.keys(p.entityServices).forEach(function(entName) {
				var a = authByClass[entName] = authByClass[entName] || {};
				var es = p.entityServices[entName];
				var esk = Object.keys(es);
				if (esk.length) esk.forEach(function(opName) {
					var o = a[opName] = a[opName] || {};
					var e = o.execConditions = o.execConditions || [];
					e.push({
						profileItem: it,
						condition: es[opName].executeCondition || es[opName].condition || {}
					});
				});
				else {
					var opName = "$all";
					var o = a[opName] = a[opName] || {};
					var e = o.execConditions = o.execConditions || [];
					e.push({
						profileItem: it,
						condition: {}
					});
				}
			});
		}
		//
		if (p.endpointServices) {
			// use a generic "$endpoint" entry for those "endpoint global" operations
			var a = authByClass.$endpoint = authByClass.$endpoint || {};
			Object.keys(p.endpointServices).forEach(function(opName) {
				var o = a[opName] = a[opName] || {};
				var e = o.execConditions = o.execConditions || [];
				e.push({
					profileItem: it,
					condition: p.endpointServices[opName].executeCondition || p.endpointServices[opName].condition || {}
				});
			});
		}
	});
	return authByClass;
}

function _reduceConditions(_, conditions, allowHandler) {
	if (!conditions || !conditions.length) return true;
	//
	return conditions.reduce_(_, function(_, prev, cond) {
		if (prev === true) return true;
		if (allowHandler(_, cond)) {
			if (cond.condition.deny) return false;
			if (cond.condition.filter) {
				if (typeof prev === "boolean") return "(" + cond.condition.filter + ")";
				else return prev + " OR " + "(" + cond.condition.filter + ")";
			} else return true;
		} else return prev;
	}, false);
}

exports.entity = {
	$titleTemplate: "Security profile",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Security-Profiles",
	$allowFactory: true,
	$factoryExcludes: ["roles", "sageOwner", "factoryOwner"],
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$isUnique: true
		},
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,
			$linksToDetails: true
		},
		authoringLevel: {
			$title: "Personalization level",
			$description: function(_, instance) {
				var l = instance.authoringLevel(_) + "AuthLevelDesc";
				return (instance.authoringLevel(_) && locale.format(module, l)) || "";
			},
			$enum: function(_, instance) {
				var values = [];
				values.push({
					$title: locale.format(module, "adminAuthLevelLabel"),
					$value: "admin"
				});
				values.push({
					$title: locale.format(module, "userAuthLevelLabel"),
					$value: "user"
				});
				values.push({
					$title: locale.format(module, "noneAuthLevelLabel"),
					$value: "none"
				});
				return values;
			},
			$default: "none",
			$propagate: function(_, instance, value) {
				instance.sageOwner(_, false);
				instance.factoryOwner(_, "");
			}
		},
		sageOwner: {
			$title: "Sage factory profile",
			$description: "Only available for Sage environments. This options allow to protect data with SAGE factory owner.",
			$type: "boolean",
			$default: false,
			$isHidden: function(_, instance) {
				if (instance.authoringLevel(_) !== "admin" || !(globals.context.config || {}).enableIndusFeatures) {
					if (!(globals.context.config || {}).enablePartnerFeatures) instance.factoryOwner(_, "");
					return true;
				}
				return false;
			},
			$propagate: function(_, instance, value) {
				if (value === true) instance.factoryOwner(_, "SAGE");
				else if (value === false) instance.factoryOwner(_, "");
			}
		},
		factoryOwner: {
			$title: "Factory ID",
			$description: "The factory ID will be used to protect data flaged as factory",
			$isHidden: function(_, instance) {
				return instance.authoringLevel(_) !== "admin" || (!(globals.context.config || {}).enableIndusFeatures && !(globals.context.config || {}).enablePartnerFeatures);
			},
			$isDisabled: function(_, instance) {
				return instance.sageOwner(_);
			},
			$pattern: function(_, instance) {
				return instance.sageOwner(_) === true ? ".*" : "^(?!SAGE$).*$";
			},
			$patternMessage: "'SAGE' word is reserved",
			$maxLength: 20
		},
		securityLevel: {
			$title: "Security level",
			$isMandatory: true,
			$type: "integer",
			$minimum: 0,
			$maximum: 100,
			$default: function(_) {
				var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
				var curSecLevel = (sp && sp.securityLevel(_)) || 0;
				return curSecLevel + 1;
			},
			$minimumCanEqual: true,
			$maximumCanEqual: true
		}
	},
	$relations: {
		profileItems: {
			$capabilities: "",
			$title: "Authorizations",
			$type: "securityProfileItems",
			$isChild: true
		},
		roles: {
			$title: "Associated roles",
			$type: "roles",
			$inv: "securityProfile",
			$isComputed: true,
			$lookupFilter: {
				securityProfile: null
			}
		}
	},
	$init: function(_, instance) {
		// create the list of profiles from profile.json
		var profile = JSON.parse(fs.readFile(fsp.join(__dirname, "../security/profile.json"), _));
		Object.keys(profile).forEach_(_, function(_, pName) {
			var item = instance.profileItems(_).add(_);
			var p = profile[pName];
			item.code(_, pName);
			item.description(_, p.title);
			// user must be able to read its own profile for login
			item.canRead(_, pName === "myProfile");

		});
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// user must be able to read its own profile for login
				var items = instance.profileItems(_).toArray(_);
				items.some_(_, function(_, item) {
					if (item.code(_) === "myProfile" && !item.canRead(_)) {
						instance.$addError(locale.format(module, "noProfile"));
						return false;
					}
				});

				// Only a user with security level greater than target can modify a security profile
				if (!instance.canSaveSecLevel(_, instance)) return false;

				return true;
			}
		],
		$beforeSave: [

			function(_, instance) {
				var fId = instance.factoryOwner(_);
				if (fId && fId !== "") instance.factoryOwner(_, fId.toUpperCase());
				if (instance.sageOwner(_) == null) instance.sageOwner(_, false);
			}
		]
	},
	$functions: {
		// canCreateClass returns:
		//   true if the user can create an instance in the class
		//   false if the user cannot create an instance in the class
		canCreateClass: function(_, entityName, checkFilters) {
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			// 
			if (checkFilters) {
				return _reduceConditions(_, entAuth.createConditions, function(_, cond) {
					return cond.profileItem.canCreate(_) && !cond.condition.deny;
				});
			} else {
				// can create is allowed to create in EVERY profile item
				return !entAuth.createConditions || (entAuth.createConditions.length === 0) || entAuth.createConditions.some_(_, function(_, c) {
					return c.profileItem.canCreate(_) && !c.condition.deny;
				});
			}
		},
		// canReadClass returns:
		//   true if the user can read any record in the class
		//   false if the user cannot read any record in the class
		//   an string with a sdata filter to apply to the records
		canReadClass: function(_, entityName) {
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			//
			return _reduceConditions(_, entAuth.readConditions, function(_, cond) {
				return cond.profileItem.canRead(_) && !cond.condition.deny;
			});
		},
		canReadProperty: function(_, entityName, propName) {
			// ignore technical properties. We should check if propName is one of the properties or relations but we'll have 
			// a performance issue. So for now we just check for $
			if (propName && (propName[0] === "$")) return true;
			//
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			var conditions = entAuth.readConditions;
			if (!conditions || !conditions.length) return true;
			//
			var i = 0;
			var length = conditions.length;
			// replace reduce loop with direct loop for performance
			while (i < length) {
				var cond = conditions[i++];
				if (cond.profileItem.canRead(_)) {
					if (cond.condition.deny) continue;
					if (cond.properties) {
						if (cond.properties.indexOf(propName) >= 0) return true;
						// else continue
					} else return true;
				} else if (cond.profileItem.canRead(_)) return true;
			}
			return false;
		},
		// canUpdateClass returns:
		//   true if the user can update any record in the class
		//   false if the user cannot update any record in the class
		//   an string with a sdata filter the instance MUST verify to update
		canUpdateClass: function(_, entityName) {
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			//
			return _reduceConditions(_, entAuth.updateConditions, function(_, cond) {
				return cond.profileItem.canWrite(_) && !cond.condition.deny;
			});
		},
		canUpdateProperty: function(_, entityName, propName) {
			// ignore technical properties. We should check if propName is one of the properties or relations but we'll have 
			// a performance issue. So for now we just check for $
			if (propName && (propName[0] === "$")) return true;
			//
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			var conditions = entAuth.updateConditions;
			if (!conditions || !conditions.length) return true;
			//
			return conditions.reduce_(_, function(_, prev, cond) {
				if (prev === true) return true;
				if (cond.profileItem.canWrite(_)) {
					if (cond.condition.deny) return false;
					if (cond.properties) {
						return cond.properties.indexOf(propName) >= 0;
					} else return true;
				} else return prev || cond.profileItem.canWrite(_);
			}, false);
		},
		// canDeleteClass returns:
		//   true if the user can delete any record in the class
		//   false if the user cannot delete any record in the class
		//   an string with a sdata filter the instance MUST verify to delete
		canDeleteClass: function(_, entityName) {
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			//
			return _reduceConditions(_, entAuth.deleteConditions, function(_, cond) {
				return cond.profileItem.canDelete(_) && !cond.condition.deny;
			});
		},
		// canExecuteService returns:
		//   true if the user can execute the service
		//   false if the user cannot execute the service
		//   pass null or empty to entityName to check for an endpoint service
		canExecuteService: function(_, entityName, operationName) {
			var self = this;
			if (!self._authByClass) self._authByClass = _buildAuthByClass(_, self);
			entityName = entityName || "$endpoint";
			if (!self._authByClass[entityName]) return true;
			var entAuth = self._authByClass[entityName];
			var opEntAuth = entAuth[operationName] || entAuth.$all;
			//			console.log("(284) :"+sys.inspect(opEntAuth, null, 4)+"; opName: "+operationName);
			if (!opEntAuth) return true;
			//
			return _reduceConditions(_, opEntAuth.execConditions, function(_, cond) {
				return cond.profileItem.canExecute(_) && !cond.condition.deny;
			});
		},
		hasFactoryRights: function(_) {
			return this.factoryOwner(_); // unneccessary: && this.factoryOwner(_) !== "";
		},
		canUpdateFactoryInstance: function(_, instance, ignoreInstance) {
			if (ignoreInstance || instance.$factory) {
				if (this.factoryOwner(_) === "SAGE") return true;
				if (this.factoryOwner(_) && this.factoryOwner(_) !== "") {
					return instance.$factoryOwner ? instance.$factoryOwner === getFactoryOwner(_, this) : true;
				}
				return false;
			}
			return true;
		},
		getRestrictedEntities: function(_) {
			var self = this;
			var profile = this;
			var ents = {};
			var settings = JSON.parse(fs.readFile(fsp.join(__dirname, "../security/profile.json"), _));
			var canRead = {};
			profile.profileItems(_).toArray(_).forEach_(_, function(_, it) {
				var p = settings[it.code(_)];
				if (!p || !p.entities) return;
				var cr = it.canRead(_);
				//
				Object.keys(p.entities).forEach_(_, function(_, pcName) {
					var ln = pcName; //.toLowerCase();
					if (cr) {
						canRead[ln] = true;
						var condition = p.entities[pcName].condition || p.entities[pcName].readCondition;

						if (!ents[ln]) {
							if (condition && condition.filter) {
								ents[ln] = {
									restriction: true,
									condition: self.replacePredefinedVars(_, condition.filter)
								};
							} else {
								ents[ln] = {
									restriction: false
								};
							}
						} else if (ents[ln] && ents[ln].restriction) {
							if (condition && condition.filter) {
								ents[ln] = {
									restriction: true,
									condition: self.replacePredefinedVars(_, condition.filter)
								};
							} else {
								ents[ln] = {
									restriction: false
								};
							}
						}
					} else {
						if (!canRead[ln]) ents[ln] = {
							restriction: true
						};
					}
				});
			});
			return ents;
		},
		replacePredefinedVars: function(_, sdata) {
			var r = sdata;
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			// replace some standard properties; TODO: better, more generic definition, use template !!!
			var up = globals.context.session.getUserProfile(_);
			r = r.replace("{$profile.user.login}", globals.context.session.getUserLogin(_));
			r = r.replace(/\{\$profile\.user\.\$uuid\}/g, up.user(_).$uuid);
			r = r.replace(/\{\$profile.roles\}/g, "(" + up.roles(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");
			r = r.replace(/\{\$profile.endpoints\}/g, "(" + up.endpoints(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");
			r = r.replace(/\{\$profile.selectedRole.endPoints\}/g, "(" + up.selectedRole(_).endPoints(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");
			r = r.replace(/\{\$profile.user.adminTeams\}/g, "(" + up.user(_).adminTeams(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");
			r = r.replace(/\{\$profile.user.authorTeams\}/g, "(" + up.user(_).authorTeams(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");
			r = r.replace(/\{\$profile.user.memberTeams\}/g, "(" + up.user(_).memberTeams(_).toUuidArray(_).map(function(rId) {
				return "\"" + rId + "\"";
			}).join(",") + ")");

			if (sp) {
				r = r.replace(/\{\$profile.securityProfile.level\}/g, sp.securityLevel(_));
				r = r.replace(/\{\$profile.securityProfile.code\}/g, sp.code(_));
			}

			return r;
		},
		canSaveSecLevel: function(_, instance) {
			// verify security level against current user level security level
			// nobody can create security profile with level 0
			var secLevel = this.securityLevel(_) || 0;

			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			// crnit SAM 103198 - database initialization sequence and server startup : there is no user yet so no security profile yet
			// for any other case, after user authentication getSecurityProfile will fail if there isn't any security profile
			// so the check must be done only if there is a security profile.
			// Also created SAM 103213 to improve behavior later
			// if (!sp || sp.securityLevel(_) > secLevel) {
			if (sp && sp.securityLevel(_) > secLevel) {
				var msg = locale.format(module, 'secLevel', sp.securityLevel(_), secLevel);
				instance.$addError(msg);
				// propagate on parent for display
				if (instance._parent) instance._parent.$addError(msg);
				return false;
			}

			return true;
		}
	}
};