"use strict";

var globals = require('streamline-runtime').globals;
var datetime = require('@sage/syracuse-core').types.datetime;
var helpers = require('@sage/syracuse-core').helpers;
var registry = require("./sdataRegistry");
var Context = require("./sdataContext").Context;
var dataModel = require("../..//src/orm/dataModel");
var find = helpers.object.find;
var factory = require("../..//src/orm/factory");
var searchEngine = require("syracuse-search/lib/elasticSearch");
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var x3pool = require("syracuse-x3/lib/pool");
var x3fs = require("syracuse-x3/lib/fileService");
var locale = require('streamline-locale');
var graph = require("syracuse-graph/lib/graph");
var tagCloud = require("syracuse-graph/lib/tagCloud");
var httpHelpers = require('@sage/syracuse-core').http;
var sdataAsync = require("../../src/sdata/sdataAsync");
var sys = require("util");
var ez = require('ez-streams');
var uploadHelpers = require('../..//src/upload/helpers');
var htmlTransforms = require('@sage/html-sanitizer/src/transforms');
var etnaServer = require("etna/lib/supervisor/server");
var sdataStateless = require("syracuse-tablet/lib/sdataStatelessHack");
var sdataStatelessWC = require("syracuse-tablet/lib/sdataStatelessWC");

var tracer; // = console.log;

// STUBS

function getPrototypeStub(_, context) {
	var fs = require('streamline-fs');
	var fsp = require('path');
	// url is like '/sdata/contract/application/dataset/$prototypes('name.type.variant')',
	var path = context.request.url.split("/");
	var url = context.request.url.split("/").slice(0, 5).join("/");
	// helpers.stubsPath is to be deprecated
	var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
	path[1] = stubsPath;
	path[5] = "prototypes";
	path = path.slice(1, 6).join("/") + "/" + context.prototypeId.split(".").join("-") + ".json";
	var proto = JSON.parse(fs.readFile(fsp.join(__dirname, "../../..") + "/" + path, "utf8", _));
	proto.$baseUrl = url;
	return proto;
}

function getEntitiesListStub(_, context) {
	var fs = require('streamline-fs');
	var fsp = require('path');
	// url is like '/sdata/contract/application/dataset/entities',
	var path = context.request.url.split("?")[0].split("/");
	// helpers.stubsPath is to be deprecated
	var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
	path[1] = stubsPath;
	path = path.slice(1, 6).join("/") + ".json";
	var proto = JSON.parse(fs.readFile(fsp.join(__dirname, "../../..") + "/" + path, "utf8", _));
	return proto;
}

function getEntityStub(_, context) {
	var fs = require('streamline-fs');
	var fsp = require('path');
	// url is like '/sdata/contract/application/dataset/entities('id')',
	var path = context.request.url.split("?")[0].split("(")[0].split("/");
	// helpers.stubsPath is to be deprecated
	var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
	path[1] = stubsPath;
	path = path.slice(1, 6).join("/") + "-" + context.instanceId + ".json";
	var proto = JSON.parse(fs.readFile(fsp.join(__dirname, "../../..") + "/" + path, "utf8", _));
	return proto;
}

///

function _parseSegment(segment) {
	return httpHelpers.decodeDetailSegment(segment) || {
		name: segment
	};
}

function _dispatch(_, context, map) {
	var seg = context.walkUrl();
	if (seg == null) {
		// we reached the end of the URL, dispatch method
		//var method = context.request.method.toLowerCase();
		var method = context.method;
		if (map[method]) return map[method](_, context);
		else throw context.badMethod(method);
	} else {
		var pair = _parseSegment(seg);
		if (pair.id) context.isExpressionId = pair.isExpressionId;
		if (pair.name[0] == '$') {
			var name = pair.name.substring(1);
			if (map[name]) {
				if (map.$canExecute && !map.$canExecute(_, context, name)) return context.reply(_, httpHelpers.httpStatus.Forbidden, locale.format(module, "forbiddenSegment", pair.name, context.method));
				else return map[name](_, context, pair.id);
			}
		} else if (map.walk) {
			return map.walk(_, context, pair.name, pair.id);
		}
		throw context.badRequest("unexpected URL segment: " + seg);
	}
}

// URL is http://host/sdata
var _sdataMap = {
	walk: function(_, context, name, id) {

		context.applicationName = name;
		context.application = registry.applications[name];
		//if (context.application == null) throw new Error("configuration error: application not registered: " + name);
		return _dispatch(_, context, _applicationMap);

	},
	get: function(_, context) {
		return context.replyDictionaryPage(_, registry.applications, "application");
	},
	trackers: function(_, context, id) {

		return sdataAsync.track(_, context, id);
	},
	search: function(_, context, id) {
		return _dispatch(_, context, _searchMap);
	},
	sessions: function(_, context, id) {
		return _dispatch(_, context, _sessionsMap);
	}
};

var _sessionsMap = {
	post: function(_, context) {
		return context.reply(_, 201, {
			$url: "/sdata/$sessions('" + globals.context.session.id + "')"
		});
	}
};

// URL is http://host/sdata/app
var _applicationMap = {
	walk: function(_, context, name, id) {
		context.contractName = name;
		if (context.application) context.contract = context.application.contracts[name];
		// helpers.stubsPath is to be deprecated
		var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
		//
		var app = adminHelper.getApplication(_, context.applicationName, context.contractName);
		if (!app && !context.application && !stubsPath) throw context.notFound(locale.format(module, "applicationNotFound", context.applicationName, context.contractName));
		context.applicationRef = app;
		//
		return _dispatch(_, context, (app && (app.protocol(_) !== "syracuse")) ? _x3ContractMap : _syracuseContractMap);
	},
	get: function(_, context) {
		return context.replyDictionaryPage(_, context.application.contracts, "contract");
	}
};

// URL is http://host/sdata/app/contract
var _syracuseContractMap = {
	walk: function(_, context, name, id) {
		// allow stubs
		if (context.contract) {
			var ds = registry.getDataset(_, context.contract, name);
			if (!ds) throw context.notFound("dataset not found: " + name);
			context.dataset = name;
			context.model = dataModel.make(context.contract, context.dataset);
			// crnit : database abstraction
			context.db = dataModel.getOrm(_, context.model, ds);
			//
			context.baseUrl = context.walked();
		}
		return _dispatch(_, context, _syracuseDatasetMap);
	},
	get: function(_, context) {
		return context.replyDictionaryPage(_, context.contract.datasets, "dataset");
	}
};

var _x3ContractMap = {
	walk: function(_, context, name, id) {

		var protocol = "";
		if (context.applicationRef) { // TEST to allow stubs
			// find the endpoint
			var ep = adminHelper.getEndpoint(_, {
				application: context.applicationName,
				contract: context.contractName,
				dataset: name
			});
			// TEMP : no error if syracuse endpoint not found, for unit tests to pass. fix later.
			if (!ep) throw context.notFound(locale.format(module, "endpointNotFound", context.applicationName, context.contractName, name));
			if (ep.useEtna(_)) return etnaServer.httpDispatch(_, ep.getEtnaConfig(_, context.request.session), context.request, context.response);


			context.endpoint = ep;
			//
			context.baseUrl = context.walked();
		}

		return _dispatch(_, context, _x3DatasetMap);
	}
};

// URL is http://host/sdata/app/contract/dataset
// for syracuse endpoints
var _syracuseDatasetMap = {
	walk: function(_, context, name, id) {
		var model = context.model;
		var singular = model && model.singularize(name);
		//
		if (context.parameters.search) {
			var ep = context.endpoint || adminHelper.getCollaborationEndpoint(_);
			context.searchIndexName = ep.getIndexName(_);
			context.searchEntityName = context.entityName = singular;
			searchEngine.search(_, context);
		} else {
			if (model) { // TEST to allow stubs
				context.entity = model.getEntity(_, singular);
				if (!context.entity) throw context.notFound(locale.format(module, "entityNotFound", name));
			}
			if (id) {
				context.instanceId = id;
				if (context.entity) {
					context.instance = factory.fetchInstance(_, context);
					// don't test here the instance, as the call for non persistent instances might have ids that aren't instance id
					//				if(!context.instance) throw context.notFound(locale.format(module, "instanceNotFound", name, id));
				}
				return _dispatch(_, context, _instanceMap);
			} else {
				return _dispatch(_, context, _entityMap);
			}
		}
	},
	get: function(_, context) {
		var baseUrl = context.walked();
		return context.replyDictionaryPage(_, context.model.getEntities(), "entity", function(name, entity) {
			return {
				$url: baseUrl + "/" + entity.plural,
				$key: entity.plural,
				$descriptor: "entity " + entity.name,
				name: entity.plural
			};
		});
	},
	prototypes: function(_, context, id) {
		if (id) {
			context.prototypeId = id;
			return _dispatch(_, context, _prototypeMap);
		} else {
			return _dispatch(_, context, _prototypesMap);
		}
	},
	workingCopies: function(_, context, id) {
		context.workingCopyId = id;
		return _dispatch(_, context, _workingCopiesMap);
	},
	service: function(_, context) {
		return _dispatch(_, context, _datasetServiceMap);
	},
	backups: function(_, context) {
		return _dispatch(_, context, _backupsMap);
	},
	search: function(_, context, id) {
		context.searchIndexName = id;
		return _dispatch(_, context, _searchMap);
	},
	import: function(_, context) {
		return _dispatch(_, context, _importMap);
	},
	$canExecute: function(_, context, operation) {
		// security
		var sp = globals.context.session && globals.context.session.getSecurityProfile && globals.context.session.getSecurityProfile(_);
		//    	sp && config.tracer && config.tracer("_syracuseDatasetMap found security profile: "+sp.code(_));
		return (sp && sp.canExecuteService(_, null, operation)) || (sp == null);
	}
};

function _x3hackResponse(batchresp) {
	this.data = "";
	this.status = 200;
	this.head = null;
	this.batchResponse = batchresp;
};

_x3hackResponse.prototype = {
	writeHead: function(status, head) {
		this.head = head;
		this.status = status;
		if (this.batchResponse) this.batchResponse.$httpStatus = this.status;
	},
	write: function(_, data) {
		this.data += data;
	},
	end: function() {
		if (this.batchResponse) {
			try {
				var dd = JSON.parse(this.data);
				if (dd && dd.$resources) {
					if (dd.$resources.length) dd = dd.$resources[0];
					else dd = null;
				}
				if (dd) {
					for (var v in dd)
						this.batchResponse[v] = dd[v];
				}
			} catch (ex) {
				// Add warning diagnose if failed
				var d = this.batchResponse.$diagnoses || (this.batchResponse.$diagnoses = []);
				d.push({
					$severity: "warning",
					$message: ex.message,
					$stackTrace: ex.safeStack, // + "\n" + this.data
				});
			}
		}
	}
};
var _x3Hacks = {
	// Mobile specific
	batchGet: function(_, context) {
		var cr = context.response;
		try {
			var batchResult = {
				$resources: []
			};
			var brequest = JSON.parse(context.request.readAll(_));
			var path = context.path.split('/');
			path.pop();
			context.path = path.join('/');
			brequest.$resources.forEach_(_, function(_, entry) {
				var opres = {
					$httpStatus: 200
				};
				batchResult.$resources.push(opres);
				try {
					switch (entry.$httpMethod.toLowerCase()) {
						case "get":
							context.response = new _x3hackResponse(opres);
							context.method = entry.$httpMethod;
							context.url = entry.$url;
							context.method = "GET";
							context.request.url = context.url;
							context.request.method = context.method;
							x3pool.send(_, context);
							break;
						default:
							break;
					}
				} catch (ex) {
					opres.$httpStatus = 500;
					opres.$httpMessage = ex.message;
				}
			});
			context.response = cr;
			context.reply(_, 200, batchResult);
		} catch (e) {
			context.response = cr;
			context.batchResult = null;
			context.reply(_, 500, e.message);
		}
	},
	// Mobile #3369
	// Temporarilly - Implements X3 object method calls in stateless mode because not implemented in X3 side
	batchAction: function(_, context, representation, id) {
		var respBody, wrkCpyData, error, warning;
		var start = new Date().getTime();
		var report = {};
		try {
			var actParams = context.request.readAll(_);
			if (actParams == null || actParams.length == 0) {
				throw new Error("Unexpected null data");
			}
			actParams = JSON.parse(actParams);
			// -1- Create a working copy
			var ts = new Date().getTime();
			var reply = x3pool.jsonSend(_, context.request.session, context.endpoint, {
				head: {
					"accept": "application/json;vnd.sage=syracuse",
					"content-type": "application/json; charset=UTF-8",
					"method": "POST",
					"url": actParams.$workingCopyUrl + (actParams.$workingCopyUrl.indexOf('?') >= 0 ? '&trackingId=' : "?trackingId=") + helpers.uuid.generate()
				},
				body: {}
			});
			report.createWrkCpy = new Date().getTime() - ts;
			if (reply.head.statusCode != 200) {
				throw new Error("Error creating working copy\nStatus : " + reply.head.statusCode + "\nUrl : " + url + "\nBody:" + JSON.stringify(reply.body, null, 2));
			}
			wrkCpyData = reply.body;
			var wrkCpyUrl = wrkCpyData.$url.replace("{$baseUrl}", wrkCpyData.$baseUrl);
			// -2- Update working copy + Action parameters - #3523
			actParams.$data.$uuid = wrkCpyData.$uuid;
			actParams.$data.$url = wrkCpyUrl;
			actParams.$data.$actions = actParams.$actionParams;
			ts = new Date().getTime();
			reply = x3pool.jsonSend(_, context.request.session, context.endpoint, {
				head: {
					"accept": "application/json;vnd.sage=syracuse",
					"content-type": "application/json; charset=UTF-8",
					"method": "PUT",
					"url": wrkCpyUrl
				},
				body: actParams.$data
			});
			report.callMethod = new Date().getTime() - ts;
			if (reply.head.statusCode != 200) {
				throw new Error("Error executing action\nStatus : " + reply.head.statusCode + "\nUrl : " + url + "\nBody:" + JSON.stringify(reply.body, null, 2));
			}
			// 3567 - Do not return the working copy - Return action result otherwise diagnoses are lost
			respBody = reply.body;
		} catch (e) {
			error = {
				$message: e.message,
				$stackTrace: context.request.url + "\n" + e.safeStack
			};
		} finally {
			if (wrkCpyData) {
				var ts = new Date().getTime();
				// -4- Delete workingcopy if any
				var url = wrkCpyData.$url.replace("{$baseUrl}", wrkCpyData.$baseUrl);
				var reply = x3pool.jsonSend(_, context.request.session, context.endpoint, {
					head: {
						"accept": "application/json;vnd.sage=syracuse",
						"content-type": "application/json; charset=UTF-8",
						"method": "DELETE",
						"url": url
					},
					body: {}
				});
				report.delWrkCpy = new Date().getTime() - ts;
				if (reply.head.statusCode != 200) {
					warning = {
						$severity: "warning",
						$message: "Can't delete working copy",
						$stackTrace: url + "\n" + JSON.stringify(reply.body, null, 2)
					};
				}
			}
		}
		if (error) {
			error.$severity = "error";
			respBody = {
				$diagnoses: [error]
			};
			if (warning) {
				respBody.$diagnoses.push(warning);
			}
		} else if (warning) {
			respBody.$diagnoses = [warning];
		}
		report.total = new Date().getTime() - start;
		respBody.$report = report;
		context.reply(_, error ? 500 : 200, respBody, {
			"content-type": "application/json"
		});
	},
	calendarQuery: function(_, context) { // format query response that map x-calendar to calendar response expect by the client

		function getPropertyValue(listProp, object) {
			var array = [];
			listProp && listProp.forEach(function(cur) {
				object[cur] && array.push(object[cur]);
			});
			return array;
		}

		function getPropertyDescription(listProp, object) { // asked by CM - must create a field with ul , li
			var descr = {};
			listProp && listProp.forEach(function(cur) {
				if (object[cur])
					descr[cur] = object[cur];
			});
			return descr;
		}
		var resp = x3pool.jsonSend(_, context.request.session, context.endpoint, {
			head: {
				"accept": "application/json;vnd.sage=syracuse",
				"content-type": "application/json; charset=UTF-8",
				"method": "GET",
				"url": context.path + "?" + context.rawQuery
			},
			body: {}
		});

		if (!resp || !resp.body) {
			throw new Error("can't get response for queryCalendar request");
		} else {
			var respCalendar = resp.body;
			var calendar = [];
			var events = [];
			if (resp.head.status === 200 && resp.body != null) {
				try {
					var $calendar = respCalendar.$calendar;
					var $resources = respCalendar.$resources;

					if ($calendar) { // alter reply
						// default calendar
						calendar.push({
							description: "default calendar",
							id: "1",
							$category: 0, // default category
							$categoryLegend: $calendar.category,
							$colorLegend: $calendar.color,
							$pageFilter: {
								start: $calendar.start,
								end: $calendar.end
							}
						});

						$resources.forEach(function(r) {
							var descriptionCal = getPropertyValue($calendar.description, r).join("");

							// check if the calendar already exist in $calendar

							var start = getPropertyValue($calendar.start, r);
							var end = getPropertyValue($calendar.end, r);
							var summary = getPropertyValue($calendar.summary, r).join("");
							var subtitle = getPropertyValue($calendar.subtitle, r).join("");
							var description = getPropertyDescription($calendar.description, r);

							var eventColor = 0;
							if ($calendar.color && $calendar.color.property) {
								eventColor = r[$calendar.color.property];
							}

							var eventCategory = 0;
							if ($calendar.category && $calendar.category.property) {
								eventCategory = r[$calendar.category.property];
							}

							if (!start || !end || !summary || !description) {
								respCalendar.$diagnoses = respCalendar.$diagnoses || [];
								respCalendar.$diagnoses.push({
									$severity: "error",
									$message: "can't generate events",
									$stackTrace: ""
								});
							} else {
								var startDt = "";
								if (start.length >= 1) {
									startDt = start[0] + "T" + (start.length === 2 ? start[1] + "Z" : "00:00Z");
								}
								var endDt = "";
								if (end.length >= 1) {
									endDt = end[0] + "T" + (end.length === 2 ? end[1] + "Z" : "00:00Z");
								}


								events.push({
									$category: 0, // default category
									$calendar: 0, // default calendar
									id: r.$uuid,
									summary: summary,
									subtitle: subtitle,
									description: description,
									start: {
										datetime: startDt
									},
									end: {
										datetime: endDt
									},
									color: eventColor,
									category: eventCategory
								});
							}
						});

						// switch data.$resource by calendar
						respCalendar.agenda = {
							$calendars: calendar,
							$events: events
						};
						delete respCalendar.$resources;
						delete respCalendar.$calendar;
					}

					context.reply(_, 200, respCalendar, {
						"content-type": "application/json"
					});

				} catch (e) {
					respCalendar = respCalendar || {};
					respCalendar.$diagnoses = respCalendar.$diagnoses || [];
					respCalendar.$diagnoses.push({
						$severity: "error",
						$message: e.message,
						$stackTrace: context.request.url + "\n" + e.stack
					});

					context.reply(_, 500, resp, {
						"content-type": "application/json"
					});
				}
			} else { // no calendar we don't anything to do
				if (resp && resp.body) {
					context.reply(_, resp.head.status, resp.body, {
						"content-type": "application/json"
					});
				} else {
					context.reply(_, 204);
				}
			}
		}
	}
};

function _endsWith(a, b) {
	if (!a || !b || !a.length || !b.length) return false;
	var i = a.lastIndexOf(b);
	return i == -1 ? false : (a.length - i - b.length) == 0;
}

var _x3DatasetMap = {
	walk: function(_, context, name, id) {

		if (context.request && context.request.$stateless) {
			return sdataStateless.walk(_, context, name, id);
		}
		if (context.request && context.request.$statelessWC) {
			return sdataStatelessWC.walk(_, context, name, id);
		}
		if (context.parameters.search) {
			context.searchIndexName = context.endpoint.getIndexName(_);
			context.searchEntityName = context.entityName = name;
			searchEngine.search(_, context);
		} else {
			// delegate to x3pool
			if (context.path && context.path.indexOf('/$batchGet') > 0) {
				//Mobile - hack for batch with gets
				return _x3Hacks.batchGet(_, context);
			} else if (_endsWith(context.path, '/$batchAction') && context.method == "post") {
				// Mobile - hack for batch Actions on X3 objects
				return _x3Hacks.batchAction(_, context, name, id);
			} else if (context.parameters.view === "calendar") {
				return _x3Hacks.calendarQuery(_, context);
			} else {
				if (context.path && context.path.indexOf("/$template")) { // add a trackingId in order to let the x3 server to manage it
					context.request.url += (context.request.url.indexOf('?') >= 0 ? "&trackingId=" : "?trackingId=") + helpers.uuid.generate();
				}

				return x3pool.send(_, context);
			}
		}
	},
	prototypes: function(_, context, name, id) {
		if (context.request && context.request.$stateless) {
			return sdataStateless.prototypes(_, context, name, id);
		}
		if (context.request && context.request.$statelessWC) {
			return sdataStatelessWC.prototypes(_, context, name, id);
		}
		// delegate to x3pool
		x3pool.send(_, context);
	},
	workingCopies: function(_, context, name, id) {

		if (context.request && context.request.$stateless) {
			return sdataStateless.workingCopies(_, context, name, id);
		}
		if (context.request && context.request.$statelessWC) {
			return sdataStatelessWC.workingCopies(_, context, name, id);
		}
		// delegate to x3pool
		x3pool.send(_, context);
	},
	service: function(_, context, name, id) {
		if (context.request && context.request.$stateless) {
			return sdataStateless.service(_, context, name, id);
		}
		if (context.request && context.request.$statelessWC) {
			return sdataStatelessWC.service(_, context, name, id);
		}
		return _dispatch(_, context, _x3ServiceMap);
	}
};

var _x3ServiceMap = {
	walk: function(_, context, name, id) {
		context.operation = name;
		var op = _x3ServiceOperationMap[name],
			method = op && op[context.method];
		return method ? method.call(op, _, context) : x3pool.send(_, context);
	}
};


var _x3ServiceOperationMap = {
	upload: {

		// download file
		get: function(_, context) {
			// contruction for unit test
			var fileName = this._getFileName(context);
			var stream = x3fs.createDownloadStream(_, context.endpoint, fileName, {
				recOptions: this._createRecOptions(context)
			});
			if (!stream || stream.size(_) <= 0) return context.reply(_, 404);
			var headers = {
				"content-type": "application/octet-stream",
				"content-length": stream.size(_),
				"cache-control": "no-cache,must-revalidate",
				"expires": (new Date(0)).toUTCString(),
				//"content-disposition": "attachment; filename=" + props.fileName
				"content-disposition": "attachment; filename=\"" + fileName + "\""
			};
			context.response.writeHead(200, headers);
			var buf;
			while (buf = stream.read(_, 32 * 1024)) {
				tracer && tracer("*** download *** [" + buf.length + "]\n" + buf.toString());
				context.response.write(_, buf, "binary");
			}
			context.response.end();
		},

		// upload file
		put: function(_, context) {
			// contruction for unit test
			var contentType = context.request.headers["x-content-type-override"] || context.request.headers["content-type"];
			if (!uploadHelpers.allowContentType(contentType)) return context.reply(_, 415, "content type not allowed: " + contentType);
			var reader = uploadHelpers.sanitizeReader(_, context.request, contentType);
			var stream = x3fs.createUploadStream(_, context.endpoint, this._getFileName(context), {
				recOptions: this._createRecOptions(context)
			});

			var buf;
			while (buf = reader.read(_)) {
				stream.write(_, buf, "binary");
			}
			// write (null) means end
			stream.write(_, null);
			context.reply(_, 204);
		},

		// delete file
		"delete": function(_, context) {
			// contruction for unit test

			x3fs.deleteFile(_, context.endpoint, this._getFileName(context), {
				recOptions: this._createRecOptions(context)
			});
			context.reply(_, 204);
		},
		_getFileName: function(context) {
			return context.parameters.fileName || context.request.headers["x-file-name"];
		},
		_createRecOptions: function(context) {
			if (context.request.headers["record"]) {
				return { // for unit test
					recMode: context.request.headers["record"],
					fileName: context.request.headers["recordfile"],
					path: context.request.headers["recordpath"],
					overwrite: true // always override file
				};
			}
			return null;
		}
	}
};

var _datasetServiceMap = {
	walk: function(_, context, name, id) {
		context.operation = name;
		return _dispatch(_, context, _datasetOperationMap);

	},
	get: function(_, context) {
		return context.replyDictionaryPage(_, context.model.datasetOperations(), "operation", function(key, operation) {
			var baseUrl = context.walked();
			return {
				$url: baseUrl + "/" + key,
				$key: key,
				name: key
			};
		});
	}
};

var _datasetOperationMap = {
	get: function(_, context) {
		return context.executeDatasetOperation(_);
	},
	post: function(_, context) {
		return context.executeDatasetOperation(_);
	}
};

var _backupsMap = { // TODO
};

var _propertyLocalizeMap = {
	get: function(_, context) {
		var instance = context.instance || factory.fetchInstance(_, context);
		if (!instance) return context.reply(_, 404, "The requested instance was not found");
		var ro = true;
		if (context.parameters && context.parameters.forceEdit) ro = false;
		return factory.replyLocalizedProperty(_, context, instance, context.propertyName, ro);
	},
	put: function(_, context) {
		var instance = context.instance;
		if (!instance) return context.reply(_, 404, "The requested instance was not found");
		return factory.updateLocalizedProperty(_, context, context.initialInstance, instance, context.propertyName, JSON.parse(context.request.readAll(_)));
	}
};
//URL is http:/host/sdata/app/contract/dataset/entity('id')/property
var _propertyMap = {
	localize: function(_, context) {
		return _dispatch(_, context, _propertyLocalizeMap);
	},
	//
	get: function(_, context) {
		context.setMeta(false);
		var instance = context.instance || factory.fetchInstance(_, context);
		if (!instance) return context.reply(_, 404, "The requested instance was not found");
		context.replyProperty(_, instance, context.propertyName);
	},
	head: function(_, context) {
		context.setMeta(false);
		var instance = factory.fetchInstance(_, context);
		if (!instance) return context.reply(_, 404);
		// get a document
		var store = instance[context.propertyName](_);
		context.reply(_, store.fileExists(_) ? 200 : 404);
	},
	put: function(_, context) {
		context.setMeta(true);
		var instance = context.instance || factory.fetchInstance(_, context);
		if (!instance) return context.reply(_, 404, "The requested instance was not found");
		var store = instance[context.propertyName](_);
		//
		var options = {
			contentType: context.request.headers["x-content-type-override"] || context.request.headers["content-type"],
			fileName: context.request.headers["x-file-name"]
		};
		var reader = uploadHelpers.sanitizeReader(_, context.request, options.contentType);
		var stream = store.createWritableStream(_, options);
		var buf;
		while (buf = reader.read(_)) {
			stream.write(_, buf, "binary");
			/*			store.write(_, buf, {
             contentType: context.request.headers["x-content-type-override"] || context.request.headers["content-type"],
             fileName: context.request.headers["x-file-name"]
             });*/
		}
		// write EOF
		stream.write(_);
		store.uploadDone(_);
		//		store.close(_);
		//
		// Save instance to update metadatas
		(context.initialInstance || instance).save(_);
		context.reply(_, 204);
	},
	// IE9 does a POST instead of a PUT so we accept it and do the same action as the PUT
	post: function(_, context) {
		return _propertyMap.put(_, context);
	},
	"delete": function(_, context) {
		var instance = context.instance || factory.fetchInstance(_, context);
		if (!instance) return context.reply(_, 404, "The requested instance was not found");
		// get a document
		var store = instance[context.propertyName](_);
		store.deleteFile(_);
		//
		context.reply(_, 204);
	}
};
//URL is http://host/sdata/app/contract/dataset/$workingCopies('1fc2...')/property/$localize
var _wcPropertyLocalizeMap = {
	get: function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		return factory.replyLocalizedProperty(_, context, instance, context.propertyName);
	},
	put: function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		return factory.updateWorkingCopyLocalizedProp(_, context, context.httpSession[context.workingCopyId], instance, context.propertyName, JSON.parse(context.request.readAll(_)));
	}
};
//URL is http://host/sdata/app/contract/dataset/$workingCopies('1fc2...')/property
var _wcPropertyMap = {
	localize: function(_, context) {
		return _dispatch(_, context, _wcPropertyLocalizeMap);
	},
	//
	get: function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		context.replyProperty(_, instance, context.propertyName);
	},
	head: function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404);
		// get a document
		var store = instance[context.propertyName](_);
		context.reply(_, store.fileExists(_) ? 200 : 404);
	},
	put: function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		// get a document
		var store = instance[context.propertyName](_);
		store.createWorkingCopy(_);
		context.request.setEncoding(null);
		// TODO build a clean api for the multiport/form-data parse
		// handling case of multipart/form-data post
		var buf;
		var match, filename, contentType, boundary;
		if (match = /^multipart\/form-data;\s*boundary=(.*)/.exec(context.request.headers["content-type"])) {
			boundary = match[1];
			/*
			buf = context.request.read(_, 2048);
			var lines = buf.toString("binary").split('\n');
			if (lines[0].indexOf(boundary) < 0) throw new Error("boundary not found");
			var i = 0;
			for (; i < lines.length; i++) {
				if (/^\r?$/.test(lines[i])) break;
				if (match = /^content-disposition:.*filename="(.*)"/i.exec(lines[i])) filename = match[match.length - 1];
				else if (match = /^content-type:\s*(.*)/i.exec(lines[i])) contentType = match[1];
				// else ignore header
			}
			var len = 0;
			while (i >= 0) len += lines[i--].length + 1;
			context.request.unread(buf.slice(len));
			*/
		} else {
			// regular case
			contentType = context.request.headers["x-content-type-override"] || context.request.headers["content-type"];
			filename = context.request.headers["x-file-name"];
		}
		// #5272: file name is encoded by client
		var options = {
			contentType: contentType,
			fileName: decodeURIComponent(filename)
		};

		// handling case of multipart/form-data post
		if (boundary) {
			var multipart = ez.transforms.multipart.parser(context.request.headers);
			context.request.transform(multipart).forEach(_, function(_, part) {
				// TODO: test with multiple files
				var reader = uploadHelpers.sanitizeReader(_, part, part.headers['content-type']);
				var m = /filename="(.*)"/i.exec(part.headers['content-disposition']);
				options.filename = m && m[1];
				var writer = store.createWritableStream(_, options);
				while (buf = reader.read(_)) writer.write(_, buf, "binary");
				writer.write(_);
			});
			/*
			var len = Math.max(boundary.length, 256);
			while (buf = context.request.read(_, 32 * len)) {
				var s = buf.toString("binary");
				var i = s.indexOf(boundary);
				if (i >= 0) {
					i = s.lastIndexOf('\n', i);
					stream.write(_, s.substring(0, i), "binary");
					context.request.readAll(_); // discard any trailing data
				} else {
					stream.write(_, s.substring(0, 31 * len), "binary");
					context.request.unread(buf.slice(31 * len));
				}
			}*/
		} else {
			// regular case
			var writer = store.createWritableStream(_, options);
			var reader = uploadHelpers.sanitizeReader(_, context.request, options.contentType);
			while (buf = reader.read(_)) {
				writer.write(_, buf, "binary");
			}
			writer.write(_);
		}
		store.uploadDone(_);
		/*			store.write(_, buf, {
         contentType: context.request.headers["x-content-type-override"] || context.request.headers["content-type"],
         fileName: context.request.headers["x-file-name"]
         });
         store.close(_);*/
		//
		var res = instance._parent ? instance._parent.serializeInstance(_) : instance.serializeInstance(_);
		instance.$addSaveResource(_, res);
		context.reply(_, 200, res);
	},
	// IE9 does a POST instead of a PUT so we accept it and do the same action as the PUT
	post: function(_, context) {
		return _wcPropertyMap.put(_, context);
	},
	"delete": function(_, context) {
		var instance = context.instance || context.httpSession[context.workingCopyId];
		if (!instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		// get a document
		var store = instance[context.propertyName](_);
		store.createWorkingCopy(_, true);
		// working copy modification, reply with working copy new status
		var res = instance.serializeInstance(_);
		instance.$addSaveResource(_, res);
		context.reply(_, 200, res);
		//		context.reply(_, 204);
	}
};

// URL is http://host/sdata/app/contract/dataset/entity (or deeper)
var _entityMap = {
	get: function(_, context) {
		// helpers.stubsPath is to be deprecated
		var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
		// stubs
		if (!context.contract && stubsPath) {
			context.reply(_, 200, getEntitiesListStub(_, context));
		} else return factory.replyInstances(_, context);
	},
	post: function(_, context) {
		context.setMeta(true);
		return factory.createInstance(_, context, context.entity.factory);
	},

	template: function(_, context) {
		return _dispatch(_, context, _templateMap);
	},
	batch: function(_, context) {
		return _dispatch(_, context, _batchMap);
	},
	// batchGet = batch (has only gets)
	batchGet: function(_, context) {
		return _dispatch(_, context, _batchMap);
	},
	schema: function(_, context) {
		return _dispatch(_, context, _schemaMap);
	},
	service: function(_, context) {
		return _dispatch(_, context, _serviceMap);
	},
	linked: function(_, context, id) {
		context.syncUuid = id;
		context.useSyncUuid = true; // use correct SData protocol for $uuid
		context.isExpressionId = true;
		return _dispatch(_, context, _linkedMap);
	},
	syncDigest: function(_, context) {
		return _dispatch(_, context, _syncDigestMap);
	},
	syncSource: function(_, context) {
		return _dispatch(_, context, _syncSourceMap);
	},
	syncTarget: function(_, context) {
		return _dispatch(_, context, _syncTargetMap);
	}
};

// URL is http://host/sdata/app/contract/dataset/entity('id') (or deeper)
var _instanceMap = {
	walk: function(_, context, name, id) {
		context.propertyName = name;
		var rel = context.entity.$relations[name];
		if (!rel) {
			//
			var prop = context.entity.$properties[name];
			if (prop) return _dispatch(_, context, _propertyMap);
			throw context.notFound("relation or property not found: " + name);
		}

		context.setMeta(false);
		var inst = context.instance || factory.fetchInstance(_, context);
		context.relation = rel;
		if (!context.initialInstance) context.initialInstance = inst;
		context.instance = inst;
		if (rel.isPlural) {
			// TODO set context params for fetchInstances (for list)
			if (id) {
				context.instance = inst && inst[rel.name](_).get(_, id);
				if (context.instance) context.entity = context.instance.getEntity(_);
				return _dispatch(_, context, _instanceMap);
			} else return _dispatch(_, context, _entityMap);
		} else {
			context.instance = inst[rel.name](_);
			if (context.instance) context.entity = context.instance.getEntity(_);
			context.instanceId = context.instance && context.instance.$uuid;
			return _dispatch(_, context, _instanceMap);
		}
	},
	get: function(_, context) {
		// helpers.stubsPath is to be deprecated
		var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
		if (!context.contract && stubsPath) {
			context.reply(_, 200, getEntityStub(_, context));
		} else {
			context.setMeta(context.representation.type && context.representation.type.indexOf("$details") >= 0);
			factory.replyInstance(_, context);
		}
	},
	put: function(_, context) {
		context.setMeta(true);
		return factory.updateInstance(_, context);
	},
	"delete": function(_, context) {
		context.setMeta(true);
		return factory.deleteInstance(_, context);
	},
	schema: function(_, context) {
		return _dispatch(_, context, _schemaMap);
	},
	service: function(_, context) {
		return _dispatch(_, context, _serviceMap);
	},
	workingCopies: function(_, context) {
		return _dispatch(_, context, _workingCopiesMap);
	},
	graphs: function(_, context) {
		return _dispatch(_, context, _graphsMap);
	},
	tagClouds: function(_, context) {
		return _dispatch(_, context, _tagCloudsMap);
	}
};

//URL is http://host/sdata/app/contract/dataset/$syncDigest
var _syncDigestMap = {
	get: function(_, context) {
		var dig = context.entity.makeDigest(_, context.db);
		if (!dig) {
			return context.reply(_, 400, "No synchronization possible on this entity");
		}
		return context.reply(_, 200, dig);
	},
	post: function(_, context) {
		throw context.niy("sync source");
	}
};


// process a sync source request

function _doSyncSource(_, context) {
	var digest = JSON.parse(context.request.readAll(_));
	var localDigest = context.entity.makeDigest(_, context.db);
	var endpoints = [];
	var resources = [];
	var deletedEntity = context.db.getEntity(_, "deleted");
	// newer data for endpoints in given synchronization digest

	digest.$resources.forEach_(_, function(_, resource) {
		var minTick = resource.$tick;
		var endp = resource.$endpoint;
		if (endp === localDigest.$origin) endp = "";
		var cursor = context.db.createCursor(_, context.entity, {
			jsonWhere: {
				$tick: {
					$gte: minTick
				},
				$endpoint: endp
			}
		});
		var inst;
		while (inst = cursor.next(_)) {
			// include $tick, $endpoint, $stamp
			resources.push(inst.serializeInstance(_, 2));
		}
		// deleted instances
		var condition = {
			jsonWhere: {
				tick: {
					$gte: minTick
				},
				endpoint: endp,
				entname: context.entity.name
			}
		};
		var cursor = context.db.createCursor(_, deletedEntity, condition);
		var inst;
		while (inst = cursor.next(_)) {
			resources.push({
				$uuid: inst.syncUuid(_),
				$tick: inst.tick(_),
				$endpoint: resource.$endpoint,
				$stamp: inst.deletionTime(_).toString(),
				$isDeleted: true
			});
		};
		endpoints.push(resource.$endpoint);
	});
	// add data from other endpoints in own synchronization digest
	localDigest.$resources.forEach_(_, function(_, resource) {
		if (endpoints.indexOf(resource.$endpoint) >= 0) return;
		var endp = resource.$endpoint;
		if (endp === localDigest.$origin) endp = "";
		var cursor = context.db.createCursor(_, context.entity, {
			jsonWhere: {
				$endpoint: endp
			}
		});
		var inst;
		while (inst = cursor.next(_)) {
			resources.push(inst.serializeInstance(_, 2));
		}
		// deleted instances
		var cursor = context.db.createCursor(_, deletedEntity, {
			jsonWhere: {
				endpoint: endp,
				entname: context.entity.name
			}
		});
		var inst;
		while (inst = cursor.next(_)) {
			resources.push({
				$uuid: inst.syncUuid(_),
				$tick: inst.tick(_),
				$endpoint: resource.$endpoint,
				$stamp: inst.deletionTime(_).toString(),
				$isDeleted: true
			});
		};
	});
	resources = resources.sort(function(a, b) {
		return a.$tick - b.$tick;
	});
	// delete metadata
	// find out number of endpoints
	if (!digest.$resources.some(function(entry) {
			return (entry.$endpoint !== localDigest.$origin && entry.$endpoint !== digest.$origin);
		}) && !localDigest.$resources.some(function(entry) {
			return (entry.$endpoint !== localDigest.$origin && entry.$endpoint !== digest.$origin);
		})) {
		// only 2 endpoints
		var digestPart;
		if (digest.$resources.some(function(entry) {
				if (entry.$endpoint === localDigest.$origin) {
					digestPart = entry;
					return true;
				}
			})) _deleteMetadata(_, context, deletedEntity, localDigest, digestPart);

	}


	context.reply(_, 200, {
		"$syncMode": "catchUp",
		$digest: localDigest,
		$resources: resources
	});
};

// process a sync target request

function _doSyncTarget(_, context) {
	context.useSyncUuid = true; // SData compliant UUID
	try {
		var batchResult = {
			$resources: []
		};
		var data = JSON.parse(context.request.readAll(_));
		if (data.$syncMode !== "catchUp" && data.$syncMode !== "immediate") {
			return context.reply(_, 400, "Wrong sync mode");
		}
		var localDigestRaw = context.entity.makeDigest(_, context.db);
		// map source synchronization digest to object
		var sourceDigest = {};
		var endpointNumber = 0;
		var resources = [];
		var localDigest = {};
		localDigestRaw.$resources.forEach(function(entry) {
			localDigest[entry.$endpoint] = entry;
			endpointNumber++;
		});
		data.$digest.$resources.forEach(function(entry) {
			sourceDigest[entry.$endpoint] = entry;
			if (!localDigest[entry.$endpoint]) {
				// add foreign digest endpoints to raw local digest, not to computed local digest object itself
				// so that rule 3 works
				localDigestRaw.$resources.push(entry);
				endpointNumber++;
			}
		});

		var deletedEntity = context.db.getEntity(_, "deleted");
		var notOK = data.$resources.some_(_, function(_, resource) { // true result only in case of error
			if (data.$syncMode === "immediate" && localDigest[resource.$endpoint].$tick !== resource.$tick) {
				// numbers are not contiguous
				context.batchResult = null;
				context.reply(_, 400, "Ticks not contiguous: Tick in resource " + resource.$tick + " Tick in digest " + localDigest[resource.$endpoint].$tick);
				return true;
			}
			var opres = {
				$location: "",
				$uuid: resource.$uuid,
				$httpMethod: "GET",
				$httpStatus: 200
			};
			batchResult.$resources.push(opres);
			if (!resource.$uuid) {
				opres.$httpStatus = 400;
				opres.$httpMessage = "No UUID";
			}
			context.batchResult = opres;
			// fetch local instance by $uuid
			var localInst = context.db.fetchInstance(_, context.entity, {
				jsonWhere: {
					$syncUuid: resource.$uuid || null,
				}
			});
			var delInst;
			var endpoint;
			var tick;
			var stamp; // timestamp (number of milliseconds
			// use contents of given data
			var take = false;
			if (localInst) {
				endpoint = localInst.$endpoint || context.entity._endpoint;
				tick = localInst.$tick;
				stamp = localInst.$updDate.getTime();
			} else {
				// 	maybe instance has already been deleted
				delInst = context.db.fetchInstance(_, deletedEntity, {
					jsonWhere: {
						syncUuid: resource.$uuid
					}
				});
				if (delInst) {
					endpoint = delInst.endpoint(_) || context.entity._endpoint;
					tick = delInst.tick(_);
					stamp = delInst.deletionTime(_).value;
				} else {
					take = true;
				}
			}

			// sync rule 1: same endpoint
			if (endpoint === resource.$endpoint) {
				tracer && tracer("Rule 1");
				take = (tick < resource.$tick);
			} else if (endpoint in sourceDigest && sourceDigest[endpoint].$tick > tick) {
				// sync rule 2: If the endpoint of the $endpoint attribute of the local row appears in the
				// source synchronization digest and the tick for that endpoint is greater than (not: at least) the value of $tick of
				// the local data row, there is no conflict and the data of the source data row have to be taken.
				tracer && tracer("Rule 2");
				take = true;
			} else if (resource.$endpoint in localDigest && localDigest[resource.$endpoint] > resource.$tick) {
				// sync rule 3: If the endpoint of the $endpoint attribute of the source data appears in the local
				// synchronization digest and the tick for that endpoint is greater than (not: at least) the value of $tick of the source
				// data row, there is no conflict and the data of the source data row must not be taken.
				tracer && tracer("Rule 3");
				take = false;
			} else if (!take) {
				// conflict with existing instance
				var sourceData = sourceDigest[resource.$endpoint];
				var localData = localDigest[endpoint];
				if (sourceData.$conflictPriority !== localData.$conflictPriority) {
					// 	compare conflict priorities
					tracer && tracer("Conflict: conflict priorities " + localData.$conflictPriority + " " + sourceData.$conflictPriority);
					take = (localData.$conflictPriority > sourceData.$conflictPriority);
				} else {
					// compare timestamps
					var resourceTime = Date.parse(resource.$stamp);
					if (resourceTime !== stamp) {
						tracer && tracer("Conflict: time stamps " + resource.$stamp + " " + stamp);
						take = (resourceTime > stamp);
					} else {
						// compare endpoint URLs
						tracer && tracer("Conflict: endpoint names " + resource.$endpoint + " " + endpoint);
						take = (resource.$endpoint < endpoint);
					}
				}
			}
			if (take) {
				// take foreign data
				if (!resource.$isDeleted) {
					if (!localInst) {
						// re-create local instance if necessary
						if (delInst) delInst.deleteSelf(_);
						localInst = context.entity.createInstance(_, context.db);
						localInst.$syncUuid = resource.$uuid || null;
					}
					Object.keys(resource).forEach_(_, function(_, attr) {
						if (attr[0] === "$") {
							if (attr === "$stamp" || attr === "$tick" || attr === "$endpoint") {
								localInst[attr] = resource[attr];
							}
						} else {
							localInst[attr](_, resource[attr]);
						}
					});
					if (localInst.$endpoint === context.entity._endpoint) localInst.$endpoint = "";
					opres.$httpMethod = (localInst.$created ? "POST" : "PUT");
					localInst._noIncreaseTick = true;
					localInst.save(_);
					var error = localInst.findError(_);
					try {
						if (error && error.code === "UNIQUE_KEY_VIOLATION" && error.propname in resource) {
							var filter = {};
							filter[error.propname] = resource[error.propname];
							var testInstance = context.entity.fetchInstance(_, context.db, {
								jsonWhere: filter
							});
							if (testInstance) {
								if (!testInstance.$syncUuid || testInstance.$syncUuid.toUpperCase() < resource.$uuid.toUpperCase()) {
									testInstance.$syncUuid = resource.$uuid || null; // take "larger" UUID
								}
								// copy properties and save again
								Object.keys(resource).forEach_(_, function(_, attr) {
									if (attr[0] === "$") {
										if (attr === "$stamp" || attr === "$tick" || attr === "$endpoint") {
											localInst[attr] = resource[attr];
										}
									} else {
										localInst[attr](_, resource[attr]);
									}
								});
								localInst.save(_);
								error = localInst.findError(_);
							}

						}
					} catch (e) {
						console.error("Error " + e.stack);
					}
					if (error) {
						context.reply(_, 500, error.$message);
					} else {
						context.instance = localInst;
						factory.replyInstance(_, context);
					}

				} else {
					// delete instance
					opres.$httpMethod = "DELETE";
					if (localInst) {
						localInst._noIncreaseTick = true;
						localInst.deleteSelf(_);
					}
					if (endpointNumber <= 2) { // always delete special instance for deleted instances when there are 2 endpoints
						if (delInst) {
							delInst._noIncreaseTick = true;
							delInst.deleteSelf(_);
						}
					} else {
						// more than 2 endpoints: update/create special instance
						if (!delInst) {
							delInst = deletedEntity.createInstance(_, context.db);
							delInst.syncUuid(_, resource.$uuid);
						}
						delInst.deletionTime(_, datetime.parse(resource.$stamp));
						delInst.endpoint(_, (resource.$endpoint === context.entity._endpoint ? "" : resource.$endpoint));
						delInst.entname(_, context.entity.name);
						delInst.tick(_, resource.$tick);
						delInst._noIncreaseTick = true;
						delInst.save(_);
					}
					if (delInst && (error = delInst.findError(_))) {
						context.reply(_, 500, error.$message);
					} else {
						context.reply(_, 200);
					}
				}
			} else {
				if (localInst) {
					context.instance = localInst;
					opres.$httpMethod = "GET";
					factory.replyInstance(_, context);
				} else {
					opres.$httpMethod = "DELETE";
					context.reply(_, 200);
				}

			}
			// add endpoint to local digest (in order to set tick)
			if (!localDigest[resource.$endpoint]) {
				localDigest[resource.$endpoint] = sourceDigest[resource.$endpoint];
			}
			if (resource.$endpoint !== localDigestRaw.$origin) {
				localDigest[resource.$endpoint].$tick = resource.$tick + 1;
			}
		});
		if (!notOK) {
			// update local digest at the very end of Sync Target
			if (!data.$links || !data.$links.$next) {
				for (var key in sourceDigest) {
					if (key in localDigest) {
						if (localDigest[key].$tick < sourceDigest[key].$tick) {
							localDigest[key].$tick = sourceDigest[key].$tick;
						}
					}
				}
			}
			// save new digest
			context.entity.saveDigest(_, context.db, localDigestRaw);
			// delete metadata of saved instances
			if (endpointNumber <= 2) {

				// delete metadata of locally created instances
				_deleteMetadata(_, context, deletedEntity, localDigestRaw, sourceDigest[localDigestRaw.$origin]);

			}
			context.batchResult = null;
			context.reply(_, 200, batchResult);
		}
	} catch (e) {
		context.batchResult = null;
		console.error(e.stack);
		context.reply(_, 500, e.message);
	}
};

// delete metadata of removed instances (can be safely done when there are just 2 endpoints)

function _deleteMetadata(_, context, deletedEntity, localDigest, part) {
	if (part) {
		var cursor = context.db.createCursor(_, deletedEntity, {
			jsonWhere: {
				tick: {
					$lte: part.$tick - 1
				},
				entname: context.entity.name,
				endpoint: ""
			}
		});
		var inst;
		while (inst = cursor.next(_)) {
			inst._noIncreaseTick = true;
			inst.deleteSelf(_);
		}

	}
}


//URL is http://host/sdata/app/contract/dataset/$syncSource
var _syncSourceMap = {
	post: function(_, context) {
		try {
			context.parameters = context.parameters || {};
			context.parameters.trackngId = context.parameters.trackingID;
			var tracker = sdataAsync.create(context, _doSyncSource, false, {});
			tracker.location = "/" + context.segments[1] + "/$trackers('" + context.parameters.trackngId + "')?reply=true";
			tracker.start(_);
		} catch (err) {
			helpers.log.exception(module, err);
			context.reply(_, 500, err.message + "\n" + (err.$stackTrace || err.safeStack));
		}
	}
};

//URL is http://host/sdata/app/contract/dataset/$syncSource
var _syncTargetMap = {
	post: function(_, context) {
		try {
			context.parameters = context.parameters || {};
			context.parameters.trackngId = context.parameters.trackingID;
			var tracker = sdataAsync.create(context, _doSyncTarget);
			tracker.location = "/" + context.segments[1] + "/$trackers('" + context.parameters.trackngId + "')?reply=true";
			tracker.start(_);
		} catch (err) {
			helpers.log.exception(module, err);
			context.reply(_, 500, err.message + "\n" + (err.$stackTrace || err.safeStack));
		}
	}
};


// URL is http://host/sdata/app/contract/dataset/$linked or http://host/sdata/app/contract/dataset/$linked('id')
var _linkedMap = {
	get: function(_, context) { // fetch instance(s) by global UUID
		if (context.syncUuid) {
			if (context.query && context.query.select === "") {
				context.sendUrlOnly = true;
			}
			return factory.replyInstance(_, context);
		} else {
			return factory.replyInstances(_, context);
		}
	},
	"delete": function(_, context) { // delete global UUID of an instance (do not delete instance itself)
		if (context.syncUuid) {
			var instance = factory.fetchInstance(_, context);
			if (instance) {
				instance.$syncUuid = null;
				instance._deleteSyncUuid = true;
				instance.save(_);
				return context.reply(_, 200);
			}
			return context.reply(_, 404);
		} else {
			return context.reply(_, httpHelpers.httpStatus.BadRequest);
		}
	},
	post: function(_, context) { // assign global UUID to instance
		var data = JSON.parse(context.request.readAll(_));
		context.linkUrl = data.$url;
		context.syncUuid = data.$uuid;
		return factory.setSyncUuid(_, context, false);
	},
	put: function(_, context) { // change instance for global UUID
		var data = JSON.parse(context.request.readAll(_));
		context.linkUrl = data.$url;
		context.syncUuid = data.$uuid;
		return factory.setSyncUuid(_, context, true);
	},
	batch: function(_, context) {
		try {
			var batchResult = {
				$resources: []
			};
			var brequest = JSON.parse(context.request.readAll(_));

			brequest.$resources.forEach_(_, function(_, entry) {
				var method = entry.$httpMethod.toLowerCase();
				var uuid = entry.$uuid;
				var opres = {
					$location: entry.$location,
					$uuid: uuid,
					$httpMethod: entry.$httpMethod,
					$httpStatus: 200
				};
				batchResult.$resources.push(opres);
				if (!uuid && method !== "post") {
					opres.$httpStatus = 400;
					opres.$httpMessage = "No UUID";
				}
				try {
					context.syncUuid = uuid;
					context.linkUrl = entry.$url;
					context.isExpressionId = (!!uuid);
					context.batchResult = opres;
					context.sendUrlOnly = false;
					switch (method) {
						case "get":
							if (entry.$location && entry.$location.indexOf("?select=") > 0) {
								context.sendUrlOnly = true;
							}
							factory.replyInstance(_, context);
							break;
						case "post":
							factory.setSyncUuid(_, context, false);
							break;
						case "put":
							factory.setSyncUuid(_, context, true);
							break;
						case "delete":
							var instance = factory.fetchInstance(_, context);
							if (instance) {
								instance.$syncUuid = null;
								instance._deleteSyncUuid = true;
								instance.save(_);
							} else {
								return context.reply(_, 404);
							}
							break;
						default:
							break;
					}
				} catch (ex) {
					opres.$httpStatus = 500;
					opres.$httpMessage = ex.message;
				}
			});
			context.batchResult = null;
			context.reply(_, 200, batchResult);
		} catch (e) {
			context.batchResult = null;
			context.reply(_, 500, e.message);
		}
	}
};

// URL is http://host/sdata/app/contract/dataset/$prototypes
var _prototypesMap = {
	get: function(_, context) {
		throw context.niy("prototypes list");
	}
};

// URL is http://host/sdata/app/contract/dataset/$prototypes('id')
var _prototypeMap = {
	get: function(_, context) {
		var keys = context.prototypeId.split(".");
		// helpers.stubsPath is to be deprecated
		var stubsPath = ((globals.context.config || {}).system || {}).stubsPath || helpers.stubsPath;
		// use of stubs ?
		if ((!context.application || !context.contract) && stubsPath) {
			context.reply(_, 200, getPrototypeStub(_, context));
		} else {
			//
			context.representation = {
				application: context.application.name,
				contract: context.contract.name,
				entity: keys[0],
				type: keys[1],
				variant: keys[2]
			};

			context.replyPrototype(_);
		}
	}
};
var _batchMap = {
	post: function(_, context) {
		factory.batch(_, context);
	}
};
var _templateMap = {
	get: function(_, context) {
		context.setMeta(true);
		factory.createTemplate(_, context, context.entity.factory);
	},
	workingCopies: function(_, context) {
		return _dispatch(_, context, _workingCopiesMap);
	}
};
// URL is http://host/sdata/app/contract/dataset/entity/$template/$workingCopies?trackingId=1fc2...
// URL is http://host/sdata/app/contract/dataset/entity('xxxxx')/$workingCopies?trackingId=1fc2...
// URL is http://host/sdata/app/contract/dataset/$workingCopies('1fc2...')
var _workingCopiesMap = {
	walk: function(_, context, name, id) {

		context.propertyName = name;
		context.instance = context.instance || context.httpSession[context.workingCopyId];
		if (!context.instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		context.entity = context.instance.getEntity(_);
		var rel = context.entity.$relations[name];
		if (!rel) {
			//
			var prop = context.entity.$properties[name];
			if (prop) return _dispatch(_, context, _wcPropertyMap);
			throw context.notFound("relation or property not found: " + name);
		}

		context.setMeta(false);
		context.relation = rel;
		context.entity = context.relation.targetEntity;
		if (rel.isPlural) {
			if (id) {
				context.instance = context.instance[name](_).get(_, id);
				if (!context.instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
				return _dispatch(_, context, _workingCopiesMap);
			}
		} else {
			context.instance = context.instance[name](_);
			return _dispatch(_, context, _workingCopiesMap);
		}
	},
	get: function(_, context) {

		var instance = context.httpSession[context.workingCopyId];
		var entity = context.getEntity(_);
		if (!instance && !(entity && entity.$autoRecreateWorkingCopy)) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		factory.getWorkingCopy(_, context, instance);
	},
	post: function(_, context) {

		factory.createWorkingCopy(_, context, context.entity.factory);
	},
	put: function(_, context) {
		var instance = context.httpSession[context.workingCopyId];
		var entity = context.getEntity(_);
		if (!instance && !(entity && entity.$autoRecreateWorkingCopy)) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		factory.updateWorkingCopy(_, context, instance, JSON.parse(context.request.readAll(_)));
	},
	"delete": function(_, context) {
		delete context.httpSession[context.workingCopyId];
		return context.reply(_, 204);
	},
	graphs: function(_, context) {
		context.instance = context.httpSession[context.workingCopyId];
		if (!context.instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		context.entity = context.instance._meta;
		return _dispatch(_, context, _graphsMap);
	},
	tagClouds: function(_, context) {
		context.instance = context.httpSession[context.workingCopyId];
		if (!context.instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		context.entity = context.instance._meta;
		return _dispatch(_, context, _tagCloudsMap);
	},
	service: function(_, context) {
		context.instance = context.httpSession[context.workingCopyId];
		if (!context.instance) return context.reply(_, 404, locale.format(module, "wcNotFound"));
		context.entity = context.instance._meta;
		return _dispatch(_, context, _serviceMap);
	}
};

//URL is http://host/sdata/app/contract/dataset/entity('xxxxx')/$graphs
var _graphsMap = {
	walk: function(_, context, name, id) {
		context.graphName = name;
		return _dispatch(_, context, _graphMap);
	}
};

//URL is http://host/sdata/app/contract/dataset/entity('xxxxx')/$graphs/graphName
var _graphMap = {
	get: function(_, context) {
		return graph.replyGraph(_, context);
	}
};

//URL is http://host/sdata/app/contract/dataset/entity('xxxxx')/$tagClouds
var _tagCloudsMap = {
	walk: function(_, context, name, id) {
		context.tagCloudName = name;
		return _dispatch(_, context, _tagCloudMap);
	}
};

//URL is http://host/sdata/app/contract/dataset/entity('xxxxx')/$tagClouds/cloudName
var _tagCloudMap = {
	get: function(_, context) {
		return tagCloud.replyTagCloud(_, context);
	}
};

// URL is http://host/sdata/app/contract/dataset/.../$schema
var _schemaMap = {
	get: function(_, context) {
		context.setMeta(false);
		throw context.niy("schemas not supported");
	}
};

// URL is http://host/sdata/app/contract/dataset/.../$service
var _serviceMap = {
	walk: function(_, context, name, id) {
		var operation = context.entity.$services[name];
		if (!operation) throw context.notFound("service operation not found: " + name);
		var hasInstance = (context.instance != null) || (context.instanceId != null);

		if (hasInstance != operation.isMethod) throw context.badRequest("isMethod mismatch on operation");
		operation.method = operation.method || "post"; //TODO Should remove this
		context.operation = operation;
		context.setMeta(false);
		return _dispatch(_, context, _operationMap);
	},
	get: function(_, context) {
		var baseUrl = context.walked();
		var hasInstance = context.instanceId != null;
		return context.replyDictionaryPage(_, context.entity.$services, "operation", function(name, operation) {
			if (operation.isMethod != hasInstance) return;
			return {
				$url: baseUrl + "/" + name,
				$key: name,
				name: name
			};
		});
	}
};

// URL is http://host/sdata/app/contract/dataset/.../$service/operation
var _operationMap = {
	get: function(_, context) {
		return context.executeOperation(_);
	},
	post: function(_, context) {
		return context.executeOperation(_);
	}
};

// URL is thhp://host/sdata/syracuse/search/dataset/$search[('indexName')][?q='search string']

var _searchMap = {
	get: function(_, context) {
		return searchEngine.search(_, context);
	},
	put: function(_, context) {
		return searchEngine.updateIndex(_, context);
	},
	"delete": function(_, context) {
		return searchEngine.deleteIndex(_, context, context.id);
	}
};

var _importTools = {
	"application/json": require("syracuse-import/lib/jsonImport").streamImport
};

var _importMap = {
	post: function(_, context) {
		var r = context.request;
		var ct = httpHelpers.parseHeaders(r.headers)["content-type"] || "application/json";
		context.reply(_, 201, _importTools[ct] && _importTools[ct](_, context.db, r, {
			importMode: "insert",
			createSession: true
		}));
	},
	put: function(_, context) {
		var r = context.request;
		var ct = httpHelpers.parseHeaders(r.headers)["content-type"] || "application/json";
		context.reply(_, 200, _importTools[ct] && _importTools[ct](_, context.db, r, {
			importMode: "update",
			createSession: true
		}));
	}
};

var protocolTracer = helpers.debug.tracer("sdata.protocol");

function _logRequest(_, context) {
	if (!context.request.headers["x-history-title"]) return;
	//
	var db = adminHelper.getCollaborationOrm(_);
	var h = db.model.getEntity(_, "navHistory").factory.createInstance(_, null, db);
	h.title(_, context.request.headers["x-history-title"]);
	h.agent(_, context.request.headers["x-history-agent"]);
	h.url(_, context.request.url);
	h.save(_);
}

function _doIt(_, context) {
	try {

		var sdata = context.walkUrl();
		if (!/^(sdata|mobile1|mobile2|api|api1)$/.test(sdata)) throw new Error("Bad URL: expected 'sdata,api,mobile1,mobile2', got '" + sdata + "'");

		// fire and forget log call
		_logRequest(!_, context);
		//
		switch (context.accept[0].type) {
			case "xlsx":
			case "docx":
			case "pptx":
				require("msoffice/lib/officeDispatch").dispatch(_, context);
				break;
			default:
				if (context.checkAlreadyProcessRequest()) {
					context.writeLastResponse(_);
				} else {
					_dispatch(_, context, _sdataMap);
				}
		}
		//
	} catch (ex) {
		console.error(ex.$httpStatus ? ex.message : ex.stack);
		if ("phone" === context.parameters.device) {
			ex.message = locale.format(module, "mobileException") + "\n" + ex.message;
		}
		var diags = [];
		diags.push({
			$severity: "error",
			$message: ex.message,
			$stackTrace: ex.$stackTrace || ex.safeStack
		});
		(ex.$diagnoses || []).forEach(function(dd) {
			diags.push(dd);
		});
		return context.reply(_, ex.$httpStatus == null ? 500 : ex.$httpStatus, {
			$diagnoses: diags
		});
	}
}

exports.dispatcher = function(options) {
	registry.register(options.endpoints);

	return function(_, request, response) {
		var context;
		try {
			context = new Context(request, response, options);
		} catch (e) {
			var accept = httpHelpers.parseAccept(request.headers.accept || "*");
			var headers = [];
			var resp;
			switch (accept[0].type) {
				case "json":
				case "*":
					headers["content-type"] = "application/json";
					resp = new Buffer(JSON.stringify({
						$diagnoses: [{
							$severity: "error",
							$message: e.toString()
						}]
					}));
					break;
				default:
					headers["content-type"] = "text/plain";
					headers["content-encoding"] = "utf8";
					resp = new Buffer(e.toString());
					break;
			}
			headers["content-length"] = resp.length;
			response.writeHead(400, headers);
			response.end(resp);
			helpers.log.exception(module, e);
			return;
		}
		request.context = context;
		try {
			var id = context.parameters.trackngId;
			if (id) {
				var tracker = sdataAsync.create(context, _doIt);
				tracker.location = "/" + context.segments[1] + "/$trackers('" + id + "')";
				tracker.canAbort = context.parameters.canAbort || false;
				tracker.start(_);
			} else _doIt(_, context);
		} catch (err) {
			helpers.log.exception(module, err);
			context.reply(_, 500, err.message + "\n" + (err.$stackTrace || err.safeStack));
		}
	};
};