"use strict";

var entity = require('syracuse-collaboration/lib/entities/systemInfo').entity;

function bindings(prefix) {
	return Object.keys(entity.$properties).filter(function(key) {
		return key.substring(0, prefix.length) === prefix;
	}).map(function(key) {
		return {
			$bind: key
		};
	});
}

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "systemInfo",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$title: "{@SyracuseSectionTitle}",
						"$category": "section",
						$layout: {
							$items: bindings("syracuse_")
						}
					}, {
						$title: "{@NodeSectionTitle}",
						"$category": "section",
						$layout: {
							$items: bindings("node_")
						}
					}]
				}, {
					$layoutType: "row",
					$items: [{
						$title: "{@MongoSectionTitle}",
						"$category": "section",
						$layout: {
							$items: bindings("mongo_")
						}
					}, {
						$title: "{@ElasticSectionTitle}",
						"$category": "section",
						$layout: {
							$items: bindings("elastic_")
						}
					}]
				}, {
					$layoutType: "row",
					$items: [{
						$title: "{@EnvSectionTitle}",
						"$category": "section",
						$layout: {
							$items: bindings("env_")
						}
					}]
				}]
			}
		},
	}
};