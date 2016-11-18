"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "setting",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "row",
				$items: [{
					$items: [{
						$title: "{@GeneralSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$bind: "twoDigitYearMin"
							}, {
								$bind: "twoDigitYearMax"
							}, {
								$bind: "localePref"
							}]
						}
					}, {
						$title: "{@AuthenticationSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$bind: "authentication"
							}, {
								$bind: "ldap"
							}, {
								$bind: "oauth2"
							}, {
								$bind: "saml2"
							}]
						}
					}, {
						$items: [{
							$title: "{@ProxySectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "proxy"
								}, {
									$bind: "proxyConf"
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@MailerSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "mailer"
								}]
							}
						}]
					}, {
						$items: [{
							$title: "CTI Service",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "ctiService"
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@LicenseSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "webServiceWarnThreshold"
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@TraceSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "traceMaxFiles"
								}, {
									$bind: "traceMaxSize"
								}, {
									$bind: "traceMaxDays"
								}]
							}
						}]
					}, {
						$title: "{@PatchSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$bind: "patchLock"
							}]
						}
					}, {
						$title: "{@SyncSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$bind: "conflictPriority",
							}, {
								$bind: "endpoint"
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