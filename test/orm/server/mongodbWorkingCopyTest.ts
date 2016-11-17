import { _ } from 'streamline-runtime';
import * as ez from 'ez-streams';
declare function it(name: string, test: (_: _) => any): any;
import { helpers, apis } from '@sage/syracuse-core';
const uuid = helpers.uuid;
var config = require('config'); // must be first syracuse require
import { inspect } from 'util';

import { assert } from 'chai';
const strictEqual = assert.strictEqual;
const ok = assert.ok;

var tracer; // = console.log;

//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
config.integrationServer = null;

const testAdmin = apis.get('test-admin');
//add model
const testEp = {
	contract: require("test-contract/lib/contract").contract,
	datasets: {
		mongodb_example: {
			driver: "mongodb",
			database: "mongodb_example",
		}
	}
};

const port = (config.unit_test && config.unit_test.serverPort) || 3004;
const baseUrl = "http://localhost:" + port;
const contractUrl = "/sdata/example/admin/mongodb_example/";

function getCookie(_: _) {
	var response = ez.devices.http.client({
		url: baseUrl + "/syracuse-main/html/main.html",
		user: "admin",
		password: "admin"
	}).proxyConnect(_).end().response(_);
	response.readAll(_);
	strictEqual(response.statusCode, 200, "user authenticated");
	return response.headers["set-cookie"];
}

function post(_: _, cookie: string, url: string, data?: any, statusCode?: number) {
	var response = ez.devices.http.client({
		method: "post",
		url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).proxyConnect(_).end(JSON.stringify(data)).response(_);
	strictEqual(response.statusCode, statusCode || 201, "status verified");
	return JSON.parse(response.readAll(_));
}

function put(_: _, cookie: string, url: string, data: any, statusCode?: number) {
	var response = ez.devices.http.client({
		method: "put",
		url: url.indexOf("http") == 0 ? url : baseUrl + contractUrl + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).proxyConnect(_).end(JSON.stringify(data)).response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified");
	return JSON.parse(response.readAll(_));
}

function get(_: _, cookie: string, url: string, statusCode?: number, facet?: string) {
	var type = facet || "user.$details";
	var response = ez.devices.http.client({
		method: "get",
		url: url.indexOf("http") == 0 ? url : baseUrl + "/sdata/example/admin/mongodb_example/" + url,
		headers: {
			cookie: cookie,
			// TODO : send class too ...
			accept: "application/json;vnd.sage.syracuse.representation=example.admin.mongodb_example." + type
		}
	}).proxyConnect(_).end().response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified");
	return JSON.parse(response.readAll(_));
}

function del(_: _, cookie: string, url: string, statusCode?: number) {
	var response = ez.devices.http.client({
		method: "delete",
		url: baseUrl + "/sdata/example/admin/mongodb_example/" + url,
		headers: {
			cookie: cookie
		}
	}).proxyConnect(_).end().response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified");
	return JSON.parse(response.readAll(_));
}

describe(module.id, () => {
	var adminEndpoint;
	var franceID = "";
	var usID = "";

	it('init database', function (_) {
		adminEndpoint = testAdmin.createTestAdminEndpoint(_, "unit-test-admin");
		testAdmin.createTestOrm(_, testEp, "mongodb_example");
		ok(true, "mongodb initialized");
	});

	//start syracuse server ONLY AFTER init database
	it('start server', function (_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});

	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	function hasErrors(resource: any, includeWrn?: boolean) {
		var result = false;
		if (resource.$diagnoses) result = resource.$diagnoses.some(function (diag) {
			return (diag.$severity == "error") || (includeWrn && (diag.$severity == "warning"));
		});
		if (!result) result = resource.$properties && Object.keys(resource.$properties).some(function (prop) {
			return hasErrors(resource.$properties[prop], includeWrn);
		});
		if (!result) result = resource.$actions && Object.keys(resource.$actions).some(function (prop) {
			return hasErrors(resource.$actions[prop], includeWrn);
		});
		return result;
	}

	var cookie;

	it('simple object creation', function (_: _) {
		cookie = getCookie(_);
		// Create FR
		var body = post(_, cookie, "countries/$template/$workingCopies?trackingId=" + uuid.generate());
		franceID = body.$uuid;
		strictEqual(body.$etag, 1, "create etag test");
		ok(franceID, "import  countries OK");
		body = put(_, cookie, body.$url, {
			$key: franceID,
			$etag: body.$etag,
			code: "FR",
			description: "France",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		strictEqual(body.$etag, 2, "after save etag test");
		strictEqual(onlyInfo(body.$actions.$save.$diagnoses), true, "save diags ok");
		body = get(_, cookie, "countries('" + franceID + "')");
		strictEqual(body.code, "FR", "fetch FR test");
		//
		// Create US
		tracer && tracer("Create US start");
		body = post(_, cookie, "countries/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		usID = body.$uuid;
		body = put(_, cookie, body.$url, {
			$key: usID,
			$etag: body.$etag,
			code: "US",
			description: "US",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		body = get(_, cookie, "countries('" + usID + "')");
		strictEqual(body.code, "US", "fetch US test");
		tracer && tracer("Create US end");
		// check count
		tracer && tracer("Check count start");
		body = get(_, cookie, "countries");
		tracer && tracer("Create count end :" + inspect(body));
		strictEqual(body.$resources.length, 2, "Countries count test");
		// create duplicate country
		var body = post(_, cookie, "countries/$template/$workingCopies?trackingId=" + uuid.generate(), {}, 201);
		body = put(_, cookie, body.$url, {
			$key: body.$uuid,
			$etag: body.$etag,
			code: "FR",
			description: "France"
		}, 200);
		tracer && tracer("body(217): " + inspect(body, null, 4));
		strictEqual(body.$properties.code.$diagnoses[0].$message, "This value has already been used for this field (code) of entity 'country'");
		// insist ;-)
		body = put(_, cookie, body.$url, {
			$key: body.$uuid,
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		tracer && tracer("body(226): " + inspect(body, null, 4));
		strictEqual(body.$properties.code.$diagnoses[0].$message, "This value has already been used for this field (code) of entity 'country'");
		//	ok(!onlyInfo(body.$actions.$save.$diagnoses), true, "Save errors ok");
		ok(hasErrors(body), "Save errors ok");
		//
	});

	var _data = {};
	var _session = {
		setData: function (name, value) {
			var old = _data[name];
			if (old == value) return;

			if (old && old.onDestroy) {
				old.onDestroy();
			}
			if (typeof value == "undefined") delete _data[name];
			else _data[name] = value;
		},
		getData: function (name) {
			return _data[name];
		},
		_reset: function () {
			_data = {};
		}
	};

	function _resetSession() {
		_data = {};
	}

	function _createRequest(method, url, data, set) {
		var baseUrl = "http://localhost/sdata/example/admin/mongodb_example";
		return {
			session: _session,
			method: method,
			url: (set ? url : (baseUrl + url)).replace(/'/g, "%27"),
			context: {
				parseBody: function (_) {
					return data;
				}
			},
			headers: {
				cookie: "fake cookie"
			}
		};
	}

	function _checkStatus(response, statusCode, message) {
		strictEqual(response.statusCode, statusCode, message);
		if (response.statusCode != statusCode) {
			tracer && tracer(response);
			throw new Error("aborting test");
		}
	}

	var createdUser = "";
	it('create user test', function (_) {
		cookie = getCookie(_);
		// Create user
		var body = post(_, cookie, "users/$template/$workingCopies?trackingId=" + uuid.generate(), {});
		createdUser = body.$uuid;
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "John",
			lastName: "Smith"
		});
		// propagation test (defered)
		strictEqual(body.propagatedProp, "John", "Propagated prop ok");
		// add post
		tracer && tracer("add post ====");
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			posts: [{
				$uuid: uuid.generate(),
				text: "First Post",
				$index: 0,
				postNum: 1
			}]
		}, 200);
		tracer && tracer("body: " + inspect(body, null, 4));
		// add a visited country, expects description in return
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			visitedCountries: [{
				$uuid: franceID,
				$index: 0
			}]
		}, 200);
		tracer && tracer("body(323): " + inspect(body, null, 4));
		strictEqual(body.visitedCountries[0].description, "France", "Returned country description ok");
		// save
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		tracer && tracer("body(340): " + inspect(body, null, 4));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		//
	});

	it('add/modify/delete childrens - user test', function (_) {
		cookie = getCookie(_);
		var body;
		// Fetch user WC
		//	tracer && tracer("add/modify/delete childrens=================================");
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate() + "&representation=user.$edit", {});
		//	tracer && tracer("add/modify/delete childrens=================================");
		strictEqual(body.firstName, "John", "WC created firstName ok");
		strictEqual(body.posts[0].text, "First Post", "WC created first post ok");
		// no $index on full list read
		ok(!body.posts[0].hasOwnProperty("$index"), "WC create has no $index");
		//strictEqual(body.posts[0].$index, 0, "First Post index ok");
		// modify and save first post
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			posts: [{
				$uuid: body.posts[0].$uuid,
				text: "Changed First Post",
				$index: 0
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.posts[0].text, "Changed First Post", "Post modification");
		// add second post
		var willDeleteId = uuid.generate();
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			posts: [{
				$uuid: uuid.generate(),
				text: "Second Post",
				$index: 1,
				postNum: 2
			}, {
				$uuid: willDeleteId,
				text: "Will Delete",
				$index: 2
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		// return delta, should have just the 2 posts
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		// check posts
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.posts.length, 3, "posts count");
		strictEqual(body.posts[0].text, "Changed First Post", "First Post");
		strictEqual(body.posts[1].text, "Second Post", "Second Post");
		// delete	
		tracer && tracer("(401) before delete post");
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			posts: [{
				$uuid: willDeleteId,
				$index: 2,
				$isDeleted: true
			}],
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		tracer && tracer("(416) after delete post");
		// check posts
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.posts.length, 2, "posts count");

	});

	it('child adress test', function (_) {
		cookie = getCookie(_);
		var body;
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		//
		tracer && tracer("child adress test (430) ========");
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			address: {
				$uuid: uuid.generate(),
				country: {
					$uuid: usID
				},
				city: "New York",
				street: "66"
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		tracer && tracer("child adress test (448) ======");
		//	tracer && tracer("body:"+inspect(body));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		// address modify
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.address.city, "New York", "City check(1)");
		tracer && tracer("address test (434) city modify");
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			address: {
				city: "Detroit",
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		tracer && tracer("address test (446) body: " + inspect(body, null, 4));
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.address.city, "Detroit", "City check(2)");
		strictEqual(body.address.street, "66", "Street check(2)");
		// address country modify
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			address: {
				country: {
					$uuid: franceID,
					$title: "France"
				},
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		});
		tracer && tracer("address mod(450): " + inspect(body, null, 4));
		strictEqual(body.address.country.$uuid, franceID, "Country modification uuid Ok");
		strictEqual(body.address.country.code, "FR", "Country modification code Ok");
		// are posts still there ?
		strictEqual(body.posts.length, 2, "posts count");
		strictEqual(body.posts[0].text, "Changed First Post", "First Post");
		strictEqual(body.posts[1].text, "Second Post", "Second Post");

	});

	it('Various controls et diagnoses', function (_) {
		cookie = getCookie(_);
		var body;
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		// computed full name test
		strictEqual(body.fullName, "John Smith", "Fullname checked");
		// put errorneous data
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "Jo"
		}, 200);
		tracer && tracer("body(mod firstname):" + inspect(body, null, 4));
		strictEqual(body.$properties.firstName.$diagnoses.length, 1, "Error count should be 1");
		strictEqual(body.$properties.firstName.$diagnoses[0].$severity, "error", "Severity should be error (1)");
		// changed data should clear error condition
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "Joe"
		});
		ok(!body.$properties.firstName || (body.$properties.firstName.$diagnoses.length == 0), "Errors cleared");
		// $control test (dont accept first names starting with $)
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "$Joe"
		}, 200);
		strictEqual(body.$properties.firstName.$diagnoses.length, 1, "Error count should be 1");
		strictEqual(body.$properties.firstName.$diagnoses[0].$severity, "error", "Severity should be error");
		strictEqual(body.$properties.firstName.$diagnoses[0].$message, "firstName cannot start with $", "Error message check");
		//	tracer && tracer("!!!!!!!!!!body:"+inspect(body.$properties.firstName.$diagnoses));
		// mandatory lastName
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "Joe",
			lastName: ""
		}, 200);
		strictEqual(body.$properties.lastName.$diagnoses.length, 1, "Error count should be 1");
		strictEqual(body.$properties.lastName.$diagnoses[0].$severity, "error", "Severity should be error (2)");
		// clear error
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			lastName: "Smith"
		});
		ok(!body.$properties.lastName || (body.$properties.lastName.$diagnoses.length == 0), "Errors cleared");
		// attempt to save errorneous data
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		// mandatory lastName
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			firstName: "Joe",
			lastName: ""
		}, 200);
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		//	tracer && tracer("body(392): "+inspect(body,null,4));
		ok(hasErrors(body), "Save error ok(1)");
		// global control error : 
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			lastName: "Smithy",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(!onlyInfo(body.$diagnoses), "Save error ok(2)");
		//	tracer && tracer("body:"+inspect(body));
		// test mandatory ref diagnoses on address
		body = post(_, cookie, "addresses/$template/$workingCopies", {}, 201);
		// modify 
		body = put(_, cookie, body.$url, {
			street: "Main Street",
			$etag: body.$etag
		}, 200);
		// might have diagnoses for country
		// set the country
		body = put(_, cookie, body.$url, {
			country: {
				$uuid: franceID
			},
			$etag: body.$etag
		}, 200);
		// country diags must be cleared, now we can save
		body = put(_, cookie, body.$url, {
			$actions: {
				$save: {
					$isRequested: true
				}
			},
			$etag: body.$etag
		}, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save with required ok");
		//
	});

	it('$actions test', function (_) {
		cookie = getCookie(_);
		var body;
		// Fetch user WC
		body = post(_, cookie, "users('" + createdUser + "')/$workingCopies?trackingId=" + uuid.generate(), {});
		strictEqual(body.firstName, "John", "WC created in edit mode");
		//
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			$properties: {
				posts: {
					$actions: {
						$create: {
							$isRequested: true
						}
					}
				}
			}
		});
		strictEqual(body.posts.length, 3, "post created ok");

		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			$actions: {
				changeLastName: {
					$isRequested: true
				}
			}
		});
		strictEqual(body.lastName, "changedLastName", "service call ok");
		strictEqual(body.posts.length, 3, "posts length ok");
		// delete child service
		body.posts[2].$actions = {
			$delete: {
				$isRequested: true
			}
		};
		tracer && tracer("add/modify/delete childrens=================================");
		tracer && tracer("etag: " + body.$etag);
		body = put(_, cookie, body.$url, {
			$key: createdUser,
			$etag: body.$etag,
			posts: body.posts
		});
		tracer && tracer("body actions: " + inspect(body, null, 4));
		// async actions
		var wcUrl = body.$url;
		var trkId = helpers.uuid.generate();
		body = put(_, cookie, body.$url, {
			$etag: body.$etag,
			$actions: {
				asyncChangeLastName: {
					$isRequested: true,
					$trackingId: trkId
				}
			}
		});
		strictEqual(body.$actions.asyncChangeLastName.$location, "/sdata/$trackers('" + trkId + "')", "Got tracker location ok");
		// 
		var trkUrl = baseUrl + body.$actions.asyncChangeLastName.$location;
		body = get(_, cookie, trkUrl, 202);
		strictEqual(body.phase, "Running", "Got tracker running ok");
		ok(body.$links.$abort != null, "Got abort link ok");
		//
		body = put(_, cookie, baseUrl + body.$links.$abort.$url, {}, 202);
		// give him time to exit loop
		setTimeout(_, 500);
		//
		body = get(_, cookie, trkUrl);
		strictEqual(body.phase, "Aborted", "Got tracker completed ok");
		//
		body = get(_, cookie, wcUrl);
		ok(body.lastName !== "asyncLastNameChanged", "Change NOT applied ok"); // not applied ok, works on a snapshot

	});

	it('Plural references', function (_) {
		cookie = getCookie(_);
		var body;

		// create refA
		body = post(_, cookie, "refAs", {
			description: "RefA1"
		}, 201);
		var refA1 = body.$uuid;
		body = post(_, cookie, "refAs", {
			description: "RefA2"
		}, 201);
		var refA2 = body.$uuid;
		// create refB
		body = post(_, cookie, "refBs", {
			description: "RefB1"
		}, 201);
		var refB1 = body.$uuid;
		body = post(_, cookie, "refBs", {
			description: "RefB2"
		}, 201);
		var refB2 = body.$uuid;
		// make links
		tracer && tracer("648: associating");
		body = put(_, cookie, "refAs('" + refA1 + "')", {
			refBList: [{
				$uuid: refB1
			}, {
				$uuid: refB2
			}]
		}, 200);
		tracer && tracer("648 associating body: " + inspect(body, null, 4));
		body = put(_, cookie, "refBs('" + refB1 + "')", {
			refAList: [{
				$uuid: refA2,
				$index: 1
			}]
		}, 200);
		tracer && tracer("658 associating body: " + inspect(body, null, 4));
		// get refA1, should have 2 refBList
		body = get(_, cookie, "refAs('" + refA1 + "')", 200);
		tracer && tracer("get refA1 body: " + inspect(body, null, 4));
		strictEqual(body.refBList.length, 2, "refA1.refBList.length ok");
		// get refB1, should have 2 refAList
		body = get(_, cookie, "refBs('" + refB1 + "')", 200);
		tracer && tracer("get refB1 body: " + inspect(body, null, 4));
		strictEqual(body.refAList.length, 2, "refB1.refAList.length ok");
		// unassociate the 2 refBs
		tracer && tracer("688 unassociating");
		body = put(_, cookie, "refAs('" + refA1 + "')", {
			refBList: [{
				$uuid: refB1,
				$isDeleted: true
			}, {
				$uuid: refB2,
				$isDeleted: true
			}]
		}, 200);
		tracer && tracer("end 688 unassociating");
		// A1.BList must be empty
		body = get(_, cookie, "refAs('" + refA1 + "')", 200);
		ok(!body.refBList || !body.refBList.length, "refA1.refBList empty ok");
		// B1.RefAList must be of 1 element
		body = get(_, cookie, "refBs('" + refB1 + "')", 200);
		strictEqual(body.refAList.length, 1, "refB1.refAList.length ok");
		// B1.RefAList must be empty
		body = get(_, cookie, "refBs('" + refB2 + "')", 200);
		ok(!body.refAList || !body.refAList.length, "refB2.refAList empty ok");

	});

	it('OneToMany references', function (_) {
		cookie = getCookie(_);
		var body;

		// create refA
		body = post(_, cookie, "refAs", {
			description: "RefA"
		}, 201);
		var refA = body.$uuid;
		// create refCs
		body = post(_, cookie, "refCs", {
			description: "RefC1"
		}, 201);
		var refC1 = body.$uuid;
		body = post(_, cookie, "refCs", {
			description: "RefC2"
		}, 201);
		var refC2 = body.$uuid;
		body = post(_, cookie, "refCs", {
			description: "RefC3"
		}, 201);
		var refC3 = body.$uuid;
		// add refC, method 1
		body = put(_, cookie, "refCs('" + refC1 + "')", {
			refA: {
				$uuid: refA
			}
		}, 200);
		tracer && tracer("686 refC1 body: " + inspect(body, null, 4));
		strictEqual(body.refA.$uuid, refA, "refA affected Ok");
		// add refC, method 2
		body = put(_, cookie, "refAs('" + refA + "')", {
			refCList: [{
				$uuid: refC2,
				$index: 1
			}, {
				$uuid: refC3,
				$index: 2
			}]
		}, 200);
		tracer && tracer("690 refA body: " + inspect(body, null, 4));
		// check refA
		body = get(_, cookie, "refAs('" + refA + "')", 200);
		tracer && tracer("693 refA get body: " + inspect(body, null, 4));
		strictEqual(body.refCList.length, 3, "refC2 added Ok");
		// delete refC1
		body = put(_, cookie, "refAs('" + refA + "')", {
			refCList: [{
				$uuid: refC1,
				$isDeleted: true,
				$index: 1
			}, {
				$uuid: refC3,
				$isDeleted: true,
				$index: 2
			}]
		}, 200);
		tracer && tracer("refA put body: " + inspect(body, null, 4));
		body = get(_, cookie, "refAs('" + refA + "')", 200);
		tracer && tracer("697 refA get body: " + inspect(body, null, 4));
		strictEqual(body.refCList.length, 1, "refC1 deleted Ok");
		// refC1 and refC3 shouldn't be associated anymore
		body = get(_, cookie, "refCs('" + refC1 + "')", 200);
		ok(!body.refAList || body.refAList.length, "refC1 not associated Ok");
		body = get(_, cookie, "refCs('" + refC3 + "')", 200);
		ok(!body.refAList || body.refAList.length, "refC3 not associated Ok");

	});

	it('Propagate and error management', function (_) {
		var body;

		body = post(_, cookie, "propagateAndValidations/$template/$workingCopies?representation=propagateAndValidation.$edit", {
			p1: "p1",
			p3: "p3",
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 201);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "save diags ok");
		var wcUrl = body.$url;
		// change p2 -> no diagnose should be there for p3
		body = put(_, cookie, wcUrl, {
			p2: "p2"
		}, 200);
		ok(!(body.$properties && body.$properties.p3), "No diags for p3 ok");
		strictEqual(body.p3, "", "p3 empty ok");
		// try to save -> error on p3
		body = put(_, cookie, wcUrl, {
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(!onlyInfo(body.$properties.p3.$diagnoses), "Error on p3 ok");
		// fix the error -> should empty diags
		body = put(_, cookie, wcUrl, {
			p3: "p3"
		}, 200);
		tracer && tracer("body (788):" + inspect(body, null, 4));
		ok(onlyInfo(body.$properties.p3.$diagnoses), "Empty diags for p3 ok");
		// save
		// try to save -> error on p3
		body = put(_, cookie, wcUrl, {
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		}, 200);
		ok(onlyInfo(body.$actions.$save.$diagnoses), "Saved ok");

	});

	it('Batch test', function (_) {
		// Create BB
		var body = post(_, cookie, "countries/$batch?representation=country.$edit", {
			//	    "$url": "http://pc101329.sagefr.adinternal.com:8124/sdata/syracuse/collaboration/syracuse/groups/$batch?representation=group.$edit",
			"$resources": [{
				//	            "$url": "http://pc101329.sagefr.adinternal.com:8124/sdata/syracuse/collaboration/syracuse/groups?representation=group.$edit",
				"$etag": 1,
				"$creUser": "guest",
				"$updUser": "guest",
				"$properties": {},
				"$value": "",
				"$uuid": "2fa16db5-f186-4894-b3f5-6831042af06a",
				"code": "BB",
				"description": "Batch test",
				"$httpMethod": "POST"
			}]
		}, 200);
		tracer && tracer("(911) body: " + inspect(body));
		strictEqual(body.$key, body.$uuid, "Check $key=$uuid");
		//
	});
});