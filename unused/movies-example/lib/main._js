"use strict";

var fspath = require('path');
var ez = require('ez-streams');
var helpers = require('syracuse-core').helpers;
var locale = require('streamline-locale');
var fs = require('streamline-fs');
var fspath = require('path');
var parseUrl = require('url').parse;

var ROOT = fspath.join(__dirname, '../..');

var staticDispatcher = require('streamline-static').dispatcher({
	root: ROOT,
	maxAge: 3600 * 1000
});

var requireDispatcher = require('streamline-require/lib/server/require').dispatcher({
	getResources: locale.getResourcesHook,
	whiteList: [
	    		/^.*$/
	    	],
});

function notFound(_, request, response) {
	response.writeHead(404, {});
	return response.end("Resource not found");
}

function jsonReply(_, response, status, headers, data) {
	headers = headers || {};
	headers['content-type'] = 'application/json';
	response.writeHead(status, headers);
	response.end(typeof data === 'string' ? data : JSON.stringify(data));
}

function redirect(_, status, response, url) {
	response.writeHead(status, {
		location: url,
	});
	response.end();
}

var ME = {
	user: {
		firstName: "John",
		lastName: "Doe",
	},
	$links: {
		$bookmarks: {}
	}
};

var actionReplies = {};

var actionRoutes = {
	'user-profile': function(_, request, response) {
		jsonReply(_, response, 200, null, ME);
	},
}

function actionDispatcher(_, request, response) {
	var action = request.parsedUrl.segments[2];
	var route = actionRoutes[action] || notFound;
	return route(_, request, response)
}

var PAGES = {
	empty: {
		$title: "EMPTY PAGE",
		$properties: {},
	},
	home: {
		$title: "Welcome",
		$properties: {},
		$links: {
			movies: {
				$title: "Movies",
				$url: "/data/movies?representation=movies.$query"
			},
			people: {
				$title: "People",
				$url: "/data/persons?representation=persons.$query"
			},
		}
	}
}

function clone(obj, basic) {
	if (!obj || typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) return obj.map(clone);
	return Object.keys(obj).reduce(function(o, k) {
		 // don't send extra properties marked with $$
		if (/^\$\$/.test(k)) return o;
		// if basic, don't send properties marked with $$basic: false
		if (basic && obj[k] && obj[k].$$basic === false) return o;
		o[k] = clone(obj[k]);
		return o;
	}, {});
}

var protoBuilders = {
	$page: function(_, name) {
		return PAGES[name];
	},
	$query: function(_, name) {
		var entity = clone(require('../entities/' + name));
		var proto = {
			$title: entity.$title,
			$properties: {
				$resources: {
					$type: 'application/x-array',
					$item: entity,
				}
			},
			$links: {
				$create: {
					$title: "Create",
					$method: "POST",
					$url: "/data/" + name + "/$workingCopies?representation=" + name + ".$edit",
				},
			},
		};
		return proto;
	},
	$details: function(_, name) {
		var entity = clone(require('../entities/' + name));
		entity.$links = entity.$links || {};
		entity.$links.$query = {
			$title: "List",
			$url: "/data/" + name + "?representation=" + name + ".$query",
		};
		entity.$links.$edit = {
			$title: "Edit",
			$method: "POST",
			$url: "/data/" + name + "/$workingCopies/{$uuid}?representation=" + name + ".$edit",
		};
		return entity;
	},
	$edit: function(_, name) {
		var entity = clone(require('../entities/' + name));
		entity.$actions = entity.$actions || {};
		entity.$actions.$save = {
			$title: "Save",
			$isRequested: false,
		};
		return entity;
	},
	$thumb: function(_, name) {
		var entity = clone(require('../entities/' + name), true);
		return entity;
	},
	$lookup: function(_, name) {
		var entity = clone(require('../entities/' + name), true);
		var proto = {
			$title: entity.$title,
			$properties: {
				$resources: {
					$type: 'application/x-array',
					$item: entity,
				}
			},
			$links: {},
		};
		return proto;
	},
}

function pageDispatcher(_, request, response) {
	var parsed = request.parsedUrl;
	if (!parsed.query.url) return notFound(_, request, response);
	parsed = parseUrl(parsed.query.url, true);
	if (!(parsed.query && parsed.query.representation)) return jsonReply(_, response, 200, null, {
		$prototype: PAGES.empty
	});
	var pair = parsed.query.representation.split('.');
	var builder = protoBuilders[pair[1]];
	if (!builder) throw notFound(_, request, response);
	return jsonReply(_, response, 200, null, {
		$prototype: builder(_, pair[0])
	});
}

function loadResource(_, entity, path, name) {
	var res = JSON.parse(fs.readFile(path, 'utf8', _));
	var proto = require('../entities/' + entity);
	var docroot = fspath.join(ROOT, 'movies-example', 'documents');
	Object.keys(proto.$properties).forEach_(_, function(_, k) {
		var prop = proto.$properties[k];
		if (prop.$type === "application/x-reference" && res[k] && res[k].$uuid) {
			// fetch reference properties
			var targetPath = fspath.join(ROOT, 'movies-example', 'data', prop.$item.$$targetEntity);
			var ref = JSON.parse(fs.readFile(targetPath + '/' + res[k].$uuid + ".json", _));
			Object.keys(prop.$item.$properties).forEach(function(kk) {
				res[k][kk] = ref[kk];
			});
		} else if (prop.$type === "application/x-document" && fs.exists(fspath.join(docroot, k + '-' + res.$uuid + '.meta'), _)) {
			res[k] = {
				$url: "/documents/" + k + '-' + res.$uuid,
			}
		}
	});
	return res;
}

var workingCopies = {};

var workingCopyActions = {
	$save: function(_, entity, wc, result) {
		var saveUrl = wc.$url;
		// $url is working copy's URL. Reset it before saving.
		wc.$url = undefined;
		try {
			fs.writeFile(ROOT + "/movies-example/data/" + entity + "/" + wc.$uuid + ".json", JSON.stringify(wc, null, '\t'), 'utf8', _);
		} finally {
			wc.$url = saveUrl;
		}
		result.$diagnoses = result.$diagnoses || [];
		result.$diagnoses.push({
			$severity: "info",
			$message: "resource has been saved",
			$links: {
				$details: {
					$title: "details",
					$url: "/data/" + entity + "/" + wc.$uuid + "?representation=" + entity + ".$details",
				}
			}
		});
	},
};

function updateWorkingCopy(_, entity, wc, data) {
	Object.keys(data).forEach(function(key) {
		if (key !== "$actions" && key !== "$url") {
			wc[key] = data[key];
		}
	});
	var result = {};
	if (data.$actions) Object.keys(data.$actions).forEach_(_, function(_, key) {
		var action = data.$actions[key];
		if (!workingCopyActions[key]) throw new Error("bad action: " + key);
		workingCopyActions[key](_, entity, wc, result);
	});
	return result;
}

function workingCopyDispatcher(_, request, response, entity, path) {
	var uuid = request.parsedUrl.segments[4];
	var wc;
	switch (request.method) {
	case 'POST':
		// create a new working copy
		if (uuid) {
			// editing an existing resource
			wc = loadResource(_, entity, path + '/' + uuid + '.json', uuid + '.json');
		} else {
			// creating a new resource
			uuid = helpers.uuid.generate();
			wc = {
				$uuid: uuid,
			};
		}
		// set $url, which will be used for following reuests
		wc.$url = "/data/" + entity + "/$workingCopies/" + uuid + "?representation=" + entity + ".$edit";
		// track working copy in global hash table
		workingCopies[uuid] = wc;
		return jsonReply(_, response, 201, {
			location: wc.$url,
		}, wc);
	case 'GET':
		wc = workingCopies[uuid];
		if (!wc) return notFound(_, request, response);
		return jsonReply(_, response, 200, null, wc);
	case 'PUT':
		var posted = request.readAll(_, 'utf8');
		wc = workingCopies[uuid];
		if (!wc) return notFound(_, request, response);
		var data = JSON.parse(posted);
		var result = updateWorkingCopy(_, entity, wc, data);
		return jsonReply(_, response, 200, null, result);
	case 'DELETE':
		if (!workingCopies[uuid]) return notFound(_, request, response);
		delete workingCopies[uuid];
		return jsonReply(_, response, 200, null, {});
	default:
		throw new Error("bad method: " + request.method);
	}
}

function dataDispatcher(_, request, response) {
	var segments = request.parsedUrl.segments;
	var entity = segments[2];
	var key = segments[3];
	if (!entity) return notFound(_, request, response);
	var path = fspath.join(ROOT, 'movies-example', 'data', entity);
	try {
		if (key === '$workingCopies') {
			workingCopyDispatcher(_, request, response, entity, path);
		} else if (key) {
			var res = loadResource(_, entity, path + '/' + key + '.json', key + '.json');
			jsonReply(_, response, 200, null, res);
		} else {
			var resources = ez.devices.file.list(path, false).map(function(_, entry) {
				return loadResource(_, entity, entry.path, entry.name);
			}).toArray(_);
			jsonReply(_, response, 200, null, {
				$resources: resources,
			});
		}
	} catch (ex) {
		if (ex.errno === 'ENOENT') return notFound(_, request, response);
		else throw ex;
	}
}

function upload(_, request, response) {
	var filename = fspath.join(ROOT, 'movies-example', 'documents', request.parsedUrl.segments[2]);
	var headers = {
		'content-type': request.headers['content-type'],
		'content-length': request.headers['content-length'],
		'x-file-name': request.headers['x-file-name'],
	};
	fs.writeFile(filename + '.meta', JSON.stringify(headers), 'utf8', _);
	var writer = ez.devices.file.binary.writer(filename);
	request.pipe(_, writer);
	response.writeHead(200, {});
	response.end();
}

function download(_, request, response) {
	var filename = fspath.join(ROOT, 'movies-example', 'documents', request.parsedUrl.segments[2]);
	var headers = fs.readFile(filename + '.meta', 'utf8', _);
	var reader = ez.devices.file.binary.reader(filename);
	response.writeHead(200, headers);
	reader.pipe(_, response);
}

function documentsDispatcher(_, request, response) {
	switch (request.method) {
		case "GET": return download(_, request, response);
		case "PUT": return upload(_, request, response);
		default: throw new Error("bad method: " + request.method);
	}
}

var routes = {
	require: requireDispatcher,
	"movies-example": staticDispatcher,
	"streamline-require": staticDispatcher,
	"syracuse-ui": staticDispatcher,
	"documents": documentsDispatcher,

	page: pageDispatcher,
	data: dataDispatcher,
	action: actionDispatcher,
}

process.on('uncaughtException', function(err) {
	console.error(err.stack);
});

ez.devices.http.server(function(request, response, _) {
	if (request.url === '/') {
		return redirect(_, 307, response, '/movies-example/html/main.html?url=' + encodeURIComponent("/home?representation=home.$page"));
	}
	request.parsedUrl = parseUrl(request.url, true);
	request.parsedUrl.segments = request.parsedUrl.pathname.split('/');

	var route = routes[request.parsedUrl.segments[1]] || notFound;

	route(_, request, response);
}, {}).listen(_, 8124);