"use strict";
var fs = require('streamline-fs');
var path = require('path');
var config = require('config'); // must be first syracuse require
var helpers = require('@sage/syracuse-core').helpers;
var perfmon = require('syracuse-perfmon/lib/record');
var datetime = require('@sage/syracuse-core').types.datetime;
var sessionManager = require('../../../src/session/sessionManager').sessionManager;

var perfConfig = (config || {}).perfmon || {};
var interval = (perfConfig.log || {}).interval;
var logBaseDir;
var lastSeqId = -1;
var started = false;
var snapshotTimer;
var shrinkedTimings = {};

exports.start = function(_) {
	if (!perfConfig.log || !interval || started) return;
	if (!perfmon.enableShrinking(keepTimings)) {
		console.error("Cannot start perfmon logger!");
		return;
	}
	started = true;

	process.on('exit', function() {
		snapshotTimer && clearInterval(snapshotTimer);
	});

	console.log("Creation of perfmon snapshot every " + interval + " seconds");
	snapshotTimer = setInterval(function() {
		createPerfmonSnapshot(function(err) {
			if (err) throw err;
		});
	}, interval * 1000);
};

function keepTimings(data) {
	var timings = shrinkedTimings[data.sessionId] || (shrinkedTimings[data.sessionId] = []);
	timings = timings.concat(data.timings);
	// console.log("keepTimings: [" + data.sessionId + "] " + data.timings.length + " / " + timings.length);
}

function filterTimings(t) {
	return t && (t.seqId > lastSeqId);
}

function maxTimingId(r, t) {
	return t && (t.seqId > r) && t.seqId || r;
}

function createPerfmonSnapshot(_) {
	var sessions = sessionManager.getTenantSessions(),
		logDir = path.join(__dirname, '../../../'),
		d = datetime.now();

	if (path.dirname(path.resolve(logDir, "")) === "bin") {
		logDir = path.resolve(logDir, "..");
	}
	logDir = (config.collaboration || {}).logpath || path.resolve(logDir, "logs");
	[".", "perfmon", d.toString("yyyy-MM"), d.toString("dd")].forEach_(_, function(_, s) {
		logDir = path.resolve(logDir, s);
		if (!fs.exists(logDir, _)) {
			fs.mkdir(logDir, undefined, _);
		}
	});

	var snapshot = {
			lastSeqId: lastSeqId,
			mem: process.memoryUsage(),
			perfmon: {}
		},
		sids = Object.keys(sessions);
	if (sids.length > 0) {
		var timings;
		sids.forEach_(_, function(_, k) {
			var s = sessions[k],
				shrinked = shrinkedTimings[s.id] || [];
			timings = shrinked.concat(s.timings);

			timings = timings.filter(filterTimings);
			snapshot.perfmon[s.id] = {
				timings: timings
			};
			shrinkedTimings[s.id] = null;
			lastSeqId = timings.reduce(maxTimingId, lastSeqId);
		});
		snapshot.lastSeqId = lastSeqId;
		// console.log("perfmon.createSnapshot: timings=" + JSON.stringify(snapshot));
		// fs.writeFile(path.join(logDir, "perfmon-" + d.toString("yyyy-MM-dd-hhmmss") + ".json"), JSON.stringify(snapshot, null, "\t"), "utf8", _);
		fs.writeFile(path.join(logDir, "perfmon-" + d.toString("yyyy-MM-dd-HHmmss") + ".json"), JSON.stringify(snapshot), "utf8", _);
	}
}

// ===================================================
/*function flushTimings(sessionId, timings) {
	flushTimings_(function(err) {
		if (err) throw err;
	}, sessionId, timings);
}

function flushTimings_(_, sessionId, timings) {
	if (!logBaseDir) {
		logBaseDir = path.resolve(__dirname, '../../../');

		if (path.dirname(logBaseDir) === "bin") {
			logBaseDir = path.resolve(logBaseDir, "..");
		}
		logBaseDir = (config.collaboration || {}).logpath || logBaseDir;
	}

	function filterTimings(t) {
		return t.seqId > lastSeqId[sessionId];
	}

	function maxTimingId(r, t) {
		return t.seqId > r ? t.seqId : r;
	}

	var logDir = logBaseDir,
		d = datetime.now();

	timings = timings || [];
	["logs", "perfmon", d.toString("yyyy-MM"), d.toString("dd")].forEach_(_, function(_, s) {
		logDir = path.resolve(logDir, s);
		if (!fs.exists(logDir, _)) {
			fs.mkdir(logDir, undefined, _);
		}
	});

	var snapshot = {
		sessionId: sessionId,
		lastSeqId: -1,
		mem: process.memoryUsage(),
	};
	snapshot.timings = timings.filter(filterTimings);
	snapshot.lastSeqId = lastSeqId[sessionId] = snapshot.timings.reduce(maxTimingId, lastSeqId);
	// console.log("perfmon.createSnapshot: timings=" + JSON.stringify(snapshot));
	// fs.writeFile(path.join(logDir, "perfmon-" + d.toString("yyyy-MM-dd-hhmmss") + ".json"), JSON.stringify(snapshot, null, "\t"), "utf8", _);
	fs.writeFile(path.join(logDir, "perfmon-" + sessionId + "-" + d.toString("yyyy-MM-dd-HHmmss") + ".json"), JSON.stringify(snapshot), "utf8", _);
}
// exports.flushTimings_ = flushTimings_;

*/