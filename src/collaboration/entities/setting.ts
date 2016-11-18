"use strict";

var sys = require("util");
var traceHelper = require('syracuse-trace/lib/helper');
var locale = require('streamline-locale');

exports.entity = {
	$canCreate: false,
	$canDelete: false,
	$helpPage: "Administration-reference_Global-Settings",
	$properties: {
		code: {
			$title: "Code"
		},
		authentication: {
			$title: "Authentication",
			$enum: require('../../..//src/auth/helpers').authEnum(true),
			defaultValue: function(_, instance) {
				var config = require("config");
				var method = (config && config.session && config.session.auth) || "basic";
				if (Array.isArray(method)) method = method[0];
				return method;
			},
			$isMandatory: true
		},
		patchLock: {
			$title: "Patch system locked",
			$type: "boolean",
			$isNullable: true,
			$default: false
		},
		proxy: {
			$title: "Proxy server",
			$type: "boolean",
			$default: false,
			$isNullable: true
		},
		traceMaxFiles: {
			$title: "Maximum number of files",
			$description: "Changes on traces maximum size will not be applied on existing records.",
			$type: "integer",
			$minimum: 3,
			$minimumCanEqual: true,
			$default: 5
		},
		traceMaxSize: {
			$title: "Maximum size (not compressed) of files",
			$description: "Changes on traces maximum files number will not be applied on existing records.",
			$pattern: "^(\\d+)([mMkKgG]?)$",
			$patternMessage: "Maximum size can be set with (k), (m) or (g) characters",
			$default: "10M",
			$isReadOnly: true
		},
		traceMaxDays: {
			$title: "Maximum days",
			$description: "Maximum number of days to keep automatic records.",
			$type: "integer",
			$default: 5,
			$propagate: function(_, instance, value) {
				instance.traceMaxDaysChanged(_, true);
			}
		},
		traceMaxDaysChanged: {
			$type: "boolean",
			$default: false
		},
		webServiceWarnThreshold: {
			$title: "Web service warning threshold",
			$description: "When this percentage of the licensed limit is exceeded, a notification will be sent",
			$type: "integer",
			$default: 75,
		},
		endpoint: {
			$title: "Synchronization endpoint"
		},
		conflictPriority: {
			$title: "Conflict priority",
			$type: "integer",
			$maximum: 9,
			$minimum: 1,
			$default: 5
		},
		twoDigitYearMin: {
			$title: "Lower bound of two-digit year expansion interval",
			$type: "integer",
			$compute: function(_, instance) {
				return instance.twoDigitYearMax(_) - 99;
			}
		},
		twoDigitYearMax: {
			$title: "Upper bound of two-digit year expansion interval",
			$isMandatory: true,
			$type: "integer",
			$minimum: 1930,
			$maximum: 9000,
			$default: 2029
		}
	},
	$titleTemplate: "Global settings",
	$valueTemplate: "Global settings",
	$descriptionTemplate: "Global settings",
	$relations: {
		ldap: {
			$title: "Default LDAP server",
			$type: "ldap",
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "ldap";
			},
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "ldap";
			}
		},
		oauth2: {
			$title: "Default OAuth2 server",
			$type: "oauth2",
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "oauth2";
			},
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "oauth2";
			}
		},
		saml2: {
			$title: "Default SAML2 server",
			$type: "saml2",
			$isMandatory: function(_, instance) {
				return instance.authentication(_) === "saml2";
			},
			$isHidden: function(_, instance) {
				return instance.authentication(_) !== "saml2";
			}
		},
		proxyConf: {
			$title: "Default proxy configuration",
			$type: "proxyConfiguration",
			$isMandatory: function(_, instance) {
				return instance.proxy(_);
			},
			$isHidden: function(_, instance) {
				return !instance.proxy(_);
			}
		},
		mailer: {
			$title: "Default mailer",
			$type: "notificationServer",
			$isMandatory: false,
		},
		localePref: {
			$title: "Global default locale",
			$type: "localePreference",
			$isMandatory: false
		}
	},
	$functions: {},
	$events: {
		$beforeSave: [

			function(_, instance) {
				if (!instance.traceMaxSize(_)) instance.traceMaxSize(_, "10m");
				else if (traceHelper.computeSize(instance.traceMaxSize(_)) < 10000000) {
					instance.traceMaxSize(_, "10m");
					instance.$diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "maxSizeTooSmall")
					});
				}
				var traceMaxDaysChanged = instance.traceMaxDaysChanged(_);
				if (traceMaxDaysChanged) {
					var nbDeleted = traceHelper.removeOldAutoRecords(_, null, instance.traceMaxDays(_));
					instance.traceMaxDaysChanged(_, false);
					if (nbDeleted > 0) {
						instance.$diagnoses = instance.$diagnoses || [];

						instance.$diagnoses.push({
							$severity: "info",
							$message: locale.format(module, "autoRecDeleted", nbDeleted)
						});
					}
				} else if (traceMaxDaysChanged === undefined || traceMaxDaysChanged === null) {
					instance.traceMaxDaysChanged(_, false);
				}
			}
		]
	}
};

exports.getInstance = function(_, db) {
	var entity = db.model.getEntity(_, 'setting');
	return entity.fetchInstances(_, db, {})[0];
};