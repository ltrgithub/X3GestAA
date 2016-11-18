"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "ldap",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "stack",
				$items: [{
					$items: [{
						$title: "{@ServerSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "name"
							}, {
								$bind: "displayName"
							}, {
								$bind: "active"
							}, {
								$bind: "url"
							}, {
								$bind: "adminDn"
							}, {
								$bind: "adminPassword"
							}, {
								$bind: "searchBase"
							}, {
								$bind: "searchFilter"
							}, {
								$bind: "cacerts"
							}]
						}
					}, {
						$title: "{@UsersMappingSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "authenticationNameMapping"
							}, {
								$bind: "firstNameMapping"
							}, {
								$bind: "lastNameMapping"
							}, {
								$bind: "emailMapping"
							}, {
								$bind: "photoMapping"
							}, {
								$bind: "userGroupNameMapping"
							}]
						}
					}]
				}, {
					$items: [{
						$title: "{@UsersFilterSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "syncSearchFilter",
							}, {
								$bind: "onlyKnownGroups"
							}, {
								$bind: "globalSearchFilter"
							}]
						}
					}]
				}, {
					$items: [{
						$title: "{@GroupsSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "groupSearchFilter",
							}, {
								$bind: "groupNameMapping"
							}]
						}
					}]
				}, {
					$items: [{
						$title: "{@SynchronizationSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "userAuthentication",
							}]
						}
					}]
				}, {
					$items: [{
						$title: "{@ImportedUsersSectionTitle}",
						"$category": "section",
						$layout: {
							$items: [{
								$bind: "sync_users",
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