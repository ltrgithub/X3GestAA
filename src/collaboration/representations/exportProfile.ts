"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "exportProfile",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$title: "{@InformationsSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "description"
						}]
					}
				}, {
					$title: "{@AdministrationSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "application"
						}, {
							$bind: "endpoint"
						}, {
							$bind: "locales"
						}]
					}
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
									$bind: "$resources"
								}]
							}
						}]
					}
				}]
			}
		}
	}
};