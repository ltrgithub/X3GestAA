"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "vignetteRegroup",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$title: "{@InformationsSectionTitle}",
					$category: "section",
					$layout: {
						$items: [{
							$bind: "vignette"
						}, {
							$bind: "vignettes"
						}]
					}
				}, {
					$title: "{@ExplorerSectionTitle}",
					$category: "section",
					$layout: {
						$items: [{
							$bind: "explorer",
							$isTitleHidden: true,
							$width: 900,
							$height: 800
						}]
					}
				}]
			}
		},
		$edit: {
			$copy: "$details"
		}
	}
};