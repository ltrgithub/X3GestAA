"use strict";

var sessionManager = require('../../..//src/session/sessionManager').sessionManager;
var config = require('config');
var cvgReuseList = require('syracuse-x3/lib/cvgListReuse');


var x3Logs = require("syracuse-x3/lib/x3Logs");

// This entity is not persistent 
// Data are provided on demand by sessionManager
// Entity data are provided by cvgSession.cvgAdmSessInfo
exports.entity = {
	$lockType: "noLock",
	$canDelete: false,
	$canCreate: false,
	$canEdit: false,
	$capabilities: "",
	$titleTemplate: "Classic session status",
	$descriptionTemplate: " ",
	$helpPage: "Administration-reference_Classic-client-sessions",
	$properties: {
		remoteaddr: {
			$title: "ClientIp",
			$displayLength: 7
		},
		syralogin: {
			$title: "UserLogin",
			$displayLength: 8
		},
		x3host: {
			$title: "x3Host",
			$displayLength: 8
		},
		x3port: {
			$title: "x3Port",
			$displayLength: 5
		},
		x3solution: {
			$title: "x3Solution",
			$displayLength: 8
		},
		x3folder: {
			$title: "x3Folder",
			$displayLength: 7
		},
		x3user: {
			$title: "x3User",
			$displayLength: 6
		},
		x3lang: {
			$title: "x3Lang",
			$displayLength: 5
		},
		x3pid: {
			$title: "X3Pid",
			$displayLength: 5
		},
		lastAccess: {
			$title: "Last access",
			$type: "datetime",
			$displayLength: 9
		},
		timeout: {
			$title: "Timeout(sec)",
			$displayLength: 8
		},
		reused: {
			$title: "Reused",
			$displayLength: 5,
			$type: "boolean",
		},
		open: {
			$title: "Open",
			$displayLength: 4,
			$type: "boolean"
		},
		httpreferer: {
			$title: "Http referer",
			$displayLength: 10
		},
		creationDate: {
			$title: "Creation date",
			$type: "datetime",
			$displayLength: 9
		},
		sid: {
			$title: "Session id",
			$isHidden: true,
		},
		syraid: {
			$title: "Syracuse id",
		},
		cid: {
			$title: "cvgClient id",
			$isHidden: true,
		},
		protocolVersion: {
			$title: "protocol version used",
		},
		cpuGraph: {
			$title: "CPU Graph",
			$type: "binary",
			$isReadOnly: true,
			$storage: "proxy",
			$isDisabled: function(_, instance) {
				return false;
			},
			$compute: function(_, instance) {
				return (instance.cpuGraphStore = (instance.cpuGraphStore || new x3Logs.LogStore(_, "image/svg+xml", instance.x3user(_), instance.x3pid(_))));
			}
		},
		log: {
			$title: "Log",
			$type: "binary",
			$isReadOnly: true,
			$storage: "proxy",
			$isDisabled: function(_, instance) {
				return false;
			},
			$compute: function(_, instance) {
				return (instance.logStore = (instance.logStore || new x3Logs.LogStore(_, "x-trace", instance.x3user(_), instance.x3pid(_))));
			}
		}
	},
	$relations: {},
	/*$functions: {
		$setId: function(_, context, id) {
			// instance as the same id as cvgSession
			var sessInfo = sessionManager.cvgAdmSessInfo(_, id);
			// error could occur if kill service is called on a session which has been closed by timeout (list must be refreshed before kill action)
			if (sessInfo == null) throw new Error("Convergence session not found in list\nid=" + id);
			// fulfill instance
			for (var p in sessInfo) {
				this[p](_, sessInfo[p]);
			}
		}
	},*/
	$services: {
		disconnect: {
			$method: "POST",
			$confirm: "This operation will delete the session and close associated X3 clients.\n\nDo you want to continue ?",
			$isMethod: true,
			$title: "Disconnect",
			$execute: function(_, context, instance) {
				try {
					// retrieve cvgSession instance by the id sent by the client

					if (instance) {
						if (instance.reused(_)) {
							if (!cvgReuseList.cvgAdmReuseKill(_, instance.cid(_))) {
								instance.deleteSelf(_);
							}
						} else {
							var syraSess = sessionManager.sessionById(instance.syraid(_));
							if (syraSess) {
								syraSess.closeCvgSession(instance.sid(_), false, "Closed by administrator", _);
							} else {
								instance.deleteSelf(_);
								//throw new Error("Syracuse session not found\nid=" + instance.syraid(_));
							}
						}
					} else throw new Error("Instance not found in context");
					return {
						$diagnoses: [{
							$severity: "info",
							$message: "Session has been deleted"
						}]
					};
				} catch (e) {
					return {
						$diagnoses: [{
							$severity: "error",
							$message: e.message
						}]
					};
				}
			}
		},
		activateLog: {
			$method: "POST",
			// $confirm: "This operation will change the X3 runtime configuration of all subsequent sessions.\n\nDo you want to continue ?",
			$isMethod: false,
			$title: "Activate X3 log",
			$facets: ["$query"],
			$execute: function(_, context, instance) {
				x3Logs.activate(_, context);
			}
		},
		deactivateLog: {
			$method: "POST",
			// $confirm: "This operation will change the X3 runtime configuration of all subsequent sessions.\n\nDo you want to continue ?",
			$isMethod: false,
			$title: "Deactivate X3 log",
			$facets: ["$query"],
			$execute: function(_, context, instance) {
				x3Logs.deactivate(_, context);
			}
		}
	},
	/*$fetchInstances: function(_, context, parameters) {
		var result = [],
			self = this;
		var entity = context.db.model.getEntity(_, "cvgSession");
		var sessInfos = sessionManager.cvgAdmSessInfos(_);
		sessInfos.forEach_(_, function(_, info) {
			var inst = entity.factory.createInstance(_, null, context.db);
			for (var p in info) {
				if (inst[p]) inst[p](_, info[p]);
			}
			// same uid as convergence session in order to be able to retrieve the instance in context.instance - see kill service
			inst.$uuid = info.sid;
			result.push(inst);
		});
		return result;
	},*/
	$defaultOrder: [
		["remoteaddr", true],
		["syralogin", true]
	],
	$expire: function(_, instance) {
		// set in hard the value, it will be configured after
		if (config.session.timeout) { // timeout + 1 
			return (config.session.timeout + 10) * 60000;
		}
	}

};