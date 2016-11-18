"use strict";
var datetime = require('@sage/syracuse-core').types.datetime;
var config = require('config');

exports.autoStart = function(_) {
	if (!config.streamline.flamegraph) return;
	var adminHelpers = require('../../src/collaboration/helpers');
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var settings = require('../../src/flamegraph/entities/setting').getInstance(_, db);
	if (!settings.autoStart(_)) return;
	var entity = db.getEntity(_, "flamegraphRecording");
	var recording = entity.createInstance(_, db);
	recording.stamp(_, datetime.now());
	recording.name(_, "Flamegraph " + recording.stamp(_));
	recording.status(_, "created");
	recording.save(_);
	recording.startRecording(_);
};