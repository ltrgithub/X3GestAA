"use strict";

var globals = require('streamline-runtime').globals;
var flows = require('streamline-runtime').flows;
var tracer = require('@sage/syracuse-core').getTracer("x3Comm.loadBalancer");

function hasErrors(body, k) {
	var msg;
	var hasErr = body && body.$diagnoses && body.$diagnoses.some(function(diag) {
		if (diag.$severity === "error") {
			msg = "Error related to field " + k + " : " + diag.$message;
			return msg;
		} else return false;
	});
	if (!hasErr) {
		for (var key in body) {
			if (typeof body[key] === "object") {
				hasErr = hasErr || hasErrors(body[key], key);
				if (hasErr) return hasErr;
			}
		}
	}
	return msg || hasErr;
}

exports.entity = {
	$titleTemplate: "X3 server",
	$descriptionTemplate: "X3 server settings",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Sage-ERP-X3-Servers",
	$isPersistent: false,
	$properties: {
		description: {
			$title: "Description",
			$description: "Friendly name",
			$isMandatory: true,
			$isLocalized: true,
			$isUnique: true,
			$compute: function(_, instance) {
				return instance.serverHost(_) + ":" + instance.serverPort(_);
			},
			$isHidden: true
		},
		serverHost: {
			$title: "Server host",
			$description: "Physical server name or IP address",
			$isMandatory: true
		},
		serverPort: {
			$title: "Server port",
			$type: "integer",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (instance.tag(_) === 'MAIN') {
					instance._parent.serverPort(_, val);
				}
			}
		},
		tag: {
			$title: "Server TAG",
			//			$pattern: function(_, instance) {
			//				if (instance._parent) return instance.serverHost(_) === instance._parent.serverHost(_) && instance.serverPort(_) === instance._parent.serverPort(_) ? ".*" : "^(?!MAIN$).*$";
			//				return true;
			//			},
			//			$patternMessage: "'MAIN' tag is reserved for main server",
		},
		exclusive: {
			$title: "Tag exclusive",
			$description: "The tag is exclusive to use this process server",
			$type: "boolean",
			$default: false
		},
		banTimeout: {
			$title: "Banishment timeout",
			$type: "integer",
			$default: 60 // minutes
		},

		banned: {
			$title: "Banned",
			$description: "Banned because unavailable (Duration: 1 hour)",
			$type: "boolean",
			$default: false,
			$propagate: function(_, instance, val) {
				function saveParent(_) {
					// reset the counter of error try on the server
					instance.errorTry(_, 0);
					var s = instance._parent.save(_);
					var err = hasErrors(s);
					if (err) {
						throw new Error(err);
					}
					tracer.info && tracer.info("X3 Server '" + instance.description(_) + "' is not banned anymore");
				}
				if (val) {
					flows.setTimeout(function(_) {
						instance.banned(_, false); // will be call saveParent on propagation
					}, instance.banTimeout(_) * 60000 || 3600000);
				} else if (val === false && instance._parent) {
					saveParent(_);
				}
			}
		},
		errorTry: {
			$title: "error try",
			$description: "number of try before setting the server as banned",
			$type: "integer",
			$isHidden: true,
			$default: 0,
			$isNullable: true
		},
		autoConfig: {
			$title: "Auto config",
			$type: "boolean",
			$default: false
		},
		disabled: {
			$title: "Disabled",
			$type: "boolean",
			$default: false
		},

	},
	$functions: {
		stringify: function(_) {
			return {
				uuid: this.$uuid,
				host: this.serverHost(_),
				port: this.serverPort(_),
				tags: this.tag(_),
				exclusive: this.exclusive(_),
				banned: this.banned(_),
				disabled: this.disabled(_)
			};
		},
		useProxy: function(_) {
			return this._parent.proxy(_);
		},
		bannish: function(_) {
			var hasAvailSrv = false;
			try {
				// disable security check on load because security checks prevent x3solution save in some cases
				globals.context.session && globals.context.session.setData && globals.context.session.setData("securityProfileEnabled", false);

				var s, err;
				// check if the error try is > 5 we bannish the server else we don't bannish it to let it retry
				if (this.tag(_) !== "MAIN") {
					if (this.errorTry(_) >= 5) {
						this.banned(_, true);
						s = this._parent.save(_, null, {
							clearDiagnoses: true
						});
						err = hasErrors(s);
						if (err) {
							throw new Error(err);
						}
						tracer.info && tracer.info("X3 Server '" + this.description(_) + "' banned for " + this.banTimeout(_) + " minute(s)");
						// return true, x3solution have other x3server not banned
					} else {
						var errtry = this.errorTry(_) || 0;
						this.errorTry(_, errtry + 1); // increment counter
						s = this._parent.save(_, null, {
							clearDiagnoses: true
						});
						err = hasErrors(s);
						if (err) {
							throw new Error(err);
						}
						tracer.info && tracer.info("X3 Server '" + this.description(_) + "' errorTry  " + this.errorTry(_));

					}
					hasAvailSrv = this._parent.runtimes(_).toArray(_).some_(_, function(_, r) {
						return !r.banned(_) && !r.disabled(_);
					});
				} else {
					hasAvailSrv = this._parent.runtimes(_).toArray(_).some_(_, function(_, r) {
						return !r.banned(_) && !r.disabled(_) && r.tag(_) !== "MAIN";
					});
				}

			} finally {
				// enable security check
				globals.context.session && globals.context.session.setData && globals.context.session.setData("securityProfileEnabled", true);
			}
			return hasAvailSrv;
		},
		checkServer: function(_, folderName, ignoreBan) {
			this.$diagnoses = require("syracuse-x3/lib/pool").checkServerSettings(_, {
				x3server: this,
				applicationServer: this._parent.serverHost(_),
				folder: folderName
			});
			if (!ignoreBan && this.$diagnoses.some(function(d) {
					return d.$severity === "error";
				})) {
				this.bannish(_);
				return false;
			}

			return true;
		},
		isMain: function(_) {
			return this.serverHost(_) === this._parent.serverHost(_) && this.serverPort(_) === this._parent.serverPort(_);
		}
	},
	$services: {
		checkServer: {
			$title: "Check server settings",
			$description: "Attempts to connect to the server",
			$method: "GET",
			$isMethod: true,
			$parameters: {
				folderName: "X3",
				$properties: {
					folderName: {
						$title: "Folder to test",
						$description: "Indicate a X3 folder that can be used to test the connection",
						$type: "application/x-string"
					}
				}
			},
			$execute: function(_, context, instance) {
				try {
					instance.checkServer(_, context && context.parameters && context.parameters.folderName, true);
				} catch (e) {
					(instance.$diagnoses = instance.$diagnoses || []).push({
						severity: "error",
						message: e.message
					});
				}
			}
		}
	},
	$events: {
		$beforeSave: [

			function(_, instance) {
				if (instance.errorTry(_) == null) instance.errorTry(_, 0);
			}
		],
	}
};