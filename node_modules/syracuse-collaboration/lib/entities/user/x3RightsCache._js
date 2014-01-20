"use strict";

exports.entity = {
	$properties: {
		userRights: {
			$title: "User rights",
			$type: "json"
		},
		etag: {
			$title: "ETag",
			$isMandatory: true
		}
	},
	$relations: {
		user: {
			$title: "user",
			$type: "user",
			$cascadeDelete: true,
			$isMandatory: true
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$cascadeDelete: true,
			$isMandatory: true
		}
	}
};