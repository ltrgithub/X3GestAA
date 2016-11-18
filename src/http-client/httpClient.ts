"use strict";

var adminHelper = require("../../src/collaboration/helpers").AdminHelper;
var ez = require("ez-streams");
var locale = require('streamline-locale');
var perfmon = require('../..//src/perfmon/record');
var proxy = require('proxy-agent');
var parseUrl = require("url").parse;

var getDefaultProxyConf = exports.getDefaultProxyConf = function(_) {
	var db = adminHelper.getCollaborationOrm(_);
	var model = db.model;
	var entity = model.getEntity(_, "setting");
	var instance = entity.fetchInstances(_, db)[0];

	// crnit: better return null than throw
	// if (!instance) throw new Error(locale.format(module, "settingsNotFound"));
	if (!instance) return null;
	//
	if (instance.proxy(_)) {
		var proxyConf = instance.proxyConf(_);
		if (proxyConf) return proxyConf.toJSON(_);
	}
	return;
};

exports.httpRequest = function(_, options) {
	if (options && !options.proxy && !options.ignoreProxy) {
		options.proxy = getDefaultProxyConf(_);
	}
	if (options.proxy) {
		// use agent in some cases
		if (options.proxy.auth !== "ntlm") {
			if (options.url && !options.host) {
				var parsed = parseUrl(options.url);
				options.protocol = parsed.protocol;
				options.host = parsed.hostname;
				options.port = parsed.port;
				options.path = parsed.pathname + (parsed.query ? "?" + parsed.query : "");
			}
			if (options.proxy.excludes && options.proxy.excludes.indexOf(options.host.toLowerCase()) === -1) {
				var p = 'http://' + (options.proxy && options.proxy.auth ? options.proxy.user + ':' + options.proxy.password + '@' : "") + options.proxy.host + ':' + options.proxy.port;
				options.agent = proxy(p);
				// something strange happens with some proxy servers if node-wrapper implementation in ez-streams receive options.proxy --> 403 Forbidden
				delete options.proxy;
			}
		}
	}
	var req = ez.devices.http.client(options).proxyConnect(_);
	var originalResponse = req.response;
	req.response = function(_) {
		var timing = perfmon.start(module, "httpProxyClient.response", options.url);
		var resp;
		try {
			resp = originalResponse.call(req, _);
			if (options && options.proxyAuthenticate && resp.statusCode === 407) {
				throw new Error(locale.format(module, "proxyAuthFailed", resp.statusCode));
			}
			return resp;
		} finally {
			timing.end({
				status: (resp && resp.statusCode) || 500
			});
		}
	};
	return req;
};