"use strict";

var locale = require('streamline-locale');
var corehelpers = require('@sage/syracuse-core').helpers;
var config = require("config");
var globals = require('streamline-runtime').globals;
var tracer = require('@sage/syracuse-core').getTracer('login.saml2');
var url = require("url");
var querystring = require("querystring");
var checkUser = require('../../src/auth/checkUser');
var authHelper = require('../../src/auth/helpers');
var adminHelpers = require('../../src/collaboration/helpers');
var httpClient = require('../../src/http-client/httpClient');
var datetime = require('@sage/syracuse-core').types.datetime;
var jsxml = require('js-xml');
var zlib = require('zlib');
var oids = require('jsx509/lib/oids');
var util = require('util');
var mock = require('../../src/load/mock');
var sessionManager = require('../..//src/session/sessionManager').sessionManager;
var traceHelper = require('syracuse-trace/lib/helper');
var certtools;

var syracuse;

function getAlgorithm(algorithm0) {
	switch (algorithm0) {
		case "RSA-SHA256":
			return "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
			break;
		case "RSA-SHA1":
			return "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
			break;
		default:
			throw authHelper.error(404, locale.format(module, "unsupportedAlgorithm", algorithm0));
	}

}


function signXML(_, xml, data, path) {
	var signedInfo;
	var algorithm0 = data.signatureAlgorithm || "RSA-SHA256";
	var algorithm = getAlgorithm(algorithm0);
	var DUMMYSIGNATURE = "ABCDEFGHABCDEFGH";
	// in order to use the standard (asynchronous) signing function of Syracuse, the normal function of xml-crypto will only return a dummy
	// signature, and it will be replaced with the real signature later on
	var signFunction = function() {
		this.getSignature = function(signedInfo0, signingKey) {
			signedInfo = signedInfo0;
			// since this call must be synchronous, return a dummy signature first and compute the real signature later
			return DUMMYSIGNATURE;
		};
		this.getAlgorithmName = function() {
			return algorithm;
		};
	};

	var SignedXml = require('xml-crypto').SignedXml;
	// save normal signature algorithm
	var old = SignedXml.SignatureAlgorithms[algorithm];
	try {
		SignedXml.SignatureAlgorithms[algorithm] = signFunction;
		var sig = new SignedXml();
		sig.signatureAlgorithm = algorithm;
		sig.addReference(path);
		sig.computeSignature(xml);
		xml = sig.getSignedXml();
	} finally {
		SignedXml.SignatureAlgorithms[algorithm] = old;
	}
	certtools = certtools || require('../../src/load/certTools');
	var digest = certtools.sign(_, data.certificate.name(_), algorithm0, signedInfo, {
		output_encoding: 'base64'
	}, globals.context.tenantId);
	// replace dummy signature with real signature
	xml = xml.replace("<SignatureValue>" + DUMMYSIGNATURE + "</SignatureValue>", "<SignatureValue>" + digest + "</SignatureValue>");
	tracer.info && tracer.info("Signed request " + xml);
	return xml;
}



function create(data, request, saml2) {
	return new function() {
		var self = this;

		function generateAuthnRequest(_, sign) {
			var now = datetime.now(true);
			var id = "_" + corehelpers.uuid.generate("");
			var authnReq = {
				"samlp:AuthnRequest": {
					"$": {
						"xmlns": "urn:oasis:names:tc:SAML:2.0:metadata",
						"ID": id, // will be sent back by the SAML2 server - at the moment a fixed value
						"Version": "2.0",
						"IssueInstant": now,
						"xmlns:samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
						"xmlns:saml": "urn:oasis:names:tc:SAML:2.0:assertion",
						"ProviderName": "Syracuse", // optional, will be ignored
						"ForceAuthn": (data.forceAuthn ? "true" : "false"),
						"Destination": data.authorizeURL,
						"ProtocolBinding": "urn:oasis:names:tc:SAML:2.0:bindings:" + (data.protocolBinding || "HTTP-POST")
					},
					"saml:Issuer": {
						"$value": data.issuer // issuer is requested by the SAML2 server configuration
							// see configuration file metadata/saml20-sp-remote.php
					},
					"samlp:NameIDPolicy": {
						"$": {
							//	"Format": "urn:oasis:names:tc:SAML:2.0:nameid-format:unspecified",
							"Format": "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
							// "SPNameQualifier": "Sage_Syracuse_"+data.name,
							"AllowCreate": "true",
						}
					},

				}
			};
			authnReq = jsxml.stringify(authnReq);
			tracer.info && tracer.info("Authorization request " + authnReq);
			// console.log("Authnreq " + authnReq);
			return authnReq;
		}

		// These methods need to be modified to work with SAML2 Id provider
		this.loginStart = function(_, request, response, session) {
			var authnReq = generateAuthnRequest(_);
			redirectResponse(_, response, data.authorizeURL, data, "SAMLRequest", authnReq);
			return false;
		};

		function postResponse(_, response, url, data, title, rootElement, xml, relayState) {
			if (data.certificate) {
				xml = signXML(_, xml, data, "//*[local-name(.)='" + rootElement + "']");
			}
			tracer.debug && tracer.debug("Signed response " + xml);
			var text = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"	"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">' +
				'<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><body onload="document.forms[0].submit()"><noscript><p><strong>Note:</strong> Since your browser does not support JavaScript, you must press the Continue button once to proceed.</p></noscript>' +
				'<form action="' + url + '"	method="post"><div>';
			if (relayState) {
				text += '<input type="hidden" name="RelayState"	value="' + relayState + '"/>';
			}
			var compressed = zlib.deflateRaw(xml, _);
			compressed = new Buffer(compressed).toString('base64');
			text += '<input type="hidden" name="' + title + '" value="' + compressed + '"/></div><noscript><div><input type="submit" value="Continue"/></div></noscript></form></body></html>';
			tracer.debug && tracer.debug("Formdata " + text);
			var buf = new Buffer(text);
			response.writeHead(200, {
				"content-type": "text/html",
				"charset": "iso-8859-1",
				"content-length": buf.length
			});
			response.end(buf);



		}

		function redirectResponse(_, response, url, data, title, xml, relayState) {
			// Use deflateRaw so that there aren't any headers
			var compressed = zlib.deflateRaw(xml, _);
			compressed = new Buffer(compressed).toString('base64');
			var params = title + "=" + encodeURIComponent(compressed);
			if (relayState) params += "&RelayState=" + encodeURIComponent(relayState);
			if (data.certificate) {
				var algorithm0 = data.signatureAlgorithm || "RSA-SHA256";
				var algorithm = getAlgorithm(algorithm0);
				params += "&SigAlg=" + encodeURIComponent(algorithm);
				tracer.debug && tracer.debug("Text for signature for HTTP redirect: " + params);
				certtools = certtools || require('../../src/load/certTools');
				var digest = certtools.sign(_, data.certificate.name(_), algorithm0, new Buffer(params), {
					output_encoding: 'base64'
				}, globals.context.tenantId);
				params += "&Signature=" + encodeURIComponent(digest);
			}
			var redirectUrl = url + '?' + params;
			tracer.debug && tracer.debug("Complete redirect url " + redirectUrl);
			response.writeHead(303, {
				"content-type": "text/html",
				location: redirectUrl
			});
			response.end('<html>Use <a href="' + redirectUrl + '">Login</a> if redirect does not work automatically</html>');

		}

		function getLogin(samlAssertion, attribute) {

			if (samlAssertion) {
				// Find an attribute with an email address
				var samlAttributes = samlAssertion["urn:oasis:names:tc:SAML:2.0:assertion|AttributeStatement"]["urn:oasis:names:tc:SAML:2.0:assertion|Attribute"];
				if (!samlAttributes) throw new Error("No attributes in assertion");
				if (!Array.isArray(samlAttributes)) samlAttributes = [samlAttributes];
				var i = samlAttributes.length;
				while (--i >= 0) {
					var attr = samlAttributes[i].$.Name;
					tracer.debug && tracer.debug("Attribute from response " + attr);
					if (attr !== attribute) {
						// maybe attribute is a OID
						var r = /^(?:urn\:oid\:)?(\d(?:\.\d+)+)/.exec(attr);
						if (r) {
							if (r[1] !== attribute) {
								tracer.debug && tracer.debug("OID Attribute " + r[1]);
								var name = oids.names[r[1]];
								tracer.debug && tracer.debug("corresponding name " + name);
								if (!name) continue;
								if (name !== attribute) {
									name = name.substr(name.indexOf('.') + 1);
									tracer.debug && tracer.debug("corresponding name without prefix " + name);
									if (name !== attribute) continue;
								}
							}
						} else continue;
					}
					// attribute found
					tracer.debug && tracer.debug("Found attribute" + util.format(samlAttributes[i]));
					var attval = samlAttributes[i]['urn:oasis:names:tc:SAML:2.0:assertion|AttributeValue'];
					return attval.$value || attval;
				}
				throw authHelper.error(404, locale.format(module, "notFound", attribute, samlAttributes.map(function(attr) {
					return attr.$.Name;
				}).join(", ")));
			}
			throw authHelper.error(404, locale.format(module, "noAssertion"));

		};


		this.metadata = function(_, request, response) {
				var meta = new Buffer(saml2.getMetadata(_));
				response.writeHead(200, {
					"content-type": "text/xml",
					"content-encoding": "utf8",
					"content-length": meta.length
				});
				response.end(meta);
			},

			/// Authentication callback with SAML2 Assertion
			this.loginCallback = function(_, request, response) {
				tracer.info && tracer.info("SAML2 Login Callback " + request.url);
				// console.log("SAML2 Login Callback " + request.url);
				// Find the SAML response POSTed as form data
				// The slice removes the "SAMLResponse=" from the start of the string
				var relayState; // for SimpleSAML
				var samlRaw = request.readAll(_);
				samlRaw = samlRaw ? samlRaw.toString() : "";
				var samlDecoded;
				var checked = false;
				tracer.debug && tracer.debug("Incoming " + samlRaw + " " + request.method);
				var content;
				if (samlRaw) {
					content = querystring.parse(samlRaw);
				} else {
					var parsed = url.parse(request.url, true);
					content = parsed.query;
				}
				if (content.SAMLRequest || content.SAMLResponse) {
					samlDecoded = new Buffer(content.SAMLRequest || content.SAMLResponse, 'base64');
					if (!samlRaw) {
						samlDecoded = zlib.inflateRaw(samlDecoded, _); // inflate URL query parameters
						// check signature
						if (data.idProvCertificate) {
							if (!content.SigAlg) throw authHelper.error(404, locale.format(module, "noSig", data.name));
							var algorithm0;
							var algorithm = content.SigAlg;
							switch (algorithm) {
								case "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256":
									algorithm0 = "RSA-SHA256";
									break;
								case "http://www.w3.org/2000/09/xmldsig#rsa-sha1":
									algorithm0 = "RSA-SHA1";
									break;
								default:
									throw authHelper.error(404, locale.format(module, "unsupportedAlgorithm", algorithm));
							}
							// this does not conform fully to the standard because it may produce errors when the parameters are in different order
							var params = request.url.substring(request.url.indexOf("?") + 1, request.url.indexOf("&Signature="));
							tracer.info && tracer.info("Query string for signature verification " + params);
							certtools = certtools || require('../../src/load/certTools');
							var verify = certtools.verify(_, data.idProvCertificate.name(_), algorithm0, new Buffer(params), content.Signature, {
								signature_encoding: 'base64'
							}, globals.context.tenantId);
							if (!verify) throw authHelper.error(404, locale.format(module, "invalidSignature", data.name));
							checked = true;
						}
					}
					samlDecoded = samlDecoded.toString();
					tracer.info && tracer.info("Decoded message " + samlDecoded);
				} else if (content.SAMLart) {
					throw authHelper.error(404, "HTTP Artifact is not supported yet");
				}
				if (!samlDecoded) throw authHelper.error(404, "Empty ");

				tracer.debug && tracer.debug("SAML2 Response decoded: " + samlDecoded);
				// console.log("SAML2 Response decoded: " + samlDecoded);
				// check signature			
				if (data.idProvCertificate && !checked) {
					var select = require('xml-crypto').xpath;
					var dom = require('xmldom').DOMParser;
					var SignedXml = require('xml-crypto').SignedXml;
					var doc = new dom().parseFromString(samlDecoded);

					var cert = data.idProvCertificate.getPEMCertificate(_);
					var signature = select(doc, "/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];
					if (!signature) throw authHelper.error(404, locale.format(module, "noSig", data.name));
					var sig = new SignedXml();
					sig.keyInfoProvider = {
						getKey: function() {
							return cert;
						}
					};
					sig.loadSignature(signature.toString());
					var res = sig.checkSignature(samlDecoded);
					tracer.debug && tracer.debug("Result of signature check: " + res);

					if (!res) {
						tracer.error && tracer.error("Signature of ID provider " + data.name + " does not fit to certificate " + data.idProvCertificate.name(_) + ": " + sig.validationErrors);
						throw authHelper.error(404, locale.format(module, "invalidSignature", data.name));
					}
				}

				var samlXml = jsxml.normalizeNamespaces(jsxml.parse(samlDecoded));
				if (samlXml["urn:oasis:names:tc:SAML:2.0:protocol|Response"]) {
					var status = samlXml["urn:oasis:names:tc:SAML:2.0:protocol|Response"]["urn:oasis:names:tc:SAML:2.0:protocol|Status"]["urn:oasis:names:tc:SAML:2.0:protocol|StatusCode"].$.Value;
					if (status !== "urn:oasis:names:tc:SAML:2.0:status:Success") {
						tracer.error && tracer.error("Unsuccessful login with response " + samlDecoded);
						throw authHelper.error(404, locale.format(module, "unsuccessful", util.format(status)));

					}
					tracer.info && tracer.info("SAML2 Response Success!!");

					// TODO: there may well be other things that we want to check in the Assertion,
					// such as the Conditions and the AuthnStatement - for now,
					// just parse the value of the configured attribute if there is one

					var assertion = samlXml["urn:oasis:names:tc:SAML:2.0:protocol|Response"]["urn:oasis:names:tc:SAML:2.0:assertion|Assertion"];

					// SessionIndex
					tracer.debug && tracer.debug("Nameid " + JSON.stringify(assertion["urn:oasis:names:tc:SAML:2.0:assertion|Subject"]["urn:oasis:names:tc:SAML:2.0:assertion|NameID"]));
					tracer.debug && tracer.debug("Session " + JSON.stringify(assertion["urn:oasis:names:tc:SAML:2.0:assertion|AuthnStatement"].$.SessionIndex));

					var login = getLogin(assertion, data.responseAttribute);
					tracer.info && tracer.info("Login value " + login);
					var user = checkUser.fromLoginPage(_, request, 'saml2', login, null, null, data.name);
					// request.session.nameId = assertion["urn:oasis:names:tc:SAML:2.0:assertion|Subject"]["urn:oasis:names:tc:SAML:2.0:assertion|NameID"].$value;
					// request.session.sessionIndex = assertion["urn:oasis:names:tc:SAML:2.0:assertion|AuthnStatement"].$.SessionIndex;
					// Does this need some sort of authentication token - logs in anyway but
					// doesn't display the correct user
					request.session.authData = {
						login: user
					};
					request.session.setData("samlNameId", assertion["urn:oasis:names:tc:SAML:2.0:assertion|Subject"]["urn:oasis:names:tc:SAML:2.0:assertion|NameID"].$value);
					request.session.setData("samlSession", assertion["urn:oasis:names:tc:SAML:2.0:assertion|AuthnStatement"].$.SessionIndex);

					// avoid duplicate parameters
					var url1 = request.session.authTargetUrl || '/';
					authHelper.redirect(_, request, response, url.parse(url1).pathname, true, 303);

				} else if (samlXml["urn:oasis:names:tc:SAML:2.0:protocol|LogoutRequest"]) {
					var nameId = samlXml["urn:oasis:names:tc:SAML:2.0:protocol|LogoutRequest"]["urn:oasis:names:tc:SAML:2.0:assertion|NameID"];
					var sessionIndex = samlXml["urn:oasis:names:tc:SAML:2.0:protocol|LogoutRequest"]["urn:oasis:names:tc:SAML:2.0:protocol|SessionIndex"];
					// find out running sessions with this index
					if ("mockServer" in config) {
						var path = "/nannyCommand/notifyAll/auth/saml2/-/slo?nameId=" + nameId.$value;
						if (sessionIndex) {
							if (Array.isArray(sessionIndex)) {
								sessionIndex.forEach(function(item) {
									path += "&sessionIndex=" + item;
								});
							} else path += "&sessionIndex=" + sessionIndex;
						}
						if (globals.context.tenantId) {
							path += '&tenantId=' + globals.context.tenantId;
						}
						var options = {
							path: path,
							method: "POST",
							port: 0,
							headers: {
								host: (globals.context.tenantId || "")
							}
						};
						options.headers[mock.BALANCER_HEADER] = config.port;
						try {
							var answer = config.mockServer.mockClient.simpleRequest(options, "", _);
							tracer.debug && tracer.debug("Answer from request to servers " + answer);
						} catch (e) {
							tracer.error && tracer.error("Error during request to other processes " + e);
						}
					}
					deleteSessions(_, nameId.$value, sessionIndex);
					// response
					var now = datetime.now(true);
					var id = "_" + corehelpers.uuid.generate("");
					var resp = {
						"samlp:LogoutResponse": {
							"$": {
								"xmlns:samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
								"xmlns:saml": "urn:oasis:names:tc:SAML:2.0:assertion",
								"ID": id,
								"Version": "2.0",
								"IssueInstant": now,
								"InResponseTo": samlXml["urn:oasis:names:tc:SAML:2.0:protocol|LogoutRequest"].$.ID,
								"Destination": data.logoutResponseURL
							},
							"saml:Issuer": {
								"$value": data.issuer // issuer is requested by the SAML2 server configuration								
							},
							"samlp:Status": {
								"samlp:StatusCode": {
									"$": {
										"Value": "urn:oasis:names:tc:SAML:2.0:status:Success"
									}
								}
							}
						}
					};
					var resp = jsxml.stringify(resp);
					tracer.debug && tracer.debug("Single logout response " + resp);
					if (samlRaw) {
						postResponse(_, response, data.logoutResponseURL, data, "SAMLResponse", "LogoutResponse", resp, content.RelayState);
					} else {
						redirectResponse(_, response, data.logoutResponseURL, data, "SAMLResponse", resp, content.RelayState);
					}
				}
			};
	};
};

// Delete Syracuse sessions as part of single logout
function deleteSessions(_, nameId, sessionIndex) {
	var jsonwhere = {
		serverName: config.servername,
		samlNameId: nameId
	};
	if (sessionIndex) {
		if (Array.isArray(sessionIndex)) {
			jsonwhere.samlSession = {
				$in: sessionIndex
			};
		} else jsonwhere.samlSession = sessionIndex;
	}
	tracer.debug && tracer.debug("Pattern for deleting sessions " + JSON.stringify(jsonwhere));
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	// fetch sessions which match this profile
	var sessionInfos = db.fetchInstances(_, db.model.getEntity(_, "sessionInfo"), {
		jsonWhere: jsonwhere
	});
	// just stop local sessions
	var i = sessionInfos.length;
	while (--i >= 0) {
		var sid = sessionInfos[i].sid(_);
		traceHelper.removeSessionTracers(_, sid);
		sessionManager.deleteSession(_, sessionInfos[i].sid(_));
		tracer.debug && tracer.debug("Delete session " + sessionInfos[i].sid(_));
	}
}

exports.getServerList = function(_) {
	if (!authHelper.isAllowed("saml2")) return [];
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	// fetch OAuth2 server data
	return db.fetchInstances(_, db.model.getEntity(_, "saml2"), {
		sdataWhere: ""
	}).filter_(_, function(_, saml2) {
		return saml2.active(_);
	}).map_(_, function(_, saml2) {
		var name = saml2.name(_);
		return {
			href: "/auth/saml2/" + name + '/loginStart',
			title: saml2.displayName(_) || name,
		};
	});
};

function loginStart(_, request, response) {
	return request.saml2.loginStart(_, request, response);
}

function loginCallback(_, request, response) {
	return request.saml2.loginCallback(_, request, response);
}

function metadata(_, request, response) {
	return request.saml2.metadata(_, request, response);
}

//single log out - only internal function
function slo(_, request, response) {
	var parsed = url.parse(request.url, true);
	tracer.debug && tracer.debug("Delete sessions " + JSON.stringify(parsed.query));
	if (!syracuse) syracuse = require('syracuse-main/lib/syracuse');
	if (syracuse.server instanceof mock.MockStreamServer && !request.fromNanny && !request._request.fromNanny || !(syracuse.server instanceof mock.MockStreamServer) && (!config.system || !config.system.enableDevelopmentFeatures)) {
		response.writeHead("404", {});
		return response.end("Resource not found.");
	}
	if (parsed.query.tenantId) {
		var tenant = parsed.query.tenantId;
		if (!syracuse.initializedTenant(tenant)) {
			response.writeHead("200", {});
			return response.end("Ignored");
		} else {
			globals.context.tenantId = tenant;
		}
	}
	deleteSessions(_, parsed.query.nameId, parsed.query.sessionIndex);
	response.writeHead("200", {});
	response.end("OK");
}


var dispatcher = authHelper.dispatcher(4, {
	loginStart: loginStart,
	loginCallback: loginCallback,
	callback: loginCallback,
	metadata: metadata,
	slo: slo,
});


exports.dispatch = function(_, request, response) {
	var m = /\/[^\/]*\/[^\/]*\/([^\/]*)\//.exec(request.url);
	if (!m || !m[1]) throw authHelper.error(404, locale.format(module, "badUrl", request.url));
	var name = m[1];
	if (name !== "-") {
		var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
		var server = db.fetchInstance(_, db.model.getEntity(_, "saml2"), {
			jsonWhere: {
				name: name,
			}
		});
		if (!server) throw authHelper.error(404, locale.format(module, "noIDProvider", name));
		if (!server.active(_)) throw authHelper.error(403, locale.format(module, "inactiveIDProvider", name));
		// data for certificate will not be loaded implicitly
		server.certificate(_);
		server.idProvCertificate(_);
		request.saml2 = create(server._data, request, request.url.indexOf("/metadata") > 0 ? server : undefined);
	}
	return dispatcher(_, request, response);
};