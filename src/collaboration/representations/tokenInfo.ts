"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "tokenInfo",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "row",
				$items: [{
					$items: [{
						$title: "{@ConfigSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "jti"
							}, {
								$bind: "clientId"
							}, {
								$bind: "expiration"
							}]
						}
					}]
				}]
			}
		},
		$edit: {
			$copy: "$details"
		},
		$query: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$layout: {
								$items: [{
									$bind: "$resources",
									$layout: {
										$items: [{
											$bind: "jti"
										}, {
											$bind: "clientId"
										}, {
											$bind: "expiration"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		}
	}
};