"use strict";

var config = require('config');
var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var fs = require('streamline-fs');
var sessionManager = require('../..//src/session/sessionManager').sessionManager;
var httpHelpers = require('@sage/syracuse-core').http;
// caching standard settings for 1 second
var standardCache;
var globals = require('streamline-runtime').globals;
var cacheAccess = 0;
var multiTenant = config.hosting && config.hosting.multiTenant;
var checkLicense = require("../../src/license/check");
var funnel = require('streamline-runtime').flows.funnel(1);

var authMethods = (config.session && config.session.auth) || "basic";
if (!Array.isArray(authMethods)) authMethods = [authMethods];

var dbMethods = authMethods.filter(function(method) {
	return /^(basic|digest)$/.test(method);
});
if (dbMethods.length > 1) throw new Error("configuration error: session.auth cannot contain both basic and digest");
var dbMethod = dbMethods[0];

exports.isAllowed = function(method) {
	return authMethods.indexOf(method) >= 0;
};

exports.getDbMethod = function() {
	if (!dbMethod) throw new Error("configuration error: no default for database authentication");
	return dbMethod;
};

// hack for nanny authentication
var unofficialMods = ["nanny"];

exports.getAuthModule = function(name) {
	if (authMethods.indexOf(name) < 0 && unofficialMods.indexOf(name) < 0) return null;
	return require('../../src/auth/' + name);
};


exports.getProductName = function() {
	var listLicense = checkLicense.validLicenses();
	var productName = ' X3';
	var currentLocale = ((globals.context && globals.context.locale) || 'en-US').toLowerCase();;
	if (listLicense.length === 1) {
		productName = listLicense[0].productTitle[currentLocale] ? listLicense[0].productTitle[currentLocale].replace(/^Sage/g, '') : (listLicense[0].productTitle["en-us"] ? listLicense[0].productTitle["en-us"].replace(/^Sage/g, '') : '');
	} else if (listLicense.length > 0) {
		// check if al license describe the same productTitle
		var stop = false;
		productName = listLicense[0].productTitle[currentLocale] ? listLicense[0].productTitle[currentLocale].replace(/^Sage/g, '') : (listLicense[0].productTitle["en-us"] ? listLicense[0].productTitle["en-us"].replace(/^Sage/g, '') : '');
		for (var i = 1; i < listLicense.length && !stop; i++) {
			stop = (productName !== listLicense[i].productTitle[currentLocale] && listLicense[i].productTitle[currentLocale] ? listLicense[i].productTitle[currentLocale].replace(/^Sage/g, '') : (listLicense[i].productTitle["en-us"] ? listLicense[i].productTitle["en-us"].replace(/^Sage/g, '') : ''));
		}
		if (stop) {
			productName = "";
		}
	}
	return productName;
};
// returns the enum of allowed auth values for global setting (glob === true) or user (glob === false)
exports.authEnum = function(glob) {
	var result = [];
	if (glob) {
		if (authMethods.indexOf('basic') >= 0) result.push({
			$value: "basic",
			$title: "Basic"
		}, {
			$value: "ldap",
			$title: "LDAP"
		});
		if (authMethods.indexOf('digest') >= 0) result.push({
			$value: "digest",
			$title: "Digest"

		});
	} else {
		result.push({
			$value: "",
			$title: "Standard"
		});
		// basic and digest are collapsed into a single 'db' method
		if (authMethods.indexOf('basic') >= 0 || authMethods.indexOf('digest') >= 0) result.push({
			$value: "db",
			$title: "DB"
		}, {
			$value: "ldap",
			$title: "LDAP"
		});
	};
	[{
		$value: "oauth2",
		$title: "OAuth2"
	}, {
		$value: "saml2",
		$title: "SAML2.0"
	}, {
		$value: "sage-id",
		$title: "Sage ID"
	}].forEach(function(elt) {
		if (authMethods.indexOf(elt.$value) >= 0) result.push(elt);
	});
	// console.log("METH "+JSON.stringify(result))
	return result;
};

// standard setting computed from configuration file and instance of settings singleton.
// result has elements: 
//   - method: "basic", "digest", "ldap", "oauth2", "saml2", "sage-id"
//   - source: "db" for database authentication, "ldap" for LDAP authentication, empty for OAuth2 authentication
//   - ldap:   data for standard LDAP server (only if source is "ldap")
//   - oauth2: data for standard OAuth2 server (only if method is "oauth2")	
//   - saml2: data for standard SAML2 id provider (only if method is "saml2")	
// !!! caching possible, because function will be invoked many times?

function _makeSetting(sc) {
	var result = {
		method: sc.method,
		source: sc.source,
		localeCode: sc.localeCode,
		twoDigitYearMax: sc.twoDigitYearMax,
	};
	if ("ldap" in sc) result.ldap = sc.ldap;
	if ("oauth2" in sc) result.oauth2 = sc.oauth2;
	return result;

}

//efficient function to obtain standard settings (without having to query for standard settings again and again).
//will store results for 1 second in a cache
exports.getStandardSetting = function(_) {
	// when there are many subsequent invocations, just return the cached result without funnel for best performance
	var result;
	var now = Date.now();
	if (now - cacheAccess < 1000) {
		if (multiTenant) {
			var tenantId = globals.context.tenantId;
			var sc = standardCache[tenantId];
			if (sc && now - sc._time < 1000) return _makeSetting(sc);
		} else {
			if (standardCache) return _makeSetting(standardCache);
		}
	} else {
		if (multiTenant) standardCache = {};
	}
	// introduce funnel to avoid race conditions for standard cache updates
	funnel(_, function(_) { // check again whether database operation is really necessary:
		// when the second invocation of getStandardSetting comes before the first invocation has finished the funnel,
		// the second invocation will also enter the funnel, but should not do all database queries again but just 
		// get the cached result
		if (now - cacheAccess < 1000) {
			if (multiTenant) {
				var tenantId = globals.context.tenantId;
				var sc = standardCache[tenantId];
				if (sc && now - sc._time < 1000) {
					result = _makeSetting(sc);
					return result;
				}
			} else {
				if (standardCache) {
					result = _makeSetting(standardCache);
					return result;
				}
			}
		} else {
			if (multiTenant) standardCache = {};
		}
		// now we really have to obtain all data
		var db = require('../../src/collaboration/helpers').AdminHelper.getCollaborationOrm(_);
		var settings = db.fetchInstances(_, db.model.getEntity(_, "setting"));
		var setting = settings.length > 0 ? settings[0] : null;
		var method = setting ? setting.authentication(_) : authMethods[0];
		if (authMethods.length === 0) throw new Error("configuration error: No authentication method in nodelocal.js");
		if (authMethods.indexOf(method === "ldap" ? "basic" : method) < 0) {
			var tenant = globals.context.tenantId || "";
			if (tenant) tenant = " for tenant " + tenant;
			// set standard authentication method to first method in nodelocal.js
			method = authMethods[0];
			switch (method) {
				case "oauth2":
					if (!setting.oauth2(_)) {
						var inst = db.fetchInstances(_, db.model.getEntity(_, "oauth2"), {
							jsonWhere: {
								active: true
							}
						});
						if (inst.length === 1) setting.oauth2(_, inst[0]);
						else throw new Error("configuration error: configuration oauth2 requested but no unique active OAuth2 server available" + tenant);
					}
					break;
				case "saml2":
					if (!setting.saml2(_)) {
						var inst = db.fetchInstances(_, db.model.getEntity(_, "saml2"), {
							jsonWhere: {
								active: true
							}
						});
						if (inst.length === 1) setting.saml2(_, inst[0]);
						else throw new Error("configuration error: configuration saml2 requested but no unique active SAML2 identity provider available" + tenant);
					}
					break;
				case "ldap":
					if (!setting.ldap(_)) {
						var inst = db.fetchInstances(_, db.model.getEntity(_, "ldap"), {
							jsonWhere: {
								active: true
							}
						});
						if (inst.length === 1) setting.ldap(_, inst[0]);
						else throw new Error("configuration error: configuration ldap requested but no unique active LDAP server available" + tenant);
					}
					break;
			}
			setting.authentication(_, method);
			console.log("Set standard authentication to " + method + tenant);
			setting.save(_);
			var diags = [];
			setting.getAllDiagnoses(_, diags);
			if (diags.length) {
				console.log("Messages during changing standard authentication " + JSON.stringify(diags));
			}
		}
		var lpref = (setting && setting.localePref(_));
		result = {
			twoDigitYearMax: (setting ? setting.twoDigitYearMax(_) : 2029),
			source: method,
			method: method,
			localeCode: (lpref ? lpref.code(_).toLowerCase() : "en-us") // locale code must be in lower case (used in factory._js)! 
		};
		switch (method) {
			case "basic":
			case "digest":
				result.source = "db";
				break;
			case "ldap":
				if (setting) {
					var ldap = setting.ldap(_);
					if (!ldap) throw new Error("configuration error: ldap server missing");
					result.ldap = ldap._data;
					result.ldap.tlsOptions = ldap.getTlsOptions(_);
				} else throw new Error("No global LDAP without global settings");
				break;
			case "oauth2":
				var oauth2 = setting ? setting.oauth2(_) : config.session.oauth2;
				if (!oauth2) throw new Error("configuration error: oauth2 server missing");
				result.oauth2 = setting ? oauth2._data : oauth2;
				break;
			case "saml2":
				var saml2 = setting ? setting.saml2(_) : config.session.saml2;
				if (!saml2) throw new Error("configuration error: saml2 id provider missing");
				result.saml2 = setting ? saml2._data : saml2;
				break;
		}
		if (multiTenant) {
			result._time = now;
			standardCache[tenantId] = result;
		} else standardCache = result;
		// marker that cache is now updated
		cacheAccess = now;
	});

	return result;

};

exports.error = function(status, message, headers) {
	var err = new Error(message);
	err.$httpStatus = status;
	err.$httpHeaders = headers;
	return err;
};

exports.unauthorized = function(challenge) {
	_errorLogging(!_);
	return exports.error(401, locale.format(module, "unauth"), challenge && {
		'www-authenticate': challenge,
	});
};

exports.accessDenied = function(status, login) {
	var args = [module, status].concat(Array.prototype.slice.call(arguments, 2));
	return exports.error(status === "noLicense" ? 402 : 403, locale.format.apply(locale, args));
};

exports.genPage = function(_, response, path, params) {
	var html = fs.readFile(path, "utf8", _);
	// keep only the sections for enabled auth methods
	html = html.replace(/\{\{([^\}]+)\}\}/g, function(all, name) {
		return /^js\$/.test(name) ? params[name] : helpers.string.htmlEscape(params[name]);
	});
	response.writeHead(200, {
		"content-type": "text/html"
	});
	response.end(html);
};

var urlAuthParam = "urlAsk=";

var errorLogCount = 0;

function _errorLogging(_) {
	if (!config.hosting || !config.hosting.multiTenant) return;
	try {
		var c = ++errorLogCount;
		console.log(new Date().toISOString(), c + "Disconnection data " + globals.context.tenantId);
		if (globals.context.request && globals.context.request.headers)
			console.log(c + "Cookie " + globals.context.request.headers.cookie + " Path " + globals.context.request.url);
		console.log(c + "Local sessions " + require('../..//src/session/sessionManager').localSessions());
		var adminHelpers = require('../../src/collaboration/helpers');
		var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
		// fetch user
		if (db) {
			var sessions = db.fetchInstances(_, db.model.getEntity(_, "sessionInfo"), {});
			sessions.forEach_(_, function(_, s) {
				console.log(c + "Session " + s.sid(_) + " " + s.userName(_) + " " + s.serverName(_));
			});
		}
		console.log(c + "End of disconnection data. Stack " + new Error().stack);

	} catch (e) {
		console.error("Error during disconnection logging " + e + " " + e.stack);
	}


}


exports.redirect = function(_, request, response, location, authenticated, status) {
	// we are not authenticated - response depends on accept header
	var acceptHtml = httpHelpers.parseAccept(request.headers.accept).some(function(elt) {
		return elt.type === "*" || elt.type === "html";
	});


	// TODO: localize
	if (acceptHtml) {
		var authTargetUrl = request.session.authTargetUrl;
		if (authTargetUrl) {
			if (location.indexOf("?url") >= 0 || location.indexOf("/syracuse-tablet/") >= 0 || authTargetUrl.indexOf("/syracuse-mobile/html/" > -1)) {
				tracer && tracer("Dropping authTargetUrl " + authTargetUrl + " because location has already query parameter: " + location);
				console.log("Drop authTargetURL " + location);
				authTargetUrl = "";
			} else {
				if (authTargetUrl.indexOf("/syracuse-mobile/html/" > -1)) {
					authTargetUrl = "";
				} else {
					var index = authTargetUrl.indexOf(urlAuthParam);
					if (index >= 0) {
						tracer && tracer("Cut off urlAuthParam from " + authTargetUrl);
						console.log("Cut off urlAuthParam from " + authTargetUrl);
						authTargetUrl = authTargetUrl.substr(0, index);
					}
					authTargetUrl = "?" + urlAuthParam + authTargetUrl;
				}
			}
		} else {
			authTargetUrl = "";
		}
		var headers = {
			"content-type": "text/html; charset=utf8",
			"location": location + authTargetUrl,
		};
		response.writeHead(status || 307, headers);
		response.end('<html><head><title>Redirecting...</title></head>' + //
			'<body><a href="' + location + '">click here to continue</a></body></html>', "utf8");
	} else {
		// AJAX (or similar) request - generate a diagnose with a link to the login page.
		// don't redirect, send unauthorized instead
		var headers = {
			"content-type": "application/json",
		};
		var status, severity, message, title;
		if (authenticated) {
			message = "sucessfully authenticated";
			status = 200;
			severity = "info";
			title = "requested page";
			var referer = request && request.headers && request.headers.referer;
			if (referer && referer.indexOf(urlAuthParam) !== -1) {
				location = referer.substring(referer.indexOf(urlAuthParam) + urlAuthParam.length);
			}
		} else {
			headers["www-authenticate"] = "Redirect " + location, // keep HTTP spec happy
				message = request.session && request.session.loginError || locale.format(module, "ajaxDisconnected");;
			status = 401;
			severity = "error";
			title = "login page";
			console.log((new Date().toISOString()) + " Disconnection " + request.url + " " + request.headers.cookie);
			_errorLogging(!_);
		}
		response.writeHead(status, headers);

		// get the location if it contains url
		response.end(JSON.stringify({
			$diagnoses: [{
				$message: message,
				$severity: severity,
				$links: {
					$redirect: {
						$title: title,
						//locale.format(module, "continue"),
						$type: "html",
						$target: "_self",
						$url: location,
					}
				}
			}]
		}), 'utf8');
	}
};

function notFound(_, request, response) {
	response.writeHead(404, {
		"content-type": "text/plain",
	});
	// security issue, do not expose the url
	// response.end("url not found: " + request.url);
	response.end("Requested url not found");
	return false;
}

function setLocaleFromRequest(_, request) {
	var header = request.headers['accept-language'];
	if (header) {
		var loc = /^[-a-zA-Z]+/.exec(header);
		if (loc) {
			locale.setCurrent(_, loc[0]);
		}
	}
}

exports.dispatcher = function(level, routes) {
	return function(_, request, response) {
		if (level === 2 && !request.fromNanny && (request._request && !request._request.fromNanny)) {
			sessionManager.ensureSession(_, request, response);
			setLocaleFromRequest(_, request);
		}
		try {
			var token = request.url.split(/[\/\?]/)[level];
			var route = routes[token] || notFound;
			return route(_, request, response);
		} catch (ex) {
			console.error(new Date().toISOString(), ex.stack);
			request.session.loginError = ex.message;
			return exports.redirect(_, request, response, "/auth/login/page");
		}
	};
};