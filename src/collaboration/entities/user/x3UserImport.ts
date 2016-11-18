"use strict";

var sys = require("util");
var locale = require('streamline-locale');
var datetime = require('@sage/syracuse-core').types.datetime;
var authHelper;

var _x3UserRepr = "AUTILISINI";
var _x3UserClass = "AUTILIS";
var _facet = "$query";

var _sessionGroups = {};

var _keyPropsMap = {
	USR: "login",
	LOGIN: "login",
	ADDEML: "email"
};

function _convertDiag(d) {
	return d.severity ? {
		$severity: d.severity,
		$message: d.message
	} : d;
};

function _addDiagnose(diagnoses, severity, message) {
	diagnoses && diagnoses.push({
		$severity: severity,
		$message: message
	});
};

var _rolePolicyMap = {
	functionProfile: function(_, instance, menuProfile) {
		var ep = instance.endpoint(_);
		var role = null;
		ep.menuProfileToRoles(_).toArray(_).some_(_, function(_, it) {
			if (it.menuProfile(_) === menuProfile) {
				role = it.role(_);
				return true;
			}
			return false;
		});
		return role;
	},
	existingRole: function(_, instance, menuProfile) {
		return instance.role(_);
	}
};

var _groupPolicyMap = {
	create: function(_, instance, menuProfile, options) {
		// always create
		var db = instance._db;
		var ep = instance.endpoint(_);
		// role
		var role = _rolePolicyMap[instance.createGroupPolicy_create(_)](_, instance, menuProfile);
		if (!role) _addDiagnose(options && options.$diagnoses, "warning", locale.format(module, "roleNotFound", menuProfile, ep.dataset(_)));
		//
		var grpCacheId = (role && role.$uuid) || "NONE";
		var grp = _sessionGroups[grpCacheId];
		if (!grp) {
			var grp = db.getEntity(_, "group").createInstance(_, db);
			grp.description(_, locale.format(module, "autoGroupDesc", datetime.now(true).toString("yyMMdd_HHmmss.SSS"), (role && role.description(_)) || "-", ep.dataset(_)));
			grp.role(_, role);
			grp.endPoints(_).set(_, ep);
			var res = grp.save(_, null, {
				shallowSerialize: true
			});
			// diags
			var ds = ((res.$actions || {}).$save || {}).$diagnoses || [];
			var desc = grp.description(_);
			if (options.$diagnoses) {
				ds.forEach(function(d) {
					if (d.severity) d = {
						$severity: d.severity,
						$message: d.message
					};
					if (d.$severity === "success") options.$diagnoses.push({
						$severity: "info",
						$message: locale.format(module, "groupCreated", desc)
					});
					else options.$diagnoses.push(d);
				});
				grp.getAllDiagnoses(_, options.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
			}
			//
			_sessionGroups[grpCacheId] = grp;
		}
		//
		return grp;
	},
	menuProfile: function(_, instance, menuProfile, options) {
		// try to get a group
		var db = instance._db;
		var ep = instance.endpoint(_);
		var grp = null;
		// role
		var role = _rolePolicyMap.functionProfile(_, instance, menuProfile);
		if (role) {
			grp = db.fetchInstance(_, db.getEntity(_, "group"), {
				jsonWhere: {
					role: role.$uuid,
					endPoints: ep.$uuid
				}
			});
		} else _addDiagnose(options && options.$diagnoses, "warning", locale.format(module, "roleNotFound", menuProfile, ep.dataset(_)));
		//
		if (!grp && (instance.createGroupPolicy_menuProf(_) === "create")) return _groupPolicyMap.create(_, instance, menuProfile, options);
		else return grp;
	},
	existingGroup: function(_, instance, menuProfile, options) {
		return instance.group(_);
	}
};

exports.entity = {
	$titleTemplate: "X3 User import",
	$descriptionTemplate: "X3 users import profile",
	$valueTemplate: " ",
	$helpPage: "Administration-reference_User-imports",
	$properties: {
		description: {
			$title: "Description",
			$isLocalized: true,
			$linksToDetails: true,
			$isMandatory: true
		},
		x3NameFormat: {
			$title: "X3 user name format",
			$enum: [{
				$title: "{First Name} {Last Name}",
				$value: "firstLast"
			}, {
				$title: "{Last Name} {First Name}",
				$value: "lastFirst"
			}],
			$default: "firstLast"
		},
		syncMode: {
			$title: "Import mode",
			$enum: [{
				$title: "Insert only",
				$value: "insert"
			}, {
				$title: "Insert and update",
				$value: "insertUpdate"
			}, {
				$title: "Update only",
				$value: "update"
			}],
			$default: "insertUpdate"
		},
		keyProperty: {
			$title: "Key property",
			$description: "Property used to match X3 to Collaboration users",
			$enum: [{
				$title: "Code",
				$value: "USR"
			}, {
				$title: "Login",
				$value: "LOGIN"
			}, {
				$title: "Email",
				$value: "ADDEML"
			}],
			$default: "LOGIN"
		},
		groupPolicy: {
			$title: "Groups assignement policy",
			$description: function(_, instance) {
				return locale.format(module, instance.groupPolicy(_) + "GroupPolicyDesc");
			},
			$enum: [{
				$title: "Always create",
				$value: "create"
			}, {
				$title: "Use endpoint and menu profile mapping",
				$value: "menuProfile"
			}, {
				$title: "Use existing group",
				$value: "existingGroup"
			}],
			$default: "menuProfile",
		},
		createGroupPolicy_create: {
			$title: "Group create policy",
			$description: "Select how roles are assigned to created groups",
			$enum: [{
				$title: "Use menu profile mapping",
				$value: "functionProfile"
			}, {
				$title: "Use existing role",
				$value: "existingRole"
			}],
			$default: "functionProfile",
			$isDefined: function(_, instance) {
				return (instance.groupPolicy(_) === "create") || ((instance.groupPolicy(_) === "menuProfile") && (instance.createGroupPolicy_menuProf(_) === "create"));
			}
		},
		createGroupPolicy_menuProf: {
			$title: "Group not found policy",
			$description: "Select the policy if the group can't be identified",
			$enum: [{
				$title: "Create group",
				$value: "create"
			}, {
				$title: "Don't associate any group to user",
				$value: "ignore"
			}],
			$default: "create",
			$isDefined: function(_, instance) {
				return (instance.groupPolicy(_) === "menuProfile");
			}
		},
		filter: {
			$title: "Filter",
			$type: "filter",
			$filterRepresentation: function(_, instance) {
				var ep = instance.endpoint(_);
				if (!ep) return null;
				return {
					$url: ep.getBaseUrl(_) + "/$prototypes('" + _x3UserRepr + "." + _facet + "')"
				};
			}
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$description: "Select the X3 endpoint to import from",
			$type: "endPoint",
			$lookupFilter: {
				protocol: "x3"
			},
			$isMandatory: true
		},
		group: {
			$title: "Assign this group to all users",
			$type: "group",
			$isDefined: function(_, instance) {
				return instance.groupPolicy(_) === "existingGroup";
			}
		},
		role: {
			$title: "Assign this role to new groups",
			$type: "role",
			$isDefined: function(_, instance) {
				return ((instance.groupPolicy(_) !== "existingGroup") && (instance.createGroupPolicy_menuProf(_) === "create") && (instance.createGroupPolicy_create(_) === "existingRole"));
			}
		}
	},
	$functions: {
		_extractNames: function(_, value) {
			var format = this.x3NameFormat(_);
			value = value || "";
			// is comma separated ?
			var parts;
			var pos = value.indexOf(",");
			if (pos >= 0) parts = value.split(",");
			else parts = value.split(" ");
			var res = [];
			res.push(parts.shift());
			res.push(parts.join(" "));
			res[0] = (res[0] && res[0].trim()) || "";
			res[1] = (res[1] && res[1].trim()) || "";
			//
			var result;
			if (format === "firstLast") {
				result = {
					firstName: res[0],
					lastName: res[1]
				};
			} else {
				result = {
					firstName: res[1],
					lastName: res[0]
				};
			}
			// last name is mandatory
			if (!result.lastName) {
				result.lastName = result.firstName;
				result.firstName = "";
			}
			return result;
		},
		getUsersCursor: function(_) {
			//
			var db = this.endpoint(_).getOrm(_);
			//			db.resetCache();
			var entity = db.getEntity(_, _x3UserRepr, _facet);
			if (!entity) throw new Error(locale.format(module, "entityNotFound", this.endpoint(_).description(_)));
			var where = {
				sdataWhere: this.filter(_)
			};
			//
			var cursor = db.createCursor(_, entity, where, _facet);
			return cursor;
		},
		importUser: function(_, user, options) {
			var self = this;
			var opt = options || {};
			// match user
			var keyVal = user[self.keyProperty(_)](_);
			if (!keyVal) return _addDiagnose(opt.$diagnoses, "error", locale.format(module, "missingKey", self.keyProperty(_), user.USR(_), user.INTUSR(_)));
			// get correponding user
			var adminDb = self._db;
			var syraUserEnt = adminDb.getEntity(_, "user");
			var syraKey = _keyPropsMap[self.keyProperty(_)];
			var filter = {
				jsonWhere: {}
			};
			filter.jsonWhere[syraKey] = {
				$regex: "^" + keyVal + "$",
				$options: "i"
			};
			var syraUser = adminDb.fetchInstance(_, syraUserEnt, filter);
			if (syraUser && (self.syncMode(_) === "insert")) return;
			if (!syraUser && (self.syncMode(_) === "update")) return;
			//
			var created = false;
			if (!syraUser) {
				if (user.LOGIN(_).indexOf(':') >= 0)
					return _addDiagnose(opt.$diagnoses, "error", locale.format(module, "noColon", user.LOGIN(_)));
				// check for duplicate login
				var filter = {
					jsonWhere: {
						login: {
							$regex: "^" + user.LOGIN(_).replace(/([\\\^\$\(\)\[\]\{\}\?\*])/g, "\\$1") + "$", // escape special characters of regular expressions
							$options: "i"
						}
					}
				};
				var dupUser = adminDb.fetchInstance(_, syraUserEnt, filter);
				if (dupUser) return _addDiagnose(opt.$diagnoses, "error", locale.format(module, "duplicateLogin", user.LOGIN(_), self.keyProperty(_), keyVal));
				//
				syraUser = syraUserEnt.createInstance(_, adminDb);
				syraUser[syraKey](_, keyVal);
				if (syraKey !== "login") syraUser.login(_, user.LOGIN(_));
				syraUser.setPassword(_, syraUser.login(_));
				authHelper = authHelper || require('../../../../../src/auth/helpers');

				var auth = authHelper.getStandardSetting(_).source;
				if (auth === "db") syraUser.changePassword(_, true);
				created = true;
			}
			//
			var name = self._extractNames(_, user.INTUSR(_));
			syraUser.firstName(_, name.firstName);
			syraUser.lastName(_, name.lastName || user.LOGIN(_));
			syraUser.email(_, user.ADDEML(_));
			syraUser.active(_, user.ENAFLG(_));
			// associate group from menu profile
			var grp = _groupPolicyMap[self.groupPolicy(_)](_, self, user.PRFMEN(_), options);
			if (!grp) _addDiagnose(opt.$diagnoses, "warning", locale.format(module, "groupNotFound", user.PRFMEN(_), self.endpoint(_).dataset(_)));
			else syraUser.groups(_).set(_, grp);
			// setup endpoint login
			var userEPs = syraUser.endpoints(_).filter(_, {
				jsonWhere: {
					"endpoint.$uuid": self.endpoint(_).$uuid
				}
			});
			var userEP = userEPs && userEPs[0];
			if (!userEP) {
				userEP = syraUser.endpoints(_).add(_);
				userEP.endpoint(_, self.endpoint(_));
			}
			userEP.login(_, user.LOGIN(_));
			//
			var res = syraUser.save(_, null, {
				shallowSerialize: true
			});
			// copy diags
			var hasError = false;
			if (options && options.$diagnoses) {
				var diags = syraUser.getAllDiagnoses(_, null, {
					addEntityName: true,
					addPropName: true
				});
				(diags || []).forEach(function(diag) {
					diag = _convertDiag(diag);
					if (diag.$severity === "error") {
						_addDiagnose(opt.$diagnoses, "error", locale.format(module, "importError", keyVal, diag.$message));
						hasError = true;
					}
					if (diag.$severity === "warning") _addDiagnose(opt.$diagnoses, "warning", locale.format(module, "importWarn", keyVal, diag.$message));
				});
				res && res.$actions.$save.$diagnoses && res.$actions.$save.$diagnoses.forEach(function(diag) {
					diag = _convertDiag(diag);
					if (diag.$severity === "error") {
						_addDiagnose(opt.$diagnoses, "error", locale.format(module, "importError", keyVal, diag.$message));
						hasError = true;
					}
					if (diag.$severity === "warning") _addDiagnose(opt.$diagnoses, "warning", locale.format(module, "importWarn", keyVal, diag.$message));
				});
			}
			if (!hasError) _addDiagnose(opt.$diagnoses, "success", locale.format(module, created ? "importUserCreated" : "importUserModified", keyVal));
			//
		}
	},
	$services: {
		execute: {
			$title: "Execute",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$permanent: true,
			$execute: function(_, context, instance) {

				if (!instance.endpoint(_)) return;
				var user;
				var options = {};
				if (context.tracker) {
					context.tracker.$diagnoses = context.tracker.$diagnoses || [];
					options.$diagnoses = context.tracker.$diagnoses;
				} else {
					instance.$diagnoses = instance.$diagnoses || [];
					options.$diagnoses = instance.$diagnoses;
				}
				//
				_sessionGroups = {};
				//
				if (context.tracker) context.tracker.phase = locale.format(module, "importRunning");
				var cursor = instance.getUsersCursor(_);
				var hasUser = false;
				while ((user = cursor.next(_))) {
					if (context.tracker) context.tracker.phaseDetail = locale.format(module, "importRunningDetails", (user && user.USR(_)));
					hasUser = true;
					instance.importUser(_, user, options);
				}
				if (!hasUser) _addDiagnose(options.$diagnoses, "info", locale.format(module, "noUsers"));
				if (context.tracker) context.tracker.phaseDetail = locale.format(module, "importEnded");
			}
		}
	}
};