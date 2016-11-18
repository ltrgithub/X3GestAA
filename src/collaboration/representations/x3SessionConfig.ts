"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "x3SessionConfig",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@RuntimeSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "runtimeLog"
										}, {
											$bind: "logFlag"
										}, {
											$bind: "directory"
										}]
									}
								}]
							}
						}]
					}]
				}]
			}
		},
		$edit: {
			$copy: "$details"
		}
	}
};