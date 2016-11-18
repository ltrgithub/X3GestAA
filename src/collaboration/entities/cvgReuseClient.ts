"use strict";

var cvgReuseList = require('syracuse-x3/lib/cvgListReuse');

// This entity is not persistent
// Data are provided on demand by cvg.cvgAdmReuseClients
exports.entity = {
	$lockType: "noLock",
	$canDelete: false,
	$canCreate: false,
	$canEdit: false,
	$capabilities: "",
	$isPersistent: false,
	$titleTemplate: "X3 reuse client",
	$descriptionTemplate: " ",
	$valueTemplate: " ",
	$helpPage: "Administration-reference_Clients-reused-list",
	$properties: {
		x3host: {
			$title: "x3Host",
			$displayLength: 10
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
			$displayLength: 8
		},
		x3user: {
			$title: "x3User",
			$displayLength: 7
		},
		x3lang: {
			$title: "x3Lang",
			$displayLength: 5
		},
		x3pid: {
			$title: "X3Pid",
			$displayLength: 5
		},
		timeout: {
			$title: "Timeout(sec)",
			$displayLength: 7
		},
		open: {
			$title: "Open",
			$displayLength: 4,
			$type: "boolean",
		},
		creationDate: {
			$title: "Creation date",
			$type: "datetime",
			$displayLength: 7
		},
		cid: {
			$title: "Client id",
			$displayLength: 20,
			$isHidden: true,
		}
	},
	$relations: {},
	$functions: {
		$setId: function(_, context, id) {
			// instance as the same id as cvgSession
			var cliInfo = cvgReuseList.cvgAdmReuseClients(_, id);
			// error could occur if kill service is called on a client which has been closed by timeout (list must be refreshed before kill action)
			if (cliInfo.length === 0) throw new Error("Client not found in reused list\nid=" + id);
			cliInfo = cliInfo[0];
			// fulfill instance
			for (var p in cliInfo) {
				this[p](_, cliInfo[p]);
			}
		}
	},
	$services: {
		kill: {
			$method: "GET",
			$confirm: "This operation will close the X3 client.\n\nDo you want to continue ?",
			$isMethod: true,
			$title: "Close client",
			$execute: function(_, context, instance) {
				try {
					var inst = instance;
					if (inst) {
						cvgReuseList.cvgAdmReuseKill(_, inst.cid(_));
					} else throw new Error("Instance not found in context");
					return {
						$diagnoses: [{
							$severity: "info",
							$message: "X3 client has been closed"
						}]
					};
				} catch (e) {
					return {
						$diagnoses: [{
							$severity: "error",
							$message: e.message,
							$stacktrace: e.safestack
						}]
					};
				}
			}
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var result = [],
			self = this;
		var entity = context.db.model.getEntity(_, "cvgReuseClient");
		var cliInfos = cvgReuseList.cvgAdmReuseClients(_);
		cliInfos.forEach_(_, function(_, info) {
			var inst = entity.factory.createInstance(_, null, context.db);
			for (var p in info) {
				if (inst[p]) inst[p](_, info[p]);
			}
			// same uid as client in order to be able to retrieve the instance in context.instance - see kill service
			inst.$uuid = info.cid;
			result.push(inst);
		});
		return result;
	},
	$defaultOrder: [
		["x3host", true],
		["x3port", true],
		["x3folder", true]
	]
};