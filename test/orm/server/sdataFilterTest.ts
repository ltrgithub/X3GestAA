import { _ } from 'streamline-runtime';
declare function it(name: string, test: (_: _) => any): any;

import { helpers, apis } from '@sage/syracuse-core';
const uuid = helpers.uuid;
var config = require('config'); // must be first syracuse require
import { inspect } from 'util';
var parser = require('@sage/syracuse-sdata-parser');
import { assert } from 'chai';
const ok = assert.ok;
const strictEqual = assert.strictEqual;
var tracer; // = console.log;
//force basic auth
config.session = config.session || {};
config.session.auth = "basic";
config.session.ignoreStoreSession = true;

//add model
var endPoint = {
	contract: require("test-contract/lib/contract").contract,
	datasets: {
		mongodb_example: {
			driver: "mongodb",
		}
	}
};
//config.sdata.endpoints.push(endPoint);
//endPoint.contract.datasets = endPoint.datasets;

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var contractUrl = "/sdata/example/admin/mongodb_example/";
var syracuse = require('syracuse-main/lib/syracuse');
var testAdmin = apis.get('test-admin');

describe(module.id, () => {
	var db;

	it('init database', function (_) {
		testAdmin.createTestAdminEndpoint(_, "unit-test-admin");
		db = testAdmin.createTestOrm(_, endPoint, "mongodb_example");
		/*
		var server = new mongodb.Server(endPoint.datasets["mongodb_example"].hostname, endPoint.datasets["mongodb_example"].port, {});
		var db = testAdmin.newMongoDb(endPoint.datasets["mongodb_example"].database, server, {});
		db = db.open(_);
		db.dropDatabase(_);*/
		ok(true, "mongodb initialized");
	});

	it('sdata matches test', function (_) {
		// make a country
		var countryEntity = db.model.getEntity(_, "country");
		var country = countryEntity.factory.createInstance(_, null, db);
		country.code(_, "FR");
		country.description(_, "France");
		country.$loaded = true;
		strictEqual(country.code(_), "FR", "Country created ok");
		// simple conditions
		strictEqual(country.match(_, parser.parse("code eq 'FR'")), true, "Simple 'eq' 1 Ok");
		strictEqual(country.match(_, parser.parse("code eq 'US'")), false, "Simple 'eq' 2 Ok");
		strictEqual(country.match(_, parser.parse("code ne 'FR'")), false, "Simple 'ne' 1 Ok");
		strictEqual(country.match(_, parser.parse("code ne 'US'")), true, "Simple 'ne' 2 Ok");
		strictEqual(country.match(_, parser.parse("code lt 'FR'")), false, "Simple 'lt' 1 Ok");
		strictEqual(country.match(_, parser.parse("code le 'FR'")), true, "Simple 'le' 1 Ok");
		strictEqual(country.match(_, parser.parse("code lt 'FZ'")), true, "Simple 'lt' 2 Ok");
		strictEqual(country.match(_, parser.parse("code gt 'FR'")), false, "Simple 'gt' 1 Ok");
		strictEqual(country.match(_, parser.parse("code ge 'FR'")), true, "Simple 'ge' 1 Ok");
		strictEqual(country.match(_, parser.parse("code gt 'FA'")), true, "Simple 'gt' 2 Ok");
		strictEqual(country.match(_, parser.parse("code like 'F%'")), true, "Simple 'like' 1 Ok");
		strictEqual(country.match(_, parser.parse("code like '%F'")), false, "Simple 'like' 2 Ok");
		strictEqual(country.match(_, parser.parse("code like '%F%'")), true, "Simple 'like' 3 Ok");
		strictEqual(country.match(_, parser.parse("code like '%U%'")), false, "Simple 'like' 4 Ok");
		strictEqual(country.match(_, parser.parse("code between 'FA' and 'FZ'")), true, "Simple 'between' 1 Ok");
		strictEqual(country.match(_, parser.parse("code between 'AA' and 'AZ'")), false, "Simple 'between' 2 Ok");
		// more complex conditions
		strictEqual(country.match(_, parser.parse("((code like '%F%') and (description like '%ra%'))")), true, "Complex multiple expression 1 Ok");
		// deep navigate conditions
		var addressEntity = db.model.getEntity(_, "address");
		var address = addressEntity.factory.createInstance(_, null, db);
		address.country(_, country);
		var userEntity = db.model.getEntity(_, "user");
		var user = userEntity.factory.createInstance(_, null, db);
		user.address(_, address);
		tracer && tracer("expression (99): " + inspect(parser.parse("address.country.code eq 'FR'"), null, 6));
		strictEqual(user.match(_, parser.parse("address.country.code eq 'FR'")), true, "Deep 'eq' 1 Ok");
		//
		var tEnt = db.getEntity(_, "typesTest");
		var t = tEnt.createInstance(_, db);
		t.bool(_, true);
		strictEqual(t.match(_, parser.parse("bool eq true")), true, "Bool 'eq' true 1 Ok");
		strictEqual(t.match(_, parser.parse("bool eq false")), false, "Bool 'eq' false 1 Ok");
		t.bool(_, false);
		strictEqual(t.match(_, parser.parse("bool eq true")), false, "Bool 'eq' true 2 Ok");
		strictEqual(t.match(_, parser.parse("bool eq false")), true, "Bool 'eq' false 2 Ok");
	});
});