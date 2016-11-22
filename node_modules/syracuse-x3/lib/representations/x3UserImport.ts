"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "x3UserImport",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "row",
				$items: [{
					$items: [{
						$category: "section",
						$title: "{@InformationsSectionTitle}",
						$layout: {
							$items: [{
								$bind: "description"
							}]
						}
					}, {
						$category: "section",
						$title: "{@FilterTitle}",
						$layout: {
							$items: [{
								$bind: "endpoint"
							}, {
								$bind: "filter"
							}]
						}
					}, {
						$category: "section",
						$title: "{@PoliciesTitle}",
						$layout: {
							$items: [{
								$bind: "syncMode"
							}, {
								$bind: "keyProperty"
							}, {
								$bind: "x3NameFormat"
							}, {
								$bind: "groupPolicy"
							}, {
								$bind: "group"
							}, {
								$bind: "createGroupPolicy_menuProf"
							}, {
								$bind: "createGroupPolicy_create"
							}, {
								$bind: "role"
							}]
						}
					}]
				}]
			}
		},
		$edit: {
			$copy: "$details"
		}
	}
};