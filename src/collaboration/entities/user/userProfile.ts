"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var sessionManager = require('../../../../../src/session/sessionManager').sessionManager;
var locale = require('streamline-locale');
var check = require('../../../../../src/license/check');
var globals = require('streamline-runtime').globals;
var forEachKey = helpers.object.forEachKey;
var depend = require("streamline-require/lib/server/depend");
var jsurl = require("jsurl");
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var authHelper = require("../../../../../src/auth/helpers");
var sys = require("util");
var cvgListReuse = require("syracuse-x3/lib/cvgListReuse");

var syracuse;

// Deprecated
function _fromCookie() {
	try {
		if (globals.context && globals.context.request) {
			var cookie = globals.context.request.headers.cookie;
			var port = globals.context.request.connection.localPort;
			if (cookie) cookie = helpers.http.parseCookie(cookie)["user.profile." + port];
			return (cookie && jsurl.parse(cookie)) || {};
		} else return {};
	} catch (e) {
		return {};
	}
}

// return the admin security profile to have the right if necessary to set  endpoints while switch the role
function _getAdminSecurityProfile(_) {
	var db = adminHelper.getCollaborationOrm(_);
	var model = db.model;

	var entity = model.getEntity(_, "securityProfile");

	var securityProfile = db.fetchInstance(_, entity, {
		"sdataWhere": "code eq 'ADMIN'"
	});

	return securityProfile;
}

function _pickFirst(_, candidates, validateList, force) {
	var res = null;
	candidates.some_(_, function(_, cId) {
		return cId && (res = validateList.get(_, cId));
	});
	if (!res && force) res = validateList && validateList.toArray(_)[0];
	return res;
}



function _setEndpoints(_, userProfile, role, paramEpId) {
	var user = userProfile.user(_);
	if (!user) return;
	var userPrefs = user.preferences(_);
	//
	userProfile.endpoints(_).reset(_);
	user.getUserEndpointsList(_, role && role.$uuid).forEach_(_, function(_, ep) {
		userProfile.endpoints(_).set(_, ep);
	});
	// set selected ep
	var endpoints = userProfile.endpoints(_);
	var selEp = userProfile.selectedEndpoint(_);
	//if selected endpoint is valid, leave it there
	if (!selEp || !endpoints.get(_, selEp.$uuid)) {
		// else, take url parameter endpoint
		// else, take previous selected endpoint
		// else, take default X3 endpoint
		var candidates = [paramEpId, userPrefs && userPrefs.lastEndpoint(_) && userPrefs.lastEndpoint(_).$uuid, userProfile.getDefaultX3Endpoints(_)[0] && userProfile.getDefaultX3Endpoints(_)[0].$uuid];
		userProfile.selectedEndpoint(_, _pickFirst(_, candidates, endpoints));

	}
	// Take first endpoint available if no endpoint selected
	if ((!userProfile.selectedEndpoint(_) || !endpoints.get(_, userProfile.selectedEndpoint(_).$uuid)) && (endpoints.getLength() >= 1)) {
		userProfile.selectedEndpoint(_, endpoints.toArray(_)[0]);
	} else if (!endpoints.getLength()) {
		userProfile.selectedEndpoint(_, undefined);
	}
}

var shellWidgets = [];
require('@sage/syracuse-core').registry.scanExtensions(function(extensions) {
	var swe = extensions['shell-widgets'];
	if (swe) {
		if (!Array.isArray(swe)) swe = [swe];
		try {
			swe.forEach(function(widget) {
				shellWidgets.push(widget);
			});
		} catch (e) {
			console.error("Failed to load shell-widgets extension: " + e.stack);
		}
	}
});

exports.entity = {
	$isPersistent: false,
	$properties: {
		developpementMode: {
			$title: "Developpement mode active",
			$type: "boolean",
			$isDeveloppementFeature: true,
			$compute: function(_, instance) {
				return ((globals.context.config || {}).system || {}).enableDevelopmentFeatures;
			}
		},
		mobileClientConfig: {
			$isHidden: true,
			$type: "json",
			$compute: function(_, instance) {
				return (globals.context.config || {}).mobileClientConfig || {};
			}
		},
		productName: {
			$title: "Product Name",
			$serializeAll: true
		},
		enableTestRobot: {
			$title: "Test robot is enabled",
			$type: "boolean",
			$compute: function(_, instance) {
				return ((globals.context.config || {}).system || {}).enableTestRobot;
			}
		},
		enableUILog: {
			$title: "Ui log is enabled",
			$type: "boolean",
			$compute: function(_, instance) {
				return ((globals.context.config || {}).system || {}).enableUILog;
			}
		},
		sessionTimeout: {
			$title: "Session timeout (minutes)",
			$type: "integer",
			$isHidden: true
		},
		retryOnError: {
			$title: "Number of retry on network breakdown",
			$type: "integer",
			$isHidden: true
		},
		serverETag: {
			$title: "Server's current ETag",
			$isHidden: true,
			$compute: function(_, instance) {
				return depend.etag();
			}
		},
		authoringLevel: {
			$title: "Authoring level",
			$isHidden: true,
			$compute: function(_, instance) {
				var sp = (globals.context && globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_));
				var rightsItem = sp && sp.profileItems(_).toArray(_).filter_(_, function(_, item) {
					return item.code(_) === "authoring";
				});
				var hasRight = rightsItem && rightsItem[0] && rightsItem[0].canCreate(_) && rightsItem[0].canWrite(_);
				return sp && sp.authoringLevel(_) && sp.authoringLevel(_) !== "none" && hasRight ? "sage" : "none";
			}
		},
		sitePreferences: {
			$title: "Site preferences",
			$type: "json",
			$isHidden: true
		},
		versionInfo: {
			$title: "Mobile Client Version",
			$type: "json",
			$isDeveloppementFeature: false,
			$compute: function(_, instance) {
				var versionMobile = {
					buildDateString: "2014-01-01T00:00:00.000Z"
				};
				try {
					versionMobile = require("syracuse-mobile/lib/mobileVersionInfo").versionInfo;
				} catch (e) {}
				return {
					versionMobile: versionMobile
				};
			}
		},
		shellWidgets: {
			$title: "Shell extension widgets",
			$type: "json",
			$compute: function(_, instance) {
				return shellWidgets;
			}
		},

		security: {
			$title: "Client security",
			$type: "json",
			$isHidden: true,
			$compute: function(_, instance) {
				return ((globals.context.config || {}).security || {}).client || {};
			}
		},
		applicationConnectionData: {
			$title: "Application connection data",
			$compute: function(_, instance) {
				var selEp = instance.selectedEndpoint(_);
				// reload app connection because some data are now stored in session
				// merge of data from session and from mongo is done in getAppConnection function
				var userPrefs = instance.user(_).getPreferences(_);

				if (userPrefs) {
					var appConn = instance.user(_).getPreferences(_).getAppConnection(_, selEp);
					if (selEp && appConn) {
						var dataset = selEp.dataset(_)
						var data = appConn.data(_);
						if (data != null && globals.context.session.appConnection && globals.context.session.appConnection[dataset] && globals.context.session.appConnection[dataset].data) {
							data = JSON.parse(data);
							forEachKey(globals.context.session.appConnection[dataset].data, function(k, val) {
								data[k] = val;
							});
							data = JSON.stringify(data);
						}
						//console.log("Computed app conn data for endpoint '"+dataset+"' : " + JSON.stringify(data));
						return data;
					}
				}
				return;
			}
		}
	},
	$relations: {
		selectedRole: {
			$title: "Role",
			$type: "role",
			$lookupFilter: {
				"$uuid": {
					"$in": "{roles}"
				}
			},
			$propagate: function(_, instance, val) {
				if (instance._loadingProfile) return;
				//
				// set the admin security profile that have all right in order to read all need endpoint and after swtich to the right one
				globals.context.session.setSecurityProfile(_getAdminSecurityProfile(_));

				/*				if (instance._loadingProfile !== true) {
									// Only if not a creation of user profile (loop)
									// set the admin security profile that have all right in order to read all need endpoint and after swtich to the right one
									globals.context.session.setSecurityProfile(_getAdminSecurityProfile(_));
									return;
								}*/
				// Every time - Set endpoints 
				if (val) {
					console.log("set profile endpoints")
					if (!val.endPoints(_).toArray(_).length) {
						val.setEndpoints(_);
					}
					if (globals.context.session) globals.context.session.setSecurityProfile(val.securityProfile(_));
					_setEndpoints(_, instance, val);
				}
			},
			$serializeAll: true
		},
		roles: {
			$title: "Roles",
			$type: "roles"
		},
		selectedEndpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$lookupFilter: {
				"$uuid": {
					"$in": "{endpoints}"
				}
			},
			$serializeAll: true,
			$propagate: function(_, instance, val) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("dashboardPrototype");
				// force to get the right in cache or with x3 instead to do it in navigation page to get the product name of the current endpoint
				// for retrieve right on a X3 endpoint to force a first connection and
				if (val && instance) {
					instance.productName(_, "");
					// reset the product name regarding the map define in helper that is updated on each syracuse connection
					adminHelper.changeProductName(_, instance, val);
				}
			}
		},
		endpoints: {
			$title: "Endpoints",
			$type: "endPoints"
		},

		selectedLocale: {
			$title: "Locale",
			$type: "localePreference",
			$serializeAll: true,
			$lookupFilter: {
				"enabled": true
			},
			$propagate: function(_, instance, val) {
				adminHelper.changeProductName(_, instance);
				globals.context.sessionLocale = instance.selectedLocale(_).code(_);
			}
		},
		selectedTheme: {
			$title: "Theme",
			$type: "theme",
			$serializeAll: true,
		},

		themes: {
			$title: "Themes",
			$type: "themes",
		},
		user: {
			$title: "User",
			$type: "user",
			$serializeAll: true
		},
		applicationConnection: {
			$title: "Application connection parameters",
			$type: "applicationConnectionItem",
			$isChild: true,
			$serializeAll: true,
			$isDefined: function(_, instance) {
				var selEp = instance.selectedEndpoint(_);
				return selEp && selEp.protocol(_) === "x3";
			}
		}
	},
	$functions: {
		toCookie: function(_) {
			var self = this;

			var ck = {};
			if (self.user(_)) ck.user = self.user(_).$uuid;
			if (self.selectedRole(_)) ck.role = self.selectedRole(_).$uuid;
			if (self.selectedEndpoint(_)) ck.ep = self.selectedEndpoint(_).$uuid;
			if (self.selectedLocale(_)) ck.loc = self.selectedLocale(_).code(_);
			if (self.selectedTheme(_)) ck.theme = self.selectedTheme(_).code(_);

			return jsurl.stringify(ck);
		},
		loadUserProfile: function(_, user, defaultLocale, paramUserProfile) {
			var self = this;
			var selRole;
			// disable security check on load because security checks rely on user profile -> loop
			globals.context.session && globals.context.session.setData("securityProfileEnabled", false);
			self._loadingProfile = true;
			try {
				var userPrefs = user.getPreferences(_);
				this.user(_, user);
				// load struct from cookie
				var cookieParams = _fromCookie();
				if (cookieParams && cookieParams.user !== user.$uuid) cookieParams = {};

				var extUp = paramUserProfile || {};
				// set roles
				user.getUserRolesList(_).forEach_(_, function(_, role) {
					self.roles(_).set(_, role);
				});

				// set themes
				user.getUserThemeList(_).forEach_(_, function(_, theme) {
					self.themes(_).set(_, theme);
				});
				// set selected role
				selRole = _pickFirst(_, [extUp.role, cookieParams.role, userPrefs && userPrefs.lastRole(_) && userPrefs.lastRole(_).$uuid], self.roles(_), true);
				if (!selRole) throw new Error(locale.format(module, "noSecurityProfile"));
				self.selectedRole(_, selRole);

				// set endpoints
				_setEndpoints(_, this, this.selectedRole(_), extUp.ep);
				// locales
				var localeCode = cookieParams.loc || (userPrefs && userPrefs.lastLocaleCode(_)) || defaultLocale;
				this.selectedLocale(_, localeCode ? user.getUserLocaleByCode(_, localeCode) || user.getUserLocaleByCode(_, "en-US") : user.getUserLocaleByCode(_, "en-US"));

				// set selected theme (pick default one if no theme associate else the last selected)
				self.selectedTheme(_, userPrefs && userPrefs.lastTheme(_));


				// Issue #2379
				if (this.selectedLocale(_) == null) {
					var locals = this._db.fetchInstances(_, this._db.model.getEntity(_, "localePreference"));
					if (locals && locals.length > 0) {
						this.selectedLocale(_, locals[0]);
					} else {
						throw new Error(locale.format(module, "noLocale"));
					}
				}
				this.sessionTimeout(_, sessionManager.sessionTimeout);
				this.retryOnError(_, sessionManager.retryOnError);

				this.sitePreferences(_, userPrefs && userPrefs.sitePreferences(_));

				var lastAppConn = userPrefs && userPrefs.getAppConnection(_, this.selectedEndpoint(_));
				this.applicationConnection(_, lastAppConn);
			} finally {
				if (globals.context.session) {
					globals.context.session.setData("securityProfileEnabled", true);
					if (selRole) globals.context.session.setSecurityProfile(selRole.securityProfile(_));
				}
				self._loadingProfile = false;
			}
		},
		getDefaultX3Endpoints: function(_) {
			var self = this;
			if (!self.user(_) || !self.selectedRole(_)) return [];
			return self.user(_) && self.user(_).groups(_).toArray(_).filter_(_, function(_, g) {
				return (g.defaultX3Endpoint(_) && (g.role(_).$uuid === self.selectedRole(_).$uuid));
			}).map_(_, function(_, g) {
				return g.defaultX3Endpoint(_);
			});
		},
		getRepresentationPrefs: function(_, reprName, facetName) {
			var db = this._db;
			return db.fetchInstance(_, db.getEntity(_, "userRepresentationPref"), {
				jsonWhere: {
					representation: reprName,
					facet: facetName,
					user: this.user(_).$uuid
				}
			});
		},
		getX3ServerTags: function(_) {
			var groups = this.user(_).groups(_);
			var role = this.selectedRole(_);
			var tags = [];
			groups && groups.toArray(_).forEach_(_, function(_, g) {
				var gTags = g.x3serverTags(_);
				if (gTags && gTags.indexOf(",") > 0) {
					gTags.split(',').forEach(function(t) {
						tags.push(t);
					});
				} else if (gTags) {
					tags.push(gTags);
				}
			});
			return tags.join(',');
		},
		createRepresentationPrefs: function(_, reprName, facetName) {
			var db = this._db;
			var pref = db.getEntity(_, "userRepresentationPref").createInstance(_, db);
			pref.user(_, this.user(_));
			pref.representation(_, reprName);
			pref.facet(_, facetName);
			return pref;
		},
		$setParameters: function(_, context) {
			var self = this;
			// loads the current user profile
			this._initialize(_, context);
			// affect current user
			var user = context.getUser(_);
			if (!user) return;
			//
			var extUserProfile = context.parameters && context.parameters.profile && jsurl.parse(context.parameters.profile);
			if (extUserProfile && extUserProfile.user && extUserProfile.user !== user.$uuid) extUserProfile = null;
			//console.log("user profile: " + context.parameters && context.parameters.profile);
			this.loadUserProfile(_, user, (context.request.headers["accept-language"] || "").split(",")[0], extUserProfile);
			// session management
			context.setUserProfile(_, this);
			//
			if (globals.context.session) globals.context.session.userProfileCookie = self.toCookie(_);
		},
		$save: function(_, saveRes) {
			var self = this;
			var user = this.user(_);
			if (!user) return;
			// license considerations
			this.$diagnoses = this.$diagnoses || [];
			var userPrefs = user.getPreferences(_, true); //withCreate
			// role change?
			var oldRole = userPrefs.lastRole(_);
			var newRole = this.selectedRole(_);
			var lastEndpoint = userPrefs.lastEndpoint(_);
			var selEndpoint = this.selectedEndpoint(_);
			// some checks only when endpoint or role changes
			// consider cases where there are no endpoints
			if (!oldRole || !newRole || (oldRole.$uuid !== newRole.$uuid && _badgeSet(_, oldRole) !== _badgeSet(_, newRole)) || (lastEndpoint && (!selEndpoint || lastEndpoint.dataset(_) !== selEndpoint.dataset(_)))) {
				syracuse = syracuse || require("syracuse-main/lib/syracuse");
				if (selEndpoint) {
					var liz = check.checkConcurrent(_, globals.context.session, newRole, null, globals.context.session.device, this.$diagnoses);
					if (!liz && selEndpoint.protocol(_) !== "syracuse") {
						if (userPrefs) this.selectedRole(_, oldRole); // restore old role;
						this.$addError(locale.format(module, "noLicensesLeft"));
						return;
					}
				}
				//SAM 100217 need to disconnect existing syracuse session
				//SAM 98078 need to disconnect existing syracuse session
				//SAM 118365: Finally close only reuse sessions
				if (globals.context.request.session) {
					cvgListReuse.closeReuseSession(_, globals.context.request.session.id, "Endpoint/role change");
				}
			}
			userPrefs.lastRole(_, newRole);
			userPrefs.lastEndpoint(_, this.selectedEndpoint(_));
			// manage selected theme
			userPrefs.lastTheme(_, this.selectedTheme(_));

			userPrefs.sitePreferences(_, this.sitePreferences(_));
			var selLocale = this.selectedLocale(_);
			selLocale && userPrefs.lastLocaleCode(_, selLocale.code(_));
			// change locale
			locale.setCurrent(_, selLocale.code(_));

			// application connection preferences
			var appConn = userPrefs.setAppConnection(_, this.selectedEndpoint(_), this.applicationConnection(_));
			this.applicationConnection(_, appConn);

			userPrefs.save(_);

			// location
			saveRes.$links.$location = saveRes.$links.$location || {
				$title: "Menu",
				$method: "GET",
				$isHidden: true
			};
			//			var epParam = (this.selectedEndpoint(_) ? "endpoint=" + this.selectedEndpoint(_).application(_) + "." + this.selectedEndpoint(_).contract(_) + "." + this.selectedEndpoint(_).dataset(_) + "&" : "");
			//			saveRes.$links.$location.$url = "?" + epParam + "representation=home.$dashboard&role={$role}";
			saveRes.$links.$location.$url = "?representation=home.$navigation&role={$role}";
			//
			if (globals.context.session) globals.context.session.userProfileCookie = self.toCookie(_);
			// diags
			user.getAllDiagnoses(_, saveRes.$diagnoses, {
				addEntityName: true,
				addPropName: true,
				filter: ["error", "warning"]
			});
			userPrefs.getAllDiagnoses(_, saveRes.$diagnoses, {
				addEntityName: true,
				addPropName: true,
				filter: ["error", "warning"]
			});
		},
		getAccessRightAuthorizations: function(_, endpoint) {
			var up = this;
			var selEp = endpoint || up.selectedEndpoint(_);
			if (!selEp) return null;
			up._fctRights = up._fctRights || {};
			return up._fctRights[selEp.dataset(_)] = selEp.getAuthorizedAccessRight(_, up.user(_), up.selectedRole(_));
		}


	},
	$links: function(_, instance) {
		var lnks = {
			$bookmarks: {
				$url: "{$baseUrl}/userBookmarkProxies('" + instance.user(_).$uuid + "')?representation=userBookmarkProxy.$details",
				$method: "GET"
			}
		};
		//
		var selEp = instance.selectedEndpoint(_);
		var selApp = selEp && selEp.applicationRef(_);
		var connRepr = selApp && selApp.protocol(_) === "x3" && selApp.connRepresentation(_);
		if (connRepr && selApp.protocol(_) === "x3") {
			lnks.$applicationConnection = {
				$url: "{$baseUrl}/" + connRepr + "('x3')?representation=" + connRepr + ".$edit",
				$method: "GET"
			};
		}
		//
		return lnks;
	},
	$actions: {
		$resetConnection: function(_, instance) {
			var r = {};
			var selEp = instance.selectedEndpoint(_)
			if (selEp) {
				// if app connection changed and session need to be restarted
				var dataset = selEp.dataset(_);
				if (globals.context.session.appConnection && globals.context.session.appConnection[dataset] && globals.context.session.appConnection[dataset].$actions && globals.context.session.appConnection[dataset].$actions.$resetConnection) {
					cvgListReuse.closeReuseSession(_, globals.context.request.session.id, "Application connection properties changed");
					var db = selEp.getOrm(_);
					db.getClient(_).disconnect(_);

					r.$isRequested = true;
					delete globals.context.session.appConnection[dataset].$actions.$resetConnection;
				}
			}
			return r;
		}
	},
	$services: {
		/**
		 * Used by mobile client only (old and tablet) to get the current profile
		 * Only one role/endpoint/lang per session
		 */
		current: {
			$isHidden: true,
			$method: "GET",
			$isMethod: false,
			$title: "Current User Profile",
			$overridesReply: true,
			$execute: function(_, context) {
				var res = {};
				var instance = globals.context.session.getUserProfile(_);
				if (!instance) return context.reply(_, 200, res);
				res = instance.serializeInstance(_);
				if (res.selectedEndpoint) {
					res.selectedEndpoint.code = res.selectedEndpoint.application + "." + res.selectedEndpoint.contract + "." + res.selectedEndpoint.dataset;
				}
				var sp = instance.selectedRole(_).securityProfile(_);
				res.securityProfile = {
					factoryId: sp.factoryOwner(_),
					personalizationLevel: sp.authoringLevel(_)
				};
				if (res.user && (res.user.authentication == null || res.user.authentication == '')) { // If not set on user level, we need to fetch the global setting
					var standardSetting = authHelper.getStandardSetting(_);
					res.user.authentication = standardSetting.method;
				}

				context.reply(_, 200, res);
			}
		},
		/**
		 * SAM112448
		 * Used by mobile client (tablet) to update the current profile
		 * Using working copy doesn't work fine (we can't retrieve it when we close the browser/mobile application)
		 * We should be able to update the profile's instance attached to the session (unic)
		 * Only one role/endpoint/lang per session
		 */
		updateProfile: {
			$isHidden: true,
			$method: "POST",
			$isMethod: false,
			$title: "Update current User Profile",
			$overridesReply: true,
			$execute: function(_, context) {
				var _listHasUuid = function(_, list, uuid) {
					list = list.toArray ? list.toArray(_) : list;
					return list != null && list.some_(_, function(_, e) {
						return e.$uuid === uuid;
					});
				};
				var changed = false;
				var instance = globals.context.session.getUserProfile(_);
				var data = JSON.parse(context.request.readAll(_));
				var db = adminHelper.getCollaborationOrm(_);
				// selectedRole first
				var props = [{
					prop: "selectedRole",
					entity: "role"
				}, {
					prop: "selectedEndpoint",
					entity: "endPoint"
				}, {
					prop: "selectedLocale",
					entity: "localePreference"
				}];
				var res = {
					"$diagnoses": []
				};
				var error = props.some_(_, function(_, entry) {
					var prop = entry.prop;
					if (!data || !data[prop]) return;
					var uuid = data[prop].$uuid;
					if (!uuid) return;
					var entity = db.model.getEntity(_, entry.entity);
					switch (entry.entity) {
						case "role":
							if (!_listHasUuid(_, instance.roles(_), uuid)) {
								res.$diagnoses.push({
									"$message": locale.format(module, "settings.role.notallowed"),
									"$severity": "error"
								});
								return true;
							}
							break;
						case "endPoint":
							var sr = instance.selectedRole(_);
							if (!_listHasUuid(_, sr.endPoints(_), uuid) // default
								&& !_listHasUuid(_, sr.computeEndpoints(_), uuid, "endpoint")) { // fallback
								res.$diagnoses.push({
									"$message": locale.format(module, "settings.endpoint.notallowed"),
									"$severity": "error"
								});
								return true;
							}
							break;
						case "localePreference":
							if (!db.fetchInstance(_, entity, uuid)) {
								res.$diagnoses.push({
									"$message": locale.format(module, "settings.language.notallowed"),
									"$severity": "error"
								});
								return true;
							}
							break;
					}
					instance[prop](_, db.fetchInstance(_, entity, uuid));
					changed = true;
				});
				if (!error && changed) {
					instance.save(_);
					res = instance.serializeInstance(_);
					var sp = instance.selectedRole(_).securityProfile(_);
					res.securityProfile = {
						factoryId: sp.factoryOwner(_),
						personalizationLevel: sp.authoringLevel(_)
					};
				}
				context.reply(_, error ? 500 : 200, res);
			}
		},
		/**
		 * SAM112448
		 * Used by mobile client (tablet) to get the profile settings in one shot with the dependencies (role->endpoints)
		 * To optimize the bandwidth the mobile client stores these data after login
		 * returns non empty roles and locales
		 * {
		 * 		roles:[{...,endpoint:[not empty],...}]
		 * 		locales:[{...}]
		 * }
		 */
		settings: {
			$isHidden: true,
			$method: "GET",
			$isMethod: false,
			$title: "Settings User Profile",
			$overridesReply: true,
			$execute: function(_, context) {
				var _getEntries = function(_, array, cb) {
					var res;
					return array != null && array.map_(_, function(_, e) {
						res = {
							$uuid: e.$uuid,
							description: e.description(_),
							code: e.code(_)
						};
						return cb ? cb(_, e, res) : res;
					});
				};
				var instance = globals.context.session.getUserProfile(_);
				var res = {};
				var diags = [];
				res.roles = _getEntries(_, instance.roles(_).toArray(_), function(_, role, entry) {
					// Add role's endpoints 
					entry.endPoints = [];
					// TODO - Wait for Aurelien's fix - role.endpoints should be computed - we should call role.enPoints(_) but it doesn't work
					role.groups(_).toArray(_).forEach_(_, function(_, group) {
						var endPoints = group ? group.endPoints(_).toArray(_) : null;
						if (!endPoints || endPoints.length === 0) return;
						endPoints.forEach_(_, function(_, ep) {
							if (!entry.endPoints.some(function(epPushed) {
									return ep.$uuid === epPushed.$uuid;
								})) {
								entry.endPoints.push({
									code: ep.application(_) + "." + ep.contract(_) + "." + ep.dataset(_),
									$uuid: ep.$uuid,
									description: ep.description(_)
								});
							}
						});
					});
					if (entry.endPoints.length === 0) {
						diags.push(locale.format(module, "settings.noendpoint", role.code(_)));
					}
					return entry;
				});
				var db = adminHelper.getCollaborationOrm(_);
				res.locales = _getEntries(_, db.fetchInstances(_, db.model.getEntity(_, "localePreference"), {
					jsonWhere: {
						enabled: true
					}
				}));
				if (!res.roles || res.roles.length === 0) {
					diags.push(locale.format(module, "settings.norole"));
				}
				if (!res.locales || res.locales.length === 0) {
					diags.push(locale.format(module, "settings.nolanguage"));
				}
				diags.forEach_(_, function(_, d) {
					if (!res.$diagnoses) res.$diagnoses = [];
					res.$diagnoses.push({
						$severity: "error",
						$message: d
					});
				});
				context.reply(_, diags.length > 0 ? 500 : 200, res);
			}
		}
	}
};

// returns the set of badges for a role in alphabetical order so that sets of badges can be compared
function _badgeSet(_, role) {
	var badges = role.badges(_).toArray(_);
	var res = badges.map_(_, function(_, badge) {
		return badge.code(_);
	}).sort().join(",");
	return res;
}