"use strict";

exports.entity = {
	$properties: {
		username: {
			$title: "OAuth2 Username",
			$isMandatory: true,
			$format: "$email",
			$displayLength: 30
		}
	},
	$relations: {
		user: {
			$type: "user",
			$inv: "userOAuth2s"
		},
		oauth2: {
			$type: "oauth2",
			$title: "OAuth2 Servers",
			$isMandatory: true,
			$displayLength: 20
		}
	},
	$titleTemplate: "OAuth2 Servers",
};