"use strict";
/* @flow */
/*:: 

import { SDataSeverity, SDataLink } from "./types";

type SDataTracking = {
	phase: string;
	phaseDetail: string;
	progress: number;
}

*/
var globals = require('streamline-runtime').globals;

exports.$exported = true;

exports.asyncTrack = function(_, phase, detail, progress) {
	if (globals.context.sdataContext && globals.context.sdataContext.tracker) {
		var tt = globals.context.sdataContext.tracker;
		tt.phase = phase;
		tt.phaseDetail = detail;
		tt.progress = progress;
	}
};

exports.addDiagnose = function(_, severity, message) {
	if (globals.context.sdataContext && globals.context.sdataContext.tracker) {
		var tt = globals.context.sdataContext.tracker;
		tt.addDiagnose(severity, message);
	}
};

exports.abortRequested = function(_) {
	if (globals.context.sdataContext && globals.context.sdataContext.tracker) {
		return globals.context.sdataContext.tracker.abortRequested;
	} else {
		return false;
	}
};

exports.addLink = function(_, name, link) {
	if (globals.context.sdataContext && globals.context.sdataContext.tracker) {
		var t = globals.context.sdataContext.tracker;
		t.$links = t.$links || {};
		t.$links[name] = link;
	}
};