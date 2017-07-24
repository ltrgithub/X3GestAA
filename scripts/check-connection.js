"use strict";
var http = require('http');

var options = {
	host: 'localhost',
	port: 8124,
	path: "/sdata/syracuse/collaboration/syracuse/users(login%20eq%20'admin')?representation=user.$details",
	headers: {
		// admin:admin
		"authorization": "Basic YWRtaW46YWRtaW4=",
		"accept": "application/json"
	}
};

var maxReties = process.argv[2] || 6;
var delay = process.argv[3] || 5000;

function success(msg) {
	console.log("Success: " + msg);
	process.exit(0);
}

function fail(msg) {
	console.log("Failed: " + msg);
	process.exit(1);
}

function retry(retries, cb) {
	if (retries >= maxReties) {
		fail("Exit after " + retries + " retries");
	}
	retries++;
	console.log("Retry in", delay * retries * retries / 1000, "s");
	setTimeout(function() {
		get(retries, cb);
	}, delay * retries * retries);
}

function get(retries, cb) {
	console.log("Try", retries + 1);
	var req = http.get(options, function(response) {
		// handle the response
		var res_data = '';
		console.log("Got response: " + response.statusCode);
		response.on('data', function(chunk) {
			res_data += chunk;
		});
		response.on('end', function() {
			cb(null, {
				response: response,
				body: res_data,
				retries: retries
			});
		});
	});
	req.on('error', function(e) {
		console.log("Got error: " + e.message);
		retry(retries, cb);
	});
}

function handler(err, res) {
	var resp = res.response;
	if (resp.statusCode !== 200) {
		console.log("Bad status code", resp.statusCode, "expect 200");
		return retry(res.retries, handler);
	}
	if (!/application\/json/.test(resp.headers["content-type"])) {
		console.log("Bad content-type '" + resp.headers["content-type"] + "' expect 'application/json'");
		return retry(res.retries, handler);
	}

	var user = JSON.parse(res.body);

	if (user.login === "admin") {
		success("Found admin user");
	}
	fail("admin user not found!");
}

get(0, handler);
