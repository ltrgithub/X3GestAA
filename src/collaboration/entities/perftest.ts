"use strict";

var util = require("util");
var tracer; // = console.log
var cr = require('crypto');
var dbDriver = require('../../load-balancer/dbDriver');
var config = require('config');
var ez = require("ez-streams");
var adminHelper = require("../../collaboration/helpers").AdminHelper;
var x3client = require('syracuse-x3/lib/client');
var flows = require('streamline-runtime').flows;

//performance test for server
//executes a native function (pbkdf2 of crypto module) which takes much CPU time to perform and cannot
//be optimized away using Just in time compilers. Therefore its execution time is rather reliable.
//The execution time of pbkdf2 is roughly proportional to the value in the 3rd parameter which specifies
//the number of iterations.
//The value will be adjusted after each execution of "pbkdf2" so that the execution time will be about 
//SINGLE_COMPUTE_TIME milliseconds. Therefore the total test time will be about the same both on fast
//and slow machines.
//When there has been an execution which takes more than MIN_COMPUTE_TIME milliseconds, the next execution 
//will be done later (using process.nextTick). Therefore also the total load of the server and the queue
//can be investigated. When about MAXMILLIS milliseconds have passed since the first invocation, the results
//will be returned.
//The current value for SINGLE_COMPUTE_TIME ensures that the server is not blocked too long for a single
//execution of "pbkdf2".
//Interpretation of results: "speed": average number of "pbkdf2" iterations per millisecond (only considers
//           real computing time, not the wait time in the node.js queue)
//"percent": percentage of real computing time for "pbkdf2" as part of total time for this function. When
//          there is much load, the value will be lower
//"testTime": number of milliseconds which have passed since invocation of the function
function perfTest(callback) {

	var anz = 10;
	var pwd = new Buffer("abcde");
	var salt = new Buffer("xyz");
	var total = 0;
	var computeMillis = 0;
	var SINGLE_COMPUTE_TIME = 20;
	var MIN_COMPUTE_TIME = 2; // Math.floor(SINGLE_COMPUTE_TIME/10)
	var MAXMILLIS = 1000;
	var startMillis = Date.now();

	function test() {
		var noStart = Date.now();
		if (noStart - startMillis <= MAXMILLIS) {
			var no = noStart;
			var no2 = no;
			do {
				cr.pbkdf2Sync(pwd, salt, anz, 200);
				total += anz;
				no2 = Date.now();
				if (no2 - no <= MIN_COMPUTE_TIME) {
					anz *= 10; // very short execution times are unreliable
					no = no2;
					continue;
				} else {
					anz = 1 + Math.floor((anz * SINGLE_COMPUTE_TIME) / (no2 - no));
					break;
				}
			} while (no - noStart < SINGLE_COMPUTE_TIME);
			computeMillis += (no2 - noStart);
			if (no2 - startMillis <= MAXMILLIS) {
				setImmediate(test);
				return;
			} else {
				noStart = no2;
			}
		}
		var speed = total / ((computeMillis > 1) ? computeMillis : 1);
		if (speed < 1) speed = Math.round(1000 * speed) / 1000;
		else if (speed < 10) speed = Math.round(100 * speed) / 100;
		else if (speed < 100) speed = Math.round(10 * speed) / 10;
		return callback(null, {
			speed: speed,
			testTime: (noStart - startMillis),
			percent: Math.round(1000 * computeMillis / (noStart - startMillis)) / 10
		});
	}

	test();
}


function elasticTest(_) {
	var reg = /^\{\"took\"\:(\d+)/;
	// parse answer to get number of milliseconds on server. Answer starts with '{"took":'.
	function _getServerTime(_, resp) {
		var answer = resp.readAll(_);
		if (answer = reg.exec(answer)) {
			return +answer[1];
		}
		console.error("Wrong answer " + answer);
		return 0;
	}
	var hostname = (config.searchEngine && config.searchEngine.hostname) || "localhost";
	var port = (config.searchEngine && config.searchEngine.port) || 9200;
	var elasticBaseUrl = "http://" + hostname + ":" + port;
	var t = Date.now();
	var indexName = "perftest";
	var elasticIndexUrl = elasticBaseUrl + "/" + indexName;
	// test index exists
	var par = {
		url: elasticIndexUrl,
		method: 'HEAD'
	};
	try {
		var resp = ez.devices.http.client(par).end().response(_);
	} catch (e) {
		return {
			error: "No connection possible to " + elasticBaseUrl
		};
	}
	if (resp.statusCode !== 404) {
		// delete index
		par = {
			url: elasticIndexUrl,
			method: 'DELETE'
		};
		resp = ez.devices.http.client(par).end().response(_);
	}
	try {
		// create index
		par = {
			url: elasticIndexUrl,
			method: 'PUT'
		};
		var req = ez.devices.http.client(par);
		req.write(_, "");
		resp = req.end().response(_);
		if (resp.statusCode >= 400) {
			return {
				"error": "Cannot create index" + resp.statusCode + " " + resp.readAll(_)
			};
		}
		// after warm up phase (inserting a lot of rows into elastic search), there are different queries: faster and slower queries. 
		// the number of queries should be performed roughly inverse proportional to the length of each query, because
		// time measuring is more accurate for long tests. Some tests are comparable: "find none" with simple filter and "find none regex"
		// with regex filter; "find none" and "find all".
		// Therefore the ratio of comparable tests will be computed (e. g. in findRegexNext will be the ratio of the duration of the
		// latest test for find none regex and find none). Whenever e. g. find none is executed, findRegexNext will be decreased by 1.
		// When findRegexNext is not positive any more, the longer test will be executed (here: find regex none) and findRegexNext will
		// be increased by the current value of the ratio.
		// The tests will show:
		// - setImmediate(): local activity of other processes
		// - find none: simple query with no results
		// - find none regex: this has comparable network traffic as "find none", but needs much CPU for regex matching. The difference to "find none"
		//     measures CPU speed
		// - find all: searching the documents is comparable to "find none", but it needs network bandwith. So the difference to "find none" essentially
		//     measures network bandwith. The difference of server time between "find all" and "find none" also measures server speed.
		// bulk insert of 20000 documents
		var obj = [];
		// fill obj with generated templates
		var j = 200;
		var findNone = 0;
		var findNoneNet = 0;
		var findNoneCnt = 0;
		var findRegex = 0;
		var findRegexNet = 0;
		var findRegexCnt = 0;
		var findRegexNext = 0;
		var findAll = 0;
		var findAllCnt = 0;
		var findAllNet = 0;
		var findAllNext = 0;
		var findAllCached = 0;
		var findAllCachedCnt = 0;
		var findAllCachedNet = 0;
		var findAllCachedNext = 0;
		var immediate = 0;
		var total = 5;
		while (--j >= 0) {
			obj.push(JSON.stringify({
				index: {
					_id: "T"
				}
			}) + "\n" + JSON.stringify({
				a: "abcdklmndcbanmlkT",
				b: ((j % 2) ? "hallo" : "halli"),
				c: "R"
			}) + "\n");
		}

		var t2 = Date.now();
		var t0 = t2;
		var old;
		for (var i = 1; i <= 2; i++) {
			var req = ez.devices.http.client(par);
			par = {
				url: elasticIndexUrl + "/external" + i + "/_bulk",
				method: 'POST',
			};
			var req = ez.devices.http.client(par);
			var l = 100;
			while (--l >= 0) {
				var data = obj.map(function(item) {
					return item.replace(/T/g, "" + (total++)).replace("R", "" + Math.random());
				}).join("");
				req.write(_, data);
			}
			resp = req.end().response(_);
		}
		old = t2;
		var loadTime = (Date.now() - t2);
		// allow some time to build the index
		setTimeout(_, 2000);
		t2 = Date.now();
		do {
			var startTime = t2;
			setImmediate(_);
			setImmediate(_);
			old = t2;
			immediate += ((t2 = Date.now()) - old);
			par = {
				url: elasticIndexUrl + "/_search",
				method: 'POST',
			};
			var req = ez.devices.http.client(par);
			var data = JSON.stringify({
				"query": {
					"match": {
						"b": findNoneCnt + "h"
					}
				},
				"size": 10000
			});
			req.write(_, data);
			resp = req.end().response(_);
			if (resp.statusCode !== 200) {
				return {
					"error": "Cannot execute query on " + elasticBaseUrl
				};
				continue;
			}
			var serverTime = _getServerTime(_, resp);
			var old = t2;
			var diffNone = ((t2 = Date.now()) - old);
			findNone += serverTime;
			findNoneNet += diffNone;
			findNoneCnt++;
			var diffSimple = Math.max((t2 - startTime), 1);
			if (--findRegexNext <= 0) {
				par = {
					url: elasticIndexUrl + "/external/_search",
					method: 'POST',
				};
				var req = ez.devices.http.client(par);
				var data = JSON.stringify({
					"query": {
						"regexp": {
							"a": ".*[akblcmdn" + findNoneCnt + "]+.*[akblcmdn34]+.*[akblcmdn56]+.*[^a-z]+.*[a-z].*"
						},
						size: 10000
					}
				});
				req.write(_, data);
				resp = req.end().response(_);
				if (resp.statusCode !== 200) {
					findRegexNext = 1000000000;
					continue;
				}
				var serverTime = _getServerTime(_, resp);
				var old = t2;
				var diffRegex = ((t2 = Date.now()) - old);
				findRegexNet += diffRegex;
				findRegex += serverTime;
				findRegexCnt++;
				findRegexNext += diffRegex / diffSimple;

			}
			if (--findAllNext <= 0) {
				par = {
					url: elasticIndexUrl + "/external/_search",
					method: 'POST',
				};
				var req = ez.devices.http.client(par);
				var data = JSON.stringify({
					"query": {
						"filtered": {
							"query": {
								"multi_match": {
									"fields": [
										"_all"
									],
									"query": "hal",
									"type": "phrase_prefix"

								}
							},
							"filter": {
								"and": {
									"filters": [{
										"or": [{
											"query": {
												"field": {
													"b": "hallo"
												}
											}
										}, {
											"query": {
												"field": {
													"b": "halli"
												}
											}
										}]
									}, {
										"range": {
											"c": {
												"gte": 0,
												"lte": 2
											}
										}
									}, {
										"regexp": {
											"a": ".*"
										}
									}],
								}
							}
						}
					},
					"size": 10000
				});

				req.write(_, data);
				resp = req.end().response(_);
				if (resp.statusCode !== 200) {
					findAllNext = 1000000000;
					continue;
				}
				var serverTime = _getServerTime(_, resp);
				var old = t2;
				var diffAll = ((t2 = Date.now()) - old);
				findAllNet += diffAll;
				findAll += serverTime;
				findAllCnt++;
				findAllNext += diffAll / diffSimple;
			}
			if (--findAllCachedNext <= 0) {
				par = {
					url: elasticIndexUrl + "/external/_search",
					method: 'POST',
				};
				var req = ez.devices.http.client(par);
				var data = JSON.stringify({
					"query": {
						"filtered": {
							"query": {
								"multi_match": {
									"fields": [
										"_all"
									],
									"query": "hal",
									"type": "phrase_prefix"

								}
							},
							"filter": {
								"and": {
									"filters": [{
										"or": [{
											"query": {
												"field": {
													"b": "hallo"
												}
											}
										}, {
											"query": {
												"field": {
													"b": "halli"
												}
											}
										}]
									}, {
										"range": {
											"c": {
												"gte": 0,
												"lte": 2
											}
										}
									}, {
										"regexp": {
											"a": ".*"
										}
									}],
									"_cache": true,
									"_cacheKey": "testPerf-cache2"
								}
							}
						}
					},
					"size": 10000
				});

				req.write(_, data);
				resp = req.end().response(_);
				if (resp.statusCode !== 200) {
					findAllCachedNext = 1000000000;
					continue;
				}
				var serverTime = _getServerTime(_, resp);
				var old = t2;
				var diffAllCached = ((t2 = Date.now()) - old);
				findAllCachedNet += diffAllCached;
				findAllCached += serverTime;
				findAllCachedCnt++;
				findAllCachedNext += diffAllCached / diffSimple;
			}
		} while (t2 - t < 7000);
	} finally {
		// finally delete index
		try {
			par = {
				url: elasticIndexUrl,
				method: 'DELETE'
			};
			resp = ez.devices.http.client(par).end().response(_);
		} catch (e) {
			console.error("Error during deleting index: " + e);
		}
		var diffDelete = ((t2 = Date.now()) - old);
	}
	findAll /= findAllCnt;
	findAllCached /= findAllCachedCnt;
	findAllNet /= findAllCnt;
	var net = (findAllNet + findAllCachedNet) / (findAllCnt + findAllCachedCnt)
	findRegex /= findRegexCnt;
	findRegexNet /= findRegexCnt;
	findNone /= findNoneCnt;
	findNoneNet /= findNoneCnt;
	var result = {
		init: loadTime, // raw data: time for loading data: some speed measure for write access
		findNoneSamples: findNoneCnt, // raw data: number of "find none" search
		findRegexSamples: findRegexCnt, // raw data: number of "find none regex" search
		findAllSamples: findAllCnt, // raw data: number of "find filter" search which returns many results
		findAllCachedSamples: findAllCachedCnt, // raw data: number of "find filter" search which returns many results
		diffDelete: diffDelete, // raw data: total time for deleting index
		local: (immediate / findNoneCnt), // local activity: the higher, the more activity
		latency: findNoneNet - findNone, // latency: the higher, the more time is spent in establishing connections
		bandwidth: (findAllNext > 100000000 ? -1 : 100 / Math.max(0.1, (net - findAll) - (findNoneNet - findNone))), // difference between "find none" and "find some", measures bandwith, the higher, the better
		cpu: (findRegexNext > 100000000 ? -1 : 100 / Math.max(findRegex - findNone, 0.1)), // difference between "find regex" and "find none", measures elastic search server CPU speed, the higher, the better
		speed: (findAllNext > 100000000 ? -1 : 100 / Math.max(findAll - findNone, 0.1)), // difference between server time of findAll and server time of findNone, also measures elastic search server CPU speed, the higher, the better
		cache: (findAllCachedNext > 100000000 || findAllNext > 100000000 ? -1 : Math.round(1000 * findAllCached / findAll) / 1000)
	};
	return result;
}

function mongoTest(_) {
	var db;
	var coll;
	var t = Date.now();
	try {
		if (config.collaboration.driver !== "mongodb") throw new Error("Wrong database " + config.collaboration.driver);
		db = dbDriver.open(config.collaboration, _);
		var t0 = Date.now();
		var collName = 'PerfTestMongo' + Date.now();
		coll = dbDriver.createCollection(db, collName, _);
		var insert = 0;
		var count = 0;
		// after warm up phase (inserting a lot of rows into the database), there are simple tests (inserting a row, get count) and more complicated tests. 
		// the number of tests should be performed roughly inverse proportional to the length of each test, because
		// time measuring is more accurate for long tests. Some tests are comparable: "find none" with simple filter and "find none regex"
		// with regex filter; "find none" and "find some" with simple filters, "find some" and "find some sorted".
		// Therefore the ratio of comparable tests will be computed (e. g. in findRegexNext will be the ratio of the duration of the
		// latest test for find none regex and find none). Whenever e. g. find none is executed, findRegexNext will be decreased by 1.
		// When findRegexNext is not positive any more, the longer test will be executed (here: find regex none) and findRegexNext will
		// be increased by the current value of the ratio.
		// The collection is changed often to make caching more complicated.
		// The tests will show:
		// - setImmediate(): local activity of other processes
		// - count: this is very fast on MongoDB side, so it essentially measures the network latency because only little data is transferred.
		//     (the local activity will be subtracted)
		// - insert: insert a single document into collection. This is write access to storage, can be compared with "count", but is still a simple test.
		//     The difference to "count" measures write access speed
		// - find none: this has comparable network traffic as "count", but needs read access to storage because all documents must be scanned
		//     (therefore "count" is subtracted). So the difference to "count" measures read access speed.
		// - find none regex: this has comparable network traffic as "find none", but needs much CPU for regex matching. The difference to "find none"
		//     measures CPU speed
		// - find some: searching the documents is comparable to "find none", but it needs network bandwith. So the difference to "find none" essentially
		//     measures network bandwith
		// - find some sorted: this has same network traffic as "find some", but it needs CPU for sorting. The difference to "find some" measures CPU
		//     speed.
		var findNone = 0;
		var findNoneCnt = 0;
		var findNoneNext = 0;
		var findRegex = 0;
		var findRegexCnt = 0;
		var findRegexNext = 0;
		var findFilter = 0;
		var findFilterCnt = 0;
		var findFilterNext = 0;
		var findSort = 0;
		var findSortCnt = 0;
		var findSortNext = 0;
		var samples = 0;
		var immediate = 0;
		var i = 0;
		var diff;
		var t2 = t0;
		var old = t2;
		var obj = [];
		// fill obj with 72 generated objects
		for (var j = 0; j < 72; j++) {
			obj.push({
				a: "abcd" + (j % 10) + "klmn",
				b: 1 + (j % 2),
				c: Math.random()
			});
		}
		do {
			dbDriver.insert(coll, obj, _);
			old = t2;
			t2 = Date.now();
			i++;
			if (t2 - t0 < 1000) {
				var j = obj.length;
				obj.forEach(function(item) {
					item._id = undefined;
					item.c = Math.random();
				});
			} else break;
		} while (true);
		do {
			// simple statements
			// find out local load
			var startTime = t2;
			setImmediate(_);
			setImmediate(_);
			old = t2;
			immediate += ((t2 = Date.now()) - old);
			var obj2 = obj[samples % 2];
			obj2.c = Math.random();
			obj2._id = undefined;
			dbDriver.insert(coll, obj2, _);
			old = t2;
			insert += ((t2 = Date.now()) - old);
			// count
			dbDriver.count(coll, {}, _);
			old = t2;
			count += ((t2 = Date.now()) - old);
			samples++;
			if (--findNoneNext <= 0) {
				// fetch none, simple
				var diffStart = Math.max(t2 - startTime, 1);
				var erg = dbDriver.find(coll, {
					b: -1
				}, _);
				old = t2;
				var diffNone = Math.max((t2 = Date.now()) - old, 1);
				findNone += diffNone;
				findNoneNext = +diffNone / diffStart;
				findNoneCnt++;
				if (--findRegexNext <= 0) {
					// fetch none, much CPU
					var erg = dbDriver.find(coll, {
						a: {
							$regex: "(\\D+).*(\\1)",
							$options: "i"
						}
					}, _);
					old = t2;
					var diffRegex = Math.max((t2 = Date.now()) - old, 1);
					findRegex += diffRegex;
					findRegexCnt++;
					findRegexNext += diffRegex / diffNone;
				}
				if (--findFilterNext <= 0) {
					// fetch some
					dbDriver.find(coll, {
						b: 1
					}, _);
					old = t2;
					var diffFilter = ((t2 = Date.now()) - old);
					findFilter += diffFilter;
					findFilterCnt++;
					findFilterNext += diffFilter / diffNone;
					if (--findSortNext <= 0) {
						// fetch all sorted
						coll.find({
							b: 2
						}, {
							sort: [
								['b', 'descending'],
								['c', 'ascending']
							]
						}).toArray(_);
						old = t2;
						var diffSort = ((t2 = Date.now()) - old);
						findSort += diffSort;
						findSortCnt++;
						findSortNext += diffSort / diffFilter;
					}
				}
			}
		} while (t2 < t + 6000);
		var median = (obj.length * i + samples / 2);
		findFilter /= findFilterCnt;
		findSort /= findSortCnt;
		findNone /= findNoneCnt;
		findRegex /= findRegexCnt;
		var result = {
			init: (t0 - t), // raw data: time for opening connection
			records: (obj.length * i + samples), // raw data: number of records which have been inserted: some speed measure for write access
			simpleSamples: samples, // raw data: number of simple tests
			findNoneSamples: findNoneCnt, // raw data: number of "find none" search
			findRegexSamples: findRegexCnt, // raw data: number of "find none regex" search
			findFilterSamples: findFilterCnt, // raw data: number of "find filter" search which returns many results
			findSortSamples: findSortCnt, // raw data: number of "find filter sort" search which sorts results
			local: (immediate / samples), // local activity: the higher, the more activity
			latency: Math.max(0, (count - immediate / 2) / samples), // latency: the higher, the more time is spent in establishing connections
			change: (insert - count) / samples, // change: the higher, the more time is spent for write access
			bandwidth: median / Math.max(0.1, findFilter - findNone), // difference between "find none" and "find some", measures bandwith, the higher, the better
			cpu1: (10 * median) / Math.max(findRegex - findNone, 0.1), // difference between "find regex" and "find some", measures Mongo server CPU speed, the higher, the better
			cpu2: (median * Math.log(median)) / Math.max(0.1, findSort - findFilter), // time for sorting, also measures Mongo server CPU speed
			read: median / Math.max(0.1, findNone - count / samples) // difference between "find none" and "count", essentially measures read access time of Mongo server.
		};
		return result;

	} catch (e) {
		console.error(e.stack);
		return {
			"error": e
		};
	} finally {
		if (db && coll) {
			coll.drop(_);
		}
		dbDriver.close(db);
	}
}

// returns 'A' as often as you want
function ReadableTestStream(size) {
	var self = this;
	//
	var position = 0;
	//
	self.read = function(_, len) {
		if (len) {
			if (size - position < len) len = size - position;
		} else {
			len = size - position;
		}
		if (len) {
			var output = 'A';
			while (output.length <= len / 2) {
				output += output;
			}
			if (output.length < len) {
				output += output.substr(0, len - output.length);
			}
			position += len;
			return output;
		} else return "";
	};
}


function x3Test(_) {
	var db = adminHelper.getCollaborationOrm(_);
	// retrieve list of endpoints
	var ent = db.model.getEntity(_, "endPoint");
	var endpoints = db.fetchInstances(_, ent, {
		jsonWhere: {
			protocol: "x3"
		}
	});
	var runtimes = [];
	var futures = [];
	var i = endpoints.length;
	while (--i >= 0) {
		var ep = endpoints[i];
		var rt = ep.x3solution(_);
		if (!rt) continue;
		// only one test for each x3solution
		if (runtimes.indexOf(rt.$uuid) < 0) {
			runtimes.push(rt.$uuid);
			futures.push(endpointTest(!_, ep, rt.description(_)));
		}
	}
	var results = flows.collect(_, futures);
	return results;
}


// performance test on a single endpoint
function endpointTest(_, endpoint, runtimeDescription) {
	try {
		var milli = Date.now();
		var startTime = milli;
		var orm = endpoint.getOrm(_);
		var client = orm.getClient(_);
		next = Date.now();
		var warmup = (next - milli);
		// console.error("warmup " + (next - milli));
		milli = next;

		var simpleTime = 0;
		var simpleCnt = 0;
		var withDataTime = 0;
		var withDataCnt = 0;
		var withDataLimit = 4096;
		var withDataNext = 0;
		var cpuTime = 0;
		var cpuCnt = 0;
		var cpuLimit = 10;
		var cpuNext = 0;
		var fileTime = 0;
		var fileCnt = 0;
		var fileLimit = 10;
		var fileNext = 0;
		var dbmsTime = 0;
		var dbmsCnt = 0;
		var dbmsLimit = 10;
		var dbmsNext = 0;
		var dbmsLatTime = 0;
		var dbmsLatCnt = 0;
		var dbmsLatLimit = 10;
		var dbmsLatNext = 0;
		var immediateTime = 0;


		do {
			setImmediate(_);
			setImmediate(_);
			next = Date.now();
			immediateTime += (next - milli);
			milli = next;
			callX3(_, client, "");
			next = Date.now();
			var diffSimple = next - milli;
			simpleTime += diffSimple;
			var diff_simple = Math.max(1, diffSimple);
			simpleCnt++;
			// console.error("simple " + diff_simple + " " + simpleCnt);
			milli = next;
			if (--withDataNext <= 0) {
				callX3(_, client, "", withDataLimit, 'POST');
				var next = Date.now();
				var diff_withData = next - milli;
				milli = next;
				withDataNext += diff_withData / diff_simple;
				withDataTime += (diff_withData - diffSimple);
				withDataCnt += withDataLimit;
				withDataLimit = Math.min(1048576, Math.round(withDataLimit * Math.max(350, diffSimple) / Math.max(diff_withData - diffSimple, 5)));
				// console.error("withData " + withDataNext + " " + withDataTime + " " + withDataCnt + " " + withDataLimit);

			}
			if (--cpuNext <= 0) {
				callX3(_, client, "cpu", cpuLimit);
				var next = Date.now();
				var diff_cpu = next - milli;
				milli = next;
				cpuNext += diff_cpu / diff_simple;
				cpuTime += (diff_cpu - diffSimple);
				cpuCnt += cpuLimit;
				cpuLimit = Math.min(1048576, Math.round(cpuLimit * Math.max(350, diffSimple) / Math.max(diff_cpu - diffSimple, 5)));
				// console.error("cpu " + cpuNext + " " + cpuTime + " " + cpuCnt + " " + cpuLimit);
			}
			if (--fileNext <= 0) {
				callX3(_, client, "file-io", fileLimit);
				var next = Date.now();
				var diff_file = next - milli;
				milli = next;
				fileNext += diff_file / diff_simple;
				fileTime += (diff_file - diffSimple);
				fileCnt += fileLimit;
				fileLimit = Math.min(1048576, Math.round(fileLimit * Math.max(350, diffSimple) / Math.max(diff_file - diffSimple, 5)));
				// console.error("file " + fileNext + " " + fileTime + " " + fileCnt + " " + fileLimit);

			}
			if (--dbmsNext <= 0) {
				callX3(_, client, "dbms-io", dbmsLimit);
				var next = Date.now();
				var diff_dbms = next - milli;
				milli = next;
				dbmsNext += diff_dbms / diff_simple;
				dbmsTime += (diff_dbms - diffSimple);
				dbmsCnt += dbmsLimit;
				dbmsLimit = Math.min(1048576, Math.round(dbmsLimit * Math.max(350, diffSimple) / Math.max(diff_dbms - diffSimple, 5)));
				// console.error("dbms " + dbmsNext + " " + dbmsTime + " " + dbmsCnt + " " + dbmsLimit);

			}
			if (--dbmsLatNext <= 0) {
				callX3(_, client, "dbms-latency", dbmsLatLimit);
				var next = Date.now();
				var diff_dbmsLat = next - milli;
				milli = next;
				dbmsLatNext += diff_dbmsLat / diff_simple;
				dbmsLatTime += (diff_dbmsLat - diffSimple);
				dbmsLatCnt += dbmsLatLimit;
				dbmsLatLimit = Math.min(1048576, Math.round(dbmsLatLimit * Math.max(350, diffSimple) / Math.max(diff_dbmsLat - diffSimple, 5)));
				// console.error("dbmsLat " + dbmsLatNext + " " + dbmsLatTime + " " + dbmsLatCnt + " " + dbmsLatLimit);

			}
		} while (milli - startTime < 10000);
		// collecting data
		var result = {
			endpoint: endpoint.description(_),
			runtime: runtimeDescription,
			init: warmup, // raw data: time for opening connection
			simpleSamples: simpleCnt, // raw data: number of simple tests
			withDataSamples: withDataCnt, // raw data: sum of limits of tests with data transfer
			cpuSamples: cpuCnt, // raw data: sum of loops (limits)
			fileSamples: fileCnt, // raw data: sum of file data (limits)
			dbmsSamples: dbmsCnt, // raw data: sum of dbms reads (limits)
			dbmsLatSamples: dbmsLatCnt, // raw data: sum of dbmsLat reads (limits)
			local: (immediateTime / simpleCnt), // local activity: the higher, the more activity
			latency: simpleTime / simpleCnt, // latency: the higher, the more time is spent in establishing connections
			bandwidth: withDataCnt / Math.max(1, withDataTime), // difference between "with data" and "simple", measures bandwith, the higher, the better
			cpu: cpuCnt / Math.max(1, cpuTime), // difference between cpu intensive request and "ping" request: measures X3 server CPU speed, the higher, the better
			file: fileCnt / Math.max(1, fileTime), // difference between file intensive request and "ping" request: measures X3 server file access speed, the higher, the better
			dbms: dbmsCnt / Math.max(1, dbmsTime), // difference between dbms intensive search request and "ping" request: measures DBMS server fetch speed, the higher, the better
			dbmsLat: dbmsLatCnt / Math.max(1, dbmsLatTime) // difference between dbms empty transaction test and "ping" request: measures DBMS server latency, the higher, the better
		};
	} catch (e) {
		var result = {
			endpoint: endpoint.description(_),
			runtime: runtimeDescription,
			error: e.toString()
		}
		if (e.extra) result.errorExtra = e.extra;
	}
	return result;

}

// invoke X3 test functions.
// client must be the X3 client
// type: "" for the latency/bandwith test (then method can be 'POST' and limit will give the size of the data for X3)
//       cpu for the X3 CPU test (limit will give the number of iterations)
//       file-io for the X3 file IO test (limit will give 1000 times file size)
//       dbms-io for the X3 database access test (limit will give the number of read iterations)
function callX3(_, client, type, limit, method) {
	var url = '/sdata/x3/erp/SUPERV/$service/perf';
	var size = 0;
	if (type) {
		url += '?counter=' + type + '&limit=' + (limit || 100);
	} else {
		if (method === 'POST') {
			size = limit || 100;
		}
	}
	var request = new ReadableTestStream(size);
	request.headers = {
		'content-length': size,
		host: "localhost:8124",
		'accept': "text/html"
	};
	request.method = method || 'GET';
	request.url = url;
	var response = new x3client.WritableMemoryStream();
	response.writeHead = function(statusCode, headers) {
		this.statusCode = statusCode;
		this.headers = headers;
	};
	var erg = client.sendRequest(_, request, response);
	if (erg.status >= 400) {
		var err = new Error("X3 Connection error");
		err.extra = {
			url: url,
			status: erg.status,
			message: erg.message,
			response: response.toString()
		};
		throw err;
	}
}



exports.entity = {
	$isPersistent: false,
	$autoRecreateWorkingCopy: true,
	$properties: {
		test: {
			$title: "Test"
		}
	},
	$titleTemplate: "Performance test",
	$valueTemplate: "Performance test",
	$descriptionTemplate: "Performance test",
	$functions: {},
	$services: {
		nodetest: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "nodetest",
			$execute: function(_, context) {
				return perfTest(_);
			}
		},
		mongotest: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "mongotest",
			$execute: function(_, context) {
				return mongoTest(_);
			}
		},
		elastictest: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "elastictest",
			$execute: function(_, context) {
				return elasticTest(_);
			}
		},
		x3test: { // list of currently valid licenses
			$method: "GET",
			$isMethod: false,
			$isHidden: true,
			$titel: "elastictest",
			$execute: function(_, context) {
				return x3Test(_);
			}
		},
	}
};