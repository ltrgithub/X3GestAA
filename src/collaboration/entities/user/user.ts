"use strict";

var locale = require('streamline-locale');
var sys = require("util");
var factory = require("../../../../../src/orm/factory");
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var check = require("../../../../../src/license/check");
var globals = require('streamline-runtime').globals;
var authHelper = require('../../../../../src/auth/helpers');
var tracer = require('@sage/syracuse-core').helpers.debug.tracer("session.trace");
var uuid = require('@sage/syracuse-core').uuid;


var realm = 'Syracuse';
var crypto = require('crypto');
//	hash function from RFC2617
function _h(value) {
	var hash = crypto.createHash('MD5');
	hash.update(value, "utf8");
	return hash.digest("hex");
}

// changes the login value for this user instance. For database authentication, also update password hash 
function _changeLogin(_, instance, parameters) {
	var oldLogin = instance.login(_);
	if (oldLogin === parameters.newLogin) {
		instance.$addDiagnose("info", locale.format(module, "noChange"));
		return;
	}
	var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
	switch (auth) {
		case "ldap": // set authentication name if empty (so that LDAP authentication continues to work with same user)
			if (!instance.authenticationName(_)) {
				instance.authenticationName(_, oldLogin);
				instance.$addDiagnose("info", locale.format(module, "setAuthName", oldLogin));
			}
			break;
		case "db":
			break;
			// external authentication servers
		default:
			instance.$addDiagnose("warn", locale.format(module, "warnExt"));
			break;
	}
	instance.login(_, parameters.newLogin);
	instance.save(_);
	var diags = [];
	instance.getAllDiagnoses(_, diags, {
		addPropName: true
	});
	// errors?
	if (!instance.hasErrors(_))
		instance.$addDiagnose("success", locale.format(module, "nameChanged"));
	return;
}



//finds out whether current user has the ability to change user data

function noAdmin(_) {
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (!sp) return false;
	var items = sp.profileItems(_).toArray(_);
	for (var i = items.length - 1; i >= 0; i--) {
		var item = items[i];
		if (item.code(_) === "users") {
			return !item.canWrite(_);
		}
	}
	return true;
}
exports.noAdmin = noAdmin;

exports.entity = {
	//		$signed: ["login", "active", "authentication", "authenticationName", "password", "email", "groups", "endpoints", "ldap", "oauth2"],
	$classTitle: "User", // LOC: "User" 
	$titleTemplate: "{firstName} {lastName}",
	$valueTemplate: "{login}",
	$valueTitleTemplate: "{firstName} {lastName}",
	$summaryTemplate: "{title} {firstName} {lastName}",
	$descriptionTemplate: "{firstName} {lastName} user profile", // LOC: "{firstName}'s profile" 
	$iconTemplate: "{$baseUrl}/users('{$key}')/photo", // LOC: "{$baseUrl}/users('{$key}')/photo" 
	$helpPage: "Administration-reference_Users",
	$capabilities: "wordReport,mailMerge,pdfReport,excelReport",
	$allowFactory: true,
	$factoryIncludes: ["login"],
	$properties: {
		login: {
			$title: "Default Account", // LOC: "Login" 
			$isMandatory: true,
			$isUnique: true,
			$linksToDetails: true,
			$displayLength: 8,
			$caseInsensitive: true,
			$pattern: "^[^\\:]+$",
			$patternMessage: "No colon allowed in user login",
			$isReadOnly: function(_, instance) {
				return !instance.$created;
			}
		},
		title: {
			$title: "Title", // LOC: "Title" 
			$enum: [{
				$title: "Mr.", // LOC: "Mr." 
				$value: "mr"
			}, {
				$title: "Mrs.", // LOC: "Mrs." 
				$value: "mrs"
			}],
			$default: "mr", // LOC: "mr" 
			$displayLength: 4,
		},
		firstName: {
			$title: "First Name", // LOC: "First name" 
			$displayLength: 12,
		},
		lastName: {
			$title: "Last Name", // LOC: "Last name" 
			$linksToDetails: true,
			$isMandatory: true,
			$displayLength: 12,
		},
		nonce: {
			$title: "Nonce",
			$isHidden: true,
			$compute: function(_, instance) {
				return instance.login(_); // always generated "nonce" does not work with individual SData requests
			}

		},
		salt: {
			$title: "Salt",
			$isHidden: true
		},
		salt2: {
			$title: "Salt",
			$isHidden: true,
			$compute: function(_, instance) {
				return instance.salt(_);
			}
		},
		active: {
			$title: "Active", // LOC: "Active" 
			$type: "boolean",
			$default: true,
			$isDisabled: function(_, instance) {
				if (globals && globals.context && globals.context.session) {
					return instance.login(_) === globals.context.session.getData('userLogin');
				} else {
					return false;
				}
			}
		},
		authentication: {
			$title: "Authentication", // LOC: "Authentication" 
			$enum: authHelper.authEnum(false),
			$default: "",
			$propagate: function(_, instance, val) {
				if (val != "oauth2") instance.oauth2(_, undefined);
				if (val != "saml2") instance.saml2(_, undefined);
			},
		},
		authenticationName: { // name different from user name, used for authentication in LDAP or OAuth2
			$title: "Authentication name", // LOC: "Authentication name" 
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				return (auth !== "ldap");
			}
		},
		oldPassword: {
			$title: "Old password", // LOC: "Old password" 
			$type: "password",
			$salt: "{salt}:{$realm}",
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				if (auth === "db") {
					// get security profile
					return !noAdmin(_);
				}
				return true;
			}
		},
		password: {
			$title: "New password", // LOC: "New password" 
			$type: "password",
			$salt: "{nonce}:{$realm}",
			$capabilities: "confirm",
			$isMandatory: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				return (auth === "db") /* && instance.$created */ ;
			},
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				return auth !== "db";
			},
		},
		oldSignature: {
			$title: "Old signature code",
			$type: "password",
			$salt: "{salt2}:{$realm}",
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				if (auth !== "db" && auth !== "ldap") {
					// get security profile
					return !noAdmin(_);
				}
				return true;
			}
		},
		signature: {
			$title: "New signature code",
			$type: "password",
			$salt: "{nonce}:{$realm}",
			$capabilities: "confirm",
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				return (auth === "db" || auth === "ldap");
			}

		},
		email: {
			$title: "Email", // LOC: "Email" 
			$format: "$email",
			$displayLength: 30
		},
		photo: {
			$title: "Photo", // LOC: "Photo" 
			$type: "image",
			$storage: "db_file",
			$capabilities: "",
			$forceUrl: true,
			$url: "{$shortUrl}/photo"
		},
		"infov6": {
			$title: "Connection information for V6", // LOC: "Connection information for V6" 
			$type: "boolean",
			$default: false
		},
		"userv6": {
			$title: "System login", // LOC: "System login" 
			$isHidden: function(_, instance) {
				return !instance.infov6(_);
			},
			$isMandatory: function(_, instance) {
				return instance.infov6(_);
			}
		},
		"passwordv6": {
			$title: "Password", // LOC: "Password" 
			$isHidden: function(_, instance) {
				return !instance.infov6(_);
			},
			$isMandatory: function(_, instance) {
				return instance.infov6(_);
			},
			$type: "password",
			$capabilities: "confirm",
			$encrypt: true
		},
		changePassword: {
			$title: "Require password change", // LOC: "Require password change" 
			$type: "boolean",
			$isReadOnly: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				if (auth === "db") {
					// get security profile
					return noAdmin(_);
				}
				return true;
			},
			$isHidden: function(_, instance) {
				var auth = instance.authentication(_) || authHelper.getStandardSetting(_).source || "";
				return (auth !== "db");
			},
			$isNullable: true
		},
		explorer: {
			$title: "Explorer", // LOC: "Explorer" 
			$type: "graph",
			$format: "force-layout",
			$relations: {
				groups: {
					endPoints: {
						$selected: false,
						//							applicationRef: { $selected: false }
					},
					role: {
						$selected: false
					}
				},
				adminTeams: {},
				authorTeams: {},
				memberTeams: {},
				//					pages: { $selected: false }
			}
		}
	},
	$relations: {
		groups: {
			$title: "Groups", // LOC: "Groups" 
			$type: "groups",
			$inv: "users"
		},
		endpoints: {
			$title: "Endpoints login", // LOC: "Endpoints login" 
			$type: "userEndpoints",
			$inv: "user",
			isChild: true,
			$cascadeDelete: true
		},
		locales: {
			$type: "localePreferences",
			$title: "Locales", // LOC: "Locales" 
			isChild: true
		},
		preferences: {
			$type: "userPreference",
			$isExcluded: true,
			$title: "User preferences", // LOC: "User preferences" 
			$cascadeDelete: true
		},
		bookmarks: {
			$type: "userBookmark",
			$isExcluded: true,
			$title: "Bookmarks", // LOC: "Bookmarks" 
			$cascadeDelete: true
		},
		ldap: {
			$type: "ldap",
			$title: "LDAP instance", // LOC: "LDAP instance" 
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "ldap";
			},
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "ldap";
			},
			$inv: "users"
		},
		sync_ldap: {
			$type: "ldap",
			$isHidden: function(_, instance) {
				return instance.authentication(_) === "ldap";
			},
			$title: "LDAP instance for synchronization",
			$inv: "sync_users"
		},
		oauth2: {
			$type: "oauth2",
			$title: "OAuth2 instance", // LOC: "OAuth2 instance" 
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "oauth2";
			},
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "oauth2";
			},
			$inv: "users"
		},
		saml2: {
			$type: "saml2",
			$title: "SAML2 Id Provider", // LOC: "SAML2 Id Provider" 
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "saml2";
			},
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "saml2";
			},
			$inv: "users"
		},
		adminTeams: {
			$type: "teams",
			$title: "Teams administrator", // LOC: "Teams administrator" 
			$inv: "administrator",
			$isComputed: true,
			$nullOnDelete: true
		},
		authorTeams: {
			$type: "teams",
			$title: "Teams author", // LOC: "Teams author" 
			$inv: "authors",
			$isComputed: true,
			$nullOnDelete: true
		},
		memberTeams: {
			$type: "teams",
			$title: "Teams member", // LOC: "Teams member" 
			$inv: "members",
			$isComputed: true,
			$nullOnDelete: true
		},
		landingPages: {
			$title: "Landing pages", // LOC: "Landing pages" 
			$type: "landingPages",
			$inv: "owner",
			$isComputed: true,
			$nullOnDelete: true
		},
		boProfiles: {
			$type: "boProfiles",
			$title: "Profiles BO",
			$isChild: true
		},
		userOAuth2s: {
			$type: "userOAuth2s",
			$title: "Salesforce Organizations",
			$inv: "user",
			isChild: true
		}
	},
	$services: {
		/*
		testuser: {
			$method: "post",
			$title: "Test for X3 user creation - do not use",
			$isMethod: true,
			$parameters: {
				$properties: {
					"pwd": {
						$title: "Password", // LOC: "Password" 
						$type: "application/x-password",
						$value: ""
					},
					"login": {
						$title: "Login",
						$type: "application/x-string",
						$value: ""
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				if (!parameters) {
					parameters = context.parameters;
				}
				try {
					var cu = require('../../../../../src/auth/signatureAuth').sign;
					var res = cu(_, parameters.pwd, parameters.login);
					console.log("OKx " + res + " <<");
				} catch (e) {
					console.error("ERR"+e.stack);
				}
				instance.$addDiagnose("info", "OK");
			}
		},
		*/
		testlogin: {
			$method: "post",
			$title: "LDAP Test login", // LOC: "LDAP Test login" 
			$isDefined: function(_, instance) {
				var auth = instance.authentication(_);
				if (auth !== "ldap" && auth !== "") return false;
				if (auth === "") {
					auth = authHelper.getStandardSetting(_).source;
				}
				return (auth === "ldap");
			},
			$isMethod: true,
			$parameters: {
				$properties: {
					"pwd": {
						$title: "Password", // LOC: "Password" 
						$type: "application/x-password",
						$value: ""
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				var cfg;
				if (instance.authentication(_)) {
					var ldap = instance.ldap(_);
					if (!ldap) {
						instance.$addError(locale.format(module, "ldapAuth"));
						return;
					}
					var cfg = ldap._data;
					cfg.tlsOptions = ldap.getTlsOptions(_);
				} else {
					cfg = authHelper.getStandardSetting(_).ldap;
				}
				var ldapName = instance.authenticationName(_) || instance.login(_);
				if (!parameters) {
					parameters = context.parameters;
				}
				if (!parameters.pwd) {
					instance.$addError(locale.format(module, "noPwd"));
					return;
				}
				var password = parameters.pwd || "";
				instance.$addDiagnose("info", locale.format(module, "infoAuthName", ldapName));
				try {
					ldap.ldapAuth(_, ldapName, password, cfg);
					instance.$addDiagnose("success", locale.format(module, "OK"));
				} catch (e) {
					console.log(e.stack);
					instance.$addError(locale.format(module, "AuthError", e.toString()));
				}
			}
		},
		// service with 2 parameters for database login
		changeLogin: {
			$method: "post",
			$title: "Change login",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) { // factory users cannot change login
				if (instance.login(_) === 'admin' || (instance.$factory && instance.$factoryOwner === 'SAGE')) return false;
				return true;
			},
			$parameters: {
				$properties: {
					"newLogin": {
						$title: "New login",
						$type: "application/x-string",
						$value: ""
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				if (!parameters) {
					parameters = context.parameters;
				}
				if (!parameters.newLogin) {
					instance.$addError(locale.format(module, "noLogin"));
					return;
				}
				_changeLogin(_, instance, parameters);
			}
		},
		/* activate/deactivate Syracuse user and related X3 users
		active: {
			$method: "post",
			$title: "act",
			$isMethod: true,
			$execute: function(_, context, instance, parameters) {
				instance.setActive(_, !instance.active(_));
			}
		},
		*/
	},
	$functions: {
		$serialize: function(_, sync, shallow, relation, options) {
			// SECURITY FIX: users with security level lower than the current user must not be displayed
			// This cannot be handled by the profile.json file so we remove all properties from the select
			if (!this.allowRead(_)) {
				options = options || {};
				options.include = {};
				options.select = {};
			}
			return this._internalSerialize(_, sync, shallow, relation, options);
		},
		$allowUpdate: function(_, key) {
			return this.allowRead(_);
		},
		$allowDelete: function(_, key) {
			return this.allowRead(_);
		},
		$onDelete: function(_) {
			var db = this._db;
			var prefs = db.fetchInstances(_, db.getEntity(_, "userRepresentationPref"), {
				jsonWhere: {
					user: this.$uuid
				}
			});
			prefs.forEach_(_, function(_, pp) {
				pp.deleteSelf(_);
			});
		},
		getSecurityLevel: function(_) {
			var secLevel;
			var grps = this.groups(_).toArray(_);
			grps.forEach_(_, function(_, grp) {
				var secProfile = grp.role(_) && grp.role(_).securityProfile(_);
				var spLevel = secProfile && secProfile.securityLevel(_);
				if (secLevel == null || spLevel != null && spLevel < secLevel) secLevel = spLevel;
			});
			return secLevel;
		},
		allowRead: function(_) {
			var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
			if (sp == null) return true;

			var spLevel = sp && sp.securityLevel(_);
			var up = globals.context.session.getUserProfile(_);
			var user = up && up.user(_);
			var userId = user && user.$uuid;
			if (spLevel === 0 || userId === this.$uuid) {
				// console.error("user.allowRead: login='" + this.login(_) + "', secLevel=" + secLevel + ", current=" + spLevel + ",userId=" + userId + "$uuid" + this.$uuid);
				return true;
			}
			var secLevel = this.getSecurityLevel(_);
			// console.error("user.allowRead: login='" + this.login(_) + "', secLevel=" + secLevel + ", current=" + spLevel + ", currentLogin=" + (user && user.login(_)));
			return secLevel === undefined || secLevel > spLevel;
		},
		// password change is enabled by "changePassword" field but is only relevant for DB authentication
		mustChangePassword: function(_) {
			if (!this.changePassword(_)) return false;
			switch (this.authentication(_)) {
				case "": // default authentication: look in global settings
					return (authHelper.getStandardSetting(_).source === "db");
				case "db":
					return true;
				default:
					return false;
			}
		},
		getUserEndpointsList: function(_, roleUuid) {
			var eps = [];
			var grps = this.groups(_).toArray(_);
			grps.forEach_(_, function(_, grp) {
				if (roleUuid && grp.role(_) && (grp.role(_).$uuid !== roleUuid)) return;

				grp.endPoints(_).toUuidArray(_).forEach(function(ep) {
					eps.push(ep);
				});
			});
			//				filter duplicates
			var f = [];
			if (eps.length) {
				eps.sort();
				f.push(eps[0]);
				eps.forEach(function(ep) {
					if (f[f.length - 1] !== ep) f.push(ep);
				});
			}

			return this._db.fetchInstances(_, this._db.model.getEntity(_, "endPoint"), {
				jsonWhere: {
					"_id": {
						$in: f
					}
				}
			});
		},
		getUserThemeList: function(_) {
			return this._db.fetchInstances(_, this._db.model.getEntity(_, "theme"));
		},
		getUserRolesList: function(_) {
			var roles = [];
			var grps = this.groups(_).toArray(_);
			grps.forEach_(_, function(_, grp) {
				if (grp.role(_)) roles.push(grp.role(_));
			});
			//				filter duplicates
			var f = [];
			if (roles.length) {
				roles.sort(function(a, b) {
					return ((a.$uuid > b.$uuid) ? -1 : 1);
				});
				f.push(roles[0]);
				roles.forEach(function(role) {
					if (f[f.length - 1].$uuid !== role.$uuid) f.push(role);
				});
			}

			return roles;
		},
		setActive: function(_, active) {
			// console.log("Set active" +active)
			var uuids = [];
			this.$diagnoses = this.$diagnoses || [];
			var self = this;
			if (this.active(_) !== active) {
				this.active(_, active);
				this.save(_);
			}
			// propagate flag to X3 users
			// user endpoints
			try {
				var t = self.endpoints(_).toArray(_).forEach_(_, function(_, ue) {
					var endpoint = ue.endpoint(_);
					_setEndpointActive(_, endpoint, ue.login(_), active, uuids, self.$diagnoses);
				});
				// endpoints of groups
				self.groups(_).toArray(_).forEach_(_, function(_, group) {
					// console.log("Group "+JSON.stringify(group.description(_)))
					group.endPoints(_).toArray(_).forEach_(_, function(_, endpoint) {
						_setEndpointActive(_, endpoint, self.login(_), active, uuids, self.$diagnoses);
					});
				});

			} catch (e) {
				if (diagnoses) {
					diagnoses.push({
						$severity: "error",
						$message: locale.format(module, "setActiveError", e)
					});
				}
				console.log("Error " + e + " " + e.stack);
			}
			return;
		},
		getEndpointLogin: function(_, endpointUuid) {
			var eps = this.endpoints(_).toArray(_).filter_(_, function(_, ep) {
				return (ep.endpoint(_) && ep.endpoint(_).$uuid === endpointUuid);

			});

			return (eps[0] && eps[0].login(_)) || this.login(_);
		},
		getPersLocaleByCode: function(_, localeCode) {
			var r = new RegExp("^" + localeCode, "i");
			return this.locales(_).toArray(_).filter_(_, function(_, loc) {
				//					console.log("get user pers locale (239): localeCode: "+localeCode+"; testing: "+loc.code(_)+"; result: "+r.test(loc.code(_)));
				return r.test(loc.code(_));
			})[0];
		},
		getUserLocaleByCode: function(_, localeCode) {
			//				console.log("get user locale by code (244): localeCode: "+localeCode);
			var pers = this.getPersLocaleByCode(_, localeCode);
			return (pers ? pers : this._db.fetchInstance(_, this._db.model.getEntity(_, "localePreference"), {
				jsonWhere: {
					code: {
						$regex: "^" + localeCode,
						$options: "i"
					}
				}
			}));
		},
		setPassword: function(_, pass) {
			var newPassword = "U" + _h(this.login(_) + ":" + realm + ":" + pass); // indicate UTF8 encoding of password
			this.password(_, newPassword);
		},
		getPreferences: function(_, withCreate) {
			var self = this;
			var pref = self.preferences(_);
			if (!pref && withCreate) {
				pref = self.createChild(_, "preferences");
				pref.save(_);
				//
				self.preferences(_, pref);
				self.save(_, null, {
					shallowSerialize: true,
					ignoreRestrictions: true
				});
			}
			return pref;
		},
		getUserBadgesList: function(_) {
			var roles = [];
			var grps = this.groups(_).toArray(_);
			grps.forEach_(_, function(_, grp) {
				if (grp.role(_) && !grp.$isDeleted) roles.push(grp.role(_));
			});
			//				filter duplicates
			var f = [];
			if (roles.length) {
				roles.sort(function(a, b) {
					return ((a.$uuid > b.$uuid) ? -1 : 1);
				});
				f.push(roles[0]);
				roles.forEach(function(role) {
					if (f[f.length - 1].$uuid !== role.$uuid) f.push(role);
				});
			}

			var badges = [];
			roles.forEach_(_, function(_, role) {
				if (role.badges(_)) badges = badges.concat(role.badges(_).toArray(_));
			});
			//				filter duplicates
			var f = [];
			if (badges.length) {
				badges.sort(function(a, b) {
					return ((a.$uuid > b.$uuid) ? -1 : 1);
				});
				f.push(badges[0]);
				badges.forEach(function(badge) {
					if (f[f.length - 1].$uuid !== badge.$uuid) f.push(badge);
				});
			}

			return badges;
		},
		getOAuth2Username: function(_, oauth2ServerId) {
			var orgs = this.userOAuth2s(_).toArray(_).filter_(_, function(_, org) {
				return (org.oauth2(_) && org.oauth2(_).$uuid === oauth2ServerId);
			});

			return (orgs[0] && orgs[0].username(_)) || this.email(_);
		}
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// console.log("NON CE "+instance.nonce(_)+" "+instance.$created +" "+ instance.$snapshot)
				var isCurrent = (globals && globals.context && globals.context.session && instance.login(_) === globals.context.session.getData('userLogin'));
				var group_check = false; // have groups changed?
				var groups_new;
				var groups_old;
				if (!instance.$created && instance.$snapshot) {
					var oldPassword = instance.$snapshot.password(_);
					tracer && tracer("OLD " + oldPassword + " inst " + instance.password(_));

					if (oldPassword !== instance.password(_) && "U" + oldPassword !== instance.password(_)) {
						var noPassword = _h(instance.nonce(_) + ":" + realm + ":"); // hash of empty password;
						// console.log("npwd "+noPassword)
						if (instance.password(_) !== noPassword) {
							// _oldPwdSet : when the old password has already been entered, pwd change is possible without old password
							if (!instance._oldPwdSet && oldPassword !== instance.oldPassword(_)) { // old password not (correctly) entered
								if (noAdmin(_)) {
									instance.$addError(locale.format(module, "oldPwd"));
									return false;
								}
							} else {
								// console.log("CHPWD"+instance.salt(_));
								instance.changePassword(_, false); // password has been changed by user
							}
							instance.salt(_, instance.nonce(_)); // update salt
							instance.oldPassword(_, undefined);
						} else {
							instance.password(_, oldPassword); // do not accept empty password which is sent by error
						}
					}
					var oldSignature = instance.$snapshot.signature(_);
					if (oldSignature !== instance.signature(_)) {
						tracer && tracer("SIG1 " + noPassword + " " + oldSignature + " " + instance.signature(_) + " " + instance.oldSignature(_));
						if (instance.oldSignature(_) && oldSignature !== instance.oldSignature(_)) {
							// old signature code not correctly entered
							if (noAdmin(_)) {
								instance.$addError(locale.format(module, "oldSig"));
								return false;
							}
						}
						instance.salt2(_, instance.nonce(_)); // update salt
						instance.oldSignature(_, undefined);
					}
					// compare groups of original instance and new instance
					var instance_old = instance._db.fetchInstance(_, instance.getEntity(_), {
						jsonWhere: {
							$uuid: instance.$uuid
						}
					});
					if (instance_old) {
						groups_old = instance_old.groups(_).toArray(_);
						groups_new = instance.groups(_).toArray(_);
						// have there been any changes in groups?
						if (groups_old.length != groups_new.length) group_check = true;
						else {
							var i = groups_old.length;
							while (--i >= 0) {
								if (groups_new[i].$isDeleted || groups_new[i].$uuid !== groups_old[i].$uuid) {
									group_check = true;
									break;
								}
							}
						}
					}
				}

				if (instance.$created && !instance.salt(_)) {
					instance.salt(_, instance.nonce(_)); // update salt
					instance.salt2(_, instance.nonce(_)); // update salt for signature
				}

				if (!instance.allowRead(_)) {
					// console.error("cannot save: allowRead=" + instance.allowRead(_));
					return false;
				}
				// verify security level for groups against current user level security level - only when there have been changes in groups
				if (group_check && groups_new.some_(_, function(_, grp) {
						// if some groups verify the condition then stop the check, so "return true" means cannot save !!!
						var canSaveSecLevel = !grp.$isDeleted && grp.role(_) && grp.role(_).securityProfile(_) ? grp.role(_).securityProfile(_).canSaveSecLevel(_, instance) : true;
						if (!canSaveSecLevel) return true;
						// check if admin groups doesn't became empty: look for admin groups in deleted
						if (grp.$isDeleted && isCurrent) {
							var grpRole = grp.role(_);
							var spCode = grpRole && grpRole.securityProfile(_).code(_);
							if (spCode === "ADMIN" || spCode === "ADMCA") {
								// was the group there already ? !!!! snapshot issue here, to be fixed later !!!!!
								// if (!instance.$snapshot || (instance.$snapshot.groups(_).get(_, grp.$uuid))) {
								instance.$addError(locale.format(module, "removeCurrentAdmin"), "groups");
								return true;
								//}
							}
						}
						return false;
					})) return false;
				// check for duplicated endpoints
				var userEndpoints = instance.endpoints(_).toArray(_);
				var duplicates = {};
				if (userEndpoints.some_(_, function(_, userEndpoint) {
						var endp = userEndpoint.endpoint(_);
						if (endp) {
							if (endp.$uuid in duplicates && !userEndpoint.$isDeleted) {
								instance.$addError(locale.format(module, "duplEndp"), "endpoints");
								return true;
							}
							duplicates[endp.$uuid] = 0;
						}
						return false;
					})) return false;

				// check duplicated bo profiles
				var existingProfiles = instance.boProfiles(_).toArray(_);
				var duplicatesBo = {};
				if (existingProfiles.some_(_, function(_, profile) {
						var boSrv = profile.boServer(_);
						if (boSrv) {
							if (boSrv.$uuid in duplicatesBo && !profile.$isDeleted) {
								instance.$addError(locale.format(module, "onlyOneBoServer"));
								return true;
							}
							duplicatesBo[boSrv.$uuid] = 0;
						}
						return false;
					})) return false;
				//
				return true;
			}
		],
		$beforeSave: [

			function(_, instance) {
				//				named user check
				instance.$diagnoses = instance.$diagnoses || [];
				if (check.checkNamed(_, instance, instance.$diagnoses)) {
					//					tell other servers about this change after saving
					instance.tmpLicenseChangeMarker = true;
				} else {
					if (instance.tmpLicenseChangeMarker) instance.tmpLicenseChangeMarker = null;
				}
				//				check whether current user is set to inactive
				if (!instance.active(_) && globals && globals.context && globals.context.session && instance.login(_) === globals.context.session.getData('userLogin')) instance.$addError(locale.format(module, "inactiveSelf"));

			}
		],
		$afterSave: [

			function(_, instance) { // named user check
				if (instance.tmpLicenseChangeMarker) {
					check.propagateChange(_);
					instance.tmpLicenseChangeMarker = null;
				}
			}
		],
		$canDelete: [

			function(_, instance) {
				if (globals && globals.context && globals.context.session && instance.login(_) === globals.context.session.getData('userLogin')) {
					instance.$addError(locale.format(module, "deleteCurrent"));
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["login", "firstName", "lastName", "email", "groups", "adminTeams", "authorTeams", "memberTeams"]
	},
	$defaultOrder: [
		["login", true]
	]
};


// set ENAFLG for user of certain login on certain endpoint to the value of 'active'.
// if the uuid of the endpoint is already contained in the array 'uuids', nothing will be done
// as well as for non-X3 endpoints (which do not contain ASYRAUS).
// diagnostic messages will be appended to the array 'diagnoses' if available.
function _setEndpointActive(_, endpoint, login, active, uuids, diagnoses) {
	try {
		if (!endpoint)
			return;
		if (uuids.indexOf(endpoint.$uuid) >= 0) {
			// endpoint already handled
			// console.log("Endpoint handled "+endpoint.description(_));
			return;
		}
		uuids.push(endpoint.$uuid);
		if (endpoint.protocol(_) !== 'x3') {
			// console.log("No x3 endpoint "+endpoint.description(_));		
			return;
		}
		var orm = endpoint.getOrm(_);
		var ent = orm.getEntity(_, "ASYRAUS");
		if (!ent) {
			// console.log("No ASYRAUS in "+endpoint.description(_))
			return;
		}
		var x3user = orm.fetchInstance(_, ent, {
			sdataWhere: "USR eq '" + login + "' and ENAFLG eq " + (!active)
		});
		if (x3user) {
			x3user.ENAFLG(_, active);
			x3user.save(_);
			if (diagnoses) {
				diagnoses.push({
					$severity: "info",
					$message: active ? locale.format(module, "activateUser", login, endpoint.description(_)) : locale.format(module, "deactivateUser", login, endpoint.description(_))
				});
				x3user.getAllDiagnoses(_, diagnoses, {
					addEntityName: true,
					addPropName: true
				});
			}
		}
	} catch (e) {
		if (diagnoses) {
			diagnoses.push({
				$severity: "error",
				$message: locale.format(module, "endpointError", endpoint.description(_), e)
			});
		}
		console.log("Error when accessing endpoint in setActive " + e.stack);
	}
}