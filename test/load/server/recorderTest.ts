"use strict";

var recorder = require('syracuse-load/lib/recorder');
var util = require('util');
var stream = require('stream');
var fs = require('streamline-fs');

var tracer; // = console.log;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	//stream which outputs 'index' chunks of data

	function SourceStream(index) {
		var self = this;
		var paused = false;
		self.readable = true;
		self.writable = false;
		stream.Stream.call(this);
		self.pause = function() {
			tracer && tracer("Source paused");
			paused = true;
		};
		self.resume = function() {
			tracer && tracer("Source resumed");
			paused = false;
			emitData();
		};

		function emitData() {
			process.nextTick(function() {
				while (!paused && index >= 0) {
					if (index > 0) {
						var b = new Buffer(1);
						b[0] = 96 + index;
						index--;
						tracer && tracer("Source data " + b);
						self.emit('data', b);
					} else {
						index--;
						tracer && tracer("Source end");
						self.emit('end');
					}
				}
			});
		}
	}

	util.inherits(SourceStream, stream.Stream);

	it('recorder test', function(_) {
		var source = new SourceStream(3);
		var rec = new recorder.StreamRecorder(source);
		var read = function(rec1, length, callback) {
			tracer && tracer("READ   " + length);
			var rec = rec1.newStream();
			var length1 = length;
			var result = "";
			rec.on('data', function(data) {
				tracer && tracer(length + "Read on data " + data);
				if (length > 0) {
					result += data;
					length--;
				}
				if (length === 0) {
					tracer && tracer("Callback " + result);
					length--;
					rec.pause();
					return callback(null, result);
				}
			});
			rec.on('end', function() {
				tracer && tracer("Read on end" + length);
				if (length > 0) return callback(null, result);
			});
			tracer && tracer("Ask to resume");
			rec.resume();
		};

		strictEqual("c", read(rec, 1, _), "length 1");
		strictEqual("cb", read(rec, 2, _), "length 2");
		strictEqual("c", read(rec, 1, _), "length 1");
		strictEqual("cba", read(rec, 3, _), "length 3");
		strictEqual("cba", read(rec, 4, _), "length 3 with end");
		strictEqual("cb", read(rec, 2, _), "length 2");
		strictEqual("cba", read(rec, 4, _), "length 3 with end");

		source = new SourceStream(0);
		rec = new recorder.StreamRecorder(source);
		var res = read(rec, 5, _);
		strictEqual("", res, "length 0");
	});

	it('recorder test with pipe', function(_) {
		var source = new SourceStream(3);
		var rec1 = new recorder.StreamRecorder(source);

		var test = function(callback) {
			var writeStream = new WriteStream(callback);
			var rec = rec1.newStream();
			rec.resume();
			rec.pipe(writeStream);
		};

		function WriteStream(callback) {
			var self = this;
			self.readable = false;
			self.writable = true;
			stream.Stream.call(this);
			self.write = function(data) {
				tracer && tracer("1Read. data " + data);
				setTimeout(function() {
					tracer && tracer("Emit drain to " + util.format(self.listeners('drain')));
					var dr = self.listeners('drain')[0];
					tracer && tracer(dr.toString());
					self.emit('drain');
				}, 100);
				return false;

			};
			self.end = function(data) {
				tracer && tracer("End. data" + data);
				return callback(null, "OK");
			};
		}
		util.inherits(WriteStream, stream.Stream);

		strictEqual("OK", test(_), "length 1");
	});

	it('recorder test with encoding', function(_) {
		var source = new SourceStream(6);
		var rec = new recorder.StreamRecorder(source);
		var rec1 = rec.newStream();

		var readFromStream = function(rec1, callback) {
			var data = "";
			rec1.setEncoding('ucs2');
			rec1.on('data', function(chunk) {
				data += chunk;
			});
			rec1.on('end', function() {
				return callback(null, data);
			});
		};

		var data = readFromStream(rec1, _);
		strictEqual(data.length, 3, "length");
		strictEqual(data.charCodeAt(0), 0x6566, "first character");
		strictEqual(data.charCodeAt(1), 0x6364, "second character");
		strictEqual(data.charCodeAt(2), 0x6162, "third character");

	});

	it('recorder test with loadFully', function(_) {
		var source = new SourceStream(6);
		var rec = new recorder.StreamRecorder(source);
		rec.loadFully(_);
		var rec1 = rec.newStream();

		var readFromStream = function(rec1, callback) {
			var data = "";
			rec1.setEncoding('ucs2');
			rec1.on('data', function(chunk) {
				data += chunk;
			});
			rec1.on('end', function() {
				return callback(null, data);
			});
		};

		var data = readFromStream(rec1, _);
		strictEqual(data.length, 3, "length");
		strictEqual(data.charCodeAt(0), 0x6566, "first character");
		strictEqual(data.charCodeAt(1), 0x6364, "second character");
		strictEqual(data.charCodeAt(2), 0x6162, "third character");
	});
});