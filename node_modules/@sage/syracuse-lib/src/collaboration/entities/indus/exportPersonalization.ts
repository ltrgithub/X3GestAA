"use strict";

var sys = require("util");

exports.entity = {
	$relations: {
		profile: {
			$title: "Export profile",
			$type: "personalizationManagement"
		},
		options: {
			$title: "Options",
			$type: "selectExportTarget",
			$isChild: true
		}
	},
	$functions: {
		scheduledExecute: function(_, diags) {
			var self = this;
			var opt = (this.options(_) && this.options(_).toJson(_)) || {};
			opt.$diagnoses = diags || [];
			this.profile(_) && this.profile(_).exportPersonalizations(_, opt);
		}
	}
};