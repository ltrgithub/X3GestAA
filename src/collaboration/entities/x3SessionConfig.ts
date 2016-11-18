"use strict";
/// !doc
///
/// # Session configuration entity  
///
/// This entity is not persistent.  
/// Information managed by it are attached to the http session.  
/// 
var locale = require('streamline-locale');
var x3Logs = require("syracuse-x3/lib/x3Logs");


exports.entity = {
	$titleTemplate: "Session log activation",
	$isPersistent: false,
	$canDelete: false,
	$canCreate: false,
	$canSave: false,
	$autoRecreateWorkingCopy: true,
	$helpPage: "Administration-reference_X3-Session-configuration",
	/// ## Properties
	$properties: {
		/// * **runtimeLog** - *boolean*: Activates runtime logging for this Syracuse session  
		runtimeLog: {
			$title: "Enable Runtime Logging",
			$type: "boolean",
			$default: false,
			$propagate: function(_, instance, val) {
				if (val) {
					instance.logFlag(_, 0);
					instance.directory(_, "");
					instance.dataset(_, null);
				}
			}
		},
		/// * **logFlag** - *integer*: Bit mask to enable various logging options  
		logFlag: {
			$title: "Flags",
			$type: "integer",
			$default: 0,
			$displayLength: 10,
			$isHidden: function(_, instance) {
				return !instance.runtimeLog(_);
			},
			$isMandatory: function(_, instance) {
				return instance.runtimeLog(_);
			}
		},
		/// * **directory** - *string*: Directory used to store logging information  
		directory: {
			$title: "Log directory",
			$type: "string",
			$default: "",
			$displayLength: 10,
			$isHidden: function(_, instance) {
				return !instance.runtimeLog(_);
			},
			$isMandatory: function(_, instance) {
				return instance.runtimeLog(_);
			}
		},
		dataset: {
			$title: "Dataset",
			$isExcluded: true
		},
	},
	/// ## Relations
	$relations: {
		/// * **endPoint** - Endpoint: Endpoint for which the log is activated (all endpoints if none is specified)
		///
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isHidden: function(_, instance) {
				return !instance.runtimeLog(_);
			},
			$propagate: function(_, instance, val) {
				if (val) instance.dataset(_, val.dataset(_));
				else instance.dataset(_, "");
			}
		}
	},
	$init: function(_, instance, context) {
		context.httpSession.x3SessionConfig = context.httpSession.x3SessionConfig || {};
		var runtimeCfg = context.httpSession.x3SessionConfig.runtime || {};
		if (runtimeCfg.runtimeLog) {
			instance.runtimeLog(_, true);
			instance.logFlag(_, runtimeCfg.logFlag || 0);
			instance.directory(_, runtimeCfg.logDir || "");
		}
	},

	$functions: {},
	/// ## Services
	$services: {
		/// * **submit**: Apply changes
		submit: {
			$method: "POST",
			// $confirm: "This operation will change the X3 runtime configuration of all subsequent sessions.\n\nDo you want to continue ?",
			$isMethod: true,
			$title: "Submit",
			$execute: function(_, context, instance) {
				try {
					context.httpSession.x3SessionConfig = context.httpSession.x3SessionConfig || {};
					instance.$diagnoses = instance.$diagnoses || [];

					if (instance.runtimeLog(_)) {

						if (instance.logFlag(_) === 0 || instance.directory(_) === "")
							throw new Error(locale.format(module, "runtimeLogPreconditionFailed"));

						var runtimeCfg = context.httpSession.x3SessionConfig.runtime = (context.httpSession.x3SessionConfig.runtime || {});
						runtimeCfg.runtimeLog = instance.runtimeLog(_);
						runtimeCfg.logFlag = instance.logFlag(_);
						runtimeCfg.dataset = instance.endpoint(_) ? instance.endpoint(_).dataset(_) : null;
						runtimeCfg.logDir = instance.directory(_);


						instance.$diagnoses.push({
							$severity: "info",
							$message: locale.format(module, "runtimeLogEnabled", runtimeCfg.logDir)
						});
					} else {
						delete context.httpSession.x3SessionConfig.runtime;
					}
				} catch (e) {
					context.httpSession.x3SessionConfig = {};
					console.error(e.stack);
					return {
						$diagnoses: [{
							severity: "error",
							message: e.message
						}]
					};
				}
			}
		},
		activateLog: {
			$method: "POST",
			$confirm: locale.format(module, "changeX3"),
			$isMethod: true,
			$title: "Activate X3 log",
			$execute: function(_, context, instance) {
				x3Logs.activate(_, context);
			}
		},
		deactivateLog: {
			$method: "POST",
			$confirm: locale.format(module, "changeX3"),
			$isMethod: true,
			$title: "Deactivate X3 log",
			$execute: function(_, context, instance) {
				x3Logs.deactivate(_, context);
			}
		},
		reset: {
			$method: "POST",
			$isMethod: true,
			$title: "Reset",
			$execute: function(_, context, instance) {
				try {
					context.httpSession.x3SessionConfig = {};
					instance.$diagnoses = instance.$diagnoses || [];

					if (instance.runtimeLog(_)) {
						instance.runtimeLog(_, false);
						instance.$diagnoses.push({
							$severity: "info",
							$message: locale.format(module, "runtimeLogDisabled")
						});
					}
				} catch (e) {
					console.error(e.stack);
					return {
						$diagnoses: [{
							severity: "error",
							message: e.message
						}]
					};
				}
			}
		}
	},
	$fetchInstances: function(_, context, parameters) {
		return [];
	}
};