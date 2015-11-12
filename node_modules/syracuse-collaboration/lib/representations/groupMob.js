"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "group",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$title: "{@InformationsSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "description"
						}, {
							$bind: "parent"
						}, {
							$bind: "children"
						}, {
							$bind: "$factory"
						}, {
							$bind: "$factoryOwner"
						}]
					}
				}, {
					$title: "{@AdministrationSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "role"
						}, {
							$bind: "users"
						}, {
							$bind: "endPoints"
						}, {
							$bind: "x3serverTags"
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
							$bind: "$resources",
							$format: "cards",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$layoutType: "stack",
										$items: [{
											$bind: "description",
											$isTitleHidden: true
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$lookup: {
			$copy: "$query"
		}
	}
};