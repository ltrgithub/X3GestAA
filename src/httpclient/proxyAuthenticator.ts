"use strict";
var NtlmAuthenticator = require("jsntlm/lib/ntlmAuthenticator").NtlmAuthenticator;
var perfmon = require('../../../src/perfmon/record');

exports.authenticate = function(callback, options) {

	// Necessary to use only one TCP Stream for the two requests
	options.agent = new options.module.Agent();
	options.agent.maxSockets = 1;
	//options.agent.keepAlive = true;

	options.headers["Proxy-Connection"] = "Keep-Alive";

	var cacheControl = options.headers["Cache-Control"];
	if (cacheControl) {
		cacheControl = cacheControl.indexOf("proxy-revalidate") !== -1 ? cacheControl : cacheControl + ", proxy-revalidate";
	}
	options.headers["Cache-Control"] = cacheControl || "proxy-revalidate";

	var contentLength = options.headers["content-length"];
	if (contentLength && (options.method.toUpperCase() === "POST" || options.method.toUpperCase() === "PUT")) options.headers["content-length"] = 0;

	var timing = perfmon.start(module, "proxyAuthenticate.all", options.url);
	var ntlmAuthentication = new NtlmAuthenticator(options.proxy.user, options.proxy.password, options.proxy.domain);
	ntlmAuthentication.createSession();
	var negociateMsg = ntlmAuthentication.generateNegociateMessage();

	options.headers["Proxy-Authorization"] = negociateMsg;

	var _negociateRequest = options.module.request(options, function(negResult) {
		negResult.setEncoding('utf8');

		negResult.on('data', function() {});
		negResult.on('end', function() {

			if (contentLength) options.headers["content-length"] = contentLength;
			if (negResult.statusCode !== 407) {
				callback(new Error("Proxy negociation returned " + negResult.statusCode + " status code instead of 407."));
			}
			var srvChallenge = negResult.headers["proxy-authenticate"];

			var cookie = negResult.headers["set-cookie"];
			options.headers.cookie = options.headers.cookie || "";
			options.headers.cookie += "; " + cookie;

			var authenticateMsg = ntlmAuthentication.generateAuthenticateMessage(srvChallenge);
			options.headers["Proxy-Authorization"] = authenticateMsg;
			timing.end();
			callback(null, true);
		});
	});
	_negociateRequest.on('error', function(e) {
		timing.end();
		callback(new Error('A problem occured with NTLM Negociate request: ' + e.message));
	});
	_negociateRequest.end();
};