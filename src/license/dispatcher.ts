"use strict";

var check = require('../../src/license/check');
var mock = require('syracuse-load/lib/mock');
var url = require('url');
var config;
var globals = require('streamline-runtime').globals;
var syracuse;
var multiTenant;

exports.dispatcher = function(config) {
	var routes = {
		ub: function(_, request, response) {
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			console.log("Find used badges");
			try {
				var result = check.findUsedBadges(_, "desktop");
				response.end(JSON.stringify(result));
			} catch (e) {
				console.log("Error " + e + " " + e.stack);
				response.end("Error during find used badges: " + e);
			}
		},

		test: function(_, request, response) {
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			// This method is used by cloud platform to test healthcheck of the syracuse component.
			response.end('OK');
		},
		count: function(_, request, response) {
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			var r = /c=(\d+)/.exec(request.url);
			var res = 0;
			if (r) {
				res = require('../../src/license/check').step(_, r[1], {
					"x3ServerHost": "aws-x3-indv7",
					"x3ServerPort": 17100,
					"x3Solution": "X3V7",
					"x3Folder": "X3TESTV7",
					"locale": "en-US",
					"userName": "admin",
					"product": {
						"code": "1",
						"version": "7"
					}
				});

			}
			response.end('OK ' + r[1] + " " + res);

		},
		check: function(_, request, response) {
			console.log("LIC CHECK");
			check.checkNamed(_); // no instance here in order to avoid infinite loop!
			console.log("LIC CHECK");
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			response.end('OK');
		},
		update: function(_, request, response) {
			var content = request.readAll(_).toString("utf8");
			console.log("Update request");
			var updateResult = check.updateLicense(content, _);
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			response.end(updateResult ? 'Valid license' : 'No valid license');
		},
		set: function(_, request, response) {
			var content = request.readAll(_);
			if (content) content = content.toString("utf8");
			else {
				response.writeHead(400, {
					"Content-Type": "text/plain"
				});
				response.end("No content");
				return;
			}
			var diagnoses = [];
			var extra = {};
			try {
				check.licenseChange(content, diagnoses, _, extra);
			} catch (e) {
				response.writeHead(400, {
					"Content-Type": "text/plain"
				});
				response.end("Error: " + e);
				return;
			}
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			response.end("Call: " + JSON.stringify(diagnoses) + "\nPropagation: " + (extra.error || extra.answer));
			return;
		}
	};
	return function(_, request, response) {
		// block special functions when not authorized
		if (!syracuse) {
			syracuse = require('syracuse-main/lib/syracuse');
			config = require('config');
			multiTenant = config.hosting && config.hosting.multiTenant;
		}
		if (syracuse.server instanceof mock.MockStreamServer && !request.fromNanny && !request._request.fromNanny || !(syracuse.server instanceof mock.MockStreamServer) && (!config.system || !config.system.enableDevelopmentFeatures)) {
			response.writeHead("404", {});
			return response.end("Resource not found.");
		}
		if (multiTenant) {
			var r = /\?(?:.*\&)*tenantId=(\w+)/.exec(request.url);
			var tenant;
			if (r) tenant = r[1];
			if (!syracuse.initializedTenant(tenant)) {
				response.writeHead("200", {});
				return response.end("Ignored");
			} else {
				globals.context.tenantId = tenant;
			}
		}
		var p = request.url.split('/')[2];
		var index = p.indexOf('?');
		if (index >= 0) p = p.substr(0, index);
		var route = routes[p];
		if (!route) throw new Error("bad url: " + request.url);
		return route(_, request, response);
	};
};
