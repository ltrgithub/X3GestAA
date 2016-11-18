"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "serverLog",
	$facets: {
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
											$bind: "description"
										}, {
											$bind: "logDate"
										}, {
											$bind: "owner"
										}, {
											$bind: "automate"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$select: {
			$copy: "$query"
		},
		$lookup: {
			$copy: "$query"
		}
	}
};