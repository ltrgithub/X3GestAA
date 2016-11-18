"use strict";

var config = require('config');
var url = require('url');
var mock = require('../../src/load/mock');
var syracuse;

function notifyEnd(_) {
	config.shutDownMarker = true;
}
exports.notifyEnd = notifyEnd;

exports.dispatcher = function(config) {
	return function(_, request, response) {
		syracuse = syracuse || require('syracuse-main/lib/syracuse');
		if (syracuse.server instanceof mock.MockStreamServer && !request.fromNanny && !request._request.fromNanny || !(syracuse.server instanceof mock.MockStreamServer) && (!config.system || !config.system.enableDevelopmentFeatures)) {
			response.writeHead("404", {});
			return response.end("Resource not found.");
		}
		// this is called when all sessions should end
		if (request.url.indexOf("/notifyEnd") >= 0 && url.parse(request.url).pathname === "/notifyEnd") {
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			console.log("NOTIFY END");
			response.end('OK');
			notifyEnd(_); // function which manages end of sessions
			return;
		}

		// this is called when all sessions should end
		if (request.url.indexOf("/notificationAll") >= 0 && url.parse(request.url).pathname === "/notificationAll") {
			response.writeHead(200, {
				"Content-Type": "text/plain"
			});
			require('syracuse-event/lib/scheduler').scheduleAll(_); // function which updates local notification array
			response.end('OK');
			return;
		}
	};
};