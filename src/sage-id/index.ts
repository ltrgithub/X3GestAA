"use strict";
/// !doc
/// ## Sage ID SSO core API
///
/// `var sageid = require("sage-id");
///
var helpers = require('@sage/syracuse-core').helpers;
var tracer = helpers.debug.tracer("session.trace");
var jsxml = require('js-xml');
var mongodb = require('mongodb');
var replSet = require('mongodb/lib/replset');
var config = require("config");
config.streamline.fast = false;
var notificationList = {};

/// * `sageid.create(options)
/// Create the authentication module with respected options
exports.create = function(options) {
	return new function() {
		/// Run setOptions(options) function to setup post data
		setOptions(options);

		/// * `Please reference the following URL for sample request/response web help
		/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help

		var self = this;

		/// * `authenticate(request, response, session, _)
		/// Initial authentication module that will redirect to Sage ID Sign In page
		/// Returns false as user has not yet been autheticated through Sage ID
		var signOnStart = function(request, response, session, _) {
			/// * `Setup post data for StartSignOnAttempt request to Sage ID
			/// See web help for StartSignOnAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebStartSignOnAttempt
			var opt = options.signOn;
			var postData = "<StartSignOnAttemptRequest>" + //
				"<SuccessUri xmlns=\"http://sso.sage.com\">" + opt.successUri + "</SuccessUri>" + //
				"<FailureUri xmlns=\"http://sso.sage.com\">" + opt.failureUri + "</FailureUri>" + //
				"<CancelAllowed xmlns=\"http://sso.sage.com\">" + opt.cancelAllowed + "</CancelAllowed>" + //
				"<State xmlns=\"http://sso.sage.com\">" + opt.state + "</State>" + //
				"<SessionLengthMinutes xmlns=\"http://sso.sage.com\">" + opt.sessionLengthMinutes + "</SessionLengthMinutes>" + //
				"</StartSignOnAttemptRequest>";

			// Initialize start sign on options
			var json = client(_, options, 'StartSignOnAttempt', postData);

			// Parse out signOnAttemptId and redirectURI for later use
			var signOnAttemptId = json.StartSignOnAttemptResponse.SignOnAttemptId.$value;
			var redirectUri = json.StartSignOnAttemptResponse.RedirectUri.$value;

			// Store response in session for future use.
			session.StartSignOnAttemptResponse = json.StartSignOnAttemptResponse;

			// Redirect web page to redirectURI from Sage ID response
			response.writeHead(307, {
				"Content-Type": "text/html",
				"Location": redirectUri,
			});
			response.end('<html>Use <a href="' + redirectUri + '">Login</a> if redirect does not work automatically</html>');

			// Return false since user has not been authenticated into Sage ID
			return false;
		};

		/// * `signOnSuccess(request, response, session, _)
		/// Closes authentication attempt for Sage ID sign in
		/// Returns JSON data containing email, sessionId, accessToken and identityId from Sage ID
		var signOnSuccess = function(request, response, session, _) {
			var match = request.url.substring(options.prefix.length).split(/[\/\?]/);
			// resultId is necessary for completing sign on attempt
			var resultId = match[1];
			// Check presence of session and SignOnAttemptId in session.
			if (!session) throw new Error("no session");
			if (!session.StartSignOnAttemptResponse || !session.StartSignOnAttemptResponse.SignOnAttemptId) throw new Error("invalid SSO info - session missing 'StartSignOnAttemptResponse' Sage ID information - please review current session properties");

			/// * `Setup post data for EndSignOnAttemptRequest request to Sage ID
			/// See web help for EndSignOnAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebEndSignOnAttempt
			var postData = "<EndSignOnAttemptRequest>" + //
				"<ResultId xmlns=\"http://sso.sage.com\">" + resultId + "</ResultId>" + //
				"</EndSignOnAttemptRequest>";

			// Initialize end sign on options
			var json = client(_, options, 'EndSignOnAttempt', postData);

			// Parse out email, displayName, identityId, and accessToken
			var email = json.EndSignOnAttemptResponse.SuccessResult.EmailAddress.toLowerCase();
			var displayName = json.EndSignOnAttemptResponse.SuccessResult.DisplayName;
			var identityId = json.EndSignOnAttemptResponse.SuccessResult.IdentityId;
			var accessToken = json.EndSignOnAttemptResponse.SuccessResult.UserAuthenticationToken;
			var sessionId = json.EndSignOnAttemptResponse.SuccessResult.SessionId;

			// Store response in session, for future use
			session.EndSignOnAttemptResponse = json.EndSignOnAttemptResponse.SuccessResult;

			// Insert record into mongoDB
			if (config.hosting && config.hosting.multiTenant)
				insertSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, sessionId);

			// Create json containing email and unique identityId
			return {
				email: email,
				identityId: identityId,
				accessToken: accessToken,
				auth: true,
				sessionId: sessionId
			};
		};

		/// * `signup(request, response, session, _)
		/// Initial register module that will redirect to Sage ID Sign Up page
		/// Returns false as user has not yet been registered with Sage ID
		var registerStart = function(request, response, session, _) {
			/// * `Setup post data for StartSignOnAttempt request to Sage ID
			/// See web help for StartSignOnAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebStartSignOnAttempt
			var opt = options.register;
			var postData = "<StartNewUserRegistrationAttemptRequest>" + //
				"<SuccessUri xmlns=\"http://sso.sage.com\">" + opt.successUri + "</SuccessUri>" + //
				"<FailureUri xmlns=\"http://sso.sage.com\">" + opt.failureUri + "</FailureUri>" + //
				"<CancelAllowed xmlns=\"http://sso.sage.com\">" + opt.cancelAllowed + "</CancelAllowed>" + //
				"<State xmlns=\"http://sso.sage.com\">" + opt.state + "</State>" + "<SessionLengthMinutes xmlns=\"http://sso.sage.com\">" + opt.sessionLengthMinutes + "</SessionLengthMinutes>" + //
				"<SignOnAfterSuccess xmlns=\"http://sso.sage.com\">" + opt.signOnAfterSuccess + "</SignOnAfterSuccess>" + //
				"<ActivateAfterSuccess xmlns=\"http://sso.sage.com\">" + opt.activateAfterSuccess + "</ActivateAfterSuccess>" + //
				"</StartNewUserRegistrationAttemptRequest>";

			// Initialize start sign on options
			var json = client(_, options, 'StartNewUserRegistrationAttempt', postData);

			// Parse out RegistrationAttemptId and redirectURI for later use
			var regAttemptId = json.StartRegistrationAttemptResponse.RegistrationAttemptId.$value;
			var redirectUri = json.StartRegistrationAttemptResponse.RedirectUri.$value;

			// Store response in session for future use.
			session.StartRegistrationAttemptResponse = json.StartRegistrationAttemptResponse;
			// Redirect web page to redirectURI from Sage ID response
			response.writeHead(307, {
				"Content-Type": "text/html",
				"Location": redirectUri,
			});
			response.end('<html>Use <a href="' + redirectUri + '">Login</a> if redirect does not work automatically</html>');

			// Return false since user has not been authenticated into Sage ID
			return false;
		};

		/// * `registerSuccess(request, response, session, _)
		/// Closes sign up attempt for Sage ID
		/// Returns JSON data containing email, sessionId, accessToken and identityId from Sage ID
		var registerSuccess = function(request, response, session, _) {
			var match = request.url.substring(options.prefix.length).split('/');
			// resultId is necessary for completing sign on attempt
			var resultId = match[1];
			// Check presence of session and SignOnAttemptId in session.
			if (!session) throw new Error("no session");
			if (!session.StartRegistrationAttemptResponse || !session.StartRegistrationAttemptResponse.RegistrationAttemptId) throw new Error("invalid SSO info - session missing 'StartRegistrationAttemptResponse' Sage ID information - please review current session properties");

			/// * `Setup post data for EndRegistrationAttemptRequest request to Sage ID
			/// See web help for EndRegistrationAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebEndNewUserRegistrationAttempt
			var postData = "<EndRegistrationAttemptRequest>" + //
				"<ResultId xmlns=\"http://sso.sage.com\">" + resultId + "</ResultId>" + //
				"</EndRegistrationAttemptRequest>";

			// Initialize end sign up options
			var json = client(_, options, 'EndNewUserRegistrationAttempt', postData);

			// Parse out email, displayName, identityId, and accessToken
			var email = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.EmailAddress.toLowerCase();
			var displayName = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.DisplayName;
			var identityId = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.IdentityId;
			var accessToken = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.UserAuthenticationToken;
			var sessionId = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.SessionId;

			// Store response in session, for future use
			session.EndRegistrationAttemptResponse = json.EndRegistrationAttemptResponse.RegistrationSuccessResult;

			// Insert record into mongoDB
			if (config.hosting && config.hosting.multiTenant)
				insertSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, sessionId);

			// Create json containing email and unique identityId
			return {
				email: email,
				identityId: identityId,
				accessToken: accessToken,
				auth: true,
				sessionId: sessionId
			};
		};

		/// * `logout(request, response, session, _)
		/// Logout module that will remove session
		/// Returns false as user has been removed from session and must re-authenticate
		this.logout = function(request, response, session, _) {
			/// * `Setup post data for WebSessionSignOff request to Sage ID
			/// See web help for WebSessionSignOff
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebSessionSignOff

			// Extract sessionId from session
			var sessionId = "";
			if (session.EndSignOnAttemptResponse)
				sessionId = session.EndSignOnAttemptResponse.SessionId;
			else if (session.EndRegistrationAttemptResponse)
				sessionId = session.EndRegistrationAttemptResponse.SuccessResult.SessionId;
			else throw new Error("Cannot find session ID");

			var postData = "<SessionSignOffRequest>" + //
				"<SessionId xmlns=\"http://sso.sage.com\">" + sessionId + "</SessionId>" + //
				"</SessionSignOffRequest>";

			// Initialize sign out options
			var json = client(_, options, 'SessionSignOff', postData);

			// Parse out signOffAttempt, either true or false
			var signOffAttempt = json.SessionSignOffResponse.Success.$value;

			if (!signOffAttempt) {
				throw new Error("Sage ID Sign Out failed!");
			}

			if (config.hosting && config.hosting.multiTenant)
				deleteSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, sessionId);
			return signOffAttempt;
		};

		/// * `sessionHandle(request, response, session, _)
		/// Determine which method should be used to hanlde current Sage ID session
		var sessionHandle = function(request, response, session, _) {
			// Read request body and decode from Base64 format
			// Data is decoded to XML
			var reqBody = request.readAll(_);
			var buf = new Buffer(reqBody, 'base64');
			var xml = buf.toString();
			// Parse xml data in readable JSON
			var reqJSON = jsxml.parse(xml);
			// Extract notification type from JSON
			// Either ExpiryDue or Ended
			var notificationType = reqJSON.Notification.Type.split('.')[1];
			// Extract parameters where sessionId, expirationTimestamp, and emailAddress are located
			var parameters = reqJSON.Notification.Parameters.Parameter;
			// Extract sessionId from JSON
			var sessionId = parameters[0].Value;
			// Extract expireTime, time and date session will expire
			var expireTime = parameters[2].Value;
			var expireDate = new Date(expireTime);
			if (!sessionId)
				throw new Error("Cannot find session ID");
			// Return authData with sessionId, notificationType, and expiration date of session
			var authData = {
				sessionNotify: true,
				auth: false,
				sessionId: sessionId,
				notificationType: notificationType,
				expireDate: expireDate
			};
			return authData;
		};

		/// * `sessionExtend(request, response, sessionId, _)
		/// Extends Sage ID session
		/// Returns JSON data containing email and new accessToken to replace old one
		this.sessionExtend = function(request, response, session, _) {
			/// * `Setup post data for WebSessionExtend request to Sage ID
			/// See web help for WebSessionExtend
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebSessionExtend

			// Extract last activity date and time from session
			var lastActivity = session.lastAccess;

			// New expiration date is current time plus 30 mins, based on Syracuse timeout
			var newExpirationDate = new Date(new Date(lastActivity).getTime() + 1800000);
			// Extract sessionId from session
			var sessionId = "";
			if (session.EndSignOnAttemptResponse)
				sessionId = session.EndSignOnAttemptResponse.SessionId;
			else
				sessionId = session.EndRegistrationAttemptResponse.SessionId;

			var postData = "<SessionExtendRequest>" + //
				"<SessionId xmlns=\"http://sso.sage.com\">" + sessionId + "</SessionId>" + //
				"<SessionExpiry xmlns=\"http://sso.sage.com\">" + newExpirationDate.toISOString() + "</SessionExpiry>" + //
				"</SessionExtendRequest>";

			// Initialize extend options
			var json = client(_, options, 'SessionExtend', postData);

			// Parse out new accessToken
			var accessToken = json.SessionExtendResponse.UserAuthenticationToken.$value;
			var email = "";
			// Overwrite token in session with new one
			if (session.EndSignOnAttemptResponse) {
				session.EndSignOnAttemptResponse.UserAuthenticationToken = accessToken;
				email = session.EndSignOnAttemptResponse.EmailAddress.toLowerCase();
			} else {
				session.EndRegistrationAttemptResponse.UserAuthenticationToken = accessToken;
				email = session.EndRegistrationAttemptResponse.EmailAddress.toLowerCase();
			}
			// Remove session expiration mark
			session.expireDue = false;
			// Return authData, auth is false as no authentication is required
			return {
				auth: true,
				accessToken: accessToken,
				email: email
			};
		};

		/// * `sessionEnd(request, response, sessionId, _)
		/// Session has ended
		/// Return sessionEnd true to have application handle session
		var sessionEnd = function(request, response, session, _) {
			var authData = {
				auth: false,
				sessionEnded: true
			};
			return authData;
		};

		/// * `registerExistStart(request, response, session, _)
		/// Register existing Sage ID account with Sage ERP X3 application
		var registerExistStart = function(request, response, session, _) {
			/// * `Setup post data for StartExistingUserRegistrationAttempt request to Sage ID
			/// See web help for StartExistingUserRegistrationAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebStartExistingUserRegistrationAttempt
			var opt = options.registerExist;
			var postData = "<StartExistingUserRegistrationAttemptRequest>" + //
				"<SuccessUri xmlns=\"http://sso.sage.com\">" + opt.successUri + "</SuccessUri>" + //
				"<FailureUri xmlns=\"http://sso.sage.com\">" + opt.failureUri + "</FailureUri>" + //
				"<CancelAllowed xmlns=\"http://sso.sage.com\">" + opt.cancelAllowed + "</CancelAllowed>" + //
				"<State xmlns=\"http://sso.sage.com\">" + opt.state + "</State>" + //
				"<SessionLengthMinutes xmlns=\"http://sso.sage.com\">" + opt.sessionLengthMinutes + "</SessionLengthMinutes>" + //
				"</StartExistingUserRegistrationAttemptRequest>";

			// Initialize register exist options
			var json = client(_, options, 'StartExistingUserRegistrationAttempt', postData);

			// Parse out registrationAttemptId and redirectURI for later use
			var registrationAttemptId = json.StartRegistrationAttemptResponse.RegistrationAttemptId.$value;
			var redirectUri = json.StartRegistrationAttemptResponse.RedirectUri.$value;

			// Store response in session for future use.
			session.StartRegistrationAttemptResponse = json.StartRegistrationAttemptResponse;

			// Redirect web page to redirectURI from Sage ID response
			response.writeHead(307, {
				"Content-Type": "text/html",
				"Location": redirectUri,
			});
			response.end('<html>Use <a href="' + redirectUri + '">Login</a> if redirect does not work automatically</html>');

			// Return false since user has not been authenticated into Sage ID
			return false;
		};

		/// * `registerExistSuccess(request, response, session, _)
		/// Closes authentication attempt for Sage ID registration of existing account
		/// Returns JSON data containing email, sessionId, accessToken and identityId from Sage ID
		var registerExistSuccess = function(request, response, session, _) {
			var match = request.url.substring(options.prefix.length).split(/[\/\?]/);
			// resultId is necessary for completing sign on attempt
			var resultId = match[1];
			// Check presence of session and SignOnAttemptId in session.
			if (!session) throw new Error("no session");
			if (!session.StartRegistrationAttemptResponse || !session.StartRegistrationAttemptResponse.RegistrationAttemptId) throw new Error("invalid SSO info - session missing 'StartRegistrationAttemptResponse' Sage ID information - please review current session properties");

			/// * `Setup post data for EndRegistrationAttemptRequest request to Sage ID
			/// See web help for EndRegistrationAttemptRequest
			/// https://services.sso.staging.services.sage.com/sso/webssoservice/web/help/operations/WebEndRegistrationAttemptRequest
			var postData = "<EndRegistrationAttemptRequest>" + //
				"<ResultId xmlns=\"http://sso.sage.com\">" + resultId + "</ResultId>" + //
				"</EndRegistrationAttemptRequest>";

			// Initialize end register exist options
			var json = client(_, options, 'EndExistingUserRegistrationAttempt', postData);

			// Parse out email, displayName, identityId, and accessToken
			var email = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.EmailAddress.toLowerCase();
			var displayName = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.DisplayName;
			var identityId = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.IdentityId;
			var accessToken = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.UserAuthenticationToken;
			var sessionId = json.EndRegistrationAttemptResponse.RegistrationSuccessResult.SuccessResult.SessionId;

			// Store response in session, for future use
			session.EndRegistrationAttemptResponse = json.EndRegistrationAttemptResponse.RegistrationSuccessResult;

			// Insert record into mongoDB
			if (config.hosting && config.hosting.multiTenant)
				insertSessionNotification(_, request.headers['x-forwarded-host'] || request.headers.host, sessionId);

			// Create json containing email and unique identityId
			return {
				email: email,
				identityId: identityId,
				accessToken: accessToken,
				auth: true,
				sessionId: sessionId
			};
		};

		// URL routes
		// Start URLs cause a redirect and return false.
		// The other URLs return an authData object.
		// The auth property of the authData object indicates if user is still authenticated
		var routes = {
			// Redirect to begin Sage ID Sign In
			signOnStart: signOnStart,
			// Redirect for successful Sage ID Sign In
			signOnSuccess: signOnSuccess,
			// Redirect to begin Sage ID Sign Up
			registerStart: registerStart,
			// Redirect for successful Sage ID Sign Up
			registerSuccess: registerSuccess,
			// Redirect for notification handling of Sage ID
			notifyRouted: sessionHandle,
			// Redirect to begin Sage ID Register existing account
			registerExistStart: registerExistStart,
			// Redirect for successful Sage ID Register existing account
			registerExistSuccess: registerExistSuccess,
		};

		/// * `dispatch(request, response, session, _)
		/// Dispatcher module that will redirect to correct method based on URL
		/// Returns respected method
		this.dispatch = function(request, response, session, _) {
			tracer && tracer("Sage ID: begin dispatch url=" + request.url);
			var seg = request.url.substring(options.prefix.length).split(/[\/\?]/)[0];
			var route = routes[seg];
			if (!route)
				throw new Error("bad url: " + request.url);
			var result = route(request, response, session, _);
			tracer && tracer("Sage ID: end dispatch result=" + result);
			return result;
		};
	};
};

/// * `setOptions(options)
/// Setup all postData variables
/// If variable was not passed, it gets defaulted
function setOptions(options) {
	// Setup SageID base URL
	if (!options.baseUrl) throw new Error("baseUrl option missing");
	if (!options.callbackBase) throw new Error("callbackBase option missing");
	if (!/\/$/.test(options.callbackBase)) throw new Error("callbackBase does not end with /");
	options.prefix = require('url').parse(options.callbackBase).pathname;

	// Setup start sign on variables signOn
	var opt;
	opt = (options.signOn = options.signOn || {});
	opt.successUri = options.callbackBase + "signOnSuccess/{0}";
	opt.failureUri = opt.failureUri || options.failureUri;
	opt.cancelAllowed = opt.cancelAllowed || options.cancelAllowed || false;
	opt.state = opt.state || options.state || "test";
	opt.sessionLengthMinutes = opt.sessionLengthMinutes || options.sessionLengthMinutes || 60;

	// Setup start sign up variables register
	opt = (options.register = options.register || {});
	opt.successUri = options.callbackBase + "registerSuccess/{0}";
	opt.failureUri = opt.failureUri || options.failureUri;
	opt.cancelAllowed = opt.cancelAllowed || options.cancelAllowed || false;
	opt.state = opt.state || options.state || "test";
	opt.sessionLengthMinutes = opt.sessionLengthMinutes || options.sessionLengthMinutes || 60;
	opt.signOnAfterSuccess = opt.signOnAfterSuccess || options.signOnAfterSuccess || false;
	opt.activateAfterSuccess = opt.activateAfterSuccess || options.activateAfterSuccess || false;

	// Setup start sign up variables register existing account
	opt = (options.registerExist = options.registerExist || {});
	opt.successUri = options.callbackBase + "registerExistSuccess/{0}";
	opt.failureUri = opt.failureUri || options.failureUri;
	opt.cancelAllowed = opt.cancelAllowed || options.cancelAllowed || false;
	opt.state = opt.state || options.state || "test";
	opt.sessionLengthMinutes = opt.sessionLengthMinutes || options.sessionLengthMinutes || 60;
}

function client(_, options, action, postData) {

	var clientOptions = {
		method: "POST",
		url: options.baseUrl + "/WebSSOService/web/Web" + action,
		pfx: options.pfx,
		cert: options.cert,
		key: options.key,
		passphrase: options.passphrase,
		headers: {
			'Content-Type': 'text/xml',
			'Content-Length': Buffer.byteLength(postData)
		}
	};
	tracer && tracer("Sage ID: begin call url=" + clientOptions.url);

	// Check which request type is being used
	// Either ez-stream http client or syracuse based http client
	var httpClient = options.httpClient || require("ez-streams").devices.http.client;

	// Initialize request out to Sage ID
	var req = options.httpClient ? httpClient(_, clientOptions) : httpClient(clientOptions);

	// Write post data to request
	req.end(new Buffer(postData));
	var resp = req.response(_);
	tracer && tracer("Sage ID: end call status=" + resp.statusCode);

	// Check to ensure response comes back OK
	if (resp.statusCode !== 200) throw new Error("bad response from " + action + ": " + resp.statusCode + ", URL " + clientOptions.url);

	// Read all data from Sage ID response
	var body = resp.readAll(_);

	// Convert xml response to JSON
	var json = {};
	try {
		json = jsxml.parse(body);
	} catch (ex) {}

	return json;
}

function insertSessionNotification(_, host, sessionId) {
	var mongoConfig = config.mongoNotify || {};
	var db = initializeMongoDB(mongoConfig.host, mongoConfig.port, mongoConfig.database);
	db.open(_).collection(mongoConfig.sageIdCollection, _).update({
		_id: sessionId
	}, {
		$push: {
			hosts: host
		}
	}, {
		upsert: true
	}, _);
	db.close(_);
}

exports.deleteSessionNotification = deleteSessionNotification;

function deleteSessionNotification(_, host, sessionId) {
	var mongoConfig = config.mongoNotify || {};
	var db = initializeMongoDB(mongoConfig.host, mongoConfig.port, mongoConfig.database);
	// Find notification object by sessionId
	var doc = db.open(_).collection(mongoConfig.sageIdCollection, _).find({
		_id: sessionId
	}, _).toArray(_)[0];
	db.close();
	// If doc has only 1 host remove record, else only remove that host object
	if (doc.hosts.length === 1)
		db.open(_).collection(mongoConfig.sageIdCollection, _).remove({
			_id: sessionId
		}, null, _);
	else {
		// Delete respected host object
		var index = doc.hosts.indexOf(host);
		doc.hosts.splice(index, 1);
		// Update doc after removing host value
		db.open(_).collection(mongoConfig.sageIdCollection, _).update({
			_id: sessionId
		}, {
			$set: {
				hosts: doc.hosts
			}
		}, _);
	}
	db.close(_);
}

function initializeMongoDB(mongoHost, mongoPort, mongoDatabase) {
	var hostArray = mongoHost.split(",");
	var opt = (config.mongodb || {}).options || {
		db: {
			w: 1
		}
	};
	if (hostArray.length > 1) {
		var servers = [];
		for (var i = 0; i < hostArray.length; i++) {
			servers[i] = new mongodb.Server(hostArray[i] || 'localhost', mongoPort || 27017, opt.server);
		}
		var replSet = replSet.ReplSet(servers, opt.replSet);
		var db = new mongodb.Db(mongoDatabase || 'syracuse', replSet, opt.db);
	} else {
		var server = new mongodb.Server(mongoHost || 'localhost', mongoPort || 27017, opt.server);
		var db = new mongodb.Db(mongoDatabase || 'syracuse', server, opt.db);
	}
	return db;
}