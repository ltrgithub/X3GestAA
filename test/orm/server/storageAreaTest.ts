/* jshint -W079 */
/* jshint unused: false */
/* global QUnit: false, it: false, strictEqual: false, start: false, stop: false */
import { _ } from 'streamline-runtime';
import * as ez from 'ez-streams';
declare function it(name: string, test: (_: _) => any): any;
import { assert } from 'chai';
const strictEqual = assert.strictEqual;
const ok = assert.ok;
import * as fs from 'fs';
import { helpers, apis } from '@sage/syracuse-core';
var syracuse = require('syracuse-main/lib/syracuse'),
	adminHelper = require("../../../src/collaboration/helpers"),
	sa = require('../../../src/orm/storageArea');

const testAdmin = apis.get('test-admin');

describe(module.id, () => {
	var db;

	var uuidRef,
		fname = __dirname + '/rsrc/documents/test.pdf',
		fnameRead = __dirname + '/rsrc/documents/result.pdf',
		fnameUpd = __dirname + '/rsrc/documents/test.xml',
		data1, data2, data3,
		options1 = {
			description: "UNIT_TEST_CREATE",
			content: {
				contentType: "application/pdf",
				fileName: "test1.pdf"
			}
		},
		options2 = {
			description: "UNIT_TEST_UPDATE",
			content: {
				contentType: "text/xml",
				fileName: "test2.xml"
			}
		};

	function initSession() {
		_.context.session = {
			id: helpers.uuid.generate(),
			getUserLogin: function (_) {
				return "guest";
			},
			getUserProfile: function (_) {

				return {
					user: function (_) {
						// getting the administration ORM
						// var db = adminHelper.getCollaborationOrm(_);

						// the metamodel is associated to the orm
						var model = db.model;

						var entity = db.model.getEntity(_, "user");
						// fetchInstance(callback, entity, filter)
						return db.fetchInstance(_, entity, {
							jsonWhere: {
								login: "admin"
							}
						});

					}
				};
			},
			getSecurityProfile: function (_) {
				return null;
			},
			getData: function (key) {
				if (key === "userLogin") return "admin";
				return null;
			},
		};
	}

	function readAll(_, data) {
		try {
			var filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			var result = sa.readAll(_, filter);
			compareBuffers(data, result);
		} catch (e) {
			console.error(e.stack);
		}
	}

	function checkDocument(_, document, options) {
		var props = document.content(_).getProperties(_);
		strictEqual(uuidRef, document.$uuid, "uuid [" + uuidRef + "] ok");
		strictEqual(options.description, document.description(_), "description [" + document.description(_) + "] ok");
		strictEqual(options.content.contentType, props.contentType, "contentType [" + props.contentType + "] ok");
		strictEqual(options.content.fileName, props.fileName, "fileName [" + props.fileName + "] ok");
		strictEqual(props.uploadDate != null, true, "uploadDate [" + props.uploadDate + "] ok");
		strictEqual(props.chunkSize != null, true, "chunkSize [" + props.chunkSize + "] ok");
	}

	function compareBuffers(buffer1, buffer2) {
		strictEqual(buffer1.length, buffer2.length, "Buffer sizes equal");
		var i;
		var ok = false;

		if (buffer1.length === buffer2.length) {
			ok = true;
			for (i = 0; i < buffer1.length; i++) {
				if (buffer1[i] !== buffer2[i]) {
					ok = false;
					break;
				}
			}
		}

		strictEqual(true, ok, "Buffers match");
	}

	/*
	 * BEGIN TESTS
	 */
	it('initialise', function (_) {
		var config = {
			application: "syracuse",
			contract: "collaboration",
			dataset: "unit_test"
		};
		adminHelper.setup(config);
		initSession();
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environment initialized");

	});

	it('createDocument', function (_) {
		try {
			data1 = fs.readFile(fname, _);
			var document = sa.writeAll(_, options1, data1);
			uuidRef = document.$uuid;
			checkDocument(_, document, options1);
		} catch (e) {
			console.error(e.stack);
		}
	});

	it('readDocumentAfterCreate', function (_) {
		readAll(_, data1);
	});

	var lastUuid;
	it('updateDocument', function (_) {
		try {
			var filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			data2 = fs.readFile(fnameUpd, _);
			var document = sa.writeAll(_, options2, data2, filter, "SI_REPORTS");
			lastUuid = document.$uuid;
			checkDocument(_, document, options2);

		} catch (e) {
			console.error(e.stack);
		}
	});

	it('readDocumentAfterUpdate', function (_) {
		readAll(_, data2);
	});

	it('listDocuments', function (_) {
		try {
			var arr = sa.listDocuments(_, {
				"sdataWhere": "$uuid eq '" + lastUuid + "'"
			}, true, ['$uuid', 'description']);

			strictEqual(arr.length, 1, "List Length ok");
			strictEqual(arr && arr.length !== 0 && Object.keys(arr[0]).length, 2, "Property ok");
			strictEqual(arr[0].$uuid, lastUuid, "Uuid ok");
			strictEqual(arr[0].description, options2.description, "Description ok");
		} catch (e) {
			console.error(e.stack);
		}
	});

	it('removeDocument', function (_) {
		try {
			var filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			var result = sa.remove(_, filter);
			strictEqual(result, 1, "Remove ok");
		} catch (e) {
			console.error(e.stack);
		}
	});

	it('readDocumentAfterRemove', function (_) {
		try {
			var filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			var document = sa.readAll(_, filter);
		} catch (e) {
			strictEqual(e.message.substring(0, 18), "Document not found", "read failed ok");
			//console.error(e.stack);
		}
	});

	it('createStreamDocument', function (_) {
		try {

			var dd = sa.open(_, null);

			var astream = ez.devices.node.reader(fs.createReadStream(fname));

			var buf;
			while (buf = astream.read(_)) {
				sa.write(_, dd, options1, buf);
			}
			var document = sa.close(_, dd, true);
			uuidRef = document.$uuid;
			checkDocument(_, document, options1);

		} catch (e) {
			console.error(e.stack);
		}
	});

	it('readStreamDocument', function (_) {
		var filter;
		try {
			filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			var dd = sa.open(_, filter);

			var astream = ez.devices.node.writer(fs.createWriteStream(fnameRead));

			var buf;
			while (buf = sa.read(_, dd)) {
				astream.write(_, buf);
			}
			astream.end();
			var data3 = fs.readFile(fnameRead, _);

			var document = sa.close(_, dd);

			checkDocument(_, document, options1);
			compareBuffers(data1, data3);
			strictEqual(data1.length, data3.length, "Buffer Length ok");

		} catch (e) {
			console.error(e.stack);
		} finally {
			// Remove document
			filter = {
				jsonWhere: {
					$uuid: uuidRef
				}
			};
			var result = sa.remove(_, filter);
		}
	});
});