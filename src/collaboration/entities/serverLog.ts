"use strict";

var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var globals = require('streamline-runtime').globals;
var scheduler = require("syracuse-event/lib/scheduler");

exports.entity = {
	$titleTemplate: "Server logs",
	$valueTemplate: "{description}/{logDate}",
	$canCreate: false,
	$canEdit: false,
	$helpPage: "Administration-reference_Server-logs",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true,
			$linksToDetails: true
		},
		logDate: {
			$title: "Log date",
			$type: "datetime",
			$isMandatory: true,
			defaultValue: function(_) {
				return [datetime.now()];
			}
		},
		fileName: {
			$title: "Filename",
			$isHidden: true,
			$isReadOnly: true
		},
		documentType: {
			$title: "Document type",
			$isHidden: true,
			$isReadOnly: true
		},
		content: {
			$title: "Content",
			$isHidden: true,
			$type: "binary",
			$isDisabled: function(_, instance) {
				return false;
			},
			$storage: function(_, instance) {
				return "db_file";
			},
			$propagate: function(_, instance, val) {
				if (!instance.description(_) && val && val.fileName) instance.description(_, val.fileName);
				instance.documentType(_, val.contentType);
				instance.logDate(_, datetime.now());
				instance.fileName(_, val.fileName);
			}
		},
		sid: {
			$title: "Session id",
			$isHidden: true,
			$isReadOnly: true
		},
		expiration: {
			$title: "Expires",
			$type: "datetime",
			$isHidden: true,
			$default: datetime.fromJsDate(new Date(0))
		}
	},
	$relations: {
		owner: {
			$title: "Owner",
			$type: "user",
			$isMandatory: true
		},
		messages: {
			$title: "Messages",
			$type: "serverLogEntries",
			$capabilities: "filter",
			$isChild: true
		},
		automate: {
			$title: "Automate",
			$type: "automate"
		},
	},
	$init: function(_, instance) {
		var up = globals.context && globals.context.session && globals.context.session.getUserProfile(_);
		up && instance.owner(_, up.user(_));
	},
	$searchIndex: {
		$fields: ["description", "documentType", "logDate", "fileName", "owner"]
	},
	$functions: {
		schedule: function(_) {
			if (new Date(this.expiration(_)._value).getTime() > 0) //
				return scheduler.schedule(_, this, this.$uuid, new Date(this.expiration(_)._value).getTime(), {}, "db");
		},
		fire: function(_, key, parameters) { // call by scheduler when a trace document must be purge automatically
			try {
				this.deleteSelf(_);
			} catch (e) {
				console.log(e.stack);
			}
		}
	}
};