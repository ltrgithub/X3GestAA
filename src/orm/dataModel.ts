"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var find = helpers.object.find;
var forEachKey = helpers.object.forEachKey;
var pluralize = helpers.string.pluralize;
var capitalize = helpers.string.capitalize;
var resourceProxy = require('@sage/syracuse-core').resource.proxy;
var resourceHelpers = require('@sage/syracuse-core').resource.util;
var globals = require('streamline-runtime').globals;
// do not directly "require" the class as initialization sequence might lead to "undefined" (because of early require in factory.js
// of a module requiring "dataModel.js"
//var Factory = require("./factory").Factory;
var factory = require("./factory");
var locale = require('streamline-locale');
var flows = require('streamline-runtime').flows;
var entityClasses = require("./entities");
var sys = require("util");
var queryRepr = ["$query", "$lookup", "$search", "$select", "$bulk"]; // query like facets

// localization notes:
// 		localization applies to text, image, sound and video.
//		if property is marked as localized, mapper creates a one to many relationship transparently
//
//		string resources (identified by module name + resource name) are handled
//		explicitly via a StringResource entity because needs input from user
//
//		string is *not* localizable, use text type instead.

function _getTranslatedString(stringResources, parts, combineParts) {
	if (!stringResources || !parts || !parts.length) return "";
	for (var i = 0; i < (combineParts ? parts.length : 1); i++) {
		var str = stringResources[parts.slice(i).join(".")];
		//console.log("resource for : "+parts.slice(i).join(".")+"="+str);
		if (str) return str;
	}
}

function _copyIfStatic(src, dest, name) {
	if (src[name] && (typeof src[name] !== "function")) dest[name] = src[name];
}

var _allEvents = ["$beforeSave", "$canSave", "$afterSave"];

function _makeSelect(select, src) {
	if (Array.isArray(src)) {
		src.forEach(function(item) {
			_makeSelect(select, item);
		});
	} else forEachKey(src || {}, function(pName, prop) {
		if (pName === "$bind") {
			select[pName] = {};
			if (src.$items) _makeSelect(select[pName], src.$items);
			if (src.$layout) _makeSelect(select[pName], src.$layout);
		} else if (typeof prop === "object") {
			if (pName === "$items" || pName === "$layout" && !src.$bind) _makeSelect(select, prop);
		}
	});
}

//remove entries that have been disabled by config
function sanitize(obj) {
	obj = obj || {};
	return Object.keys(obj).reduce(function(r, key) {
		if (obj[key]) r[key] = obj[key];
		return r;
	}, {});
}

var DataModel = helpers.defineClass(function(contract) {
	var self = this;

	this.pluralMap = {};
	this.baseType = "application/json;vnd.sage=syracuse";

	//
	this.dbMeta = contract.dbMeta || {};
	this.name = contract.name;
	this.contract = contract;
	//
	this.entities = contract.entities = sanitize(contract.entities);
	this.repr = contract.representations = sanitize(contract.representations);
	this.rules = contract.$rules = sanitize(contract.$rules);
	//
	this.datasetOperations = {};
	this.mapper = null;
	this.classMap = {}; // entities (not factories) by class name
	this._entInstances = this._entities = {};
	//
	contract.localizedString = (function(entityName, propName) {
		var stringRes = contract.resources && contract.resources();
		return _getTranslatedString(stringRes, [entityName, propName]);
	}).bind(contract);



	// entities
	this.registerEntities(this.entities);
	//
	forEachKey(contract.service || {}, function(name, operation) {
		if (typeof operation.execute != "function") throw new Error("Contract service '" + name + "' does not have execute method");
		self.datasetOperations[name] = operation;
	});

	// representations
	this.checkRepresentations(this.repr);

	// global events
	self.$events = {};
	_allEvents.forEach(function(name) {
		self.$events[name] = self.$events[name] || [];
	});
	self.registerEvent = (function(_, eventName, eventId, handler, entityName) {
		var target = entityName ? self.getEntity(_, entityName) : self;
		if (!target && target.$events && target.$events[eventName]) return;
		if (eventId) {
			var ev;
			target.$events[eventName].some(function(e) {
				if (e.id === eventId) {
					ev = e;
					return true;
				}
				return false;
			});
			if (ev) {
				ev.handler = handler;
				return;
			}
		}
		target.$events[eventName].push(eventId ? {
			id: eventId,
			handler: handler
		} : handler);
	}).bind(self);
}, null, {

	singularize: function(name) {
		return this.pluralMap[name];
	},
	registerEntities: function(entities) {
		var self = this;
		forEachKey(entities, function(name, entity) {
			if (self.contract.entities && !self.contract.entities[name]) {
				self.contract.entities[name] = entity;
			}
			if (!entity._model) {
				entity.name = name;
				entity.alias = entity.$entityTemplate || name;
				// search facets
				if (self.contract.searchFacets) forEachKey(self.contract.searchFacets, function(key, facet) {
					if (facet.$fields && facet.$fields[entity.name]) {
						var f = entity.$facets = (entity.$facets || {});
						var ff = f[facet.$fields[entity.name]] = (f[facet.$fields[entity.name]] || []);
						ff.push(key);
					}
				});
				var entInst = self._entInstances[name] = self.entities[name] = new entityClasses.Entity(self, name, entity);

				if (self.pluralMap[entInst.plural]) throw new Error(entInst.name + ": duplicate plural: " + entInst.plural);
				if (self.entities[entInst.plural]) throw new Error(entInst.name + ": plural is identical to singular: " + entInst.plural);
				self.classMap[entity.className] = entInst;
				self.pluralMap[entity.plural] = name;
			}

		});
		// solve targetEntity
		forEachKey(self.entities, function(name, entity) {
			entity._solveTargetEntities();
		});
		// another pass to verify reverse relationships
		forEachKey(self.entities, function(name, entity) {
			entity._checkReverseRelations();
		});
	},
	unregisterEntities: function(_, entitiesNames) {
		var self = this;
		entitiesNames.forEach_(_, function(_, name) {
			var entity = self.contract.entities[name];
			if (entity) {
				// check related entities
				var linkedEntities = entity._dependencyOf(_);
				if (linkedEntities.length === 0) {
					delete self.pluralMap[entity.plural];
					delete self.classMap[entity.className];
					delete self._entInstances[entity.name];
					delete self.contract.entities[entity.name];
				} else {
					throw new Error("can't unregister " + entity.name + ": relation of " + JSON.stringify(linkedEntities));
				}
			}
		});
	},
	checkRepresentations: function(representations) {
		var self = this;
		forEachKey(representations, function(rName, rr) {
			rr.name = rName;
			forEachKey(self.repr.$facets || {}, function(fName, ff) {
				ff.name = fName;
				if (ff.$copy) rr.$facets[fName] = rr.$facets[ff.$copy];
				else {
					ff._select = {};
					_makeSelect(ff._select, ff.$layout);
				}
			});
		});
	},
	datasetOperations: function() {
		return helpers.object.clone(this.datasetOperations, false);
	},
	getEntities: function() {
		return helpers.object.clone(this.contract.entities, false);
	},
	getRules: function() {
		return helpers.object.clone(this.rules, false);
	},
	getRepresentation: function(_, name, facet) {
		// TODO: return the representation as the associated entity with filtered properties
		//return contract.entities[name];
		return this._entInstances[name];
	},
	getEntity: function(_, name) {
		//return contract.entities[name];
		return this._entInstances[name];
	},
	entityByClassName: function(name) {
		return this.classMap[name];
	},
	getIndexedEntities: function(_) {
		var self = this;
		return Object.keys(this.entities).filter(function(eName) {
			//return entities[eName].$searchIndex && entities[eName].$searchIndex.$fields;
			return self._entInstances[eName].$searchIndex && self._entInstances[eName].$searchIndex.$fields;
		}).map(function(eName) {
			//return entities[eName];
			return self._entInstances[eName];
		});
	},
	getSearchFacets: function(_) {
		var self = this;
		return Object.keys(this.contract.searchFacets || {}).map(function(fCode) {
			return {
				code: fCode,
				description: self.contract.searchFacets[fCode].$title
			};
		});
	},
	initEntities: function(_, db) {
		var self = this;
		Object.keys(self._entInstances).forEach_(_, function(_, name) {
			var entity = self._entInstances[name];
			if (entity.$initEntity) entity.$initEntity(_, db);
		});
	}
});


exports.make = function(contract, dataset) {
	// TODO : if the same model should be used for several datasets, first load modifies contract entities
	// so second load fails. Should detect the case or clone theese entities
	//	dataset = dataset || "all";
	// for now, same model for all dataset of the same contract
	dataset = "all";
	contract.models = contract.models || {};

	var model = contract.models[dataset];
	if (model) {
		if (contract.models && contract.models.all) {
			contract.models.all._entities = contract.models.all.entities;
		}
		return model;
	} else {
		contract.models[dataset] = new DataModel(contract);
		return contract.models[dataset];
	}
};

// getSyncData(_, orm):
// retrieve basic data for synchronization (endpoint, conflictPriority) from globalSettings instance
// result is an array: [endpoint, conflictPriority]

function getSyncData(_, orm) {
	var settingsEnt = orm.model.getEntity(_, "setting");
	var endpoint;
	var conflictPriority;
	if (settingsEnt) {
		var globalData = orm.fetchInstance(_, settingsEnt, {});
		if (!globalData) throw new Error(locale.format(module, "noGlobalSettings"));
		endpoint = globalData.endpoint(_) || "";
		conflictPriority = globalData.conflictPriority(_);
	} else {
		// for test cases
		conflictPriority = 5;
		endpoint = "http://" + require('os').hostname() + ":" + require('config').port;
	}
	endpoint += "/sdata/" + orm.model.contract.application + "/" + orm.model.contract.contract + "/" + orm.dataset.database + "/";
	return [endpoint, conflictPriority];
}
exports.getSyncData = getSyncData;


exports.getOrm = function(_, model, dataset) {
	//console.log("dataset "+dataset.driver);
	var orm;
	if (dataset.driver && (dataset.driver === "mongodb")) orm = require("../../src/orm/dbHandles/mongoDbHandle").create(_, model, dataset);
	else throw new Error("unsupported ORM driver: " + dataset.driver);
	// add synchronization data
	if (model.contract && model.contract.entities) {
		var ents = model.contract.entities;
		var metaEnt;
		var endpoint;
		var conflictPriority;
		var locked = false;
		try {
			Object.keys(ents).forEach_(_, function(_, name) {
				var entity = ents[name];
				if (!entity.$allowSync) return;
				var cnt = entity.getCounterValue(_, orm, "tick");
				if (!cnt) { // create counter
					if (!locked) orm.lockDatabaseRetry(_);
					locked = true;
					if (!endpoint) {
						var syncData = getSyncData(_, orm);
						endpoint = syncData[0];
						conflictPriority = syncData[1];
					}
					var data = {
						conflictPriority: conflictPriority,
						digest: []
					};
					if (endpoint) {
						data.endpoint = endpoint + entity.plural;
					}
					entity._syncEndpoint = data.endpoint || "";
					entity.getCounterValue(_, orm, "tick", {
						value: 2,
						data: data
					});
					// 	put syncUuid, endpoint, and tick to instances which do not have it yet
					var cursor = orm.createCursor(_, entity, {});
					var inst;
					while ((inst = cursor.next(_))) {
						// 	console.log("III "+((login in inst) ? inst.login(_) : inst.$uuid));
						if (!inst.$syncUuid) {
							inst.$syncUuid = helpers.uuid.generate();
						}
						if (!inst.$endpoint) {
							inst.$endpoint = "";
							inst.$tick = 1;
							inst._noIncreaseTick = true;
							inst.save(_);
						}
					}
				} else {
					entity._syncEndpoint = cnt.data.endpoint;
				}
			});
		} finally {
			if (locked) {
				orm.unlockDatabase(_);
			}
		}
		Object.keys(ents).forEach_(_, function(_, name) {
			var entity = ents[name];
			if (entity.$initEntity) entity.$initEntity(_, orm);
		});
	}


	return orm;
};