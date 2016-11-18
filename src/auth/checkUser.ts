"use strict";

var locale = require('streamline-locale');
var adminHelpers = require('syracuse-collaboration/lib/helpers');
var crypto = require('crypto');
var check = require('../../src/license/check');
var globals = require('streamline-runtime').globals;
var config = require('config');
var authHelper = require("../../src/auth/helpers");
var sageId = require("../..//src/sage-id");

exports.checkUserLogin = function(_, session, login, request) {
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	// fetch user
	var user = db.fetchInstance(_, db.model.getEntity(_, "user"), {
		jsonWhere: {
			login: login,
			active: true
		}
	});
	if (!user) throw authHelper.unauthorized();

	// License check
	var diagnoses = _checkRoleAndLicense(_, user, request, session);
	if (diagnoses.length) console.error("Login diagnoses " + login + ": " + JSON.stringify(diagnoses));
	var p = user.preferences(_);
	if (p) {
		// force user locales: hack request accept-language header
		var l = p.lastLocaleCode(_); // check if locale exists
		if (globals.context && globals.context.request && l && user.getUserLocaleByCode(_, l)) globals.context.request.headers["accept-language"] = l;
	}
	session.setData("userID", user.$uuid);
	session.setData("userLogin", user.login(_));
};

exports.fromCertificate = function(_, session, login) {
	return exports.checkUserLogin(_, session, login);
};

/** check user (and password) for different authentication methods. User name must be in user table
 * parameters:
 * request: current request (request.session will receive data of current user in case of success
 * method: authentication method (basic, digest, oauth2...)
 * login: login user name
 * password: password of user (from basic authentication), or function to check the password
 * serverName: additional server name for oauth2
 */

exports.fromLoginPage = function(_, request, method, login, password, challenge, serverName) {
	var session = request.session;
	var standardSetting = authHelper.getStandardSetting(_);
	var user = null;
	var realm = config.session.realm;

	// does login method from global settings fit to current login?
	var globalSettingsServer = (method === 'basic' ? (standardSetting.method === 'basic' || standardSetting.method === 'ldap') : standardSetting.method === method && (method != "oauth2" && method != "saml2" || standardSetting[method].name === serverName));
	// fetch user in database
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var condition = {};
	var users = [];
	var server;
	if (typeof(serverName) === "object") {
		server = serverName;
		serverName = server.name(_);
	}
	var isBearer = method === 'oauth2' && /^Bearer\s+(\S+)/.test(request.headers.authorization);
	if (isBearer) {
		if (server == null) {
			server = db.fetchInstance(_, db.model.getEntity(_, "oauth2"), {
				jsonWhere: {
					batchAuthentication: true,
					name: serverName
				}
			});
		}
		// Preferred users are those with an oauth2 binding
		var coll = db.db.collection("User", _);
		var elts = coll.find({
			$and: [{
				active: true
			}, {
				userOAuth2s: {
					$elemMatch: {
						$and: [{
							username: {
								$regex: "^" + login + "$",
								$options: "i"
							}
						}, {
							"oauth2._uuid": server.$uuid
						}]
					}
				}
			}]
		}).toArray(_);
		if (elts && elts.length > 0) {
			if (elts.length != 1) throw authHelper.accessDenied("ambiguousUser");
			users = [db.fetchInstance(_, db.model.getEntity(_, "user"), elts[0]._id)];
		} else {
			users = db.fetchInstances(_, db.model.getEntity(_, "user"), {
				sdataWhere: 'active eq true and (email like "' + login + '")'
			});
		}
	} else {
		if (login.indexOf('@') > 0 && (!config.session || !config.session.authAlwaysLogin)) {
			condition.sdataWhere = '(email like "' + login + '" or ((email eq null or email eq "") and (login eq "' + login + '"))) and (';
			if (globalSettingsServer) condition.sdataWhere += 'authentication eq "" or ';
			if (method !== "basic") condition.sdataWhere += 'authentication eq "' + method + '")';
			else condition.sdataWhere += 'authentication eq "db" or authentication eq "ldap")';
			// console.log("Condition", condition, standardSetting, globalSettingsServer)

		} else {
			condition.jsonWhere = {
				login: login
			};
			if (method !== "basic" && !globalSettingsServer) condition.jsonWhere.authentication = method;
		}
		users = db.fetchInstances(_, db.model.getEntity(_, "user"), condition);
	}
	// if no user, we are done
	if (users.length === 0) {
		if (method === 'oauth2' || method === 'saml2') {
			console.log("Login name not found " + login);
			throw new Error(locale.format(module, "notFound", login));
		} else {
			if (method === 'sage-id')
				sageId.create(require("../../src/auth/sage-id").getSageIdOptions(_, request)).logout(request, null, session, _);
			throw authHelper.unauthorized(challenge);
		}
	}

	// if several users match, reject except if admin is in the list - keep it.
	if (users && users.length > 1) {
		users = users.filter_(_, function(_, u) {
			return u.login(_) === 'admin';
		});
		if (users.length != 1) throw authHelper.accessDenied("ambiguousUser");
	}
	user = users[0];

	// check that user is active (should be already filtered out above)
	if (!user.active(_)) throw authHelper.accessDenied("inactiveUser", login, login);

	var localConfig = {};
	if (isBearer) {
		// server has already been verify in bearer provider
		localConfig.method = "oauth2";
		localConfig.oauth2 = server._data;
		// console.error("User auth " + user.login(_) + " " + " " + user.email(_) + " " + method);
	} else {
		// get auth configuration for this user
		var userAuthentication = user.authentication(_) || "";
		localConfig.method = userAuthentication;
		// console.error("User auth " + user.login(_) + " " + " " + user.email(_) + " " + userAuthentication);
		// combine user-level and global authentication settings
		switch (userAuthentication) {
			case "":
				localConfig = standardSetting;
				break;
			case "db":
				localConfig.method = authHelper.getDbMethod();
				localConfig.source = "db";
				break;
			case "ldap":
				localConfig.ldap = user.ldap(_);
				break;
			case "oauth2":
				localConfig.oauth2 = user.oauth2(_)._data;
				break;
			case "saml2":
				localConfig.saml2 = user.saml2(_)._data;
				break;
			case "sage-id":
				break;
			default:
				throw new Error("bad user authentication method: " + userAuthentication);
		}
	}
	if (!localConfig.source) localConfig.source = localConfig.method;

	// check that we used the right method. Exception: method is "basic" and user has "ldap" (because "ldap" uses "basic").
	// console.log("Test "+localConfig.method +" "+ method)
	if (localConfig.method !== method && (localConfig.method !== "ldap" || method !== "basic")) {
		throw authHelper.accessDenied("wrongAuth", user, method);
	}

	// Verify the password
	switch (localConfig.source) {
		case "db":
			if (typeof password === "function") {
				if (!password(user.password(_))) throw authHelper.unauthorized(challenge);
			} else {
				// compute hash of password using user name from user entity
				// apply hash function from RFC2617
				var hash = crypto.createHash('MD5');
				var pwd = user.password(_);
				var pwd0 = pwd;
				var a1 = user.salt(_) + ":" + config.session.realm + ":" + password;
				if (pwd[0] === "U") { // hash has been obtained using UTF8 representation (new)
					pwd = pwd.substr(1);
					hash.update(a1, 'utf8');
				} else
					hash.update(a1, 'binary');
				var digst = hash.digest("hex");
				if (digst !== pwd) throw authHelper.unauthorized(challenge);
				if (pwd0[0] !== "U" && !db.hasDatabaseLock(_)) {

					// update the password to new mode
					var hash = crypto.createHash('MD5');
					hash.update(a1, 'utf8');
					user.password(_, "U" + hash.digest("hex"));
					user.save(_);
					var diags = [];
					user.getAllDiagnoses(_, diags, {
						addPropName: true
					});
					console.log("Update user password of " + user.login(_));
					if (diags.some(function(diag) {
							return diag.$severity === "error";
						})) {
						console.error("Cannot update password format for user " + user.login(_) + ": " + JSON.stringify(diags));
					}
				}
			}
			break;
		case "ldap":
			var ldapName = user.authenticationName(_) || user.login(_);
			if (!localConfig.ldap.active(_)) { // server inactive: no authentication
				console.log("LDAP server inactive");
				throw authHelper.unauthorized(challenge);
			} else {
				try {
					localConfig.ldap.ldapAuth(_, ldapName, password);
				} catch (e) {
					console.log("LDAP Authentication error: " + e.toString());
					throw authHelper.unauthorized(challenge);
				}
			}
			break;
		case "oauth2":
			if (serverName !== localConfig.oauth2.name) throw authHelper.accessDenied("wrongAuth", user, serverName);
			break;
		case "saml2":
			if (serverName !== localConfig.saml2.name) throw authHelper.accessDenied("wrongAuth", user, serverName);
			break;
		case "sage-id":
			// TODO: extra check on server name
			break;
		default:
			throw new Error("internal error: bad auth source " + localConfig.source);
	}

	// check role
	var diagnoses = _checkRoleAndLicense(_, user, request, session);

	// user is valid
	session.setData("userID", user.$uuid);
	session.setData("userLogin", login);
	session.setData("authType", localConfig.source);
	// TODO: show diagnoses!!!! The code below does not work
	var up = session.getUserProfile(_);
	if (up) {
		diagnoses.forEach(function(diag) {
			up.$addDiagnose(diag.$severity, diag.$message);
		});
	}
	return user;
};

// finds role (even without user profile) and performs license check
function _checkRoleAndLicense(_, user, request, session, diagnoses) {
	var groups = user.groups(_).toArray(_);
	diagnoses = diagnoses || [];
	if (!groups.length) throw authHelper.accessDenied("noGroup", user, user.login(_));
	var p = user.preferences(_);
	var role;
	// do not force accept-language for web services
	if (p && request && request.url.indexOf("/soap-") === -1) {
		// force user locales: hack request accept-language header
		var l = p.lastLocaleCode(_);
		// check if locale exists
		if (globals.context && globals.context.request && l && user.getUserLocaleByCode(_, l)) globals.context.request.headers["accept-language"] = l;
		// take last role from user preferences
		role = p.lastRole(_);
	}
	var role2 = role;
	if (role) {
		// test whether role is in current groups
		for (var j = 0; j < groups.length; j++) {
			var group = groups[j];
			role = group.role(_);
			if (role && role.$uuid === role2.$uuid) break; // role found
			role = null;
		}
	}
	// no role from user preferences - take role from groups
	if (!role) {
		if (!groups.length) throw authHelper.accessDenied("noGroup", user, user.login(_));
		for (var j = 0; j < groups.length; j++) {
			var group = groups[j];
			role = group.role(_);
			if (role) break; // role found
		}
	}
	if (!role) {
		throw authHelper.accessDenied("noRole", user, user.login(_));
	}
	if (role && !check.checkConcurrent(_, session, role, user.login(_), session.device, diagnoses, true)) { // try to find new session
		throw authHelper.accessDenied("noLicense", user);
	}
	return diagnoses;
}