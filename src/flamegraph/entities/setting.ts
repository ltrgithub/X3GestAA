"use strict";

var UUID = "5dc4327b-27de-47a1-b087-4da8409e3830";

exports.entity = {
	$titleTemplate: "Flamegraph settings",
	$valueTemplate: "default",
	$descriptionTemplate: "Flamegraph settings",
	$pluralName: "flamegraphSettings",
	$canCreate: false,
	$canDelete: false,
	$canEdit: true,
	$properties: {
		autoStart: {
			$title: "Start automatically",
			$type: "boolean",
			$default: false,
		},
		palette: {
			$title: "Color palette",
			$type: "binary",
			$isHidden: true,
			$storage: "db_file",
		},
	},
	$relations: {},
	$functions: {},
	$services: {},
	$links: {
		recordings: {
			$title: "Recordings",
			$url: "{$baseUrl}/flamegraphRecordings?representation=flamegraphRecording.$query",
		},
	},
	$initEntity: function(_, db) {
		// this is the entity
		if (this.count(_, db) > 0) return;
		var instance = this.createInstance(_, db);
		instance.$uuid = UUID;
		instance.save(_);
	},
};

exports.getLink = function() {
	return {
		$title: "Settings",
		$url: "{$baseUrl}/flamegraphSettings('" + UUID + "')?representation=flamegraphSetting.$details",
	};
};

exports.getInstance = function(_, db) {
	var entity = db.model.getEntity(_, 'flamegraphSetting');
	return entity.fetchInstance(_, db, UUID);
};