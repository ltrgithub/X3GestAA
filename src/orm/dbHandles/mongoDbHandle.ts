"use strict";

/// !doc
/// # Mongodb handle API  
/// usually this object is already instantiated on the context
/// ```javascript
/// var dataModel = require("../../../src/orm/dataModel");
/// var model = dataModel.make(...);
/// // now get the mongodb handle
/// var db = dataModel.getOrm(_, model, dataset);  
/// ```
/// 

var config = require('config'); // must be first syracuse require
var mongodb = require('mongodb');
var helpers = require('@sage/syracuse-core').helpers;
var forEachKey = helpers.object.forEachKey;
var flows = require('streamline-runtime').flows;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var parser = require("@sage/syracuse-sdata-parser");
var ez = require('ez-streams');
var sys = require("util");
var perfmon = require('../../..//src/perfmon/record');
var base64;
var importHandler = require("syracuse-import/lib/jsonImport");

var processId = require('os').hostname() + "$_" + process.pid;

var mongoTracer = require('@sage/syracuse-core').getTracer("orm.mongodb");
var tracer; // = console.log;
var connectionPool = null;
var opRef = 0;
// instance locks will be removable after 2 hours
var lockLifeTime = (config.collaboration && config.collaboration.lockLifeTime) || 7200000;
var dbLockLifeTime = (config.collaboration && config.collaboration.dbLockLifeTime) || lockLifeTime;
var _funnels = {};

var syracuseEscapeMap = {
	$uuid: "_uuid",
	$url: "_url",
	$index: "_index",
	$keys: "_keys",
	$type: "_type",
	$syncUuid: "_syncUuid",
	$variantType: "_variantType",
	$signature: "_signature",
	$updDate: "_updDate",
	$updUser: "_updUser",
	$creDate: "_creDate",
	$creUser: "_creUser",
	$ttl: "_expire",
	$tick: "_tick",
	$stamp: "_stamp",
	$endpoint: "_endpoint",
	$factory: "_factory",
	$factoryOwner: "_factoryOwner",
	$allowFactoryUnlink: "_allowFactoryUnlink",
	$mark: "_mark"
};
var syracuseUnescapeMap = {
	_uuid: "$uuid",
	_url: "$url",
	_index: "$index",
	_keys: "$keys",
	_type: "$type",
	_syncUuid: "$syncUuid",
	_variantType: "$variantType",
	_signature: "$signature",
	_updDate: "$updDate",
	_updUser: "$updUser",
	_creDate: "$creDate",
	_creUser: "$creUser",
	_expire: "$ttl",
	_tick: "$tick",
	_stamp: "$stamp",
	_endpoint: "$endpoint",
	_factory: "$factory",
	_factoryOwner: "$factoryOwner",
	_allowFactoryUnlink: "$allowFactoryUnlink",
	_mark: "$mark"
};

var minMongoVer = [2, 6, 0];

function versionNumber(a) {
	return (a[0] << 16) | (a[1] << 8) | a[2];
}

// escape :
// $ by \u007F

function escapeArray(input) {
	return input.map(function(item) {
		switch (typeof item) {
			case "object":
				return escapeJson(item);
			case "string":
				return (item[0] === "$") ? ("\u007F" + item.substring(1)) : item;
			default:
				return item;
		}
	});
}

function escapeJson(input) {
	// Do not escape Date objects
	if (input instanceof Date) return input;
	// must clone as original object might be used later unescaped
	if (Array.isArray(input)) return escapeArray(input);
	//
	var out = {};
	forEachKey(input, function(key, value) {
		var escKey = key;
		var escVal = value;
		if (value !== null) {
			if (Array.isArray(value)) {
				escVal = escapeArray(value);
			} else if (typeof value === "object") escVal = escapeJson(value);
			if (syracuseEscapeMap[key]) escKey = syracuseEscapeMap[key];
			else {
				if (key[0] === "$") {
					escKey = "\u007F" + key.substring(1);
					//			escKey = "é"+key.substring(1); 
				}
			}
		}
		out[escKey] = escVal;
	});
	//
	return out;
}
// unescape :
// \u007F by $

function unescapeJson(input) {
	forEachKey(input, function(key, value) {
		var escKey = key;
		var escVal = value;
		if (Array.isArray(value)) {
			escVal = [];
			value.forEach(function(item) {
				if (typeof item === "object") escVal.push(unescapeJson(item));
				else if (typeof item === "string") escVal.push((item[0] === "\u007F") ? ("$" + item.substring(1)) : item);
				else escVal.push(item);
			});
		} else if (typeof value === "object") escVal = unescapeJson(value);
		if (syracuseUnescapeMap[key]) {
			escKey = syracuseUnescapeMap[key];
			delete input[key];
		} else {
			if (key[0] === "\u007F") {
				escKey = "$" + key.substring(1);
				delete input[key];
			}
		}
		input[escKey] = escVal;
	});
	return input;
}

function _startProfile() {
	return (new Date()).getTime();
}

function _endProfile(startTime) {
	return (new Date()).getTime() - startTime;
}

function decorateFilter(_, db, entity, filter) {
	function _makeTerm(key, loc, value) {
		var locKey = key.slice(0);
		locKey.push(loc);
		locKey = locKey.join(".");
		var term = {};
		term[locKey] = value;
		return term;
	}

	function _isLocalizedProp(ent, propName) {
		return ent.$properties && ent.$properties[propName] && ent.$properties[propName].$isLocalized;
	}
	flows.eachKey(_, filter, function(_, key, value) {
		if (Array.isArray(value)) {
			value.forEach_(_, function(_, innerFilter) {
				decorateFilter(_, db, entity, innerFilter);
			});
		} else {
			var newKey = null;
			if (key === "$uuid") {
				newKey = "_id";
			} else {
				var sKey = key.split(".");
				if (sKey[sKey.length - 1] === "$uuid") {
					sKey.pop(); // if last part is $uuid ignore it (is added automatically)
				}
				var lastPart = sKey[sKey.length - 1];
				var keysLen = sKey.length;
				// walk
				var targetEnt = entity;
				var rels = [];
				var crtRel = null;
				sKey.forEach(function(part) {
					if (targetEnt.$relations[part]) {
						crtRel = targetEnt.$relations[part];
						targetEnt = targetEnt.$relations[part].targetEntity;
					} else crtRel = null;
					rels.push(crtRel);
				});
				// last part is a relation
				if (crtRel) {
					if (crtRel.isPlural) {
						newKey = sKey.join(".") + "." + syracuseEscapeMap["$uuid"];
						if (value == null) value = {
							$in: [
								[], null
							]
						};
					} else newKey = sKey.join(".") + "." + syracuseEscapeMap["$uuid"];
				} else {
					// lastPart is not a relation but a join to a reference (not child)
					if ((keysLen > 1) && (sKey[keysLen - 1]) && rels[keysLen - 2] && !rels[keysLen - 2].getIsChild()) {
						var rel = rels[keysLen - 2];
						var f = {};
						f[lastPart] = value;
						var js = db.fetchInstances(_, rel.targetEntity, {
							jsonWhere: f
						});
						value = {
							$in: js.map(function(j) {
								return j.$uuid;
							})
						};
						sKey[keysLen - 1] = "_uuid";
						newKey = sKey.join(".");
					} else {
						// case sensitive
						if (targetEnt.$properties && targetEnt.$properties[lastPart] && targetEnt.$properties[lastPart].$caseInsensitive)
							if (typeof value === "string") {
								// escape special characters of regular expressions
								var valueEsc = value.replace(/([\\\^\$\.\(\)\[\]\{\}\*\?\+])/g, "\\$1");
								filter[key] = value = {
									$regex: "^" + valueEsc + "$",
									$options: "i"
								};
							}
							// localization
						if (_isLocalizedProp(targetEnt, lastPart)) {
							if (value != null) {
								var locKey = sKey + "." + locale.current.toLowerCase();
								var t_eq = {};
								t_eq[locKey] = null;
								var t_neq = {};
								t_neq[locKey] = {
									$ne: null
								};
								//
								newKey = "$or";
								value = [{
									$and: [t_neq, _makeTerm(sKey, locale.current.toLowerCase(), value)]
								}, {
									$and: [t_eq, _makeTerm(sKey, "default", value)]
								}];
							}
						} else {
							// is last part the locale code of a localized prop ?
							if (_isLocalizedProp(targetEnt, sKey[sKey.length - 2])) {
								sKey[sKey.length - 1] = sKey[sKey.length - 1].toLowerCase();
								newKey = sKey.join(".");
							} else {
								// last part is property or technical
								if (sKey.length && syracuseEscapeMap[lastPart]) {
									sKey[sKey.length - 1] = syracuseEscapeMap[lastPart];
									newKey = sKey.join(".");
								}
							}
						}
					}
				}
			}
			if (newKey && (newKey !== key)) {
				filter[newKey] = value;
				delete filter[key];
			}
		}
	});
	return filter;
}

function getSelectFields(entity, shallow) {
	var fields = [];
	//	var meta = entity.deepMeta;
	var meta = entity;
	forEachKey(meta.$properties, function(name, prop) {
		if (prop.$isComputed || prop.$isLazy) return;
		fields.push(name);
	});
	forEachKey(meta.$relations, function(name, rel) {
		if (rel.$isComputed || rel.$isLazy) return;
		fields.push(name);
	});
	// add technical fields
	fields.splice(0, 0, "_creUser", "_creDate", "_updUser", "_updDate", "_signature", "_syncUuid", "_tick", "_endpoint", "_stamp", "_expire", "_factory", "_factoryOwner");
	//
	return fields;
}

// cursor

function _nextObject(cursor, _) {
	return cursor.nextObject(_);
}

function MongodbCursor(db, entity, cursor, parameters) {
	this._cursor = cursor;
	this._entity = entity;
	this._db = db;
	this._parameters = parameters || {};
	//	this._dataFuture = _nextObject(this._cursor, !_);
}
var cursorProto = MongodbCursor.prototype;
cursorProto.next = function(_) {
	var self = this;
	var data;
	/*	if (data = self._dataFuture(_)) {
		self._dataFuture = _nextObject(self._cursor, !_);
		data.$key = data._id;
		data.$uuid = data._id;
		data.$loaded = true;
		return self._entity.factory.createInstance(_, unescapeJson(data), self._db);
	} else return null;
    */
	if ((data = self._cursor.nextObject(_))) {
		data.$key = data._id;
		data.$uuid = data._id;
		data.$loaded = true;
		return self._parameters.rawResults ? (self._parameters.rawResults === "escaped" ? unescapeJson(data) : data) : self._entity.factory.createInstance(_, unescapeJson(data), self._db);
	} else return null;
};

// stores
// writable stream wrapper for grid store

function GridWritableStream(store) {
	this.store = store;
}
var gdWsProto = GridWritableStream.prototype;
ez.writer.decorate(gdWsProto);

gdWsProto.write = function(_, buffer, enc) {
	if (buffer == null)
	// means end
		this.store.close(_);
	else this.store.write(buffer, _);
};
// store constructor

function MongodbFileStore(db, fileName) {
	this.db = db.db;
	this.fileName = fileName;
	this.readStore = null;
	this.writeStore = null;
	this.readPosition = 0;
}
//

function _openStore(_, fileStore, mode) {
	var store = new mongodb.GridStore(fileStore.db, fileStore.fileName, mode);
	return store.open(_);
}
var storeProto = MongodbFileStore.prototype;
storeProto.getProperties = function(_) {
	var store = this.readStore || _openStore(_, this, "r");
	return {
		length: store.length,
		contentType: store.contentType,
		fileName: store.metadata && store.metadata.fileName,
		uploadDate: store.uploadDate,
		chunkSize: store.chunkSize
	};
};
storeProto.fileExists = function(_) {
	if (!this.fileName) return false;
	return mongodb.GridStore.exist(this.db, this.fileName, _);
};
storeProto.setFile = function(_, fileName) {
	this.close(_);
	//
	this.fileName = fileName;
};
// stream interface
storeProto.createReadableStream = function(_) {
	// force open a file store to reset stream read position
	mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.GridFS open store for read: " + this.fileName);
	var store = (new mongodb.GridStore(this.db, this.fileName, "r")).open(_);
	var stream = ez.devices.node.reader(store.stream(true));
	stream.headers = {
		contentType: store.contentType,
		contentLength: store.length,
		filename: store.metadata && store.metadata.fileName,
	};
	return stream;
};

storeProto.createWritableStream = function(_, options) {
	if (options && options.append) {
		throw new Error("No append mode any more with MongoDB driver 2.0!");
	}
	var mode = "w";
	var store = new mongodb.GridStore(this.db, this.fileName, mode).open(_);
	//
	store.metadata = store.metadata || {};
	if (options) {
		if (options.contentType) store.contentType = options.contentType;
		if (options.fileName) store.metadata.fileName = options.fileName;
		//
		if (options.referingInstance) store.metadata.referingInstance = options.referingInstance;
	}
	var etag = store.metadata.etag || 0;
	store.metadata.etag = ++etag;
	//
	return (new GridWritableStream(store));
};
storeProto.writeMetadata = function(_, options) {
	var store = new mongodb.GridStore(this.db, this.fileName, "w+").open(_);
	//
	store.metadata = store.metadata || {};
	if (options) {
		if (options.contentType) store.contentType = options.contentType;
		if (options.fileName) store.metadata.fileName = options.fileName;
		//
		if (options.referingInstance) store.metadata.referingInstance = options.referingInstance;
	}
	var etag = store.metadata.etag || 0;
	store.metadata.etag = ++etag;
	store.close(_);
};
storeProto.deleteFile = function(_) {
	if (this.fileExists(_)) mongodb.GridStore.unlink(this.db, this.fileName, _);
};
storeProto.close = function(_) {
	var store = new mongodb.GridStore(this.db, this.fileName, "w+").open(_);
	store.close(_);
};

function MongoDbHandle(model, dataset) {
	var self = this;
	self.model = model;
	self.dataset = dataset;
	self.baseUrl = ["/sdata", model.contract.application, model.contract.contract, dataset.database].join("/");

	self.escapeJson = function(input) {
		return escapeJson(input);
	};
	self.unescapeJson = function(input) {
		return unescapeJson(input);
	};



	self.ensureExpireIndex = function(_, entity) {
		var db = self.db;
		if (entity.$expire) {

			// expire index only on existing collection
			var listCollections = db.listCollections({
				name: entity.className
			}).toArray(_);
			if (listCollections.length > 0) {

				var col = db.collection(entity.className, _);
				var indexes = col.indexInformation({
					full: true
				}, _);
				var found = false;
				for (var i = 0; i < indexes.length && !found; i++) {
					found = (indexes[i].key["_expire"]);
				}

				// check if _expire index exists or

				if (!found) {
					col.ensureIndex({
						"_expire": 1
					}, {
						expireAfterSeconds: 0
					}, _);
				}

			}
		} else {
			// expire index only on existing collection
			var listCollections = db.listCollections({
				name: entity.className
			}).toArray(_);
			if (listCollections.length > 0) {

				var col = db.collection(entity.className, _);
				var indexes = col.indexInformation({
					full: true
				}, _);
				var found = false;
				for (var i = 0; i < indexes.length && !found; i++) {
					found = (indexes[i].key["_expire"]);
				}
				if (found) {
					col.dropIndex({
						"_expire": 1
					}, _);
				}
			}
		}
	};

	function _expireEntities(_, model, db) {
		var entities = model.getEntities();

		if (entities) {
			for (var name in entities) self.ensureExpireIndex(_, entities[name]);
		}
	}
	// initialize the database connection
	self.connect = function(_) {
		function _mustSync(_, params) {
			var sa = _getUpdateScripts(model);
			return sa.some(function(us) {
				var meta = require(us.script).metadata || {};
				if (!meta.fileId) return;
				var actualVersion = ((params[meta.fileId] || {}).version != null) ? params[meta.fileId].version : -1;
				return (actualVersion !== (us.version || 0));
			});
		}

		function _getModelParams(_) {
			var pm;
			var params = db.collection("dbParam", _).find().toArray(_);
			if (params && params.length) {
				var p = params[0];
				pm = p[model.name] = p[model.name] || {};
			}
			return pm;
		}
		var self = this;
		var automaticImports = [];
		(model.dbMeta.automaticImport || []).forEach(function(item) {
			automaticImports.push(item);
		});
		var connectionString = dataset.connectionString;
		var host = dataset.hostname;
		var port = dataset.port;
		//		var host = "localhost";
		//		var port = 27017;
		var key = (connectionString || host + '/' + port) + '/' + dataset.database + '/' + globals.context.tenantId;
		if (connectionPool && connectionPool[key]) {
			self.db = connectionPool[key];
			/*
			var ok = self.db.admin().serverStatus(_).ok;
			console.log("OK "+ok)
			mongoTracer.debug && mongoTracer.debug("Mongodb connect - pool connection for : " + (connectionString || (host + ":" + port)) + "/" + dataset.database + " in state: " + self.db.state);
			if (!ok) {
				try {
					self.db.close();
				} catch (e) {
					console.error("ERROR "+e)
				}
				//self.db.open(_);
				var opt = (config.mongodb || {}).options || {
					db: {
						w: 1
					}
				};
				// var dbName =  globals.context.tenantId + '-' + dataset.database;
				var dbname = dataset.databaseName ? dataset.databaseName : dataset.database;
				if (globals.context.tenantId) dbname = globals.context.tenantId + '-' + dbname;
				var dbUrl = "mongodb://" + (connectionString || (host + ":" + port)) + "/" + dbname;
				self.db = mongodb.MongoClient.connect(dbUrl, opt, _);
				connectionPool[key] = self.db;
			}
			*/
			return;
		}
		// create a connection
		// mongoTracer.debug && mongoTracer.debug("Mongodb connect : " + host + ":" + port);

		var dbname = dataset.databaseName ? dataset.databaseName : dataset.database;
		if (globals.context.tenantId) dbname = globals.context.tenantId + '-' + dbname;
		var dbUrl = "mongodb://" + (connectionString || (host + ":" + port)) + "/" + dbname;
		tracer && tracer("Mongodb connect : " + dbUrl);
		/*		var server = new mongodb.Server(host, port, {});
		var db = new mongodb.Db(dbname, server, {
			w: 1
		});
		db = db.open(_);*/
		var opt = (config.mongodb || {}).options || {
			db: {
				w: 1
			}
		};
		var db = self.db = mongodb.MongoClient.connect(dbUrl, opt, _);
		var dbInfo = db.admin().serverInfo(_);
		if (versionNumber(dbInfo.versionArray) < versionNumber(minMongoVer)) {
			throw new Error("Unsupported mongoDB version '" + dbInfo.version + "' for database '" + dbname + "'. Expected '" + minMongoVer.join(".") + "' or greater.");
		}
		// add to pool BEFORE synchronize, because sync scripts might use adminUtil and request the admin orm
		if (connectionPool) connectionPool[key] = db;
		// synchronize start
		// force unlock resque procedure
		if (process.argv[2] === "--dbUnlock" || process.argv[process.argv.length - 1] === "--dbUnlock") {
			self.unlockDatabase(_);
		}
		if (process.argv[2] === "--dbUnlockAll" || (config.system || {}).enableDevelopmentFeatures) self.unlockAll(_);
		// find out whether syncrhonization is necessary
		var sync = false;

		// self.db.open(_);		
		var pm = _getModelParams(_);
		if (pm) {
			mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.connect ModelName: " + model.name + "; found dbParam: " + sys.inspect(pm));
			// structure change >>> : if dbVersion is not object, assume version number is the one of the first script in update scripts array
			var updScript = model.dbMeta.updateScript || {};
			var firstScript = Array.isArray(updScript) ? updScript[0].script : updScript.script;
			if (pm.dbVersion != null && firstScript) {
				var meta = require(firstScript).metadata;
				if (typeof pm.dbVersion === "object") {
					// this was not so good idea, db's aren't compatible with old code anymore
					// we create a plural instead
					var data = {};
					data.$set = {};
					data.$set[model.name] = {
						dbVersion: (pm.dbVersion[meta.fileId] || {}).version,
						dbVersions: pm.dbVersion
					};
					db.collection("dbParam", _).update({}, data, {
						safe: true,
						upsert: true
					}, _);
				} else if (!pm.dbVersions) {
					var ver = pm.dbVersion;
					pm.dbVersions = {};
					pm.dbVersions[meta.fileId] = {
						version: ver,
						description: meta.description
					};
					var data = {};
					data.$set = {};
					data.$set[model.name] = {
						dbVersion: ver,
						dbVersions: pm.dbVersions
					};
					db.collection("dbParam", _).update({}, data, {
						safe: true,
						upsert: true
					}, _);
				}
			}
			// structure change <<<
			sync = _mustSync(_, pm.dbVersions);
			if (!sync && automaticImports.length > 0) {
				if (!pm.automaticImportEtags) {
					sync = true;
				} else {
					// test modification times of update files first: loop through files until a file has not yet been examined or
					// its modification time is different: if a file has been found, it must be considered for automatic update.
					while (automaticImports.length) {
						var ai = automaticImports.shift();
						var fname;
						if (typeof ai === "string") {
							fname = ai;
						} else if (typeof ai === "object" && ai.import) {
							fname = ai.import;
						}
						var basename = fname.substr(0, fname.indexOf('.'));
						if (!(basename in pm.automaticImportEtags) || importHandler.importTest(_, fname, pm.automaticImportEtags[basename])) { // some change
							automaticImports.unshift(ai); // put item back into array because it must be handled again
							sync = true;
							break;
						}
					}
				}
			}
		} else {
			sync = true;
		}
		if (sync) {
			mongoTracer.debug && mongoTracer.debug("Synchronization seems to be necessary. Lock the database");
			// make sure there is not another operation pending
			var start = new Date();
			var lock = self.lockDatabaseRetry(_);
			//
			try {
				// read dbParam again to find out whether synchronization is still necessary
				pm = _getModelParams(_);
				if (pm && pm.dbVersions) {
					mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.connect ModelName: " + model.name + "; found dbParam: " + sys.inspect(pm));
					var sa = _getUpdateScripts(model);
					// execute update for each script
					sa.forEach_(_, function(_, us) {
						var meta = require(us.script).metadata || {};
						if (!meta.fileId) return;
						var actualVersion = ((pm.dbVersions[meta.fileId] || {}).version != null) ? pm.dbVersions[meta.fileId].version : -1;
						mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.connect ActualVersion: " + meta.fileId + "." + actualVersion);
						if (actualVersion !== (us.version || 0)) {
							_synchronizeDb(_, model, db, actualVersion, us);
						}
					});

				} else {
					// drop index to reset ttl and be sure we take the latest one then setExpireEntities and initalizeDb will recreate them
					_initializeDb(_, model, db);
				}
				_expireEntities(_, model, db);

				// read dbParam again in case of the update scripts modify it
				pm = _getModelParams(_);
				// handle automatic imports
				//				var config = require('config'); // must be first syracuse require
				if (!(config.system && config.system.protectSettings)) {
					var syncTracer = console.log;
					syncTracer && syncTracer("!!! EXECUTION OF THIS SCRIPT MAY TAKE UP TO 5 MINUTES, DON'T STOP YOUR SERVER !!!");
					var changeParam = false;
					var diag = [];
					// import files with changes. The files without modifications which have been examined before, will not be
					// 	examined a second time
					if (automaticImports.length > 0) {
						var shouldUpdateParams = false;
						pm = pm || {};
						pm.automaticImportEtags = pm.automaticImportEtags || {};
						var defferedScripts = [];
						while (automaticImports.length > 0) {
							var ai = automaticImports.shift();
							var fname, isAdvanced = false;
							if (typeof ai === "string") {
								fname = ai;
							} else if (typeof ai === "object" && ai.import) {
								fname = ai.import;
								isAdvanced = true;
							}
							var basename = fname.substr(0, fname.indexOf('.'));
							var data = pm.automaticImportEtags[basename];
							if (!data) {
								data = pm.automaticImportEtags[basename] = {
									updDate: null,
									contentHash: ""
								};
							}

							var importOptions = {
								importMode: "update",
								$diagnoses: diag,
								ifNoneMatch: data,
								defferedPostScripts: defferedScripts
							};
							if (isAdvanced) {
								if (ai.preScript) importOptions.preScript = ai.preScript;
								if (ai.postScript) importOptions.postScript = ai.postScript;
							}
							if (!importHandler.jsonImport(_, self, fname, importOptions)) {
								// remove unnecessary data in pm.automaticImportEtags before saving
								var list = Object.keys(pm.automaticImportEtags);

								if (list.length > model.dbMeta.automaticImport.length) {
									list.forEach(function(item) {
										if (model.dbMeta.automaticImport.indexOf(item + ".json") < 0) {
											delete pm.automaticImportEtags[item];
										}
									});
								}
								shouldUpdateParams = true;
								syncTracer && syncTracer(new Date().toISOString(), "Initialization file: " + fname + " imported " + (globals.context.tenantId || ""));
							}
						}
						// deffered post import scripts: we want them executed at the end of all scripts
						defferedScripts.forEach_(_, function(_, scr) {
							scr(_);
						});
						// 	change data in dbParam for this script
						if (shouldUpdateParams) {
							var upd = {};
							upd.$set = {};
							var automaticArray = [];
							// 	convert object back to array (for storage in MongoDB)
							upd.$set[model.name + ".automaticImportEtags"] = pm.automaticImportEtags;
							db.collection("dbParam", _).update({}, upd, {
								safe: true,
								upsert: true
							}, _);
						}
						syncTracer && syncTracer("Import of initialization files ended");
					}
				}
			} finally {
				self.unlockDatabase(_);
			}
		}
		model.initEntities(_, self);
	};
	//

	function _getUpdateScripts(model) {
		if (!model.dbMeta.updateScript) return [];
		return Array.isArray(model.dbMeta.updateScript) ? model.dbMeta.updateScript : [{
			script: model.dbMeta.updateScript,
			version: model.dbMeta.version
		}];
	}



	self.updateEntityIndex = function(_, entity) {
		var db = self.db;
		if (entity.$indexes)
			for (var idxName in entity.$indexes) {
				var indexItem = entity.$indexes[idxName];
				var fields = {};
				var isUnique = false;
				for (var i in indexItem) {
					if (i !== "$unique") fields[i] = ((indexItem[i] === "descending") || (indexItem[i] == -1)) ? -1 : 1;
				}
				//
				mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.synchronize ensure index: " + entity.className + "." + sys.inspect(fields));
				db.collection(entity.className, _).createIndex(fields, {
					unique: indexItem.$unique
				}, _);
			}
		entity.$uniqueConstraints && entity.$uniqueConstraints.forEach_(_, function(_, uc) {
			var fields = {};
			uc.forEach(function(f) {
				fields[f] = 1;
			});
			mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.synchronize ensure unique index: " + entity.className + "." + sys.inspect(fields));
			db.collection(entity.className, _).createIndex(fields, {
				unique: true
			}, _);
		});
	};

	function _initializeDb(_, model, db) {
		function _applyInitScript(_, script) {
			tracer && tracer("mongodbDbHandle.apply initialize script: " + script);
			importHandler.jsonImport(_, self, script, {
				importMode: "update", // leave update because of include before / after, we can modify even in intialization
				$diagnoses: diag
			});
		}
		if (self._isSynchronizing) return;
		self._isSynchronizing = true;
		try {
			var config = require('config'); // must be first syracuse require
			// db init
			// shouldn't protect settings for init scripts as they only apply on new databases
			if ( /*!(config.system && config.system.protectSettings) && */ model.dbMeta && model.dbMeta.initScript) {
				//tracer && tracer("mongodbDbHandle.apply initialize script: " + model.dbMeta.initScript);
				var diag = [];
				if (Array.isArray(model.dbMeta.initScript)) {
					model.dbMeta.initScript.forEach_(_, function(_, scr) {
						_applyInitScript(_, scr);
					});
				} else _applyInitScript(_, model.dbMeta.initScript);
				if (dataset.localInitScript) {
					if (Array.isArray(dataset.localInitScript)) {
						dataset.localInitScript.forEach_(_, function(_, scr) {
							_applyInitScript(_, scr);
						});
					} else _applyInitScript(_, dataset.localInitScript);
				}
				if (diag.length) mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.apply initialize script errors: " + sys.inspect(diag, null, 4));
			}
			// create indexes
			var entities = model.getEntities();
			if (entities) //
				for (var name in entities) {
					var entity = entities[name];
					self.updateEntityIndex(_, entity);
					//_ensureExpireIndex(_, entity, db);
				}
				// update dbParam
			var sa = _getUpdateScripts(model);
			var data = {};
			data.$set = {};
			var firstScript = sa[0] && sa[0].script;
			var initData = firstScript && require(firstScript).initData;
			if (initData) initData(_, self);
			var meta = firstScript && require(firstScript).metadata;
			data.$set[model.name] = {
				dbVersion: sa[0] && sa[0].version,
				dbVersions: sa.reduce(function(prev, us) {
					var meta = require(us.script).metadata;
					prev[meta.fileId] = {
						version: us.version,
						description: meta.description
					};
					return prev;
				}, {})
			};
			db.collection("dbParam", _).update({}, data, {
				safe: true,
				upsert: true
			}, _);
		} finally {
			self._isSynchronizing = true;
		}
	}

	function _synchronizeDb(_, model, db, actualVersion, updateMeta) {
		mongoTracer.debug && mongoTracer.debug("mongodbDbHandle.synchronize; ActualVersion: " + actualVersion + "; ModelVersion: " + updateMeta.version);
		// avoid dead-lock
		if (self._isSynchronizing) return;
		self._isSynchronizing = true;
		try {
			//if (actualVersion === -1) return;
			// data update procedure
			if ( /*(actualVersion !== -1) && */ updateMeta) {
				var updateScript = require(updateMeta.script);
				updateScript.tracer = mongoTracer;
				updateScript.dataUpdate(_, self, actualVersion, updateMeta.version);
			}
			// update dbVersion
			if (updateMeta && updateMeta.version != null && updateMeta.version > actualVersion) {
				var scriptMeta = require(updateMeta.script).metadata;
				var data = {};
				data.$set = {};
				data.$set[model.name + ".dbVersions." + scriptMeta.fileId] = {
					version: updateMeta.version,
					description: scriptMeta.description
				};
				db.collection("dbParam", _).update({}, data, {
					safe: true,
					upsert: true
				}, _);
			}
			const entities = model.getEntities();
			if (entities) {
				for (var name in entities) {
					var entity = entities[name];
					self.updateEntityIndex(_, entity);
					//_ensureExpireIndex(_, entity, db);
				}
			}
		} finally {
			self._isSynchronizing = false;
		}
	}
	//

	function _paramsToFilter(_, parameters, entity) {
		var filter = parser.sdataToJson(parameters.sdataWhere || parameters.where, {
			tracer: mongoTracer
		});
		// fusion jsonWhere (mostly internal filter parts) in filter (mostly sdata external filter)
		if (parameters.jsonWhere) {
			if (Object.keys(filter).length) {
				filter = {
					$and: [filter, parameters.jsonWhere]
				};
			} else filter = parameters.jsonWhere;
		}
		/*		parameters.jsonWhere && forEachKey(parameters.jsonWhere, function(key, value) {
			filter[key] = value;
		});*/
		// pager
		if (parameters.letter) {
			var sort = _paramsToOrderBy(parameters, entity);
			if (sort.length) {
				filter[sort[0][0]] = sort[0][1] === "ascending" ? {
					$gte: parameters.letter
				} : {
					$lte: parameters.letter
				};
			}
		}
		if (parameters.key) {
			var sort = _paramsToOrderBy(parameters, entity);
			if (sort.length) {
				var s = sort[0][0];
				var k = parameters.key.split(".");
				filter[s] = {};
				filter[s]["$" + k[0]] = k[1];
			}
		}
		// clone filter to avoid returning modified instance
		filter = helpers.object.clone(filter, true);
		// for relations, decorate filter 
		filter = decorateFilter(_, self, entity, filter);
		// change the $uuid key if any
		if (filter._uuid) {
			filter._id = filter._uuid;
			delete filter._uuid;
		}
		//
		return filter;
	}

	function _paramsToOrderBy(parameters, entity) {
		var sort = [];
		if (parameters.orderBy && parameters.orderBy.length) {
			parameters.orderBy.forEach(function(orderBy) {
				if (orderBy.binding[0] === "$")
					orderBy.binding = "_" + orderBy.binding.substring(1);
				if (entity.$properties && entity.$properties[orderBy.binding] && entity.$properties[orderBy.binding].$isLocalized) {
					sort.push([orderBy.binding + "." + locale.current.toLowerCase(), (orderBy.descending ? "descending" : "ascending")]);
					sort.push([orderBy.binding + ".default", (orderBy.descending ? "descending" : "ascending")]);
				} else //
					sort.push([orderBy.binding, (orderBy.descending ? "descending" : "ascending")]);
			});
		} else {
			if (entity.defaultOrder && entity.defaultOrder.length) {
				entity.defaultOrder.forEach(function(order) {
					sort.push([order[0], (order[1] ? "ascending" : "descending")]);
				});
			} else {
				sort.push(["$uuid", "ascending"]);
			}
		}
		return sort;
	}
	self.getFileStore = function(fileName) {
		return new MongodbFileStore(this, fileName);
	};
	//
	/// -------------
	/// ## getEntity function :
	/// ``` javascript
	/// var entity = db.getEntity(_, entityName);
	/// ```
	/// Get the class metadata as an entity
	/// 
	/// 
	self.getEntity = function(_, entityName) {
		return this.model.getEntity(_, entityName) || this.model.getEntity(_, this.model.singularize(entityName));
	};
	self.getUpdDatePropName = function() {
		return "$updDate";
	};
	// fetch instance
	self.fetchInstance = function(_, entity, uuid) {
		if (typeof entity === 'string') entity = this.model.getEntity(_, entity);
		var filter;
		var options = {
			fields: getSelectFields(entity),
			limit: 1
		};
		if (typeof uuid === "object") {
			filter = _paramsToFilter(_, uuid, entity);
			options.sort = _paramsToOrderBy(uuid, entity);
		} else filter = {
			_id: uuid
		};
		var timing = perfmon.start(module, "mongodb.fetchInstance", entity.name + '/' + filter._id);
		mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstance filter: " + sys.inspect(filter, null, 4));
		var dataArray = this.db.collection(entity.className, _).find(filter, options).toArray(_);
		timing.end({
			count: dataArray.length
		});
		if (dataArray.length) {
			mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstance found: " + entity.name + "\n+" + sys.inspect(uuid) + "\n+" + sys.inspect(dataArray[0]));
			dataArray[0].$key = dataArray[0]._id;
			dataArray[0].$uuid = dataArray[0]._id;
			dataArray[0].$loaded = true;
			return entity.factory.createInstance(_, unescapeJson(dataArray[0]), this);
		} else {
			mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstance not found: " + entity.name + "\n+" + sys.inspect(uuid, null, 4));
			return null;
		}
	};
	// used for lazy load properties (binary or large text)
	self.fetchInstanceProperty = function(_, entity, propName, param) {
		var filter;
		var options = {
			fields: [propName],
			limit: 1
		};
		if (typeof param === "object") {
			filter = _paramsToFilter(_, param, entity);
			options.sort = _paramsToOrderBy(param, entity);
		} else filter = {
			_id: param
		};
		var timing = perfmon.start(module, "mongodb.fetchInstanceProperty", entity.name + '/' + filter._id + '/' + propName);
		var dataArray = this.db.collection(entity.className, _).find(filter, options).toArray(_);
		timing.end({
			count: dataArray.length
		});
		if (dataArray.length) {
			mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstanceProperty found: " + entity.name + "\n+" + param + "\n+" + sys.inspect(dataArray[0]));
			return dataArray[0][propName];
		} else {
			mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstance not found: " + entity.name + "\n+" + param);
			return null;
		}
	};
	//
	self.count = function(_, entity, params) {
		var parameters = params || {};
		//
		var filter = _paramsToFilter(_, parameters, entity);
		//
		return this.db.collection(entity.className, _).count(filter, _);
	};
	//
	/// -------------
	/// ## createCursor function :
	/// ``` javascript
	/// var cursor = db.createCursor(_, entity, params, shallow);
	/// var data;
	/// while(data = cursor.next(_) {
	///   // do something with data witch is an object instance
	/// }
	/// ```
	/// Creates a cursor allowing to iterate over the objects in a collection
	/// function next(_) on the cursor returns the current instance. Returns null at the end of the cursor
	/// 
	/// ```javascript
	/// // parameters example
	/// params = {
	///   count: 20, // cursor fetch limit
	///   startIndex: 2, // skip parameter
	///   orderBy: [{binding:"name", descending: true}, {binding: title}],
	///   jsonWhere: {/* mongodb style json filter */} // or sdataWhere = sdataClause or where = parsed_expression_object
	/// }
	/// ```
	/// 
	self.createCursor = function(_, entity, params, shallow) {
		var parameters = params || {};
		mongoTracer.debug && mongoTracer.debug("mongodb.createCursor " + entity.className + " parameters: " + sys.inspect(parameters, null, 5));
		var options = {};
		if (parameters.count) options.limit = parameters.count;
		if (parameters.startIndex) options.skip = parameters.startIndex - 1;
		options.sort = _paramsToOrderBy(parameters, entity);
		options.fields = getSelectFields(entity, shallow);
		//
		var filter = _paramsToFilter(_, parameters, entity);
		//
		mongoTracer.debug && mongoTracer.debug("mongodb.createCursor filter: " + sys.inspect(filter));
		mongoTracer.debug && mongoTracer.debug("mongodb.createCursor options: " + sys.inspect(options));
		//

		return new MongodbCursor(this, entity, this.db.collection(entity.className, _).find(filter, options), parameters);
	};
	// fetch all instances acording to parameters
	self.fetchInstances = function(_, entity, params, shallow, context) {
		if (typeof entity === 'string') entity = this.model.getEntity(_, entity);
		var timing = perfmon.start(module, "mongodb.fetchInstances", entity.name);
		var startTime = _startProfile();
		var instances = [];
		var cursor = this.createCursor(_, entity, params, shallow);
		var data;
		var currentTime = new Date().getTime();
		while (data = cursor.next(_)) {
			// CRNIT: never ever do delete in fetch !!!!!
			/*var isDelete = false;

			if (entity.$expire) {
				try {
					if (!data.$ttl || currentTime > (new Date(data.$ttl).getTime())) {
						isDelete = true;
						data.deleteSelf();
					}
				} catch (e) {
					tracer && tracer("$ttl doesn't contain a date for entity " + entity.name);
				}
			}
			if (!isDelete)*/
			instances.push(data);
		}
		mongoTracer.debug && mongoTracer.debug("mongodb.fetchInstances found " + instances.length + " " + entity.className + "; TOOK: " + _endProfile(startTime));
		//
		timing.end({
			count: instances.length
		});
		return instances;
	};

	self.saveInstance = function(_, instance) {
		var self = this;
		if (instance._meta.$sequentialStorage) {
			var funnel = _funnels[instance._meta.name];
			if (!funnel) funnel = _funnels[instance._meta.name] = flows.funnel(1);
			return funnel(_, function(_) {
				return _internalSave(_, instance, self.db);
			});
		} else return _internalSave(_, instance, self.db);
	};
	// helper function

	function _encryptData(_, data) {
		base64 = base64 || require('syracuse-license').load('license');
		if (data.length >= 64) throw new Error(locale.format(module, "cannotEncrypt", data.length));
		var result = base64.license(0, data, new Boolean(true));
		if (result === null || result === undefined) throw new Error("Old version of license module");
		return result;
	}

	function _getDirtyProperty(_, data, $p, value, path) {
		if (!$p.$compute) {
			if (value && (typeof value === "object")) value = escapeJson(value);
			if ($p.$isLocalized) {
				value && Object.keys(value).forEach(function(loc) {
					data.$set[path + "." + loc] = value[loc];
				});
			} else if ($p.isExternalStorage()) {
				// !!! value is escaped, so use _uuid, instead of $uuid !!!
				if (value && value._uuid) data.$set[path + "._uuid"] = value._uuid;
				else data.$set[path] = {};
			} else if ($p.$encrypt) { // encrypt
				base64 = base64 || require('syracuse-license').load('license');
				if (value.toString().length >= 64) throw new Error(locale.format(module, "cannotEncrypt", value.toString().length));
				data.$set[path] = base64.license(0, value.toString(), new Boolean(true));
				if (data.$set[path] === null || data.$set[path] === undefined) throw new Error("Old version of license module");
			} else data.$set[path] = value;
		}
	}

	function _getDirtyPlural(_, data, pull, $r, value, path) {
		// array storage function: value is the array to be persisted
		// need to escape the childrens
		value.forEach_(_, function(_, v) {
			flows.eachKey(_, v, function(_, key, val) {

				var propMeta = $r.targetEntity && $r.targetEntity.$properties && $r.targetEntity.$properties[key];
				if (propMeta && propMeta.$encrypt) {
					v[key] = _encryptData(_, val.toString());
				}

				// Encrypt the first level childrens properties   - Need in automate 
				var rel = $r.targetEntity && $r.targetEntity.$relations && $r.targetEntity.$relations[key];
				var meta = rel && rel.getTargetEntity(val && val.$variantType);
				if (meta && (rel.getIsChild(val && val.$variantType))) {
					flows.eachKey(_, meta.$properties, function(_, kkey, vval) {
						if (vval.$encrypt) {
							v[key][kkey] = _encryptData(_, val[kkey].toString());
						}
					});
				}

			});
		});
		data.$set[path] = value && escapeJson(value);
	}

	function _getDirtyProps(_, data, pull, delta, meta, path) {
		var locPath = (path ? (path + ".") : "");
		flows.eachKey(_, delta, function(_, key, value) {
			// escaped key
			var escKey = syracuseEscapeMap[key] || key;
			//
			if (key === "$index") data.$set[locPath + escKey] = value;
			if (key === "$variantType") data.$set[locPath + escKey] = value;
			if (key === "$factory") data.$set[locPath + escKey] = value;
			if (key === "$factoryOwner") data.$set[locPath + escKey] = value;
			if (key === "$allowFactoryUnlink") data.$set[locPath + escKey] = value;
			if ((key === "$signature") && value) data.$set[locPath + escKey] = value;
			// is a property ?
			var $p = meta.$properties && meta.$properties[key];
			$p && _getDirtyProperty(_, data, $p, value, locPath + escKey);
			// is a relation ?
			var rel = meta.$relations && meta.$relations[key];
			if (rel && !rel.$compute && !rel.isComputed) {
				if (meta.$relations[key].isPlural) {
					_getDirtyPlural(_, data, pull, rel, value, locPath + escKey);
				} else {
					if (rel.getIsChild(value && value.$variantType) || rel.$inlineStore) {
						if (!value) {
							//										throw new Error("Cannot save null child for relation: "+key);
							data.$set[locPath + escKey] = {};
						} else {
							_getDirtyProps(_, data, pull, value, rel.getTargetEntity(value && value.$variantType), locPath + escKey);
							data.$set[locPath + escKey + "." + syracuseEscapeMap["$uuid"]] = value.$uuid;
						}
					} else {
						if (value) {
							if (value.$url) data.$set[locPath + escKey + "." + syracuseEscapeMap["$url"]] = value.$url;
							if (value.$variantType) data.$set[locPath + escKey + "." + syracuseEscapeMap["$variantType"]] = value.$variantType;
							if (value.$uuid) data.$set[locPath + escKey + "." + syracuseEscapeMap["$uuid"]] = value.$uuid;
						} else data.$set[locPath + escKey] = {};
					}
				}
			}
			//					}
			//				}
		});
	}

	// persist instance and its children
	function _internalSave(_, instance, db) {
		var data = {
			$set: {}
		};
		var pull = {};
		//
		var _opRef = opRef++;
		mongoTracer.debug && mongoTracer.debug("mongodb.save enter: opRef=" + _opRef);
		//
		if (instance._snapshotEnabled) var saveDelta = instance.getSaveSnapshotDelta(_);
		else var saveDelta = instance.serializeInstance(_);
		mongoTracer.debug && mongoTracer.debug("mongodb.save delta: opRef=" + _opRef + "; " + sys.inspect(saveDelta));
		//
		_getDirtyProps(_, data, pull, saveDelta, instance._meta);
		// technical meta
		var updDate = new Date();
		if (instance.$created) {
			data.$set._creUser = instance.$creUser;
			data.$set._creDate = instance.$creDate = updDate;
		}
		data.$set._updUser = instance.$updUser;
		// TODO: for now, mongodb doesn't seems to accept javascript in update, so we'll send the Syracuse server date
		// It would be best if it was the mongodb server date 
		data.$set._updDate = instance.$updDate = updDate;
		// save global UUID (remove existing syncUuid only when requested - this is to avoid removal of syncUuid when
		// an instance is stored and during storing, the synchronization digest is formed and syncUuids are assigned to the instances
		if (instance.$syncUuid || instance._deleteSyncUuid) {
			instance._deleteSyncUuid = false;
			data.$set._syncUuid = instance.$syncUuid;
		}
		if (instance.$stamp) {
			data.$set._stamp = new Date(instance.$stamp);
		}
		data.$set._tick = instance.$tick;
		data.$set._endpoint = instance.$endpoint;
		// manage time to live 
		if (instance._meta.$expire) {
			var millisec = instance._meta.$expire(_, instance);
			if (millisec && millisec > 0) {
				var curTime = (new Date()).getTime();
				data.$set._expire = instance.$expire = new Date(curTime + millisec);
			}
		}
		// manage factory instances
		if (instance.$factory) {
			data.$set._factory = instance.$factory;
			if (!instance.$factoryOwner) {
				data.$set._factoryOwner = instance.$factoryOwner = require('../serializer').getFactoryOwner(_);
			}
		} else if (instance.$factoryOwner) {
			instance.$factoryOwner = data.$set._factoryOwner = null;
		}

		//
		var collection = db.collection(instance.getClassName(), _);
		var instanceFilter = (instance._meta.$lockType && (instance._meta.$lockType === "noLock")) ? {
			_id: instance.$uuid
		} : {
			_id: instance.$uuid,
			$or: [{
				_updDate: instance.$initialUpdDate
			}, {
				_updDate: null
			}]
		};
		// crnit110825
		// in current mongodb version there is an issue making an atomic $pull and $addToSet on the same array
		// http://jira.mongodb.org/browse/SERVER-1050
		// this should be fixed but for now we'll make a distinct pull operation before
		// after mongodb fixes this, add pull to data and make just one call to update
		if (pull && (Object.keys(pull).length > 0)) {
			mongoTracer.debug && mongoTracer.debug("mongodb.save data pull: opRef=" + _opRef + "; " + instance.getClassName() + ";" + sys.inspect(pull));
			collection.update(instanceFilter, pull, {
				safe: true
			}, _);
		}
		//
		mongoTracer.debug && mongoTracer.debug("mongodb.save data: opRef=" + _opRef + "; " + instance.getClassName() + ";" + sys.inspect(data, null, 4));
		// TODO: if result is 0, detail error conditions
		var result;
		if (instance.$created) {
			// creation, do not check concurrency conditions. Use update because of the common use of $set for insert and for update.
			result = collection.update({
				_id: instance.$uuid
			}, data, {
				safe: true,
				upsert: true
			}, _);
		} else {
			mongoTracer.debug && mongoTracer.debug("mongodb.save data instanceFilter: opRef=" + _opRef + "; " + sys.inspect(instanceFilter));
			// check concurrency with updDate
			result = collection.update(instanceFilter, data, {
				safe: true,
				upsert: false
			}, _);
		}
		// keep the count
		if (result.result.n) instance.$initialUpdDate = instance.$updDate;
		mongoTracer.debug && mongoTracer.debug("mongodb.save data result: opRef=" + _opRef + "; " + result.result.n);
		return result.result.n;
	}

	//
	self.deleteInstance = function(_, instance) {
		var self = this;
		if (instance._meta.$sequentialStorage) {
			var funnel = _funnels[instance._meta.name];
			if (!funnel) funnel = _funnels[instance._meta.name] = flows.funnel(1);
			return funnel(_, function(_) {
				return _deleteInstance(_, instance, self.db);
			});
		} else return _deleteInstance(_, instance, self.db);
	};
	// delete instance and its childs

	function _deleteInstance(_, instance, db) {
		mongoTracer.debug && mongoTracer.debug("mongodb.deleteInstance: " + instance.$uuid);

		var dbresult = db.collection(instance.getClassName(), _).remove({
			_id: instance.$uuid
		}, {
			safe: true
		}, _);

		return dbresult.result.n;
	}

	// atomicaly create a instance lock
	self.lockInstance = function(_, instance) {
		if (!instance) return null;
		if (!instance.$uuid) return null;
		var session = globals.context.session;
		var userLogin = (session && session.getUserLogin(_)) || "anonymous";
		var ssid = (session && session.id) || processId;
		// try un upsert with _id=instance.$uuid and currect sessionId. If allready locked, returns count of 0
		var lockId = instance.$uuid;
		var coll = this.db.collection("dbLocks", _);
		for (var i = 0; i <= 1; i++) {
			try {
				var res = coll.update({
					_id: lockId,
					sessionId: ssid
				}, {
					$set: {
						sessionId: ssid,
						lockDate: new Date(),
						lockUser: userLogin
					}
				}, {
					safe: true,
					upsert: true
				}, _);
				if (res.result.ok) return {
					status: "success",
					id: lockId
				};
			} catch (ex) {
				if (ex.code == 11000) { // MongoError: duplicate key violation
					// read the lock record to return meta
					var locks = coll.find({
						_id: lockId
					}).toArray(_);
					if (locks && locks[0]) {
						if (i < 1) { // maybe the lock can be removed 
							var sessionId = locks[0].sessionId || "";
							// sessionId must be a UUID, otherwise it does not come from a real session
							if (sessionId.indexOf("-") > 0 && sessionId.length == 36) {
								// test whether sessionId still exists
								var coll2 = this.db.collection("SessionInfo", _);
								if (coll2) {
									var existingSessions = coll2.count({
										sid: sessionId
									}, {
										safe: true
									}, _);
									if (existingSessions === 0) { // session has expired
										// remove lock
										this.db.collection("dbLocks", _).remove({
											_id: instance.$uuid
										}, {
											safe: true
										}, _);
										continue; // try again
									}
								}
							}
							// lock expiration
							if (Date.now() - locks[0].lockDate.getTime() > lockLifeTime) {
								// remove lock
								this.db.collection("dbLocks", _).remove({
									_id: instance.$uuid
								}, {
									safe: true
								}, _);
								continue; // try again
							}

						}
						return {
							status: "locked",
							lock: locks[0]
						};
					}
				}
				console.log(new Date().toISOString(), "Lock error: " + ex);
				return {
					status: "error"
				};
			}
		}
	};
	self.unlockInstance = function(_, instance) {
		this.db.collection("dbLocks", _).remove({
			_id: instance.$uuid
		}, {
			safe: true
		}, _);
	};

	self.hasDatabaseLock = function(_) {
		var lockId = "database";
		try {
			var coll = this.db.collection("dbLocks", _);
			var locks = coll.find({
				_id: lockId
			}).toArray(_);
			return locks && locks[0];
		} catch (ex) {
			return false;
		}
	};

	// atomically create a database lock
	self.lockDatabase = function(_) {
		mongoTracer.debug && mongoTracer.debug("Mongodb locking database");
		var session = globals.context.session;
		var userLogin = (session && session.getUserLogin(_)) || "internal";
		var ssid = self._lockSid = self._lockSid || helpers.uuid.generate();
		// try un upsert with _id=instance.$uuid and currect sessionId. If allready locked, returns count of 0
		var lockId = "database";
		var coll = this.db.collection("dbLocks", _);
		for (var i = 0; i <= 1; i++) {
			try {
				var res = coll.update({
					_id: lockId,
					sessionId: ssid
				}, {
					$set: {
						sessionId: ssid,
						lockDate: new Date(),
						lockUser: userLogin
					}
				}, {
					safe: true,
					upsert: true
				}, _);
				if (res.result.ok) return {
					status: "success",
					id: lockId
				};
			} catch (ex) {
				if (ex.code == 11000) { // MongoError: duplicate key violation
					// read the lock record to return meta
					var locks = coll.find({
						_id: lockId
					}).toArray(_);
					if (locks && locks[0]) {
						if (i < 1) { // maybe the lock can be removed 
							// lock expiration
							if (Date.now() - locks[0].lockDate.getTime() > dbLockLifeTime) {
								// remove lock
								this.db.collection("dbLocks", _).remove({
									_id: lockId
								}, {
									safe: true
								}, _);
								continue; // try again
							}

						}
						return {
							status: "locked",
							lock: locks[0]
						};
					}
				}
				return {
					status: "error"
				};
			}
		}
	};

	// lock the instance, but retry it when it does not work out for the first time
	self.lockInstanceRetry = function(_, instance) {
		var start = new Date();
		var lock = self.lockInstance(_, instance);
		while ((lock.status !== "success") && (((new Date()) - start) < 60000)) {
			// wait some time, 50ms min
			setTimeout(_, Math.floor(Math.random() * 10000) + 50);
			//
			lock = self.lockInstance(_, instance);
		}
		if (lock.status !== "success") throw new Error(locale.format(module, "instanceLockTimeout", instance.$uuid));
		return lock;
	};

	// lock the database, but retry it when it does not work out for the first time
	self.lockDatabaseRetry = function(_) {
		var start = new Date();
		var lock = self.lockDatabase(_);
		while ((lock.status !== "success") && (((new Date()) - start) < 60000)) {
			// wait some time, 50ms min
			setTimeout(_, Math.floor(Math.random() * 10000) + 50);
			//
			lock = self.lockDatabase(_);
		}
		if (lock.status !== "success") throw new Error(locale.format(module, "databaseLockTimeout"));
		return lock;
	};
	self.unlockAll = function(_) {
		mongoTracer.debug && mongoTracer.debug("Mongodb unlocking all database and instance locks");
		this.db.collection("dbLocks", _).remove({}, {
			safe: true
		}, _);
		this._lockId = null;
	};
	self.unlockDatabase = function(_) {
		mongoTracer.debug && mongoTracer.debug("Mongodb unlocking database");
		this.db.collection("dbLocks", _).remove({
			_id: "database"
		}, {
			safe: true
		}, _);
		this._lockId = null;
	};
	//
	/// -------------
	/// ## getCounterValue function :
	/// ``` javascript
	/// var value = db.getCounterValue(_, domain, name, options);
	/// ```
	/// manages counters with model domain and name as unique key. 
	/// options:
	/// * value: if set it will update the counter value to the given value
	/// * increment: if set counter value will be increment by the given value
	/// * data: object that will be saved with the counter. Update of this is differential, meaning that property not in object
	///     aren't updated. To delete a property it must be set to null
	/// if (!value && !increment) existing value is returned without modification
	/// data is updated even if counter value is not modified
	///
	/// return value is in form of:
	/// ``` javascript
	/// {
	///   value: 152,
	///   data: {
	///     "...": "..."
	///   }
	/// }
	/// 
	self.getCounterValue = function(_, counterDomain, counterName, options) {
		function _buildSet(obj, prefix) {
			Object.keys(obj).forEach(function(key) {
				var val = obj[key];
				if (val && (typeof val === "object")) _buildSet(val, prefix + "." + key);
				else upd.$set[prefix + "." + key] = val;
			});
		}
		var counter;
		var opt = options || {};
		var cntColl = this.db.collection("dbCounters", _);
		var key = {
			model: model.name,
			domain: counterDomain,
			name: counterName
		};


		var upd = {};
		// value
		if (opt.increment) {
			upd.$inc = {
				value: opt.increment
			};
		} else if (opt.value) {
			upd.$set = upd.$set || {};
			upd.$set.value = opt.value;
		}
		// data
		if (opt.data && (typeof opt.data === "object")) {
			upd.$set = upd.$set || {};
			_buildSet(opt.data, "data");
		}
		//
		if (opt.increment || opt.value || opt.data) {
			counter = cntColl.findAndModify(key, null, upd, {
				upsert: true,
				"new": true
			}, _).value;
		} else {
			counter = cntColl.find(key).toArray(_)[0];
		}
		return counter;
	};
	//
	/// -------------
	/// ## pushObjectAction function :
	/// ``` javascript
	/// db.pushObjectAction(_, operation, id, url);
	/// ```
	/// Append a document to scheduled operations collection. A scheduler should consume this collection and apply operations 
	/// 
	self.pushObjectAction = function(_, operation, id, url) {
		return this.db.collection("dbScheduledOperations", _).findAndModify({
			_uuid: id,
			operation: operation
		}, null, {
			_uuid: id,
			operation: operation,
			url: url,
			timestamp: Date.now()
		}, {
			upsert: true
		}, _);
	};
	//
	/// -------------
	/// ## popObjectAction function :
	/// ``` javascript
	/// db.popObjectAction(_, operation);
	/// ```
	/// Append a document to scheduled operations collection. A scheduler should consume this collection and apply operations 
	/// 
	self.popObjectAction = function(_, operation) {
		var key = operation ? {
			operation: operation
		} : null;
		return this.db.collection("dbScheduledOperations", _).findAndModify(key, {
			timestamp: 1
		}, null, {
			remove: true
		}, _);
	};
}

helpers.defineClass(MongoDbHandle);

exports.create = function(_, model, dataset) {
	var handle = new MongoDbHandle(model, dataset);
	handle.connect(_);
	return handle;
};

//
exports.setup = function(mongodbConfig, mongoConnPool) {
	// Do not take tracer from nodelocal config anymore
	//tracer = mongodbConfig && mongodbConfig.tracer;
	connectionPool = mongoConnPool;
};