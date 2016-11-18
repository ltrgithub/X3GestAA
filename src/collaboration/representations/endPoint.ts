"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "endPoint",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$title: "{@InformationsSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "dataset"
						}, {
							$bind: "description"
						}, {
							$bind: "$factory"
						}, {
							$bind: "$factoryOwner"
						}]
					}
				}, {
					$title: "{@LocationSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "applicationRef"
						}]
					}
				}, {
					$title: "{@ServerSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "x3solution"
						}, {
							$bind: "x3ServerFolder"
						}, {
							$bind: "x3ReferenceFolder"
						}, {
							$bind: "nature"
						}, {
							$bind: "x3Historic"
						}, {
							$bind: "x3RightsIgnore"
						}, {
							$bind: "x3ParentFolder"
						}, {
							$bind: "localDatabase"
						}, {
							$bind: "databaseDriver"
						}, {
							$bind: "databaseHost"
						}, {
							$bind: "databasePort"
						}, {
							$bind: "databaseName"
						}, {
							$bind: "useEtna"
						}, {
							$bind: "enableSqlConfiguration"
						}, {
							$bind: "gitFolder"
						}, {
							$bind: "etnaSolutionPath"
						}, {
							$bind: "etnaDriver"
						}, {
							$bind: "etnaDatabaseHost"
						}, {
							$bind: "etnaSQLInstance"
						}, {
							$bind: "etnaDatabasePort"
						}, {
							$bind: "etnaDatabaseName"
						}, {
							$bind: "etnaDatabaseSchema"
						}, {
							$bind: "etnaOracleSID"
						}, {
							$bind: "etnaDatabaseUser"
						}, {
							$bind: "etnaDatabasePassword"
						}, {
							$bind: "etnaMongoHost"
						}, {
							$bind: "etnaMongoPort"
						}, {
							$bind: "helpBaseUrl"
						}]
					}
				}, {
					$title: "{@AdministrationSectionTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "groups"
						}, {
							$bind: "menuProfileToRoles"
						}, {
							$bind: "roleToProfessionCodes"
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