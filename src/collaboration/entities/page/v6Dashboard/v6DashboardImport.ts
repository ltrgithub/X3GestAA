"use strict";
/*
 * This entity could be usefull when we decide to set the dashboard migration service as asynchrone.
 * The implementation is not complete.
 * It remains to implement a class/representation in X3 for AMETUTI table to be able to retrieve
 * a list of trade codes.
 *
 * The interface could also be improved !
 */

var http = require('http');
var httpClient = require('../../../../..//src/http-client/httpClient');
var locale = require('streamline-locale');
var jsonImport = require('syracuse-import/lib/jsonImport');

var tracer; // = console.log;

var send = function(_, context, method, url, referer, data, diagnoses, step) {
	var options = {
		method: method,
		url: url,
		headers: {
			// referer is working ! or not !?
			//referer: referer || url,
			"accept": "application/json;vnd.sage=syracuse",
			"accept-language": locale.current || "en-US",
			"content-type": "application/json",
			cookie: context.httpSession.cookie
		}
	};
	tracer("method: " + method);
	tracer("Url: " + url);
	tracer("headers: " + JSON.stringify(options.headers, null, 2));
	tracer("Data: " + JSON.stringify(data, null, 2));
	var request = httpClient.httpRequest(_, options);
	var response = request.end(data ? JSON.stringify(data) : '').response(_);
	var statusCode = response.statusCode;

	var content = response.readAll(_);
	content = JSON.parse(content);

	tracer("Status code: " + statusCode);
	tracer("Response: " + JSON.stringify(content));
	tracer("==============================\n");
	if (statusCode !== 200) {
		var message = locale.format(module, "errorOccured", step, statusCode, http.STATUS_CODES[statusCode]);
		diagnoses.push({
			$severity: "error",
			$message: message
		});
		if (content && content.$diagnoses && content.$diagnoses.length !== 0) {
			for (var i in content.$diagnoses) {
				diagnoses.push(content.$diagnoses[i]);
			}
		}
		throw new Error(message);
	}
	return content;
};

var getJsonDescription = function(_, type, key, baseUrl, context, diagnoses) {
	var clob;
	try {
		// Generate trackingId
		var url = baseUrl + "/AMIGDASH('" + type + "~" + key + "')/$workingCopies?representation=AMIGDASH.$edit";
		// Create working copy
		tracer("********************");
		tracer("* Create working copy");
		tracer("********************");
		var body = send(_, context, "POST", url, null, null, diagnoses, locale.format(module, "createWorkingCopy"));
		var trackingId = body.$trackingId;
		// Call AIMPORT method
		url = baseUrl + "/$workingCopies('" + trackingId + "')?representation=AMIGDASH.$edit";
		tracer("********************");
		tracer("* Call AIMPORT method");
		tracer("********************");
		body = send(_, context, "PUT", url, null, {
			$trackingId: trackingId,
			$uuid: body.$uuid,
			$actions: {
				AIMPORT: {
					$isRequested: true,
					$parameters: {
						TYP: type,
						CLE: key
					}
				}
			},
			$etag: body.$etag
		}, diagnoses, locale.format(module, "callAIMPORT"));
		// Retrieve prototype
		var urlProto = baseUrl + "/$prototypes('AMIGDASH.$edit')";
		tracer("********************");
		tracer("* Retrieve $prototype for AMIGDASH $edit");
		tracer("********************");
		var proto = send(_, context, "GET", urlProto, null, null, diagnoses, locale.format(module, "retrieveProto"));
		// Get Clob Url in prototype
		var clobUrl = proto && proto.$properties && proto.$properties.CLOB && proto.$properties.CLOB.$url;
		clobUrl = clobUrl.replace("{$baseUrl}", baseUrl);
		clobUrl = clobUrl.replace("{$trackingId}", trackingId);

		// Retrieve Clob content
		tracer("********************");
		tracer("* Retrieve Clob content");
		tracer("********************");
		clob = send(_, context, "GET", clobUrl, null, null, diagnoses, locale.format(module, "retrieveClob"));

		// Abort working copy creation
		tracer("********************");
		tracer("* Abort working copy creation");
		tracer("********************");
		body = send(_, context, "PUT", url, null, {
			$trackingId: trackingId,
			$uuid: body.$uuid,
			$actions: {
				$abort: {
					$isRequested: true
				}
			},
			$etag: body.$etag
		}, diagnoses, locale.format(module, "abortWorkingCopy"));
	} catch (e) {
		console.error(e.stack);
		if (context && context.tracker) {
			context.tracker.phaseDetail = locale.format(module, "importErrorPhaseDetail");
		}
	}
	return clob;
};

exports.entity = {
	$descriptionTemplate: "X3 V6 Dashboard import profile",
	$valueTemplate: "",
	$properties: {
		title: {
			$title: "Title",
			$isUnique: true,
			$isLocalized: true,
			$linksToDetails: true,
			$isMandatory: true
		},
		dataset: {
			$title: "Dataset",
			$isExcluded: true
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$description: "Select the X3 endpoint to import from",
			$type: "endPoint",
			$lookupFilter: {
				protocol: "x3"
			},
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val) {
					instance.dataset(_, val.dataset(_));
				} else {
					instance.dataset(_, "null");
				}
				instance.users(_).reset(_);
				//instance.trades(_).reset(_);
			}
		},
		users: {
			$title: "Users",
			$type: "v6DashboardUserLogins",
			isChild: true,
			$isDisabled: function(_, instance) {
				return instance.endpoint(_) == null;
			}
		},
		//// This will not work until AMETUTI table will be provided by a new class/representation in X3
		//		trades: {
		//			$title: "Trade profiles",
		//			$type: "v6DashboardTradeCodes",
		//			isChild: true,
		//			$isDisabled: function(_, instance) {
		//				return instance.endpoint(_) == null;
		//			}
		//		},
	},
	$functions: {},
	$services: {
		import: {
			$title: "Import",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$execute: function(_, context, instance) {
				function importDashboard(_, type, key) {
					type = type === "user" ? locale.format(module, "user") : locale.format(module, "trade");
					tracer("###################################");
					tracer("# Import dashboard for type '" + type + "' with key '" + key + "'");
					tracer("###################################");

					if (!instance.endpoint(_)) return;
					var t = context && context.tracker;
					var d = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
					var options = {
						importMode: "update",
						$diagnoses: d,
						tracker: t,
						createSession: true
					};
					var baseUrl = context.baseUrl.split('/').slice(0, 3).join('/');
					baseUrl += instance.endpoint(_).getBaseUrl(_);
					var clob = getJsonDescription(_, type, key, baseUrl, context, d);
					tracer("Clob: " + JSON.stringify(clob, null, 2));
					if (clob) {
						jsonImport.jsonImportFromJson(_, key, clob, options);
					} else {
						if (context && context.tracker) {
							context.tracker.phaseDetail = locale.format(module, "importErrorPhaseDetail");
						}
						d.push({
							$severity: "error",
							$message: locale.format(module, "noClob", key)
						});
					}
				}
				//
				var users = instance.users(_).toArray(_);
				for (var i in users) {
					importDashboard(_, "user", users[i].user(_).login(_));
				}
				//
				var trades = instance.trades(_).toArray(_);
				for (var j in trades) {
					importDashboard(_, "trade", trades[j].trade(_).code(_));
				}


			}
		}
	}
};