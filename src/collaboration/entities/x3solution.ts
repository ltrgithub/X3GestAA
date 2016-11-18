"use strict";

var locale = require('streamline-locale');
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var httpClient = require('../../../../src/http-client/httpClient');
var helpers = require('@sage/syracuse-core').helpers;
var batchHelper = require('syracuse-batch/lib/batchHelper');
var dns = require('dns');
var ez = require('ez-streams');
//var x3pool = require("syracuse-x3/lib/pool");
var adminDb;

var hasErrors = function(body, k) {
	var msg;
	var hasErr = body && body.$diagnoses && body.$diagnoses.some(function(diag) {
		if (diag.$severity === "error") {
			msg = locale.format(module, "relatedFieldErr") + " : " + k + " : " + diag.$message;
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
};

var saveAndCheckErrors = function(_, inst) {
	var sav = inst.save(_);
	var err = hasErrors(sav);
	if (err) {
		throw new Error(err);
	}
};

exports.entity = {
	$titleTemplate: "X3 solution",
	$descriptionTemplate: "X3 solution settings",
	$valueTemplate: "{solutionName}",
	$helpPage: "Administration-reference_X3-solutions",
	$capabilities: "",
	$lockType: "noLock", // to let unban by timeout works
	$properties: {
		code: {
			$title: "Code",
			$description: "Code",
			$isMandatory: true,
			$isUnique: true,
			$isReadOnly: function(_, instance) {
				return !instance.$created;
			}
		},
		description: {
			$title: "Description",
			$description: "Friendly name",
			$isMandatory: true,
			$isLocalized: true,
			$linksToDetails: true,
		},
		solutionName: {
			$title: "Solution name",
			$description: "X3 solution alias",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val && instance.webHostname(_)) instance.synchronize(_);
			}
		},
		serverHost: {
			$title: "Main server host",
			$description: "Physical main X3 server name or IP address",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val && instance.solutionName(_)) instance.synchronize(_);
			}
		},
		serverPort: {
			$title: "Main X3 server port",
			$type: "integer",
			$isMandatory: true,
			$isDisabled: true
		},
		serverTimeout: {
			$title: "Server timeout (ms)",
			$type: "integer",
			$isHidden: true,
			//$isMandatory: true, // commented because not used anywhere
			$default: 60000
		},
		webServer: {
			$title: "Apache server on application server host",
			$description: "If different from \"Main server host\"",
			$propagate: function(_, instance, val) {
				if (val && instance.solutionName(_)) instance.synchronize(_);
			}
		},
		webServerPort: {
			$title: "Apache server on application server port",
			$type: "integer",
			$default: 80,
			$propagate: function(_, instance, val) {
				if (val && instance.solutionName(_)) instance.synchronize(_);
			}
		},
		proxy: {
			$title: "Use Http proxy configuration",
			$type: "boolean",
			$default: false,
			$propagate: function(_, instance, val) {
				if (val != null && instance.solutionName(_) && instance.webHostname(_)) instance.synchronize(_);
			}
		}
	},
	$relations: {
		boServer: {
			$title: "Bo Server",
			$description: "This is the Business Objects Server associated to X3 Solution",
			$type: "boServer"
		},
		batchServer: {
			$title: "Batch Server",
			$description: "This is the Batch Server associated to X3 Solution",
			$type: "batchServer",
			$isReadOnly: true,
			$inv: "x3solution",
			$cascadeDelete: true
		},
		application: {
			$title: "Application",
			$type: "application",
			$isMandatory: true,
			$lookupFilter: {
				protocol: "x3"
			},
		},
		endpoints: {
			$title: "Endpoints",
			$description: "Associated endpoints",
			$type: "endPoints",
			$inv: "x3solution",
			$isComputed: true,
			$capabilities: "sort,filter",
			$isReadOnly: true
		},
		certificate: {
			$title: "Certificate",
			$description: "Certificate used for authentication at this server",
			$type: "certificate",
			$inv: "x3solutions"
		},
		runtimes: {
			$title: "Runtimes",
			$description: "X3 runtimes",
			$type: "x3servers",
			$isChild: true,
		}

	},
	$services: {
		checkMainServer: {
			$title: "Check Main X3 Runtime",
			$description: "Attempts to connect to the server",
			$method: "GET",
			$isMethod: true,
			$facets: ["$details"],
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
				instance.checkRuntime(_, context, function(_, s) {
					return s.tag(_) === "MAIN";
				});
			}
		},
		checkAllServer: {
			$title: "Check All X3 Runtime",
			$description: "Attempts to connect to all X3 process servers",
			$method: "GET",
			$isMethod: true,
			$facets: ["$details"],
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
				instance.checkRuntime(_, context, function(_, s) {
					return !s.disabled(_);
				});
			}
		},
		createEndpoints: {
			$method: "POST",
			$isMethod: true,
			$title: "Create endpoints",
			$facets: ["$details"],
			$parameters: {
				$actions: {
					$select: {
						$url: "{$baseUrl}/lookupX3Folders?representation=lookupX3Folder.$select&x3solutionUuid={$uuid}",
					}
				}
			},
			$execute: function(_, context, instance, parameters) {

				var payload = JSON.parse(context.request.readAll(_));


				if (!payload || !payload.$select) {
					return;
				}
				instance.$diagnoses = instance.$diagnoses || [];
				var alreadyDefined = instance.endpoints(_).toArray(_).map_(_, function(_, ep) {
					return ep.x3ServerFolder(_);
				});

				//console.error("alreadyDefined: " + JSON.stringify(alreadyDefined, null, 2));
				var folders = payload.$select.map(function(f) {
					return f.name;
				}).filter(function(name) {
					var toCreate = alreadyDefined.indexOf(name) === -1;
					if (!toCreate) instance.$diagnoses.push({
						severity: "warning",
						message: locale.format(module, "epAlreadySet", name)
					});
					return toCreate;
				});

				if (folders.length > 0) {
					folders.forEach_(_, function(_, f) {
						instance.createEndpoint(_, f);

					});
					instance.save(_);
				}

			},
		},
	},
	$searchIndex: {
		$fields: ["solutionName", "serverHost", "serverPort", "webServer", "endpoints"]
	},
	$functions: {
		webHostname: function(_) {
			return this.webServer(_) || this.serverHost(_);
		},
		baseUrl: function(_) {
			return "http://" + this.webHostname(_) + (this.webServerPort(_) ? ":" + this.webServerPort(_) : "");
		},
		checkRuntime: function(_, context, filterFunc) {
			var self = this;
			this.$diagnoses = this.$diagnoses || [];
			var servers = this.runtimes(_).toArray(_);
			if (filterFunc) servers = servers.filter_(_, filterFunc);
			servers.forEach_(_, function(_, s) {
				try {
					self.$diagnoses.push(require("syracuse-x3/lib/pool").checkServerSettings(_, {
						x3server: s,
						applicationServer: self.serverHost(_),
						folder: context && context.parameters && context.parameters.folderName
					})[0]);
				} catch (e) {
					(self.$diagnoses = self.$diagnoses || []).push({
						severity: "error",
						message: e.message
					});
				}
			});

		},
		isMainRuntime: function(_, serverHost, serverPort) {
			var main = this.runtimes(_).toArray(_).filter_(_, function(_, item) {
				return item.tag(_) === "MAIN";
			});
			if (!main || !main.length) {
				return false;
				//throw new Error(locale.format(module, "noRuntimeMain", this.solutionName(_)));
			}

			return main[0].serverHost(_) === serverHost && main[0].serverPort(_) === serverPort;
		},
		selectX3Server: function(_, options) {
			return selectX3Server(_, this, options);
		},
		getFoldersJson: function(_) {
			var self = this;
			//
			var url = [self.baseUrl(_), "Adonix_" + self.solutionName(_), "FOLDERS.json"].join("/");
			return (JSON.parse(ez.factory(url).reader(_).readAll(_)) || {}).folders;
		},
		// get list of server matching with tags like 'MAIN,TAG1,TAG2' ...
		getServersByTags: function(_, tags) {
			var servers = this.runtimes(_).toArray(_);
			if (servers.length === 0) throw new Error(locale.format(module, "noX3ServerOnX3Solution", this.solutionName(_)));

			if (tags) {
				if (tags.indexOf(',') > 0) {
					tags = tags.split(',');
				} else {
					tags = [tags];
				}
			}
			return servers.filter_(_, function(_, s) {
				var match = (!tags && !s.exclusive(_)) || (tags && tags.indexOf(s.tag(_)) >= 0);
				return !s.disabled(_) && !s.banned(_) && match;
			});
		},
		// get list of server matching with description like '[host1:port1, host2:port2, ...] ; note: description must be an array !
		getServersByDescription: function(_, descriptions) {
			var servers = this.runtimes(_).toArray(_).filter_(_, function(_, r) {
				return descriptions.indexOf(r.description(_)) !== -1;
			});
			return servers.filter_(_, function(_, s) {
				return !s.disabled(_) && !s.banned(_);
			});
		},
		createEndpoint: function(_, folderName) {
			adminDb = adminDb || adminHelper.getCollaborationOrm(_);
			var srvEnt = adminDb.getEntity(_, "endPoint");
			var ep = srvEnt.createInstance(_, adminDb);
			ep.description(_, this.solutionName(_) + " / " + folderName);
			ep.x3ServerFolder(_, folderName);
			ep.dataset(_, this.solutionName(_) + "_" + folderName);
			ep.applicationRef(_, this.application(_));
			ep.x3solution(_, this);
			this.$diagnoses = this.$diagnoses || [];
			try {
				saveAndCheckErrors(_, ep);
				this.endpoints(_).set(_, ep);
				this.$diagnoses.push({
					$severity: "info",
					$message: locale.format(module, "epCreationSuccess", ep.description(_))
				});
				return ep;
			} catch (e) {
				//console.error(e.stack);
				this.$diagnoses.push({
					$severity: "warning", // do not set 'error' severity because it is blocking for batch server creation !!!
					$message: locale.format(module, "epCreationErr", ep.description(_), e.message)
				});
			}

		},
		getEp: function(_, folderName) {
			var eps = this.endpoints(_).toArray(_).filter_(_, function(_, ep) {
				return ep.x3ServerFolder(_) === folderName;
			});
			if (eps.length > 0) return eps[0];
		},
		synchronize: function(_) {
			var self = this;
			this.$diagnoses = this.$diagnoses || [];

			adminDb = adminDb || adminHelper.getCollaborationOrm(_);
			var srvEnt = adminDb.getEntity(_, "x3server");
			var solName = this.solutionName(_);
			var mainHost = this.serverHost(_);
			var mainPort = this.serverPort(_);
			// get the ip of the main host to compare with runtime in order to determine the main server
			// for unit test
			var ipMainHosts;
			if (mainHost !== "dummyhost") {
				try {
					ipMainHosts = dns.lookup(mainHost, 4, _);
				} catch (e) {
					this.$addDiagnose("warning", locale.format(module, "cantAccessHost", mainHost));
					return;
				}
				if (!Array.isArray(ipMainHosts))
					ipMainHosts = [ipMainHosts];
			} else {
				ipMainHosts = ["dummyhost"];
			}

			var options = {
				method: "GET",
				url: this.baseUrl(_) + "/Adonix_" + solName + "/solution.json",
				headers: {}
			};
			if (!this.proxy(_)) options.ignoreProxy = true;
			var data;
			try {

				var request = httpClient.httpRequest(_, options);
				request.setTimeout(500);
				var resp = request.end().response(_);
				data = resp.readAll(_);
				if (+resp.statusCode === 404) { // file not found
					this.$addDiagnose("warning", locale.format(module, "cantAccessSol", options.url));
					return;
				}
				if (resp.statusCode !== 200) {
					this.$addDiagnose("warning", locale.format(module, "cantAccessSolutionJson", options.url));
					return;
				}
			} catch (e) {
				this.$addDiagnose("warning", locale.format(module, "cantAccessPort", options.url));
				return;
			}


			if (data) {
				var jsonSolution;
				try {
					jsonSolution = JSON.parse(data);
				} catch (e) {
					this.$addDiagnose("error", locale.format(module, "cantParseSolutionJson", e.message, options.url));
					return;
				}

				var runtimes = jsonSolution && jsonSolution.runtimes || [];
				if (runtimes.length === 0) {
					this.$addDiagnose("error", locale.format(module, "noRuntimes", solName));
					return;
				}

				this.serverPort(_, jsonSolution.solution && jsonSolution.solution.mainPort);

				// register every runtimes (x3servers)
				runtimes.forEach_(_, function(_, r) {

					// check if one ip that are resolv is corresponding to be set as a runtime main server
					if (r.server) {
						var ipRuntimes;
						if (r.server !== "dummyHost") { // for unit test
							ipRuntimes = dns.lookup(r.server, 4, _);
							if (!Array.isArray(ipRuntimes))
								ipRuntimes = [ipRuntimes];
						} else {
							ipRuntimes = ["dummyHost"];
						}
						// check when one of the ipRuntime correspond to one of the ipMainHost
						var inter = ipRuntimes.filter(function(ip) {
							return ipMainHosts.indexOf(ip);
						});
						if (!inter.length) {
							self.serverHost(_, r.server);
						}
					}

					var _runtimes = self.runtimes(_).filter(_, {
						jsonWhere: {
							serverHost: r.server,
							serverPort: r.mainPort
						}
					});
					var x3srv = _runtimes && _runtimes.length > 0 && _runtimes[0];
					if (!x3srv) {
						x3srv = srvEnt.createInstance(_, adminDb);

						x3srv.serverHost(_, r.server);
						x3srv.serverPort(_, r.mainPort);

					}

					x3srv.autoConfig(_, true);
					self.runtimes(_).set(_, x3srv);
				});
				this.runtimes(_).toArray(_).forEach_(_, function(_, r) {
					if (r.tag(_) === "MAIN" && (r.serverHost(_) !== self.serverHost(_) || r.serverPort(_) !== self.serverPort(_))) {
						self.runtimes(_).deleteInstance(_, r.$uuid);
					}
					if (r.serverHost(_) === self.serverHost(_) && r.serverPort(_) === self.serverPort(_)) {
						r.tag(_, "MAIN");
					}

				});
				this.$addDiagnose("success", locale.format(module, "syncDone"));

			} else {
				if (!this.runtimes(_).toArray(_).some_(_, function(_, r) {
						return r.serverPort(_) === mainPort && (r.serverHost(_) === mainHost || r.serverHost(_).indexOf('.') && r.serverHost(_).split('.')[0] === mainHost);
					})) {
					var x3srv = srvEnt.createInstance(_, adminDb);

					x3srv.serverHost(_, mainHost);
					x3srv.serverPort(_, mainPort);
					x3srv.tag(_, "MAIN");
					this.runtimes(_).set(_, x3srv);
				}
			}

		}
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// there must be at least one active connection
				var certificate = instance.certificate(_);
				if (certificate && certificate.server(_)) {
					instance.$addError(locale.format(module, "clientNotServer"));
				}
				if (certificate && certificate.internal(_)) {
					instance.$addError(locale.format(module, "noInternal"));
				}
				return;
			}
		],
		$beforeSave: [

			function(_, instance) {
				// this is really important for batch synchronization !!!
				// return true means that we must initialize batch server
				if (propagateToBatchController(_, instance)) {
					try {
						batchHelper.initBatchServer(_, instance);
					} catch (e) {
						console.error(e.stack);
					}
				}
			}
		]
	},
};

var tracer = require('@sage/syracuse-core').getTracer("x3Comm.loadBalancer");

var lbList = [];

var selectX3Server = function(_, solution, options) {

	function getServer(uuid) {
		if (!uuid) return;
		return servers.filter(function(s) {
			return s.$uuid === uuid;
		})[0];
	}

	var startTime = new Date().getTime();
	var server;
	try {

		var solName = solution.solutionName(_);
		options = options || {};
		lbList[solName] = lbList[solName] || [];
		var lbSol = lbList[solName];
		tracer.info && tracer.info("Begin server selection for solution [" + solName + "]");
		tracer.debug && tracer.debug("Selection options: " + JSON.stringify(options, null, 2));

		var servers = solution.runtimes(_).toArray(_);
		if (servers.length === 0) throw new Error(locale.format(module, "noX3ServerOnX3Solution", solution.solutionName(_)));

		// remove banned and disabled servers and 
		var bannedList = [],
			disabledList = [];
		var realList = servers.filter_(_, function(_, s) {
			var isBanned = s.banned(_);
			if (isBanned) {
				bannedList.push(s.$uuid); // this server have to really be bannish
			}
			var isDisabled = s.disabled(_);
			if (isDisabled) disabledList.push(s.$uuid);
			return !isBanned && !isDisabled;
		});
		if (realList.length === 0) throw new Error(locale.format(module, "noUsableServerOnSolution", solution.solutionName(_)));

		// Filter with tags
		var tags = [];
		if (options.tags) {
			if (options.tags.indexOf(',') > 0) {
				tags = options.tags.split(',');
			} else {
				tags = [options.tags];
			}
			var taggedList = realList.filter_(_, function(_, s) {
				//console.error("SERVER: "+s.description(_)+" TAG : "+ s.tag(_) + " index : "+tags.indexOf(s.tag(_)));
				return tags.indexOf(s.tag(_)) >= 0;
			});
			realList = taggedList.length > 0 ? taggedList : realList;
		}

		// do not use servers where tags are exclusive and not matching
		realList = realList.filter_(_, function(_, s) {
			return !s.exclusive(_) || (s.exclusive(_) && tags.indexOf(s.tag(_)) >= 0);
		});

		if (realList.length === 0) throw new Error(locale.format(module, "noTaggedServerOnSolution", solution.solutionName(_)));

		realList = realList.map_(_, function(_, s) {
			return s.stringify(_);
		});
		tracer.debug && tracer.debug("Eligible Servers :" + JSON.stringify(realList, null, 2));

		// ***
		// Synchronize list and real list
		// ***		
		// Remove servers from list if banned or disabled
		tracer.debug && tracer.debug("*** Memory LB List before remove banned and disabled:" + JSON.stringify(lbSol, null, 2));
		lbSol = lbSol.filter(function(item) {
			return bannedList.indexOf(item) === -1 && disabledList.indexOf(item) === -1;
		});

		// Add never balanced servers
		tracer.debug && tracer.debug("*** Memory LB List before add new servers :" + JSON.stringify(lbSol, null, 2));
		lbSol = realList.filter(function(item) {
			return lbSol.indexOf(item.uuid) === -1 && !item.disabled && !item.banned;
		}).map(function(s) {
			return s.uuid;
		}).concat(lbSol);

		// reorder realList
		var orderedList = lbSol.filter(function(item) {
			return realList.some(function(s) {
				return s.uuid === item;
			});
		});

		if (orderedList.length === 0) throw new Error(locale.format(module, "noOrderedServerOnSolution", solution.solutionName(_)));

		tracer.debug && tracer.debug("Real selection list: " + JSON.stringify(orderedList, null, 2));

		// ***
		// Select server to use and Apply round robin algorithm : the first become the last...
		// ***
		var selectedUuid = orderedList[0];
		tracer.debug && tracer.debug("*** Memory LB List before apply round robin :" + JSON.stringify(lbSol, null, 2));

		server = getServer(selectedUuid);
		if (!server) throw new Error(locale.format(module, "noServerAvailable"));
		var lbIdx = lbSol.indexOf(selectedUuid);

		// Apply round robin
		if (lbSol.length > 1) {
			lbSol.splice(lbIdx, 1);
			lbSol.push(selectedUuid);
		}
		tracer.debug && tracer.debug("*** LB List after apply round robin :" + JSON.stringify(lbSol, null, 2));
		tracer.info && tracer.info("Selected server : " + server.$uuid + " : " + server.description(_));
		if (server.$uuid !== selectedUuid) server = getServer(selectedUuid);
		lbList[solName] = lbSol;
	} catch (e) {
		//helpers.log.error(module, e);
		tracer.error && tracer.error("X3 Server load balancer error: " + e.stack);
		throw e;
	}
	var endTime = new Date().getTime();
	tracer.debug && tracer.debug("Selection time: " + (endTime - startTime) + "ms");

	return server;
};


var propagateToBatchController = function(_, instance) {

	function _serialize(_, inst) {
		return {
			$uuid: inst.$uuid,
			description: inst.description(_),
			serverHost: inst.serverHost(_),
			serverPort: inst.serverPort(_),
			banned: inst.banned(_),
			disabled: inst.disabled(_),
			$isDeleted: inst.$isDeleted
		};
	}

	function _getBatchConf(uuid) {
		return bConfs.filter(function(c) {
			return c.$uuid === uuid;
		})[0];
	}

	var _trace; // = console.error;
	var serversMap = {};
	var oldSol = instance._db.fetchInstance(_, instance._db.getEntity(_, "x3solution"), {
		jsonWhere: {
			code: instance.code(_)
		}
	});

	// if solution is currently created, batch server will be initialized in afterSave
	if (!oldSol) {
		if (!instance._propagateTry) {
			instance._propagateTry = 1;
			return true; // return true means that we must initialize batch server
		}
		return;
	}
	oldSol.runtimes(_).toArray(_).forEach_(_, function(_, r) {
		serversMap[r.$uuid] = serversMap[r.$uuid] || {};
		serversMap[r.$uuid].old = _serialize(_, r);
	});

	instance.runtimes(_).toArray(_).forEach_(_, function(_, r) {
		serversMap[r.$uuid] = serversMap[r.$uuid] || {};
		serversMap[r.$uuid].new = _serialize(_, r);
	});
	//console.error("MAP: "+JSON.stringify(serversMap,null,2));
	if (serversMap) {
		// batch configuration propagation
		var bs = instance.batchServer(_);
		// check if batch server instance exists
		if (!bs) {
			bs = instance._db.fetchInstance(_, instance._db.getEntity(_, "batchServer"), {
				jsonWhere: {
					code: instance.code(_)
				}
			});
			if (!bs) {
				if (!instance._propagateTry) {
					instance._propagateTry = 1;
					return true;
				}
				return;
			} else {
				// reassociate batch server found
				instance.batchServer(_, bs);
			}
		}

		var bConfs = bs.runtimes(_).toArray(_);
		//
		//console.error("BATCH CHANGES: "+JSON.stringify(serversMap,null,2));
		for (var i = 0; i < Object.keys(serversMap).length; i++) {
			var uuid = Object.keys(serversMap)[i];
			var srv = serversMap[uuid];
			bs._changesOnFly = bs._changesOnFly || {};
			// if line deleted
			if (srv.old && srv.new.$isDeleted) {
				_trace && _trace("Line deleted: " + JSON.stringify(srv.old, null, 2));
				var conf = _getBatchConf(srv.new.$uuid);
				if (conf) {
					_trace && _trace("Delete conf: " + conf.description(_));
					bs.runtimes(_).deleteInstance(_, conf.$uuid);
					// propagate deletion until batch controller runtime on the fly
					_trace && _trace("qRemove because $isDeleted: " + srv.new.description);
					bs._changesOnFly.qRemove = bs._changesOnFly.qRemove || [];
					bs._changesOnFly.qRemove.push(srv.new.$uuid);
				}
			}
			// if line inserted
			else if (!srv.old && srv.new) {
				_trace && _trace("Line inserted: " + JSON.stringify(srv.new, null, 2));
				var c = bs._db.getEntity(_, "batchServerConfig").createInstance(_, bs._db);
				c.$uuid = srv.new.$uuid; // same uuid as x3server --> very important !
				c.serverHost(_, srv.new.serverHost);
				c.serverPort(_, srv.new.serverPort);
				c.maxQueries(_, 0);
				_trace && _trace("Insert conf: " + c.description(_) + " : values" + JSON.stringify(c.serializeInstance(_), null, 2));
				bs.runtimes(_).set(_, c);
				// do not set qAdd in _changesOnFly because new configuration is always created with maxQueries to 0,
				// so no need to propagate
			}
			// if line modified
			else if (!helpers.object.areEqual(srv.old, srv.new)) {
				_trace && _trace("Line modified");
				var updConf = _getBatchConf(srv.new.$uuid);
				if (updConf) {
					if (updConf.serverHost(_) !== srv.new.serverHost) updConf.serverHost(_, srv.new.serverHost);
					if (updConf.serverPort(_) !== srv.new.serverPort) updConf.serverPort(_, srv.new.serverPort);
					_trace && _trace("Update conf: " + updConf.description(_) + " : old values: " + JSON.stringify(srv.old, null, 2) + "\nnewValues: " + JSON.stringify(srv.new, null, 2));
					// delete configuration from batch controller on the fly if server is banned or disabled
					if ((srv.new.banned && srv.new.banned !== srv.old.banned) || (srv.new.disabled && srv.new.disabled !== srv.old.disabled)) {
						_trace && _trace("qRemove because server is banned or disabled: " + srv.new.description);
						bs._changesOnFly.qRemove = bs._changesOnFly.qRemove || [];
						bs._changesOnFly.qRemove.push(srv.new.$uuid);
					}
					// else only update configuration... host or port may have been changed
					else {
						_trace && _trace("qUpdate because solution modified: " + srv.new.description);
						bs._changesOnFly.qUpdate = bs._changesOnFly.qUpdate || [];
						var cnf = {
							server: srv.new.$uuid,
							maxQueries: updConf.maxQueries(_)
						};
						if (srv.old.description !== srv.new.description) {
							cnf.reconnect = true;
						}
						bs._changesOnFly.qUpdate.push(cnf);
					}
				}
			}
		}
		bs.save(!_);

	}
};