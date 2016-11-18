"use strict";

var globals = require('streamline-runtime').globals;
var helpers = require('@sage/syracuse-core').helpers;
var parser = require("@sage/syracuse-sdata-parser");
var find = helpers.object.find;
var forEachKey = helpers.object.forEachKey;
var sys = require("util");
var flows = require('streamline-runtime').flows;
var httpHelpers = require('@sage/syracuse-core').http;
var factory = require("../..//src/orm/factory");
var resourceHelpers = require('@sage/syracuse-core').resource.util;
var resourceProxy = require('@sage/syracuse-core').resource.proxy;
var sdataRegistry = require("../../src/sdata/sdataRegistry");
var dataModel = require("../..//src/orm/dataModel");
var adminUtil = require("../../src/collaboration/util");
var pluralize = helpers.string.pluralize;
var locale = require('streamline-locale');
var http = require('http');
var depend = require("streamline-require/lib/server/depend");
var config = require('config');
var htmlTransforms = require('@sage/html-sanitizer/src/transforms');

var nocache = config && config.hosting && config.hosting.nocache;

var _defaultCount = 20;
var _maxCount = 1000;

var queryRepr = ["$query", "$lookup", "$search", "$select"]; // query like facets
exports.tracer = null; // console.log;

function _getTranslatedString(stringResources, parts, combineParts) {
	if (!stringResources || !parts || !parts.length) return "";
	for (var i = 0; i < (combineParts ? parts.length : 1); i++) {
		var str = stringResources[parts.slice(i).join(".")];
		//console.log("resource for : "+parts.slice(i).join(".")+"="+str);
		if (str) return str;
	}
	return "";
}

function _intValue(str, def) {
	return str == null ? def : parseInt(str, 10);
}

function _parsePaths(param) {
	if (!param) return;
	var result = {};
	param.split(',').forEach(function(path) {
		var obj = result;
		path.split('.').forEach(function(name) {
			obj[name] = obj[name] || {};
			obj = obj[name];
		});
	});
	return result;
}

function _parseParameters(query) {
	var parameters = helpers.object.clone(query);
	if (parameters.url) parameters = helpers.url.parseQueryString(parameters.url.split("?")[1]);
	// convert non-string parameters
	parameters.startIndex = _intValue(parameters.startIndex, 1);
	parameters.count = Math.min(_intValue(parameters.count, _defaultCount), _maxCount);
	parameters.orderBy = helpers.url.parseOrderBy(parameters.orderBy);
	parameters.rawSelect = parameters.select;
	parameters.select = _parsePaths(parameters.select);
	parameters.rawInclude = parameters.include;
	parameters.include = _parsePaths(parameters.include);
	parameters.includeSchema = parameters.includeSchema == "true";
	parameters.where = parser.parse(parameters.where);
	return parameters;
};

function _splitRepresentation(str) {
	if (!str) return {};
	var comps = str.split(',');
	var comps = comps[0].split('.');
	return {
		application: comps[0],
		contract: comps[1],
		dataset: comps[2],
		entity: comps[3],
		type: comps[4],
		variant: comps[5]
	};
}

function _toHtml(context, result) {
	function esc(text) {
		return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	};

	var body = typeof result == "object" ? JSON.stringify(result, null, 2) : result.toString();
	return "<html><head><title>" + esc(result.$descriptor || '') + "</title></head>" + "<body><pre>" + esc(body) + "</pre></body></html>";
}

function _queryString(parameters) {
	var items = helpers.object.toArray(parameters, function(key, val) {
		return key + "=" + encodeURIComponent(val);
	});
	return items.length == 0 ? "" : ("?" + items.join('&'));
}

function _formatKeyPagerFeed(context, url, results) {
	var parameters = helpers.object.clone(context.query);
	var uiMain = context.url.split('/').splice(0, 3).join('/') + "/syracuse-main/html/main.html";

	var feed = {
		$url: url + _queryString(parameters),
		$itemsPerPage: context.parameters.count,
		$resources: results,
		$links: {}
	};
	//
	parameters.orderBy = parameters.orderBy || ((context.entity.$defaultOrder && context.entity.$defaultOrder[0]) || [])[0];
	if (!parameters.orderBy) throw new Error(locale.format(module, "orderByRequired", context.entity.name));
	var orderProp = parameters.orderBy.split(" ")[0];
	//
	if (parameters.key) {
		delete parameters.key;
		feed.$links.$first = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}

	if (!context.isLastPage && results.length) {
		parameters.key = "gt." + results[results.length - 1][orderProp];
		feed.$links.$next = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}
	if (feed.$links.$first && results.length) {
		parameters.key = "lt." + results[0][orderProp];
		feed.$links.$previous = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}
	if (!context.isLastPage) {
		parameters.key = "lt.zzzzzz";
		feed.$links.$last = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}
	return feed;
}

function _formatDefaultFeed(context, url, results) {
	var parameters = helpers.object.clone(context.query);
	var uiMain = context.url.split('/').splice(0, 3).join('/') + "/syracuse-main/html/main.html";

	var feed = {
		$url: url + _queryString(parameters),
		$descriptor: context.entity ? context.entity.plural : context.currentSegment,
		$startIndex: context.parameters.startIndex,
		$itemsPerPage: context.parameters.count,
		$totalResults: context.totalCount,
		$ui: uiMain + "#ui=" + url + "/$ui/master" + "&data=" + url,
		$resources: results,
		$links: {}
	};
	parameters.startIndex = 1;
	parameters.count = feed.$itemsPerPage;
	if ((feed.$totalResults > feed.$itemsPerPage) && (feed.$startIndex > feed.$itemsPerPage)) feed.$links.$first = {
		$url: url + _queryString(parameters),
		$type: "application/json; vnd-sage=syracuse"
	};

	if (feed.$startIndex + feed.$itemsPerPage <= feed.$totalResults) {
		parameters.startIndex = feed.$startIndex + feed.$itemsPerPage;
		//		parameters.letter = "{$letter}";
		//		parameters.key = "gt." + results[results.length-1].$uuid;
		parameters.count = feed.$itemsPerPage;
		feed.$links.$next = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}
	if (feed.$startIndex > 1) {
		parameters.startIndex = Math.max(1, feed.$startIndex - feed.$itemsPerPage);
		//		parameters.count = feed.$startIndex - parameters.startIndex;
		// leave count to "itemsPerPage", it serves to link formatting
		parameters.count = feed.$itemsPerPage;
		feed.$links.$previous = {
			$url: url + _queryString(parameters),
			$type: "application/json; vnd-sage=syracuse"
		};
	}
	var lastCount = feed.$totalResults % feed.$itemsPerPage;
	if (lastCount === 0) lastCount = feed.$itemsPerPage;
	parameters.startIndex = Math.max(1, 1 + feed.$totalResults - lastCount);
	parameters.count = lastCount;
	if ((feed.$totalResults > feed.$itemsPerPage) && (feed.$startIndex < parameters.startIndex)) feed.$links.$last = {
		$url: url + _queryString(parameters),
		$type: "application/json; vnd-sage=syracuse"
	};
	if (context.entity) {
		feed.$template = {
			$url: url + "/$template"
		};
	}
	//
	return feed;
}

function _formatFeed(_, context, url, results) {
	var feed;
	if (context.entity && context.entity.$keyPager) feed = _formatKeyPagerFeed(context, url, results);
	else feed = _formatDefaultFeed(context, url, results);
	if (context.entity) {
		feed.$template = {
			$url: url + "/$template"
		};
	}
	// prototype
	if (context.representation) {
		feed.$prototype = "{$baseUrl}/$prototypes('" + context.representation.entity + "." + context.representation.type + "')";
		var pars = [];
		if (context.parameters.rawInclude) pars.push("include=" + encodeURIComponent(context.parameters.rawInclude));
		if (context.parameters.rawSelect) pars.push("select=" + encodeURIComponent(context.parameters.rawSelect));
		if (pars.length) feed.$prototype += "?" + pars.join("&");
	}
	// user rights: hide create if cannot create
	var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp) {
		exports.tracer && exports.tracer("sdataContext._formatFeed found security profile: " + sp.code(_));
		if (context.entity && !sp.canCreateClass(_, context.entity.name)) {
			// hide the link here, not in prototype as the prototype should be cached and application of rights might prevent it
			feed.$links = feed.$links || {};
			feed.$links.$create = feed.$links.$create || {};
			feed.$links.$create.$isHidden = true;
		}
	}
	var order = [];
	context.parameters.orderBy.forEach(function(orderBy) {
		order.push(orderBy.binding + " " + (orderBy.descending ? "desc" : "asc"));
	});
	// excel
	if (context.entity && context.entity.isCapableOf("excel")) {
		feed.$links.$excel = {
			$url: feed.$url,
			$title: locale.format(module, "excel"),
			$type: httpHelpers.mediaTypes.excel_worksheet
		};
	}

	// Excel-report
	if (context.entity && context.entity.isCapableOf("excelReport")) {
		feed.$links.$excelreport = {
			$url: feed.$url + "&excelReportMode={excelReportMode}&doc_uuid={document}&xlsx=application/syracuse-excel-worksheet",
			$title: locale.format(module, "excelReport"),
			$type: httpHelpers.mediaTypes.excel_worksheet
		};
	}

	// Mailmerge
	if (context.entity && context.entity.isCapableOf("mailMerge")) {
		feed.$links.$wordmailmerge = {
			$url: feed.$url + "&createMode={creationMode}&doc_uuid={document}&docx=mailmerge",
			$title: locale.format(module, "mailMerge"),
			$type: httpHelpers.mediaTypes.word_mailmerge
		};
	}

	// Word-report
	if (context.entity && context.entity.isCapableOf("wordReport")) {
		feed.$links.$wordreport = {
			$url: feed.$url + "&reportMode={reportMode}&doc_uuid={document}&docx=application/syracuse-word-report",
			$title: locale.format(module, "wordReport"),
			$type: httpHelpers.mediaTypes.word_report
		};
	}

	// Factory metadata
	if (context.entity && context.entity.$allowFactory && (!sp || !sp.hasFactoryRights(_))) {
		feed.$properties = feed.$properties || {};
		feed.$properties.$resources = feed.$properties.$resources || {};
		feed.$properties.$resources.$item = feed.$properties.$resources.$item || {};
		feed.$properties.$resources.$item.$properties = feed.$properties.$resources.$item.$properties || {};
		feed.$properties.$resources.$item.$properties.$factory = {
			$isHidden: true
		};
		// always display factory owner
		//		feed.$properties.$resources.$item.$properties.$factoryOwner = {
		//			$isHidden: true
		//		};
	}
	//
	return feed;
}

exports.Context = class Context {
	constructor(request, response, options) {
		options = options || {};
		this.request = request;
		this.response = response;
		// URL stuff
		var _split = request.url.split('?');
		this.path = _split.splice(0, 1)[0];
		this.secure = (config.hosting && config.hosting.https) || ('authorized' in request.connection);
		var _urlBegin = (this.secure ? "https" : "http") + "://" + (request.headers['x-forwarded-host'] || request.headers.host);
		this.url = _urlBegin + this.path;
		this.rawQuery = _split.join('?');
		this.query = helpers.url.parseQueryString(this.rawQuery);
		this.method = (this.query.$method || request.headers[options.methodHeader || "x-http-method-override"] || request.method).toLowerCase();
		// shouldn't change the method case, X3 doesn't like it 
		if ((request.method && request.method.toLowerCase()) !== this.method) request.method = this.method;
		delete this.query.$method;
		if (httpHelpers.tracer) {
			httpHelpers.tracer("\nHTTP REQUEST: " + request.method + " " + request.url + "\n");
			httpHelpers.tracer("headers: " + JSON.stringify(request.headers) + "\n");
		}
		var _segments = this.path.split('/').map(function(seg) {
			return decodeURIComponent(seg);
		});
		var _segI = 1; // start after leading /
		this.walkUrl = function() {
			return _segments[_segI++];
		};
		this.unwalkUrl = function() {
			_segI--;
		};
		this.walked = function() {
			return _urlBegin + _segments.slice(0, _segI).join("/");
		};
		this.toWalk = function() {
			return _segments.slice(_segI).join("/");
		};

		// Accept stuff
		this.rawAccept = this.query.format || request.headers.accept || "*";
		this.accept = httpHelpers.parseAccept(this.rawAccept);

		this.reply = function(code, message, headers) {
			headers = headers || {};
			if (message && !headers["content-type"]) headers["content-type"] = "text/plain";
			response.writeHead(code, headers);
			response.end(message);
		};

		this.scratch = {}; // scratch area where business logic can write stuff
		exports.tracer = exports.tracer || (options && options.tracer);
		var self = this;
		self.parameters = _parseParameters(self.query);

		self.segments = self.path.split('/').map(function(seg) {
			return decodeURIComponent(seg);
		});
		self.where = [];
		self.representation = {};
		if (self.parameters && self.parameters.representation) {
			var parts = self.parameters.representation.split(".");
			self.representation = {
				application: self.application,
				contract: self.contract,
				dataset: self.dataset,
				entity: parts[0], // representation, not entity
				type: parts[1], // facet
				variant: parts[2]
			};
		} else if (/^\/api\//.test(request.url)) {
			self.representation = {
				application: self.application,
				contract: self.contract,
				dataset: self.dataset,
				entity: self.entityName,
				type: self.instanceId || request.method === "POST" ? "$details" : "$query",
			};
		}
		// obsolette
		//else self.representation = _splitRepresentation(self.accept[0].parameters["vnd.sage.syracuse.representation"]);
		self.validationErrors = [];
		self.httpSession = request.session;

		// override write of response to save the content in the session for network breakdown only post and put and delete in order to don't process again the same request if we reiceve twice the request
		if (self.parameters && self.parameters.retryId) {
			var saveWriteHead = response.writeHead;
			response.writeHead = function(statusCode, headers) {
				self.httpSession.lastResp = self.httpSession.lastResp || {};
				self.httpSession.lastResp.request = {
					url: request.url,
					method: request.method
				};
				self.httpSession.lastResp.statusCode = statusCode;
				self.httpSession.lastResp.headers = headers;

				return saveWriteHead.call(response, statusCode, headers);
			};
			var saveWrite = response.write;
			response.write = function(_, buf, encoding) {
				self.httpSession.lastResp = self.httpSession.lastResp || {};

				self.httpSession.lastResp.buffer = buf;
				self.httpSession.lastResp.encoding = encoding;

				return saveWrite.call(response, _, buf, encoding);
			};
		}
		self.reply = exports.Context.prototype.reply; // fix later
		globals.context.sdataContext = self;
	}
	checkAlreadyProcessRequest() {

		return this.httpSession && this.httpSession.lastResp && this.httpSession.lastResp.request && this.httpSession.lastResp.request.url === this.request.url && this.httpSession.lastResp.request.method === this.request.method;
	}
	writeLastResponse(_) {

		// request already treated we send the response already compute
		this.response.writeHead(this.httpSession.lastResp.statusCode, this.httpSession.lastResp.headers);
		this.response.write(_, this.httpSession.lastResp.buffer, this.httpSession.lastResp.encoding);
		this.response.end();
	}
	getLink(singular, plural, facetName, title, params) {
		if (!singular) singular = "{$representation}";
		var link = {
			$type: "application/json;vnd.sage=syracuse"
		};
		if (title) link.$title = title;
		switch (facetName) {
			case "$details":
				link.$url = "{$baseUrl}/" + plural + "('{$key}')?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
				break;
			case "$lookup":
			case "$select":
			case "$query":
				link.$url = "{$baseUrl}/" + plural + "?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
				break;
			case "$edit":
				link.$url = "{$baseUrl}/" + plural + "('{$key}')/$workingCopies?representation=" + singular + "." + facetName + "&role={$role}" + (params ? "&" + params : "");
				link.$method = "POST";
				break;
			case "$create":
				// $create facet is in fact an $edit facet
				link.$url = "{$baseUrl}/" + plural + "/$template/$workingCopies?representation=" + singular + ".$edit&role={$role}" + (params ? "&" + params : "");
				link.$method = "POST";
				break;
		}
		return link;
	}
	getEntity(_) {
		if (this.entity) return this.entity;
		// load from representation
		if (this.contract && this.contract.representations && this.representation.entity) {
			var repr = this.contract.representations[this.representation.entity];
			return repr ? this.model.getEntity(_, repr.$entityName) : this.model.getEntity(_, this.representation.entity);
		}
		return null;
	}
	addComplementFilter(_, params) {
		function processFilter(_, instance, filterNode, filterPart) {
			flows.eachKey(_, filterPart, function(_, key, value) {
				exports.tracer && exports.tracer("sdataContext.processFilter parts: " + key + "=" + sys.inspect(value));
				// TODO : extend / standardize parser
				if (Array.isArray(value)) {
					filterNode[key] = value.map_(_, function(_, item) {
						var filterItem = {};
						processFilter(_, instance, filterItem, item);
						return filterItem;
					});
				} else {
					if (value == null) {
						filterNode[key] = null;
					} else if (typeof value === "object") {
						filterNode[key] = {};
						processFilter(_, instance, filterNode[key], value);
					} else if (typeof value === "string") {
						var template = new resourceProxy.Template(value);
						if (template.matches && template.matches.length >= 1) {
							exports.tracer && exports.tracer("sdataContext.processFilter template: " + key + "=" + sys.inspect(template.matches));
							// supported for now : {prop|relation} | {$parent}.{prop|relation}
							var propName = template.matches.pop();
							propName = propName.substring(1, propName.length - 1);
							//
							/*									for(var i = template.matches.length - 1; i >= 0; i--)
										if((template.matches[i] === "{$parent}") && instance) {
											instance = instance._parent;
										}
									*/
							template.matches.forEach_(_, function(_, match) {
								if (!instance) return;
								var rel = match.substring(1, match.length - 1);
								if (rel === "$parent") instance = instance._parent;
								else {
									if (instance._meta.$relations[rel] && !instance._meta.$relations[rel].isPlural) {
										exports.tracer && exports.tracer("sdataContext.processFilter walking to: " + rel);
										instance = instance[rel](_);
									}
								}
							});
							//
							if (instance) {
								var prop = instance._meta.$properties[propName];
								if (prop) filterNode[key] = instance[propName](_);
								else {
									var rel = instance._meta.$relations[propName];
									if (rel) {
										if (rel.isPlural) filterNode[key] = instance[propName](_).toUuidArray(_);
										else if (instance[propName](_)) filterNode[key] = instance[propName](_).$uuid;
									}
								}
							}
						} else filterNode[key] = value;
					} else filterNode[key] = value;
				}
			});
		}

		function _step(_, instance, relName) {
			var bindings = /([^\/(]*)\('([^']*)'\)\/(.*)/.exec(relName);
			exports.tracer && exports.tracer("sdataContext.addComplementFilter bindings: " + sys.inspect(bindings));
			//
			if (!instance) return;
			exports.tracer && exports.tracer("sdataContext.addComplementFilter found instance: " + instance.$uuid);
			if (bindings && bindings.length) {
				exports.tracer && exports.tracer("sdataContext.addComplementFilter stepping child: " + bindings[1] + "('" + bindings[2] + "')/" + bindings[3]);
				if (instance._meta.$relations[bindings[1]] && instance._meta.$relations[bindings[1]].isPlural) instance = instance[bindings[1]](_).get(_, bindings[2]);
				else instance = instance[bindings[1]](_);
				relName = bindings[3];
				return _step(_, instance, bindings[3]);
			} else {
				exports.tracer && exports.tracer("sdataContext.addComplementFilter fetching relation: " + relName);
				return {
					instance: instance,
					relName: relName
				};
			}
		}
		// add relation filter if necessary
		exports.tracer && exports.tracer("sdataContext.addComplementFilter enter");
		var self = this;
		if ((params.trackingId || params.parent) && params.binding) {
			var parentInst = params.trackingId ? this.httpSession[params.trackingId] : (function(_) {
				var det = httpHelpers.decodeDetailSegment(params.parent);
				if (!det) return null;
				return self.db.fetchInstance(_, self.db.getEntity(_, det.name), det.id);
			})(_);
			// binding is "relation" || "childRelation('childId')/relation"
			var res = _step(_, parentInst, params.binding) || {};
			var instance = res.instance;
			var relName = res.relName;
			//
			if (!instance) return;
			var rel = instance._meta.$relations[relName];
			if (!rel) return;
			var v_rel = params.variant && rel.$variants[params.variant];
			exports.tracer && exports.tracer("sdataContext.addComplementFilter found rel: " + rel.name);
			var filter = params.jsonWhere = params.jsonWhere || {};
			// TODO : different filters must properly concatenate
			var lf = (v_rel && v_rel.$lookupFilter) || rel.$lookupFilter;
			if (lf) {
				if (typeof lf !== "function") processFilter(_, instance, filter, lf);
				else processFilter(_, instance, filter, lf(_, instance));
			}
			//
			if (rel.isPlural) {
				var uuidColl = instance[rel.name](_).toUuidArray(_, true);
				exports.tracer && exports.tracer("sdataContext.addComplementFilter found collection: " + sys.inspect(uuidColl));
				if (uuidColl.length) filter.$uuid = {
					"$nin": uuidColl
				};
			}
			//
			exports.tracer && exports.tracer("sdataContext.addComplementFilter filter: " + sys.inspect(filter, null, 4));
		}
	}
	reply(_, statusCode, result, headers) {
		var self = this;
		headers = headers || {};

		if (self.response.__isEnded) return;

		// temp security patch for SKY: replace specific message by generic one
		if (statusCode >= 400 && typeof result === "string" && config.hosting.multiTenant) {
			var genericMessage = httpHelpers.statusMessages[statusCode] || ("Error " + statusCode);
			if (result !== genericMessage) console.error("SData status " + statusCode + ": " + result);
			result = genericMessage;
		}
		if (statusCode == 201) {
			headers.location = headers.location || (result && result.$url);
			if (!headers.location) return self.reply(_, 500, "Server erorr: $url missing in 201 response");
			if (self.batchResult) self.batchResult.$httpLocation = headers.location;
		}
		if (!result) {
			httpHelpers.tracer && httpHelpers.tracer("HTTP RESPONSE: " + statusCode + " " + JSON.stringify(headers));
			if (self.batchResult) {
				self.batchResult.$httpStatus = statusCode;
				self.batchResult.$httpMessage = http.STATUS_CODES[statusCode];
				return;
			}
			this.response.writeHead(statusCode, headers);
			return this.response.end();
		}
		var encoding = "utf8";
		switch (this.accept[0].type) {
			case "json":
			case "*":
				if (typeof result == "string") {
					result = {
						$diagnoses: [{
							$severity: statusCode >= 400 ? "error" : "info",
							$message: result
						}]
					};
				}
				// '{' test to avoid problem with pattern in prototype.
				var type = headers["content-type"] || (result.$type && result.$type[0] != '{' && result.$type);
				if (type && type.indexOf("application/json") < 0) {
					return self.reply(_, 406, "expected JSON, got " + result.$type);
				}
				type = type || "application/json";
				if (type.search(/;charset=/i) < 0) type += ";charset=UTF-8";
				headers["content-type"] = type;
				if (!self.batchResult) result = JSON.stringify(result);
				break;

			case "xml":
				return self.reply(_, 406, "expected XML, got " + result.$type);

			case "html":
				headers["content-type"] = "text/html";
				result = _toHtml(self, result);
				break;

			case "text":
				headers["content-type"] = "text/plain";
				result = typeof result == "object" ? JSON.stringify(result, null, 2) : result.toString();
				break;

			case "pdf":
				var proto = self.getPrototypeResource(_, self.parameters.representation, true);
				result = require('../../src/sdata/render/pdf').render(_, self, result, proto);
				headers["content-type"] = httpHelpers.mediaTypes.pdf;
				encoding = "binary";
				break;

				/*		case "xlsx":
			// excel will be pulling the data from server.
			// So it is a waste to generate data (and even more proto).
			// Review and improve later.
			//var proto = self.getPrototypeResource(_, self.parameters.representation, true);
			headers["content-type"] = httpHelpers.mediaTypes.xlsx;
			headers["cache-control"] = "no-cache,must-revalidate";
			self.response.writeHead(statusCode, headers);
			var xlsxUrl = self.url + "?representation=" + self.parameters.representation;
			require('msoffice/lib/excel/xlsx').render(_, self.response, xlsxUrl, self.request.url);
			self.response.end();
			return; // response has been written

		case "docx":
			var proto = self.getPrototypeResource(_, self.parameters.representation, true);
			require('msoffice/lib/word/docx').render(_, self, result, proto, headers, statusCode);
			self.response.end();
			return;
			 */
			case "pptx":
				var proto = self.getPrototypeResource(_, self.parameters.representation, true);
				require('msoffice/lib/ppt/pptx').render(_, self, result, proto, headers, statusCode);
				self.response.end();
				return;

			default:
				if (!headers["content-type"]) {
					headers["content-type"] = "text/plain";
				}
				break;
		}
		if (!self.batchResult) {
			// use binary encoding for downloads
			if (typeof result === "object") {
				if (Buffer.isBuffer(result)) {
					encoding = "binary";
					result = result.toString(encoding);
				} else {
					encoding = "utf8";
					result = JSON.stringify(result);
				}
			}

			//
			//	headers["cache-control"] = "no-cache,must-revalidate";
			//
			headers["content-length"] = Buffer.byteLength(result, encoding);
		}
		httpHelpers.tracer && httpHelpers.tracer("HTTP RESPONSE: " + statusCode + " " + JSON.stringify(headers));
		httpHelpers.tracer && httpHelpers.tracer("BODY: " + result);
		if (self.batchResult) {
			if (result) {
				if (typeof result === "object") {
					helpers.object.copy(result, self.batchResult);
				} else {
					self.batchResult.$httpMessage = result;

				}
			}
			self.batchResult.$httpStatus = statusCode;
			return;
		}

		if (statusCode === 304) delete headers["content-length"];
		this.response.writeHead(statusCode, headers);
		if (this.response.managePaging) {
			this.response.managePaging.parameters = this.parameters;
			this.response.managePaging.location = this.location;
		}

		this.response.end(result, encoding);
	}
	setUser(user) {
		var self = this;
		self.request.session.setData("user", user);
		self.request.session.setData("userID", user.$key);
		self.request.session.setData("userLogin", user._data.login);
	}
	getUser(_) {
		var self = this;
		var userId = self.request.session.getData("userID");
		if (userId) {
			if (self._user && self._user.$uuid == userId) return self._user;
			var db = adminUtil.getCollaborationOrm(_);
			if (db) {
				self._user = db.fetchInstance(_, db.model.getEntity(_, "user"), this.request.session.getData("userID"));
				return self._user;
			}
		} else return null;
	}
	setUserProfile(_, userProfile) {
		this.httpSession.setUserProfile(_, userProfile);
	}
	getUserProfile(_) {
		return this.httpSession.getUserProfile(_);
	}
	updateUserProfile(_) {
		// !!!! this method updates user profile, be carrefull not to call it from an GET request
		var self = this;
		// avoid loops
		if (self.entity && (self.entity.name === "userProfile")) return;
		// user profile update
		var userProfile = self.getUserProfile(_);
		if (self.parameters && self.parameters.role && userProfile && /*temp!!!!*/ (self.parameters.role != "{$role}")) {
			// !!!! role, endpoint are not on the same model as context
			var modified = false;
			if (userProfile.selectedRole(_) && (userProfile.selectedRole(_).$uuid !== self.parameters.role)) {
				userProfile.selectedRole(_, userProfile._db.fetchInstance(_, userProfile._db.model.getEntity(_, "role"), self.parameters.role));
				modified = true;
			}
			/*			if (userProfile.selectedEndpoint(_) && !userProfile.selectedEndpoint(_).isSame(_, self.application && self.application.name, self.contract && self.contract.name, self.dataset)) {
				// TODO load new endpoint
				modified = true;
			}
			*/
			//
			modified && userProfile.save(_);
		}
	}
	getSelectedRoleId(_) {
		if (this.parameters.role && (this.parameters.role != "{$role}")) return this.parameters.role;
		var userProfile = this.getUserProfile(_);
		exports.tracer && exports.tracer("sdataContext.getUserProfileId - param: " + this.parameters["role"] + "; userProfile :" + sys.inspect(userProfile));
		return userProfile && userProfile.selectedRole(_) && userProfile.selectedRole(_).$uuid;
	}
	replyUser(_) {
		function notFound(_, ctxt) {
			ctxt.reply(_, 403, "you should create a session");
		}
		var userId = this.request.session.getData("userID");
		if (userId) {
			this.instanceId = userId;
			factory.replyInstance(_, this, notFound);
		} else notFound(_, this);
	}
	setMeta(forceChildren) {
		var self = this;
		self.meta = self.entity.getMeta(self.parameters, forceChildren);
	}
	getPrototypeResource(_, prototypeId, addSectionInfo, applicationName, contractName, datasetName) {
		// BRJOU added next 3 lines for PDF generation -- review
		applicationName = applicationName || (this.application && this.application.name);
		contractName = contractName || (this.contract && this.contract.name);
		datasetName = datasetName || this.dataset;
		//

		function _getEntityPrototype(_, entity, isChild, childPrefix) {
			// representation fields
			var url = self.baseUrl.split("/");
			url = url[0] + "//" + url[2] + "/" + url[3] + "/";
			url += (applicationName ? [applicationName, contractName, datasetName].join("/") : [url[4], url[5], url[6]].join("/"));
			// restrict list of fields in query representations (adapted from factory.replyInstances)
			if (self.representation && self.representation.type === "$query") {
				params.select = params.select || self.getRepresentationSelect(self.contract, self.getRepresentation(self.contract, entity.name, self.representation.entity), self.representation.type);
			}
			var p = entity.getPrototype(_, representationName, representation.type, null, null, null, {
				include: params.include,
				select: params.select
			});
			p.$descriptor = "prototype " + prototypeId;
			p.$baseType = model.baseType;
			p.$baseUrl = url;
			p.$baseHelpUrl = url.replace("/sdata/", "/help/" + locale.current + "/");
			return p;
		}
		//
		var self = this;
		var params = self.parameters || {};
		// request parse
		var keys = prototypeId.split(",");
		var keys = keys[0].split(".");
		var representationName = keys[0];
		// if applicationName/contractName aren't provided, use same as contexts
		var contract;
		var model;
		if (applicationName) {
			contract = sdataRegistry.getContract(applicationName, contractName);
			if (!contract) return null;
			model = dataModel.make(contract, datasetName);
		} else {
			contract = this.contract;
			if (!contract) return null;
			model = this.model;
		}
		// extract from representation
		var rep = contract && contract.representations && contract.representations[representationName];
		var entityName = (rep && rep.$entityName) || representationName;
		//
		var representation = {
			application: applicationName,
			contract: contractName,
			entity: entityName,
			type: keys[1],
			// type is facet ...
			variant: keys[2]
		};
		//
		//		var stringRes = contract.resources && contract.resources();
		var mainEntity = model.getEntity(_, model.singularize(entityName) || entityName);
		if (!mainEntity) return null;
		//
		var res = _getEntityPrototype(_, mainEntity);
		// merge facets meta
		if (rep && rep.resources) res.$localization = rep.resources();

		// layout
		if (addSectionInfo) {
			var rep = (rep || contract.representations && contract.representations[mainEntity.name]);
			var repMeta = self.getRepresentationMeta(contract, rep, representation.type);
			if (repMeta) {
				var layout = repMeta.$layout && (repMeta.$layout.$copy ? ((self.getRepresentationMeta(contract, rep, repMeta.$layout.$copy) || {}).$layout) : repMeta.$layout);
				var gb = repMeta.$garbageFields && (repMeta.$garbageFields.$copy ? ((self.getRepresentationMeta(contract, rep, repMeta.$garbageFields.$copy) || {}).$garbageFields) : repMeta.$garbageFields);
				if (layout || gb) res.$article = {
					$layout: layout,
					$garbageFields: gb
				};
				// merge meta
				helpers.resource.applyDiff(res, repMeta.$prototype, true);
			}
		}
		//
		return res;
	}
	getRepresentationMeta(contract, representation, facetName) {
		var rep = representation;
		var facet = rep && rep.$facets && rep.$facets[facetName];
		return facet && (facet.$copy ? this.getRepresentationMeta(contract, representation, facet.$copy) : facet);
	}
	getRepresentationSelect(contract, representation, facetName) {
		var meta = this.getRepresentationMeta(contract, representation, facetName);

		var walk = function(meta) {
			var binds = [];
			return Object.keys(meta).reduce(function(r, p) {
				if (p === "$bind" && meta[p].substring(0, 1) !== "$") {
					r.push(meta[p]);
				} else if (typeof meta[p] === "object") {
					r = r.concat(walk(meta[p]));
				} else if (Array.isArray(meta[p])) {
					meta[p].forEach(function(e) {
						r = r.concat(walk(meta[p][e]));
					});
				}
				return r;
			}, []);
		};

		if (meta) {
			var binds = walk(meta);
			return binds.reduce(function(o, p) {
				o[p] = {};
				return o;
			}, {});
		}
	}
	getRepresentation(contract, entityName, representationName) {
		return contract.representations && (contract.representations[representationName] || contract.representations[entityName]);
	}
	getRepresentationFilter(contract, representation, facetName, filterName) {
		var meta = this.getRepresentationMeta(contract, representation, facetName);
		var filter = meta.$prototype && meta.$prototype.$filters && meta.$prototype.$filters[filterName];
		return filter && filter.$where;
	}
	replyProperty(_, instance, propertyName) {
		var self = this;
		//
		var meta = instance.getEntity(_);
		var prop = meta.$properties && meta.$properties[propertyName];
		if (!prop) return self.reply(_, 404);
		//
		if (prop.isExternalStorage()) {
			var store = instance[propertyName](_);
			if (!store.fileExists(_)) return self.reply(_, 404);
			var props = store.getProperties(_);
			var requ = globals.context.request;
			var agent = (requ && requ.headers["user-agent"]);
			var filenameValue = props.fileName;
			if (filenameValue && agent && agent.indexOf(" Chrome/") >= 0) // Chrome bug: does not accept comma in filename SAM 105846
			{
				filenameValue = filenameValue.replace(/,/g, "_");
			}
			var headers = {
				"cache-control": "no-cache,must-revalidate",
				//"expires": (new Date(0)).toUTCString(), // will be add in syracuse._js
				//"content-disposition": "attachment; filename=" + props.fileName
				"content-disposition": "filename=" + filenameValue,
				"content-type": props.contentType,
			};

			var isHtml = /html/.test(props.contentType);
			if (isHtml) headers["transfer-encoding"] = "chunked";
			else headers["content-length"] = props.length;

			self.response.writeHead(200, headers);
			var reader = store.createReadableStream(_);
			if (isHtml) {
				reader = reader.map(function(_, buf) {
					return buf.toString('binary');
				});
				if (!prop.$allowUnsafeHtml) reader = reader.transform(htmlTransforms.escaper());
			}
			var buf;
			while (buf = reader.read(_)) {
				self.response.write(_, buf, "binary");
			}
			self.response.write(_);
		} else {
			self.reply(_, 200, instance[propertyName](_));
		}
	}
	replyPrototype(_) {
		var self = this;
		var reqEtag = self.request && self.request.headers && self.request.headers["if-none-match"];
		var locEtag = depend.etag([locale.current]);
		if (!nocache && reqEtag && (reqEtag === locEtag)) return self.reply(_, 304, {});
		var proto = this.getPrototypeResource(_, this.prototypeId, true);
		if (proto) this.reply(_, 200, proto, {
			etag: locEtag,
			//expires: (new Date()).toUTCString() // will be add in syracuse._js
		});
		else this.reply(_, 404, locale.format(module, "prototypeNotFound", this.prototypeId));
	}
	replyTemplate(_) {
		//create a working copy
		return this.replyPrototype(_);
	}
	getTemplate(_, entity, id) {
		// TODO
		//var self = this;
		//var dbHandle = self.getPrototype(_, entity, id);
		// for now -- will trigger additional rules later
		//return dbHandle;
	}
	validationError(path, message) {
		var self = this;
		self.validationErrors.push({
			path: path,
			message: message
		});
	}
	hasValidationErrors() {
		var self = this;
		return self.validationErrors.length > 0;
	}
	isAsync() {
		return this.parameters.trackngId != null;
	}
	executeOperation(_) {
		exports.tracer && exports.tracer("sdataContext method execute enter");
		var self = this;
		var operation = self.operation;
		exports.tracer && exports.tracer("sdataContext method execute operation: " + operation.name + "; method: " + operation.method + "; method got: " + self.method);
		if (helpers.string.compare((operation.method || "GET"), self.method, true) != 0) {
			console.log("operation " + operation.name + " expected " + operation.method + ", got " + self.method);
			throw self.badMethod("operation " + operation.name + " expected " + operation.method + ", got " + self.method);
		}
		var res = null;
		var statusCode = 200;
		var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
		sp && exports.tracer && exports.tracer("sdataContext.executeOperation found security profile: " + sp.code(_));
		if (sp && !sp.canReadClass(_, self.entity.name)) {
			return self.reply(_, httpHelpers.httpStatus.Forbidden, locale.format(module, "forbiddenExecute", operation.name, self.entity.name));
		}
		if (sp && !sp.canExecuteService(_, self.entity.name, operation.name)) {
			return self.reply(_, httpHelpers.httpStatus.Forbidden, locale.format(module, "forbiddenExecute", operation.name, self.entity.name));
		} else {
			if (operation.isMethod) {
				//				self.setMeta(false);
				//				var instance = self.db.fetchInstance(_, self.entity, self.instanceId);
				var instance = self.instance || factory.fetchInstance(_, self);
				exports.tracer && exports.tracer("sdataContext method execute found instance: " + ((instance && instance.$uuid) || "none"));
				if (!instance) return self.reply(_, httpHelpers.httpStatus.NotFound, locale.format(module, "notFound"));
				if (!instance.validateSelf(_)) return self.replyResource(_, httpHelpers.httpStatus.PreconditionFailed, instance.serializeInstance(_));
				res = operation.execute(_, self, instance, self.parameters);
				if (!res && !operation.$overridesReply) res = (self.initialInstance || instance).serializeInstance(_);
				statusCode = (res && res.$diagnoses || []).some(function(d) {
					return d.severity === "error";
				}) ? 500 : 200;
			} else res = operation.execute(_, self, null, self.parameters);
			if (!operation.$overridesReply) self.reply(_, (res && res.statusCode) || statusCode, (res && res.body) ? res.body : res, res && res.headers);
		}
	}
	executeDatasetOperation(_) {
		throw this.niy("dataset operation");
	}
	getSerializeOptions() {
		var self = this;
		return {
			model: self.model,
			baseUrl: self.baseUrl,
			representation: self.representation,
			isPrototype: self.isPrototype,
			isTemplate: self.isTemplate,
			getPluralDbHandles: function(_, dbHandle, relation) {
				if (self.isPrototype || self.isTemplate) return null;
				else {
					var query = dbHandle[relation.name];
					relation.defaultOrder.forEach(function(order) {
						query = query.order(order[0], order[1]);
					});
				}
				// crnit : instance management
				if (!query || Array.isArray(query)) return query;
				else return query.list(self.transaction, _);
			}
		};
	}
	exception(statusCode, message) {
		// security: replace specific message by generic one.
		var ex = new Error(httpHelpers.statusMessages[statusCode] || ("Error " + statusCode));
		ex.$httpStatus = statusCode;
		return ex;
	}
	notFound(message) {
		var self = this;
		return self.exception(404, "Not found: " + message);
	}
	niy(message) {
		var self = this;
		return self.exception(501, "Not implemented: " + message);
	}
	badMethod(message) {
		var self = this;
		return self.exception(405, "Method not allowed: " + (message || self.method));
	}
	badRequest(message) {
		var self = this;
		return self.exception(400, "Bad request: " + message);
	}
	forbidden(message) {
		var self = this;
		return self.exception(403, "Forbidden: " + message);
	}
	serverError(message) {
		var self = this;
		return self.exception(500, "Server error: " + message);
	}
	replyResource(_, statusCode, resource, etag) {
		var self = this;
		if (!resource) throw self.serverError("trying to reply null resource!");
		var headers = etag ? {
			etag: etag,
			//			expires: (new Date()).toUTCString() // IE9 needs this header in order to manage ETag; is added in syracuse._js, not here
		} : null;
		return self.reply(_, statusCode, resource, headers);
	}
	replyResources(_, statusCode, resources) {
		var self = this;
		return self.reply(_, 200, _formatFeed(_, self, self.url, resources));
	}
	replySearchResults(_, statusCode, result) {
		var self = this;
		var feed = _formatFeed(_, self, self.url, result.$resources);
		feed.query = result.query;
		if (result.$searchFacets) feed.$searchFacets = result.$searchFacets;
		return self.reply(_, 200, feed);
	}
	replyDeleted(_) {
		var self = this;
		var loc = self.getLink("", "{$pluralType}", "$query", locale.format(module, "backToList"));
		return self.reply(_, 200, locale.format(module, "resourceDeleted"), {
			location: loc.$url
		});
	}
	replyDictionaryPage(_, dict, title, mapping) {
		var self = this;
		var baseUrl = self.walked();
		mapping = mapping || function(name) {
			return {
				$url: self.url + "/" + name,
				$key: name,
				$descriptor: title + " " + name,
				name: name
			};
		};

		var entries = helpers.object.toArray(dict, function(key, val) {
			return mapping(key, val);
		});
		entries.sort(function(e1, e2) {
			return helpers.string.compare(e1.name, e2.name, true);
		});
		var parameters = self.parameters;
		self.totalCount = entries.length;
		entries = entries.slice(parameters.startIndex - 1, parameters.startIndex - 1 + parameters.count);
		return self.reply(_, 200, _formatFeed(_, self, baseUrl, entries));
	}
	sortInstancesArray(_, resources, parameters, defaultOrder) {
		var orderBy = (parameters && parameters.orderBy);
		if (resources.length < 2 || (!orderBy || !orderBy.length) && (!defaultOrder || !defaultOrder.length)) return resources;
		if ((!orderBy || !orderBy.length) && defaultOrder) orderBy = defaultOrder.map(function(order) {
			return {
				binding: order[0],
				descending: !order[1]
			};
		});
		// sorting preparation (inspired by Schwartzian transform): prepare values and make temporary array: accumulate the sort attributes to a temporary array
		// this makes the sorting faster, finally strip the sort attributes and return the sorted array
		var sortFunctions = [];
		var sortOrder = [];
		sortOrder.length = sortFunctions.length = orderBy.length + 1;
		var sortValues = resources.map(function(resource) {
			var t = [resource];
			t.length = sortOrder.length;
			return t;
		});

		var props = resources[0]._meta.$properties;
		var i = sortOrder.length;
		while (--i > 0) {
			var prop = orderBy[orderBy.length - i].binding;
			sortFunctions[i] = props[prop] && props[prop].$computeSortValue;
			sortOrder[i] = orderBy[orderBy.length - i].descending ? -1 : 1;
			var j = resources.length;
			while (--j >= 0) {
				sortValues[j][i] = resources[j][prop](_);
			}
		}
		//		console.log("order by: "+sys.inspect(orderBy));
		return sortValues.sort(function(a, b) {
			function _getValueToSortReference(obj) {
				if (obj && typeof obj === "object" && obj._meta && obj._meta.$valueTemplate) {
					var attkey = obj._meta.$valueTemplate.expression;
					attkey = attkey.substring(1, attkey.length - 1);
					return obj._data[attkey];
				}
				return obj;
			}

			for (var i = orderBy.length; i > 0; i--) { // all values are indexed because of Schwartzian transform
				var fkt = sortFunctions[i];

				if (fkt) {
					var diff = fkt(a[i], b[i]);
					if (diff) return diff * sortOrder[i];
				} else {
					var a1 = a[i] ? _getValueToSortReference(a[i]) : "";
					var b1 = b[i] ? _getValueToSortReference(b[i]) : "";
					if (a1 !== b1) return (a1 > b1) ? sortOrder[i] : -sortOrder[i];

				}
			}
			return 0;
		}).map(function(element) {
			return element[0];
		});
	}
	filterInstancesArray(_, instances, parameters) {
		var params = parameters || this.parameters.where;
		//
		return instances.filter_(_, function(_, instance) {
			return instance.match(_, params);
		});
	}
};