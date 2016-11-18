"use strict";

// obsolete authentication code
// moved here while new code is being solidified

// Following code was in userCheck
var userRedirect = {};

function _clearRedir(request) {
	// console.log("CLR")
	if (request) {
		var cookie = request.headers.cookie;
		if (cookie) {
			var r = /\bclient\.id=([\w\-]+)/.exec(cookie);
			if (r) {
				var id = r[1];
				// console.log("IDl "+id+ " "+require('util').format(userRedirect));
				for (var login in userRedirect) {
					if (login.indexOf(id) === 0) delete userRedirect[login];
				}
			}
		}
	}
}
exports.clearRedir = _clearRedir;

//avoid redirect when same user wants to log in again (within 100 seconds)
// redirect will stay for at least 1.5 seconds, because sometimes it is not recognized by the client
// therefore double login will be avoided.
// this does not apply to OAuth2, because OAuth2 does not check authentication locally

function _redir(login, status, userAuthentication, request) {
	if (userAuthentication === "oauth2") return status;
	var now = Date.now();
	var compare = now - 100000; // 100 seconds
	for (var login1 in userRedirect) {
		if (userRedirect[login1] < compare) delete userRedirect[login1];
	}
	var id = "";
	if (request) {
		var cookie = request.headers.cookie;
		if (cookie) {
			var r = /\bclient\.id=([\w\-]+)/.exec(cookie);
			if (r) id = r[1];
			// console.log("ID "+id);
		}
	}
	login = id + "$" + login;
	var val = userRedirect[login];
	if (val && (now - val > 1500 || val > now)) {
		// console.log("del "+login)
		delete userRedirect[login];
		return "unAuthenticated";
	} else {
		// console.log("add "+login)
		if (!val) userRedirect[login] = now;
		return status;
	}
}

// Following code was in dispatcher
function authenticateObsolete(_) {
	if (options.authRequired && session) {
		tracer && tracer("Session is auth: " + session.isAuthenticated());
		if (!session.isAuthenticated()) {
			var authRes = false;
			if (session.expireDue) {
				options.forceAuth = false;
				options.forceAuth2 = true;
				options.authType = "sage-id";
			}
			request.unauthUseRedirect = options.unauthUseRedirect;
			var authModule = getAuthModule(request, options.forceAuth2, _);
			if (options.forceAuth) {
				authRes = authModule.authenticate(request, response, session, _);
			} else if (options.forceAuth2) {
				if (options.authType == "sage-id") {
					var authData = "";
					if (session.expireDue) {
						//If session is due to expire and activity occurs, this section of code will be called
						// It will extend the session remove the expire mark and save user info in session
						authData = authModule.sessionExtend(request, response, session, _);
						require("../auth/sage-id").verifyUser(request, response, authData, _);
					} else {
						// Returned authData, contains email, accessToken, identityId, and auth
						// auth contains whether or not user was authenticated successfully
						authData = authModule.dispatch(request, response, session, _);
						// sessionNotify only apart of authData during notification handling
						// Extract session and determine whether or not to extend or end session
						if (authData.sessionNotify) {
							session = _sessions[authData.sessionId];
							var extend = require("../auth/sage-id").extendSession(request, response, session, authData, _);
							if (extend) authData = authModule.sessionExtend(request, response, session, _);
						}
					}
					authRes = authData.auth;
				} else authRes = authModule.authenticate2(request, response, _);
			} else authRes = authModule.forbidden(request, response);
			//
			if (authRes) {
				// TODO: this should be in session.afterAuthentication
				// force user profile loading
				// If SageID authentication successful, retrieve user from mongoDB and store info in session
				// Update session with new sessionId provided by Sage ID
				if (options.authType == "sage-id") {
					require("../auth/sage-id").verifyUser(request, response, authData, _);
					var pck = helpers.http.parseCookie(request.headers.cookie) || {};
					var port = request.connection.localPort;
					var cookie = pck[_settings.key + "." + port];
					session = require("../auth/sage-id").updateSessionWithID(request, response, _sessions, cookie, authData, _);
				}
				session.getUserProfile(_);
			}
			//
			return authRes;
		}
	}
	return true;
}


// obtain module for authentication from request url and standard configuration
exports.getAuthModuleObsolete = function(request, redirect, _) {
	// TODO: for now, if secure connection, use of client certificates having CN mapping to a valid user name
	// later, have a possibility of generic client certificate and / or ability to change user
	// certificate auth >>>
	// console.log("GET AUTH "+request.url);
	if (request.connection.authorized) return require("../auth/certificate").create(checkUser.fromCertificate);
	// certificate auth <<<
	var result;
	var parsed = url.parse(request.url);
	var pathname;
	if (redirect) { // use original URL
		pathname = querystring.parse(parsed.query).state;
		request.syracuseOriginalPath = pathname;
	} else {
		pathname = parsed.pathname;
	}
	var regexResult; // search authentication information in request.url
	var authmethod;
	var authserver;
	var setting; // either standard setting or (partial) setting derived from path:
	// authentication header in URL path: /auth/basic or /auth/oauth2-<Name>
	regexResult = /^\/auth\/(std|basic|digest|sageerpx3|oauth2-(\w*)|sage-id)(\-\-[0-9a-f]*)?/.exec(pathname);
	// authentication header may be of different method that in config, we accept it
	if (regexResult == null && request.headers.authorization) {
		// extract method from header
		regexResult = ["", (request.headers.authorization || "").split(" ")[0].toLowerCase()];
	}
	// temp hack, before the method gets into standard settings
	if (regexResult == null && config.session && config.session.auth === "sageerpx3") {
		regexResult = ["", "sageerpx3"];
		//		authmethod = "sageerpx3";
	}
	if (config.session && config.session.auth === "sage-id") {
		authmethod = "sage-id";
	} else if (Array.isArray(config.session.auth)) {
		var authMethods = config.session.auth;
		var path = request.url.split('/')[1];
		if (request.url.split('/')[2] === "sage-id" && authMethods.indexOf("sage-id") > -1) {
			authmethod = "sage-id";
		} else if (path === "sdata" && authMethods.indexOf("sageerpx3") > -1) {
			regexResult = ["", "sageerpx3"];
			authmethod = "sageerpx3";
		} else if (path === "auth" && authMethods.indexOf("oauth2") > -1) {
			// Enter oauth2 authentication methods here
			var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
			var authserverInstance = db.fetchInstance(_, db.model.getEntity(_, "oauth2"), {
				sdataWhere: '(name eq "' + regexResult[2] + '")'
			});
			if (!authserverInstance) {
				console.log("No OAuth2 server with name " + regexResult[2]);
				throw new Error(locale.formatDISABLED(module, "noOauth2N", regexResult[2]));
			}
			if (!authserverInstance.active(_)) {
				console.log("inactive OAuth2 server with name " + regexResult[2]);
				throw new Error(locale.formatDISABLED(module, "oauth2Inact", regexResult[2]));
			}
			// !!! not OK. How can I copy all attributes?
			authserver = authserverInstance._data;
		} else {
			authmethod = "basic";
		}
	} else if (regexResult == null || regexResult[1] === "oauth2-" || regexResult[1] === "std") {
		authmethod = standardSetting.method;
		if (regexResult && regexResult[1] === "oauth2-" && authmethod !== "oauth2-") {
			console.log("No OAuth2 server according to standard config file");
			throw new Error(locale.formatDISABLED(module, "noOauth2"));
		}
		authserver = standardSetting.oauth2;
	} else {
		authmethod = regexResult[1];
		if (authmethod && authmethod.indexOf("oauth2") === 0) {
			// get OAuth2 server from database
			var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
			var authserverInstance = db.fetchInstance(_, db.model.getEntity(_, "oauth2"), {
				sdataWhere: '(name eq "' + regexResult[2] + '")'
			});
			if (!authserverInstance) {
				console.log("No OAuth2 server with name " + regexResult[2]);
				throw new Error(locale.formatDISABLED(module, "noOauth2N", regexResult[2]));
			}
			if (!authserverInstance.active(_)) {
				console.log("inactive OAuth2 server with name " + regexResult[2]);
				throw new Error(locale.formatDISABLED(module, "oauth2Inact", regexResult[2]));
			}
			// !!! not OK. How can I copy all attributes?
			authserver = authserverInstance._data;
		}
	}
	if (regexResult && regexResult[1].indexOf("oauth2") < 0 && regexResult[3]) { // login with token
		var user = require("../auth/changePassword").getTempLogin(regexResult[3]);
		if (user) {
			return {
				authenticate: function(request, response, session, _) {
					request.session && request.session.afterAuthentication({
						user: user,
					});
					console.log("Authentication after change password");
					return true;
				}
			}; // no authentication necessary any more
		}
	}

	if (authmethod === "basic") {
		return require("../auth/basic").create(checkUser.fromLoginPage);
	} else if (authmethod === "digest") {
		return require("../auth/digest").create(checkUser.fromLoginPage);
	} else if (authmethod === "sageerpx3") {
		return require("../auth/sageerpx3").create(checkUser.fromLoginPage);
	} else if (authmethod === "sage-id") {
		sageIdAuth.unAuthenticated = function(request, response, _) {
			return this.authenticate(request, response, request.session, _);
		};
		sageIdAuth.loginBaseUrl = "/index3.html";
		return sageIdAuth;
	} else {
		return require("../auth/oauth2").create(checkUser.fromLoginPage, authserver);
	}
};

function dispatcherObsolete(config) {
	return function(_, request, response) {
		// listing of all authentication methods
		if (/index2\.html$/.exec(request.url)) {
			var path = "/syracuse-main/html/main.html?url=" + encodeURIComponent("?representation=home.$navigation");
			response.writeHead(200, {
				"Content-type": "text/html"
			});
			response.write(_, '<html>Authentication methods:<br><a href="' + request.url.replace("/index2.html", path) + '">Standard</a><br>');
			response.write(_, '<html><a href="' + request.url.replace("/index2.html", '/auth/digest' + path) + '">Digest</a><br>');
			response.write(_, '<html><a href="' + request.url.replace("/index2.html", '/auth/basic' + path) + '">Basic</a><br>');
			var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
			// fetch OAuth2 server data
			var oauth2s = db.fetchInstances(_, db.model.getEntity(_, "oauth2"), {
				sdataWhere: ""
			});
			var i;
			for (i = 0; i < oauth2s.length; i++) {
				if (oauth2s[i].active(_)) {
					var name = oauth2s[i].name(_);
					var displayname = oauth2s[i].displayName(_) || name;
					response.write(_, '<html><a href="' + request.url.replace("/index2.html", "/auth/oauth2-" + name + path) + '">' + displayname + '</a><br>');
				}
			}
			// if there is not setting instance, also provide link for OAuth2 server in global configuration
			var setting = db.fetchInstance(_, db.model.getEntity(_, "setting"), {
				sdataWhere: ""
			});
			if (!setting && config.session.auth === "oauth2" && typeof(config.oauth2) != "undefined") {
				response.write(_, '<html><a href="' + request.url.replace("/index2.html", "/auth/oauth2-" + path) + '">Configured OAuth2 server</a><br>');
			}
			return response.end();
		}

		// OAuth2 redirect path equals "/redirect". In order to avoid parsing every url, it will be searched using a substring function first
		if (request.url.indexOf("/oauth2/redirect") >= 0 && url.parse(request.url).pathname === "/oauth2/redirect") {
			// second step of authentication
			if (!sessionManager.ensureSession(_, request, response, {
				authRequired: true,
				forceAuth2: true
			})) return;
			// redirect to start page
			response.writeHead(303, {
				"Content-Type": "text/html",
				"Location": request.syracuseOriginalPath
			});
			response.end('<html><a href="/test">Link</a></html>');
			return;
		}

		// Processing the password change dialog
		if (request.url.indexOf("/auth/pwd--") === 0) {
			var token = request.url.substr(9);
			var newUrl = "/";
			var changePasswordModule = require('../auth/changePassword');
			var tmpLogin = changePasswordModule.getTempLogin(token, request.method === "GET"); // do not delete token for get request, because it will be necessary for subsequent POST request
			if (tmpLogin) {
				console.log("Login found for user " + tmpLogin.user);
				if (request.method === "GET") {
					// try to set locale for given user
					var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
					if (db) {
						var whereClause = "(login eq \"" + tmpLogin.user + "\")";
						var user = db.fetchInstance(_, db.model.getEntity(_, "user"), {
							sdataWhere: whereClause
						});
						if (user) {
							var up = db.model.getEntity(_, "userProfile").factory.createInstance(_, null, db);
							up.loadUserProfile(_, user);
							var loc = up.selectedLocale(_);
							if (loc) {
								var code = loc.code(_);
								console.log("Set locale for password page " + code);
								if (code) locale.setCurrent(_, code);
							}
						}
					}
					// make changes in template for password page to enable localization
					var answer = fs.readFile(__dirname + "/../../syracuse-main/html/newPassword.html", "utf8", _);
					answer = changePasswordModule.localizeAnswer(answer, user);
					answer = answer.replace("{login}", user.login(_));
					answer = answer.replace("{realm}", config.session.realm);
					answer = answer.replace("{action}", "/auth/pwd" + token); // re-use token;
					response.writeHead(403, {
						"Content-Type": "text/html; charset=utf8"
					});
					response.end(answer);
					return;
				} else {
					// set new passwordf
					var content = request.readAll(_);
					if (content) {
						var stringContent = content.toString("utf8");
						var query = querystring.parse(stringContent);
						var user;
						if (tmpLogin.user.toLowerCase() === query.login.toLowerCase()) {
							var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
							// fetch user
							var whereClause = "(login eq \"" + query.login + "\")";
							var users = db.fetchInstances(_, db.model.getEntity(_, "user"), {
								sdataWhere: whereClause
							});
							if (users && users.length) {
								// console.log("User found");
								user = users[0];
							}
						}
						if (user) {
							user.password(_, query.passwordHash);
							user.changePassword(_, false);
							user.save(_);
							// console.log("Password changed");
							/*
						var token = changePasswordModule.setTempLogin({
							user: query.login
						});
						// new url: replace or set authentication token in path, when it already starts with /auth/...,
						// otherwise add /auth/std prefix with authentication token
						/*						if (tmpLogin.url.substr(0, 6) === "/auth/") {
							newUrl = tmpLogin.url.replace(/^(\/auth\/(?:std|digest|basic|oauth2-\w*))(?:\-\-[0-9a-fA-F]*)?/, "$1" + token);
						} else {
							newUrl = "/auth/std" + token + tmpLogin.url;
						}*/
							newUrl = "/auth/std" + token + "/syracuse-main/html/main.html?url=%3Frepresentation%3Dhome.%24navigation";
						}
					}
				}
			}
			response.writeHead(303, {
				"Content-Type": "text/html",
				"Location": newUrl
			});
			response.end('<html><a href="/test">Link</a></html>');
			return;
		}

		if (request.url.indexOf("/sage-id/") >= 0) {
			var authTest = sessionManager.ensureSession(_, request, response, {
				authRequired: true,
				forceAuth: false,
				forceAuth2: true,
				authType: "sage-id"
			});
			if (authTest == true) {
				var host = request.headers.host;
				var path = "http://" + host + "/syracuse-main/html/main.html?url=%3Frepresentation%3Dhome.%24navigation";
				response.writeHead(303, {
					"Content-Type": "text/html",
					"Location": path,
				});
				response.end();
			}
			return;
		}

		// strip authentication header
		if (request.url.indexOf("/auth/") >= 0 && url.parse(request.url).pathname.indexOf("/auth/") === 0) {
			request.url = request.url.replace(/\/auth\/[\w-]+/, "");
			if (!request.url || request.url === "/") request.url = '/index.html';
			response.writeHead("301", {
				location: request.url,
			});
			return response.end();
		}

		if (/index3\.html$/.exec(request.url)) {
			var html = fs.readFile(__dirname + "/../../index3.html", "utf8", _);
			response.writeHead("200", {
				"Content-Type": "text/html"
			});
			response.write(_, html);
			return response.end();
		}
	};
};

// This one comes from basic
exports.noAccess = function(_, request, response, status, user, noRedirect) {
	setLocaleFromRequest(request, _);
	var message;
	var httpStatus = status === "noLicense" ? 402 : 403;
	message = locale.formatDISABLED(module, status);
	if (request.headers && request.headers.accept && request.headers.accept.indexOf("application/json") >= 0) {
		// console.log("JSON " + status);
		response.writeHead(200, {
			"Content-Type": "application/json"
		});
		response.end(JSON.stringify({
			$diagnoses: [{
				$message: message,
				$severity: "error",
				$links: {
					continue: {
						$title: locale.formatDISABLED(module, "continue"),
						$type: "html",
						$target: "_self",
						$url: "/index.html"
					}
				}
			}]
		}));
	} else {
		response.writeHead(httpStatus, {
			"Content-Type": "text/html",
			"Content-Tncoding": "utf8"
		});
		response.end(noRedirect ? message : getRedirectPageContent(message, _));
	}

};

// This one comes from sage-id, after successful auth
//exports.verifyUser(request, response, authData, _);
/* TODO: INVESTIGATE THIS
		var pck = helpers.http.parseCookie(request.headers.cookie) || {};
		var port = request.connection.localPort;
		var cookie = pck[_settings.key + "." + port];
		session = export.updateSessionWithID(request, response, _sessions, cookie, authData, _);
		*/


/*
// Verify user authenicated into Sage ID exists in X3 users table in mongoDB
exports.verifyUser = function(request, response, data, _) {
	// Lookup user by email in users table
	var mongoConfig = config.mongo || {};
	var server = new mongodb.Server(mongoConfig.host || 'localhost', mongoConfig.port || 27017, {});
	var db = new mongodb.Db(mongoConfig.database || 'syracuse', server, {
		w: 1 // majority
	});

	// Find specific user based on email
	var filter = {
		email: '' + data.email
	};
	var user = db.open(_).collection('User', _).find(filter, _).toArray(_)[0];
	request.session.data.userID = user._id;
	db.close(_);

	// Finish authentication
	// Save token and user login in session
	request.session && request.session.afterAuthentication({
		user: user.login,
		password: data.accessToken
	});

	return true;
};
*/

// Update session with new sessionId provided by Sage ID
// This is required as when the session is extended it will need to be able to find
// session to update accessToken
exports.updateSessionWithID = function(request, response, _sessions, cookie, data, _) {
	var session = _sessions[cookie];
	delete _sessions[cookie];
	session.id = data.sessionId;
	_sessions[data.sessionId] = session;
	return session;
};

// This was in changePassword
/*
	var isJson = request && request.headers && ((request.headers["accept"] || "").indexOf("application/json") >= 0);
	if (isJson) {
		response.writeHead(200, {
			"Content-Type": "application/json"
		});
		response.end(JSON.stringify({
			$diagnoses: [{
				$message: locale.formatDISABLED(module, "explanation"),
				$severity: "error",
				$links: {
					continue: {
						$title: locale.formatDISABLED(module, "continue"),
						$type: "html",
						$target: "_self",
						$url: "/auth/pwd" + token
					}
				}
			}]
		}));
	} else {
		response.writeHead(303, {
			"Content-Type": "text/html",
			"Location": "/auth/pwd" + token
		});
		response.end('<html><a href="/test">Link</a></html>');
	}
	return false;
	*/

var token = setTempLogin({
	user: user,
	url: request.url
});

//temporary login tokens (which preserve authentication after relocation)
var tempLogins = {};
var TOKEN_VALIDITY = 600000;

// build random hex string of length 6
function makeRString() {
	var n = Math.floor(Math.random() * (1 << 24));
	var st = n.toString(16);
	return st.length === 6 ? st : ("000000" + st).substr(st.length);
}

// add a new authentication token for this user
function setTempLogin(data) {
	var date = _clearLogins();
	var key = "--" + makeRString() + makeRString() + makeRString();
	while (key in tempLogins) {
		var n = Math.floor(Math.random() * (1 << 4));
		key += n.toString(16).substr(0, 1);
	}
	data._date = date;
	tempLogins[key] = data;
	return key;
};

// remove outdated authentication tokens
function _clearLogins() {
	var date = Date.now();
	var dateComp = date - TOKEN_VALIDITY;
	for (var id in tempLogins) {
		if (tempLogins[id]._date < dateComp) {
			delete tempLogins[id];
		}
	}
	return date;
}

// get user name of specified login token. If token is not available, null is returned.
function getTempLogin(key, keep) {
	var value = tempLogins[key];
	_clearLogins();
	if (value) {
		if (!keep) {
			delete tempLogins[key];
		}
		return value;
	}
	return null;
}

exports.getTempLogin = getTempLogin;
exports.setTempLogin = setTempLogin;