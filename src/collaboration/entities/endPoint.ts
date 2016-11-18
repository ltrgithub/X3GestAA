"use strict";

var globals = require('streamline/lib/globals');
var x3Handle = require("../../..//src/orm/dbHandles/x3");
var locale = require('streamline-locale');
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var httpClient = require('../../..//src/http-client/httpClient');
var adminHelper = require("../../collaboration/helpers").AdminHelper;
var config = require('config');
var cvgCacheManager = require('syracuse-x3/lib/cvgCacheManager');
var IndexHelper = require("syracuse-search/lib/elasticIndex").IndexHelper;
var elasticVersion = require("syracuse-search/lib/elasticVersion");

var rightsTrace = config && config.x3pool && config.x3pool.rightsTrace;

function _getUrlSearchEngine() {
	var searchConf = config.searchEngine || {};
	return "http://" + (searchConf.hostname || "localhost") + ":" + (searchConf.port || 9200);
}

var _modelMap = {
	"syracuse": function(_, ep, failIfNull) {
		//
		var contract = registry.getContract(ep.applicationRef(_).application(_), ep.applicationRef(_).contract(_), failIfNull);
		if (!contract)
			return null;
		// var ds = registry.getDataset(_, contract, ep.dataset(_));
		// if (!ds) return null;
		return dataModel.make(contract, ep.dataset(_));
	},
	"x3": function(_, ep) {
		return x3Handle.makeModel(_, ep);
	}
};

var _ormMap = {
	"syracuse": function(_, ep, failIfNull) {
		//
		var model = ep.getModel(_, failIfNull);
		//
		return model && dataModel.getOrm(_, model, ep.makeDataset(_));
	},
	"x3": function(_, ep) {
		return x3Handle.create(_, ep);
	}
};

function getX3Rights(_, ep, user) {
	// ignore x3 rights
	if (config.x3RightsIgnore && ep.x3RightsIgnore(_)) {
		rightsTrace && rightsTrace("Do not take X3 rights into account for ep [" + ep.description(_) + "]");
		return;
	}
	//
	var adminDb = adminHelper.getCollaborationOrm(_);
	var db = ep.getOrm(_);
	var cacheEnt = adminDb.getEntity(_, "x3RightsCache");
	var cache = adminDb.fetchInstance(_, cacheEnt, {
		jsonWhere: {
			user: user.$uuid,
			endpoint: ep.$uuid
		}
	});
	rightsTrace && rightsTrace("getX3Rights: user [" + user.login(_) + "] : ep [" + ep.description(_) + "]");
	var rights;
	if (cache) {
		rightsTrace && rightsTrace("Rights cache exists");
		rights = cache.userRights(_);
		rights.$etag = cache.etag(_);
		rightsTrace && rightsTrace("Cached Etag : " + rights.$etag);
	}
	var res = {
		$mode: "authorize"
	};
	try {
		var db_rights = db.getUserRights(_, rights, user.getEndpointLogin(_, ep.$uuid));
		rightsTrace && rightsTrace("Supervisor call status code : " + db_rights.status);
		if (db_rights && (db_rights.status === 200)) {
			if (!cache) {
				rightsTrace && rightsTrace("Rights cache doesn't exists. It will be created");
				cache = cacheEnt.createInstance(_, adminDb);
				cache.user(_, user);
				cache.endpoint(_, ep);
				res._ignoreEtag = true;
			}
			rightsTrace && rightsTrace("Rights changed...");
			rightsTrace && rightsTrace("New Etag : " + db_rights.$etag);
			cache.etag(_, db_rights.$etag);
			cache.userRights(_, db_rights);

			cache.save(_, {
				shallowSerialize: true
			});

			rights = db_rights;
			res.purgeCache = true;
		}
		// convert to functions structure
		if (rights) {
			if (rights.hasOwnProperty("$accessCodes")) {
				if (rights.$accessCodes === "*") { //
					res.$accessCodes = "*";
				} else {
					res.$accessCodes = rights.$accessCodes.split(",").reduce(function(prev, key) {
						prev[key] = true;
						return prev;
					}, {}) || {};
				}
			}
			if (rights.hasOwnProperty("$authorizedFunctions")) {
				if (rights.$authorizedFunctions !== "*") { //
					res.$functions = rights.$authorizedFunctions.split(",").reduce(function(prev, key) {
						prev[key] = true;
						return prev;
					}, {}) || {};
				} else {
					res.$functions = "*";
				}
			}
			if (rights.hasOwnProperty("$disabledFunctions")) {
				res.$disabledFunctions = rights.$disabledFunctions.split(",").reduce(function(prev, key) {
					prev[key] = true;
					return prev;
				}, {}) || {};
			}
			if (rights.hasOwnProperty("$authorizedRepresentations") && rights.$authorizedRepresentations !== "*") //
				res.$representations = rights.$authorizedRepresentations;

			if (rights.$etag)
				res.$etag = rights.$etag;
		}

	} catch (e) {
		if (e.$diagnoses)
			res.$diagnoses = e.$diagnoses;
		else
			res.$diagnoses = [{
				$severity: "error",
				$message: e.message,
				$stackTrace: e.stack
			}];
		res.$functions = {};
		res.$representations = {};
	}
	return res;
}

var _authRightSolverMap = {
	"syracuse": function(_, ep, user, role) {
		// compute forbidden representations from user rights
		var sp = role && role.securityProfile(_);

		var etag;
		var spDate = sp && sp.$updDate;
		var roleDate = role && role.$updDate;
		if (spDate && roleDate) {
			etag = roleDate > spDate ? roleDate : spDate;
		} else {
			etag = roleDate ? roleDate : (spDate ? spDate : null);
		}
		var rights = {
			$mode: "restriction",
			$entities: sp && sp.getRestrictedEntities(_)
		};
		if (etag)
			rights.$etag = etag;
		rights.purgeCache = true;
		return rights;
	},
	"x3": function(_, ep, user, role) {
		return getX3Rights(_, ep, user);
	}
};

function _getSolutionDescriptor(_, endpoint, silent) {
	if (endpoint._solutionDescriptor)
		return endpoint._solutionDescriptor;
	if (endpoint.getSolutionName(_)) {
		var options = {
			url: endpoint.getWebServerBaseUrl(_) + "/solution.json",
			method: "GET"
		};
		if (!(endpoint.x3solution(_) && endpoint.x3solution(_).proxy(_)))
			options.ignoreProxy = true;
		try {
			var req = httpClient.httpRequest(_, options);
			req.setTimeout(500);
			var resp = req.end().response(_);
			if (resp.statusCode === 200) {
				return (endpoint._solutionDescriptor = JSON.parse(resp.readAll(_)));
			}
		} catch (e) {
			endpoint.$addDiagnose("warning", locale.format(module, "cantAccessSolutionJson", options.url));
		}
	}
	// if we're here, no solution descriptor was found
	if (silent)
		return null;
	throw new Error(locale.format(module, "solutionDescriptorNotFound", endpoint.description(_)));
	// if(endpoint._solutionDescriptor) return endpoint._solutionDescriptor;
	//
	// 	var config = require('config');
	// 	console.log("config.x3: " +sys.inspect(config));
	// 	return config && config.x3 && config.x3.solutions && (endpoint._solutionDescriptor = config.x3.solutions[endpoint.x3solution(_).serverHost(_)]);
}

exports.entity = {
	$titleTemplate: "Endpoint",
	$descriptionTemplate: "Endpoints describes services locations",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Endpoints",
	$allowFactory: function(_, instance) {
		return (instance.protocol(_) === "syracuse");
	},
	$factoryIncludes: ["description", "dataset", "applicationRef"],
	$properties: {
		description: {
			$title: "Description",
			$linksToDetails: true,
			$isLocalized: true,
			$isMandatory: true,
			$isUnique: true
		},
		helpBaseUrl: {
			$title: "Help Base URL",
			$linksToDetails: true,
			$isLocalized: false,
			$isMandatory: false,
			$pattern: "^((http|https)\:\/\/[a-zA-Z0-9_\:\/\.\-]+\/)?$",
			$patternMessage: "Help base URL must be in the format http(s)://server(:port)/.../"
		},
		application: {
			$title: "Application",
			$isMandatory: true,
			$isExcluded: true
		},
		contract: {
			$title: "Contract",
			$isMandatory: true,
			$isExcluded: true
		},
		protocol: {
			$title: "Protocol",
			$isMandatory: true,
			$isExcluded: true
		},
		dataset: {
			$title: "Name",
			$isMandatory: true,
			$isUnique: true,
			$caseInsensitive: true,
			$pattern: "^[a-zA-Z0-9_]*$",
			$patternMessage: "Endpoint name can only contain a to z, A to Z, 0 to 9 and _ caracters"
		},
		nature: {
			$title: "Nature",
			$capabilities: "colored",
			$enum: [{
				$value: "production",
				$title: "Production"
			}, {
				$value: "preproduction",
				$title: "Pre-production"
			}, {
				$value: "test",
				$title: "Test"
			}, {
				$value: "presetting",
				$title: "Pre-setting"
			}, {
				$value: "development",
				$title: "Development"
			}, {
				$value: "others",
				$title: "Others"
			}],
			$default: undefined,
			$isNullable: true,
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			}
		},
		localDatabase: {
			$title: "Use local database settings",
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "syracuse");
			},
			$type: "boolean",
			$default: false
		},
		databaseDriver: {
			$title: "Database driver",
			$enum: [{
				$value: "mongodb",
				$title: "Mongodb"
			}],
			$isMandatory: function(_, instance) {
				return (instance.protocol(_) === "syracuse" && !instance.localDatabase(_));
			},
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "syracuse");
			},
			$isReadOnly: function(_, instance) {
				return (instance.localDatabase(_));
			},
			$default: "mongodb"
		},
		databaseHost: {
			$title: "Database host",
			$isMandatory: function(_, instance) {
				return (instance.protocol(_) === "syracuse" && !instance.localDatabase(_));
			},
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "syracuse");
			},
			$isReadOnly: function(_, instance) {
				return (instance.localDatabase(_));
			}
		},
		databasePort: {
			$title: "Database port",
			$type: "integer",
			$isMandatory: function(_, instance) {
				return (instance.protocol(_) === "syracuse" && !instance.localDatabase(_));
			},
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "syracuse");
			},
			$isReadOnly: function(_, instance) {
				return (instance.localDatabase(_));
			},
			$default: 27017
		},
		databaseName: {
			$title: "Database name",
			$isDefined: function(_, instance) {
				return (instance.protocol(_) !== "x3");
			},
			$isReadOnly: function(_, instance) {
				return (instance.localDatabase(_));
			}
		},
		x3ServerFolder: {
			$title: "Server folder",
			$isMandatory: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			// $default: "superv",
			$lookup: {
				entity: "lookupX3Folder",
				field: "name"
			},
			$propagate: function(_, instance, val) {
				if (val && instance.x3solution(_)) {
					instance.setParentFolder(_);
				}
				instance.etnaDatabaseUser(_,
					instance.etnaDriver(_) === 'oracle' ? val : "");
			}
		},
		// still necessary for sdataWhere filters
		x3SolutionName: {
			$title: "Solution name",
			$isDefined: false,
			$isHidden: true
		},
		x3Historic: {
			$title: "Historical folder",
			$description: "Is this endpoint connected to X3 historical folder",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			$default: false
		},
		x3ParentFolder: {
			$title: "Parent folder",
			$isDefined: function(_, instance) {
				return instance.x3Historic(_);
			}
		},
		x3ReferenceFolder: {
			$title: "Reference folder",
			$isMandatory: false,
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			// $default: "superv",
			$lookup: {
				entity: "lookupX3Folder",
				field: "name"
			},
			$propagate: function(_, instance, val) {
				if (val && instance.x3solution(_)) {
					instance.setParentFolder(_);
				}
				instance.etnaDatabaseUser(_,
					instance.etnaDriver(_) === 'oracle' ? val : "");
			}
		},
		transitionWebServer: {
			$title: "Transition web server",
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			$isDeveloppementFeature: true
		},
		useEtna: {
			$title: "Use ETNA",
			$type: "boolean",
			$isNullable: true,
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			}
		},
		gitFolder: {
			$title: "Git Folder",
			$isNullable: true,
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			}
		},
		enableSqlConfiguration: {
			$title: "Enable SQL configuration",
			$type: "boolean",
			$isNullable: true,
			$isDefined: function(_, instance) {
				return (!!config.etna && instance.protocol(_) === "x3");
			}
		},
		// TODO: configure etnaApplicationPath in X3Host rather than in endpoint
		etnaSolutionPath: {
			$title: "Solution root directory",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			}
		},
		etnaDriver: {
			$title: "Database driver",
			$enum: [{
				$value: "oracle",
				$title: "Oracle"
			}, {
				$value: "sqlServer",
				$title: "SQL Server"
					/*}, {
					$value: "hdb",
					$title: "HANA"*/
			}],
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$propagate: function(_, instance, val) {
				instance.etnaDatabaseUser(_, instance.x3ServerFolder(_));
			},
		},
		etnaDatabaseHost: {
			$title: "Database host",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "oracle";
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && /^(oracle|hdb)$/.test(instance.etnaDriver(_));
			},
		},

		etnaSQLInstance: {
			$title: "SQL Server instance",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "sqlServer";
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "sqlServer";
			},
		},

		etnaDatabasePort: {
			$title: "Database port",
			$type: "integer",
			$isNullable: true,
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && /^(oracle|hdb)$/.test(instance.etnaDriver(_));
			},
		},

		etnaDatabaseName: {
			$title: "Database name",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "sqlServer";
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "sqlServer";
			},
		},

		etnaDatabaseSchema: {
			$title: "Database schema",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "hdb";
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "hdb";
			},
		},

		etnaOracleSID: {
			$title: "SID",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_) && instance.etnaDriver(_) === "oracle";
			},
		},
		etnaDatabaseUser: {
			$title: "User",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$isReadOnly: function(_, instance) {
				return instance.enableSqlConfiguration(_) && /^(oracle|sqlServer)$/.test(instance.etnaDriver(_));
			},
		},
		etnaDatabasePassword: {
			$title: "Database Password",
			$type: "password",
			$isMandatory: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
		},

		etnaMongoHost: {
			$title: "MongoDB host",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
		},
		etnaMongoPort: {
			$title: "MongoDB port",
			$type: "integer",
			$isNullable: true,
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
		},
		x3RightsIgnore: {
			$title: "Ignore X3 Rights",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return config.x3RightsIgnore;
			},
			$isNullable: true,
			$default: false
		}
	},
	$relations: {
		groups: {
			$title: "Groups",
			$type: "groups",
			$inv: "endPoints",
			isComputed: true,
			$nullOnDelete: true
		},
		// should rename as application
		applicationRef: {
			$title: "Application",
			$type: "application",
			$inv: "endpoints",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (!val)
					return;
				instance.application(_, val.application(_));
				instance.contract(_, val.contract(_));
				instance.protocol(_, val.protocol(_));
				//
				if (!val.defaultEndpoint(_)) {
					val.defaultEndpoint(_, instance);
					instance.addRelatedInstance(val);
				}
			}
		},
		x3solution: {
			$title: "X3 solution",
			$type: "x3solution",
			$inv: "endpoints",
			$isMandatory: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			},
			$propagate: function(_, instance, val) {
				if (val && instance.x3ServerFolder(_)) {
					instance.setParentFolder(_);
				}
			}
		},
		menuProfileToRoles: {
			$title: "Menu profiles to roles mapping",
			$description: "Associate X3 menu profiles to roles",
			$type: "menuProfileToRoles",
			$isChild: true,
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			}
		},
		roleToProfessionCodes: {
			$title: "Roles to profession codes mapping",
			$description: "Associate roles to X3 profession codes",
			$type: "roleToProfessionCodes",
			$isChild: true,
			$isDefined: function(_, instance) {
				return (instance.protocol(_) === "x3");
			}
		}

	},
	$functions: {
		$onDelete: function(_) {
			var self = this;
			var db = self._db;
			// cascade delete endpoint logins
			var users = db.fetchInstances(_, db.getEntity(_, "user"), {
				jsonWhere: {
					"endpoints.endpoint": self.$uuid
				}
			});
			users.forEach_(_, function(_, u) {
				var ueps = u.endpoints(_);
				ueps.toArray(_, true).forEach_(_, function(_, uep) {
					if (uep.endpoint(_) && (uep.endpoint(_).$uuid === self.$uuid)) {
						ueps.deleteInstance(_, uep.$uuid);
						self.addRelatedInstance(u);
					}
				});
			});
			// cascade remove binded vignettes from dashboards
			var dList = db.fetchInstances(_, db.getEntity(_, "dashboardDef"), {
				jsonWhere: {
					"variants.vignettes.endpoint": self.$uuid
				}
			});
			// delete vignette from variant
			dList.forEach_(_, function(_, d) {
				d.variants(_).toArray(_, true).forEach_(_, function(_, vr) {
					var vigns = vr.vignettes(_);
					vigns.toArray(_, true).forEach_(_, function(_, v) {
						if (v.endpoint(_) && (v.endpoint(_).$uuid === self.$uuid)) {
							vigns.deleteInstance(_, v.$uuid);
							self.addRelatedInstance(d);
						}
					});
				});
			});
		},
		makeDataset: function(_) {
			var self = this;
			// use data from config.collaboration when ep.localDatabase(_) is
			// set. The equality of config.collaboration.database and the
			// dataset of the
			// collaboration endpoint is tested in syracuse._js within
			// _initAsync().
			var db = self.dataset(_);
			var dbname = self.databaseName(_);
			if (self.localDatabase(_)) {
				return {
					driver: config.collaboration.driver,
					hostname: config.collaboration.hostname,
					port: config.collaboration.port,
					connectionString: config.collaboration.connectionString,
					database: db,
					databaseName: dbname
				};
			}
			return {
				driver: self.databaseDriver(_),
				hostname: self.databaseHost(_) || "localhost",
				port: self.databasePort(_),
				database: db,
				databaseName: dbname
			};
		},
		isSame: function(_, application, contract, dataset, host, port) {
			// TODO: host and port
			return ((application === this.application(_)) && (contract === this.contract(_)) && (dataset === this.dataset(_)));
		},
		getBaseUrl: function(_, prefix) {
			return ["/" + (prefix || "sdata"), this.application(_), this.contract(_), this.dataset(_)].join("/");
		},
		getIndexName: function(_, localeCode) {
			var parts = [this.application(_), this.contract(_)];
			if ((config.searchEngine || {}).useFolderNameAsIndexName && (this.protocol(_) === "x3")) {
				var sol = this.getSolutionName(_);
				sol && parts.push(sol);
				var fdr = this.getX3FolderName(_);
				fdr && parts.push(fdr);
			} else
				parts.push(this.dataset(_));
			if (localeCode)
				parts.push(localeCode);
			return (parts.join(".")).toLowerCase().replace(" ", "_");
		},
		//
		getModel: function(_, failIfNull) {
			var p = this.protocol(_);
			return p && _modelMap[p](_, this, failIfNull);
		},
		getOrm: function(_, failIfNull) {
			var p = this.protocol(_);
			return p && _ormMap[p](_, this, failIfNull);
		},
		// X3 stuff
		getSolutionName: function(_) {
			if (this.x3solution(_))
				return this.x3solution(_).solutionName(_);
			throw new Error(locale.format(module, "solutionNameNotFound", this.description(_)));
			// COMPATIBILITY: load the solution descriptor
			// var solutionDesc = _getSolutionDescriptor(_, this);
			// return solutionDesc && solutionDesc.solution &&
			// solutionDesc.solution.name;
		},
		getX3FolderName: function(_) {
			return this.x3ParentFolder(_) || this.x3ServerFolder(_) || "";
		},
		getApplicationServerName: function(_) {
			var solutionDesc = _getSolutionDescriptor(_, this);
			return solutionDesc && solutionDesc.application && solutionDesc.application.server;
		},
		getApplicationServerBaseUrl: function(_, withFolder, secure) {
			var solutionDesc = _getSolutionDescriptor(_, this, true);
			var application = solutionDesc && solutionDesc.application;
			var x3solution = this.x3solution(_);
			var server = (application && application.server) || (x3solution && x3solution.serverHost(_));
			var port = (application && application.mainPort) || (x3solution && x3solution.webServerPort(_));
			return (secure ? "https://" : "http://") + [server + ":" + port, "Adonix_" + this.getSolutionName(_)].join("/") +
				(withFolder ? "/" + this.x3ServerFolder(_) : "");
		},
		getWebServerBaseUrl: function(_, withFolder, secure) {
			var x3solution = this.x3solution(_);
			if (x3solution)
				return (secure ? "https://" : "http://") + [(x3solution.webServer(_) || x3solution.serverHost(_)) + ":" + x3solution.webServerPort(_), "Adonix_" + this.getSolutionName(_)].join("/") +
					(withFolder ? "/" + this.x3ServerFolder(_) : "");
		},
		getFusionPrototypeUrl: function(_, options) {
			var opt = options || {};
			var x3solution = this.x3solution(_);
			if (!x3solution)
				return null;
			var url = ["http:/"];
			var host = (x3solution.webServer(_) || x3solution.serverHost(_));
			if (!host || host.length === 0)
				throw new Error("Unexpected empty web server host");
			var port = x3solution.webServerPort(_);
			if (port <= 0)
				throw new Error("Bad web server port");
			url.push(host + ":" + port);
			var sol = this.getSolutionName(_);
			if (!sol || sol.length === 0)
				throw new Error("Unexpected empty solution name");
			url.push("Adonix_" + sol);
			var localRoot = opt.prototypesLocalServerRoot;
			if (localRoot)
				url = [localRoot];
			var fldr = this.getX3FolderName(_);
			if (!fldr || fldr.length === 0)
				throw new Error("Unexpected empty folder name");
			url.push(fldr);
			if (opt.prototypesFolder) {
				url.push(opt.prototypesFolder);
			} else {
				url.push("GEN");
				url.push("SYR");
				url.push((opt.langCode || locale.current).toUpperCase());
				url.push("FENJ");
			}
			if (opt.prototypeId)
				url.push(opt.prototypeId.split(".")[0] + ".json");
			return url.join("/");
		},
		getFusionPrototype: function(_, options) {
			var url = this.getFusionPrototypeUrl(_, options);
			var respData;
			try {
				var cacheMgr = cvgCacheManager.getCacheManager();
				respData = cacheMgr.getResource(_, url, {
					"accept-charset": "utf-8"
				}, {
					force: true, // force memory cache usage as NDOWIN already got the resource
					ignoreProxy: !this.x3solution(_).proxy(_)
				});
				var pp = this.tryParsePrototype(_, respData.toString("utf8"));
				// TODO: need to change this to use the new base URL
				pp.$baseHelpUrl = [this.getBaseUrl(_, "help/" + locale.current), "{$category}", "{$keyword}"].join("/");
				return pp;
			} catch (e) {
				e.httpStatus = 500;
				e.message = locale.format(module, "prototypeServerError", options.prototypeId, e.message);
				throw e;
			}
		},
		getFusionPrototypeCacheInfos: function(_, options) {
			var url = this.getFusionPrototypeUrl(_, options);
			return cvgCacheManager.getCacheManager().getInfos(url);
		},
		tryParsePrototype: function(_, s) {
			try {
				return JSON.parse(s);
			} catch (e) {
				throw new Error("Bad prototype: " + s);
			}
		},
		getFusionDataServerBaseUrl: function(_, secure) {
			var x3solution = this.x3solution(_);
			var solutionWebServer;

			var solutionDesc = _getSolutionDescriptor(_, this);
			solutionWebServer = (solutionDesc && solutionDesc.webServers[0] && (solutionDesc.webServers[0].server + ":" + solutionDesc.webServers[0].mainPort)) || (x3solution && ((x3solution.webServer(_) || x3solution.serverHost(_)) + ":" + x3solution.webServerPort(_)));
			//
			return (secure ? "https://" : "http://") + [solutionWebServer, "sdata", "x3", "trans", "-"].join("/");
		},

		getAuthorizedAccessRight: function(_, user, role) {
			var p = this.protocol(_);
			return p && _authRightSolverMap[p] && _authRightSolverMap[p](_, this, user, role);
		},
		getHelpBaseUrl: function(_, secure) {
			var hs = this.helpServer(_);
			var hsp = this.helpServerPort(_);
			return (secure ? "https://" : "http://") + hs + ":" + hsp;
		},
		getEtnaConfig: function(_, session) {
			var config = {
				tenantId: globals.context.tenantId,
				endpointName: this.dataset(_),
				solutionName: this.getSolutionName(_),
				folderName: this.x3ServerFolder(_),
				referenceFolder: this.x3ReferenceFolder(_),
				solutionPath: this.etnaSolutionPath(_),
				mongo: {
					host: this.etnaMongoHost(_),
					port: this.etnaMongoPort(_)
				},
				sql: {
					driver: this.etnaDriver(_),
					user: this.etnaDatabaseUser(_),
					password: this.etnaDatabasePassword(_)
				}
			};
			switch (config.sql.driver) {
				case "oracle":
					config.sql.database = this.etnaOracleSID(_);
					config.sql.port = this.etnaDatabasePort(_);
					config.sql.hostname = this.etnaDatabaseHost(_);
					break;
				case "sqlServer":
					config.sql.database = this.etnaDatabaseName(_);
					config.sql.hostname = this.etnaSQLInstance(_);
					break;
				case "hdb":
					config.sql.port = this.etnaDatabasePort(_);
					config.sql.hostname = this.etnaDatabaseHost(_);
					config.sql.schema = this.etnaDatabaseSchema(_);
					break;
				default:
					throw new Error("bad driver: " + config.sql.driver);
			}

			if (!config.mongo.host) {
				var adminEp = adminHelper.getCollaborationEndpoint(_);
				config.mongo.host = adminEp.databaseHost(_);
				config.mongo.port = adminEp.databasePort(_);
			}
			config.mongo.port = config.mongo.port || 27017;
			config.mongo.database = config.solutionName + '-' + config.folderName;
			if (config.tenantId)
				config.mongo.database = config.tenantId + "-" + config.mongo.database;

			if (session) {
				var userProfile = session.getUserProfile(_, true);
				var user = userProfile.user(_);
				config.session = {
					id: session.id,
					login: session.data.userLogin,
					userName: user.getEndpointLogin(_, this.$uuid),
					locale: locale.current,
					localePreferences: userProfile.selectedLocale(_)._data,
				};
			}
			return config;
		},
		getService: function(_, service, parameters) {
			var orm = this.getOrm(_, true);
			return (orm && orm.getService) ? orm.getService(_, service, parameters) : undefined;
		},
		postService: function(_, service, parameters, body) {
			var orm = this.getOrm(_, true);
			return (orm && orm.postService) ? orm.postService(_, service, parameters, body) : undefined;
		},
		deleteService: function(_, service, parameters) {
			var orm = this.getOrm(_, true);
			return (orm && orm.deleteService) ? orm.deleteService(_, service, parameters) : undefined;
		},
		x3server: function(_) {
			return this.x3solution(_);
		},
		getFolderDescription: function(_) {
			var solutionName = this.getSolutionName(_);
			var url = this.getWebServerBaseUrl(_) + "/FOLDERS.json";
			var options = {
				url: url,
				method: "GET"
			};
			if (!(this.x3solution(_) && this.x3solution(_).proxy(_)))
				options.ignoreProxy = true;
			try {
				var req = httpClient.httpRequest(_, options);
				req.setTimeout(500);
				var resp = req.end().response(_);
				if (resp.statusCode < 400) {
					var folders = JSON.parse(resp.readAll(_));

					var x3ServerFolder = this.x3ServerFolder(_);
					if (folders.folders) {
						for (var i = 0; i < folders.folders.length; i++) {
							if (folders.folders[i] && folders.folders[i].name === x3ServerFolder) {
								return folders.folders[i];
							}
						}
					}
				}
			} catch (e) {
				this.$addDiagnose("warning", locale.format(module, "cantAccessFoldersJson", options.url));
			}
		},
		// this function return ISO codes languages available on a folder, but also as connection !
		getFolderLangsIso: function(_) {
			var db = this.getOrm(_);
			var x3folderIsoLangs = [];
			var adossierDetails = db.getEntity(_, "ADOSSIER", "$details");
			var adossier = db.fetchInstance(_, adossierDetails, this.x3ServerFolder(_));
			//console.error("Folder langs: ",adossier._data.ADSALAN);
			var listLan = adossier._data.ADSALAN.map(function(it) {
				return "'" + it.LAN + "'";
			}).join(',');

			var tablanQuery = db.getEntity(_, "TABLAN", "$query");
			var filter = "LAN in (" + listLan + ") and LANISO ne '' and LANCON eq true";
			//console.error("Filter: "+filter);
			var tablan = db.fetchInstances(_, tablanQuery, {
				sdataWhere: filter
			});
			tablan && tablan.forEach_(_, function(_, f) {
				x3folderIsoLangs.push(f.LANISO(_));
			});
			//console.error("x3folderIsoLangs: "+JSON.stringify(x3folderIsoLangs,null,2));
			return x3folderIsoLangs;
		},
		setParentFolder: function(_) {
			var descr = this.getFolderDescription(_);
			if (descr) {
				if (descr.hist && descr.origin) {
					this.x3ParentFolder(_, descr.origin);
					this.x3Historic(_, true);
					return true;
				} else {
					this.x3ParentFolder(_, null);
					this.x3Historic(_, false);
				}
			}
		}
	},
	$services: {
		makeDefaultEndpoint: {
			$title: "Set as default endpoint",
			$description: "This endpoint will be the default endpoint for application",
			$isMethod: true,
			$method: "POST",
			$execute: function(_, context, instance, parameters) {
				var app = instance.applicationRef(_);
				if (app) {
					app.defaultEndpoint(_, instance);
					app.save(_);
					// copy diags
					var diag = [];
					app.getAllDiagnoses(_, diag, {
						addPropName: true,
						addEntityName: true
					});
					diag.forEach(function(d) {
						instance.$addDiagnose(d.severity, d.message);
					});
					if (!diag.some(function(d) {
							return d.severity === "error";
						}))
						instance.$addDiagnose("info", locale.format(module, "setAsDefault", app.description(_)));
				}
			}
		},
		checkServer: {
			$title: "Check server settings",
			$description: "Attempts to connect to the server",
			$method: "POST",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return !instance.applicationRef(_) || instance.protocol(_) !== "x3" || !instance.x3solution(_);
			},
			$execute: function(_, context, instance) {
				if (!instance.applicationRef(_))
					return;
				if (instance.protocol(_) !== "x3")
					return;
				var solution = instance.x3solution(_);
				var hasErrors = false;
				if (!solution)
					return;
				solution.checkRuntime(_, context, function(_, s) {
					return !s.disabled(_);
				});
				hasErrors = solution.$diagnoses &&
					solution.$diagnoses.some(function(d) {
						return d.$severity === "error";
					});

				var solutionName = instance.getSolutionName(_);
				var des = _getSolutionDescriptor(_, instance);
				if (des.solution.name !== solutionName)
					instance.$addError(locale.format(module, "differentSolution", solutionName, des.solution.name));
				var url = instance.getWebServerBaseUrl(_) + "/FOLDERS.json";
				var options = {
					url: url,
					method: "GET"
				};
				if (!(instance.x3solution(_) && instance.x3solution(_).proxy(_)))
					options.ignoreProxy = true;
				var resp;
				try {
					var req = httpClient.httpRequest(_, options);
					req.setTimeout(500);
					resp = req.end().response(_);
				} catch (e) {
					this.$addDiagnose("warning", locale.format(module, "cantAccessFoldersJson", options.url));
				}
				if (resp.statusCode < 400) {
					var folders = JSON.parse(resp.readAll(_));
					if (folders.solution && folders.solution !== solutionName) {
						hasErrors = true;
						instance.$addError(locale.format(module, "differentSolution2", solutionName, folders.solution));
					}
					var x3ServerFolder = instance.x3ServerFolder(_);
					var i = folders.folders.length;
					while (--i >= 0) {
						if (folders.folders[i].name === x3ServerFolder)
							break;
					}
					if (i < 0) {
						hasErrors = true;
						instance.$addError(locale.format(module, "wrongFolder", x3ServerFolder));
					}
				} else {
					hasErrors = true;
					if (resp.statusCode === 404) {
						instance.$addError(locale.format(module, "foldersNotFound", url));
					} else {
						instance.$addError(resp.readAll(_));
					}
				}

				if (!hasErrors) {
					instance.$addDiagnose("info", locale.format(module, "solutionFolderOK"));
				}

			}
		},
		checkHelpBaseUrl: {
			$title: "Check help base URL",
			$description: "Attempts to verify the help URL",
			$method: "POST",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return !instance.helpBaseUrl(_);
			},
			$execute: function(_, context, instance) {
				if (!instance.helpBaseUrl(_))
					return;
				var baseUrl = instance.helpBaseUrl(_);
				var opt = {
					url: baseUrl,
					method: "GET",
					headers: {
						"accept-charset": "utf-8"
					}
				};

				function httpGet(_, url) {
					var resp, respData;
					opt.url = url;
					var request = httpClient.httpRequest(_, opt);
					request.setTimeout(500);
					try {
						resp = request.end().response(_);
						respData = resp.readAll(_);
					} catch (e) {
						(instance.$diagnoses = instance.$diagnoses || []).push({
							severity: "error",
							message: e.message
						});
						return {
							statusCode: 500,
							headers: {
								"content-type": "text/plain",
							},
							body: e.message
						};
					}
					if (resp.statusCode === 301 && resp.headers["location"]) {
						return httpGet(_, resp.headers["location"]);
					}
					return {
						statusCode: resp.statusCode,
						headers: {
							"content-type": "text/plain",
						},
						body: (respData || "").toString("utf8")
					};
				}
				var details = [],
					response, errors = 0,
					success = 0,
					urls = ["", "en-US/index.htm", "en-US/FCT/AIMP.htm", "en-US/FLD/A.htm"];
				urls.forEach_(_, function(_, path) {
					response = httpGet(_, baseUrl + path);
					details.push("GET /" + path + " -- status: " + response.statusCode);
					if (response.statusCode === 401) {
						// Server with authentication. We didn't sent token but the server is reachable
						instance.$addDiagnose("warning", locale.format(module, "helpUrlRequireAuthentication"));
					} else
					if (response.statusCode !== 200) {
						var msg = locale.format(module, "helpUrlError", response.statusCode + ": GET " + path);
						instance.$addError(msg, null, null, response.body);
						errors++;
					}
				});
				if (urls.length - errors > 0) {
					if (errors === 0)
						instance.$addDiagnose("info", locale.format(module, "helpUrlOK"), null, null, details.join("\n"));
					else
						instance.$addDiagnose("warning", locale.format(module, "helpUrlWarning"), null, null, details.join("\n"));
				}
			}
		},
		/*
		etnaTest: {
			$title: "TEST",
			$description: "STDEN's tests",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).exportMetadataAndPush(_, "tables", ['ATABLE', 'AABREV']);
			},
		},
*/
		etnaExportMeta: {
			$title: "Export ETNA Metadata",
			$description: "Extracts metadata from SQL database",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).exportMetadataAndPush(_);
			},
		},
		incrementalSyncExportMeta: {
			$title: "Export ETNA Metadata (incremental)",
			$description: "Extracts metadata from SQL database (incremental)",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				var options = {
					incremental: true,
					skipGit: true
				};
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).exportMetadataAndPush(_, undefined, undefined, options);
			},
		},
		etnaImportMeta: {
			$title: "Import ETNA Metadata",
			$description: "Imports metadata into mongodb database",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).importMetadata(_);
			},
		},
		/* STDEN : not for now .... maybe later		
		etnaExportData: {
			$title: "Export SQL Data",
			$description: "Exports all tables from SQL database",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).exportData(_);
			},
		},
		importExportData: {
			$title: "Import SQL Data",
			$description: "Imports previously exported SQL data into SQL database",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).importData(_);
			},
		},
*/
		fullResyncAPLSTD: {
			$title: "Full resync APLSTD",
			$description: "Full resynchronization of APLSTD",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).syncText(_, "aplstd", {
					fullSync: true
				});
			},
		},
		fullResyncATEXTE: {
			$title: "Full resync ATEXTE",
			$description: "Full resynchronization of ATEXTE",
			$isMethod: true,
			$method: "POST",
			$invocationMode: "async",
			$capabilities: "abort",
			$isDefined: function(_, instance) {
				return instance.enableSqlConfiguration(_);
			},
			$execute: function(_, context, instance, parameters) {
				require('etna-etl/lib/sync').newSync(_, instance, context && context.tracker).syncText(_, "atexte", {
					fullSync: true
				});
			},
		},
		initSearchIndex: {
			$method: "POST",
			$title: "Init search index",
			$isMethod: true,
			$isHidden: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$isDisabled: function(_, instance) {
				return !instance.$uuid;
			},
			$execute: function(_, context, instance) {
				elasticVersion.checkVersion(_, _getUrlSearchEngine(_));

				// launch first on syracuse administration endpoint
				var endpoint = instance._db.fetchInstance(_, instance._db.getEntity(_, "endPoint"), {
					jsonWhere: {
						description: "Syracuse administration"
					}
				});

				function _update(_, ep) {
					var helper = new IndexHelper(ep);

					// data
					var result = helper.updateIndex(_);
					// function
					result = result.continu && helper.updateFunctionIndex(_);
				}

				// launch update for syracuse endpoint
				_update(_, endpoint);

				// endpoint choice
				if (instance.dataset(_) !== "syracuse")
					_update(_, instance);
			}
		},
		updateMenuProfiles: {
			$title: "Update menu profile mappings",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return instance.protocol(_) !== "x3";
			},
			$method: "POST",
			$facets: ["$edit"],
			$execute: function(_, context, instance, parameters) {
				if (instance.protocol(_) !== "x3") {
					instance.$addError(locale.format(module, "noX3Endpoint"));
					return;
				}
				var orm = instance.getOrm(_);
				var ent = orm.getEntity(_, "ALISTMENUS");
				var codes = [];
				var insts = orm.fetchInstances(_, ent, {
					sdataWhere: "MODULE eq 0"
				});
				insts.forEach_(_, function(_, inst) {
					var mp = inst.CODPRF(_);
					if (mp)
						codes.push(mp);
				});
				var mappings0 = instance.menuProfileToRoles(_);
				var mappings = mappings0.toArray(_);
				mappings.forEach_(_, function(_, mapping) {
					var mp = mapping.menuProfile(_);
					var index = codes.indexOf(mp);
					if (index >= 0) {
						codes.splice(index, 1);
					} else { // delete entry
						mappings0.deleteInstance(_, mapping.$uuid);
						mapping.getAllDiagnoses(_, instance.$diagnoses);
						instance.$addDiagnose("info", locale.format(module, "mappingDeleted", mp));
					}
				});
				// add new instances
				codes.forEach_(_, function(_, code) {
					var mapping = mappings0.add(_);
					mapping.menuProfile(_, code);
					instance.$addDiagnose("info", locale.format(module, "newMapping", code));
				});
			},
		},
		updateMappings: {
			$title: "Update profession code mappings",
			$isMethod: true,
			$facets: ["$edit"],
			$isDisabled: function(_, instance) {
				return instance.protocol(_) !== "x3";
			},
			$method: "POST",
			$execute: function(_, context, instance, parameters) {
				if (instance.protocol(_) !== "x3") {
					instance.$addError(locale.format(module, "noX3Endpoint"));
					return;
				}
				var orm = instance.getOrm(_);
				var ent = orm.getEntity(_, "ASYRMET");
				var insts = orm.fetchInstances(_, ent, {});
				var codes = {};
				insts.forEach_(_, function(_, inst) {
					var mp = inst.PRFMEN(_);
					codes[inst.CODMET(_)] = mp;
				});
				var mappingsP0 = instance.roleToProfessionCodes(_);
				var mappingsP = mappingsP0.toArray(_);
				mappingsP.forEach_(_, function(_, mapping) {
					var mp = mapping.professionCode(_);
					if (mp in codes) {
						delete codes[mp];
					} else { // delete entry
						mappingsP0.deleteInstance(_, mapping.$uuid);
						mapping.getAllDiagnoses(_, instance.$diagnoses);
						if (!mp)
							mp = "''";
						instance.$addDiagnose("info", locale.format(module, "mappingDeleted", mp));
					}
				});
				// mapping of menu profiles
				var mappingsM = instance.menuProfileToRoles(_).toArray(_);
				var codes2 = {};
				mappingsM.forEach_(_, function(_, mapping) {
					codes2[mapping.menuProfile(_)] = mapping.role(_);
				});
				// add new instances
				for (var code in codes) {
					var mapping = mappingsP0.add(_);
					mapping.professionCode(_, code);
					var mp = codes[code];
					var role = undefined;
					if (mp) {
						role = codes2[mp];
						if (role) {
							mapping.role(_, role);
						}
					}
					mapping.getAllDiagnoses(_, instance.$diagnoses);
					instance.$addDiagnose("info", role ? locale.format(module, "newMappingP2", code) : locale.format(module, "newMappingP", code));
				}
			},
		}
	},
	$events: {
		$afterSave: [

			function(_, instance, params) {
				adminHelper.removeEndpointFromCache(instance.dataset(_));
			}
		]
	},
	$searchIndex: {
		$fields: ["description", "applicationRef", "dataset", "groups", "x3solution", "x3ServerFolder", "databaseDriver", "databaseHost"]
	}
};