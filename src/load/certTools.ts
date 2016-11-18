"use strict";
var locale = require('streamline-locale');
var fs = require('streamline-fs');
var os = require('os');
var util = require('util');
var jsx509 = require('jsx509');
try {
	var config = require('config');
} catch (e) {
	config = {};
}
var crypto = require('crypto');
var lcHostName = os.hostname().toLowerCase();
var ez = require('ez-streams');

/// !doc
/// 
/// # Certificate tools in connection with certificate entity
/// # for use with load balancer and Syracuse
///
/// ```javascript
/// var certTools = require('../../src/load/certTools')  
/// ```
/// 
var tracer; // = console.log;

/// -------------
/// ## sign function :
/// 
/// ``` javascript
/// var signature = certTools.sign(_, cert, algorithm, data, options);
/// ```
/// 
/// Sign data with private key from the certificate entity
/// 
/// * The `cert` parameter gives the name of the certificate in the certificate entity. When it is `null`,
///   the locally installed base certificate key will be taken. For use from the load balancer, also the corresponding object
///   can be given there.
/// * The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
/// * The `data` parameter represents data to sign (string or buffer)
/// * The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
///   (binary as a default or utf8) when data is a string), `output_encoding` (represents the encoding wanted for signature),
///   `certdir` (alternative certificate directory: for unit tests only)
/// * An optional `tenantId` which will be used as a prefix for file names
///
/// Example: the invocation
///   digest(_, 'bla', 'RSA-SHA1', 'a', {input_encoding: 'utf8'})
/// gives the same result as the standard output of the command
///  openssl dgst -sha1 -passin pass:pwd -sign bla.key input.txt
/// where bla.key is assumed to be the encrypted password file with passphrase 'pwd', which is stored in the instance 'bla' of the certificate entity.

function sign(_, cert, algorithm, data, options, tenantId) {
	var key;
	if (cert && cert.key) {
		key = cert.key;
	} else {
		// get contents of key file
		var directory = _getDirectory(options, tenantId);
		var passPhrases = readPassphrases(directory, _);
		if (!cert) {
			cert = lcHostName;
			// fundamental private keys for Syracuse servers must have a passphrase
			if (!passPhrases[cert]) throw new Error(locale.format(module, "noPassphrase", lcHostName));
		}
		var keyfile = fs.readFile(directory + cert + ".key", "utf8", _);
		key = jsx509.stripEncryption(keyfile, passPhrases[cert]);
	}
	var signRes = crypto.createSign(algorithm);
	signRes.update(data, options ? options.data_encoding : undefined);
	return signRes.sign(key, options ? options.output_encoding : undefined);

}
exports.sign = sign;

// get certificate directory within sign and verify

function _getDirectory(options, tenantId) {
	if (options && options.certdir) {
		return options.certdir + "/" + (tenantId ? tenantId + "/" : "");
	} else {
		if (!config.collaboration || !config.collaboration.certdir) {
			throw new Error(locale.format(module, "noCertDir"));
		}
		return config.collaboration.certdir + "/" + lcHostName + "/" + (tenantId ? tenantId + "/" : "");
	}
}

// checks passphrase of private key with given name for this tenant; when name is not set, the
// server certificate name is assumed.
// Return value: is passphrase OK?
exports.checkPassphrase = function(_, name, passphrase, tenantId) {
	var directory = _getDirectory(undefined, tenantId);
	try {
		var key = fs.readFile(directory + '/' + (name || lcHostName) + ".key", "utf8", _);
	} catch (e) {
		return false;
	}
	var check = jsx509.integrity(null, key, passphrase);
	return !check.error;
};

// sets the passphrase for an existing certificate (when passphrase file is broken)
// Parameters: name: name of certificate
// passphrase: passphrase to set
// Result: false: passphrase already available or wrong
//         true: passphrase sucessfully set
//  
exports.setPassphrase = function(_, name, passphrase, tenantId) {
	tracer && tracer("Set passphrase");

	var directory = _getDirectory(undefined, tenantId);
	var passphrases = {};
	try {
		passphrases = readPassphrases(directory, _);
	} catch (e) { // ignore read error
		tracer && tracer("Read passphrases " + e);
	}
	try {
		var key = fs.readFile(directory + '/' + name + ".key", "utf8", _);
	} catch (e) {
		return false;
	}
	if (passphrases[name]) {
		// check whether old passphrase is correct
		var check = jsx509.integrity(null, key, passphrase);
		tracer && tracer("Old passphrase incorrect? " + check.error);
		if (!check.error) return false;
	}
	var name = name || lcHostName;
	try {
		var cert = fs.readFile(directory + '/' + name + ".crt", "utf8", _);
	} catch (e) {
		return false;
	}
	var check = jsx509.integrity(cert, key, passphrase);
	if (!check.error) {
		tracer && tracer("Passphrase set");
		passphrases[name] = passphrase;
		writePassphrases(directory, passphrases, _);
		tracer && tracer("Passphrase written");
		return true;
	} else {
		tracer && tracer("Passphrase not OK " + check.error);
		return false;
	}
};

/// -------------
/// ## verify function :
/// 
/// ``` javascript
/// var verify = certTools.verify(_, cert, algorithm, data, signature, options, tenantId)
/// ```
/// 
/// Verifies data with public certificate from the certificate entity
/// 
/// * The `cert` parameter gives the name of the certificate in the certificate entity. When it is `null`,
///   the locally installed base certificate key will be taken. For use from the load balancer, also the corresponding object
///   can be given there.
/// * The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
/// * The `data` parameter represents data to verify (string or buffer).
/// * The `signature` parameter contains the previously generated signature
/// * The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
///   (binary as a default or utf8) when data is a string), `signature_encoding` (represents the encoding used for signature),
///   `certdir` (alternative certificate directory: for unit tests only)
/// * An optional `tenantId` which will be used as a prefix for file names
///
/// Result is `true` when the check is successful, `false` otherwise.

function verify(_, cert, algorithm, data, signature, options, tenantId) {
	var certificate;
	if (cert && cert.cert) {
		certificate = cert.cert;
	} else {
		// get contents of key file
		var directory = _getDirectory(options, tenantId);
		if (!cert) {
			cert = lcHostName;
		}
		certificate = fs.readFile(directory + cert + ".crt", "utf8", _);
	}
	var verifyRes = crypto.createVerify(algorithm);
	verifyRes.update(data, options ? options.data_encoding : undefined);
	return verifyRes.verify(certificate, signature, options ? options.signature_encoding : undefined);
}
exports.verify = verify;

/// -------------
/// ## getPEMCertificate function :
/// 
/// ``` javascript
/// var verify = certTools.getPEMCertificate(_, name, ca, tenantId)
/// ```
/// 
/// Retrieves certificate in PEM format as a string
/// 
/// * The `name` parameter gives the name of the certificate in the certificate entity. When it is `null`,
///   the locally installed base certificate key will be taken.
/// * The optional `ca` parameter tells whether it is the certificate of the caCertificate entity
/// * An optional `tenantId` which will be used as a prefix for file names

function getPEMCertificate(_, name, ca, tenantId) {
	var certificate;
	// get contents of key file
	var directory = _getDirectory(undefined, tenantId);
	if (!name) {
		name = (ca ? "ca" : lcHostName);
	}
	try {
		certificate = fs.readFile(directory + name + (ca ? ".cacrt" : ".crt"), "utf8", _);
	} catch (e) {
		throw new Error(locale.format(module, "noCert", name));
	}
	return certificate;
}
exports.getPEMCertificate = getPEMCertificate;

/// -------------
/// ## createWritableStream function 
/// 
/// ``` javascript
/// var str = instance.httpRequest(_, name, options, cas)
/// ```
/// 
/// Creates an https request with the data from this certificate
/// 
/// * The `name` parameter gives the name of the certificate. 
/// * The `options` parameter contains the non-SSL parts such as `method`, `url`
/// * The `cas` parameter must contain the names of the CA certificates associated  
///   with the entry of the certificate entity
/// * An optional `tenantId` which will be used as a prefix for file names
/// 
/// Returns an HttpClientRequest obtained from streamline
/// 

function streamHttpRequest(_, name, options, cas, tenantId) {
	// copy old options
	var opt = {};
	Object.keys(options).forEach(function(key) {
		opt[key] = options[key];
	});
	if (!name) {
		name = lcHostName;
	}
	var privatekey;
	var cert;
	// get contents of key file
	var directory = _getDirectory(undefined, tenantId);
	var passphrases = readPassphrases(directory, _);
	try {
		cert = fs.readFile(directory + name + ".crt", "utf8", _);
		privatekey = fs.readFile(directory + name + ".key", "utf8", _);
	} catch (e) {
		throw new Error(locale.format(module, "noCert", name));
	}
	opt.key = privatekey;
	opt.cert = cert;
	opt.passphrase = passphrases[name];
	opt.agent = false;
	if (cas && cas.length) {
		cas = cas.map_(_, function(_, caName) {
			return fs.readFile(directory + caName + ".cacrt", "utf8", _);
		});
		opt.ca = cas;

	}
	// console.log("Options "+util.format(opt));
	return ez.devices.http.client(opt);
}

exports.streamHttpRequest = streamHttpRequest;

/// -------------
/// ## search and update certificates
/// 
/// ``` javascript
/// var result = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, host);
/// ```
/// 
/// Perform file operations in certificate directory and update entries in local arrays of certificates and CA certificates
///
/// * The `data` parameter contains an array of objects which describe what to do (details below)
/// * The `certificates` parameter contains an array of local certificate data which should also be updated
/// * The `caCertificates` parameter contains an array of local CA certificate data which should also be updated
/// * The `directory` parameter contains the directory of the certificates in the file system (subdirectory of `config.collaboration.certdir`). The directory name must end with '/'
/// * The `host` parameter (optional) contains the object with the data of the host, whose `missingCert` and `missingCA` arrays should be updated. 
///   The names of incoming certificates will reduce the entries in the arrays missingCert and missingCA of the `host` parameter
/// * The `changed` parameter (optional) should point to an object. Its `missing` property will be set to true, when `host.missingCA` or `host.missingCert` 
///   has been changed (tell this to other servers!). When a server certificate (or one of its CA certificates) for an active connection has 
///   been changed, the `start` property will be set to true, when the certificate data have been empty (so that it is good to try to start the connection again)
///   otherwise the `restart` property will be set to true (active connections have been changed, therefore restart the server).
/// 
/// Structure of objects within `data` parameter:
/// name: logical name of certificate (as in Certificate/CaCertificate entity, obligatory) 
/// ca: when true, then it is CA authority certificate
/// del: when true, delete the named entry
/// get: when true, ask for these data
/// cert: certificate in PEM format (string)
/// key: key in PEM format (string)
/// pass: passphrase for key (string)
/// keyTest: when true, test whether private key is available (it may have been deleted locally)
/// cas: when set, this is an array with the names of CA certificates which should be tested
/// id: this must be the uuid of the corresponding instance

/// When 'del'  attribute is not set, and 'cert' or 'key' is set, update the data. Otherwise ask for the data. Available data of 
/// responses will be put into the reponse array which is the result of the function
/// Responses array will get an additional attribute 'changes' when host data have changed

function parseRequestCert(_, data, certificates, caCertificates, directory, host, changed) {
	tracer && tracer("parse request cert DATA " + util.format(data));
	var response = [];
	var updatePassphrases;
	var passphraseTenantId = undefined;
	var passphrases;
	if (!fs.exists(directory, _)) fs.mkdir(directory, _);

	function updatePassphraseTenant(_, partTenant, fullDir) {
		if (partTenant !== passphraseTenantId) {
			if (passphraseTenantId && updatePassphrases) {
				writePassphrases(fullDir, passphrases, _);
				updatePassphrases = false;
			}
			passphraseTenantId = partTenant;
			passphrases = readPassphrases(fullDir, _);
		}

	}
	data.forEach_(_, function(_, part) {
		var list = part.ca ? caCertificates : certificates;
		var crtExtension = part.ca ? ".cacrt" : ".crt";
		var filename;
		var index;
		var array;
		var i;
		var partTenant = part.tenantId || "";
		var fullDir = directory + (part.tenantId ? part.tenantId + "/" : "");
		if (part.del) {
			// delete
			if (list) {
				for (i = 0; i < list.length; i++) {
					if (part.name === list[i].name) { // entry found
						// delete local entry
						list.splice(i, 1);
						break;
					}
				}
			}
			// delete file
			try {
				fs.unlink(fullDir + part.name + crtExtension, _);
			} catch (e) {
				tracer && tracer("Deletion error certificate " + e);
			}
			if (!part.ca) {
				try {
					fs.unlink(fullDir + part.name + ".key", _);
				} catch (e) {
					tracer && tracer("Deletion error key file " + e);
				}
				updatePassphraseTenant(_, partTenant, fullDir);
				if (part.name in passphrases) {
					delete passphrases[part.name];
					updatePassphrases = true;
				}
			}
			if (host) {
				array = part.ca ? host.missingCA : host.missingCert;
				index = array.indexOf(part.name);
				if (index >= 0) {
					array.splice(index, 1);
					// changes in list of missing certificates
					if (changed) {
						changed.missing = true;
					}
				}
			}
		} else {
			if (part.cert || part.key || part.cas) {
				// update
				// check data
				// TODO: CA certificates
				// find local data
				var localEntry;
				if (list) {
					list.some(function(cert) {
						if (cert.name === part.name) {
							cert.cert = part.cert;
							localEntry = cert;
							return true;
						}
					});
				}
				tracer && tracer("Save certificate data " + util.format(localEntry));
				var checkCert = part.cert || (localEntry ? localEntry.certificate : null);
				var checkKey = part.key || (localEntry ? localEntry.key : null);
				if (!list) { // for usage outside of cluster 
					if (!part.cert) {
						try {
							checkCert = fs.readFile(fullDir + part.name + crtExtension, "utf8", _);
						} catch (e) {
							// ignore non existing file
						}
					}
					if (!part.key && !part.ca) {
						try {
							var keyfile = fs.readFile(fullDir + part.name + ".key", "utf8", _);
							updatePassphraseTenant(_, partTenant, fullDir);
							checkKey = jsx509.stripEncryption(keyfile, passphrases[part.name]);
						} catch (e) {
							if (part.keyTest) {
								if (e.code === 'ENOENT') throw new Error(locale.format(module, "noKeyfile", part.name));
								throw new Error(locale.format(module, "keyCorrupt", part.name, "" + e));
							}
							// ignore non existing file
						}
					}
				}
				if (part.keyTest && !checkKey) {
					throw new Error(locale.format(module, "keyMissing", part.name));
				}
				var caCerts = [];
				if (part.cas) {
					for (var i = 0; i < part.cas.length; i++) {
						var name = part.cas[i];
						if (caCertificates) {
							caCertificates.some(function(caCert) {
								if (caCert.name === name) {
									caCerts.push(caCert.certificate);
									return true;
								}
							});
						} else {
							try {
								caCerts.push(fs.readFile(fullDir + name + ".cacrt", "utf8", _));
							} catch (e) {
								// ignore non existing file
							}
						}
					}
				}
				var integ = jsx509.integrity(checkCert, checkKey, part.pass, caCerts);
				if (integ.error) {
					throw new Error(locale.format(module, "certError", part.name, integ.error));
				}
				if (!fs.exists(fullDir, _)) fs.mkdir(fullDir, _);
				// update file system
				try {
					if (part.cert) {
						filename = fullDir + part.name + crtExtension;
						fs.writeFile(filename, part.cert, "utf8", _);
						fs.chmod(filename, 0x180, _); // read and write permissions: 0600
					}
				} catch (e) {
					throw new Error(locale.format(module, "certUpd", part.name, e));
				}
				if (!part.ca) {
					try {
						if (part.key) {
							updatePassphraseTenant(_, partTenant, fullDir);
							passphrases[part.name] = part.pass;
							updatePassphrases = true;
							filename = fullDir + part.name + ".key";
							fs.writeFile(filename, part.key, "utf8", _);
							fs.chmod(filename, 0x180, _); // read and write permissions: 0600
						}
					} catch (e) {
						throw new Error(locale.format(module, "keyUpd", part.name, e));
					}
				}
				// update local data
				if (list) {
					if (!localEntry) {
						localEntry = {
							name: part.name,
							_id: part.id
						};
						list.push(localEntry);
					}
					var change = false;
					// existing data are not changed
					var newData = (!localEntry.certificate && part.cert) || ((!localEntry.key && part.key) && (!localEntry.certificate || !part.cert || localEntry.certificate === part.cert));
					if (part.cert && localEntry.certificate !== part.cert) {
						localEntry.certificate = part.cert;
						change = true;
					}
					if (part.key && localEntry.key !== integ.key) {
						localEntry.key = integ.key; // decrypted key
						change = true;
					}
					if (part.cas) {
						var newCas = part.cas.sort().join(",");
						var oldCas = (localEntry.caCertificates || []).map(function(item) {
							return item.name;
						}).sort().join(",");
						if (newCas !== oldCas) {
							change = true;
							if (caCertificates) {
								localEntry.caCertificates = [];
								part.cas.forEach(function(item) {
									caCertificates.some(function(cert) {
										if (cert.name === item) {
											localEntry.caCertificates.push(cert);
											return true;
										}
									});
								});
							}
						}
					}
					if (change && host && changed && host.connectionData) {
						host.connectionData.forEach(function(data) {
							if (data.active && data.ssl && (_changes(data.serverCert, part.name, part.ca) || (data.clientAuth && data.clientCert && _changes(data.clientCert, part.name, part.ca)))) {
								if (newData)
									changed.start = true;
								else
									changed.restart = true;
							}
						});
					}
				}
				if (host) {
					array = part.ca ? host.missingCA : host.missingCert;
					index = array.indexOf(part.name);
					if (index >= 0) {
						array.splice(index, 1);
						// changes in list of missing certificates
						if (changed) {
							changed.missing = true;
						}
					}
				}
			} else { // request data
				var answerCrt = undefined;
				var encryptedKey = undefined;
				var searchKey;
				if (part.tenantId) {
					// just take local file contents
					try {
						answerCrt = fs.readFile(fullDir + part.name + (part.ca ? ".cacrt" : ".crt"), "utf8", _);
					} catch (e) {
						tracer && tracer("Not available for " + part.tenantId + ": cert " + part.name);
					};
					searchKey = !part.ca;
				} else {
					list.some(function(cert) {
						if (cert.name === part.name) {
							answerCrt = cert.certificate;
							searchKey = (!part.ca && cert.key);
						}
					});
				}
				if (answerCrt) {
					if (searchKey) {
						try {
							encryptedKey = fs.readFile(fullDir + part.name + ".key", "utf8", _);
						} catch (e) {
							tracer && tracer("Not available for " + part.tenantId + ": key " + part.name);
						}
					};
					if (encryptedKey) {
						updatePassphraseTenant(_, partTenant, fullDir);
						response.push({
							name: part.name,
							ca: part.ca,
							tenantId: part.tenantId,
							cert: answerCrt,
							key: encryptedKey,
							pass: passphrases[part.name]
						});
					} else {
						response.push({
							name: part.name,
							ca: part.ca,
							tenantId: part.tenantId,
							cert: answerCrt,
						});
					}
				} else { // no answer found
					tracer && tracer("parseRequestCert: No answer found for " + part.name);
				}
			}
		}
	});
	if (updatePassphrases) {
		writePassphrases(directory + (passphraseTenantId ? passphraseTenantId + "/" : ""), passphrases, _);
	}
	return response;
}
exports.parseRequestCert = parseRequestCert;

function _changes(cert, name, ca) {
	tracer && tracer("_changes " + name + " " + ca + " " + util.format(cert));
	if (!cert) {
		return false;
	}
	if (!ca) {
		return cert.name === name;
	}
	// test CA certificates
	if (!cert.caCertificates) {
		return false;
	}
	return cert.caCertificates.some(function(cacert) {
		return cacert.name === name;
	});
}

// load native module for passphrase encryption
function _getCryptoModule() {
	var arch = os.platform() + '-' + os.arch();
	var v8 = 'v8-' + /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
	return require(`./bin/${arch}-${v8}/crypt`);
}

function readPassphrases(directory, _, exc) {
	try {
		var crypted = fs.readFile(directory + lcHostName + ".pwd", "utf8", _);
		var cr = _getCryptoModule();
		return JSON.parse(cr.decrypt(new Buffer(crypted, "base64"), require));
	} catch (e) {
		if (e.code === 'ENOENT') {
			if (exc) throw e;
			return {};
		} else {
			console.error("Error in passphrase file " + e);
			throw new Error(locale.format(module, "otherUser", e));
		}
	}
}
exports.readPassphrases = readPassphrases;

//write file with passphrases (directory must end with '/')
function writePassphrases(directory, phrases, _) {
	var filename = directory + lcHostName + ".pwd";
	var clear = JSON.stringify(phrases);
	var cr = _getCryptoModule();
	var encrypted = cr.encrypt(clear, require).toString("base64");
	for (var i = 0; i < 5; i++) {
		fs.writeFile(filename, encrypted, "utf8", _);
		fs.chmod(filename, 0x180, _); // read and write permissions: 0600
		// test file content
		var test = fs.readFile(filename, "utf8", _);
		if (test !== encrypted) {
			tracer && tracer("Write passphrases again");
			continue;
		}
		return;
	}
	throw new Error("Cannot write passphrase file");
}

exports.writePassphrases = writePassphrases;

/// -------------
/// ## convert entries of `missingCA` and `missingCert` into input for `parseRequestCert`
/// 
/// ``` javascript
/// certTools.pushMissing(host, data)
/// ```
/// 
/// Parameter `host` take attributes `missingCA` and `missingCert` from this
/// Parameter `data` push resulting data to this array (which should be input for `parseRequestCert` 

function pushMissing(host, data) {
	tracer && tracer("PUSH MISSING " + host.hostname);
	host.missingCA.forEach(function(name) {
		var index = name.lastIndexOf('@');
		if (index < 0) {
			data.push({
				name: name,
				ca: true
			});
		} else {
			data.push({
				name: name.substr(0, index),
				tenantId: name.substr(index + 1),
				ca: true
			});
		}
	});
	host.missingCert.forEach(function(name) {
		var index = name.lastIndexOf('@');
		if (index < 0) {
			data.push({
				name: name,
				ca: false
			});
		} else {
			data.push({
				name: name.substr(0, index),
				tenantId: name.substr(index + 1),
				ca: false
			});
		}
	});
}
exports.pushMissing = pushMissing;

/// -------------
/// ## recursively tests whether arguments are equal. Empty array and empty object do not count as different
/// 
/// ``` javascript
/// certTools.deepEqual(obj1, obj2)
/// ```
/// 
/// The parameters are arbitrary objects. 
//

function deepEqual(a, b) {
	// both are empty/null/undefined or really equal/identical
	if ((!a && !b) || a === b) return true;
	// one of them is empty/null/undefined
	if (!a || !b) return false;
	if (a instanceof Object && b instanceof Object) {
		if (Buffer.isBuffer(a)) {
			if (!Buffer.isBuffer(b) || a.length !== b.length) return false;
			var i;
			for (i = a.length - 1; i >= 0; i--) {
				if (a[i] !== b[i]) return false;
			}
			return true;
		}
		if (Object.keys(a).some(function(key) {
				// console.log("KEY "+key)
				if (!deepEqual(a[key], b[key])) return true;
			})) {
			return false;
		}
		if (Object.keys(b).some(function(key) {
				if (!(key in a)) return true;
			})) {
			return false;
		}
		return true;
	}
	return false;
}

exports.deepEqual = deepEqual;