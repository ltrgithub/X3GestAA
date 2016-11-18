"use strict";

var locale = require('streamline-locale');
var AdminHelper = require("../../../collaboration/helpers").AdminHelper;
var sessionManager = require('../../../..//src/session/sessionManager').sessionManager;
var globals = require('streamline-runtime').globals;

exports.entity = {
	$titleTemplate: "Task",
	$valueTemplate: "{description}",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true
		},
		suspended: {
			$title: "Suspended",
			$type: "boolean",
			$default: false
		},
		logLevel: {
			$title: "Log level",
			$enum: [{
				$value: "error",
				$title: "Errors only"
			}, {
				$value: "warning",
				$title: "Errors and Warnings"
			}, {
				$value: "all",
				$title: "All"
			}],
			$default: "all"
		},
		processSummary: {
			$title: "Task",
			$compute: function(_, instance) {
				var proc = instance.process(_);
				if (!proc) return;
				return proc.$getSummary(_);
			}
		}
	},
	$init: function(_, instance) {
		//instance.process(_, instance._db.getEntity(_, "searchAdmin").createInstance(_, instance._db));
	},
	$relations: {
		process: {
			$title: "Settings",
			$variants: {
				searchAdmin: {
					$type: "searchAdmin",
					$isChild: true
				},
				exportPersonalization: {
					$type: "exportPersonalization",
					$isChild: true
				},
				profileMenuImport: {
					$type: "profileMenuImport",
					$isChild: true
				},
				x3Task: {
					$type: "x3Task",
					$isChild: true
				},
				ldap: {
					$type: "ldap",
					$isChild: false
				}
			},
			$isDynamicType: true, // TODO: remove, should be replaced by $variants

			$isHidden: true
		},
		user: {
			$title: "User",
			$type: "user",
			$isMandatory: true
		},
		role: {
			$title: "Role",
			$type: "role",
			$isMandatory: true
		},
		locale: {
			$title: "Locale",
			$type: "localePreference",
		}
	},
	$functions: {
		_logMessages: function(_, diags) {
			var task = this;
			AdminHelper.logServerMessage(_, task.description(_), (task.logLevel(_) === "all") ? diags : diags.filter_(_, function(_, d) {
				if (d.severity === "error") return true;
				if ((task.logLevel(_) === "warning") && (d.severity === "warning")) return true;
				return false;
			}));
		},
		run: function(_, diagnoses, newSession) {
			try {
				var p = this.process(_);
				if (!p) throw new Error(locale.format(module, "taskProcessUndefined", this.description(_)));
				if (!p.scheduledExecute) throw new Error(locale.format(module, "taskProcessExecuteUndefined", this.description(_)));
				var diags = diagnoses || [];
				// create a new session for this task
				var session = globals.context.session;
				var sessionOld = session;
				var reqOld = globals.context.request;
				var respOld = globals.context.response;
				if (newSession) {
					globals.context.request = undefined;
					globals.context.response = undefined;
					session = sessionManager.createBatchSession(_, this.user(_), this.role(_), this.locale(_), diags);
					newSession = true;
				}
				var oldInstance = globals.context.automateInstance;
				globals.context.automateInstance = this._parent;
				if (session) {
					try {
						var task = this;
						p.scheduledExecute(_, diags);
						// logs
						task._logMessages(_, diags);
					} catch (e) {
						diags.push({
							$severity: "error",
							$message: "Execution error " + e,
						});
						task._logMessages(_, diags);
						throw e;
					} finally {
						if (newSession) sessionManager.deleteSession(_, session.id) // do not delete existing session;
						globals.context.session = sessionOld; // restore old session in context
						globals.context.request = reqOld;
						globals.context.response = respOld;
					}
				} else {
					diags.push({
						$severity: "error",
						$message: locale.format(module, "noSession", this.description(_))
					});
					console.error("Could not create session " + require('util').format(diags));
				}
			} catch (e) {
				diags.push({
					$severity: "error",
					$message: "Environment error " + e,
					$stack: e.stack
				});
				console.error("Environment error " + e + " " + e.stack);
			} finally {
				globals.context.automateInstance = oldInstance;
			}
		}
	}
};