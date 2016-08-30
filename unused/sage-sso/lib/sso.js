"use strict";
var Request = require("jack/request").Request;
var Response = require("jack/response").Response;
var utils = require("jack/utils");
var httpClient = require('http-client-engine').connect;
var base64 = require('base64');
var file = require('file');
var helpers = require('syracuse-core').helpers;
var XmlMapper = require('../xml/mapper').XmlMapper;
var globals = require('../globals');
var CryptoHelper = Packages.syracuse.security.CryptoHelper;
var XmlHelper = Packages.syracuse.xml.XmlHelper;

//print("#### LOADING SSO MODULE: " + module.path);

var tokens = globals.make(module, "tokens");

//var lock = new Packages.java.util.concurrent.locks.ReentrantReadWriteLock();

var _sslSocketFactory = null;
var _soapNS = "http://schemas.xmlsoap.org/soap/envelope/";
var _ssoNS = "http://sso.sage.com";
var _ssoHost;
//Any activity within _renewalWindow of the end of the current SSO session 
//will cause the SSO session to be extended via a call to ExtendSession
var _renewalWindow = 10 * 60 * 1000; //10 minutes 
var mapperOptions = {
	defaultNamespace: _ssoNS,
	mappings: {
		$envelope: {
			namespace: _soapNS,
			name: "Envelope"
		},
		$body: {
			namespace: _soapNS,
			name: "Body"
		},
		$fault: {
			namespace: _soapNS,
			name: "Fault"
		},
		$encodingStyle: {
			namespace: _soapNS,
			name: "encodingStyle",
			isAttribute: true
		}
	}
};

function _certificateStore() {
	return file.dirname(module.path) + "/../certificates/syracuse.jks";
}

function _certificateFile() {
	return file.dirname(module.path) + "/../certificates/SSOIdentityRoot.cer";
}

function _bodyText(body) {
	var chunks = [];
	body.forEach(function(chunk) {
		chunks.push(chunk.decodeToString('UTF-8'));
	});
	return chunks.join();

}

function _redirect(url) {
	return {
		status: 302,
		headers: {
			Location: url,
			"Content-Type": 'text/plain; charset="utf-8"'
		},
		body: ['Go to <a href="' + url + '">' + url + "</a>"]
	};
}

function _decodeToken(encoded) {
	var tokXml = base64.decode(encoded);
	//print("token: " + tokXml);
	//file.write("d:\\syracuse\\token.xml", tokXml);
	var doc = XmlHelper.parse(tokXml);

	// TODO: verify signature
	//if (!CryptoHelper.verifySignature(doc, _certificateFile())) 
	//    throw new Error("invalid token signature")

	var decoded = new XmlMapper(mapperOptions).xmlToJs(doc);

	// do not expose any token information outside.
	// So generate a cookie id instead of passing the token id outside.
	return {
		cookieId: helpers.uuid.generate(),
		encoded: encoded,
		login: decoded.Subject.UserPrincipal.Username,
		ssoId: decoded.Subject.UserPrincipal.Id,
		decoded: decoded
	};
}

function _processSsoCallback(request, path) {
	var segs = path.split('/');
	if (segs[2] == 'signout') {
		return _signOut(request);
	} else if (segs[2] != 'continueSignOn') throw new Error("bad sso callback: " + path);
	var params = helpers.url.parseQueryString(request.queryString());
	if (params.success != "true") {
		return {
			status: 200,
			headers: {
				"Content-Type": 'text/plain; charset="utf-8"'
			},
			body: ["Access denied"]
		};
	}

	var id = params["id"];
	var from = params["from"];

	var result = _callSso("EndSignOnAttempt", {
		ResultId: id
	});
	var tok64 = result.SuccessResult && result.SuccessResult.UserAuthenticationToken;
	if (!tok64) throw new Error("UserAuthenticationToken missing");
	var token = _decodeToken(tok64);
	token.expire = helpers.date.parseISODateAsUTC(result.SuccessResult.SessionExpiry);
	//token.expire=new Date().valueOf()+_renewalWindow+10000;

	token.sessionSSOId = result.SuccessResult.SessionId;
	tokens.writing(function(tokens) {
		tokens["" + token.cookieId] = token;
	});

	var response = new Response(_redirect(from));
	// TODO: be smarter about cookie expiration
	//print("SETTING SSO COOKIE: " + token.cookieId);
	_setSsoTokenCookie(response, request, token.cookieId);
	return response;
}

function _callSso(op, message) {
	if (!_sslSocketFactory) {
		//print("STORE" + _certificateStore())
		_sslSocketFactory = CryptoHelper.getSSLSocketFactory(_certificateStore(), "syracuse");
	}
	var body = {
		$envelope: {
			$encodingStyle: "http://schemas.xmlsoap.org/soap/encoding/",
			$body: {}
		}

	};
	body.$envelope.$body[op] = {
		request: message
	};

	body = "" + new XmlMapper(mapperOptions).format(body, {
		indent: true
	});

	var ssoReq = {
		method: "POST",
		url: "https://" + _ssoHost + "/SSO/WebSSOService",
		headers: {
			"Content-Length": body.length,
			"Content-Type": 'text/xml; charset="utf-8"',
			Accept: "text/xml",
			SOAPAction: '"http://sso.sage.com/IWebSSOServiceSoap/' + op + '"'
		},
		body: [body]
	};
	//print("SSO send: " + JSON.stringify(ssoReq));
	ssoReq.sslSocketFactory = _sslSocketFactory;
	var ssoResp = httpClient(ssoReq);
	//print("SSO receive: " + JSON.stringify(ssoResp));

	if (ssoResp.status != 200) throw new Error("invalid SSO response: " + JSON.stringify(ssoResp));

	var xml = _bodyText(ssoResp.body);
	//print("Response XML: " + xml);
	var envelope = new XmlMapper(mapperOptions).parse(xml);
	//print("Response JSON: " + JSON.stringify(envelope));
	var result = envelope && envelope.$body && envelope.$body[op + 'Response'];
	result = result && result[op + 'Result'];
	if (!result) throw new Error("invalid SSO response: " + JSON.stringify(envelope));
	return result;
}

function _signOut(request) {
	var tokenId = request.cookies()['ssoToken'];
	var token = null;
	if (tokenId) {
		token = tokens.reading(function(tokens) {
			return tokens["" + tokenId];
		});
		if (token) {
			//print("call SessionSignOff("+token.sessionSSOId+")")
			try {
				var result = _callSso("SessionSignOff", {
					SessionId: token.sessionSSOId
				});
			} catch (e) {
				helpers.log.exception(module, e);
			}
			tokens.writing(function(tokens) {
				tokens["" + token.cookieId] = null;
			});
		}
	}
	var referer = request.referer();
	if (!referer) {
		var params = helpers.url.parseQueryString(request.queryString());
		if (params) referer = params['from'];
	}
	if (referer) {
		var response = new Response(_redirect(referer));
		_setSsoTokenCookie(response, request, '');
		return response;
	} else {
		return {
			status: 200,
			headers: {
				"Content-Type": 'text/plain; charset="utf-8"',
				"Set-Cookie": 'ssoToken=; path=/; expires=' + new Date(),
			},
			body: ["Session expired"]
		};

	}
	return {
		status: 404,
		headers: {},
		body: ["Resource not found"]
	};
}

function _setSsoTokenCookie(response, request, tokenValue) {
	var host = request.host().split(':')[0];
	response.setCookie("ssoToken", {
		domain: host != "localhost" ? host : null,
		path: "/",
		expires: new Date(new Date().getTime() + 3600 * 1000),
		value: tokenValue
	});
}

function _renewalSSOSession(token) {
	var currentDate = new Date();
	var expireDate = token.expire;
	if (token.ssoCall) return token;
	if (((expireDate - _renewalWindow) < currentDate.valueOf())) {
		var currentToken = token;
		token.ssoCall = true;
		//Extend SSO session  via a call to ExtendSession
		try {
			//print("call SessionExtend("+currentToken.sessionSSOId+")")
			var result = _callSso("SessionExtend", {
				SessionId: currentToken.sessionSSOId
			});
			if (result && result.SessionExpiry) {
				// update expire date 
				currentToken.expire = helpers.date.parseISODateAsUTC(result.SessionExpiry);
				//token.expire=new Date().valueOf()+_renewalWindow+10000;
			} else currentToken = null;
		} catch (e) {
			helpers.log.exception(module, e);
			currentToken = null;
		}
		if (!currentToken) {
			tokens.writing(function(tokens) {
				tokens["" + token.cookieId] = null;
			});
			return null;
		}
		token.ssoCall = false;
	}
	return token;
}

exports.app = function(options, nextApp) {
	if (!options || options.disabled) return nextApp;

	_ssoHost = options.host || "sso.sagessdp.com";
	if (options.port) _ssoHost += ":" + options.port;
	else if (!options.host) // nothing specified, used dev server
	_ssoHost += ":42443";
	// else use default HTTPS port (443)
	return function(env) {
		var request = new Request(env);
		var path = decodeURIComponent(request.pathInfo());

		// Intercept /sso URL first because these URL are called
		// in unauthenticated contexts
		if (path.indexOf('/sso/') == 0) {
			return _processSsoCallback(request, path);
		}

		// If we have a token cookie, we are already authenticated      
		var tokenId = request.cookies()['ssoToken'];
		//print("GETTING SSO COOKIE: " + tokenId);

		if (tokenId) {
			var token = tokens.reading(function(tokens) {
				return tokens["" + tokenId];
			});
			if (token) {
				//handle automatic token  renewal	
				token = _renewalSSOSession(token);
				if (token) return nextApp(env);
			}
			//print("TOKEN NOT FOUND !!!!!");
		}

		// Not authenticated, start a sign on attempt.
		var result = _callSso("StartSignOnAttempt", {
			SuccessUri: "http://" + request.host() + "/sso/continueSignOn?success=true&id={0}&from=" + request.pathInfo(),
			FailureUri: "http://" + request.host() + "/sso/continueSignOn?success=false&id={0}&from=" + request.pathInfo(),
			CancelAllowed: true,
			State: "some state"
		});
		if (!result.RedirectUri) throw new Error("RedirectUri missing in SSO response");
		return _redirect(result.RedirectUri);
	};

};