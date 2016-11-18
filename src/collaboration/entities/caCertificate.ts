"use strict";
var locale = require('streamline-locale');
var util = require('util');
var cert = require('./certificate');
var certTools = require('syracuse-load/lib/certTools');
var config = require('config');
var globals = require('streamline-runtime').globals;

exports.entity = {
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true,
			$isUnique: true,
			$isReadOnly: function(_, instance) {
				return !instance.$created;
			},
			$linksToDetails: true,
			$pattern: "^[a-z][-a-z0-9_.]*$"
		},
		description: {
			$title: "Description",
			$isReadOnly: function(_, instance) {
				return instance.internal(_);
			}
		},
		internal: {
			$title: "internal",
			$isReadOnly: true,
			$type: "boolean"
		},
		// this is an input field only. The the output is the function getPEMCertificate
		certificate: {
			$title: "CA Certificate",
			$type: "binary",
			$storage: "db_file",
			$isMandatory: function(_, instance) {
				return instance.$created;
			}
		},
		subject: {
			$title: "Distinguished name JSON",
			$type: "json",
			$isHidden: true
		},
		subjectDn: {
			$title: "Distinguished name",
			$compute: function(_, instance) {
				return cert.getDn(instance.subject(_));
			}
		},
		issuer: {
			$title: "Issuer name JSON",
			$type: "json",
			$isHidden: true
		},
		issuerDn: {
			$title: "Issuer distinguished name",
			$isReadOnly: true,
			$compute: function(_, instance) {
				return cert.getDn(instance.issuer(_));
			}
		},
		notBefore: {
			$title: "Valid from",
			$isReadOnly: true,
			$type: "datetime"
		},
		notAfter: {
			$title: "Valid until",
			$isReadOnly: true,
			$type: "datetime"
		},
		certificateHash: {
			$title: "Hash of certificate",
			$isReadOnly: true,
			$isHidden: true
		}
	},
	$relations: {
		ldaps: {
			$title: "LDAP servers",
			$type: "ldaps",
			$inv: "cacerts"
		},
		notificationServers: {
			$title: "notification servers",
			$type: "notificationServers",
			$inv: "cacerts"
		},
		restWebService: {
			$title: "CA certificates for Rest web service",
			$type: "restWebServices",
			$inv: "cacerts",
			$isComputed: true
		}


	},
	$titleTemplate: "Certificates of Certification Authorities",
	$valueTemplate: "{name}",
	$helpPage: "Administration-reference_CA-Certificates",
	$events: {
		$beforeSave: [

			function(_, instance) {
				cert.fillInstance(instance, true, _);
			}
		],
		$afterSave: [

			function(_, instance) { // update nanny processes unless special marker property has been set
				if (config.mockServer) {
					var options = {
						path: "/nannyCommand/notifyNannies/update",
						method: "PUT",
						hostname: "",
						port: 0
					};
					try {
						console.log(config.mockServer.mockClient.simpleRequest(options, null, _));
					} catch (e) {
						console.log("Error " + e);
					}
				}
			}
		]
	},
	$actions: {
		$save: function(_, instance) {
			var r = {};
			if (!config.hosting.multiTenant && config.mockServer && instance.$snapshot && !instance.$created) {
				r.$confirm = locale.format(module, "maybeRestart");
			}
			return r;
		}
	},
	$searchIndex: {
		$fields: ["name"]
	},
	$functions: {
		$onDelete: function(_) {
			// delete contents in file system
			cert.deleteData(this, true, _);
		},
		/// function getPEMCertificate
		/// retrieves the complete certificate text in PEM format as a string.
		/// Only returns locally available certificates (not server certificates of other servers)
		getPEMCertificate: function(_) {
			return certTools.getPEMCertificate(_, (this.internal(_) ? "" : this.name(_)), true, globals.context.tenantId);
		}
	},
	$defaultOrder: [
		["name", true]
	],
	$services: {}
};