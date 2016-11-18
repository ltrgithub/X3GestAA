"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "connectedApplication",
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
								$bind: "name"
							}, {
								$bind: "url"
							}, {
								$bind: "clientId"
							}, {
								$bind: "secretCreated"
							}, {
								$bind: "active"
							}, {
								$bind: "expiration"
							}]
						}
					}, {
						$title: "{@TokensSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "payloads"
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
											$bind: "name"
										}, {
											$bind: "url"
										}, {
											$bind: "clientId"
										}, {
											$bind: "active"
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