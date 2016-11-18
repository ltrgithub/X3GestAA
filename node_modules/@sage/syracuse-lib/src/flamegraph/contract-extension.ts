"use strict";

module.exports = {
	application: "syracuse",
	extends: "collaboration",
	entities: {
		flamegraphRecording: require('./entities/recording').entity,
		flamegraphSetting: require('./entities/setting').entity
	},
	representations: {},
};