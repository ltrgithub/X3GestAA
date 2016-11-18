"use strict";

const scheduler = require("syracuse-event/lib/scheduler");
const datetime = require('@sage/syracuse-core').types.datetime;
const uuid = require('@sage/syracuse-core').helpers.uuid;

exports.entity = {
	$titleTemplate: "Token informations",
	$descriptionTemplate: "Token information",
	$valueTemplate: "{jti}",
	$listTitle: "List of Token informations",
	$canEdit: false,
	$properties: {
		jti: {
			$title: "Token ID",
			$isUnique: true,
			$isMandatory: true
		},
		clientId: {
			$title: "Connected application ID",
			$isMandatory: true,
			$compute: function(_, instance) {
				let app = instance.app(_);
				return app && app.clientId(_);
			}
		},
		info: {
			$type: "json",
			$isMandatory: true,
			$isDefined: false
		},
		expiration: {
			$title: "Expiration time (in millisecond)",
			$type: "datetime",
			$default: datetime.fromJsDate(new Date(0))
		}
	},
	$relations: {
		app: {
			$type: "connectedApplication",
			$isMandatory: true,
			$isHidden: true,
			$inv: "tokenInfos",
			$nullOnDelete: true
		}
	},
	$events: {
		$beforeSave: [
			function(_, instance, params) {
				if (!instance.$created) {
					throw new Error("Token modification is forbidden");
				}
			}
		]
	},
	$functions: {
		schedule: function(_) {
			if (new Date(this.expiration(_)._value).getTime() > 0) //
				return scheduler.schedule(_, this, this.$uuid, new Date(this.expiration(_)._value).getTime(), {}, "db");
		},
		fire: function(_, key, parameters) { // call by scheduler when a tokenInfo must be purge automatically
			try {
				this.deleteSelf(_);
			} catch (e) {
				console.error("Error when fire expiration for tokenInfo: " + e.stack);
			}
		}
	}
};