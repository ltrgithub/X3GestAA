"use strict";

var jsurl = require("jsurl");

exports.entity = {
	$isPersistent: false,
	$titleTemplate: "Schedule personalizations export",
	$properties: {
		parameters: {
			$title: "Parameters",
			$isHidden: true,
			$compute: function(_, instance) {
				var p = instance.selectTarget(_) && instance.selectTarget(_).parameters(_);
				return jsurl.stringify({
					scheduler: {
						$uuid: instance.scheduler(_) && instance.scheduler(_).$uuid
					},
					selectTarget: p && jsurl.parse(p)
				});
			}
		}
	},
	$relations: {
		scheduler: {
			$title: "Scheduler",
			$type: "automate",
			$isMandatory: true
		},
		selectTarget: {
			$title: "Options",
			$type: "selectExportTarget",
			$isChild: true
		}
	},
	$init: function(_, instance) {
		instance.selectTarget(_, instance.createChild(_, "selectTarget"));
	}
};