"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "role",
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
							$bind: "functionProfile"
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
							$bind: "groups"
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
				}]
			}
		},
		$lookup: {
			$copy: "$query"
		}
	}
};