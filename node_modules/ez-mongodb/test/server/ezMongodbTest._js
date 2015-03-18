"use strict";
QUnit.module(module.id);

var ez = require('ez-streams');
var MongoClient = require('streamline-mongodb').MongoClient;

asyncTest("initialize database", 0, function(_) {
    var db = MongoClient.connect("mongodb://localhost:27017/unit_test", _);
    db.dropDatabase(_);
    
    start();
});

asyncTest("mongodb factory test", 2, function(_) {
    // get a mongodb writer
    var wr = ez.factory("mongodb://localhost:27017/unit_test/CollectionA").writer(_);
    wr.write(_, {
        a: 1,
        b: "String1"
    });
    var rd = ez.factory("mongodb://localhost:27017/unit_test/CollectionA").reader(_);
    var res = rd.read(_);
    strictEqual(res.b, "String1", "Got first document ok");
    res = rd.read(_);
    strictEqual(res, undefined, "End of collection ok");
     
    start();
});

