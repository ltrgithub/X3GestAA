"use strict";

var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var globals = require('streamline-runtime').globals;
var scheduler = require("syracuse-event/lib/scheduler");

exports.entity = {
	$titleTemplate: "Print",
	$valueTemplate: "{description}",
	$descriptionTemplate: "Prints management",
	$canCreate: false,
	$canDelete: false,
	$canEdit: false,
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,
			$linksToDetails: true
		},
		fileName: {
			$title: "Filename",
			$isReadOnly: true
		},
		documentType: {
			$title: "Document type",
			$isReadOnly: true
		},
		documentDate: {
			$title: "Print date",
			$type: "date",
			$isReadOnly: true,
			$isNullable: true
		},
		content: {
			$title: "Content",
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
				instance.documentDate(_, date.today());
				instance.fileName(_, val.fileName);
			}
		},
		expiration: {
			$title: "Expiration time (in millisecond)",
			$type: "datetime",
			$default: datetime.fromJsDate(new Date(0))
		}
	},
	$relations: {
		owner: {
			$title: "Owner",
			$type: "user",
			$isMandatory: true,
			$nullOnDelete: true
		}
	},
	$init: function(_, instance) {
		var up = globals.context && globals.context.session && globals.context.session.getUserProfile(_);
		up && instance.owner(_, up.user(_));
	},
	$searchIndex: {
		$fields: ["description", "documentType", "documentDate", "fileName", "owner"]
	},
	$functions: {
		schedule: function(_) {
			if (new Date(this.expiration(_)._value).getTime() > 0) //
				return scheduler.schedule(_, this, this.$uuid, new Date(this.expiration(_)._value).getTime(), {}, "db");
		},
		fire: function(_, key, parameters) { // call by scheduler when a print document must be purge automatically
			try {
				//console.log("Should have delete by scheduler");
				this.deleteSelf(_);
			} catch (e) {
				console.log(e.stack);
			}
		}
	}
};