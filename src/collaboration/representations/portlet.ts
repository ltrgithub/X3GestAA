"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "portlet",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$category: "section",
					$title: "{@InformationsSectionTitle}",
					$layout: {
						$items: [{
							$bind: "code"
						}, {
							$bind: "title"
						}, {
							$bind: "description"
						}, {
							$bind: "type"
						}]
					}
				}, {
					$category: "section",
					$title: "{@FiltersSectionTitle}",
					$layout: {
						$items: [{
							$bind: "application"
						}, {
							$bind: "endpoint"
						}]
					}
				}, {
					$category: "section",
					$title: "{@ContentSectionTitle}",
					$layout: {
						$items: [{
							$bind: "items"
						}, {
							$bind: "pageItem"
						}]
					}
				}, {
					$category: "section",
					$title: "{@ClassificationSectionTitle}",
					$layout: {
						$items: [{
							$bind: "module"
						}, {
							$bind: "categories"
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