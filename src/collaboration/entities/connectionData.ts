"use strict";
var locale = require('streamline-locale');
var config = require('config');
var mock = require('../../../src/load/mock');
var util = require('util');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var clusterData;

exports.entity = {
	$canDelete: false,
	$canCreate: false,
	$properties: {
		port: {
			$title: "Port",
			$type: "integer",
			$isMandatory: true,
			$default: 8124
		},
		active: {
			$title: "active",
			$type: "boolean",
			$default: true
		},
		ssl: {
			$title: "SSL",
			$type: "boolean",
			$default: false
		},
		clientAuth: {
			$title: "Client authentication",
			$type: "boolean",
			$default: false,
			$isDisabled: function(_, instance) {
				return !instance.ssl(_);
			}
		}
	},
	$titleTemplate: "Connection information",
	$valueTemplate: "{port}",
	$relations: {
		serverCert: {
			$title: "Server certificate",
			$type: "certificate",
			$isMandatory: function(_, instance) {
				return instance.ssl(_);
			},
			$isDisabled: function(_, instance) {
				return !instance.ssl(_);
			}
		},
		clientCert: {
			$title: "Client certificate",
			$type: "certificate",
			$isDisabled: function(_, instance) {
				return !instance.clientAuth(_) || !instance.ssl(_);
			}
		},
		host: {
			$title: "Host",
			$type: "host",
			$isComputed: true,
			$isHidden: true
		}
	},
	$events: {
		$canSave: [

			function(_, instance) {
				var serverCert = instance.ssl(_) && instance.serverCert(_);
				var clientCert = instance.clientAuth(_) && instance.clientCert(_);
				if (serverCert) {
					// server certificate instance must have private key
					if (!serverCert.keyExists(_)) {
						instance.$addError(locale.format(module, "noKeyServer"));
					}
					var server = serverCert.server(_);
					// when server certificate is only installed on one server, it must be the correct server
					if (server) {
						var host = instance.host(_);
						if (host && (server.hostname(_).toUpperCase() !== host.hostname(_).toUpperCase())) {
							instance.$addError(locale.format(module, "wrongServer", instance.port(_), server.hostname(_)));
						}

					}
				}
				// client certificate must be installed on all servers
				if (clientCert && clientCert.server(_)) {
					instance.$addError(locale.format(module, "clientNotServer"));
				}
			}
		]
	}
};