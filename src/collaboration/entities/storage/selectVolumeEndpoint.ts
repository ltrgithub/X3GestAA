"use strict";

exports.entity = {
	$titleTemplate: "Select an enpoint",
	$descriptionTemplate: " ",
	$properties: {
		application: {
			$isHidden: true
		},
		contract: {
			$isHidden: true
		},
		dataset: {
			$isHidden: true
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$propagate: function(_, instance, val) {
				if (val) {
					instance.application(_, val.applicationRef(_).application(_));
					instance.contract(_, val.applicationRef(_).contract(_));
					instance.dataset(_, val.dataset(_));
				} else {
					instance.application(_, "");
					instance.contract(_, "");
					instance.dataset(_, "");
				}
			}
		}
	}
};