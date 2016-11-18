"use strict";

var config = require("config");
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;


import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	function post(_, cookie, url, data, statusCode) {
		return testAdmin.post(_, cookie, baseUrl + "/sdata/qunit/sdataTest/test/" + url, data, statusCode);
	}

	function del(_, cookie, url, statusCode) {
		return testAdmin.del(_, cookie, baseUrl + "/sdata/qunit/sdataTest/test/" + url, statusCode);
	}

	function put(_, cookie, url, data, statusCode) {
		return testAdmin.put(_, cookie, baseUrl + "/sdata/qunit/sdataTest/test/" + url, data, statusCode);
	}

	function get(_, cookie, url, statusCode, headers) {
		return testAdmin.get(_, cookie, baseUrl + "/sdata/qunit/sdataTest/test/" + url, statusCode, false, headers);
	}

	var db, cookie;
	it('init database', function(_) {
		testAdmin.initializeTestContract(_, require('../fixtures/testDB'), "test");
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//
		cookie = testAdmin.getCookie(_, baseUrl);
		//
	});

	// deleteTestParent <- deleteTestRefOne
	it('delete test referenced object from ref', function(_) {
		// create the parent
		var body = post(_, cookie, "deleteTestParents", {
			name: "testParent"
		}, 201);
		var parentId = body.$uuid;
		// create refering childs
		body = post(_, cookie, "deleteTestRefOnes", {
			name: "testRefOne",
			ref: {
				$uuid: parentId
			}
		}, 201);
		var refId = body.$uuid;
		// try to delete parent, must get error
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 403);
		// delete refering child
		body = del(_, cookie, "deleteTestRefOnes('" + refId + "')", 200);
		// delete parent, must succeed
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 200);

	});

	// deleteTestParent *<- deleteTestRefMany
	it('delete test referenced object from list', function(_) {
		var body, parentId, refId;
		// recreate parent
		body = post(_, cookie, "deleteTestParents", {
			name: "testParent"
		}, 201);
		parentId = body.$uuid;
		//
		body = post(_, cookie, "deleteTestRefManies", {
			name: "testRefMany",
			refs: [{
				$uuid: parentId
			}]
		}, 201);
		refId = body.$uuid;
		// try to delete parent, must fail
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 403);
		// delete refering child
		body = del(_, cookie, "deleteTestRefManies('" + refId + "')", 200);
		// delete parent, must succeed
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 200);
		// tracer && tracer("delete test body(1) " + sys.inspect(body, null, 4));

	});

	// deleteTestParent <- deleteTestMultiRefe (ref1) and deleteTestParent <- deleteTestMultiRefe (ref2)
	it('delete test referenced object from different multiple references', function(_) {
		var body, parentId, refId1, refId2;
		// recreate parent
		body = post(_, cookie, "deleteTestParents", {
			name: "testParent"
		}, 201);
		parentId = body.$uuid;
		//
		body = post(_, cookie, "deleteTestMultiRefes", {
			name: "testRef1",
			ref1: {
				$uuid: parentId
			}
		}, 201);
		var refId1 = body.$uuid;
		body = post(_, cookie, "deleteTestMultiRefes", {
			name: "testRef2",
			ref2: {
				$uuid: parentId
			}
		}, 201);
		var refId2 = body.$uuid;
		// try to delete parent, must fail
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 403);
		// delete refering child 1
		body = del(_, cookie, "deleteTestMultiRefes('" + refId1 + "')", 200);
		// delete parent, must fail
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 403);
		// delete refering child 1
		body = del(_, cookie, "deleteTestMultiRefes('" + refId2 + "')", 200);
		// delete parent, must succeed
		body = del(_, cookie, "deleteTestParents('" + parentId + "')", 200);
		//
	});

	// deleteTestCascadeMasters <->* deleteTestCascadeDetails (detailsWInv) 
	// deleteTestCascadeMasters ->* deleteTestCascadeDetails (detailsWoInv)
	it('delete test cascade delete one to many with and w/o inverse relation', function(_) {
		var body, parentId, refId;
		// cascade delete
		body = post(_, cookie, "deleteTestCascadeMasters", {
			name: "Cascade Master"
		}, 201);
		var masterUuid = body.$uuid;
		body = post(_, cookie, "deleteTestCascadeDetails", {
			name: "Cascade Detail 1",
			master: {
				$uuid: masterUuid
			}
		}, 201);
		var detail1Uuid = body.$uuid;
		body = post(_, cookie, "deleteTestCascadeDetails", {
			name: "Cascade Detail 2"
		}, 201);
		var detail2Uuid = body.$uuid;
		body = put(_, cookie, "deleteTestCascadeMasters('" + masterUuid + "')", {
			detailsWoInv: [{
				$uuid: detail2Uuid
			}]
		}, 200);
		// check
		body = get(_, cookie, "deleteTestCascadeMasters('" + masterUuid + "')", 200);
		strictEqual(body.detailsWInv.length, 1, "Has detail with inv ok");
		strictEqual(body.detailsWoInv.length, 1, "Has detail w/o inv ok");
		// delete details, must pass
		body = del(_, cookie, "deleteTestCascadeDetails('" + detail1Uuid + "')", 200);
		body = del(_, cookie, "deleteTestCascadeDetails('" + detail2Uuid + "')", 200);
		// check
		body = get(_, cookie, "deleteTestCascadeMasters('" + masterUuid + "')", 200);
		ok((!body.detailsWInv || !body.detailsWInv.length),
			"Del detail with inv ok");
		// This test will fail as if there is no inverse relation is no way
		// (yet) for the relation to be notified of the delete
		// ok((!body.detailsWoInv || !body.detailsWoInv.length), "Del detail
		// w/o inv ok");
		// recreate details
		body = post(_, cookie, "deleteTestCascadeDetails", {
			name: "Cascade Detail 1",
			master: {
				$uuid: masterUuid
			}
		}, 201);
		//
		// var detail1Uuid = body.$uuid; body = post(_, cookie,
		// "deleteTestCascadeDetails", { name: "Cascade Detail 2" }, 201);
		// var detail2Uuid = body.$uuid; body = put(_, cookie,
		// "deleteTestCascadeMasters('" + masterUuid + "')", { detailsWoInv: [{
		// $uuid: detail2Uuid}] }, 200);
		//
		// check
		body = get(_, cookie, "deleteTestCascadeMasters('" + masterUuid + "')", 200);
		strictEqual(body.detailsWInv.length, 1, "Has detail with inv ok");
		strictEqual(body.detailsWoInv.length, 1, "Has detail w/o inv ok");
		// delete master, must pass
		body = del(_, cookie, "deleteTestCascadeMasters('" + masterUuid + "')", 200);
		// details must not exists
		body = get(_, cookie, "deleteTestCascadeDetails('" + detail1Uuid + "')", 404);
		body = get(_, cookie, "deleteTestCascadeDetails('" + detail2Uuid + "')", 404);
		//
	});

	it('delete test many to many', function(_) {
		var body, parentId, refId;

		// many to many unassociate test
		// create As
		body = post(_, cookie, "deleteTestManyToManyAs", {
			name: "A1"
		}, 201);
		var A1 = body.$uuid;
		body = post(_, cookie, "deleteTestManyToManyAs", {
			name: "A2"
		}, 201);
		var A2 = body.$uuid;
		// create Bs
		body = post(_, cookie, "deleteTestManyToManyBs", {
			name: "B1",
			Alist: [{
				$uuid: A1
			}, {
				$uuid: A2
			}]
		}, 201);
		var B1 = body.$uuid;
		body = post(_, cookie, "deleteTestManyToManyBs", {
			name: "B2",
			Alist: [{
				$uuid: A2
			}]
		}, 201);
		var B2 = body.$uuid;
		// association is : A1 <-> [B1], A2 <-> [B1, B2]
		//                  B1 <-> [A1, A2], B2 <-> [A2]
		// test the lists
		body = get(_, cookie, "deleteTestManyToManyAs('" + A2 + "')", 200);
		strictEqual(body.Blist.length, 2, "A2.Blist count ok");
		// remove B2 from A2.Blist
		body = put(_, cookie, "deleteTestManyToManyAs('" + A2 + "')", {
			Blist: [{
				$uuid: B2,
				$isDeleted: true,
				$index: 0
			}]
		}, 200);
		body = get(_, cookie, "deleteTestManyToManyAs('" + A2 + "')", 200);
		strictEqual(body.Blist.length, 1, "A2.Blist count ok");
		strictEqual(body.Blist[0].$uuid, B1, "A2.Blist item ok");
		// B2 must stil exist
		body = get(_, cookie, "deleteTestManyToManyBs('" + B2 + "')", 200);
		// B2.AList should be empty
		ok(!body.Alist || !body.Alist.length, "B2.Alist count ok");
		// remove B1 from A1.Blist
		body = put(_, cookie, "deleteTestManyToManyAs('" + A1 + "')", {
			Blist: [{
				$uuid: B1,
				$isDeleted: true,
				$index: 0
			}]
		}, 200);
		body = get(_, cookie, "deleteTestManyToManyAs('" + A1 + "')", 200);
		ok(!body.Blist || !body.Blist.length, "A1.Blist count ok");
		// B1 must stil exist
		body = get(_, cookie, "deleteTestManyToManyBs('" + B1 + "')", 200);

	});
});