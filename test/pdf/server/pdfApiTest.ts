"use strict";
/* jshint -W079 */
/* jshint unused: false */
/* global QUnit: false, it: false, strictEqual: false, ok: false, start: false, stop: false */
var helpers = require('@sage/syracuse-core').helpers;
var config = require('config'); // must be first syracuse require
var mongodb = require('mongodb');
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var adminHelper = require("../../../src/collaboration/helpers");
var dataModel = require("../../../src/orm/dataModel");
var globals = require('streamline-runtime').globals;
var rmdirRec = require('syracuse-patch/lib/patchtools').rmdirRec;
var tracer; // = console.error;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var fs = require('streamline-fs'),
		fsp = require('path'),
		util = require('util'),
		pdfReader = require('../../../src/pdf/reader'),
		pdfWriter = require('../../../src/pdf/writer'),
		pdfUtils = require('../../../src/pdf/utils'),
		pdfObject = require('../../../src/pdf/object'),
		x509 = require("jsx509").x509,
		asn1 = require("jsx509").asn1,
		crypto = require('crypto'),
		flows = require('streamline-runtime').flows;

	var directory = fsp.join(__dirname, '../../../../certificatetest/');
	var db; // Initialised when we set up the environment

	var ckeckDiagnoses = function(obj) {
		//tracer && tracer(util.inspect(obj));

		if (obj && obj.$diagnoses) {
			for (var i in obj.$diagnoses) {
				if (obj.$diagnoses[i] != null) {
					if (obj.$diagnoses[i].$severity === "error") {
						throw new Error(obj.$diagnoses[i].$severity + ": " + util.inspect(obj.$diagnoses[i].$message));
					} else {
						tracer && tracer(obj.$diagnoses[i].$severity + ": " + util.inspect(obj.$diagnoses[i].$message));
					}
				}
			}
		}
		if (obj && obj.$properties) {
			Object.keys(obj.$properties).forEach(function(elt) {
				if (obj.$properties[elt] && obj.$properties[elt].$diagnoses != null && obj.$properties[elt].$diagnoses.length !== 0) {
					obj.$properties[elt].$diagnoses.forEach(function(diag) {
						if (diag.$severity === "error") {
							throw new Error(diag.$severity + " in element: " + elt + " : " + diag.$message);
						} else {
							tracer && tracer(diag.$severity + " in element: " + elt + " : " + diag.$message);
						}
					});
				}
			});
		}
		if (obj && obj.$actions) {
			Object.keys(obj.$actions).forEach(function(elt) {
				if (obj.$actions[elt] && obj.$actions[elt].$diagnoses != null && obj.$actions[elt].$diagnoses.length !== 0) {
					obj.$actions[elt].$diagnoses.forEach(function(diag) {
						if (diag.$severity === "error") {
							throw new Error(diag.$severity + " in element: " + elt + " : " + diag.$message);
						} else {
							tracer && tracer(diag.$severity + " in element: " + elt + " : " + diag.$message);
						}
					});
				}
			});
		}

	};

	var jsx509Dir = fsp.dirname(require.resolve('jsx509'));

	var createCertificateInstance = function(_, name, passphrase) {
		//var db = adminHelper.getCollaborationOrm(_);
		var model = db.model;
		var entity = model.getEntity(_, "certificate");

		var certInst = entity.createInstance(_, db, null);
		certInst.name(_, name + "_test");
		certInst.internal(_, false);
		certInst.keyExists(_, true);
		certInst.pass(_, passphrase);

		var caString = fs.readFileSync(fsp.join(jsx509Dir, "test/server/fixtures/" + name + ".crt"), "utf8");
		var caBuf = new Buffer(caString);
		var caStore = certInst.certificate(_);
		var stream = caStore.createWritableStream(_, {
			length: caBuf.length
		});
		stream.write(_, caBuf.toString(), "binary");
		stream.write(_, null);
		caStore.close(_);

		var keyString = fs.readFileSync(fsp.join(jsx509Dir, "test/server/fixtures/" + name + ".key"), "utf8");
		var keyBuf = new Buffer(keyString);
		var keyStore = certInst.key(_);
		var stream2 = keyStore.createWritableStream(_, {
			length: keyBuf.length
		});
		stream2.write(_, keyBuf.toString(), "binary");
		stream2.write(_, null);
		keyStore.close(_);

		var res = certInst.save(_);
		ckeckDiagnoses(res);
		return certInst;
	};

	var pdfFiles = [{
		fname: __dirname + '/rsrc/pdfs/test.pdf'
	}, {
		fname: __dirname + '/rsrc/pdfs/test2.pdf'
	}, {
		fname: __dirname + '/rsrc/pdfs/test3.pdf'
	}];

	var attRef = [{
		attachmentFile: __dirname + '/rsrc/attachments/attach.xml',
		attachmentName: "ubl.xml",
		attachmentDescr: 'xml embedded file ' + pdfUtils.formatDate(new Date())
	}, {
		attachmentFile: __dirname + '/rsrc/attachments/attach.gif',
		attachmentName: "sage.gif",
		attachmentDescr: 'gif embedded file ' + pdfUtils.formatDate(new Date())
	}, {
		attachmentFile: __dirname + '/rsrc/attachments/attach.doc',
		attachmentName: "charte.doc",
		attachmentDescr: 'doc embedded file ' + pdfUtils.formatDate(new Date())
	}];
	var certificates = [{
		name: 'ca',
		passphrase: 'test'
	}, {
		name: 'server',
		passphrase: 'server'
	}];

	//force basic auth
	config.session = config.session || {};
	config.session.auth = "basic";
	//no integration server
	config.integrationServer = null;
	globals.context.session = {
		id: helpers.uuid.generate(),
		getUserLogin: function(_) {
			return "guest";
		},
		getUserProfile: function(_) {
			return {
				user: function(_) {
					// getting the administration ORM
					//var db = adminHelper.getCollaborationOrm(_);
					return db.fetchInstance(_, db.model.getEntity(_, "user"), {
						jsonWhere: {
							login: "guest"
						}
					});
				},
				getDefaultX3Endpoints: function(_) {
					return [];
				}
			};
		},
		getSecurityProfile: function(_) {
			return null;
		},
		getData: function(code) {
			return null;
		}
	};

	it('initialise environment', function(_) {
		var config = {
			application: "syracuse",
			contract: "collaboration",
			dataset: "unit_test"
		};
		adminHelper.setup(config);
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environment initialized");

	});


	it('attach', function(_) {

		pdfFiles.forEach_(_, function(_, item) {
			var writer, pdfFile, originalSize;
			try {
				pdfFile = item.fname;
				originalSize = fs.stat(pdfFile, _).size;
				var reader = pdfReader.create(_, pdfFile);
				strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects before modifications [" + reader.size + "] ok");

				writer = pdfWriter.create(_, reader);

				var data = fs.readFile(attRef[0].attachmentFile, _);
				var resultObj = writer.attach(_, attRef[0].attachmentName, attRef[0].attachmentDescr, data);
				var streamObj = reader.getObjStream(_, resultObj.id);
				strictEqual(streamObj.length, data.length, "stream length on first attachment ok");
				strictEqual(streamObj.toString('utf8'), data.toString('utf8'), "stream content on first attachment ok");

				var data2 = fs.readFile(attRef[1].attachmentFile, _);
				var resultObj2 = writer.attach(_, attRef[1].attachmentName, attRef[1].attachmentDescr, data2);

				var streamObj2 = reader.getObjStream(_, resultObj2.id);
				strictEqual(streamObj2.length, data2.length, "stream length on second attachment ok");
				strictEqual(streamObj2.toString('utf8'), data2.toString('utf8'), "stream content on second attachment ok");

				var writer2 = pdfWriter.create(_, reader);
				var data3 = fs.readFile(attRef[2].attachmentFile, _);
				var resultObj3 = writer2.attach(_, attRef[2].attachmentName, attRef[2].attachmentDescr, data3);

				var streamObj3 = reader.getObjStream(_, resultObj3.id);
				strictEqual(streamObj3.length, data3.length, "stream length on attachment with other writer ok");
				strictEqual(streamObj3.toString('utf8'), data3.toString('utf8'), "stream content on attachment with other writer ok");
				strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects after modifications [" + reader.size + "] ok");

			} catch (e) {
				console.error(e.stack);
			} finally {
				// Revert modifications
				writer.rollback(_, true);
				writer.close(_);
				var finalSize = fs.stat(pdfFile, _).size;
				strictEqual(finalSize, originalSize, "file size after rollback ok");
			}
		});

	});

	it('check nodelocal config', function(_) {
		var options = {
			certdir: directory
		};
		try {
			config.collaboration.certdir = directory;
			fs.mkdirSync(directory);
		} catch (e) {
			tracer && tracer(e);
		}
		strictEqual(options.certdir && fs.existsSync(options.certdir), true, "Certificate directory exists.");

	});

	it('create certificates instances', function(_) {
		for (var i in certificates) {
			var cert = createCertificateInstance(_, certificates[i].name, certificates[i].passphrase);
			strictEqual(cert.name(_), certificates[i].name + "_test", "'" + certificates[i].name + "_test' certificate instance created");
		}
	});

	it('sign', function(_) {
		certificates.forEach_(_, function(_, cert) {
			pdfFiles.forEach_(_, function(_, item) {
				var writer, pdfFile, originalSize;
				try {
					pdfFile = item.fname;
					originalSize = fs.stat(pdfFile, _).size;
					var reader = pdfReader.create(_, pdfFile);

					strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects before modifications [" + reader.size + "] ok");

					writer = pdfWriter.create(_, reader);

					var signature = writer.sign(_, cert.name + "_test");
					strictEqual(signature.valid, true, "Signature valid ok");
					strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects after modifications [" + reader.size + "] ok");
				} catch (e) {
					console.error(e.stack);
					writer.rollback(_, true);
				} finally {
					// Revert modifications
					writer.rollback(_, true);
					writer.close(_);
					var finalSize = fs.stat(pdfFile, _).size;
					strictEqual(finalSize, originalSize, "file size after rollback ok");
				}
			});
		});
	});

	it('sign using buffer', function(_) {
		certificates.forEach_(_, function(_, cert) {
			pdfFiles.forEach_(_, function(_, item) {
				var writer, pdfFile, originalSize;
				try {
					pdfFile = item.fname;
					originalSize = fs.stat(pdfFile, _).size;
					var content = fs.readFile(pdfFile, _);
					var reader = pdfReader.createFromBuffer(_, pdfFile.split('/').splice(-1).join(''), content);

					strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects before modifications [" + reader.size + "] ok");

					writer = pdfWriter.create(_, reader);

					var signature = writer.sign(_, cert.name + "_test");
					strictEqual(signature.valid, true, "Signature valid ok");
					strictEqual(reader.checkObjectsIntegrity(_), true, "Integrity objects after modifications [" + reader.size + "] ok");
				} catch (e) {
					console.error(e.stack);
					writer.rollback(_, true);
				} finally {
					// Revert modifications
					writer.rollback(_, true);
					writer.close(_);
					var finalSize = fs.stat(pdfFile, _).size;
					strictEqual(finalSize, originalSize, "file size after rollback ok");
				}
			});
		});
	});

	it('clean up', function(_) {
		rmdirRec(directory, _);
		ok(true);
	});
});