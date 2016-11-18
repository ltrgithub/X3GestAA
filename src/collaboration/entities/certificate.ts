"use strict";
var locale = require('streamline-locale');
var datetime = require('@sage/syracuse-core').types.datetime;
var util = require('util');
var config = require('config');
var Certificate = require("jsx509").Certificate;
var integrity = require("jsx509").integrity;
var mock = require('../../../src/load-balancer/mock');
var certTools = require('../../../src/load-balancer/certTools');
var crypto = require('crypto');
var os = require('os');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var globals = require('streamline-runtime').globals;

/// !doc
var tracer; // = console.log;
// write the changes to the certificate directory - either via the nannies or directly using parseRequestCert

function _doChange(ca, server, data, _) {
	if (!config.collaboration.certdir) throw new Error(locale.format(module, "noCertdir"));
	if (config.mockServer) {
		var options = {
			path: "/nannyCommand/updateCertificate",
			method: "POST",
			headers: {}
		};
		options.headers[mock.BALANCER_HEADER] = server ? server.hostname(_) : "*"; // notify all servers
		try {
			var result = config.mockServer.mockClient.simpleRequest(options, JSON.stringify(data), _);
		} catch (e) {
			if (e instanceof Error) throw e;
			else throw new Error(e);
		}
	} else {
		// write directly into certificate directory
		if (server) {
			var targetHost = server.hostname(_);
			if (targetHost && targetHost !== os.hostname()) throw new Error(locale.format(module, "wrongHost", targetHost));
		}
		certTools.parseRequestCert(_, data, null, null, config.collaboration.certdir + "/" + os.hostname().toLowerCase() + "/", null);
	}

}

function deleteData(instance, ca, _) {
	if (!instance.__syracuse_allow_delete__ && instance.internal(_)) {
		throw new Error(locale.format(module, "deleteInternal"));
		return;
	}
	console.log("DEL");
	var name = instance.name(_);
	var data = [{
		name: name,
		tenantId: globals.context.tenantId,
		ca: ca,
		del: true
	}];
	var server;
	if (!ca) {
		// is certificate referenced somewhere (only interesting for normal certificates because relationship to inner entity connectionData is not automatically checked)?
		var localName = instance.name(_);
		var db = adminHelper.getCollaborationOrm(_);
		var hosts = db.fetchInstances(_, db.model.getEntity(_, "host"), {});
		hosts.forEach_(_, function(_, host) {
			var connectionData = host.connectionData(_).toArray(_);
			connectionData.forEach_(_, function(_, conn) {
				var serverCert = conn.serverCert(_);
				var clientCert = conn.clientCert(_);
				if (serverCert && serverCert.name(_) === localName || clientCert && clientCert.name(_) === localName) {
					throw new Error(locale.format(module, "usedCert", host.hostname(_), conn.port(_)));
				}
			});

		});

		server = instance.server(_);
	}
	if (!instance.__syracuse_allow_delete__) _doChange(ca, server, data, _);
}

// fillInstance reads PEM certificate information and fills in the distinguished name of issuer and subject to the instance
// ca: do not treat key and passphrase (for CA Certificates)

function fillInstance(instance, ca, _) {
	var pemCertificate;
	var pemKey;
	var passphrase;
	var cert = instance.certificate(_);
	if (cert.fileExists(_)) {
		pemCertificate = cert.createReadableStream(_).read(_, -1).toString("utf8");
		var hash = crypto.createHash('md5');
		hash.update(pemCertificate, "utf8");
		instance.certificateHash(_, hash.digest('hex'));
	} else {
		if (!instance.internal(_) && !instance.certificateHash(_)) throw new locale.format(module, "noCert");
	}
	var keyTest; // check existence of private key file?
	var cas; // CA certificates to check
	if (!ca) {
		var key = instance.key(_);
		if (key.fileExists(_)) {
			pemKey = key.createReadableStream(_).read(_, -1).toString("utf8");
			instance.keyExists(_, true);
			keyTest = true;
		} else {
			keyTest = instance.keyExists(_);
		}
		passphrase = instance.pass(_);
		var caCerts = instance.caCertificates(_).toArray(_);
		if (caCerts.length) {
			cas = [];
			caCerts.forEach_(_, function(_, cacert) {
				if (!cacert.$isDeleted) cas.push(cacert.name(_));
			});
		}
		if (!pemKey && !pemCertificate && passphrase) {
			// directly set passphrase locally
			instance.pass(_, "");
			if (certTools.setPassphrase(_, instance.name(_), passphrase)) {
				// passphrase sucessfully set: reload certificates
				if (config.mockServer) {
					var options = {
						path: "/nannyCommand/reloadCertificates",
						method: "PUT",
						headers: {}
					};
					try {
						var result = config.mockServer.mockClient.simpleRequest(options, null, _);
					} catch (e) {
						if (e instanceof Error) throw e;
						else throw new Error(e);
					}
				}
				instance.$addDiagnose("info", locale.format(module, "successfullySet"));

			} else {
				instance.$addDiagnose("warning", locale.format(module, "alreadySet"));
			}
			return;
		}
	}
	// Do not check CA certificates because they may not be there		
	var result = integrity(pemCertificate, pemKey, passphrase);
	if (result.error) {
		throw new Error(result.error);
	}
	var certificate = result.cert;
	if (certificate) {
		instance.subject(_, certificate.subject);
		instance.issuer(_, certificate.issuer);
		instance.notBefore(_, datetime.fromMillis(certificate.notBefore));
		instance.notAfter(_, datetime.fromMillis(certificate.notAfter));
	}
	if (pemCertificate) {
		cert.deleteFile(_);
	}
	var server;
	var data = {
		name: instance.name(_),
		tenantId: globals.context.tenantId,
		ca: ca,
		cert: pemCertificate,
		key: pemKey,
		keyTest: keyTest,
		cas: cas,
		id: instance.$uuid
	};
	tracer && tracer("DATA " + util.format(data));
	if (!ca) {
		server = instance.server(_);
		data.pass = instance.pass(_);
		tracer && tracer("Certificate for server " + server);
	}
	// transmit data only when either certificate or key is available
	if (data.cert || data.key || data.cas) _doChange(ca, server, [data], _);
	if (!ca) {
		if (pemKey) key.deleteFile(_);
		instance.pass(_, "");
	}
}

// make a string out of the DN information

function getDn(info) {
	var array = [];

	function escapeDn(attr, content) {
		if (!content) return;
		if (/[\\<>,+";=\#]/.test(content)) {
			content = '"' + content.replace(/(["\\])/g, '\\$1') + '"';
		}
		content = content.replace(/[\x00-\x1f]/g, function(c) {
			var code = c.charCodeAt(0);
			return "\\" + (code < 16 ? "0" : "") + code.toString(16);
		});
		array.push(attr + "=" + content);
	}
	if (!info) return "";
	escapeDn("C", info.countryName);
	escapeDn("ST", info.stateOrProvinceName);
	escapeDn("L", info.localityName);
	escapeDn("O", info.organizationName);
	if (info.organizationalUnitNames) {
		info.organizationalUnitNames.forEach(function(ou) {
			escapeDn("OU", ou);
		});
	}
	escapeDn("CN", info.commonName);
	return array.join(", ");
}

exports.getDn = getDn;
exports.fillInstance = fillInstance;
exports.deleteData = deleteData;

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
		certificate: {
			$title: "Certificate",
			$type: "binary",
			$storage: "db_file",
			$isReadOnly: function(_, instance) {
				return instance.internal(_);
			},
			$isMandatory: function(_, instance) {
				return instance.$created;
			}
		},
		keyExists: {
			$title: "Private key exists",
			$type: "boolean",
			$isReadOnly: true
		},
		key: {
			$title: "Private key",
			$type: "binary",
			$storage: "db_file",
			$isReadOnly: function(_, instance) {
				return instance.internal(_);
			}
		},
		pass: {
			$title: "Passphrase",
			$type: "password",
			$capabilities: "confirm",
			$isReadOnly: function(_, instance) {
				var server = instance.server(_);
				if (!server) return false;
				var hostname = server.hostname(_);
				if (!hostname || hostname.toLowerCase() === os.hostname().toLowerCase()) return false;
				return true;
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
				return getDn(instance.subject(_));
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
				return getDn(instance.issuer(_));
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
	$titleTemplate: "Certificates",
	$valueTemplate: "{name}",
	$helpPage: "Administration-reference_Certificates",
	$events: {
		$beforeSave: [

			function(_, instance) {
				fillInstance(instance, false, _);
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
						console.log(mock.simpleRequest(config.mockServer.mockClient, options, null, _));
					} catch (e) {
						console.log("Error " + e);
					}
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["name"]
	},
	$functions: {
		$onDelete: function(_) {
			// delete contents in file system
			deleteData(this, false, _);
		},
		/// -------------
		/// ## sign function 
		/// 
		/// ``` javascript
		/// var signature = instance.sign(_, algorithm, data, options);
		/// ```
		/// 
		/// Sign data with private key from the certificate entity
		/// 
		/// * The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
		/// * The `data` parameter represents data to sign (string or buffer)
		/// * The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
		///   (binary as a default or utf8) when data is a string), `output_encoding` (represents the encoding wanted for signature)
		/// 
		/// Example: the invocation
		/// `digest(_, 'bla', 'RSA-SHA1', 'a', {input_encoding: 'utf8'})`
		/// gives the same result as the standard output of the command
		/// `openssl dgst -sha1 -passin pass:pwd -sign bla.key input.txt` 
		/// where `bla.key` is assumed to be the encrypted private key file with passphrase 'pwd', which is stored in the instance 'bla' of the certificate entity.
		/// 
		sign: function(_, algorithm, data, options) {
			return certTools.sign(_, (this.internal(_) ? "" : this.name(_)), algorithm, data, options, globals.context.tenantId);
		},
		/// -------------
		/// ## verify function 
		/// 
		/// ``` javascript
		/// var verify = instance.verify(_, algorithm, data, signature, data_encoding, signature_encoding)
		/// ```
		/// 
		/// Verifies data with public certificate from the certificate entity
		/// 
		/// * The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
		/// * The `data` parameter represents data to verify (string or buffer).
		/// * The `signature` parameter contains the previously generated signature
		/// * The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
		///   (binary as a default or utf8) when data is a string), `signature_encoding` (represents the encoding used for signature)
		/// 
		/// Result is `true` when the check is successful, `false` otherwise.
		/// 
		verify: function(_, algorithm, data, signature, options) {
			try {
				return certTools.verify(_, (this.internal(_) ? "" : this.name(_)), algorithm, data, signature, options, globals.context.tenantId);
			} catch (e) {
				console.error("Error during verify " + e);
				return false;
			}
		},
		/// -------------
		/// ## streamHttpRequest function 
		/// 
		/// ``` javascript
		/// var str = instance.streamHttpRequest(_, options)
		/// ```
		/// 
		/// Creates an https request with the data from this certificate
		/// 
		/// * The `options` parameter contains the non-SSL parts such as `method`, `url`
		/// 
		/// Returns an HttpClientRequest obtained from streamline
		/// 
		streamHttpRequest: function(_, options) {
			var caCerts = this.caCertificates(_).toArray(_, true);
			var cas = caCerts.map_(_, function(_, caCert) {
				return caCert.name(_);
			});
			return certTools.streamHttpRequest(_, (this.internal(_) ? "" : this.name(_)), options, cas, globals.context.tenantId);
		},
		/// ------------------
		/// ## getPEMCertificate
		/// ``` javascript
		/// var certificate = instance.getPEMCertificate(_)
		/// ```
		/// retrieves the complete certificate text in PEM format as a string.
		/// Only returns locally available certificates (not server certificates of other servers)
		getPEMCertificate: function(_) {
			return certTools.getPEMCertificate(_, (this.internal(_) ? "" : this.name(_)), false, globals.context.tenantId);
		}
	},
	$defaultOrder: [
		["name", true]
	],
	$services: {},
	$relations: {
		caCertificates: {
			$title: "CA Certificates",
			$type: "caCertificates",
			$inv: "certificate",
			$isReadOnly: function(_, instance) {
				return instance.internal(_);
			}
		},
		server: {
			$title: "Server",
			$type: "host",
			$inv: "ownCertificates",
			$isReadOnly: function(_, instance) {
				return instance.internal(_) || !instance.$created;
			}
		}
	},
	$actions: {
		$save: function(_, instance) {
			var r = {};
			if (!config.hosting.multiTenant && config.mockServer && instance.$snapshot && !instance.$created) r.$confirm = locale.format(module, "maybeRestart");
			return r;
		}
	}
};