"use strict";

import { assert } from 'chai';
const equal = assert.equal;

describe(module.id, () => {
	var sys = require("util");
	var tracer; // = console.error;

	var config = require('config');
	var MONGO_BASE_URL = "mongodb://" + (config.collaboration.hostname || "localhost") + ":" + (config.collaboration.port || 27017);

	it('MongoDb driver test', function (_) {

		var sys = require("util");
		var MongoClient = require('mongodb').MongoClient;
		var db = MongoClient.connect(MONGO_BASE_URL + "/test_mongo", {
			db: {
				w: 1
			}
		}, _);
		//	tracer && tracer('opened');
		// cleanup
		db.dropDatabase(_);

		// Fetch the collection test
		var collection = db.collection('test', _);
		//
		collection.ensureIndex({
			name: 1
		}, {
				unique: false
			}, _);
		// Insert three records
		var docs = collection.insert([{
			'a': 1
		}, {
			'a': 2
		}, {
			'b': 3
		}], _);
		// Count the number of records
		var count = collection.count(_);
		equal(count, 3, '3 records expected, ' + count + ' records found');
		//	tracer && tracer("There are " + count + " records.");
		// Find all records. find() returns a cursor
		var cursor = collection.find(_);
		var doc;
		while (doc = cursor.nextObject(_)) {
			tracer && tracer("doc: " + sys.inspect(doc));
		}

		// Cursor has an to array method that reads in all the records to memory
		cursor = collection.find(_);
		docs = cursor.toArray(_);
		//	tracer && tracer("Printing docs from Array")
		docs.forEach(function (doc) {
			//	    tracer && tracer("Doc from Array " + sys.inspect(doc));
			// TODO
		});

		// Locate specific document by key
		cursor = collection.find({
			'a': 1
		}, _);
		docs = cursor.toArray(_);
		docs.forEach(function (doc) {
			// TODO
			//		sys.puts("Returned #1 documents : "+sys.inspect(doc));
		});

		// Find records sort by 'a', skip 1, limit 2 records
		// Sort can be a single name, array, associate array or ordered hash
		cursor = collection.find({}, {
			'skip': 1,
			'limit': 2,
			'sort': 'a'
		}, _);
		docs = cursor.toArray(_);
		equal(docs.length, 2, '2 records expected, ' + docs.length + ' records found');
		//	sys.puts("Returned #" + docs.length + " documents");
		// Find all records with 'a' > 1, you can also use $lt, $gte or $lte
		cursor = collection.find({
			'a': {
				'$gt': 1
			}
		}, _);
		docs = cursor.toArray(_);
		equal(docs.length, 1, '1 records expected, ' + docs.length + ' records found');

		cursor = collection.find({
			'a': {
				'$gt': 1,
				'$lte': 3
			}
		}, _);
		docs = cursor.toArray(_);
		equal(docs.length, 1, '1 records expected, ' + docs.length + ' records found');

		// Find all records with 'a' in a set of values
		cursor = collection.find({
			'a': {
				'$in': [1, 2]
			}
		}, _);
		docs = cursor.toArray(_);
		equal(docs.length, 2, '2 records expected, ' + docs.length + ' records found');

		// Find by regexp
		//	cursor = collection.find({'a': /[1|2]/}, _);
		//	docs = cursor.toArray(_);
		//	equal(docs.length,2,'RegExp : 2 records expected, '+docs.length+' records found');
		// Print Query explanation
		//	cursor = collection.find({'a': /[1|2]/}, _);
		//	var doc = cursor.explain(_);
		//	tracer && tracer(doc);
		//
		db.close();
	});
});