"use strict";

var http = require('http');
var httpClient = require('../../../../../src/http-client/httpClient');
var config = require('config');

var tracer = config && config.rest && config.rest.client && config.rest.client.tracer != null ? config.rest.client.tracer : false;
var trace = function(str) {
	if (tracer === true) console.error(" " + str);
};
exports.entity = {
	$titleTemplate: "Outgoing REST Web Services configuration",
	$descriptionTemplate: "Configure REST client",
	$valueTemplate: "{name}",
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true,
			$linksToDetails: true,
			$isUnique: true,
			$pattern: "^[A-Za-z_\\-][A-Za-z_\\-0-9]*$"
		},
		url: {
			$title: "Base Url",
			$isMandatory: true,
		},
		contentType: {
			$title: "Content Type",
			$enum: [{
				$value: "xml",
				$title: "XML"
			}, {
				$value: "json",
				$title: "JSON"
			}],
			$default: "json"
		},
		auth: {
			$title: "Authentication",
			$enum: [{
				$value: "none",
				$title: "None"
			}, {
				$value: "basic",
				$title: "Basic"
			}],
			$default: "none"
		},
		user: {
			$title: "User",
			$isHidden: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth === "none";
			},
			$isMandatory: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth !== "none";
			}
		},
		password: {
			$title: "Password",
			$type: "password",
			$salt: "",
			$capabilities: "confirm",
			$isHidden: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth === "none";
			},
			$isMandatory: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth !== "none";
			},
			$encrypt: true
		}
	},
	$relations: {
		parameters: {
			$title: "Parameters",
			$type: "restParameters",
			$inv: "restWebService",
			isChild: true
		},
		headers: {
			$title: "Headers",
			$type: "restHeaders",
			$inv: "restWebService",
			isChild: true
		},
		cacerts: {
			$title: "CA certificates",
			$type: "caCertificates",
			$inv: "restWebService"
		}
	},
	$functions: {
		execRequest: function(_, method, subUrl, parameters, headers, data, options) {

			var oldTracer;
			if (options && options.debug) {
				oldTracer = tracer;
				tracer = true;
			}

			var self = this;
			parameters = parameters || {};
			headers = headers || {};

			trace("============ Web service call begins ================");
			trace("Name: " + this.name(_));
			trace("=====================================================");
			var url = subUrl != null ? this.url(_) + subUrl : this.url(_);
			var i;
			// general options
			var opt = options || {};
			opt.method = method;

			// authentication
			var auth = this.auth(_) || "";
			if (auth !== "none") {
				opt.user = this.user(_);
				opt.password = this.password(_);
			}
			// headers: specifics headers have priority on global headers
			opt.headers = opt.headers || {};
			var relHeaders = this.headers(_).toArray(_);
			if (Object.keys(this.headers(_)).length !== 0) {
				for (i = 0; i < relHeaders.length; i++) {
					opt.headers[relHeaders[i].key(_)] = relHeaders[i].value(_);
				}
			}
			for (i = 0; i < Object.keys(headers).length; i++) {
				opt.headers[Object.keys(headers)[i]] = headers[Object.keys(headers)[i]];
			}

			// parameters: specifics parameters have priority on global parameters
			var params = {};
			var relParams = this.parameters(_).toArray(_);
			if (relParams.length !== 0) {
				for (i = 0; i < relParams.length; i++) {
					params[relParams[i].key(_)] = relParams[i].value(_);
				}
			}
			for (i = 0; i < Object.keys(parameters).length; i++) {
				params[Object.keys(parameters)[i]] = parameters[Object.keys(parameters)[i]];
			}

			if (Object.keys(params).length !== 0) {
				if (url.indexOf('?') !== -1) {
					url += "&";
				} else {
					url += "?";
				}
				for (i = 0; i < Object.keys(params).length; i++) {
					if (i > 0) url += "&";
					url += Object.keys(params)[i] + "=" + params[Object.keys(params)[i]];
				}
			}

			if (data && (method === "POST" || method === "PUT")) {
				// to be compliant with pure JSON object
				if (typeof data === "object") data = JSON.stringify(data);
				opt.headers["content-length"] = data.length;
			} else {
				data = undefined;
			}

			// Set final url
			opt.url = url;
			// CA certificates
			if (self.url(_).indexOf("https") >= 0) {
				var cacerts = self.cacerts(_).toArray(_);
				if (cacerts.length) {
					opt.ca = cacerts.map_(_, function(_, cacert) {
						return cacert.getPEMCertificate(_);
					});
				};
			}
			trace("Options: " + JSON.stringify(opt, null, 2));
			trace("Data: " + JSON.stringify(data, null, 2));
			// Request
			var request = httpClient.httpRequest(_, opt);
			var response = request.end(data).response(_);


			var content = response.readAll(_);
			if (this.contentType(_) === "json") {
				try {
					content = JSON.parse(content);
				} catch (e) {
					// do nothing and reply with html content
				}
			}
			response.headers.statusCode = response.statusCode.toString();
			trace("=========== Web Service call result ============");
			trace("Headers    :" + JSON.stringify(response.headers, null, 2));
			trace("Body       : " + JSON.stringify(content, null, 2));
			trace("================================================");

			if (oldTracer) tracer = oldTracer;
			return {
				statusCode: response.statusCode,
				header: response.headers,
				body: content
			};
		},
	},
	$services: {
		get: {
			$method: "GET",
			$isMethod: true,
			$title: "Test GET",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				try {
					var res = instance.execRequest(_, "GET");
					if (res.statusCode === 200) {
						instance.$diagnoses.push({
							$severity: "info",
							$message: "OK"
						});
					} else {
						instance.$diagnoses.push({
							$severity: "error",
							$message: res.statusCode + ": " + http.STATUS_CODES[res.statusCode]
						});
					}

				} catch (e) {
					instance.$diagnoses.push({
						$severity: "error",
						$message: "" + e
					});
				}
			}
		},
	}
};