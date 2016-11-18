"use strict";
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var locale = require('streamline-locale');
var adminHelpers = require('../../src/collaboration/helpers');
var globals = require('streamline-runtime').globals;
var authHelpers = require('./helpers');
var crypto = require('crypto');
var config = require('config');
var ldapAuthentication = require("../../src/auth/ldap").ldapAuthentication;

exports.$exported = true;

function _error(message) {
	return makeResult([{
		$severity: "error",
		$message: message
	}]);
}

function makeResult(diagnoses) {
	var result = {
		$diagnoses: diagnoses
	};
	return result;
}



/* Parameters:
 * - password: signature password
 * return value: JSON structure with $diagnoses array (may have length 0)
 */
function sign(_, password) {
	return _sign(_, password, undefined);
}

/* For unit test: also be able to set user */
function _sign(_, password, login) {
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	if (!login) {
		var session = globals.context.session;
		if (!session) {
			return _error(locale.format(module, "noSession"));
		}
		login = session.getData("userLogin");
		if (!login) return _error(locale.format(module, "noLogin"));
	}
	var user = db.fetchInstance(_, db.model.getEntity(_, "user"), {
		jsonWhere: {
			login: login
		}
	});
	if (!user) return _error(locale.format(module, "noUser", login));
	var auth = user.authentication(_);
	tracer && tracer("login for signature " + user.login(_));
	var localConfig;
	if (!auth) {
		localConfig = authHelpers.getStandardSetting(_);
		auth = localConfig.source;
	}
	var pwd;
	tracer && tracer("authentication method " + auth);
	switch (auth) {
		case 'db':
			pwd = user.password(_);
			break;
		case 'ldap':
			// ldap authentication
			if (!localConfig) {
				localConfig = {
					ldap: user.ldap(_)._data
				};
				localConfig.ldap.tlsOptions = user.ldap(_).getTlsOptions(_);
			}
			var ldapName = user.authenticationName(_) || user.login(_);
			if (!localConfig.ldap.active) { // server inactive: no authentication
				tracer && tracer("LDAP server inactive");
				return _error(locale.format(module, "ldapInactive"));
			} else {
				try {
					ldapAuthentication(_, ldapName, password, localConfig.ldap);
				} catch (e) {
					tracer && tracer("LDAP Authentication error: " + e.toString());
					return _error(locale.format(module, "ldapError"));
				}
			}
			break;
		default:
			pwd = user.signature(_);
			break;
	}
	if (pwd) {
		// compute hash of password using user name from user entity
		// apply hash function from RFC2617
		var hash = crypto.createHash('MD5');
		// config.session.realm is set in syracuse._js
		var a1 = user.login(_) + ":" + config.session.realm + ":" + password;
		if (pwd[0] === "U") { // hash has been obtained using UTF8 representation (new)
			pwd = pwd.substr(1);
			hash.update(a1, 'utf8');
		} else
			hash.update(a1, 'binary');
		var dig = hash.digest("hex");
		if (dig !== pwd) return _error(locale.format(module, "noAuth"));
	}
	return makeResult([]);
}

exports.sign = sign;
// for unit tests
exports._sign = _sign;