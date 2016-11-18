"use strict";
var locale = require('streamline-locale');
var config = require('config');
var mock = require('syracuse-load/lib/mock');
var util = require('util');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var clusterData;

//collect up-to-date status information from servers including ping times to child processes
exports.collectClusterData = function(_) {
	if (config.mockServer) {
		var options = {
			path: "/nannyCommand/notifyNannies/children",
			method: "GET"
		};
		try {
			var text = mock.simpleRequest(config.mockServer.mockClient, options, null, _);
			console.log("TEXT from notifyNannies: " + text);
			var lines = text.split(/[\r\n]+/);
			lines.forEach(function(line) {
				if (line.charAt(0) === '[') {
					clusterData = JSON.parse(line);
				}
			});
			lines.forEach(function(line) {
				if (line.charAt(0) === '{') {
					var childData = JSON.parse(line);
					var hostname = childData.hostname;
					clusterData.forEach(function(host) {
						if (host.hostname === hostname && childData.port) {
							var info = childData.port + " requests " + childData.requests + " ping " + childData.message + "ms; ";
							host.childInformation = (host.childInformation || "") + info;
							host.children = host.children || 1;
							if (host.children <= +childData.port.substr(1)) host.children = 1 + (+childData.port.substr(1));
						}
					});
				}
			});
			// clusterData = JSON.parse(text);
			console.log("RES1 " + util.format(clusterData));
			return clusterData;
		} catch (e) {
			console.error("Error " + e);
			return null;
		}
	}
	return null;
};

exports.entity = {
	$canCreate: false,
	$helpPage: "Administration-reference_Host",
	$properties: {
		hostname: {
			$title: "Host name",
			$isMandatory: true,
			$isUnique: true,
			$linksToDetails: true
		},
		children: {
			$title: "Number of child processes",
			$isMandatory: true,
			$type: "integer",
			$minimum: 1,
			$minimumCanEqual: true
		},
		wsChildren: {
			$title: "Number of Web service child processes",
			$type: "integer",
			$default: 0,
			$minimum: 0,
			$minimumCanEqual: true
		},
		deactivated: {
			$title: "deactivated",
			$type: "boolean",
			$default: false
		},
		started: {
			$title: "started",
			$type: "boolean",
			$default: false,
			$isReadOnly: true
		},
		status: {
			$title: "Status",
			$isReadOnly: true,
			$type: "integer",
			$default: -1000,
			$enum: [{
				$value: 5,
				$title: "finish all"
			}, {
				$value: 4,
				$title: "finishing"
			}, {
				$value: 3,
				$title: "OK"
			}, {
				$value: 2,
				$title: "starting"
			}, {
				$value: 1,
				$title: "init"
			}, {
				$value: 0,
				$title: "inactive"
			}, {
				$value: -1,
				$title: "low version"
			}, {
				$value: -2,
				$title: "wrong version"
			}, {
				$value: -3,
				$title: "time difference"
			}, {
				$value: -4,
				$title: "respawn limit"
			}, {
				$value: -5,
				$title: "unknown"
			}, {
				$value: -6,
				$title: "unreachable"
			}, {
				$value: -7,
				$title: "not started"
			}, {
				$value: -8,
				$title: "no database"
			}, {
				$value: -9,
				$title: "no license"
			}, {
				$value: -1000,
				$title: "-"
			}],
			$compute: function(_, instance) {
				return -1000;
			}
		},
		security: {
			$title: "Security",
			$type: "boolean",
			$default: false,
			$compute: function(_, instance) {
				return false;
			}
		},
		tcpHostName: {
			$title: "TCP host name",
			$isReadOnly: true
		},
		version: {
			$title: "code version",
			$isReadOnly: true,
			$default: "-"
		},
		missingCert: {
			$title: "missing certificates",
			$isReadOnly: true,
			$default: "-",
			$compute: function(_, instance) {
				return "-";
			}
		},
		missingCA: {
			$title: "missing CA certificates",
			$isReadOnly: true,
			$default: "-",
			$compute: function(_, instance) {
				return "-";
			}
		},
		untrusted: {
			$title: "untrusted hosts",
			$isReadOnly: true,
			$default: "-",
			$compute: function(_, instance) {
				return "-";
			}
		},
		pid: {
			$title: "PID",
			$type: "integer",
			$default: 0,
			$isReadOnly: true
		},
		respawnCount: {
			$title: "Respawn limit",
			$type: "integer",
			$default: 10
		},
		respawnTime: {
			$title: "Respawn time",
			$type: "integer",
			$default: 120
		},
		returnRequestTimeout: {
			$title: "Return request timeout",
			$type: "integer",
			$default: 20
		},
		childInformation: {
			$title: "Child process information",
			$isReadOnly: true,
			$compute: function(_, instance) {
				return "";
			}
		},
		patchStatus: {
			$title: "Patch status",
			$isReadOnly: true,
			$isHidden: true
		}
	},

	$titleTemplate: "{hostname}",
	$valueTemplate: "{hostname}",
	$summaryTemplate: "Host {hostname}",
	$descriptionTemplate: "Syracuse hosts",
	$relations: {
		connectionData: {
			$title: "Connections",
			$type: "connectionDatas",
			$isChild: true,
			$isMandatory: true,
			$inv: "host"
		},
		ownCertificates: {
			$title: "Own certificates",
			$type: "certificates",
			$inv: "server",
			$isReadOnly: true,
			$isComputed: true,
			$cascadeDelete: true
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		var db = adminHelper.getCollaborationOrm(_);
		var hosts = db.fetchInstances(_, db.model.getEntity(_, "host"), {});
		if (config.mockServer) {
			var options = {
				path: "/nannyCommand/infojson",
				method: "GET"
			};
			try {
				var text = mock.simpleRequest(config.mockServer.mockClient, options, null, _);
				clusterData = JSON.parse(text);
				console.log("RES " + util.format(clusterData));
			} catch (e) {
				console.error("Error " + e);
			}
		}
		return hosts;
	},
	$functions: {
		$setId: function(_, context, id) {
			return;
		},
		$onDelete: function(_) {
			if (!this.deactivated(_)) throw new Error(locale.format(module, "notDisabled", this.hostname(_)));
			var certs = this.ownCertificates(_).toArray(_);
			certs.forEach(function(cert) { // allow deletion of not deletable internal certificates
				cert.__syracuse_allow_delete__ = true;
			});
			return;
		},
		$serialize: function(_) {
			// dynamicaly define the $select link
			var self = this;
			var res = self._internalSerialize(_);
			// console.log("SERIALIZE "+("mockDataChange" in self))			
			if (clusterData) {
				var currentHosts = clusterData;
				var j = currentHosts.length;
				while (--j >= 0) {
					if (currentHosts[j].hostname === res.hostname) {
						console.log("SET");
						var current = currentHosts[j];
						res.version = current.version;
						res.status = current.status;
						res.missingCert = current.missingCert ? current.missingCert.join(" ") : "-";
						res.missingCA = current.missingCA ? current.missingCA.join(" ") : "-";
						res.untrusted = current.untrusted ? current.untrusted.join(" ") : "-";
						res.security = current.missingCert && current.missingCert.length === 0 && current.missingCA && current.missingCA.length === 0 && current.untrusted && current.untrusted.length === 0;
						if (current.childInformation) {
							res.childInformation = current.childInformation;
						}
						break;
					}
				}
			} else {
				res.status = -1000; // dummy value
				res.childInformation = "";
			}
			// console.log("SER "+util.format(res))			
			return res;
		},
	},
	$services: {
		runtime: {
			$method: "post",
			$title: "Runtime information",
			$isMethod: true,
			$execute: function(_, context, instance) {
				clusterData = exports.collectClusterData(_);
			}
		},
		details: {
			$method: "post",
			$title: "Detail information",
			$isMethod: true,
			$execute: function(_, context, instance) {
				if (config.mockServer) {
					var options = {
						path: "/nannyCommand/notifyNannies/details",
						method: "GET",
						hostname: "",
						port: 0
					};
					try {
						var text = mock.simpleRequest(config.mockServer.mockClient, options, null, _);
						console.log("TEXT " + text);
						var lines = text.split(/[\r\n]+/);
						lines.forEach(function(line) {
							if (line.charAt(0) === '[') {
								clusterData = JSON.parse(line);
							}
						});
						lines.forEach(function(line) {
							if (line.charAt(0) === '{') {
								var childData = JSON.parse(line);
								var hostname = childData.hostname;
								clusterData.forEach(function(host) {
									if (host.hostname === hostname && childData.port) {
										var info = childData.port + " data " + childData.message + "; ";
										host.childInformation = (host.childInformation || "") + info;
									}
								});
							}
						});
						// clusterData = JSON.parse(text);
						console.log("RES2 " + util.format(clusterData));
					} catch (e) {
						console.error("Error " + e);
					}
				}
			}
		}
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// there must be at least one active connection
				var connectionData = instance.connectionData(_).toArray(_, true);
				if (connectionData.length === 0) {
					instance.$addError(locale.format(module, "noConnection"));
					return;
				}
				if (!connectionData[0].active(_)) {
					instance.$addError(locale.format(module, "firstConnActive"));
					return;
				}
				if (connectionData[0].clientAuth(_)) { // at the moment: SSL with client auth for internal communication only with internal certificates
					var clientCert = connectionData[0].clientCert(_);
					var serverCert = connectionData[0].serverCert(_);
					if (clientCert || !connectionData[0].serverCert(_).internal(_)) {
						instance.$addError(locale.format(module, "noInternalCert"));
					}
				}
				var ports = [];
				connectionData.forEach_(_, function(_, conn) {
					var port = conn.port(_);
					if (ports.indexOf(port) >= 0) {
						instance.$addError(locale.format(module, "doublePort", port));
						return;
					}
					ports.push(port);
				});
			}
		],
		$afterSave: [

			function(_, instance) { // update nanny processes unless special marker property has been set
				if (config.mockServer && !instance.syracuseNoNotifyMarker) {
					var options = {
						path: "/nannyCommand/notifyNannies/update",
						method: "PUT"
					};
					try {
						console.log(mock.simpleRequest(config.mockServer.mockClient, options, null, _));
					} catch (e) {
						console.log("Error " + e);
					}
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["hostname"]
	},
	$actions: {
		$save: function(_, instance) {
			var r = {};
			// servers will only restart when within a cluster
			// if (!config.mockServer) return r;
			var connectionData = instance.connectionData(_).toArray(_);
			// get original instance from database
			var db = adminHelper.getCollaborationOrm(_);
			var oldInstance = db.fetchInstance(_, db.model.getEntity(_, "host"), {
				$jsonWhere: {
					$uuid: instance.$uuid
				}
			});
			if (!oldInstance) throw new Error("Host not available");
			var oldConnections = oldInstance.connectionData(_).toArray(_);
			for (var i = oldConnections.length - 1; i >= 0; i--) {
				var oldConn = oldConnections[i];
				var conn = connectionData[i];
				if (oldConn.active(_) && (!conn || (conn.$isDeleted && !conn.$created) || !_compareConnection(_, oldConn, conn))) {
					r.$confirm = locale.format(module, "restart", instance.hostname(_));
					break;
				}
			}
			return r;
		}
	},
	$defaultOrder: [
		["hostname", true]
	]
};

//returns true when connections are equal
function _compareConnection(_, conn1, conn2) {
	if (+conn1.port(_) !== +conn2.port(_) || !conn1.active(_) !== !conn2.active(_)) return false;
	var ssl = conn1.ssl(_);
	if (!ssl !== !conn2.ssl(_)) return false;
	if (ssl) {
		var s1 = conn1.serverCert(_);
		var s2 = conn2.serverCert(_);
		if (!s1 !== !s2) return false;
		if (s1 && s1.name(_) !== s2.name(_)) return false;
		var clientAuth = conn1.clientAuth(_);
		if (!clientAuth !== !conn2.clientAuth(_)) return false;
		if (clientAuth) {
			var c1 = conn1.clientCert(_);
			var c2 = conn2.clientCert(_);
			if (!c1 !== !c2) return false;
			if (c1 && c1.name(_) !== c2.name(_)) return false;
		}
	};
	return true;
}