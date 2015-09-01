"use strict";
QUnit.module(module.id);

try {
	var config = require('config').unit_test.oracle;
} catch (ex) {
	console.error(ex);
	return test('TEST NOT CONFIGURED', 1, function() {
		ok(true, ex.message);
	});
}

var oracledb = require('oracledb');
var ez = require('ez-streams');
var ezoracle = require('ez-oracle');

var conn;

asyncTest("connect", 1, function(_) {
	conn = oracledb.getConnection(config, ~_);
	try {
		conn.execute('DROP TABLE T1', ~_);
	} catch (ex) {}
	conn.execute('CREATE TABLE T1 (C1 NUMBER, C2 VARCHAR(10), C3 RAW(8))', ~_);
	ok(true, "connected and table created");
	start();
});

asyncTest("roundtrip", 1, function(_) {
	var wr = ezoracle.writer(conn, "INSERT INTO T1 (C1, C2, C3) VALUES (:1, :2, :3)");

	var data = [{
		C1: 4,
		C2: "Hello",
		C3: new Buffer("0123456789abcdef", "hex")
	}, {
		C1: 7,
		C2: "World",
		C3: new Buffer("aabbccddeeff0011", "hex")
	}, ];
	ez.devices.array.reader(data).pipe(_, wr);
	var result = ezoracle.reader(conn, "SELECT C1, C2, C3 FROM T1").toArray(_);
	deepEqual(result, data);
	start;
});