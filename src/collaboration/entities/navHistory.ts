"use strict";

var globals = require('streamline-runtime').globals;
var datetime = require('@sage/syracuse-core').types.datetime;

exports.entity = {
	$titleTemplate: "History",
	$descriptionTemplate: "Personal navigation history",
	$valueTemplate: "{title}",
	$properties: {
		title: {
			$title: "Title",
			$isMandatory: true
		},
		agent: {
			$title: "Agent",
			$isMandatory: true,
			$enum: [{
				$value: "browser",
				$title: "Browser"
			}, {
				$value: "excel",
				$title: "Excel"
			}],
			$default: "browser"
		},
		url: {
			$title: "Url",
			$isMandatory: true,
		},
		timestamp: {
			$title: "Timestamp",
			$type: "datetime",
			$isMandatory: true
		}
	},
	$relations: {
		user: {
			$title: "User",
			$type: "user",
			$isMandatory: true
		}
	},
	$services: {

	},
	$indexes: {
		user_date_agent: {
			user: "asc",
			timestamp: "asc",
			agent: "asc"
		}
	},
	$init: function(_, instance) {
		var up = globals.context.session && globals.context.session.getUserProfile(_);
		up && instance.user(_, up.user(_));
		instance.timestamp(_, datetime.now());
	},
	$defaultOrder: [
		["title", true]
	]
};