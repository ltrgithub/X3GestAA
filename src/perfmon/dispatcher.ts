"use strict";

var perfmon = require('../perfmon/record');

exports.dispatcher = function(config) {
	return function(_, request, response) {
		var url = request.url.split('&')[0]; // temp hack to get rid of &format=text appended by client
		if (url === '/perfmon/session-data') {
			response.writeHead(200, {
				"Content-Type": "application/json"
			});
			var timings = (request.session && request.session.timings) || [];
			response.end(JSON.stringify({
				sessionId: request.session && request.session.id,
				children: timings,
				start: timings.length ? timings[0].start : Date.now(),
				end: Date.now(),
				memory: process.memoryUsage(),
				cpu: perfmon.cpuStats(),
				bigCpuSlices: perfmon.bigCpuSlices(),
				uptime: process.uptime(),
				versions: process.versions,
			}));
		} else {
			response.writeHead(404, {});
			return response.end("Resource not found: " + request.url);
		}
	};
};

exports.dispatch = exports.dispatcher(require('config'));