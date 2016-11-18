"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var sdataAsync = require('../../..//src/sdata/sdataAsync');

exports.entity = {
	$titleTemplate: "Asynchronous operation {trackingId}",
	$isPersistent: false,
	$canDelete: false,
	$canSave: false,
	$canEdit: false,
	$autoRecreateWorkingCopy: true,
	$properties: {
		trackngId: {
			$title: "Tracking Id",
			$isMandatory: true,
		},
		phase: {
			$title: "Phase",
			$description: "End user message describing the current phase of the operation.",
			$isLocalized: true
		},
		phaseDetail: {
			$title: "Detail",
			$description: "Detailed message for the progress within the current phase.",
			$isLocalized: true
		},
		progress: {
			$title: "Progress",
			$description: "Percentage of operation completed.",
			$type: "decimal"
		},
		elapsedSeconds: {
			$title: "Elapsed Seconds",
			$description: "Time elapsed since operation started, in seconds.",
			$type: "decimal"
		},
		remainingSeconds: {
			$title: "Remaining Seconds",
			$description: "Expected remaining time, in seconds.",
			$type: "decimal"
		},
		pollingMillis: {
			$title: "Delay",
			$description: "Delay (in milliseconds) that the consumer should use before polling the service again.",
			$type: "integer"
		},
	},
	$fetchInstances: function(_, context, parameters) {
		var result = [];
		var entity = context.db.model.getEntity(_, "asyncOperation");
		var trackers = sdataAsync.trackers;
		for (var i in trackers) {
			var inst = entity.factory.createInstance(_, null, context.db);
			inst.trackngId(_, trackers[i].trackngId);
			inst.pollingMillis(_, trackers[i].pollingMillis);

			if (trackers[i].phase) inst.phase(_, trackers[i].phase);
			if (trackers[i].phaseDetail) inst.phaseDetail(_, trackers[i].phaseDetail);
			if (trackers[i].progress) inst.progress(_, trackers[i].progress);
			if (trackers[i].elapsedSeconds) inst.elapsedSeconds(_, trackers[i].elapsedSeconds);
			if (trackers[i].remainingSeconds) inst.remainingSeconds(_, trackers[i].remainingSeconds);

			result.push(inst);
		}
		return result;
	}
};