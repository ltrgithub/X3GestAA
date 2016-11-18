"use strict";
var util = require('util');
var stream = require('stream');
var mock = require('./mock');
var events = require('events');
var tracer; // = console.log

/// ## StreamRecorder
/// The stream recorder takes a readable stream and can put its contents to arbitrarily many readable streams which are created with `newStream`.
/// the whole contents of the stream will be stored.

function StreamRecorder(readableStream) {
	var self = this;
	// the chunks which have been recorded
	self.chunks = [];
	self._queue = [];
	// for 
	// var callback = null;
	self.paused = true; // is original stream paused?
	readableStream.pause();
	self.originalStream = readableStream;
	readableStream.on('data', function(data) {
		tracer && tracer("Recorder on data " + data.length);
		self.chunks.push(data);
		readableStream.pause();
		self.paused = true;
		while (self._queue.length > 0) {
			self._queue.shift()._processData();
		}
	});

	readableStream.on('end', function(chunk) {
		tracer && tracer("Recorder on end" + self.chunks.length);
		self.chunks.push(null);
		while (self._queue.length > 0) {
			self._queue.shift()._processData();
		}
	});

	/// Asynchronous function which loads fully the source stream so that it can be closed afterwards
	self.loadFully = function(callback) {
		var dummy = new _DummyWritableStream(callback);
		self.newStream().pipe(dummy);
	};
}

StreamRecorder.prototype.queue = function(stream) {
	tracer && tracer("Queue");
	var self = this;
	self._queue.push(stream);
	if (self.paused) {
		tracer && tracer("Resume readable stream");
		self.originalStream.resume();
		self.paused = false;
	}
};
/// The method newStream() returns a readable stream. There can be an arbitrary number of readable streams. They all take their
/// data from the recorded chunks of the original stream.
StreamRecorder.prototype.newStream = function() {
	var self = this;
	return new _RecorderStream(self);
};




// take dummy writable stream which just calls callback function on end and pipe stream to this stream

function _DummyWritableStream(callback) {
	this.writable = true;
	this._callback = callback;
}
_DummyWritableStream.prototype = new events.EventEmitter();
_DummyWritableStream.prototype.write = function(data) {
	tracer && tracer("dummy stream write" + data);
	return true;
};

_DummyWritableStream.prototype.end = function(data) {
	tracer && tracer("dummy stream end" + data);
	return this._callback(null);
};


// Internal class: get a readable stream

function _RecorderStream(mainStream) {
	tracer && tracer("RECORDER STREAM");
	stream.Stream.call(this);
	/// The original stream is available as attribute `originalStream`
	this.headers = mainStream.originalStream.headers;
	this.url = mainStream.originalStream.url;
	this.method = mainStream.originalStream.method;
	this.index = 0;
	this.paused = false;
	this._remainingBytes = 0;
	this._remainingBuffer = null;
	this._encoding = null;
	this.readable = true;
	this.writable = false;
	this._mainStream = mainStream;
	this._processData();
}
util.inherits(_RecorderStream, stream.Stream);


_RecorderStream.prototype.pause = function() {
	tracer && tracer("Recorder pause");
	this.paused = true;
};

_RecorderStream.prototype.resume = function() {
	var self = this;
	tracer && tracer("Recorder resume");
	self.paused = false;
	self._processData();
};

_RecorderStream.prototype._processData = function() {
	var self = this;
	tracer && tracer("Recorder process data");
	process.nextTick(function() {
		tracer && tracer("Recorder Next tick");
		if (!self.paused) {
			tracer && tracer("Recorder fetch data " + self.index + " " + util.format(self._mainStream.chunks));
			if (self.index >= self._mainStream.chunks.length) {
				tracer && tracer("Recorder resume source");
				// get next chunk of data
				self._mainStream.queue(self);
				return;
			}
			var _chunk = self._mainStream.chunks[self.index++];
			if (_chunk) {
				tracer && tracer("Recorder emit data " + _chunk.length);
				if (self._encoding) {
					// try whether buffer can be converted completely to string
					if (self._remainingBuffer) {
						_chunk = Buffer.concat([self._remainingBuffer, _chunk]);
						self._remainingBuffer = null;
					}
					var remaining = mock.bufferEncoding(_chunk, self._encoding);
					if (remaining) {
						var start = _chunk.length - remaining;
						if (start === 0) {
							self._remainingBuffer = _chunk;
							// it does not make sense to send an empty string to the listeners - therefore no 'emit'
						} else {
							self._remainingBuffer = _chunk.slice(_chunk.length - remaining);
							var text = _chunk.slice(0, _chunk.length - remaining).toString(self._encoding);
							// transmit the data
							self.emit('data', text);
						}
					} else {
						var text = _chunk.toString(self._encoding);
						self.emit('data', text);
					}
				} else self.emit('data', _chunk);
				if (!self.paused) {
					tracer && tracer("Recorder Process data again");
					return self._processData();
				}
			} else {
				tracer && tracer("Recorder emit end");
				self.emit('end');
			}
		}
	});
};

_RecorderStream.prototype.setEncoding = function(encoding) {
	// normalize the encoding
	this._encoding = (encoding || "utf8").toLowerCase().replace(/[-_]/, '');
};





exports.StreamRecorder = StreamRecorder;