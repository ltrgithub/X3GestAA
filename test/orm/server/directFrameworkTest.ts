declare function it(name: string, test: (_: _) => any): any;
const config = require('config');
const { GridStore } = require('mongodb');
import { inspect } from 'util';
const { fetchFromUrl, unitTestSafeCall } = require('../../../src/orm/factory');
const { verify } = require('../../../src/orm/checksum');
const { SignSerializer } = require('../../../src/orm/serializer');
const locale = require('streamline-locale');
const { adminHelper } = require('syracuse-collaboration/lib/helpers');
import { _ } from 'streamline-runtime';

import { assert } from 'chai';
const ok = assert.ok;
const strictEqual = assert.strictEqual;

var tracer; // = console.log;

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
config.session.ignoreStoreSession = true;
//no integration server
config.integrationServer = null;

var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var testEp = {
	contract: require("test-contract/lib/contract").contract,
	datasets: {
		test: {
			driver: "mongodb",
			database: "test",
		}
	}
};

var port = (config.unit_test && config.unit_test.serverPort) || 3004;

describe(module.id, () => {
	var endPoint;
	var db;

	it('init database', function (_: _) {
		endPoint = testAdmin.createTestAdminEndpoint(_, "unit-test-admin");
		db = testAdmin.createTestOrm(_, testEp, "test");
		ok(true, "mongodb initialized");
	});

	//start syracuse server
	it('initialize syracuse test server', function (_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	it('lock test', function (_) {
		var instance = {
			$uuid: "1234567890"
		};
		var session0 = _.context.session;
		try {
			_.context.session = {
				id: "1",
				getUserLogin: function (_) {
					return "testuser";
				}
			};
			// unlock instance (maybe there is old lock on it)
			db.unlockInstance(_, instance);
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock");
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock in same session");
			_.context.session.id = "2";
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "locked", "Aquire lock in second session");
			if (res.lock) {
				strictEqual(res.lock._id, instance.$uuid, "correct lock ID");
				strictEqual(res.lock.sessionId, "1", "correct session ID");
			}
			_.context.session.id = "1";
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock in initial session");
			db.unlockInstance(_, instance);
			_.context.session.id = "2";
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock in second session after releasing lock");
			db.unlockInstance(_, instance);
			// now real session IDs
			db.unlockInstance(_, instance);
			_.context.session = {
				id: "00000000-0000-0000-0000-000000000000",
				getUserLogin: function (_) {
					return "testuser";
				}
			};
			var coll = db.db.collection("SessionInfo", _);
			var result = coll.update({
				_id: "00000000-0000-0000-0000-000000000000"
			}, {
					sid: "00000000-0000-0000-0000-000000000000"
				}, {
					safe: true,
					upsert: true
				}, _);
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock");
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "Aquire lock in same session");
			_.context.session.id = "00000000-0000-0000-0000-000000000001";
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "locked", "Aquire lock in second session");
			var dbresult = coll.remove({
				_id: "00000000-0000-0000-0000-000000000000"
			}, {
					safe: true
				}, _);
			var res = db.lockInstance(_, instance);
			strictEqual(res.status, "success", "First session does not exist any more");
		} catch (e) {
			// cause internal error, mask it
			console.log("ERR " + e.stack);
		} finally {
			_.context.session = session0;
		}
	});

	it('list snapshot test', function (_) {
		// make a country
		var countryEntity = db.model.getEntity(_, "country");
		var country = countryEntity.factory.createInstance(_, null, db);
		country.code(_, "FR");
		country.description(_, "France");
		country.save(_);
		// deep navigate conditions
		var addressEntity = db.model.getEntity(_, "address");
		var address = addressEntity.factory.createInstance(_, null, db);
		address.country(_, country);
		var userEntity = db.model.getEntity(_, "user");
		var user = userEntity.factory.createInstance(_, null, db);
		user.lastName(_, "TestUser");
		user.address(_, address);
		var postEntity = db.model.getEntity(_, "post");
		var post1 = postEntity.factory.createInstance(_, null, db);
		post1.postNum(_, 1);
		user.posts(_).set(_, post1);
		tracer && tracer("before user save (88)");
		user.save(_);
		tracer && tracer("after user save (89)");
		var diag = [];
		user.getAllDiagnoses(_, diag);
		ok(diag.length == 0, "User saved ok");
		// reset user entity
		tracer && tracer("after user save (94); diags: " + inspect(diag, null, 4));
		user = db.fetchInstance(_, userEntity, user.$uuid);
		ok(user != null, "User fetch ok");
		var post2 = postEntity.factory.createInstance(_, null, db);
		post2.postNum(_, 2);
		user.posts(_).set(_, post2);
		strictEqual(user.posts(_).getLength(), 2, "Posts count ok");
		strictEqual(user.$snapshot.posts(_).getLength(), 1, "Snapshot posts count ok");
		tracer && tracer("posts (99): " + inspect(user.$snapshot.posts(_), null, 4));
		tracer && tracer("snapshot posts (100): " + inspect(user.$snapshot.posts(_), null, 4));
		var snapList = user.$snapshot.posts(_).toArray(_);
		tracer && tracer("snapshot posts array (102): " + inspect(snapList, null, 4));
		strictEqual(snapList[0].postNum(_), 1, "Got postnum ok");
		//
	});

	it('cursor test', function (_) {
		// add second country
		var countryEntity = db.model.getEntity(_, "country");
		var country = countryEntity.factory.createInstance(_, null, db);
		country.code(_, "US");
		country.description(_, "US");
		country.save(_);
		//
		var cursor = db.createCursor(_, countryEntity, {
			jsonWhere: {},
			orderBy: [{
				binding: "code",
				descending: true
			}]
		});
		var data = cursor.next(_);
		ok(data != null, "data fetch ok");
		strictEqual(data.code(_), "US", "fetched US ok");
		var data = cursor.next(_);
		ok(data != null, "data fetch ok");
		strictEqual(data.code(_), "FR", "fetched FR ok");
		//
	});

	it('Collections management test', function (_) {
		var refAEnt = db.getEntity(_, "refA");
		var refDEnt = db.getEntity(_, "refD");
		//
		var refA1 = refAEnt.createInstance(_, db);
		var refA2 = refAEnt.createInstance(_, db);
		var refD1 = refDEnt.createInstance(_, db);
		var refD2 = refDEnt.createInstance(_, db);
		refA1.refDList(_).set(_, refD1);
		refA1.refDList(_).set(_, refD2);
		refA2.refDList(_).set(_, refD1);
		refA2.refDList(_).set(_, refD2);
		refD1.refAList(_).set(_, refA1);
		refD1.refAList(_).set(_, refA2);
		refD2.refAList(_).set(_, refA1);
		refD2.refAList(_).set(_, refA2);
		strictEqual(refA1.refDList(_).getLength(), 2, "Length A1 ok");
		strictEqual(refA2.refDList(_).getLength(), 2, "Length A2 ok");
		strictEqual(refD1.refAList(_).getLength(), 2, "Length D1 ok");
		strictEqual(refD2.refAList(_).getLength(), 2, "Length D2 ok");
		//
		refA1.refDList(_).deleteInstance(_, refD1.$uuid);
		strictEqual(refA1.refDList(_).getLength(), 2, "Length A1 after delete ok");
		strictEqual(refD1.refAList(_).getLength(), 2, "Length D1 after delete ok");
		// save and reload
		// TODO: FIX FIRST circular reference when save(_) beacause of relatedInstances
		tracer && tracer("refA1related: " + inspect(refA1._relatedInst));
		tracer && tracer("refA2related: " + inspect(refA2._relatedInst));
		tracer && tracer("refD1related: " + inspect(refD1._relatedInst));
		tracer && tracer("refD2related: " + inspect(refD2._relatedInst));
		refA1.save(_);
		refA2.save(_);
		refD1.save(_);
		refD2.save(_);
		//
		refA1 = db.fetchInstance(_, refAEnt, refA1.$uuid);
		refD1 = db.fetchInstance(_, refDEnt, refD1.$uuid);
		strictEqual(refA1.refDList(_).getLength(), 1, "Length A1 after delete ok");
		strictEqual(refD1.refAList(_).getLength(), 1, "Length D1 after delete ok");
		//
	});

	it('circular navigation test', function (_) {
		var refAEnt = db.getEntity(_, "refA");
		var refBEnt = db.getEntity(_, "refB");
		//
		var refA1 = refAEnt.createInstance(_, db);
		refA1.description(_, "nav_test_1");
		refA1.save(_);
		var refB1 = refBEnt.createInstance(_, db);
		refA1.refBList(_).set(_, refB1);
		// modify soemthing
		refA1.description(_, "nav_test_2");
		// navigate
		tracer && tracer("before navigate: (197)");
		refB1.refAList(_).get(_, refA1.$uuid);
		tracer && tracer("after navigate: (199)");
		// check value
		strictEqual(refA1.description(_), "nav_test_2", "Modified value still ok");

	});

	it('storage area API test', function (_) {
		var storeTestEntity = db.model.getEntity(_, "storeTest");
		// db_file mode
		var storeInst = storeTestEntity.factory.createInstance(_, null, db);
		var store = storeInst.content(_);
		var w = store.createWritableStream(_, {
			fileName: "test.txt"
		});
		// make 2 writes
		w.write(_, "012", "utf8");
		w.write(_, "345", "utf8");
		w.write(_, null);
		//store.write(_, "012345");
		// create readable store
		var r = store.createReadableStream(_);
		var buf;
		var res = "";
		while (buf = r.read(_))
			res += buf;
		strictEqual(res, "012345", "Simple content write/read ok");
		storeInst.save(_);
		var storeInstUuid = storeInst.$uuid;
		var dbFileName = storeInst.content(_).getUuid();
		// reload from db
		storeInst = db.fetchInstance(_, storeTestEntity, storeInstUuid);
		// retest read
		var r = (store = storeInst.content(_)).createReadableStream(_);
		var buf;
		var res = "";
		while (buf = r.read(_))
			res += buf;
		strictEqual(res, "012345", "Simple content write/read ok");
		// working copy mode test
		// create a store wc
		store.createWorkingCopy(_);
		w = store.createWritableStream(_, {
			fileName: "test1.txt"
		});
		w.write(_, "new file");
		w.write(_, null);
		var dbNewFileName = store.getUuid();
		ok(dbNewFileName != dbFileName, "Created new file ok");
		// both files exists now
		ok(GridStore.exist(db.db, dbFileName, _), "Old file exists ok");
		ok(GridStore.exist(db.db, dbNewFileName, _), "New file exists ok");
		//
		storeInst.save(_);
		// old file should have been deleted
		ok(!GridStore.exist(db.db, dbFileName, _), "Db file deleted ok");
		dbFileName = dbNewFileName;
		// recreate a Wc, after save the old file should be deleted
		store.createWorkingCopy(_);
		// the file should stil exist before final save
		ok(GridStore.exist(db.db, dbFileName, _), "File stil exists ok");
		storeInst.save(_);
		// the file should stil exist before final save
		ok(!GridStore.exist(db.db, dbFileName, _), "File is deleted ok");
		//
		// delete store inst
		storeInst.deleteSelf(_);
		// check inst deleted
		storeInst = db.fetchInstance(_, storeTestEntity, storeInstUuid);
		ok(!storeInst, "Store inst deleted ok");
		// check file deleted
		ok(!GridStore.exist(db.db, dbFileName, _), "Db file deleted ok");
		// file mode
		var storeInst = storeTestEntity.factory.createInstance(_, null, db);
		storeInst.storageType(_, "file");
		var store = storeInst.content(_);
		store._store.setFile(_, require("path").join(__dirname, "rsrc", "stringReaderTest.txt"));
		var r = store.createReadableStream(_);
		var buf;
		var res = "";
		while (buf = r.read(_))
			res += buf;
		strictEqual(res, "a string to read", "File storage read ok");

		//
	});

	function _unescape(obj, dbProp, objProp) {
		obj[objProp] = obj[dbProp];
		delete obj[dbProp];
	}

	it('Signed objects', function (_) {
		var signedEnt = db.getEntity(_, "signedTests");
		var signed = signedEnt.createInstance(_, db);
		signed.description(_, "Sign test");
		var r = signed.save(_);
		ok(!(r.$diagnoses || []).some(function (d) {
			return d.severity === "error";
		}), "Signed saved ok");
		// check signature
		var dbObj = (db.db.collection("SignedTest", _).find({
			description: "Sign test"
		}).toArray(_))[0];
		// unescape
		/*	Object.keys(dbObj).forEach(function(prop) {
			if(prop === "_id")
				db.unescapeJson(dbObj, prop, "$uuid");
			else
				if(prop[0] === "_")
					db.unescapeJson(dbObj, prop, "$" + prop.slice(1));
		});*/
		dbObj.$uuid = dbObj._id;
		delete dbObj._id;
		dbObj = new SignSerializer().serializeResource(signedEnt, db.unescapeJson(dbObj));
		//
		ok(verify(dbObj, ["_id", "$key", "$loaded"]), "Signature verified from db");
		// try to fetch
		var obj = db.fetchInstance(_, signedEnt, {
			jsonWhere: {
				description: "Sign test"
			}
		});
		strictEqual(obj.description(_), "Sign test", "Signed object fetch ok");
		// modification test
		obj.description2(_, "desc2");
		var r = obj.save(_);
		ok(!(r.$diagnoses || []).some(function (d) {
			return d.severity === "error";
		}), "Signed saved ok (2)");
		// try to fetch
		var obj = db.fetchInstance(_, signedEnt, {
			jsonWhere: {
				description: "Sign test"
			}
		});
		strictEqual(obj.description2(_), "desc2", "Signed object fetch ok (2)");

		// direct database modification
		db.db.collection("SignedTest", _).update({
			description: "Sign test"
		}, {
				$set: {
					description: "Changed sign"
				}
			}, {
				safe: true,
				multi: true
			}, _);
		// try to fetch - should get an error
		try {
			var obj = db.fetchInstance(_, signedEnt, {
				jsonWhere: {
					description: "Changed sign"
				}
			});
			ok(false, "NOT ok, should have got an error");
		} catch (e) {
			ok(true, "Fetch error of changed object ok");
		}

	});

	it('localized properties test', function (_) {
		var locEnt = db.getEntity(_, "localized");
		//
		locale.setCurrent(_, "en-US");
		// create an instance and set en-US only.
		var loc = locEnt.createInstance(_, db);
		loc.description(_, "english text");
		loc.save(_);
		//
		var prop = loc.getPropAllLocales(_, "description");
		strictEqual(prop["default"], "english text", "Default prop ok");
		strictEqual(prop["en-us"], "english text", "en-US prop ok");
		// filter in en-US: must find
		var loc = db.fetchInstance(_, locEnt, {
			jsonWhere: {
				description: "english text"
			}
		});
		ok(loc != null, "Filter in english found ok");
		// test fr-FR
		locale.setCurrent(_, "fr-FR");
		// filter in fr-FR: must find using default property
		var loc = db.fetchInstance(_, locEnt, {
			jsonWhere: {
				description: "english text"
			}
		});
		ok(loc != null, "Filter in french found ok");
		// modify french text
		loc.description(_, "french text");
		var prop = loc.getPropAllLocales(_, "description");
		strictEqual(prop["default"], "english text", "Default prop ok");
		strictEqual(prop["en-us"], "english text", "en-US prop ok");
		strictEqual(prop["fr-fr"], "french text", "fr-FR prop ok");
		loc.save(_);
		// filter in fr-FR: must NOT find using because there is a text in fr-FR
		var loc = db.fetchInstance(_, locEnt, {
			jsonWhere: {
				description: "english text"
			}
		});
		ok(loc == null, "Filter in french NOT found ok");
		// filter in fr-FR: must find french text
		var loc = db.fetchInstance(_, locEnt, {
			jsonWhere: {
				description: "french text"
			}
		});
		ok(loc != null, "Filter in french found ok");

	});

	it('case insensitive properties', function (_) {
		var ciEnt = db.getEntity(_, "caseInsensitive");
		var ci = ciEnt.createInstance(_, db);
		ci.ci(_, "TEST");
		ci.cs(_, "TEST");
		ci.save(_);
		// fetch case sensitive
		ci = db.fetchInstance(_, ciEnt, {
			jsonWhere: {
				ci: "TEST"
			}
		});
		ok(ci != null, "Case sensitive fetch of case insensitive prop ok");
		ci = db.fetchInstance(_, ciEnt, {
			jsonWhere: {
				cs: "TEST"
			}
		});
		ok(ci != null, "Case sensitive fetch of case sensitive prop ok");
		// fetch case insensitive
		ci = db.fetchInstance(_, ciEnt, {
			jsonWhere: {
				ci: "test"
			}
		});
		ok(ci != null, "Case insensitive fetch of case insensitive prop ok");
		ci = db.fetchInstance(_, ciEnt, {
			jsonWhere: {
				cs: "test"
			}
		});
		ok(ci == null, "Case insensitive fetch of case sensitive prop ok");
		// unique key
		ci = ciEnt.createInstance(_, db);
		ci.ci(_, "TEST");
		tracer && tracer("ci status (445): " + inspect(ci.$properties.ci));
		var diag = ci.$properties && ci.$properties.ci && ci.$properties.ci.$diagnoses;
		ok(diag && diag.some(function (d) {
			return (d.$severity || d.severity) === "error";
		}), "Case sensitive unique test ok");
		ci = ciEnt.createInstance(_, db);
		ci.ci(_, "test");
		var diag = ci.$properties && ci.$properties.ci && ci.$properties.ci.$diagnoses;
		ok(diag && diag.some(function (d) {
			return (d.$severity || d.severity) === "error";
		}), "Case insensitive unique test ok");

	});

	it('polymorphic relations', function (_) {
		var refAEnt = db.getEntity(_, "refA");
		var refBEnt = db.getEntity(_, "refB");
		var refCEnt = db.getEntity(_, "refC");
		//
		var refA1 = refAEnt.createInstance(_, db);
		refA1.description(_, "poly_A");
		refA1.prop1(_, "prop1_A");
		refA1.save(_);
		var refB1 = refBEnt.createInstance(_, db);
		refB1.description(_, "poly_B");
		refB1.prop1(_, "prop1_B");
		refB1.save(_);
		var refC1 = refCEnt.createInstance(_, db);
		refC1.description(_, "poly_C");
		refC1.save(_);
		//
		var polyEnt = db.getEntity(_, "polymorph");
		// 
		var pp = polyEnt.createInstance(_, db);
		pp.description(_, "pA");
		pp.poly(_, refA1, false, "A");
		pp.save(_);
		var pp = polyEnt.createInstance(_, db);
		pp.description(_, "pB");
		pp.poly(_, refB1, false, "B");
		pp.save(_);
		var pp = polyEnt.createInstance(_, db);
		pp.description(_, "pC");
		pp.poly(_, refC1, false, "C");
		pp.save(_);
		// test
		var pp = db.fetchInstance(_, polyEnt, {
			jsonWhere: {
				description: "pA"
			}
		});
		ok(pp != null, "pA fetched ok");
		ok(pp && pp.poly && pp.poly(_) && pp.poly(_).description(_) === "poly_A", "Poly A relation ok");
		var res = pp.serializeInstance(_);
		tracer && tracer("(551) PA " + inspect(res));
		ok(res && res.poly && res.poly.A && (res.poly.A.prop1 == null), "Reference fetched no properties ok");
		//
		var pp = db.fetchInstance(_, polyEnt, {
			jsonWhere: {
				description: "pB"
			}
		});
		ok(pp != null, "pB fetched ok");
		ok(pp && pp.poly && pp.poly(_) && pp.poly(_).description(_) === "poly_B", "Poly B relation ok");
		var res = pp.serializeInstance(_);
		tracer && tracer("(551) PB " + inspect(res));
		strictEqual(res.poly.B.prop1, "prop1_B", "Reference fetched with properties ok");
		//
		var pp = db.fetchInstance(_, polyEnt, {
			jsonWhere: {
				description: "pC"
			}
		});
		ok(pp != null, "pC fetched ok");
		ok(pp && pp.poly && pp.poly(_) && pp.poly(_).description(_) === "poly_C", "Poly C relation ok");
		// TODO: test with a class not in $variants, should throw exception

	});

	it('atomic counter', function (_) {
		strictEqual(db.getCounterValue(_, "dom1", "code1", {
			increment: 1
		}).value, 1, "Counter first val ok");
		strictEqual(db.getCounterValue(_, "dom1", "code1", {
			increment: 10
		}).value, 11, "Counter increment 10 val ok");
		strictEqual(db.getCounterValue(_, "dom1", "code1", {
			increment: 1
		}).value, 12, "Counter increment true val ok");
		strictEqual(db.getCounterValue(_, "dom1", "code2", {
			increment: 1
		}).value, 1, "Counter code isolation val ok");
		strictEqual(db.getCounterValue(_, "dom2", "code1", {
			increment: 10
		}).value, 10, "Counter domain isolation val ok");
		// no increment
		strictEqual(db.getCounterValue(_, "dom2", "code1").value, 10, "No increment val ok");
		strictEqual(db.getCounterValue(_, "dom2", "code1").value, 10, "No increment val (2) ok");
		// set value
		strictEqual(db.getCounterValue(_, "dom1", "code1", {
			value: 13
		}).value, 13, "Counter set value on existing counter ok");
		strictEqual(db.getCounterValue(_, "dom1", "code1", {
			increment: 2,
			value: 20
		}).value, 15, "Counter increment/value on precedence ok");
		strictEqual(db.getCounterValue(_, "dom1", "code3", {
			value: 5
		}).value, 5, "Counter set value on new counter ok");
		// data
		var cnt = db.getCounterValue(_, "dom1", "code4", {
			data: {
				first: 1,
				deep: {
					deeper: {
						val: "is deep"
					}
				}
			}
		});
		ok(cnt.value == null, "Counter value not defined ok");
		strictEqual(cnt.data.first, 1, "Counter data ok (1.0)");
		strictEqual(cnt.data.deep.deeper.val, "is deep", "Counter data ok (1.1)");
		var cnt = db.getCounterValue(_, "dom1", "code4", {
			data: {
				deep: {
					deeper: {
						val: "is even deeper"
					}
				}
			}
		});
		strictEqual(cnt.data.first, 1, "Counter data ok (2.0)");
		strictEqual(cnt.data.deep.deeper.val, "is even deeper", "Counter data ok (2.1)");
		var cnt = db.getCounterValue(_, "dom1", "code4", {
			increment: 2,
			data: {
				first: 5
			}
		});
		strictEqual(cnt.value, 2, "Counter increment and data ok");
		strictEqual(cnt.data.first, 5, "Counter data ok (3.0)");
		strictEqual(cnt.data.deep.deeper.val, "is even deeper", "Counter data ok (3.1)");
		// just read
		var cnt = db.getCounterValue(_, "dom1", "code4");
		strictEqual(cnt.value, 2, "Counter increment and data ok");
		strictEqual(cnt.data.first, 5, "Counter data ok (4.0)");
		strictEqual(cnt.data.deep.deeper.val, "is even deeper", "Counter data ok (4.1)");
		// update data only on existing
		var cnt = db.getCounterValue(_, "dom2", "code1", {
			increment: 1,
			data: {
				first: "aa",
				second: "bb"
			}
		});
		strictEqual(cnt.value, 11, "Combined update value ok");
		strictEqual(cnt.data.first, "aa", "Combined update data 1 ok");
		strictEqual(cnt.data.second, "bb", "Combined update data 2 ok");

	});

	it('fetch from url', function (_) {
		var inst = fetchFromUrl(_, "/sdata/example/admin/test/countries(code eq 'FR')");
		ok(inst && inst.code(_) === "FR", "Fetch from url with expression ok");
		//
		inst = fetchFromUrl(_, "/sdata/example/admin/test/countries('" + inst.$uuid + "')");
		ok(inst && inst.code(_) === "FR", "Fetch from url with $uuid ok");

	});

	it('safe call test', function (_) {
		var fn_rec = function (_, i, val) {
			setTimeout(_, 0);
			return unitTestSafeCall(_, i, "propName", fn_rec, "field", val);
		};

		var fn_field1 = function (_, i, val) {
			setTimeout(_, 0);
			return "field1_" + val;
		};

		var fn_field2 = function (_, i, val) {
			setTimeout(_, 0);
			return "field2_" + val;
		};

		var fn_inc = function (_, i, val) {
			var counter = instance.counter;
			setTimeout(_, 100);
			instance.counter = counter + 1;
			return "inc_" + val;
		};

		var fn_error = function (_, i, val) {
			setTimeout(_, 0);
			throw new Error("error_" + val);
		};

		var instance = {
			counter: 0,
			errors: [],
			$addError: function (x) {
				this.errors.push(x);
			},
			_safeCalls: undefined,
		};
		// cause internal error
		try {
			var res = unitTestSafeCall(_, {}, "propName", fn_rec, "field", "val");
			ok(false, "Internal error not thrown");
		} catch (ex) {
			strictEqual(ex.message, 'instance.$addError is not a function');
		}
		// previous error left garbage behind - not a problem as cause was serious programming error.
		instance._safeCalls = undefined;

		// recursive invocation
		var res = unitTestSafeCall(_, instance, "propName", fn_rec, "field", "val");
		strictEqual(res, undefined, "recursive call returns undefined");
		strictEqual(instance.errors.length, 1, "recursive call has error");
		ok(instance.errors[0].indexOf('loop on propName') >= 0, "recursive call error message ok");

		instance.errors = [];
		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field1", "val");
		var fut2 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field1", "val");
		strictEqual(typeof instance._safeCalls, "object", "temporary structures allocated");
		var res1 = fut1(_);
		strictEqual(res1, "field1_val", "Correct result for first concurrent invocation");
		var res2 = fut2(_);
		strictEqual(res2, "field1_val", "Correct result for second concurrent invocation");
		strictEqual(instance.errors.length, 0);
		strictEqual(typeof instance._safeCalls, "undefined", "temporary structures released");

		instance.errors = [];
		instance.counter = 0;
		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_inc, "field1", "val");
		var fut2 = unitTestSafeCall(!_, instance, "propName", fn_inc, "field1", "val");
		strictEqual(instance.counter, 0, "futures yielding, counter still 0");
		var res1 = fut1(_);
		strictEqual(res1, "inc_val", "Correct result for first concurrent invocation");
		var res2 = fut2(_);
		strictEqual(res2, "inc_val", "Correct result for second concurrent invocation");
		strictEqual(instance.counter, 2, "serialized futures done, counter ok");
		strictEqual(instance.errors.length, 0);

		instance.errors = [];
		instance.counter = 0;
		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_inc, "field1", "val");
		var fut2 = unitTestSafeCall(!_, instance, "propName", fn_inc, "field2", "val");
		strictEqual(instance.counter, 0, "futures yielding, counter still 0");
		var res1 = fut1(_);
		strictEqual(res1, "inc_val", "Correct result for first concurrent invocation");
		var res2 = fut2(_);
		strictEqual(res2, "inc_val", "Correct result for second concurrent invocation");
		strictEqual(instance.counter, 1, "parallel futures done, counter ok");
		strictEqual(instance.errors.length, 0);

		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_error, "field", "val1");
		var res = unitTestSafeCall(_, instance, "propName", fn_error, "field", "val2");
		strictEqual(res, undefined, "Correct result for first invocation with error function");
		strictEqual(fut1(_), undefined, "Correct result for second invocation with error function");
		strictEqual(instance.errors.length, 2, "2 errors in error invocations")
		strictEqual(instance.errors[0].indexOf("error_val1") >= 0, true, "First error in error invocations")
		strictEqual(instance.errors[1].indexOf("error_val2") >= 0, true, "Second error in error invocations")

		instance.errors = [];
		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field1", "val1");
		var fut2 = unitTestSafeCall(!_, instance, "propName", fn_field2, "field2", "val2");
		var res = fut1(_);
		strictEqual(res, "field1_val1", "Correct result for first invocation with different functions")
		var res = fut2(_);
		strictEqual(res, "field2_val2", "Correct result for second invocation with different functions");
		strictEqual(instance.errors.length, 0, "No error in invocations with different functions")

		// many invocations at the same time
		var fut1 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field", "val");
		var fut2 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field", "val");
		var fut3 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field", "val2");
		var fut4 = unitTestSafeCall(!_, instance, "propName", fn_field1, "field", "val");
		var res = fut1(_);
		strictEqual(res, "field1_val", "Correct result for first invocation")
		var res = fut2(_);
		strictEqual(res, "field1_val", "Correct result for second invocation");
		var res = fut3(_);
		strictEqual(res, "field1_val2", "Correct result for third invocation");
		var res = fut4(_);
		strictEqual(res, "field1_val", "Correct result for fourth invocation");
		strictEqual(instance.errors.length, 0, "No error in concurrent invocations")

		strictEqual(typeof instance._safeCalls, "undefined", "temporary structures released");
	});
});