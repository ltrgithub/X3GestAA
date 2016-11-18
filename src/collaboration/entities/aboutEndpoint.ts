"use strict";

exports.entity = {
	$key: "{dataset}",
	$properties: {
		dataset: {
			$linksToDetails: true,
			$details: {
				$url: "{epBaseUrl}/ABOUT('A')?representation=ABOUT.$details",
				$target: "popup"
			}
		},
		description: {},
		epBaseUrl: {
			$isHidden: true
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			console.log("About id is : " + id);
		}
	}
};