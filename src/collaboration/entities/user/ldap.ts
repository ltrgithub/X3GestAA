"use strict";

var util = require("util");
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var locale = require('streamline-locale');
var ldapjs = require("ldapjs");
var fs = require('streamline-fs');
var userEntity = require('./user');
var ldapauth = require('../../../../../src/auth/ldap').ldapauth;
var authHelper = require('../../../../../src/auth/helpers');

var tracer; // = console.log;

//dummy key for LDAP user data to indicate that they have already been used to update at least one instance of the user entity
//and therefore are not for adding a new user to the user entity.
var USED = "##########";

function _normalizeDiag(diag) {
	return {
		$severity: diag.$severity || diag.severity,
		$message: diag.$message || diag.message,
		$stackTrace: diag.$stackTrace
	};
}

/// get all users from LDAP.
/// Arguments: ldap entity instance, 
///  all: retrieve all users? If false, retrieve only one user (using searchFilter if syncSearchFilter is not set; do not use authenticationNameMapping)


function getAllUsers(instance, all, _, attribs) {
	var filter;
	if (all) {
		filter = instance.globalSearchFilter(_);
	} else {
		///   and the search filter is the global search filter (if available) or the search filter with {{username}} replaced by "*"
		filter = instance.globalSearchFilter(_) || instance.searchFilter(_).replace("{{username}}", "*");
		//console.log("Filter", filter);
	}

	if (!instance.authenticationNameMapping(_)) {
		instance.$addError(locale.format(module, "noAuthName"));
		return null;
	}
	return getAllEntries(instance, all, _, attribs, filter, instance.authenticationNameMapping(_));
}

/// ## Function get all entries from LDAP.
/// Arguments : keySearch is mandatory contents ldap attribute for the name (user or group)
function getAllEntries(instance, all, _, attribs, filter, keySearch) {
	var tlsOptions = instance.getTlsOptions(_);
	var clientOpts = {
		url: instance.url(_),
		tlsOptions: tlsOptions,
	};
	// console.log("URL"+instance.url(_));
	var ldapClient = ldapjs.createClient(clientOpts);

	// console.log("Client created");
	ldapClient.bind(instance.adminDn(_), instance.adminPassword(_), _);

	// console.log("bound");
	try {
		var res = _ldapSearch(ldapClient, keySearch, {
			filter: filter,
			base: instance.searchBase(_),
			attributes: attribs
		}, all ? 0 : 1, _);
		return res;
	} finally {
		ldapClient.unbind(_);
	}
}

/// ## Function getLdapAttributes
/// returns a list of all LDAP attributes for the first user which is searched using the sync search filter (if available) or the search filter

function getLdapAttributes(instance, _) {
	var res = getAllUsers(instance, false, _);
	for (var k in res) { // dummy loop: there can only be one key
		return Object.keys(res[k]);
	}
	return [];
}

exports.getLdapAttributes = getLdapAttributes;

/// perform an LDAP search with paged data and limit of results
///  loginKey: name of LDAP attribute whose contents will be used for the key field of the result (otherwise just the "" key will be used)
///  config: has attributes `filter` for search filter, `base` for base DN
///  limit: maximal number of hits which will be retrieved from the server or 0 when there is no limit

function _ldapSearch(ldapClient, loginKey, config, limit, _) {
	var remaining = limit;
	/// Remark: the users will be taken with paged results of maximal 50 hits per search
	var MAX_REQUEST = 50;
	var b = new Buffer(0);
	var userEntries = {};
	while (b) {
		b = _ldapSearchInt(userEntries, ldapClient, loginKey, config, b, (limit && remaining < MAX_REQUEST) ? remaining : MAX_REQUEST, _);
		if (b && b.length === 0) break;
		if (limit) {
			remaining -= MAX_REQUEST;
			if (remaining < 0) remaining = 0;
		}
	}
	return userEntries;
}

// returns binary values for the attributes

function _convert(entry) {

	var obj = {
		dn: entry.dn.toString(),
		controls: []
	};
	entry.attributes.forEach(function(a) {
		var item = a.buffers;
		if (item && item.length) {
			if (item.length > 1) {
				obj[a.type] = item.slice();
			} else {
				obj[a.type] = item[0];
			}
		} else {
			obj[a.type] = [];
		}
	});
	entry.controls.forEach(function(element, index, array) {
		obj.controls.push(element.json);
	});
	return obj;
}

// internal function which performs a single paged LDAP query and provides the Streamline callback
//  parameters (except for parameters of _ldapSearch): 
//   cookie: Buffer which must be empty buffer for first search and buffer returned by previous search for each subsequent search
//           When the returned buffer is empty, there are no more results
//   size: maximal number of hits for this paged search. Value 0 means: stop paged search
var _ldapSearchInt = function(userEntries, ldapClient, loginKey, config, cookie, size, cb) {
	var opts = {
		filter: config.filter,
		scope: 'sub',
		attributes: config.attributes
	};
	var control = new ldapjs.PagedResultsControl({
		criticality: true,
		value: {
			size: size,
			cookie: cookie
		}
	});
	ldapClient.search(config.base, opts, control, function(error, res) {
		var finished = false;
		if (error) return cb(error);
		res.on('searchEntry', function(entry) {
			var obj = _convert(entry);
			if (loginKey) {
				var key = obj[loginKey];
				if (key) key = key.toString("utf8");
				if (!key) {
					if (!finished) {
						finished = true;
						return cb(new Error(locale.format(module, "noContentForAuthName")));
					}
				}
				userEntries[key] = obj;
			} else {
				userEntries[""] = obj;
			}
		});
		res.on('error', function(err1) {
			if (!finished) {
				finished = true;
				return cb(err1);
			}
		});
		res.on('end', function(result) {
			if (result.status !== 0 && !finished) {
				finished = true;
				return cb(locale.format(module, "statusCode", result.status));
			}
			if (Array.isArray(result.controls)) {
				var l = result.controls.length;
				while (--l >= 0) {
					if (result.controls[l].type === ldapjs.PagedResultsControl.OID && !finished) {
						finished = true;
						return cb(null, result.controls[l].value.cookie);
					}
				}
			}
			if (!finished) {
				finished = true;
				return cb(null, null);
			}
		});
	});
};

//Translates an user entity attribute to the LDAP attribute value
function _newValue(translated, values) {
	if (translated.charAt(0) === "'") return translated.substr(1);
	return values[translated];
}

function _makeTranslateTable(instance, attribs, _) {
	var translateTable = {
		authenticationName: instance.authenticationNameMapping(_),
		firstName: instance.firstNameMapping(_),
		lastName: instance.lastNameMapping(_),
		email: instance.emailMapping(_),
		photo: instance.photoMapping(_),
		groupName: instance.userGroupNameMapping(_)
	};
	if (attribs) {
		Object.keys(translateTable).forEach(function(key) {
			var value = translateTable[key];
			if (value && attribs.indexOf(value) < 0) {
				attribs.push(value);
			}
		});
	};
	return translateTable;
}


function _isX3EndPoint(_, endpoint) {
	var orm = endpoint.getOrm(_);
	var ent = orm.getEntity(_, "ASYRAUS");
	return ent;
}

function _processLdapGroups(_, user, ldapGroupNames, instance) {
	if ((ldapGroupNames) && (ldapGroupNames.length > 0)) {
		ldapGroupNames.forEach_(_, function(_, ldapGroupName) {
			_processLdapGroup(_, user, ldapGroupName, instance);
		});
	} else {
		instance.$addDiagnose("warning", locale.format(module, "msgNoGroupInfo", user.login(_)));
	}

	//Remove unused LDAP groups from user
	user.groups(_).toArray(_).filter_(_, function(_, group) {
		return (group.ldapGroup(_)) && (ldapGroupNames.indexOf(group.ldapGroup(_)) == -1);
	}).forEach_(_, function(_, group) {
		user.groups(_).deleteInstance(_, group.$uuid);
		instance.$addDiagnose("info", locale.format(module, "msgRemoveGroup", user.login(_), group.description(_)));
	});

}

function _processLdapGroup(_, user, ldapGroupName, instance) {
	var db = adminHelper.getCollaborationOrm(_);
	var entity = db.model.getEntity(_, "group");
	var groups = db.fetchInstances(_, entity, {
		jsonWhere: {
			ldapGroup: ldapGroupName
		}
	});
	if (groups.length > 0) {
		groups.forEach_(_, function(_, group) {
			instance.$addDiagnose("info", locale.format(module, "msgGroupFound", group.description(_), ldapGroupName));
			// Set importing flag to dont reload group entity on set
			user.$importing = true;
			user.groups(_).set(_, group);
			user.$importing = false;
			group.endPoints(_).toArray(_).forEach_(_, function(_, endpoint) {
				try {
					_processGroupEndPoint(_, endpoint, user, instance);
				} catch (error) {
					instance.$addDiagnose("error", error.toString());
				}
			});

		});
	} else {
		//instance.$addDiagnose("info", locale.format(module, "msgGroupNotFound", ldapGroupName));
	}
}


function _processGroupEndPoint(_, endpoint, user, instance) {
	var ues = user.endpoints(_).toArray(_)
		.filter_(_, function(_, uep) {
			return uep.endpoint(_).$uuid == endpoint.$uuid;
		});
	var ue;
	if (!_isX3EndPoint(_, endpoint)) return;
	if (ues.length > 0) {
		ue = ues[0];
		ue.user(_, user);
		//console.log("Update User endpoint",ue.login(_));
	} else {
		//ue = user.endpoints(_).add(_);
		var db = adminHelper.getCollaborationOrm(_);
		var entity = db.model.getEntity(_, "userEndpoint");
		ue = entity.createInstance(_, db, null);
		ue.user(_, user);
		ue.endpoint(_, endpoint);
		//console.log("Create User endpoint",user.login(_),endpoint.description(_));
	}

	var x3user = ue.updateX3User(_, null);
	if (x3user) {
		ue.code(_, x3user.USR(_));
		ue.login(_, x3user.LOGIN(_));
		if (ues.length > 0) {
			instance.$addDiagnose("info", locale.format(module, "msgUpdateUser", ue.login(_), endpoint.description(_)));
		} else {
			instance.$addDiagnose("info", locale.format(module, "msgCreateUser", ue.login(_), endpoint.description(_)));
		}
		user.endpoints(_).set(_, ue);
	} else {
		ue.getAllDiagnoses(_, instance.$diagnoses);
		//Delete userendpoint instance 
		if (ues.length == 0) {
			//console.log("Delete User endpoint",endpoint.description(_));
			ue.deleteSelf(_);
		}
	}

}


/// Normalize the groups names in a one array
/// Arguments: value of LDAP attribut used to identify the groups
/// Result : Array with groups names  
function _getLdapGroupsFromValue(value) {
	if (!value) {
		return [];
	} else if (Array.isArray(value)) {
		return value.map(function(item) {
			return item.toString("utf8");
		});
	} else {
		return [value.toString("utf8")];
	}
}

/// update user table from LDAP 
/// Arguments: ldap entity instance, 
/// users: an object with authentication names as keys and LDAP user entries as values
/// diagnoses: warning and error messages
/// del: delete users which are not in LDAP any more (true) or just deactivate them (false)
/// _track: function for tracking current status
function updateUsers(_, instance, users, del, translateTable, _track) {
	if (!translateTable) translateTable = _makeTranslateTable(instance, null, _);
	if (!translateTable.authenticationName) {
		instance.$addError(locale.format(module, "noAuthName"));
		return;
	}
	if (!translateTable.lastName) {
		instance.$addError(locale.format(module, "noLastNameMapping"));
		return;
	}

	var l = instance.users(_).toArray(_);

	// if standard authentication method is via this LDAP server, also include these users
	var standardLdapServer = authHelper.getStandardSetting(_).ldap;
	if (standardLdapServer && standardLdapServer._id === instance.$uuid) {
		var db = adminHelper.getCollaborationOrm(_);
		var entity = db.model.getEntity(_, "user");
		// add users which use authentication by this LDAP server
		var l2 = db.fetchInstances(_, db.model.getEntity(_, "user"), {
			jsonWhere: {
				authentication: "",
				sync_ldap: null
			}
		});
		l2.forEach(function(u) {
			l.push(u);
		});
	}
	l2 = undefined;
	var i;
	var userCount = (Object.keys(users).length);
	var instanceCount = l.length;
	var ldapGroups; // List of group for a user entry

	for (i = 0; i < instanceCount; i++) {

		if (_track && ((i % 200) === 0)) {
			_track(locale.format(module, "delUpdate"),
				locale.format(module, "count", i, userCount),
				20 + 80 * (i + userCount) / (instanceCount + userCount));
		}
		var user = l[i];
		var name = user.authenticationName(_) || user.login(_);
		var newValues = users[name];
		if (!newValues) { // LDAP entry does not exist any more
			if (del) {
				tracer && tracer("Delete " + name);
				user.deleteSelf(_);
			} else { // just mark the user as inactive
				tracer && tracer("Inactive " + name);
				user.setActive(_, false); // include X3 users
				user.save(_);

				//Desactivate all X3 generated users
				user.endpoints(_)
					.toArray(_)
					.forEach_(_, function(_, ue) {
						if (_isX3EndPoint(_, ue.endpoint(_)) && (ue.computeLogin(_) == ue.login(_))) {
							var x3user = ue.getX3User(_);
							if (x3user) {
								instance.$addDiagnose("info", locale.format(module, "deactivateUser", ue.login(_), ue.endpoint(_).description(_)));
								ue.updateX3User(_, x3user.CODMET(_));
							}
						}
					});

				user.getAllDiagnoses(_, instance.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
			}
		} else { // update from LDAP entry
			tracer && tracer("Update " + name);

			for (var key in translateTable) {
				if (!translateTable[key]) continue;
				var newValue = _newValue(translateTable[key], newValues);
				if (key === "photo") { // set binary property
					if (newValue) {
						var stream = user.photo(_).createWritableStream(_);
						stream.write(_, newValue);
						stream.write(_, null);
					} else {
						user.photo(_).deleteFile(_);
					}
					continue;
				}

				if ((key === "groupName")) {
					ldapGroups = _getLdapGroupsFromValue(newValue);
					continue;
				}


				if (!newValue) {
					newValue = "";
				} else {
					newValue = newValue.toString("utf8");
				}

				if (user[key](_) !== newValue) {
					user[key](_, newValue);
				}
			}

			user.active(_, true);
			user.authentication(_, instance.userAuthentication(_));
			user.sync_ldap(_, instance);
			if (instance.userAuthentication(_) == "ldap") user.ldap(_, instance);
			_processLdapGroups(_, user, ldapGroups, instance);
			user.save(_);

			user.getAllDiagnoses(_, instance.$diagnoses, {
				addEntityName: true,
				addPropName: true
			});
			users[name][USED] = 1;
		}
	}
	user = l = undefined; // for garbage collection
	var db = adminHelper.getCollaborationOrm(_);
	var entity = db.model.getEntity(_, "user");

	i = 0;
	// add users which are in LDAP but not yet in user table
	for (var authenticationName in users) {

		if (_track && ((i % 200) === 0)) {
			_track(locale.format(module, "insert"),
				locale.format(module, "count", i, userCount),
				20 + 80 * (i + instanceCount) / (instanceCount + userCount));
		}
		i++;

		if (users[authenticationName][USED]) {
			users[authenticationName] = undefined;
			continue;
		}
		var inst = entity.createInstance(_, db, null);
		for (var key in translateTable) {
			if (!translateTable[key]) continue;
			var newValue = _newValue(translateTable[key], users[authenticationName]);
			if (key === "photo") { // set binary property
				if (newValue) {
					var stream = inst.photo(_).createWritableStream(_);
					stream.write(_, newValue);
					stream.write(_, null);
				}
				continue;
			}

			if (key === "groupName") {
				ldapGroups = _getLdapGroupsFromValue(newValue);
			} else if (newValue) {
				inst[key](_, newValue.toString("utf8"));
			}

		}
		users[authenticationName] = undefined;
		if (!inst.lastName(_)) {
			instance.$addDiagnose("warning", locale.format(module, "noLastName", authenticationName));
			inst.login(_, "");
			inst.deleteSelf(_);
		} else {
			inst.ldap(_, instance);
			inst.active(_, true);
			// 	are there users with the same name as the new user?
			// escape special characters of regular expressions
			var valueEsc = authenticationName.replace(/([\\\^\$\.\(\)\[\]\{\}\*\?\+])/g, "\\$1");
			// login name is case insensitive
			var disturbingUsers = entity.fetchInstances(_, db, {
				jsonWhere: {
					login: {
						$regex: "^" + valueEsc,
						$options: "i"
					}
				}
			});
			var disturbingNames = {};
			// 	put the names as keys in object
			for (var j = 0; j < disturbingUsers.length; j++) {
				// console.log("DistUser"+disturbingUsers[j].login(_));
				disturbingNames[disturbingUsers[j].login(_).toLowerCase()] = 1;
			}
			if (authenticationName.toLowerCase() in disturbingNames) {
				// 	generate new user name
				// 	this loop is large enough because there can be at most disturbingUsers.length entries
				for (var j = 1; j <= disturbingUsers.length + 1; j++) {
					if ((authenticationName + j).toLowerCase() in disturbingNames) continue;
					inst.login(_, authenticationName + j);
					instance.$addDiagnose("warning",
						locale.format(module, "userNameChange", authenticationName, (authenticationName + j)));
					// console.log(util.format(diagnoses));
					break;
				}
			} else {
				// console.log("Normal User"+authenticationName);
				inst.login(_, authenticationName);
			}

			inst.authentication(_, instance.userAuthentication(_));
			inst.sync_ldap(_, instance);
			if (instance.userAuthentication(_) == "ldap") inst.ldap(_, instance);
			_processLdapGroups(_, inst, ldapGroups, instance);
			//console.log("Save user",inst.login(_));
			inst.save(_);
			inst.getAllDiagnoses(_, instance.$diagnoses, {
				addEntityName: true,
				addPropName: true
			});
		}
	}
	_track && _track(locale.format(module, "finished"), "", 100);

};

exports.updateUsers = updateUsers;

exports.entity = {
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true,
			$default: "LDAP",
			$linksToDetails: true,
			$isUnique: true,
			$pattern: "^[a-zA-Z]\\w*$",
		},
		displayName: {
			$title: "Display Name",
		},
		active: {
			$type: "boolean",
			$title: "Active",
			$default: true
		},
		url: {
			$title: "URL",
			$isMandatory: true,
			$pattern: "^ldaps?://",
			$patternMessage: "URL must start with ldap:// or ldaps://"
		},
		adminDn: {
			$title: "DN for searching",
			$isMandatory: true
		},
		adminPassword: {
			$title: "Password for search DN",
			$capabilities: "confirm",
			$type: "password",
			$encrypt: true,
			$isMandatory: true
		},
		searchBase: {
			$title: "Search base",
			$isMandatory: true
		},
		searchFilter: { // when empty, search will be for authenticationNameMapping
			$title: "Authentification search filter",
		},
		syncSearchFilter: {
			$title: "User search filter"
		},
		image: {
			$title: "Image",
			$type: "image",
			$storage: "db_file",
			$capabilities: ""
		},
		authenticationNameMapping: {
			$title: "Mapping for authentication name",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			},
			$isMandatory: true,
		},
		firstNameMapping: {
			$title: "Mapping for first name",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		lastNameMapping: {
			$title: "Mapping for last name",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		emailMapping: {
			$title: "Mapping for email",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		photoMapping: {
			$title: "Mapping for photo",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		userGroupNameMapping: {
			// Used to indicate the LDAP attribute use on USER to identify the GROUP 
			// in occurrence memberOf
			$title: "Mapping for group membership",
			$default: "memberOf",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		onlyKnownGroups: {
			$title: "Users belonging to known groups",
			$description: "Users belonging to LDAP groups linked to X3 groups",
			$type: "boolean",
			$default: false
		},
		globalSearchFilter: {
			$title: "Global LDAP user search filter",
			$compute: function(_, instance) {
				var groupFilter;
				if (instance.onlyKnownGroups(_)) {
					var db = adminHelper.getCollaborationOrm(_);
					var entity = db.model.getEntity(_, "group");
					var groups = db.fetchInstances(_, entity, {
						jsonWhere: {
							$and: [{
								ldapGroup: {
									$ne: null
								}
							}, {
								ldapGroup: {
									$ne: ""
								}
							}]
						}
					});
					if (groups.length == 0) return;
					groupFilter = "|";
					groups.forEach_(_, function(_, group) {
						groupFilter += "(" + instance.userGroupNameMapping(_) + "=" + group.ldapGroup(_) + ")";
					});
				}

				var filter = "";
				if (instance.syncSearchFilter(_)) {
					filter = instance.syncSearchFilter(_);
					if (!(filter[0] == "(" && filter[filter.length - 1] == ")"))
						filter = "(" + filter + ")";
				}
				if (groupFilter)
					filter += "(" + groupFilter + ")";
				if ((instance.syncSearchFilter(_)) && (groupFilter))
					filter = "&" + filter;

				return filter;
			}
		},
		groupNameMapping: {
			// Used to indicate the LDAP attribute use on GROUP to identify the GROUP name
			$title: "Mapping for group name",
			$lookup: {
				entity: "ldapAttributeName",
				field: "attrName",
				parameters: "name={name}"
			}
		},
		groupSearchFilter: {
			$title: "Group search filter",
			$description: "Group search filter is used only for helping to link x3 groups with LDAP groups (LDAP group name lookup). It is not related to users synchronization.",
			$isMandatory: false
		},
		userAuthentication: {
			$title: "User authentication",
			$description: "Default user authentication",
			$enum: [{
				$title: "LDAP",
				$value: "ldap"
			}, {
				$title: "Standard",
				$value: ""
			}],
			$default: "ldap"
		}
	},
	$titleTemplate: "LDAP",
	$valueTemplate: "{name} {url}",
	$descriptionTemplate: "LDAP {name}",
	$helpPage: "Administration-reference_LDAP",
	$relations: {
		users: {
			$title: "Users",
			$type: "users",
			$inv: "ldap",
			$isComputed: true
		},
		sync_users: {
			$title: "Synchronization users",
			$type: "users",
			$inv: "sync_ldap",
			$isComputed: true
		},
		cacerts: {
			$title: "CA certificates of LDAP server for TLS",
			$type: "caCertificates",
			$inv: "ldaps",
			$isComputed: true
		}
	},
	$functions: {
		ldapAuth: function(_, user, password) {
			var self = this;
			var _data = self._data;
			var config = {};
			for (var k in _data) {
				config[k] = _data[k];
			}
			config.searchFilter = config.searchFilter || "(" + config.authenticationNameMapping + "={{username}})";
			config.cache = false;
			config.tlsOptions = self.getTlsOptions(_);
			return ldapauth.ldapAuthentication(_, user, password, config);
		},
		getTlsOptions: function(_) {
			var self = this;
			var result;
			if (self.url(_).indexOf("ldaps") >= 0) {
				var cacerts = self.cacerts(_).toArray(_);
				if (cacerts.length) {
					result = {
						ca: cacerts.map_(_, function(_, cacert) {
							return cacert.getPEMCertificate(_);
						})
					};
				};
			}
			return result;
		},
		connectionTest: function(_) {
			var instance = this;
			var tlsOptions = instance.getTlsOptions(_);
			var clientOpts = {
				url: instance.url(_),
				tlsOptions: tlsOptions,
			};
			var ldapClient = ldapjs.createClient(clientOpts);
			ldapClient.bind(instance.adminDn(_), instance.adminPassword(_), _);
			ldapClient.unbind(_);
		},
		importUsers: function(_, _track) {
			var instance = this;

			instance.$diagnoses = instance.$diagnoses || [];
			if (userEntity.noAdmin(_)) {
				instance.$addError(locale.format(module, "noAdmin"));
				return;
			}
			var attribs = []; // necessary LDAP attributes
			_track && _track(locale.format(module, "start"), "-", 0);
			var translateTable = _makeTranslateTable(instance, attribs, _);
			_track && _track(locale.format(module, "getUsers"), "-", 1);
			var allUsers = getAllUsers(instance, true, _, attribs);
			_track && _track(locale.format(module, "updateUsers"), "-", 20);
			updateUsers(_, instance, allUsers, false, translateTable, _track);

			return instance.$diagnoses;
		},
		getAllGroups: function(_) {
			var self = this;
			var filter = self.groupSearchFilter(_);
			if (!filter) {
				self.$addError(locale.format(module, "noGroupSearchFilter", ldap.name(_)));
				return null;
			}
			//self.authenticationNameMapping(_,"gidNumber");
			_makeTranslateTable(self, [], _);
			if (!self.groupNameMapping(_)) {
				self.$addError(locale.format(module, "noGroupNameMapping"));
				return null;
			}
			return getAllEntries(self, true, _, [], filter, self.groupNameMapping(_));
		},
		// Not finished yet - dont use it - the function delete only the Syracuse users,
		// x3 users remaining in database
		deleteImportedUsers: function(_) {
			var self = this;
			self.users(_).toArray(_).forEach_(_, function(_, user) {
				user.deleteSelf(_);

			});
		},
		scheduledExecute: function(_, diags) {
			//Reload ldap instance !!!!  
			var ldap = this._db.fetchInstance(_, this._db.getEntity(_, "ldap"), this.$uuid);
			ldap.importUsers(_);
		}
	},
	$services: {
		connectionTest: {
			$method: "POST",
			$isMethod: true,
			$title: "Connection test",
			$execute: function(_, context, instance) {
				try {
					instance.connectionTest(_);
					instance.$addDiagnose("success", locale.format(module, "ConnOK"));
				} catch (e) {
					instance.$addError(locale.format(module, "connError", e));
				}
			}

		},
		usersFromLdap: {
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$title: "Update users from LDAP",
			$facets: ["$details"],
			$execute: function(_, context, instance) {
				var tracker = context && context.tracker;

				function _track(phase, detail, progress) {
					if (phase) tracker.phase = phase;
					if (detail) tracker.phaseDetail = detail;
					if (progress) tracker.progress = progress;
				}

				if (tracker) {
					/// Change the instance diagnoses with tracker diagnoses
					tracker.$diagnoses = tracker.$diagnoses || [];
					instance.$diagnoses = tracker.$diagnoses;
				} else
					instance.$diagnoses = instance.$diagnoses || [];
				instance.importUsers(_, tracker ? _track : null);
			}
		},
		schedule: {
			$method: "POST",
			$title: "Schedule users update",
			$facets: ["$details"],
			$isMethod: true,
			$parameters: {
				$actions: {
					$select: {
						$url: "{$baseUrl}/automates?representation=automate.$select"
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				parameters = parameters || [];
				if (!parameters.$select) {
					var payload = JSON.parse(context.request.readAll(_));
					parameters.$select = payload.$select;
				}
				if (!parameters.$select) return;

				parameters.$select.forEach_(_, function(_, s) {
					var a = instance._db.fetchInstance(_, instance._db.getEntity(_, "automate"), s.$uuid);
					if (!a) {
						return;
					}

					var diag = a.defineNewTask(_, locale.format(module, "ldapImportTaskLabel", instance.name(_)), instance);
					if (diag.some(function(d) {
							d = _normalizeDiag(d);
							return d.$severity === "error";
						})) {
						diag.forEach(function(d) {
							d = _normalizeDiag(d);
							instance.$addDiagnose(d.$severity, d.$message);
						});
					} else {
						instance.$addDiagnose("success", locale.format(module, "taskCreated", a.description(_)));
					}
				});
			}
		}
	},
	$searchIndex: {
		$fields: ["name", "displayName"]
	},
	$events: {
		$canSave: [

			function(_, instance) {
				if ((instance.userAuthentication(_) === "") && (authHelper.getStandardSetting(_).source === "db")) {
					instance.$addDiagnose("error", locale.format(module, "errorUserAuthentication"));
					return false;
				} else {
					return true;
				}



			}
		]

	},
	$defaultOrder: [
		["name", true]
	]

};