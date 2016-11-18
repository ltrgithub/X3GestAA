"use strict";
var util = require('util');
var tracer; // = console.log;
var globals = require('streamline-runtime').globals;
var adminTestFixtures = require("../../../test/collaboration/fixtures/adminTestFixtures");

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	var db;
		it('init environnement', function(_) {
			//
			try {
				db = adminTestFixtures.initializeTestEnvironnement(_);
			} catch (e) {}
			ok(db != null, "Environnement initialized");
			//
		});



		var step = require('../../../src/license/check')._st;
		var newLicense = require('../../../src/license/check')._nl;
		var licenseData = {
			WSSIZELIMIT: 2048, // MB
			WSPERIOD: "DAY", // (a string: DAY, MONTH or YEAR).
			WSGRACESLOWDOWN: 5, // (slowdown factor when limit is exceeded, 5 for 5 times slower)
			WSGRACELIMIT: 25, // (as a percentage that we add to WSSIZELIMIT)
		};
		var licenseData2 = {
			WSSIZELIMIT: 2048, // MB
			WSPERIOD: "MONTH", // (a string: DAY, MONTH or YEAR).
			WSGRACESLOWDOWN: 6, // (slowdown factor when limit is exceeded, 5 for 5 times slower)
			WSGRACELIMIT: 25, // (as a percentage that we add to WSSIZELIMIT)
		};

		//function _step(_, length, "x", data, licenseData, timeString)


		// General remark: These unit tests simulate different servers and the database. Therefore they use the internal functions
		// of the Web service part of check._js and put in special parameters
		// The database content is always in the "$" attribute. So when switching between different servers, the "$" attribute must
		// be copied.
		// When deliberately changing "database" contents, the contents of "$" must be cloned so that not the "local" data object
		// is not changed, too. 


		function value(_, insts) {
			var arr = insts.map_(_, function(_, item) {
				var v = item.product(_) + "|" + item.counter(_) + "|" + item.server(_) + "|" + item.period(_);
				return v;
			});
			arr = arr.sort();
			return JSON.stringify(arr);
		}

		it('step test', function(_) {
			try {
				// delete
				var insts = db.fetchInstances(_, db.getEntity(_, "licenseWsOld"));
				insts.forEach_(_, function(_, inst) {
					inst.deleteSelf(_);
				});

				var licenseData3 = {
					WSSIZELIMIT: 1024, // MB
					WSPERIOD: "YEAR", // (a string: DAY, MONTH or YEAR).
					WSGRACESLOWDOWN: 8, // (slowdown factor when limit is exceeded, 5 for 5 times slower)
					WSGRACELIMIT: 25, // (as a percentage that we add to WSSIZELIMIT)
				};
				var data = {};
				// _step(_, length, "x", data, key, licenseData, timeString)
				var result = step(_, 1 << 30, "x", data, 'A', licenseData, '2015-05-05T09:00:00.000Z');
				strictEqual(result, 0, "Load 1 GB of 2");
				strictEqual(data.x.counter, 1 << 30, "Correct counter 1");
				var result = step(_, 1 << 30, "x", data, 'A', licenseData, '2015-05-05T09:01:00.000Z');
				strictEqual(result, 0, "Load 2 GB of 2");
				strictEqual(data.x.counter, 2147483648, "Correct counter 2");
				var result = step(_, 1, "x", data, 'A', licenseData, '2015-05-05T09:02:00.000Z');
				strictEqual(result, 5, "Load 2 GB of 2 plus 1");
				var result = step(_, (1 << 29) - 1, "x", data, 'A', licenseData, '2015-05-05T09:03:00.000Z');
				strictEqual(result, 5, "Load 2 GB of 2 plus 25%");
				strictEqual(data.x.counter, 2684354560, "Correct counter 3");
				var result = step(_, 1, "x", data, 'A', licenseData, '2015-05-05T09:04:00.000Z');
				strictEqual(result, -1, "Load 2 GB of 2 plus 25% plus 1");
				strictEqual(data.x.counter, 2684354561, "Correct counter 3");
				var insts = db.fetchInstances(_, db.getEntity(_, "licenseWsOld"));
				strictEqual(insts.length, 0, "No old instances yet");
				// new period
				var result = step(_, 7, "x", data, 'A', licenseData, '2015-05-06T00:04:00.000Z');
				strictEqual(result, 0, "New day");
				strictEqual(data.x.counter, 7, "Correct counter 3");
				var insts = db.fetchInstances(_, db.getEntity(_, "licenseWsOld"));
				strictEqual(insts.length, 1, "One old instance");
				strictEqual(value(_, insts), '["x|2684354561|A|2015-05-05"]', "Correct old values 3");
				newLicense(data);
				var result = step(_, 1 << 30, "x", data, 'A', licenseData2, '2015-05-06T09:00:00.000Z');
				strictEqual(result, 0, "Load 1 GB of 2 plus 7");
				strictEqual(data.x.counter, 1073741831, "Correct counter 4");
				var result = step(_, (1 << 30) - 7, "x", data, 'A', licenseData2, '2015-05-17T09:00:00.000Z');
				strictEqual(result, 0, "Load 2 GB of 2");
				strictEqual(data.x.counter, 2147483648, "Correct counter 5");
				var result = step(_, 1, "x", data, 'A', licenseData2, '2015-05-27T09:00:00.000Z');
				strictEqual(result, 6, "Load 2 GB of 2 plus 1");
				strictEqual(data.x.counter, 2147483649, "Correct counter 6");
				var result = step(_, 1, "x", data, 'A', licenseData2, '2015-06-01T09:00:00.000Z');
				var insts = db.fetchInstances(_, db.getEntity(_, "licenseWsOld"));
				strictEqual(insts.length, 2, "2 instances");
				strictEqual(value(_, insts), '[\"x|2147483649|A|2015-05\",\"x|2684354561|A|2015-05-05\"]', "Correct old instances 6");
				strictEqual(result, 0, "Load 1");
				strictEqual(data.x.counter, 1, "Correct counter 7");
				newLicense(data);
				var result = step(_, 6, "x", data, 'A', licenseData3, '2015-06-06T09:00:00.000Z');
				strictEqual(result, 0, "Load 6");
				strictEqual(data.x.counter, 7, "Correct counter 8");
				var result = step(_, (1 << 30) - 7, "x", data, 'A', licenseData3, '2015-11-17T09:00:00.000Z');
				strictEqual(result, 0, "Load 1 GB of 1");
				strictEqual(data.x.counter, 1073741824, "Correct counter 9");
				var result = step(_, 1 << 28, "x", data, 'A', licenseData3, '2015-12-27T09:00:00.000Z');
				strictEqual(result, 8, "Load 1.25 GB of 1");
				strictEqual(data.x.counter, 1342177280, "Correct counter 10");
				var result = step(_, 1, "x", data, 'A', licenseData3, '2015-12-31T09:00:00.000Z');
				strictEqual(result, -1, "Load 1.25 GB of 1 plus 1");
				strictEqual(data.x.counter, 1342177281, "Correct counter 11");
				var result = step(_, 1, "x", data, 'A', licenseData3, '2016-12-31T09:00:00.000Z');
				strictEqual(result, 0, "Load 1");
				strictEqual(data.x.counter, 1, "Correct counter 12");
				// test whether counter is reset only when period is shrunk
				newLicense(data);
				var result = step(_, 13, "x", data, 'A', licenseData2, '2016-12-31T09:00:01.000Z');
				strictEqual(result, 0, "Load 1");
				strictEqual(data.x.counter, 13, "Correct counter 13 after period shrinking (reset counter)");
				newLicense(data);
				var result = step(_, 14, "x", data, 'A', licenseData3, '2016-12-31T09:00:02.000Z');
				strictEqual(result, 0, "Load 1");
				strictEqual(data.x.counter, 27, "Correct counter 14 after period extension (not reset counter)");
				newLicense(data);
				var result = step(_, 15, "x", data, 'A', licenseData3, '2016-12-31T09:00:03.000Z');
				strictEqual(result, 0, "Load 1");
				strictEqual(data.x.counter, 42, "Correct counter 14 after no change of period (not reset counter)");
				var insts = db.fetchInstances(_, db.getEntity(_, "licenseWsOld"));
				strictEqual(insts.length, 3, "3 old instances");
				strictEqual(value(_, insts), '[\"x|1342177281|A|2015\",\"x|2147483649|A|2015-05\",\"x|2684354561|A|2015-05-05\"]', "Correct old instances in the end");


			} catch (e) {
				console.log(e.stack);

			} finally {

			}
		});

		it('server restart test', function(_) {
			try {

				var data = {};
				// _step(_, length, "x", data, key, licenseData, timeString)
				var result = step(_, 12, "x", data, 'A', licenseData, '2015-05-05T09:00:00.000Z');
				// "$" attribute contains database content (in this mock situation for tests)
				var dataB = {
					"$": data.$
				};
				var result = step(_, 15, "x", dataB, 'B', licenseData, '2015-05-05T09:00:00.000Z');
				// simulate restart: clear all non-persistent data
				data = {
					"$": dataB.$
				};
				var result = step(_, 13, "x", data, 'A', licenseData, '2015-05-05T10:00:00.000Z');
				strictEqual(data.x.counter, 25, "Take values from database");
				strictEqual(data.x.other, 15, "Take values from database");

				var data = {};
				// _step(_, length, "x", data, key, licenseData, timeString)
				var result = step(_, 12, "x", data, 'A', licenseData, '2015-05-05T09:00:00.000Z');
				// "$" attribute contains database content (in this mock situation for tests)
				var dataB = {
					"$": data.$
				};
				var result = step(_, 15, "x", data, 'B', licenseData, '2015-05-05T09:00:00.000Z');
				// simulate restart: clear all non-persistent data
				data = {
					"$": dataB.$
				};
				var result = step(_, 13, "x", data, 'A', licenseData, '2015-05-06T10:00:00.000Z');
				strictEqual(data.x.counter, 13, "Ignore values from database (because too old)");
				strictEqual(data.x.other, 0, "Ignore values from database");

			} catch (e) {
				console.log(e.stack);

			} finally {

			}
		});


		it('step test with different servers', function(_) {
			// 3 different data objects simulate 3 servers. The "$" attribute corresponds to the database content;
			try {
				var dataA = {};
				var dataB = {};
				var dataC = {};
				// _step(_, length, "x", data, key, licenseData, timeString)
				var result = step(_, 1, "x", dataA, 'A', licenseData, '2015-05-05T09:00:00.000Z');
				strictEqual(result, 0, "Load 1 A");
				strictEqual(dataA.x.counter, 1, "Correct counter 1");
				strictEqual(dataA.x.other, 0, "Correct other 0");
				dataB.$ = dataA.$;
				var result = step(_, 1, "x", dataB, 'B', licenseData, '2015-05-05T09:00:00.000Z');
				strictEqual(result, 0, "Load 1 B");
				strictEqual(dataB.x.counter, 1, "Correct counter 1");
				strictEqual(dataB.x.other, 1, "Correct other 1");
				dataA.$ = dataB.$;
				var result = step(_, 1, "x", dataA, 'A', licenseData, '2015-05-05T09:10:00.000Z');
				strictEqual(result, 0, "Load 2 A (with contact)");
				strictEqual(dataA.x.counter, 2, "Correct counter 2");
				strictEqual(dataA.x.other, 1, "Correct other 1");
				dataB.$ = dataA.$;
				var result = step(_, 2, "x", dataB, 'B', licenseData, '2015-05-05T09:05:00.000Z');
				strictEqual(result, 0, "Load 2 B (without contact)");
				strictEqual(dataB.x.counter, 3, "Correct counter 2");
				strictEqual(dataB.x.other, 1, "Correct other 1");
				dataA.$ = dataB.$;
				var result = step(_, 1 << 30, "x", dataA, 'A', licenseData, '2015-05-05T09:15:00.000Z');
				strictEqual(result, 0, "Load 4 A (without contact)");
				strictEqual(dataA.x.counter, 1073741826, "Correct counter 1073741826");
				strictEqual(dataA.x.other, 1, "Correct other still 1");
				dataB.$ = dataA.$;
				var result = step(_, 1 << 30, "x", dataB, 'B', licenseData, '2015-05-05T09:15:00.000Z');
				strictEqual(result, 0, "Load 4 B (with contact)");
				strictEqual(dataB.x.counter, 1073741827, "Correct counter 1073741827");
				strictEqual(dataB.x.other, 2, "Correct other 1");
				dataA.$ = dataB.$;
				var result = step(_, 3, "x", dataA, 'A', licenseData, '2015-05-05T09:25:00.000Z');
				strictEqual(result, 5, "Load 4 A (with contact)");
				strictEqual(dataA.x.counter, 1073741829, "Correct counter 1073741829");
				strictEqual(dataA.x.other, 1073741827, "Correct other 1073741827");
				dataC.$ = dataA.$;
				var result = step(_, 4, "x", dataC, 'C', licenseData, '2015-05-05T09:25:00.000Z');
				strictEqual(result, 5, "Load 4 C (with contact)");
				strictEqual(dataC.x.counter, 4, "Correct counter 1");
				strictEqual(dataC.x.other, 2147483656, "Correct other 21474083656");
				var result = step(_, 1, "x", dataC, 'C', licenseData, '2015-05-06T09:25:00.000Z');
				strictEqual(result, 0, "Load 5 next day (with contact)");
				strictEqual(dataC.x.counter, 1, "Correct counter 1");
				strictEqual(dataC.x.other, 0, "Correct other 0");
			} catch (e) {
				console.log(e.stack);
			} finally {

			}

		});

		it('error conditions', function(_) {
			try {

				// _step(_, length, "x", data, key, licenseData, timeString)
				var data = {};
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T08:00:00.000Z');
				var dataB = {
					"$": data.$
				};
				var result = step(_, 19, "x", dataB, 'B', licenseData2, '2015-05-05T08:01:00.000Z');
				data.$ = dataB.$;
				// again contact with data
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T08:10:00.000Z');
				// make counter smaller
				data.$ = JSON.parse(JSON.stringify(data.$)); // duplicate object
				data.$.data["B/x"] = data.$.data["B/x"].substr(1);
				var error = false;
				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T09:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(true, error, "Error occurred when making counter smaller");

				// earlier timestamp
				var data = {
					"$": {
						data: {
							"B/x": "25;2015-05-05T09:00:00.000Z;94c345676f3c30c977af6945012741e2;7"
						}
					}
				};
				// _step(_, length, "x", data, key, licenseData, timeString)
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T09:00:00.000Z');
				// make counter smaller
				data.$ = JSON.parse(JSON.stringify(data.$)); // duplicate object
				data.$.data["B/x"] = '19;2015-05-05T08:44:44.000Z;94c345676f3c30c977af6945012741e2;7';

				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-06T09:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(true, error, "Error occurred when making timestamp lower");

				// earlier timestamp
				var data = {
					"$": {
						data: {
							"B/x": "25;2015-05-05T09:00:00.000Z;94c345676f3c30c977af6945012741e2;7"
						}
					}
				};
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T09:00:00.000Z');
				// make counter smaller
				data.$ = JSON.parse(JSON.stringify(data.$)); // duplicate object
				data.$.data["B/x"] = '25;2015-05-05T10:00:00.000Z;9b851c9c01ad4f097c25b9b674d70750;7';
				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-06T09:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(false, error, "No error occurred when making timestamp higher");

				// allowed cases for counter decrease: before beginning of current license
				var data = {
					"$": {
						data: {
							"B/x": "25;2015-05-05T09:00:00.000Z;94c345676f3c30c977af6945012741e2;7"
						}
					}
				};
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T10:00:00.000Z');
				var dataB = {
					"$": data.$
				};
				var result = step(_, 19, "x", data, 'B', licenseData2, '2015-05-05T11:00:00.000Z');
				data.$ = dataB.$;
				var error = false;
				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T11:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(false, error, "No error occurred when counter decrease before beginning of current license");
				// allowed cases for counter decrease: before beginning of period
				var data = {
					"$": {
						data: {
							"B/x": "25;2015-05-05T09:00:00.000Z;94c345676f3c30c977af6945012741e2;7"
						}
					}
				};
				var result = step(_, 19, "x", data, 'A', licenseData2, '2015-05-05T10:00:00.000Z');
				var dataB = {
					"$": data.$
				};
				var result = step(_, 19, "x", data, 'B', licenseData2, '2015-06-05T11:00:00.000Z');
				data.$ = dataB.$;
				var error = false;
				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-06-05T11:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(false, error, "No error occurred when counter decrease before beginning of period");
				var data = {
					"$": {
						data: {
							"B/x": "25;2015-05-05T09:00:00.000Z;XXX;7"
						}
					}
				};
				try {
					var result = step(_, 19, "x", data, 'A', licenseData2, '2015-06-05T11:10:00.000Z');
					error = false;
				} catch (e) {
					error = true;
				}
				strictEqual(true, error, "Wrong checksum");

			} catch (e) {
				console.log(e.stack);
			} finally {}
		})
});