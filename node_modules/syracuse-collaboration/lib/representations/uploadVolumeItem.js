"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "uploadVolumeItem",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "row",
				$items: [{
					$title: "{@UploadContentSectionTitle}",
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$items: [{
								$bind: "volume"
							}, {
								$bind: "content"
							}]
						}]
					}
				}, {
					$title: "{@UploadMetaSectionTitle}",
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$items: [{
								$bind: "fileName"
							}, {
								$bind: "contentType"
							}]
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