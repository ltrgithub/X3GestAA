'use strict';
import { assert } from 'chai';
Object.keys(assert).forEach(key => { if (key !== 'isNaN') global[key] = assert[key]; });

describe(module.id, () => {
var config = require('config'); // must be first syracuse require
// skip the test if not enabled by config
if (!config.sage_id) {
	it('TESTS SKIPPED: module is not enabled in nodelocal.js', function() { ok(true, "dummy test"); });
} else {
var mongodb = require('mongodb');
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var ez = require("ez-streams");
var sageidauth = require('../../../src/auth/sage-id');

var path = require('path');
var fs = require('fs');
var jsxml = require('js-xml');

var tracer; // = console.error;

var testConfig = config.unit_test || {};
testConfig.port = testConfig.port || 3004;
testConfig.mockPort = testConfig.mockPort || 3005;

// force basic auth
config.session = config.session || {};
config.session.auth = "basic";
// no integration server
config.integrationServer = null;

testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var testData = require('syracuse-sdata/test/fixtures/testDB');
var testEndPoint = testData.endpoint;
testEndPoint.datasets = {
	test: {
		driver: "mongodb",
		database: "test",
		hostname: "localhost",
		port: 27017
	}
};
config.sdata.endpoints.push(testEndPoint);

var baseUrl = 'http://localhost:' + testConfig.port;
var mockUrl = 'http://localhost:' + testConfig.mockPort;

var sageid = require('sage-id/lib/index').create({
	httpClient: require('../../../src/http-client/httpClient').httpRequest,
	baseUrl: mockUrl + '/SSO',
	pfx: new Buffer(0),
	passphrase: "",
	callbackBase: baseUrl + '/auth/sage-id/',
	failureUri: baseUrl + '/auth/sage-id/failure',
	cancelAllowed: true,
	sessionLengthMinutes: 10,
	signOnAfterSuccess: true,
	activateAfterSuccess: true,
});

// Start syracuse server
it('initialize syracuse test server', function(_) {
	require('syracuse-main/lib/syracuse').startServers(_, testConfig.port);
	startMock(_);
	ok(true, 'server initialized');
});

it('init database', function(_) {
	var server = new mongodb.Server(testEndPoint.datasets.test.hostname, testEndPoint.datasets.test.port, {});
	var db = testAdmin.newMongoDb(testEndPoint.datasets.test.database, server, {});
	db = db.open(_);
	db.dropDatabase(_);
	tracer && tracer("dropping admin db");
	server = new mongodb.Server(testEndPoint.datasets.test.hostname, testEndPoint.datasets.test.port, {});
	db = testAdmin.newMongoDb("mongodb_admin_test", server, {});
	db = db.open(_);
	db.dropDatabase(_);
	ok(true, "mongodb initialized");

});

var req = {};
var resp = {
	writeHead: function writeHead(statusCode, options) {
		//tracer && tracer("writeHead function called with statusCode: " + statusCode + " and options: " + options.toString());
	},
	end: function end(html) {
		//tracer && tracer("end function called with following data: " + html);
	}
};
var Session = require('../../../../src/session/session').Session;
var session = new Session(req, 100, null);

// Open sign up attempt
// Verify sign up attempt data is stored in session
it('sign up', function(_) {
	req = {
		url: '/auth/sage-id/registerStart',
        headers: {
            host: "local"
        }
	};
	sageid.dispatch(req, resp, session, _);
	// Check session contains StartRegistrationAttemptResponse
	ok(session.StartRegistrationAttemptResponse, 'successful call to sign up attempt');
});

// Close sign up attempt
// Verify user data is stored in session
it('close sign up', function(_) {
	req = {
		url: '/auth/sage-id/registerSuccess/1234',
        headers: {
            host: "local"
        }
	};
	sageid.dispatch(req, resp, session, _);
	// Check session contains EndRegistrationAttemptResponse
	ok(session.EndRegistrationAttemptResponse, 'successful close to sign up attempt');
});

// Open sign on attempt
// Verify sign on attempt data is stored in session
it('authenticate', function(_) {
	req = {
		url: '/auth/sage-id/signOnStart',
        headers: {
            host: "local"
        }
	};
	sageid.dispatch(req, resp, session, _);
	// Check session contains StartSignOnAttemptResponse
	ok(session.StartSignOnAttemptResponse, 'successful call to sign on attempt');
});

// Close sign on attempt
// Verify user data is stored in session
it('close authenticate', function(_) {
	req = {
		url: '/auth/sage-id/signOnSuccess/1234',
        headers: {
            host: "local"
        }
	};
	sageid.dispatch(req, resp, session, _);
	// Check session contains EndSignOnAttemptResponse
	ok(session.EndSignOnAttemptResponse, 'successful close to sign on attempt');
});

// Extend session
// Verify accessToken is different after extension
it('extend session', function(_) {
	var oldAccessToken = session.EndSignOnAttemptResponse.UserAuthenticationToken;
	var body = new Buffer('<?xml version="1.0" encoding="utf-8"?>' + //
	'<Notification xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://sso.sage.com">' + //
	'  <NotiicationId>6789</NotiicationId>' + //
	'  <Type>Session.ExpiryDue</Type>' + //
	'  <Parameters>' + //
	'    <Parameter><Value>100</Value></Parameter>' + // session id
	'    <Parameter><Value></Value></Parameter>' + //
	'    <Parameter><Value>' + (new Date()).toISOString() + '</Value></Parameter>' + //
	'  </Parameters>' + //
	'</Notification>').toString('base64');
	req = {
		readAll: function(_) {
			return body;
		},
		url: '/auth/sage-id/notifyRouted',
        headers: {
            host: "local"
        }
	};
	session.lastActivity = new Date(new Date(session.EndSignOnAttemptResponse.SessionExpiry).getTime() + 5000);
	var authData = sageid.dispatch(req, resp, session, _);
	if (authData.sessionNotify) {
		if (sageidauth.extendSession(req, resp, session, authData, _))
			sageid.sessionExtend(req, resp, session, _);
	}
	ok(oldAccessToken != session.EndSignOnAttemptResponse.UserAuthenticationToken, 'successful extension of session');
});

// Logout of session
// Verify logout was successful
it('logout', function(_) {
	var status = sageid.logout(req, resp, session, _);
	ok(status, 'successful logout attempt');
});
}
// Simple function to compare returned object vs initialized variable
function compare(got, expected, path) {
	path = path || '';
	if (expected && typeof expected === 'object' && got && typeof got === 'object') {
		Object.keys(expected).forEach(function(key) {
			compare(got[key], expected[key], path + '/' + key);
		});
	} else {
		strictEqual(got, expected, 'comparing ' + path);
	}
}

var routes = {
	WebStartNewUserRegistrationAttempt: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<StartRegistrationAttemptResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<RegistrationAttemptId xmlns="http://sso.sage.com">554dc646-1f5e-435b-bac1-35d83ab93573</RegistrationAttemptId>' + //
	'<RedirectUri xmlns="http://sso.sage.com">https://signon2.sso.staging.services.sage.com/register/554dc646-1f5e-435b-bac1-35d83ab93573?f=X%2fs2tPLaKcPJl8leak%2baAvgQ3KfGu8JnFFFqAKSCozy8oafD7hYWFjlDr3um85mRUMYkbfwf2AupDP1epGeqg1hpG8pbagziwPF9sttZzOUa88r%2fxFc2aYL1fl%2bxCkQ5</RedirectUri>' + //
	'</StartRegistrationAttemptResponse>',
	WebEndNewUserRegistrationAttempt: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<EndRegistrationAttemptResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<RegistrationAttemptId xmlns="http://sso.sage.com">554dc646-1f5e-435b-bac1-35d83ab93573</RegistrationAttemptId>' + //
	'<RegistrationSuccessResult xmlns="http://sso.sage.com">' + //
	'<IdentityId>2822a726-2937-4023-bbbd-c8e64ed66be3</IdentityId>' + //
	'<EmailAddress>hi@gmail.com</EmailAddress>' + //
	'<Name>hey</Name>' + //
	'<UserSignedOn>true</UserSignedOn>' + //
	'<SuccessResult>' + //
	'<UserAuthenticationToken>THISISTHETOKEN</UserAuthenticationToken>' + //
	'<SessionId>fa5695f8-759a-4c68-b0ad-87f66cc11772</SessionId>' + //
	'<SessionExpiry>2014-08-04T21:03:54.1424578Z</SessionExpiry>' + //
	'<EmailAddress>hi@gmail.com</EmailAddress>' + //
	'<DisplayName>hey</DisplayName>' + //
	'<IdentityId>2822a726-2937-4023-bbbd-c8e64ed66be3</IdentityId>' + //
	'</SuccessResult>' + //
	'</RegistrationSuccessResult>' + //
	'<State xmlns="http://sso.sage.com">test</State>' + //
	'<Culture xmlns="http://sso.sage.com">en-US</Culture>' + //
	'</EndRegistrationAttemptResponse>',
	WebStartSignOnAttempt: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<StartSignOnAttemptResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<SignOnAttemptId xmlns="http://sso.sage.com">2bf6dd1f-f220-4e0c-b7c1-94ffd8981a27</SignOnAttemptId>' + //
	'<RedirectUri xmlns="http://sso.sage.com">https://signon2.sso.staging.services.sage.com/signon/2bf6dd1f-f220-4e0c-b7c1-94ffd8981a27?f=kjLF8zWoP8yFudrbdbKw0nyCM5nWKlIhftaIMH2X1I5mfhO42OEsYypWyhl4w463iWEw3SBGtYH13OLAPAssph2fyBxxFLpZMld9MPnn8kHLvu3VR%2f2GDN5kBq2lezmx</RedirectUri>' + //
	'</StartSignOnAttemptResponse>',
	WebEndSignOnAttempt: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<EndSignOnAttemptResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<SignOnAttemptId xmlns="http://sso.sage.com">2bf6dd1f-f220-4e0c-b7c1-94ffd8981a27</SignOnAttemptId>' + //
	'<SuccessResult xmlns="http://sso.sage.com">' + //
	'<UserAuthenticationToken>HereIsTheToken</UserAuthenticationToken>' + //
	'<SessionId>100</SessionId>' + //
	'<SessionExpiry>2014-08-04T17:26:44.785806Z</SessionExpiry>' + //
	'<EmailAddress>giancarlo.paredes@sage.com</EmailAddress>' + //
	'<DisplayName>Giancarlo Paredes</DisplayName>' + //
	'<IdentityId>6416004b-2b20-4722-9954-466b1e44e581</IdentityId>' + //
	'</SuccessResult>' + //
	'<State xmlns="http://sso.sage.com">test</State>' + //
	'<Culture xmlns="http://sso.sage.com">en-US</Culture>' + //
	'</EndSignOnAttemptResponse>',
	WebSessionExtend: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<SessionExtendResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<UserAuthenticationToken xmlns="http://sso.sage.com">THISISTHENEWTOKEN</UserAuthenticationToken>' + //
	'<SessionExpiry xmlns="http://sso.sage.com">2014-08-04T19:01:21Z</SessionExpiry>' + //
	'<ExpiryDue xmlns="http://sso.sage.com">false</ExpiryDue>' + //
	'</SessionExtendResponse>',
	WebSessionSignOff: '<?xml version="1.0" encoding="utf-8"?>' + //
	'<SessionSignOffResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + //
	'<Success xmlns="http://sso.sage.com">true</Success>' + //
	'</SessionSignOffResponse>',
};

function startMock(_) {
	ez.devices.http.server(function(request, response, _) {
		var xml = routes[request.url.split('/')[4]];

		if (!xml) {
			response.writeHead(404, {});
			return response.end('Invalid route: ' + request.url);
		}

		response.writeHead(200, {
			"Content-Type": "text/html",
			"Content-Length": xml.length
		});
		response.end(xml);

	}, {}).listen(_, testConfig.mockPort);
	tracer && tracer("Mock Server running at " + mockUrl);
}
});