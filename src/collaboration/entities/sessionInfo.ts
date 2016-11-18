"use strict";

var os = require("os");
var globals = require('streamline-runtime').globals;
var sessionManager = require('../../../../src/session/sessionManager').sessionManager;
var util = require('util');
var config = require('config');
var locale = require('streamline-locale');

var ez = require("ez-streams");
var x3Logs = require("syracuse-x3/lib/x3Logs");
var pool = require("syracuse-x3/lib/pool");
var sadFsq = require('syracuse-x3/lib/clients/sadfsq/sadfsqClient');
var uuid = require('@sage/syracuse-core').helpers.uuid;
var SadFsqClient = sadFsq.SadFsqClient;


function MemoryStore(userName) {
	this.userName = userName;
}

var memoryStore = MemoryStore.prototype;

memoryStore.getProperties = function(_) {
	if (this.dumpLength)
		return this.dumpLength ? {
			contentType: "",
			fileName: "proxy",
			length: this.dumpLength || 0
		} : undefined;
};

memoryStore.createReadableStream = function(_) {
	return ez.devices.buffer.reader(this.dump);
};

memoryStore.fileExists = function(_) {
	this.dump = undefined;
	var up = globals.context.session && globals.context.session.getUserProfile(_);
	if (up) {
		var endpoint = up.selectedEndpoint(_);
		var epLogin = up.user(_).getEndpointLogin(_, endpoint.$uuid).toLowerCase();
		var login = "" + this.userName.toLowerCase();

		if (login === epLogin) {
			var service = endpoint.getService(_, "memoryDump");
			if (service) { // avoid NPE
				var path = service.file;
				if (path !== null) {
					var sadfs = new SadFsqClient(_, endpoint, null, null, false);
					this.dumpLength = sadfs.stat(_, {
						path: path
					}, ["size"]).size;

					this.dump = sadfs.readFile(_, {
						path: path
					}, {
						flag: "r",
						encoding: "utf-8"
					});
					sadfs.unlink(_, {
						path: path
					});
				}

			}
		}
	}
	return (this.dump !== undefined);
};
memoryStore.setFile = function(_, fileName) {};
memoryStore.read = function(_, len) {};
memoryStore.write = function(_, buffer, options) {};
memoryStore.deleteFile = function(_) {};
memoryStore.close = function(_) {};
memoryStore.getUuid = function() {
	return uuid.generate();
};


function getEndpointLogin(_) {
	var up = globals.context.session && globals.context.session.getUserProfile(_);
	if (!up) return "";
	var endpoint = up.selectedEndpoint(_);
	return endpoint ? "" + up.user(_).getEndpointLogin(_, endpoint.$uuid).toLowerCase() : "";
}


exports.entity = {
	$lockType: "noLock",
	$canDelete: false,
	$canCreate: false,
	$canEdit: false,
	$sequentialStorage: true, // uses a funnel to storage
	$titleTemplate: "Session status",
	$descriptionTemplate: "Provides http sessions status",
	$valueTemplate: "{userName}/{ssid}",
	$helpPage: "Administration-reference_Session-Infos",
	$queryLinks: {
		licenseData: {
			$title: "License follow-up",
			"$url": "{$baseUrl}/licenseViews('ALL')?representation=licenseView.$details",
			"$method": "GET"
		}
	},
	$properties: {
		sid: {
			$title: "Session id",
			$serialize: false
		},
		userName: {
			$title: "User name"
		},
		lastAccess: {
			$title: "Last user access",
			$type: "datetime"
		},
		serverName: {
			$title: "Server name",
			$default: function(_) {
				return config.servername;
			}
		},
		dataset: {
			$title: "Dataset",
		},
		badge: {
			$title: "Badge"
		},
		sessionType: {
			$title: "session Type",
			$isReadOnly: true,
			$enum: [{
				$value: "restful",
				$title: "Restful"
			}, {
				$value: "soap",
				$title: "SOAP"
			}, {
				$value: "standard",
				$title: "Standard"
			}],
			$compute: function(_, instance) {
				var last = instance.lastUrl(_);
				// SESSIONTYPE: when you change this, you have also to change the code in src/license/check marked with SESSIONTYPE
				if (last) {
					if (/^\/api\d+\//.test(last)) return "restful";
					if (/^\/soap-generic\//.test(last)) return "soap";
				}
				return "standard";
			},
			$default: "standard"
		},
		clientId: {
			$title: "Client ID"
		},
		lastUrl: {
			$title: "last URL"
		},
		x3Sessions: {
			$title: "X3 sessions"
		},
		peerAddress: {
			$title: "Peer address"
		},
		pid: {
			$title: "Process Id"
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
				return (instance.cpuGraphStore = (instance.cpuGraphStore || new x3Logs.LogStore(_, "image/svg+xml", getEndpointLogin(_))));
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
				return (instance.logStore = (instance.logStore || new x3Logs.LogStore(_, "x-trace", getEndpointLogin(_))));
			}
		},
		memoryDump: {
			$title: "Memory Dump",
			$type: "binary",
			$isReadOnly: true,
			$storage: "proxy",
			$isDisabled: function(_, instance) {
				return false;
			},
			$compute: function(_, instance) {
				return (instance.memoryStore = (instance.memoryStore || new MemoryStore(getEndpointLogin(_))));
			}
		},
		samlNameId: {
			$title: "SAML Name Id"
		},
		samlSession: {
			$title: "SAML Session"
		}
	},
	$relations: {},
	$functions: {
		$canDelete: function(_) {
			var self = this;
			if (globals.context.session && globals.context.session.sid && (globals.context.sid == this.sid(_))) {
				self.deleteError = "Cannot delete current session";
				return false;
			} else return true;
		}
	},
	$services: {
		disconnect: {
			$method: "POST",
			$isMethod: true,
			$title: "Disconnect",
			$execute: function(_, context, instance) {
				if (globals.context.session && globals.context.session.id && (globals.context.session.id == instance.sid(_))) {
					instance.$addError(locale.format(module, "disconnectCurrent"));
					return;
				}
				// The session to disconnect might be on another server / process, so we do a request to logout using the session cookie
				var logoutURL = context.url.split("/").splice(0, 3).join("/") + "/logout?force=true";
				var resp;
				try {
					resp = ez.devices.http.client({
						url: logoutURL,
						method: "POST",
						headers: {
							cookie: sessionManager.formatSessionCookie(instance.sid(_), globals.context.request.connection.localPort)
						}
					}).end().response(_).readAll(_);
				} catch (e) {
					// when server cannot be reached, it will be assumed that session does not exist any more
					instance.$addDiagnose("warning", locale.format(module, "errorConnect"), null, null, e.safeStack);
				}
				//
				if (resp) {
					resp = JSON.parse(resp);
					if (resp.$diagnoses) resp.$diagnoses.forEach(function(d) {
						if (d.$severity === "success") instance.$addDiagnose("success", locale.format(module, "disconnected"));
						else instance.$addDiagnose(d.$severity, d.$message);
					});
				}
				instance.deleteSelf(_);
				return;
			}
		},

		/*		testRestrict: {
			$method: "POST",
			$isMethod: true,
			$title: "Test restrict",
			$execute: function(_, context, instance) {
				require("../../../../src/session/sessionManager").gentlyTerminate(_, "sessionInfo", true);
			}
		}*/
	},
	$fetchInstances: function(_, context, parameters) {
		// delete count - see SAM 116736 and github issue 8677
		delete parameters.count;
		// fetchInstances filters do not allow regex ???
		var insts = context.db.fetchInstances(_, context.db.model.getEntity(_, "sessionInfo"), parameters);
		var result = [];
		insts.forEach_(_, function(_, inst) {
			if (inst.userName(_).indexOf("!none!") === -1) result.push(inst);
		});
		return result;
	},
	$defaultOrder: [
		["lastAccess", true]
	],
	$expire: function(_, instance) {
		// set in hard the value, it will be configured after
		if (config.session.timeout) { // timeout + 1 
			return (config.session.timeout + 10) * 60000;
		}
	}
};