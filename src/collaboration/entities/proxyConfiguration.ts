"use strict";

var locale = require('streamline-locale');
var http = require('http');
var httpClient = require('../../..//src/http-client/httpClient');
var proxyAuthenticator = require('../../..//src/http-client/proxyAuthenticator');
var os = require("os");

var defaultExcludes = [os.hostname(), "localhost"];
var interfaces = os.networkInterfaces();
for (var i in interfaces) {
	for (var j in interfaces[i]) {
		if (interfaces[i][j].family === "IPv4")
			defaultExcludes.push(interfaces[i][j].address);
	}
}

exports.entity = {
	$titleTemplate: "Proxy server configuration",
	$descriptionTemplate: "Configure proxy for HTTP clients",
	$valueTemplate: "{name}",
	$helpPage: "Administration-reference_proxy-configuration",
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true,
			$linksToDetails: true,
			$isUnique: true
		},
		host: {
			$title: "Host",
			$isMandatory: true,
		},
		port: {
			$title: "Port",
			$isMandatory: true,
		},
		auth: {
			$title: "Authentication",
			$enum: [{
					$value: "none",
					$title: "None"
				}, {
					$value: "basic",
					$title: "Basic"
				},
				//				{
				//					$value: "digest",
				//					$title: "Digest"
				//				},
				{
					$value: "ntlm",
					$title: "NTLM"
				}
			],
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
			$encrypt: true,
			$salt: "",
			$capabilities: "confirm",
			$isHidden: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth === "none";
			},
			$isMandatory: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth !== "none";
			}
		},
		domain: {
			$title: "Domain",
			$isHidden: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth !== "ntlm";
			},
			$isMandatory: function(_, instance) {
				var auth = instance.auth(_) || "";
				return auth === "ntlm";
			}
		}
	},
	$relations: {
		excludes: {
			$title: "Excludes",
			$type: "proxyConfigurationExcludes",
			$inv: "proxyConfiguration",
			isChild: true
		}
	},
	$functions: {
		toJSON: function(_) {
			var conf = {
				host: this.host(_),
				port: this.port(_)
			};
			var ex = this.excludes(_).toArray(_);
			conf.excludes = [
				os.hostname().toLowerCase(),
				"localhost",
				"127.0.0.1"
			];
			for (var i in ex) {
				conf.excludes.push(ex[i].host(_));
			}
			var auth = this.auth(_);
			if (auth !== "none") {
				conf.auth = auth;
				conf.user = this.user(_);
				conf.password = this.password(_);
				// TODO: Digest authentications
				if (auth === "ntlm") {
					conf.domain = this.domain(_);
					conf.proxyAuthenticator = proxyAuthenticator;
				}
			}

			return conf;
		},
	},
	$services: {
		test: {
			$method: "post",
			$title: "Test connection",
			$isMethod: true,
			$parameters: {
				$properties: {
					"url0": {
						$title: "URL",
						$description: "Address which should be reached via this proxy",
						$type: "application/x-string",
						$value: "",
						$isMandatory: true
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				if (!parameters) {
					parameters = context.parameters;
				}
				if (!parameters.url0) {
					instance.$addError(locale.format(module, "noUrl"));
					return;
				}
				instance.$diagnoses = instance.$diagnoses || [];
				try {
					var proxy = instance.toJSON(_);
					proxy.force = true;
					var opt = {
						method: "GET",
						url: parameters.url0,
						proxy: proxy,
					};
					var request = httpClient.httpRequest(_, opt);
					var response = request.end().response(_);
					var statusCode = response.statusCode;

					var data = response.readAll(_);
					if (statusCode < 400) {
						instance.$diagnoses.push({
							$severity: "success",
							$message: locale.format(module, "OK")
						});
					} else if (statusCode === 407) {
						instance.$diagnoses.push({
							$severity: "error",
							$message: locale.format(module, "proxyAuthFailed", data)
						});
					} else {
						instance.$diagnoses.push({
							$severity: "warning",
							$message: locale.format(module, "proxyAuthOK", statusCode, http.STATUS_CODES[statusCode], data)
						});
					}

				} catch (e) {
					if (e.code === 'ECONNREFUSED') {
						instance.$diagnoses.push({
							$severity: "error",
							$message: locale.format(module, "cannotConnect")
						});
					} else
						instance.$diagnoses.push({
							$severity: "error",
							$message: locale.format(module, "connProblem", e.message),
							$stackTrace: e.safeStack
						});
				}
			}
		},
	}
};