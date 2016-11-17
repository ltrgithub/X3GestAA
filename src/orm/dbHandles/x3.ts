"use strict";

var globals = require('streamline-runtime').globals;
var config = require('config'); // must be first
var helpers = require('@sage/syracuse-core').helpers;
var pool = require("syracuse-x3/lib/pool");
var parser = require('@sage/syracuse-sdata-parser');
var Factory = require("../../../src/orm/factory").Factory;
var Template = require('@sage/syracuse-core').resource.proxy.Template;
var locale = require('streamline-locale');
var resourceHelpers = require('@sage/syracuse-core').resource.util;
var httpHelpers = require('@sage/syracuse-core').http;
var entityClasses = require("../../../src/orm/entities");
var sys = require("util");

var nocache = config && config.hosting && config.hosting.nocache;

var x3OrmConfig = (config.orm || {}).x3 || {};
var x3Tracer = require('@sage/syracuse-core').getTracer("orm.x3");

var _models = {};

var _allEvents = ["$beforeSave", "$canSave", "$afterSave"];

function _makeDiagMessage(diags) {
	return (diags || []).reduce(function(prev, dd) {
		return prev ? prev + "\n" + dd.$message : dd.$message;
	}, "");
}

function _makeHttpError(resp, message) {
	var err = new Error(message);
	err.$httpStatus = (resp.head || {}).status;
	err.httpBody = resp.body;
	if (resp.body.$diagnoses) err.$diagnoses = resp.body.$diagnoses;
	return err;
}

function _normalizeDiag(diag) {
	return {
		$severity: diag.$severity || diag.severity,
		$message: diag.$message || diag.message,
		$stackTrace: diag.$stackTrace || diag.stackTrace
	};
}

function _fetchPrototype(_, handle, reprName, facetName, device, checkDiagnoses) {
	if (!facetName) throw new Error("_fetchPrototype: facetName is required for represention " + reprName);

	// fetch prototype
	var client = handle.getClient(_);
	var url = handle._baseUrl + "/$prototypes('" + reprName + "." + facetName + "')" + (device ? "?device=" + device : "");
	url += x3OrmConfig.monitor ? (device ? "&" : "?") + "monitor=true" : "";
	x3Tracer.debug && x3Tracer.debug("_fetchPrototype: url=" + url + ", locale=" + locale.current);
	var pr = client.jsonSend(_, {
		head: {
			"accept": "application/json;vnd.sage=syracuse",
			"accept-language": locale.current || "en-US",
			method: "GET",
			url: url
		},
		body: {}
	});
	if (checkDiagnoses === true) {
		// #1602 - Mobile - Bad $prototype url returned by page.pageContent enhancement
		// For mobile prototypes returns a $diagnose instead of the prototypes if error
		// It allows pageContent to build the full representation and portlet.representation to check if prototypes is OK and to return X3 diagnose to mobile client
		if (pr && pr.body) {
			var diag = pr.body.$diagnoses;
			if (diag && diag.length === 0) delete pr.body.$diagnoses;
			if (!diag && (pr.head == null || pr.head.status != 200)) {
				diag = pr.body.$diagnoses = [{
					"$severity": "error",
					"$message": "Unexpected null head property"
				}];
			}
			if (diag) {
				diag = diag[0];
				var stack = diag.$stackTrace;
				if (stack) stack += "\n\n";
				else stack = "";
				stack += "X3 request's Http info:\nUrl: " + url;
				if (pr.head) {
					stack += "\nStatus: " + pr.head.status;
					if (pr.head.message) stack += "\nMessage: " + pr.head.message;
				}
				diag.$stackTrace = stack;
			}
		} else {
			pr = {
				body: {
					"$diagnoses": [{
						"$severity": "error",
						"$message": "An empty prototye has been returned by X3",
						"$stackTrace": url
					}]
				}
			};
		}
	}
	if (pr.head && pr.head.status >= 400) throw _makeHttpError(pr, locale.format(module, "fetchProtoError", reprName, facetName, device || "desktop", _makeDiagMessage(pr.body && pr.body.$diagnoses)));
	//
	return pr && pr.body;
}

function X3Entity(model, entityName) {
	this._model = model;
	this.name = entityName;
	this.$isPersistent = true;
	this.$orgPrototypes = {};
	this.$properties = {};
	this.$relations = {};
	// facets is a structure like
	// {
	//		classField: ["facet1Name", "facet2Name"]
	// }
	// one field can be part of several facets
	this.$searchFacets = {};
	this.$ignoreValidateOnSave = true;
}

helpers.defineClass(X3Entity, null, {
	createInstance: function(_, db, initial) {
		return this.factory.createInstance(_, initial, db);
	},
	fetchInstance: function(_, db, options) {
		return db.fetchInstance(_, this, options);
	},
	fetchInstances: function(_, db, options) {
		return db.fetchInstances(_, this, options);
	},
	count: function(_, db, options) {
		return db.count(_, this, options);
	},
	//
	// add standard links resources for the entity
	fillLinksResource: function(reprType, resource) {
		var entity = this;
		resource.$links = (entity.$orgPrototypes[reprType] || {}).$links;
		resource.$actions = (entity.$orgPrototypes[reprType] || {}).$actions;
	},
	getPrototype: function(_, reprName, facetName, device) {
		// TODO: reprName isn't properly managed, all prototypes are get using className
		return this.$orgPrototypes[facetName] || (this.$orgPrototypes[facetName] = _fetchPrototype(_, this._model.getHandle(_), this.name, facetName, device));
	},
	getSearchFacets: function(_) {
		return this.$searchFacets;
	},
	getSearchFields: function(_) {
		// all the properties and relations in $search facet are indexables
		var res = [];
		Object.keys(this.$properties).forEach(function(p) {
			res.push(p);
		});
		Object.keys(this.$relations).forEach(function(p) {
			res.push(p);
		});
		return res;
	}
});

function _jsonToEntity(_, proto, localization, model, entityName, facet) {
	var loc = localization;
	var ent = model._entities[entityName] || (new X3Entity(model, entityName));
	ent.$baseUrl = proto.$baseUrl;
	//
	if (!proto.$properties) return;
	ent.$orgPrototypes[facet || "$details"] = proto;
	var itProto = proto.$properties.$resources ? proto.$properties.$resources.$item : proto;
	var pr = itProto.$properties;
	ent.$key = itProto.$key || "$uuid";
	// TODO: there should be $valueTemplate or $summaryTemplate on the prototype
	ent.$valueTemplate = new Template(itProto.$value || itProto.$key);
	if (itProto.$title) ent.$titleTemplate = new Template(itProto.$title);
	if (itProto.$description) ent.$descriptionTemplate = new Template(itProto.$description);
	ent.$classTitle = proto.$classTitle;
	x3Tracer.debug && x3Tracer.debug("_jsonToEntity - proto: " + sys.inspect(proto));
	x3Tracer.debug && x3Tracer.debug("_jsonToEntity - item proto: " + sys.inspect(itProto));
	if (itProto.$url) {
		// TODO: clarify $queryItem, should be $details
		ent.$urlTemplate = new Template(itProto.$url.replace("$queryItem", "$details").replace("searchItem", "$details"));
		// extract class name if different of representation name
		var parts = itProto.$url.split("?")[0];
		parts = parts && parts.split("/").pop();
		parts = httpHelpers.decodeDetailSegment(parts);
		ent.$className = (parts && parts.name) || entityName;
	}
	//
	Object.keys(pr).forEach_(_, function(_, pName) {
		var prop = pr[pName],
			className;
		if (prop.$type) {
			var p;
			switch (prop.$type) {
				case "application/x-reference":
					// for now, extract the class from url
					className = (prop.$url && prop.$url.match(/.*representation=(.*).*/)[1].split("&")[0].split(".")[0]) || entityName + "." + pName;
					p = {
						name: pName,
						$type: className,
						$title: (loc && (new Template(prop.$title)).resolve(loc)) || prop.$title,
						targetEntity: _jsonToEntity(_, prop, localization, model, className, facet),
						isPlural: false,
						$isPlural: false,
						isChild: true,
						$isChild: true
					};
					if (p.targetEntity) ent.$relations[pName] = new entityClasses.Relation(ent, p);
					break;
				case "application/x-array":
					p = {
						name: pName,
						$title: (loc && (new Template(prop.$title)).resolve(loc)) || prop.$title,
						isPlural: true,
						$isPlural: true
					};
					// X3 sending wrong type workaround
					if (prop.$item.$type === "application/x-json") prop.$item.$type = "application/json";
					if (prop.$item.$type === "application/json") {
						// load from item; TODO: get the classname from $prototype
						className = pName;
						p.$isChild = p.isChild = true;
					} else {
						if (!prop.$item.$url) return;
						className = prop.$item.$url.match(/.*representation=(.*).*/)[1].split("&")[0].split(".")[0];
					}
					p.$type = className;
					p.targetEntity = _jsonToEntity(_, prop.$item, localization, model, className, facet);
					if (p.targetEntity) ent.$relations[pName] = new entityClasses.Relation(ent, p);
					break;
				case "application/x-choice":
					p = ent.$properties[pName] = {
						$type: prop.$value.$type.replace("application/x-", ""),
						$title: (loc && (new Template(prop.$title)).resolve(loc)) || prop.$title
					};
					p.type = p.$type;
					p.title = p.$title;
					//
					p.$enum = prop.$value.$enum.slice(0);
					break;
				default:
					p = ent.$properties[pName] = {
						$type: prop.$type.replace("application/x-", ""),
						$title: (loc && (new Template(prop.$title)).resolve(loc)) || prop.$title
					};
					p.type = p.$type;
					p.title = p.$title;
			}
			p.name = pName;
			p.hasDefaultValue = function() {
				return false;
			}; // TODO;
			p.isExternalStorage = function() {
				return false;
			}; // TODO;
			p.getAllConstraints = function() {
				return {};
			}; // TODO;
			//
			if (prop.$searchFacets) ent.$searchFacets[pName] = prop.$searchFacets.split(",");
		}
	});
	ent.factory = new Factory(ent);
	//
	return ent;
}

function _makeEntity(_, model, entityName, facet, device) {
	var pr = _fetchPrototype(_, model.getHandle(_), entityName, (facet || "$details"), device);
	//
	if (!pr || !pr.$properties) return null;
	// convert to entity
	var ent = _jsonToEntity(_, pr, pr.$localization, model, entityName, facet);
	//
	return model._entities[entityName] = ent;
}

function _fetchQueryResources(_, handle, entity, parameters) {
	var params = parameters || {};
	var sdataWhere = parser.jsonToSdata(params);
	var client = handle.getClient(_);
	var url = handle._baseUrl + "/" + entity.$className + "?representation=" + entity.name + ".$query" + (sdataWhere ? "&where=" + encodeURIComponent(sdataWhere) : "") + (params.key ? "&key=" + params.key : "") + (params.count ? "&count=" + params.count : "");
	url += x3OrmConfig.monitor ? "&monitor=true" : "";
	var r = client.jsonSend(_, {
		head: {
			"accept": "application/json;vnd.sage=syracuse",
			"accept-language": locale.current || "en-US",
			method: "GET",
			url: url
		},
		body: {}
	});
	if (r.head.statusCode === 500) { // raise error to the client
		return r.body;
	}
	if (!r || !r.body || !r.body.$resources) return null;
	// maybe more than 20 instances
	var result = r.body.$resources;
	while (r.body.$links && r.body.$links.$next && r.body.$links.$next.$url) {
		var url = r.body.$links.$next.$url;
		url = url.replace(/^(?:\w+\:\/\/)?[^\/]+/, ""); // strip protocol and host
		r = client.jsonSend(_, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				method: "GET",
				url: url
			},
			body: {}
		});
		if (r.head.statusCode === 500) { // raise error to the client
			return r.body;
		}
		if (r && r.body && r.body.$resources) {
			r.body.$resources.forEach(function(res) {
				result.push(res);
			});
		}
	}
	// convert to entity
	return result;
}

function _fetchDetailResourceEtag(_, handle, entity, key, etag) {
	var jsonToSend = {
		head: {
			"accept": "application/json;vnd.sage=syracuse",
			"accept-language": locale.current || "en-US",
			method: "GET",
			url: handle._baseUrl + "/" + entity.name + "('" + key + "')?representation=" + entity.name + ".$details",
			"if-none-match": etag
		},
		body: {}
	};
	if (etag) jsonToSend.head["if-none-match"] = etag;

	var r = handle.getClient(_).jsonSend(_, jsonToSend);

	if (!r || r.head.status !== 200 || !r.body) return null;
	// convert to entity
	return r.body;
}

function _fetchDetailResource(_, handle, entity, key) {
	var r = handle.getClient(_).jsonSend(_, {
		head: {
			"accept": "application/json;vnd.sage=syracuse",
			"accept-language": locale.current || "en-US",
			method: "GET",
			url: handle._baseUrl + "/" + entity.name + "('" + key + "')?representation=" + entity.name + ".$details"
		},
		body: {}
	});
	if (!r || !r.body || !r.body) return null;
	// convert to entity
	return r.body;
}

function X3Cursor(handle, entity, x3BulkReader) {
	//this._cursor = cursor;
	this._entity = entity;
	this._db = handle;
	this._reader = x3BulkReader;
}

helpers.defineClass(X3Cursor, null, {
	next: function(_) {
		var r = this._reader.next(_);
		return r && this._entity.factory.createInstance(_, r, this._db);
	}
});

function X3Model(endpoint) {
	var self = this;
	//
	self._entities = {};
	self._endpoint = endpoint;
	// global events
	self.$events = {};
	_allEvents.forEach(function(name) {
		self.$events[name] = self.$events[name] || [];
	});
}

helpers.defineClass(X3Model, null, {
	getRepresentation: function(_, entityName, facet) {
		// TODO: for now, getRepresentation is an alias for getEntity. Must use $sink facet later for getEntity
		return this.getEntity(_, entityName, facet);
	},
	getEntity: function(_, entityName, facet, device) {
		if (this._entities[entityName] && this._entities[entityName].$orgPrototypes[facet]) return this._entities[entityName];
		//
		return _makeEntity(_, this, entityName, facet, device);
	},
	// #1602 - return mobile prototype with X3 diagnoses
	getMobilePrototype: function(_, entityName, facet, device) {
		return _fetchPrototype(_, this.getHandle(_), entityName, (facet || "$details"), device, true);
	},
	getIndexedEntities: function(_, opt) {
		// fetch indexed entities from X3 (returns an array)
		var clsIndexEnt = this.getEntity(_, "ACLAIDXSRH", "$query");
		var cursor = this.getHandle(_).createCursor(_, clsIndexEnt, {}, "$bulk");
		var inst;
		var res = [];
		while (inst = cursor.next(_)) {
			try {
				var e = this.getEntity(_, inst.NAME(_), "$search");
				e && res.push(e);
			} catch (e) {
				opt && opt.diagnoses.push({
					$severity: "error",
					$message: e.message,
					$stackTrace: e.$stackTrace || e.safeStack
				});
			}
		}
		return res;
	},
	getSearchFacets: function(_) {
		// fetch search facets from X3
		var ent = this.getEntity(_, "ATABDIV", "$query");
		var cursor = this.getHandle(_).createCursor(_, ent, {
			jsonWhere: {
				NUMTAB: 16
			}
		}, "$bulk");
		var inst;
		var res = [];
		while (inst = cursor.next(_)) {
			res.push({
				code: inst.CODE(_),
				description: inst.LNGDES(_)
			});
		}
		return res;
	},
	registerEvent: function(_, eventName, eventId, handler, entityName) {
		var target = entityName ? this.getEntity(_, entityName) : this;
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
	},
	getHandle: function(_) {
		return this._handle || (this._handle = exports.create(_, this._endpoint));
		//return this._handle || (this._handle = exports.create(_, this._endpoint)) 
	},
	resetCache: function() {
		this._entities = {};
	}
});

function X3DbHandle(endpoint, model) {
	this._endpoint = endpoint;
	this._model = model;
}

helpers.defineClass(X3DbHandle, null, {
	connect: function(_) {
		this._baseUrl = this._endpoint.getBaseUrl(_);
	},
	getClient: function(_) {
		var factory = this._endpoint.useEtna(_) ? require('etna/lib/supervisor/client') : pool;
		return factory.getClient(_, globals.context.session, this._endpoint);
	},
	//
	/// -------------
	/// ## getEntity function :
	/// ``` javascript
	/// var entity = db.getEntity(_, entityName);
	/// ```
	/// Get the class metadata as an entity
	///
	///
	getEntity: function(_, entityName, facet) {
		return this._model.getEntity(_, entityName, facet);
	},
	getUpdDatePropName: function() {
		return "UPDDATTIM";
	},
	// fetch instance
	fetchInstance: function(_, entity, params) {
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.fetchInstance: " + entity.name + "; " + sys.inspect(params));
		// if params is string, then it's the object key, or a filter otherwise
		var r;
		if (typeof params === "object") {
			params.count = 1;
			r = _fetchQueryResources(_, this, entity, params);
			r = (r || [])[0];
		} else r = _fetchDetailResource(_, this, entity, params);
		//
		return r && entity.factory.createInstance(_, r, this);
	},

	// operation: x3ClassAction object
	// entity: name of X3 entity
	// facet (normally $edit facet)
	// params: object with keys: parameter names, values: parameter values (optional)
	// representation: name of X3 representation (will be entity name if empty)
	postAction: function(_, operation, entity, facet, params, representation, options) {
		function raiseError(e, msg) {
			console.error((msg ? msg : "Raise X3 error ") + e.stack);
			diagnoses.push({
				$severity: "error",
				$message: e.message,
				$stackTrace: e.safeStack
			});
		}
		var diagnoses = [];
		if (!operation) return null;
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.postAction: " + entity.name + "; ");
		// if params is string, then it's the object key, or a filter otherwise
		//
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.createWorkingCopy: " + entity.name + "; ");
		// if params is string, then it's the object key, or a filter otherwise
		//
		var trackingId = helpers.uuid.generate();

		var url = (options && options.url) ? options.url : (this._baseUrl + "/" + entity.name + "/$template/$workingCopies?representation=" + (representation ? representation : entity.name) + "." + facet + "&trackingId=" + trackingId);
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.createWorkingCopy URL: " + url + "; ");
		var client = this.getClient(_);
		var r = {}; // result
		var create = client.jsonSend(_, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				"content-type": "application/json",
				"content-language": locale.current || "en-US",
				method: "POST",
				url: url,
				referer: url
			},
			body: ""
		});

		// check if creation of working copy works fine
		if (create.head.status >= 400) {
			diagnoses.push({
				$severity: "error",
				$message: locale.format(module, "errorNewInstance")
			});
			if (create.body && create.body.$diagnoses) {
				var diagnosis;
				create.body.$diagnoses.forEach(function(diag) {
					if (diag.$severity === "error") {
						diagnoses.push(diag);
					}
				});
			}
			x3Tracer.warn && x3Tracer.warn("X3DbHandle.createWorkingCopy error: " + url + "; " + JSON.stringify(diagnoses));
			return {
				body: {
					$diagnoses: diagnoses
				}
			};
		}



		x3Tracer.debug && x3Tracer.debug("X3DbHandle.sendOperation: " + entity.name + "; ");
		try {
			// execute operation if it's defined
			url = create.body.$url.replace('{$baseUrl}', this._baseUrl);
			var body = {
				$actions: {},
				$etag: 1,
				$url: url,
				$uuid: create.$uuid
			};

			if (options && options.body) {
				for (var property in options.body) {
					body[property] = !body.hasOwnProperty(property) ? options.body[property] : merge(body[property], options.body[property]);
				}
			}

			var actionContent = {
				$isRequested: true
			};
			if (params) {
				actionContent.$parameters = params;
			}
			body.$actions[operation.action(_)] = actionContent;

			var postAction = {
				head: {
					host: "localhost:8124", // dummy address
					"accept": "application/json;vnd.sage=syracuse; charset=utf-8",
					"charset": "UTF-8",
					"accept-language": locale.current || "en-US",
					"content-type": "application/json",
					"content-language": locale.current || "en-US",
					method: "PUT",
					url: url,
				},
				body: body
			};

			r = client.jsonSend(_, postAction);
		} catch (e) {
			raiseError(e);
		} finally {
			try {
				x3Tracer.debug && x3Tracer.debug("X3DbHandle.deleteWorkingCopy: " + entity.name + "; ");
				url = this._baseUrl + "/" + entity.name + "/$workingCopies?representation=" + (representation ? representation : entity.name) + "." + facet + "&trackingId=" + trackingId;

				var del = client.jsonSend(_, {
					head: {
						"accept": "application/json;vnd.sage=syracuse",
						"accept-language": locale.current || "en-US",
						"content-type": "application/json",
						"content-language": locale.current || "en-US",
						method: "DELETE",
						url: url,
						referer: url
					},
					body: ""
				});
				if (del.head.status >= 400) {
					if (del.body && del.body.$diagnoses) {
						del.body.$diagnoses.forEach(function(diag) {
							if (diag.$severity === "error") {
								diagnoses.push(diag);
								return true;
							}
						});
					}
				}
			} catch (e) {
				raiseError(e, "Delete working copy failed: ");
			}

		}
		if (!r) {
			r = {
				body: {
					$diagnoses: []
				}
			};
		}
		diagnoses.forEach(function(diag) {
			r.body.$diagnosis && r.body.$diagnoses.push(diag);
		});
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.sendOperation result: " + require('util').format(r) + "; ");
		return r;
	},
	fetchInstanceEtag: function(_, entity, params, etag) {
		x3Tracer && x3Tracer("X3DbHandle.fetchInstance: " + entity.name + "; " + sys.inspect(params));
		// if params is string, then it's the object key, or a filter otherwise
		var r;
		if (typeof params === "object") {
			params.count = 1;
			r = _fetchQueryResources(_, this, entity, params);
			r = (r || [])[0];
		} else r = _fetchDetailResourceEtag(_, this, entity, params, etag);
		//
		return r && entity.factory.createInstance(_, r, this);
	},
	//
	count: function(_, entity, params) {
		throw new Error("count(_): Unsupported for this driver");
	},
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
	createCursor: function(_, entity, params, bulkFacet) {
		// create a bulk mode x3 cursor
		var where = parser.jsonToSdata(params);
		var p = ["representation=" + entity.name + "." + (bulkFacet || "$bulk")];
		//		p.push("count=100");
		where && p.push("where=" + encodeURIComponent(where));
		return new X3Cursor(this, entity, this.getClient(_).createBulkReader(_, {
			url: [
				[this._endpoint.getBaseUrl(_), entity.$className].join("/"), p.join("&")
			].join("?"),
			facet: bulkFacet || "$bulk",
			baseUrl: entity.$baseUrl
		}));
	},
	// fetch all instances acording to parameters
	fetchInstances: function(_, entity, params) {
		var self = this;
		var r = _fetchQueryResources(_, self, entity, params);
		return Array.isArray(r) ? (r || []).map_(_, function(_, item) {
			return entity.factory.createInstance(_, item, self);
		}) : r;
	},
	saveInstance: function(_, instance) {
		// ONLY PROPERTIES FOR NOW
		var entity = instance.getEntity(_);
		var data = {
			$uuid: instance.$uuid,
			$key: instance.computeKey()
		};
		(Object.keys(entity.$properties || {}) || []).forEach_(_, function(_, pName) {
			data[pName] = resourceHelpers.formatValue(entity.$properties[pName], instance[pName](_));
		});
		var client = this.getClient(_);
		var url = this._baseUrl + "/" + entity.name + (instance.$created ? "" : "('" + data.$key + "')") + "?representation=" + entity.name + ".$edit";
		url += x3OrmConfig.monitor ? "&monitor=true" : "";
		var r = client.jsonSend(_, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				"content-type": "application/json",
				"content-language": locale.current || "en-US",
				method: instance.$created ? "POST" : "PUT",
				url: url,
				referer: url
			},
			body: data
		});
		if (!r || !r.body) return null;
		// diags ?
		(r.body.$diagnoses || []).forEach(function(d) {
			d = _normalizeDiag(d);
			instance.$addDiagnose(d.$severity, d.$message, null, null, d.$stackTrace);
		});
		if (r.body.$properties) {
			Object.keys(r.body.$properties).forEach(function(pName) {
				var p = r.body.$properties[pName];
				(p.$diagnoses || []).forEach(function(d) {
					d = _normalizeDiag(d);
					instance.$addDiagnose(d.$severity, d.$message, pName, null, d.$stackTrace);
				});
			});
		}
		if (r.body.$actions) {
			Object.keys(r.body.$actions).forEach(function(action) {
				var p = r.body.$actions[action];
				if (p && p.$diagnoses) {
					var a = instance.$actions = instance.$actions || {};
					a = (a[action] = a[action] || {});
					if (a.$diagnoses) {
						p.$diagnoses.forEach(function(d) {
							a.$diagnoses.push(d);
						});
					} else
						a.$diagnoses = p.$diagnoses;
				}
			});
		}
		//
		return 1;
	},
	getUserRights: function(_, actualRights, currentX3Login) {

		// check if the current client has the same x3login as the one in the user entity. if it change we need to reconnect to recompute the right

		if (currentX3Login.toLowerCase() !== this.getClient(_).context.userName.toLowerCase()) this.getClient(_).disconnect(_);
		var client = this.getClient(_);
		var handle = this;
		var rl = client.getSessionServiceLink(_, "$rights");
		if (rl) {
			var url = rl.$url;

			var head = {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				method: "GET",
				url: url
			};
			if (!nocache && actualRights && actualRights.$etag) head["if-none-match"] = actualRights.$etag;
			x3Tracer.info && x3Tracer.info("getUserRights request headers: " + JSON.stringify(head, null, 2));
			var resp = client.jsonSend(_, {
				head: head,
				body: {}
			});
			x3Tracer.info && x3Tracer.info("getUserRights response status: " + resp.head.status);
			x3Tracer.info && x3Tracer.info("getUserRights response body: " + JSON.stringify(resp.body, null, 2));
			//
			//if (resp.head.status >= 400) throw _makeHttpError(resp, locale.format(module, "userRightsGenericError"));
			//
			switch (resp.head.status) {
				case 200:
					resp.body.$etag = resp.head.etag || resp.head.ETag;
					resp.body.status = resp.head.status;
					return resp.body;
				case 304:
					actualRights.status = 304;
					return actualRights;
				default:
					throw _makeHttpError(resp, locale.format(module, "userRightsGenericError"));
			}
		}
		return null;
	},
	batch: function(_, entity, resources, options) {
		if (!Array.isArray(resources) || resources.length === 0) return;

		var $addDiagnose = (options || {}).$addDiagnose,
			client = this.getClient(_),
			url = this._baseUrl + "/" + entity.name + "/$batch?representation=" + entity.name + ".$edit";
		url += x3OrmConfig.monitor || options.monitor ? "&monitor=true" : "";

		var instUrl = "{$baseUrl}/" + entity.name + "?representation=" + entity.name + ".$edit",
			data = {
				$url: url,
				$resources: []
			};

		resources.forEach(function(elt) {
			var d = {};
			d.$httpMethod = "POST";
			d.$url = instUrl;
			(Object.keys(entity.$properties || {}) || []).forEach(function(pName) {
				d[pName] = resourceHelpers.formatValue(entity.$properties[pName], elt[pName]);
			});
			data.$resources.push(d);
		});
		x3Tracer.debug && x3Tracer.debug("X3DbHandle.batch: properties=" + JSON.stringify(entity.$properties, null, 2) + ", data=" + JSON.stringify(data, null, 2));

		var r = client.jsonSend(_, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				"content-type": "application/json",
				"content-language": locale.current || "en-US",
				method: "POST",
				url: url,
				referer: url
			},
			body: data
		});
		if (!r || !r.body) return null;

		r.body.monitoring && x3Tracer.debug && x3Tracer.debug("X3DbHandle.batch: monitoring=" + JSON.stringify(r.body.monitoring, null, 2));
		// diags ?
		$addDiagnose && (r.body.$diagnoses || []).forEach(function(d) {
			d = _normalizeDiag(d);
			$addDiagnose(d.$severity, d.$message, null, null, d.$stackTrace);
		});
		$addDiagnose && (Object.keys(r.body.$properties || {}) || []).forEach(function(pName) {
			var p = r.body.$properties[pName];
			(p.$diagnoses || []).forEach(function(d) {
				d = _normalizeDiag(d);
				$addDiagnose(d.$severity, d.$message, pName, null, d.$stackTrace);
			});
		});
		return 1;
	},
	_service: function(_, verb, service, parameters, body) {
		// console.log("x3._service:", verb, service, parameters, body);

		x3Tracer.debug && x3Tracer.debug("x3." + verb + "Service service:" + service);
		x3Tracer.debug && x3Tracer.debug("x3." + verb + "Service body:", body);

		var client = this.getClient(_);
		var url = this._baseUrl + "/$service/" + service;
		if (parameters) {
			x3Tracer.debug && x3Tracer.debug("parameters:" + JSON.stringify(parameters));
			url += "?" + Object.keys(parameters).map(function(p) {
				return p + "=" + parameters[p];
			}, []).join('&');
		}
		var response = client.jsonSend(_, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"accept-language": locale.current || "en-US",
				"content-type": "application/json",
				method: verb.toUpperCase(),
				url: url
			},
			body: body || {}
		});
		return response;
	},
	getService: function(_, service, parameters) {
		var response = this._service(_, "get", service, parameters);
		return (response && response.body) || undefined;
	},
	postService: function(_, service, parameters, body) {
		return this._service(_, "post", service, parameters, body);
	},
	deleteService: function(_, service, parameters) {
			return this._service(_, "delete", service, parameters);
		}
		// postService: function(_, service, parameters) {
		// 	x3Tracer.debug && x3Tracer.debug("x3.postService service:" + service);
		// 	var client = this.getClient(_);
		// 	var url = this._baseUrl + "/$service/" + service;
		// 	if (parameters) {
		// 		url += "?" + Object.keys(parameters).map(function(p) {
		// 			return p + "=" + parameters[p];
		// 		}, []).join('&');
		// 	}
		// 	var response = client.jsonSend(_, {
		// 		head: {
		// 			"accept": "application/json;vnd.sage=syracuse",
		// 			"accept-language": locale.current || "en-US",
		// 			method: "POST",
		// 			url: url
		// 		},
		// 		body: {}
		// 	});
		// 	return response;
		// },
});

exports.makeModel = function(_, endpoint) {
	return _models[endpoint.$uuid] || (_models[endpoint.$uuid] = new X3Model(endpoint));
};

exports.create = function(_, endpoint) {
	var handle = new X3DbHandle(endpoint, endpoint.getModel(_));
	handle.connect(_);
	return handle;
};

exports.setup = function(options) {
	if (!options) return;
	// x3 pool injection (for tests)
	if (options.x3driver) pool = options.x3driver;
};