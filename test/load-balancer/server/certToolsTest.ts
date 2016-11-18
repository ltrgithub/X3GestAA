"use strict";
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	var certTools = require('../../../src/load-balancer/certTools');
	var util = require('util');
	var fs = require('streamline-fs');
	var jsx509 = require('jsx509');
	var os = require('os');
	var tracer; // = console.error;

	it('CA Certificate operations in file system', function(_) {
		var directory = 'certificatetest/';
		try {
			fs.mkdirSync(directory);
		} catch (e) {
			tracer && tracer(e);
		}
		var certificates = [];
		var caCertificates = [];
		var cacrt = fs.readFile(__dirname + "/fixtures/ca.cacrt", "utf8", _);
		// search for non existent CA certificate
		var data = [{
			name: "ca",
			ca: true
		}];
		var h = {
			missingCA: ["ca", "ca2", "ca1"],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: 'bla',
					caCertificates: [{
						name: "ca"
					}]
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h);
		strictEqual(res.length, 0, "search for non existent CA certificate");
		strictEqual(h.missingCA.length, 3, "same number of missing CA");
		// put CA certificate
		var data = [{
			name: "ca",
			ca: true,
			cert: cacrt,
		}];
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "put CA certificate: no response");
		strictEqual(h.missingCA.length, 2, "one missing CA certificate less");
		strictEqual(changed.missing, true, "changes in missing CA certificates reported");
		strictEqual(!changed.restart, true, "no restart reported");
		strictEqual(changed.start, true, "start reported");
		var fileContent = fs.readFile(directory + "ca.cacrt", "utf8", _);
		strictEqual(cacrt, fileContent, "correct certificate in file system");
		strictEqual(caCertificates.length, 1, "now 1 local CA certificate");
		strictEqual(caCertificates[0].name, "ca", "correct CA certificate name");
		strictEqual(caCertificates[0].certificate, cacrt, "correct CA certificate content");
		// search for existent CA certificate
		var data = [{
			name: "ca",
			ca: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 1, "search for existent CA certificate: response available");
		strictEqual(res[0].name, "ca", "correct CA certificate name");
		strictEqual(res[0].ca, true, "CA marker");
		strictEqual(res[0].cert, cacrt, "correct CA certificate content");
		// delete for non existent CA certificate
		var data = [{
			name: "ca1",
			ca: true,
			del: true
		}];
		tracer && tracer(util.format(h.missingCA));
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);

		strictEqual(res.length, 0, "delete non existent CA certificate: no response on delete");
		strictEqual(h.missingCA.length, 1, "deleted certificate is not missing any more");
		strictEqual(changed.missing, true, "changes in missing CA certificates reported");
		strictEqual(!changed.restart, true, "no restart reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(caCertificates.length, 1, "still 1 local CA certificate");
		var fileContent = fs.readFile(directory + "ca.cacrt", "utf8", _);
		strictEqual(caCertificates[0].certificate, cacrt, "correct CA certificate content");

		// delete for existent CA certificate
		var h = {
			missingCA: ["ca", "ca2", "ca1"]
		};
		var data = [{
			name: "ca",
			ca: true,
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h);
		strictEqual(res.length, 0, "delete existent CA certificate: no response on delete");
		strictEqual(h.missingCA.length, 2, "one missing CA certificate less");
		strictEqual(caCertificates.length, 0, "no local CA certificates");
		var existent = fs.existsSync(directory + "ca.cacrt");
		strictEqual(existent, false, "CA certificate deleted");

		// put CA certificate
		var data = [{
			name: "ca1",
			tenantId: "xyz",
			ca: true,
			cert: cacrt,
		}];
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "put CA certificate with tenant: no response");
		strictEqual(!changed.restart, true, "no restart reported");
		var fileContent = fs.readFile(directory + "xyz/ca1.cacrt", "utf8", _);
		strictEqual(cacrt, fileContent, "correct certificate in file system");
		strictEqual(caCertificates.length, 1, "now 1 local CA certificate");
		strictEqual(caCertificates[0].name, "ca1", "correct CA certificate name");
		strictEqual(caCertificates[0].certificate, cacrt, "correct CA certificate content");
		// search for existent CA certificate
		var data = [{
			name: "ca1",
			tenantId: "xyz",
			ca: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 1, "search for existent CA certificate with tenant: response available");
		strictEqual(res[0].name, "ca1", "correct CA certificate name");
		strictEqual(res[0].ca, true, "CA marker");
		strictEqual(res[0].cert, cacrt, "correct CA certificate content");
		// delete for non existent CA certificate
		var data = [{
			name: "ca2",
			tenantId: "xyz",
			ca: true,
			del: true
		}];
		tracer && tracer(util.format(h.missingCA));
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);

		strictEqual(res.length, 0, "delete non existent CA certificate with tenant: no response on delete");
		strictEqual(!changed.restart, true, "no restart reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(caCertificates.length, 1, "still 1 local CA certificate");
		var fileContent = fs.readFile(directory + "xyz/ca1.cacrt", "utf8", _);
		strictEqual(caCertificates[0].certificate, cacrt, "correct CA certificate content");

		var data = [{
			name: "ca1",
			tenantId: "xyz",
			ca: true,
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h);
		strictEqual(res.length, 0, "delete existent CA certificate with tenant: no response on delete");
		strictEqual(caCertificates.length, 0, "no local CA certificates");
		var existent = fs.existsSync(directory + "xyz/ca1.cacrt");
		strictEqual(existent, false, "CA certificate deleted");

		try {
			fs.rmdirSync(directory);
		} catch (e) {
			tracer && tracer(e);
		}
	});

	it('deep equal', function() {
		strictEqual(certTools.deepEqual(null, undefined), true, "null and undefined");
		strictEqual(certTools.deepEqual(null, 1), false, "null and 1");
		strictEqual(certTools.deepEqual(1, {}), false, "1 and object");
		strictEqual(certTools.deepEqual([], {}), true, "array and object");
		strictEqual(certTools.deepEqual({
			a: 5,
			b: 7
		}, {
			b: 7,
			a: 5
		}), true, "two equal simple objects");
		strictEqual(certTools.deepEqual({
			a: 5,
			b: 7,
			c: 8
		}, {
			b: 7,
			a: 5
		}), false, "extra property in first argument");
		strictEqual(certTools.deepEqual({
			a: 5,
			b: 7
		}, {
			b: 7,
			a: 5,
			c: 8
		}), false, "extra property in second argument");
		strictEqual(certTools.deepEqual([1, 2], [2, 1]), false, "two different arrays");
		strictEqual(certTools.deepEqual([2], [2, 1]), false, "two different arrays");
		strictEqual(certTools.deepEqual({
			a: {
				c: 77
			},
			b: [5, {
				t: 8,
				r: 4
			}]
		}, {
			b: [5, {
				r: 4,
				t: 8
			}],
			a: {
				c: 77
			}
		}), true, "two equal structured objects");
	});

	it('Certificate operations in file system', function(_) {
		var directory = 'certificatetest/';
		try {
			fs.mkdirSync(directory);
		} catch (e) {
			tracer && tracer(e);
		}
		var certificates = [];
		var caCertificates = [];
		var crt = fs.readFile(__dirname + "/fixtures/server.crt", "utf8", _);
		var crt2 = fs.readFile(__dirname + "/fixtures/server2.crt", "utf8", _);
		var key = fs.readFile(__dirname + "/fixtures/server.key", "utf8", _);
		var pass = "server";
		var testcontent = {
			"lala": "jaja"
		};
		certTools.writePassphrases(directory, testcontent, _);
		strictEqual(JSON.stringify(testcontent), JSON.stringify(certTools.readPassphrases(directory, _)), "Encryption and decryption with native module");
		var keyDecrypted = jsx509.stripEncryption(key, pass);
		// search for non existent certificate
		var data = [{
			name: "server",
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 0, "-- search for non existent certificate");
		// put certificate
		var h = {
			missingCert: ["ca", "server"],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var data = [{
			name: "server",
			cert: crt,
			key: key,
			pass: pass
		}];
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- put certificate: no response");
		strictEqual(h.missingCert.length, 1, "on missing certificate less");
		strictEqual(changed.missing, true, "changes in missing certificates reported");
		strictEqual(changed.start, true, "start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		var fileContent = fs.readFile(directory + "server.crt", "utf8", _);
		strictEqual(crt, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt, "correct certificate content");
		strictEqual(certificates[0].key, keyDecrypted, "correct key content");
		var fileContent = fs.readFile(directory + "server.key", "utf8", _);
		strictEqual(key, fileContent, "correct key in file system");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, "server", "correct passphrase");
		// search for existent certificate
		var data = [{
			name: "server",
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 1, "-- search for existent certificate: response available");
		strictEqual(res[0].name, "server", "correct certificate name");
		equal(!res[0].ca, true, "marker");
		strictEqual(res[0].cert, crt, "correct certificate content");
		strictEqual(res[0].key, key, "correct key content");
		strictEqual(res[0].pass, pass, "correct passphrase");
		// delete for non existent certificate
		var data = [{
			name: "server1",
			del: true
		}];
		var h = {
			missingCert: ["ca", "server"]
		};
		changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- delete non existent certificate: no response on delete");
		strictEqual(certificates.length, 1, "still 1 local certificate");
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		var fileContent = fs.readFile(directory + "server.crt", "utf8", _);
		strictEqual(certificates[0].certificate, crt, "correct certificate content");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, "server", "passphrase still available");

		// delete for existent certificate
		var h = {
			missingCert: ["ca", "server"]
		};
		changed = {};
		var data = [{
			name: "server",
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- delete existent certificate: no response on delete");
		strictEqual(h.missingCert.length, 1, "on missing certificate less");
		strictEqual(certificates.length, 0, "no local certificates");
		strictEqual(changed.missing, true, "changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		var existent = fs.existsSync(directory + "server.crt");
		strictEqual(existent, false, "certificate deleted");
		var existent = fs.existsSync(directory + "server.key");
		strictEqual(existent, false, "key deleted");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, undefined, "deleted passphrase");
		// put certificate without key
		var data = [{
			name: "server",
			cert: crt,
		}];
		var changed = {};
		var h = {
			missingCert: [],
			connectionData: [{
				active: false,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- put certificate without key: no response");
		var fileContent = fs.readFile(directory + "server.crt", "utf8", _);
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		strictEqual(crt, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt, "correct certificate content");
		strictEqual(certificates[0].key, undefined, "correct key content");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, undefined, "no passphrase");
		var existent = fs.existsSync(directory + "server.key");
		strictEqual(existent, false, "no key");
		// put key without certificate (just certificate exists up to now)
		var data = [{
			name: "server",
			key: key,
			pass: pass
		}];
		var changed = {};
		var h = {
			missingCert: [],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- put key without certificate: no response");
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(changed.start, true, "start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		var fileContent = fs.readFile(directory + "server.crt", "utf8", _);
		strictEqual(crt, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt, "correct certificate content");
		strictEqual(certificates[0].key, keyDecrypted, "correct key content");
		var fileContent = fs.readFile(directory + "server.key", "utf8", _);
		strictEqual(key, fileContent, "correct key in file system");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, "server", "correct passphrase");
		// put new certificate without key again
		var data = [{
			name: "server",
			cert: crt2,
		}];
		var changed = {};
		var h = {
			missingCert: [],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- renew certificate without key: no response");
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(changed.restart, true, "restart reported");
		var fileContent = fs.readFile(directory + "server.crt", "utf8", _);
		strictEqual(crt2, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt2, "correct certificate content");
		strictEqual(certificates[0].key, keyDecrypted, "correct key content");
		var fileContent = fs.readFile(directory + "server.key", "utf8", _);
		strictEqual(key, fileContent, "correct key in file system");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, "server", "correct passphrase");
		// put CA certificate for certificate
		var cacrt = fs.readFile(__dirname + "/fixtures/ca.cacrt", "utf8", _);
		var data = [{
			name: 'ca',
			cert: cacrt,
			ca: true
		}];
		var changed = {};
		var h = {
			missingCert: [],
			missingCA: [],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- add ca.cacrt");
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(!changed.restart, true, "no restart reported");

		var data = [{
			name: "server",
			cas: ['ca']
		}];
		var changed = {};
		var h = {
			missingCert: [],
			connectionData: [{
				active: true,
				ssl: true,
				serverCert: {
					name: "server"
				}
			}]
		};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- add ca.cacrt to existing server certificate: no response");
		strictEqual(!changed.missing, true, "no changes in missing certificates reported");
		strictEqual(!changed.start, true, "no start reported");
		strictEqual(changed.restart, true, "restart reported");
		var fileContent = fs.readFile(directory + "ca.cacrt", "utf8", _);
		strictEqual(cacrt, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt2, "correct certificate content");
		strictEqual(certificates[0].key, keyDecrypted, "correct key content");
		strictEqual(certificates[0].caCertificates.length, 1, "correct length of CA certificates");
		// delete for existent certificate
		var data = [{
			name: "server",
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 0, "-- delete existent certificate: no response on delete")
		strictEqual(certificates.length, 0, "no local certificates");
		var existent = fs.existsSync(directory + "server.crt")
		strictEqual(existent, false, "certificate deleted");
		var existent = fs.existsSync(directory + "server.key")
		strictEqual(existent, false, "key deleted");
		var phrases = certTools.readPassphrases(directory, _);
		strictEqual(phrases.server, undefined, "deleted passphrase");
		// certificate with tenant
		var data = [{
			name: "server",
			tenantId: "xyz",
			cert: crt,
			key: key,
			pass: pass
		}];
		var changed = {};
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory, h, changed);
		strictEqual(res.length, 0, "-- put certificate with tenant: no response");
		strictEqual(changed.start, true, "start reported");
		strictEqual(!changed.restart, true, "no restart reported");
		var fileContent = fs.readFile(directory + "xyz/server.crt", "utf8", _);
		strictEqual(crt, fileContent, "correct certificate in file system");
		strictEqual(certificates.length, 1, "now 1 local certificate");
		strictEqual(certificates[0].name, "server", "correct certificate name");
		strictEqual(certificates[0].certificate, crt, "correct certificate content");
		strictEqual(certificates[0].key, keyDecrypted, "correct key content");
		var fileContent = fs.readFile(directory + "xyz/server.key", "utf8", _);
		strictEqual(key, fileContent, "correct key in file system");
		var phrases = certTools.readPassphrases(directory + "xyz/", _);
		strictEqual(phrases["server"], "server", "correct passphrase");
		var data = [{
			name: "server",
			tenantId: "xyz",
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, certificates, caCertificates, directory);
		strictEqual(res.length, 0, "-- delete existent certificate with tenant: no response on delete")
		strictEqual(certificates.length, 0, "no local certificates");
		var existent = fs.existsSync(directory + "xyz/server.crt")
		strictEqual(existent, false, "certificate deleted");
		var existent = fs.existsSync(directory + "xyz/server.key")
		strictEqual(existent, false, "key deleted");
		var phrases = certTools.readPassphrases(directory + "xyz/", _);
		strictEqual(phrases["server"], undefined, "deleted passphrase");
		try {
			fs.unlinkSync(directory + os.hostname().toLowerCase() + ".pwd")
		} catch (e) {
			tracer && tracer(e)
		}
		try {
			fs.rmdirSync(directory);
		} catch (e) {
			tracer && tracer(e)
		}
	})

	it('Sign and verify test', function(_) {
		var directory = 'certificatetest/'
		try {
			fs.mkdirSync(directory);
		} catch (e) {
			tracer && tracer(e)
		}
		var crt = fs.readFile(__dirname + "/fixtures/server.crt", "utf8", _);
		var key = fs.readFile(__dirname + "/fixtures/server.key", "utf8", _);
		var pass = "server";
		// put key and certificate
		var data = [{
			name: "server",
			key: key,
			cert: crt,
			pass: pass
		}];
		var res = certTools.parseRequestCert(_, data, null, null, directory);
		// sign a string with the key
		var options = {
			certdir: directory
		}
		var data = "bla";
		var algorithm = "RSA-SHA1"
		var signature = certTools.sign(_, "server", algorithm, data, options);
		strictEqual(certTools.verify(_, "server", algorithm, data, signature, options), true, "String correctly signed");
		var data = new Buffer(8);
		var algorithm = "RSA-SHA256"
		var signature = certTools.sign(_, "server", algorithm, data, options);
		strictEqual(certTools.verify(_, "server", algorithm, data, signature, options), true, "Buffer correctly signed");
		// delete for existent certificate
		var data = [{
			name: "server",
			del: true
		}];
		var res = certTools.parseRequestCert(_, data, null, null, directory);
		try {
			fs.unlinkSync(directory + os.hostname().toLowerCase() + ".pwd")
		} catch (e) {
			tracer && tracer(e)
		}

		// put key and certificate - with tenant
		var data = [{
			name: "server",
			tenantId: "xyz",
			key: key,
			cert: crt,
			pass: pass
		}];
		var res = certTools.parseRequestCert(_, data, null, null, directory);
		// sign a string with the key
		var options = {
			certdir: directory
		}
		var data = "bla";
		var algorithm = "RSA-SHA1"
		var signature = certTools.sign(_, "server", algorithm, data, options, "xyz");
		strictEqual(certTools.verify(_, "server", algorithm, data, signature, options, "xyz"), true, "String correctly signed (tenant)");
		var data = new Buffer(8);
		var algorithm = "RSA-SHA256"
		var signature = certTools.sign(_, "server", algorithm, data, options, "xyz");
		strictEqual(certTools.verify(_, "server", algorithm, data, signature, options, "xyz"), true, "Buffer correctly signed (tenant)");
		// delete for existent certificate
		var data = [{
			name: "server",
			del: true,
			tenantId: "xyz"
		}];
		var res = certTools.parseRequestCert(_, data, null, null, directory);
		try {
			fs.unlinkSync(directory + os.hostname().toLowerCase() + ".pwd")
		} catch (e) {
			tracer && tracer(e)
		}
		try {
			fs.rmdirSync(directory);
		} catch (e) {
			tracer && tracer(e)
		}
	});
});