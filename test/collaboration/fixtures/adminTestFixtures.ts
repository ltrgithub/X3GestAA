"use strict";

var ez = require('ez-streams');
var config = require('config'); // must be first syracuse require
var crypto = require('crypto');
var globals = require('streamline-runtime').globals;
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var dataModel = require("../../..//src/orm/dataModel");
var registry = require("../../..//src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var sys = require("util");

var tracer; //= console.log;

exports.makeBasicAuthorizationToken = function(user, pass) {
	return "Basic " + (new Buffer(user + ":" + pass, "utf8")).toString("base64");
};

exports.modifyCollaborationEndpoint = function(datasetName, fctModel, testData) {
	var contract = require("../../../src/collaboration/contract").contract;
	if (testData) {
		contract.entities = testData.endpoint.contract.entities;
		//console.log("testData "+console.log(JSON.stringify(contract.representations,null,2)))

		contract.representation = {};
		/*test.endPoint.contract.entities.map(function(r){

		})*/
	}
	if (config && config.system && config.system.protectSettings) config.system.protectSettings = false;
	contract.dbMeta.initScript = "syracuse-admin-init-unittest.json";
	delete contract.dbMeta.automaticImport;
	var endPoint = null;
	config.sdata.endpoints.forEach(function(endp) {
		if (typeof endp.contract === "string") endp.contract = require(endp.contract).contract;
		if ((endp.contract.application == "syracuse") && (endp.contract.contract == "collaboration")) {
			endPoint = endp;
		}
	});
	if (!endPoint) {
		//add model
		endPoint = {
			contract: contract,
		};
		config.sdata.endpoints.push(endPoint);
	}

	endPoint.datasets[datasetName] = {
		driver: "mongodb",
		hostname: "localhost",
		database: datasetName,
		port: config.collaboration.port || 27017
	};

	config.collaboration.dataset = datasetName;
	config.collaboration.databaseName = datasetName;

	tracer && tracer("Modified collaboration endpoint is : " + sys.inspect(endPoint, null, 6));

	//
	return endPoint;
};

function resetDb(_, endpoint, datasetName) {
	var ds = endpoint.datasets[datasetName];
	ds.hostname = ds.hostname || config.collaboration.hostname || 'localhost';
	ds.port = ds.port || config.collaboration.port || 27017;
	ds.database = ds.database || datasetName;
	var server = new mongodb.Server(ds.hostname, ds.port, {});
	var db = exports.newMongoDb(ds.database, server, {});
	db = db.open(_);
	db.dropDatabase(_);
	endpoint.contract.datasets = endpoint.datasets;
	config.sdata.endpoints.push(endpoint);
}

exports.createTestOrm = function(_, endpoint, datasetName) {
	resetDb(_, endpoint, datasetName);
	registry.register([endpoint]);
	var adminOrm = adminHelper.getCollaborationOrm(_);
	var ap = adminOrm.getEntity(_, "application").createInstance(_, adminOrm);
	ap.description(_, endpoint.contract.contract);
	ap.application(_, endpoint.contract.application);
	ap.contract(_, endpoint.contract.contract);
	ap.protocol(_, 'syracuse');
	ap.save(_);
	var ep = adminOrm.getEntity(_, "endPoint").createInstance(_, adminOrm);
	ep.description(_, endpoint.contract.contract + '-' + datasetName);
	ep.applicationRef(_, ap);
	ep.dataset(_, datasetName);
	ep.databaseHost(_, endpoint.datasets[datasetName].hostname);
	ep.databasePort(_, endpoint.datasets[datasetName].port);
	ep.save(_);
	return ep.getOrm(_);
}

exports.createTestAdminEndpoint = function(_, datasetName, fctModel, testData) {
	var adminEndpoint = exports.modifyCollaborationEndpoint(datasetName, fctModel, testData);
	resetDb(_, adminEndpoint, datasetName);
	adminHelper.setup(config.collaboration);
	config.sdata.endpoints = [adminEndpoint];
	require('../../..//src/orm/dbHandles/mongoDbHandle').setup(null, {});
	registry.register([adminEndpoint]);
	return adminEndpoint;
}

exports.onlyInfo = function(diags) {
	return (diags || []).every(function(diag) {
		var s = diag.$severity || diag.severity;
		return (s === "info" || s === "success" || s === "warning");
	});
};

exports.getCookie = function(_, url, login, pass, fullResponseReturn, status) {
	var response = new ez.devices.http.client({
		url: url + "/sdata/syracuse/collaboration/syracuse/users?representation=user.$query",
		user: login || "admin",
		password: pass || "admin",
		headers: {
			"accept-language": "fr,fr-fr",
			"accept": "application/json"
		}
	}).end().response(_);
	var body = response.readAll(_);
	strictEqual(response.statusCode, status || 200, "user authenticated");
	if (fullResponseReturn) return {
		statusCode: response.statusCode,
		headers: response.headers,
		body: body
	};
	else return response.headers["set-cookie"];
};

exports.get = function(_, cookie, url, statusCode, fullResponseReturn, headers, noStatusCheck) {
	var hd = {
		cookie: cookie,
		"Accept-Language": "en-us",
		"user-agent": "",
		accept: "application/json;vnd.sage=syracuse"
	};
	Object.keys(headers || {}).forEach(function(key) {
		hd[key] = headers[key];
	});
	var response = ez.devices.http.client({
		method: "get",
		url: url,
		headers: hd
	}).end().response(_);
	if (!noStatusCheck) {
		strictEqual(response.statusCode, statusCode || 200, "status verified");
	}
	var body = response.readAll(_);
	try {
		body = JSON.parse(body);
	} catch (ex) {
		// Do nothing
	}
	if (fullResponseReturn || noStatusCheck) return {
		statusCode: response.statusCode,
		headers: response.headers,
		body: body
	};
	else return body;
};

exports.post = function(_, cookie, url, data, statusCode, fullResponseReturn, headers, noStatusCheck) {

	var response = ez.devices.http.client({
		method: "post",
		url: url,
		headers: helpers.object.extend({
			"content-type": "application/json",
			"Accept-Language": "en-US",
			"user-agent": "",
			cookie: cookie
		}, headers || {})
	}).end(JSON.stringify(data)).response(_);
	if (!noStatusCheck) {
		strictEqual(response.statusCode, statusCode || 201, "status verified");
	}
	if (fullResponseReturn || noStatusCheck) return {
		statusCode: response.statusCode,
		headers: response.headers,
		body: JSON.parse(response.readAll(_))
	};
	else return JSON.parse(response.readAll(_));
};

exports.put = function(_, cookie, url, data, statusCode, fullResponseReturn, noStatusCheck) {
	var response = ez.devices.http.client({
		method: "put",
		url: url,
		headers: {
			"content-type": "application/json",
			"Accept-Language": "en-US",
			"user-agent": "",
			cookie: cookie
		}
	}).end(JSON.stringify(data)).response(_);
	if (!noStatusCheck) {
		strictEqual(response.statusCode, statusCode || 200, "status verified");
	}
	if (fullResponseReturn || noStatusCheck) return {
		statusCode: response.statusCode,
		headers: response.headers,
		body: JSON.parse(response.readAll(_))
	};
	else return JSON.parse(response.readAll(_));
};

exports.del = function(_, cookie, url, statusCode, fullResponseReturn, noStatusCheck) {
	var response = ez.devices.http.client({
		method: "delete",
		url: url,
		headers: {
			"content-type": "application/json",
			"Accept-Language": "en-US",
			"user-agent": "",
			cookie: cookie
		}
	}).end().response(_);
	if (!noStatusCheck) {
		strictEqual(response.statusCode, statusCode || 200, "status verified");
	}
	if (fullResponseReturn || noStatusCheck) return {
		statusCode: response.statusCode,
		headers: response.headers,
		body: JSON.parse(response.readAll(_))
	};
	else return JSON.parse(response.readAll(_));
};

exports.encodePassword = function(login, pass) {
	var realm = 'Syracuse';
	// hash function from RFC2617

	function h(value) {
		var hash = crypto.createHash('MD5');
		hash.update(value, "utf8");
		return hash.digest("hex");
	}
	return h(login + ":" + realm + ":" + pass);
};

exports.makeSessionStub = function(_) {
	globals.context.session = globals.context.session || {
		id: helpers.uuid.generate(),
		getUserLogin: function(_) {
			return "guest";
		},
		getUserProfile: function(_) {
			var db = adminHelper.getCollaborationOrm(_);
			var upEnt = db.getEntity(_, "userProfile");
			var up = upEnt.createInstance(_, db);
			up.user(_, db.fetchInstance(_, db.model.getEntity(_, "user"), {
				jsonWhere: {
					login: "guest"
				}
			}));
			return up;
			/*			return {
				user: function(_) {
					// getting the administration ORM
					return db.fetchInstance(_, db.model.getEntity(_, "user"), {
						jsonWhere: {
							login: "guest"
						}
					});
				},
				getDefaultX3Endpoints: function(_) {
					return [];
				},
				selectedEndpoint: function(_) {
					return null;
				}
			};*/
		},
		getSecurityProfile: function(_) {
			return null;
		},
		getData: function(code) {
			return null;
		}
	};
	return true;
};

exports.newMongoDb = function(database, server, options) {
	var dbname = globals.context.tenantId ? globals.context.tenantId + '-' + database : database;
	options = options || {};
	options.w = 1;
	return new require('mongodb').Db(dbname, server, options);
};

exports.initializeTestEnvironnement = function(_, datasetName, port, noCompress) {
	function _getModel() {
		return dataModel.make(registry.applications.syracuse.contracts.collaboration, dsName);
	}
	//force basic auth
	config.session = config.session || {};
	config.session.auth = "basic";
	if (!port) {
		port = (config.unit_test && config.unit_test.serverPort) || 3004;
	}
	//no integration server
	config.integrationServer = null;
	config.port = port;
	config.hosting = {
		nocompress: noCompress
	};
	//
	var dsName = datasetName || "unit_test";
	//
	var endPoint = exports.modifyCollaborationEndpoint(dsName);
	//
	if (!exports.makeSessionStub(_)) return null;
	//
	/*	var server = new mongodb.Server(endPoint.datasets[dsName].hostname, endPoint.datasets[dsName].port, {});
	var _db = exports.newMongoDb(endPoint.datasets[dsName].database, server, {
		w: 1
	});
	_db = _db.open(_);*/
	var _db = mongodb.MongoClient.connect("mongodb://" + endPoint.datasets[dsName].hostname + ":" + endPoint.datasets[dsName].port + "/" + endPoint.datasets[dsName].database, {
		db: {
			w: 1
		}
	}, _);
	_db.dropDatabase(_);
	tracer && tracer("Database dropped : " + endPoint.datasets[dsName].database);
	//
	require('syracuse-main/lib/syracuse').startServers(_, port || 3004);
	//
	var db = dataModel.getOrm(_, _getModel(), endPoint.datasets[dsName]);
	endPoint.getModel = function(_) {
		return db.model;
	};
	endPoint.getOrm = function(_) {
		return db;
	};
	endPoint.protocol = function(_) {
		return "syracuse";
	};
	endPoint.getBaseUrl = function(_) {
		var port = (config.unit_test && config.unit_test.serverPort) || 3004;
		var baseUrl = "http://localhost:" + port;
		return [baseUrl, endPoint.contract.application, endPoint.contract.contract, datasetName].join("/");
	};
	endPoint.getIndexName = function(_, localeCode) {
		var parts = [endPoint.contract.application, endPoint.contract.contract, dsName];
		if (localeCode) parts.push(localeCode);
		return (parts.join(".")).toLowerCase();
	};
	//
	var ep = adminHelper.getEndpoint(_, {
		dataset: "syracuse"
	});
	if (ep) {
		ep.dataset(_, dsName);
		var res = ep.save(_);
	}
	//
	return db;
};

exports.createX3Endpoint = function(_, adminDb, folder) {
	var app = adminHelper.getApplication(_, "x3", "erp");
	var x3solution = adminDb.getEntity(_, "x3solution").createInstance(_, adminDb);
	x3solution.code(_, "x3");
	x3solution.description(_, "x3");
	x3solution.solutionName(_, "STD");
	x3solution.serverHost(_, "localhost");
	x3solution.serverPort(_, 17000);
	x3solution.proxy(_, false);
	x3solution.application(_, app);
	var solres = x3solution.save(_);
	var grp = adminDb.fetchInstance(_, adminDb.getEntity(_, "group"), {
		jsonWhere: {
			description: "Super administrator"
		}
	});

	var ep = adminDb.getEntity(_, "endPoint").createInstance(_, adminDb);
	ep.description(_, "x3");
	ep.applicationRef(_, app);
	ep.x3solution(_, x3solution);
	ep.dataset(_, folder);
	ep.x3ServerFolder(_, folder);
	if (grp) ep.groups(_).set(_, grp);
	ep.save(_);
	//
	return ep;
};

exports.getX3TestEndpointData = function() {
	// TODO
	return (config.unit_test || {}).x3endpoint;
};

exports.initializeTestContract = function(_, testData, dsName) {
	var endPoint = testData.endpoint;
	endPoint.datasets = {};
	endPoint.datasets[dsName] = {
		driver: "mongodb",
		database: dsName,
		hostname: "localhost",
		port: config.collaboration.port || 27017
	};
	config.sdata.endpoints.push(endPoint);

	var _db = mongodb.MongoClient.connect("mongodb://" + endPoint.datasets[dsName].hostname + ":" + endPoint.datasets[dsName].port + "/" + endPoint.datasets[dsName].database, {
		db: {
			w: 1
		}
	}, _);
};