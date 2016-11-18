"use strict";

var sdataRegistry = require("../../../src/sdata/sdataRegistry");
var helpers = require('@sage/syracuse-core').helpers;
var pluralize = helpers.string.pluralize;
var httpHelpers = require('@sage/syracuse-core').http;
var datetime = require('@sage/syracuse-core').types.datetime;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var _orm; // cache for collaboration ORM: either object (in multitenant mode) or just ORM
var _config = {};
var multiTenant;
var _productNameByEndpoint = {}; // map of product Name by endpoint. each connection will add the product if it's not the case;
// in multitenant mode, tenantId will be key

function _hasLock(instance) {
	return (instance._lock && (instance._lock.status === "success"));
}

function _getProductDataByEndpoint(dataset, item) {
	if (multiTenant) {
		var arr = _productNameByEndpoint[globals.context.tenantId] && _productNameByEndpoint[globals.context.tenantId][dataset];
	} else {
		var arr = _productNameByEndpoint[dataset];
	}
	if (arr && arr[item]) return arr[item];
	// default values
	switch (item) {
		case 0:
			return {
				"en-us": ' X3'
			};
		case 1:
			// Product code
			return "1";
		case 2:
			// Product update number
			return "11";
		default:
			return "";
	}
}
var _cache = {};
// singleton should be camelCase. PascalCase is reserved for classes (but we keep it for compat)
exports.adminHelper = exports.AdminHelper = {
	getProductNameByEndpoint(dataset) {
		return _getProductDataByEndpoint(dataset, 0);
	},
	changeProductName(_, instance, val) {
		var ed;
		if (!val) {
			ed = instance.selectedEndpoint(_);
		} else {
			ed = val;
		}
		if (ed) {

			var localeSelected = instance.selectedLocale(_) ? instance.selectedLocale(_).code(_).toLowerCase() : "en-us";
			var productNameListByland = this.getProductNameByEndpoint(ed.dataset(_));
			var productName = (productNameListByland ? (productNameListByland[localeSelected] ? productNameListByland[localeSelected] : productNameListByland[Object.keys(productNameListByland)[0]]) : '').replace(/^Sage/, '');
			instance.productName(_, productName);
		}

	},
	getProductVersionByEndpoint(dataset) {
		return _getProductDataByEndpoint(dataset, 2);
	},
	getProductCodeByEndpoint(dataset) {
		return _getProductDataByEndpoint(dataset, 1);
	},
	setProductByEndpoint(productName, dataset, productCode, productVersion) { // call after connection
		if (multiTenant === undefined) {
			var hosting = require('config').hosting;
			multiTenant = (hosting && hosting.multiTenant) || false;
		}
		if (multiTenant) {
			var obj = _productNameByEndpoint[globals.context.tenantId] = _productNameByEndpoint[globals.context.tenantId] || {};
			obj[dataset] = [productName, productCode, productVersion];
		} else
			_productNameByEndpoint[dataset] = [productName, productCode, productVersion];
	},
	lockInstance(_, instance) {
		// allways try to lock as the lock might have been deleted by another user
		if ((instance._meta.$lockType === "pessimist") /* && !_hasLock(instance)*/ ) {
			instance._lock = this.getCollaborationOrm(_).lockInstance(_, instance);
			if (!_hasLock(instance)) {
				var ex;
				if (instance._lock && instance._lock.status === "locked") {
					// TODO: provide a comprehensible label for the object
					ex = new Error(locale.format(module, "lockError", instance._meta.name, instance._lock.lock.lockUser, instance._lock.lock.lockDate));
					ex.$httpStatus = httpHelpers.httpStatus.Conflict;
					ex.lockStatus = instance._lock;
				} else {
					ex = new Error(locale.format(module, "lockErrorFatal", instance._meta.name));
					ex.$httpStatus = 500;
				}
				throw ex;
			}
		}
	},
	lockInstanceRetry(_, instance) {
		// allways try to lock as the lock might have been deleted by another user
		if ((instance._meta.$lockType === "pessimist") /* && !_hasLock(instance)*/ ) {
			instance._lock = this.getCollaborationOrm(_).lockInstanceRetry(_, instance);
			if (!_hasLock(instance)) {
				var ex;
				if (instance._lock && instance._lock.status === "locked") {
					// TODO: provide a comprehensible label for the object
					ex = new Error(locale.format(module, "lockError", instance._meta.name, instance._lock.lock.lockUser, instance._lock.lock.lockDate));
					ex.$httpStatus = httpHelpers.httpStatus.Conflict;
					ex.lockStatus = instance._lock;
				} else {
					ex = new Error(locale.format(module, "lockErrorFatal", instance._meta.name));
					ex.$httpStatus = 500;
				}
				throw ex;
			}
		}
	},
	unlockInstance(_, instance) {
		if ((instance._meta.$lockType === "pessimist") /* && instance._lock*/ ) {
			this.getCollaborationOrm(_).unlockInstance(_, instance);
		}
	},
	releaseSessionLocks(_, ssid) {
		//		console.log("release session: "+ssid);
		this.getCollaborationOrm(_).db.collection("dbLocks", _).remove({
			sessionId: ssid
		}, {
			safe: true
		}, _);
	},

	getCollaborationOrm(_) {
		var tenantId;
		if (multiTenant) {
			tenantId = globals.context.tenantId;
			if (_orm[tenantId]) return _orm[tenantId];
		} else {
			if (_orm) return _orm;
		}
		var contract = sdataRegistry.getContract(_config.application, _config.contract, true);
		var dataset = _config.dataset;
		// require dynamically to avoid problem with circular require
		var result = require("../../../src/orm/dataModel").getOrm(_, this.getCollaborationModel(), contract.datasets[dataset]);
		if (multiTenant) _orm[tenantId] = result;
		else _orm = result;
		return result;
	},
	getCollaborationModel() {
		var contract = sdataRegistry.getContract(_config.application, _config.contract, true);
		var dataset = _config.dataset;
		// require dynamically to avoid problem with circular require
		return require("../../../src/orm/dataModel").make(contract, dataset);
	},
	getCollaborationApplication(_) {
		return this.getApplication(_, _config.application, _config.contract);
	},
	getCollaborationEndpoint(_) {
		return this.getEndpoint(_, {
			application: _config.application,
			contract: _config.contract,
			dataset: _config.dataset
		});
	},
	_getCache() {
		var id = globals.context.tenantId ||  0;
		_cache[id] = _cache[id] || {
			applications: {},
			endpoints: {}
		};
		return _cache[id];
	},
	getApplication(_, applicationName, contractName) {
		if (!this._getCache().applications[applicationName + "_" + contractName]) {
			var opt = {};
			// case insensitive search
			opt.jsonWhere = {
				application: {
					$regex: "^" + applicationName + "$",
					$options: "i"
				},
				contract: {
					$regex: "^" + contractName + "$",
					$options: "i"
				}
			};
			var db = this.getCollaborationOrm(_);
			this._getCache().applications[applicationName + "_" + contractName] = db.fetchInstance(_, db.model.getEntity(_, "application"), opt);
		}
		return this._getCache().applications[applicationName + "_" + contractName];
	},
	getEndpoints(_, options) {
		var db = this.getCollaborationOrm(_);
		var opt = {
			jsonWhere: {}
		};
		if (options && options.jsonWhere) opt.jsonWhere = options.jsonWhere;
		else {
			if (options && options.dataset) {
				opt.jsonWhere.dataset = {
					$regex: "^" + options.dataset + "$",
					$options: "i"
				};

				// cache endpoint for 15 seconds
				if (this._getCache().endpoints[options.dataset] && (new Date().getTime() - this._getCache().endpoints[options.dataset].stamp > 15000)) {
					delete this._getCache().endpoints[options.dataset];
				}
				if (!this._getCache().endpoints[options.dataset]) {
					this._getCache().endpoints[options.dataset] = {
						stamp: new Date().getTime(),
						ep: db.fetchInstances(_, db.model.getEntity(_, "endPoint"), opt)
					};
				} else {
					this._getCache().endpoints[options.dataset].stamp = new Date().getTime();
				}
				return this._getCache().endpoints[options.dataset].ep;
			}
		}
		return db.fetchInstances(_, db.model.getEntity(_, "endPoint"), opt);
	},
	getEndpoint(_, options) {
		var eps = this.getEndpoints(_, options);
		return eps && eps[0];
	},
	removeEndpointFromCache(dataset) {
		if (this._getCache().endpoints[dataset]) {
			delete this._getCache().endpoints[dataset];
		}
	},
	// This function computes $lookup for Syracuse and X3 representations
	// parameters: 
	// options = {
	// 		application: "applicationName",
	// 		contract: "contractName",
	// 		dataset: "endpointName",
	// 		representationField: "representationfieldName",  -> necessary to handle fieldMap correctly
	// 		entityField: "entityFieldName"-> necessary to handle fieldMap correctly
	// }
	getLookupRepresentations(_, options) {
		var app = options.application;
		if (!app) return;
		var ep = options.endpoint || app.defaultEndpoint(_);
		if (!ep) return;
		var lookup = {
			$type: "application/json;vnd.sage=syracuse"
		};
		var baseUrl = ep.getBaseUrl(_);
		if (app.protocol(_) === "x3") {
			lookup.$url = baseUrl + "/AREPIDX?representation=AREPIDX.$lookup";
			lookup.$fieldMap = {};
			if (options.representationField) lookup.$fieldMap[options.representationField] = "NAME";
			if (options.entityField) lookup.$fieldMap[options.entityField] = "CLASSE";

		} else if (app.protocol(_) === "syracuse") {
			lookup.$url = baseUrl + "/lookupRepresentations?application={applicationName}&contract={contractName}&dataset={endpointName}&representation=lookupRepresentation.$lookup";
			lookup.$fieldMap = {};
			if (options.representationField) lookup.$fieldMap[options.representationField] = "name";
			if (options.entityField) lookup.$fieldMap[options.entityField] = "entityName";
		}
		return lookup;
	},
	getSelectRepresentations(_, options) {
		var app = options.application;
		if (!app) return;
		var ep = options.endpoint || app.defaultEndpoint(_);
		if (!ep) return;
		var lookup = {
			$type: "application/json;vnd.sage=syracuse"
		};
		var baseUrl = ep.getBaseUrl(_);
		if (app.protocol(_) === "x3") {
			lookup.$url = baseUrl + "/AREPIDX?representation=AREPIDX.$select";
			lookup.$fieldMap = {};
			if (options.representationField) lookup.$fieldMap[options.representationField] = "NAME";
			if (options.entityField) lookup.$fieldMap[options.entityField] = "CLASSE";

		} else if (app.protocol(_) === "syracuse") {
			lookup.$url = baseUrl + "/lookupRepresentations?application={applicationName}&contract={contractName}&dataset={endpointName}&representation=lookupRepresentation.$select";
			lookup.$fieldMap = {};
			if (options.representationField) lookup.$fieldMap[options.representationField] = "name";
			if (options.entityField) lookup.$fieldMap[options.entityField] = "entityName";
		}
		return lookup;
	},
	startTimers(_) {
		try {
			var db = this.getCollaborationOrm(_);
			var auts = db.fetchInstances(_, db.getEntity(_, "automate"));
			auts.forEach_(_, function(_, a) {
				a.scheduleNextRun(_);
			});
			// start notification scheduler
			require('syracuse-event/lib/scheduler').scheduleAll(_);
		} catch (e) {
			console.error(new Date().toISOString(), "Error during event scheduling " + e.stack);
		}
	},
	logServerMessage(_, description, diagnoses, logDate) {
		//
		var db = this.getCollaborationOrm(_);
		var log = db.getEntity(_, "serverLog").createInstance(_, db);
		log.description(_, description);
		log.logDate(_, logDate || datetime.now());
		var messages = log.messages(_);
		diagnoses && diagnoses.forEach_(_, function(_, d) {
			var child = messages.add(_);
			child.severity(_, d.$severity || d.severity);
			child.message(_, d.$message || d.message);
		});
		log.automate(_, globals.context.automateInstance);
		log.save(_);
	},
	setup(config, sessionConfig, hosting) {
		exports.setup(config, sessionConfig, hosting);
	}
};

exports.setup = function(config, sessionConfig, hosting) {
	var collConf = config || {};
	_config.application = collConf.application || "syracuse";
	_config.contract = collConf.contract || "collaboration";
	_config.dataset = collConf.dataset || "syracuse";
	_config.session = sessionConfig || {};
	multiTenant = (hosting && hosting.multiTenant);
	if (multiTenant) _orm = {};
	else _orm = null;
};