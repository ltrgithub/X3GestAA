"use strict";

var locale = require('streamline-locale');
var ez = require('ez-streams');
var fs = require('streamline-fs');
var fsp = require("path");
var https = require("https");
var config = require('config');
var certtools = require('../../../src/load/certTools');

exports.entity = {
	$titleTemplate: "Collaboration friend server",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_friend-servers",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true,
			$linksToDetails: true
		},
		endpointUrl: {
			$title: "Collaboration endpoint url",
			$isMandatory: true
		}
	},
	$relations: {
		certificate: {
			$title: "Client certificate",
			$type: "certificate",
			$inv: "friendServers",
		}
	},
	$functions: {
		createWritableStream: function(_, options) {
			var service = options.service;
			// open a session with trusted server and returns a http writable stream
			var cert = this.certificate(_);
			if (config.x3key && !cert) throw new Error("No certificate");
			if (cert) {
				var opt = {
					url: this.endpointUrl(_) + "/" + service,
					method: options.method || "POST"
				};
				return cert.streamHttpRequest(_, opt);
			} else {
				var certPath = options.certificatesPath;
				var certName = options.certificateName;
				var opt = {
					agent: false,
					key: fs.readFileSync(fsp.join(certPath, certName + ".key")),
					cert: fs.readFileSync(fsp.join(certPath, certName + ".crt")),
					// use our server ca, should be the same
					ca: fs.readFileSync(fsp.join(__dirname, "../../../syracuse-main/lib/ssl", "ca.crt")),
					//
					url: this.endpointUrl(_) + "/" + service,
					method: options.method || "POST"
				};
			}
			return ez.devices.http.client(opt);
		}
	},
	$services: {
		/*	// just for testing friend server without data
  		$createPatch: {
			$method: "POST",
			$isMethod: true,
			$title: "Test",
			$execute: function(_, context, instance) {
				var stream = instance.createWritableStream(_, {service: "license/test", method: "GET"})
				var resp = stream.end().response(_);
				var respData = resp.readAll(_);
				console.log("Answer "+respData);
				instance.$addDiagnose("success", respData);
			}
		},
	*/
	},
	$events: {
		$canSave: [

			function(_, instance) {
				// there must be at least one active connection
				var certificate = instance.certificate(_);
				if (certificate && certificate.server(_)) {
					instance.$addError(locale.format(module, "clientNotServer"));
				}
				if (certificate && certificate.internal(_)) {
					instance.$addError(locale.format(module, "noInternal"));
				}
				return;
			}
		]
	}
};