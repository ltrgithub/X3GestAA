"use strict";

exports.entity = {
	$isPersistent: false,
	$properties: {
		schedulerId: {
			$isHidden: true
		}
	},
	$relations: {
		scheduler: {
			$title: "Scheduler",
			$type: "automate",
			$propagate: function(_, instance, val) {
				instance.schedulerId(_, val && val.$uuid);
			}
		}
	}
};