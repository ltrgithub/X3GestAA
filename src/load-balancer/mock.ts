"use strict";
/// !doc
/// # Mock API  
var stream = require('stream');
var events = require('events');
var streams = require('ez-streams')['node-wrappers'];
var globals = require('streamline-runtime').globals;
var util = require('util');
var fs = require('fs');


exports.BALANCER_HEADER = "syracusebalancerheader"; // special Http header for passing load balancing information (not used in this file 
exports.TENANT_HEADER = "syracusetenantheader"; // special Http header for passing the tenant in multitenant mode
exports.RESTRICT_HEADER = "x-syracuse-restrict"; // special Http header for entering restricted mode (does not accept new connections any more, not used in this file)

var tracer; // = console.log;

/// Pass HTTP requests and responses through a pipe
// Two instances of this Mock class must be connected using two pipes so that bidirectional exchange is possible. Usually this
// is standard input and standard output of a child process. Each side can send a request to the other side which will be processed by
// the request handler on the other side. There is no check that a request handler is available! Since the situation is totally symmetric,
// in the sequel, the side which poses the request, will be called client, the other side server.
// Internal processing:
// Each request/response gets an sequence number so that parallel requests/responses can be distinguished.
// An HTTP request/response contains headers etc. - in the sequel this will be called "metadata" and a stream of data
// (In detail: relevant metadata are: headers, url, method, HTTP version, response code, connection.authorized, connection.getPeerCertificate(), connection.localPort, connection.remoteAddress 
// (to find out SSL connections and the client certificate. The mocks cannot handle SSL but will transport these two details).
// Whenever metadata or a chunk of data is transferred, there is a header first which tells about the kind of data and
// the byte length and the sequence number.
// The client listens on a readable stream (usually an HTTP request). When the first data come, the metadata and the first chunk of data 
// will be transferred to the client and the requestListener on the server will be invoked. 
// For each chunk of data (except for the final chunk which contains an end marker), a confirmation header will be sent back.
// The writable stream of the client (and server) will not accept further data until the confirmation has been received.
// Upon the 'end' event of the readable stream on the client, the header will contain an end marker. Since no more data are to come, there
// will not be a confirmation for this.
// The last chunk of the response (from server to client) will delete the temporary storage for this sequence number on the server and then 
// on the client. When there is no temporary storage for a sequence number and the header is no start header, it will be ignored on the other side.
// The mock http request on the server tries to imitate the original http request: it contains its headers, url, method, http version and
// a readable stream, but the connection attribute is empty except for 'authorized' and getPeerCertificate() to detect SSL connections and remoteAddress and localPort.
// the mock http response on the server tries to imitate the original http response. It contains its set/remove header methods, the writeHead
// method, statusCode, but the writeContinue() method is not implemented at the moment.
// There is an optional timeout. When the answer is not complete within the timeout, it will be closed. When there is a close event from
// any side (HTTP request/response), all streams will be finished and the temporary storage for this sequence number will be removed on both sides

// no more input after this 
var ENDMARKER = 0x02;
// special headers have this bit set
var SPECIAL = 0x40;
var CONFIRMATION = SPECIAL;
// ping header for just testing whether server can be reached
var PING = SPECIAL + 1;
// header to inform that the connection has been closed on client side
var CLOSED = SPECIAL + 2;
// header for retrieving detail information about current requests
var DETAILS = SPECIAL + 3;
// connection header for engine.io
var IO_CONN = SPECIAL + 4;
// send header for engine.io
var IO_SEND = SPECIAL + 5;
//binary data send header for engine.io
var IO_SENDB = SPECIAL + 6;
// close header for engine.io
var IO_CLOSE = SPECIAL + 7;
// drain header for engine.io
var IO_DRAIN = SPECIAL + 8;
// header for getting status information (similar to ping, but gives return value -1: no more session, >= 0: number of current sessions
var PINGSTATUS = SPECIAL + 9;
// marks that this is a response header (originated from the server), can also be a confirmation header back to the server
var RESPONSE = 0x80;
// length of header in bytes
var HEADERLENGTH = 9;
// a non-special header with this bit set is the first header of the connection
var STARTFRAME = 0x01;


exports.getLocalPort = function(request) {
	var localPort = (request.connection && request.connection.__syra_localPort);
	if (!localPort) {
		localPort = (request.connection && request.connection.localPort);
		if (!localPort) {
			localPort = request.headers && (request.headers['x-forwarded-host'] || request.headers.host);
			if (localPort) {
				localPort = localPort.substr(localPort.lastIndexOf(":") + 1);
				if (request.connection) request.connection.__syra_localPort = +localPort;
			} else {
				if (!request.fromNanny && !request._fromNanny && (!request._request || !request._request.fromNanny)) {
					console.error("No local port found in request " + (new Error().stack) + request.url);
				}
				return 0;
			}
		}
		if (request.connection) request.connection.__syra_localPort = +localPort;
	}
	return +localPort;
};


// copies attributes from HttpServerRequest to the target (or to a newly created object) and returns the target
// reasonPhrase: not official attribute, but used to transfer reason phrase to client
// fromNanny: not official attribute, but used to indicate internal requests
// _writeHeadCalled: indicates that 
exports.extractDataFromRequest = function(source, target) {
	target = target || {};
	["sendDate", "_writeHeadCalled", "headers", "httpVersion", "httpVersionMajor", "httpVersionMinor", "url", "method", "reasonPhrase", "statusCode", "fromNanny"].forEach(function(key) {
		if (key in source) target[key] = source[key];
	});
	if ("connection" in source) {
		target.connection = {
			remoteAddress: source.connection.remoteAddress,
			localPort: exports.getLocalPort(source)
		};
		if ("authorized" in source.connection) {
			target.connection.authorized = source.connection.authorized;
			target.connection._peerCertificate = source.connection.getPeerCertificate ? source.connection.getPeerCertificate() : source.connection._peerCertificate;
			target.connection.getPeerCertificate = function() {
				return this._peerCertificate;
			};
		}
	}
	return target;
};

exports.attachEngineIO = function(engine, client, findClient, transferSocket) {
	if (!engine) engine = require('engine.io').attach(client, {
		path: "/socket.io"
	});
	engine.on('connection', function(socket) {
		// find out which process belongs to this session
		tracer && tracer("On connection");
		var mockClient = findClient(socket.request);
		if (!mockClient) {
			socket.firstMessage = true;
			tracer && tracer("Cannot find client for engine.io connection" + util.format(socket.request.headers));
			socket.on('message', function(data) {
				// console.log(">>>>> " + socket.firstMessage + "Information: " + data);
				if (transferSocket && socket.firstMessage && data.substr(0, 5) === "INIT ") {
					transferSocket(data.substr(5), socket);
				}
				socket.firstMessage = false;
			});
			socket.on('close', function() {
				tracer && tracer("CLOSE XXXXX");
			});
			socket.on('error', function(e) {
				tracer && tracer("ERROR XXXXX" + e);
			});
		} else mockClient.registerEngine(socket);
	});
};



// Mock socket



/// ## Mock class
/// constructor parameters: outputStream, inputStream, requestHandler and clientOptions
/// clientOptions is an object with the following optional attributes: 
/// timeout: after this time (in seconds), the request data will be deleted
/// request handler has already been wrapped to resume input stream
exports.Mock = Mock;

function Mock(outputStream, inputStream, requestHandler, clientOptions, wrapped) {
	events.EventEmitter.call(this);
	tracer && tracer("MOCK start; client options " + util.format(clientOptions));
	this._clientOptions = clientOptions;
	if (clientOptions && clientOptions.pingfunction) this.pingfunction = clientOptions.pingfunction;
	this._sequenceNumber = 0;
	this._registry = {}; // contains all data for the current request. Key is the request sequence number, values are arrays of readableStream, writableStream, call back function, ping call back function
	this._registryForeign = {}; // contains all data for the foreign request which is processed here.
	// contains the instances of writable stream which want to write data
	this._queue = [];
	// input stream of child: to this the data will be written
	this._outputStream = outputStream;
	// child stream is writable? 
	this._outputReady = true;
	// output stream of child: return data
	this._inputStream = inputStream;
	// has a global error occurred?
	this._globalError;
	// mock engine.io
	this._mockEngine;
	this._ident;

	if (requestHandler) {
		var requestHandler0 = wrapped ? requestHandler : function(req, resp, _) {
			req.resume();
			requestHandler(req, resp, _);
		};
		this.addListener('request', function(req, resp) {
			requestHandler0(req, resp, function(err) {
				if (err) throw err;
			});
		});
	}

	var self = this;

	outputStream.on('drain', function() {
		self._outputReady = true;
		self._shift();
	});

	outputStream.on('error', self.globalError.bind(self));
	inputStream.on('error', self.globalError.bind(self));
	inputStream.on('end', self.globalError.bind(self));
	inputStream.on('close', self.globalError.bind(self));

	// these variables are only interesting for the following function
	var _currentHeaderType; // type of current header
	var _currentHeaderNumber; // request number of current header
	var _remainingBytes = HEADERLENGTH;
	var _partialChunks = []; // when input stream delivers short chunks which are only part of header or frame data, store the parts here temporarily
	var _header = true; // header data expected 

	// read from stream
	inputStream.on('data', function(chunk) {
		var chunkLength = chunk.length;
		var chunkRemaining = chunkLength;
		while (chunkRemaining > 0) {
			// not enough data
			if (chunkRemaining < _remainingBytes) {
				_partialChunks.push(chunk.slice(chunkLength - chunkRemaining));
				_remainingBytes -= chunkRemaining;
				return;
			}
			// can complete header/data
			var b = chunk.slice(chunkLength - chunkRemaining, chunkLength - chunkRemaining + _remainingBytes);
			chunkRemaining -= _remainingBytes;
			_remainingBytes = 0;
			// add other chunks
			if (_partialChunks.length > 0) {
				_partialChunks.push(b);
				b = Buffer.concat(_partialChunks);
				_partialChunks.length = 0;
			}
			if (_header) { // end of new frame header
				if (b.length < HEADERLENGTH) {
					// this case should not happen - but it happened once
					var text = "HEADER TOO SHORT " + b.length + " " + chunkRemaining + " " + util.format(b) + " " + util.format(chunk);
					console.error(text);
					console.log(text);
					if (b.length > 0) _partialChunks.push(b);
					_remainingBytes = HEADERLENGTH - b.length;
					continue;
				}
				_currentHeaderType = b[0];
				_currentHeaderNumber = b.readUInt32LE(5);
				_remainingBytes = b.readUInt32LE(1);
				if (_remainingBytes > 0) {
					_header = false;
				} else {
					_remainingBytes = HEADERLENGTH;
					self._chunkProcessing(_currentHeaderType, _currentHeaderNumber, null);
				}
			} else {
				_header = true; // data for next header
				_remainingBytes = HEADERLENGTH;
				self._chunkProcessing(_currentHeaderType, _currentHeaderNumber, b);
			}
		}
	});

}

util.inherits(Mock, events.EventEmitter);

// for debugging: name of current instance
Mock.prototype.setIdent = function(ident) {
	this._ident = ident;
};


// number of current requests
Mock.prototype.numberRequests = function() {
	tracer && tracer("Open requests own " + util.format(Object.keys(this._registry)) + " foreign " + util.format(Object.keys(this._registryForeign)));
	return Object.keys(this._registry).length + "/" + Object.keys(this._registryForeign).length;
};

// increment sequence number of request
Mock.prototype._step = function() {
	this._sequenceNumber++;
	if (this._sequenceNumber > 2000000000) this._sequenceNumber = 0;
	return this._sequenceNumber;
};

// queue a write request
Mock.prototype._write = function(queueElements) {
	var self = this;
	if (queueElements instanceof Array) self._queue = self._queue.concat(queueElements);
	else self._queue.push(queueElements);
	if (self._outputReady) self._shift();
};

// register engine.io socket
Mock.prototype.registerEngine = function(socket) {
	tracer && tracer("Register engine");
	var self = this;
	var number = self._step();
	self._registry[number] = [null, null, null, null, socket];
	var data = exports.extractDataFromRequest(socket.request);
	var content = new Buffer(JSON.stringify(data), "utf8");
	self._write([_frameHeader(IO_CONN, number, content.length), content]);
	socket.on('close', function(reason) {
		// console.log("cc close " + reason);
		tracer && tracer("engine.io close event " + reason);
		var b = new Buffer(reason || "");
		self._write([_frameHeader(IO_CLOSE, number, b.length), b]);
		delete self._registry[number];
	});
	socket.on('message', function(data) {
		// console.log("cc message " + data);
		tracer && tracer("engine.io message " + data);
		if (Buffer.isBuffer(data)) {
			self._write([_frameHeader(IO_SENDB, number, data.length), data]);
		} else {
			var b = new Buffer(data.toString());
			// console.log("ccWandel "+b)
			self._write([_frameHeader(IO_SEND, number, b.length), b]);
		}
	});
	socket.on('error', function(error) {
		tracer && tracer("engine.io error " + error);
		tracer && tracer("engine.io error event " + error);
		var b = new Buffer("Error: " + error);
		self._write([_frameHeader(IO_CLOSE, number, b.length), b]);
		delete self._registry[number];
	});
	socket.on('drain', function() {
		tracer && tracer("engine.io drain");
		self._write(_frameHeader(IO_DRAIN + RESPONSE, number, 0));
	});


};

// when one of the streams has been closed, close all other streams and remove data associated with the streams
Mock.prototype.close = function(number, foreign, timeout) {
	var self = this;
	var reg = (foreign ? self._registryForeign : self._registry);
	if (number in reg) {
		// notify other side
		self._write(_frameHeader(CLOSED + (foreign ? RESPONSE : 0), number, 0));
		var entry = reg[number];
		// delete registry
		tracer && tracer("Delete registry " + number + " foreign " + foreign);
		delete reg[number];

		// destroy streams
		self._destroyStreams(entry, timeout);
	}
	console.log(new Date().toISOString(), "MOCK CLOSE " + number + " " + foreign + " " + timeout + " " + new Error(1).stack);
	self.emit('close');

};

Mock.prototype.simpleRequest = function(options, content, _) {
	return simpleRequest(this, options, content, _);
};

// destroy the two streams which are locally associated with this request.
// For timeout send a small response.
// The streams are destroyed in such a way that the self.close method of the client/server is not called any more
Mock.prototype._destroyStreams = function(entry, timeout) {
	var self = this;
	if (entry[0]) {
		entry[0]._destroyInt(true);
	} else {
		// add a dummy response
		var callback = entry[2];
		if (callback) {
			// construct dummy response with non existent number
			var readableStream = new ReadableMockStream({
				statusCode: (timeout ? 408 : 500)
			}, -1, self, RESPONSE);
			tracer && tracer("Create readable stream on caller for dummy callback " + timeout);
			// dummy response
			if (timeout) {
				readableStream.frame("Timeout", true);
				callback(readableStream);
			} else {
				callback(readableStream);
				process.nextTick(function() {
					readableStream._destroyInt(true); // destroy without calling close() function of mock again
				});
			}
		}
	}
	if (entry[1]) entry[1]._destroyInt(true); // destroy without calling close() function of mock again
};

// delete registry entry (to be invoked by the writable mock stream upon end)
Mock.prototype._deleteRegistry = function(number, foreign) {
	tracer && tracer("Delete registry entry " + number + " " + foreign);
	if (foreign) delete this._registryForeign[number];
	else delete this._registry[number];
};

// mechanism will break when _inputStream/_outputStream does not work any more	
Mock.prototype.globalError = function(exception) {
	var self = this;
	console.error(new Date().toISOString(), "Global error " + exception);
	exception = exception || new Error("Stream finished");
	self._globalError = exception;
	for (var number in self._registry) {
		var entry = self._registry[number];
		if (!entry) continue;
		if (entry[0]) { // readableStream, writableStream, call back function
			entry[0].emit('error', exception);
		}
		if (entry[1]) { // readableStream, writableStream, call back function
			entry[1].emit('error', exception);
		}
		if (entry[3]) { // ping callback
			process.nextTick(function() {
				return entry[3](self._globalError);
			});
		}
		if (entry[4] && !entry[3] && entry[4].close) { // engine.io
			console.error(new Date().toISOString(), "GLOBAL ERROR io");
			entry[4].close();
		}
		self._destroyStreams(entry);
	}
	for (var number in self._registryForeign) {
		var entry = self._registry[number];
		if (!entry) continue;
		if (entry[0]) { // readableStream, writableStream, call back function
			entry[0].emit('error', exception);
		}
		if (entry[1]) { // readableStream, writableStream, call back function
			entry[1].emit('error', exception);
		}
		self._destroyStreams(entry);
	}
	// console.error("LEEREN");
	self.emit('close');
	self._registry = {};
	self._registryForeign = {};
};


// shift as much data to the output stream as possible
Mock.prototype._shift = function() {
	var self = this;
	tracer && tracer("SHIFT " + self._queue.length);
	while (self._outputReady && self._queue.length > 0) {
		var streamElement = self._queue.shift();
		self._outputReady = self._outputStream.write(streamElement);
	}
};


/// ### Mock.ping()
/// Send a dummy request to the server with will be answered as fast as possible by the server.
/// The result is the time in milliseconds for the whole request
/// The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
/// This timeout does not have to do anything with the timeout in the Mock constructor.
Mock.prototype.ping = function(callback, timeout) {
	var self = this;
	if (self._globalError) {
		return callback(self._globalError);
	}
	var currentRequest = self._step();

	self._registry[currentRequest] = [null, null, null, callback, Date.now()];
	self._write(_frameHeader(PING, currentRequest, 0));
	if (timeout > 0) {
		setTimeout(function() {
			tracer && tracer("Timeout function");
			if (currentRequest in self._registry) {
				tracer && tracer("Timeout reached");
				callback(new Error("Timeout after " + timeout + " milliseconds"));
				tracer && tracer("Delete registry on timeout " + currentRequest);
				delete self._registry[currentRequest];
			}
		}, timeout);
	}
};

/// ### Mock.ping2()
/// Send a dummy request to the server with will be answered as fast as possible by the server.
/// The result comes from the child process: result of function which has been assigned to mock.pingfunction
/// The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
/// This timeout does not have to do anything with the timeout in the Mock constructor.
Mock.prototype.ping2 = function(callback, timeout) {
	var self = this;
	if (self._globalError) {
		return callback(self._globalError);
	}
	var currentRequest = self._step();

	self._registry[currentRequest] = [null, null, null, callback, Date.now()];
	self._write(_frameHeader(PINGSTATUS, currentRequest, 0));
	if (timeout > 0) {
		setTimeout(function() {
			tracer && tracer("Timeout function");
			if (currentRequest in self._registry) {
				tracer && tracer("Timeout reached");
				callback(new Error("Timeout after " + timeout + " milliseconds"));
				tracer && tracer("Delete registry on timeout " + currentRequest);
				delete self._registry[currentRequest];
			}
		}, timeout);
	}
};

/// ### Mock.detail()
/// Give detail information about all current requests on client and server side.
/// The result is for each request the path and whether there is an entry on client side and on server side and whether there is a response on client side
/// The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
/// This timeout does not have to do anything with the timeout in the Mock constructor.
Mock.prototype.detail = function(callback, timeout) {
	var self = this;
	if (self._globalError) {
		return callback(self._globalError);
	}
	var currentRequest = self._step();

	self._registry[currentRequest] = [null, null, null, callback];
	self._write(_frameHeader(DETAILS, currentRequest, 0));
	if (timeout > 0) {
		setTimeout(function() {
			tracer && tracer("Timeout function");
			if (currentRequest in self._registry) {
				tracer && tracer("Timeout reached");
				callback(new Error("Timeout after " + timeout + " milliseconds"));
				tracer && tracer("Delete registry on timeout " + currentRequest);
				delete self._registry[currentRequest];
			}
		}, timeout);
	}
};

// start a new client request. The options will be passed to the server
// the responseCallback will be invoked with the corresponding readable stream with data from the server
// an optional timeout overrides the client's global timeout when it is not 0.
// when 'options' contains an optional boolean attribute 'fromNanny', this will be transferred to the request on server side
// (used to mark internal calls)
Mock.prototype.request = function(options, responseCallback) {
	var self = this;
	var currentRequest = self._step(); // number used throughout the current request
	tracer && tracer("Start request for number " + currentRequest);
	// replace path with url
	if ('path' in options && !('url' in options)) {
		options.url = options.path;
		delete options.path;
	}
	var writable = new WritableMockStream(options, currentRequest, self, 0);
	// registry content is array of readableStream, writableStream, call back function
	// readable stream not yet known (and important) at the moment - only on first response from server
	self._registry[currentRequest] = [null, writable, responseCallback];
	// set timeout
	var timeout = (options && options.timeout) || (self._clientOptions && self._clientOptions.timeout) || 0;
	tracer && tracer("Timeout in seconds " + timeout);
	if (timeout) {
		setTimeout(function() {
			self.close(currentRequest, false, true); // Timeout!
		}, timeout * 1000);
	}
	return writable;
};


function MockEngine() {
	events.EventEmitter.call(this);
}
util.inherits(MockEngine, events.EventEmitter);

MockEngine.prototype.setMock = function(mock) {
	this._mock = mock;
};


function MockSocket(header, number, server) {
	events.EventEmitter.call(this);
	this.server = server;
	this.id = number;
	header = JSON.parse(header);
	this.request = header;
	this.readyState = "open";
	this.transport = {
		writable: true
	};
	// no "upgraded" attribute at the moment!
}

util.inherits(MockSocket, events.EventEmitter);

/*    - Sends a message, performing `message = toString(arguments[0])` unless
      sending binary data, which is sent as is.
    - **Parameters**
      - `String` | `Buffer` | `ArrayBuffer` | `ArrayBufferView`: a string or any object implementing `toString()`, with outgoing data, or a Buffer or ArrayBuffer with binary data. Also any ArrayBufferView can be sent as is.
      - no callback function available!
    - **Returns** `Socket` for chaining
    */
MockSocket.prototype.write =
	MockSocket.prototype.send = function(data) {
		tracer && tracer("engine.io MOCKSOCKET Send " + data);
		if (data) {
			if (Buffer.isBuffer(data)) {
				var mode = IO_SENDB;
			} else {
				var mode = IO_SEND;
				data = new Buffer(data.toString());
			}
			this.server._mock._write([_frameHeader(mode + RESPONSE, this.id, data.length), data]);
		}
		return this;
	};

MockSocket.prototype.close = function() {
	// console.error("Close " + this.id);
	tracer && tracer("Socket.close() " + this.id);
	if (this.readyState !== "closed") {
		this.readyState = "closed";
		var _mock = this.server._mock;
		_mock._write(_frameHeader(IO_CLOSE + RESPONSE, this.id, 0));
		delete _mock._registryForeign[this.id];
	}
	return this;
};
// process data of complete frame

Mock.prototype._chunkProcessing = function(headerType, headerNumber, data) {
	// condenses contents of registry
	function _condenseRegistry(registry) {
		var result = {};
		for (var key in registry) {
			var entry = registry[key];
			var url = (entry[0] && entry[0].url) || (entry[1] && (entry[1].url || (entry[1]._options && entry[1]._options.url)));
			result[key] = [url, !!entry[0], !!entry[1]];
		}
		return result;
	}

	function _compareResults(client, server) {
		function _statusLetter(entryClient, entryServer) {
			if (entryClient) {
				return entryServer ? "B" : "C";
			} else {
				return entryServer ? "S" : "-";
			}
		}

		var self = this;
		var key;
		var answer = "";
		var url;
		for (key in client) {
			var entry = client[key];
			var serverEntry = server[key] || [];
			url = entry[0] || serverEntry[0] || "-";
			answer += key + " " + url + " " + _statusLetter(entry, serverEntry.length) + _statusLetter(entry[1], serverEntry[1]) + _statusLetter(entry[2], serverEntry[2]) + ";\n";
		}
		for (key in server) {
			if (!(key in client)) {
				var serverEntry = server[key];
				answer += key + " " + url + " " + _statusLetter(null, serverEntry.length) + self._statusLetter(null, serverEntry[1]) + _statusLetter(null, serverEntry[2]) + ";\n";
			}
		}
		return answer;
	}

	var self = this;
	// does this header belong to a request or to a response?
	var responseHeader = !!(headerType & RESPONSE);
	if (responseHeader) {
		tracer && tracer("Response header");
		headerType &= ~RESPONSE;
	}
	// special headers
	if (headerType & SPECIAL) {
		switch (headerType) {
			case CONFIRMATION:
				// return message header: data has been processed, more data can come
				tracer && tracer("Receive confirmation header for " + headerNumber + " response " + !!responseHeader);
				var reg = (responseHeader ? self._registryForeign : self._registry);
				if (headerNumber in reg) {
					var writable = reg[headerNumber][1];
					if (!writable) throw new Error("No Writable stream");
					// stream can receive more data
					writable._markFree();
				} else {
					tracer && tracer("Ignore confirmation header for " + headerNumber + " response " + !!responseHeader);
				}
				break;
			case DETAILS:
				// obtain detail information
				tracer && tracer("Receive details header for " + headerNumber + " response " + !!responseHeader);
				if (responseHeader) {
					if (headerNumber in self._registry) {
						var callback = self._registry[headerNumber][3];
						if (!callback) throw new Error("No callback available");
						var serverResult = JSON.parse(data.toString());
						var clientResult = [_condenseRegistry(self._registry), _condenseRegistry(self._registryForeign)];
						var answer = "Client ";
						answer += _compareResults(clientResult[0], serverResult[1]);
						var serverAnswer = _compareResults(serverResult[0], clientResult[1]);
						if (serverAnswer) answer += "Server " + serverAnswer;
						tracer && tracer("Delete details registry " + headerNumber);
						delete self._registry[headerNumber];
						return callback(null, answer);
					} else {
						// entry has already been removed because of timeout
						tracer && tracer("Timeout for ping request " + headerNumber);
					}
				} else { // just answer with ping response header
					// collect data about current requests
					var result = [_condenseRegistry(self._registry), _condenseRegistry(self._registryForeign)];
					var buffer = JSON.stringify(result);
					self._write(_frameHeader(DETAILS + RESPONSE, headerNumber, buffer.length));
					self._write(new Buffer(buffer));
				}
			case PING:
				// ping request just to see whether server is reachable
				tracer && tracer("Receive ping header for " + headerNumber + " response " + !!responseHeader);
				if (responseHeader) {
					if (headerNumber in self._registry) {
						var callback = self._registry[headerNumber][3];
						var time = +self._registry[headerNumber][4];
						if (!callback) throw new Error("No callback available");
						if (self._globalError) return callback(self._globalError);
						tracer && tracer("Delete ping registry " + headerNumber);
						delete self._registry[headerNumber];
						return callback(null, Date.now() - time);
					} else {
						// entry has already been removed because of timeout
						tracer && tracer("Timeout for ping request " + headerNumber);
					}
				} else { // just answer with ping response header
					self._write(_frameHeader(PING + RESPONSE, headerNumber, 0));
				}
				break;
			case PINGSTATUS:
				// ping request just to see whether server is reachable
				tracer && tracer("Receive ping status header for " + headerNumber + " response " + !!responseHeader);
				if (responseHeader) {
					if (headerNumber in self._registry) {
						var callback = self._registry[headerNumber][3];
						var time = +self._registry[headerNumber][4];
						if (!callback) throw new Error("No callback available");
						if (self._globalError) return callback(self._globalError);
						tracer && tracer("Delete ping1 registry " + headerNumber);
						tracer && tracer("Daten " + JSON.stringify(data));
						delete self._registry[headerNumber];
						return callback(null, [Date.now() - time, data.toString()]);
					} else {
						// entry has already been removed because of timeout
						tracer && tracer("Timeout for ping request " + headerNumber);
					}
				} else { // just answer with ping response header
					try {
						var res = new Buffer("" + self.pingfunction());
					} catch (e) {
						var res = new Buffer(self.pingfunction ? "" + e : "No function");
					}
					self._write([_frameHeader(PINGSTATUS + RESPONSE, headerNumber, res.length), res]);
				}
				break;
			case CLOSED:
				// connection has been closed
				tracer && tracer("Receive close header for " + headerNumber + " response " + !!responseHeader);
				var reg = (responseHeader ? self._registry : self._registryForeign);
				if (headerNumber in reg) {
					var entry = reg[headerNumber];
					tracer && tracer("Delete registry on close " + headerNumber + " foreign " + !responseHeader);
					delete reg[headerNumber];
					self._destroyStreams(entry);
				}
				break;
			case IO_CONN:
				// new engine.io connection
				tracer && tracer(self._ident + " Receive engine.io connection header for " + headerNumber + " response " + !!responseHeader);
				// console.log(self._ident+" Receive engine.io connection header for " + headerNumber + " response " + !! responseHeader);
				if (!self._mockEngine) {
					console.log("Error: no engine");
				} else {
					var iosocket = new MockSocket(data, headerNumber, self._mockEngine);
					self._registryForeign[headerNumber] = [null, null, null, null, iosocket];
					self._mockEngine.emit('connection', iosocket);
				}
				break;
			case IO_CLOSE:
				// receive close event
				tracer && tracer(self._ident + " Receive engine.io close header for " + headerNumber + " response " + !!responseHeader);
				var reg = (responseHeader ? self._registry : self._registryForeign);
				if (headerNumber in reg) {
					var entry = reg[headerNumber];
					var socket = entry[4];
					if (responseHeader) { // on load balancer side: close real socket
						socket.close();
					} else {
						socket.emit('close', data); // on Syracuse side: notify socket.io        
					}
					delete reg[headerNumber];
				}
				break;
			case IO_SEND:
				// make string out of binary data
				data = data.toString();
				// no break!
			case IO_SENDB:
				// receive message
				tracer && tracer(self._ident + " Receive engine.io header for " + headerNumber + " response " + !!responseHeader);
				tracer && tracer("!!! " + data);
				// console.log(self._ident+"Receive engine.io header for " + headerNumber + " response " + !! responseHeader);
				// console.log("!!! " + data);
				var reg = (responseHeader ? self._registry : self._registryForeign);
				if (headerNumber in reg) {
					var entry = reg[headerNumber];
					var socket = entry[4];
					if (responseHeader) { // on load balancer side: write to real socket
						socket.write(data);
					} else {
						socket.emit('data', data);
						socket.emit("message", data) // Syracuse side: notify socket.io;
					}
				}
				break;
			case IO_DRAIN:
				// drain header for sockets
				tracer && tracer("IO Confirmation header for " + headerNumber + " " + !!responseHeader);
				if (responseHeader) {
					var reg = self._registryForeign;
					if (headerNumber in reg) {
						var entry = reg[headerNumber];
						var socket = entry[4];
						socket.emit('drain');
					}
				}
				break;
			default:
				throw new Error("Wrong special header " + headerType);
		}
	} else {
		if (headerType & STARTFRAME) { // start frame
			var headerData = JSON.parse(data.toString("utf8"));
			if (!responseHeader) { // on server
				tracer && tracer("Receive header frame on callee for " + headerNumber);
				// registry contains readable stream, writable stream and call back function
				var readableStream = new ReadableMockStream(headerData, headerNumber, self, 0);
				var writableStream = new WritableMockStream(null, headerNumber, self, RESPONSE);
				self._registryForeign[headerNumber] = [readableStream, writableStream];
				process.nextTick(function() {
					self.emit('request', readableStream, writableStream);
				});
			} else {
				// on client: call callback function
				if (headerNumber in self._registry) {
					var readableStream = new ReadableMockStream(headerData, headerNumber, self, RESPONSE);
					tracer && tracer("Create readable stream on caller and call callback for " + headerNumber + " hdata " + util.format(headerData));
					var callback = self._registry[headerNumber][2];
					self._registry[headerNumber][0] = readableStream;
					if (!callback) throw new Error("No callback function on client");
					callback(readableStream);
				} else {
					tracer && tracer("Ignore start frame from server for " + headerNumber + " hdata " + util.format(headerData));
				}
			}
		} else { // subsequent frame
			if (!data) data = new Buffer(0);
			tracer && tracer("Receive data frame for " + headerNumber + " response " + responseHeader);
			var reg = (responseHeader ? self._registry : self._registryForeign);
			if (headerNumber in reg) {
				var readableStream = reg[headerNumber][0];
				if (headerType & ENDMARKER) { // end frame
					tracer && tracer("End frame for " + headerNumber);
					readableStream.frame(data, true);
					// on caller there is nothing to do after this any more: delete data from registry
					if (responseHeader) {
						tracer && tracer("Delete registry on caller for " + headerNumber);
						delete self._registry[headerNumber];
					}
				} else {
					readableStream.frame(data, false);
				}
			} else {
				tracer && tracer("Ignore data frame for " + headerNumber + " response " + responseHeader);
			}
		}
	}
};



function ReadableMockStream(options, number, mock, resp) {
	tracer && tracer("RMS " + util.format(options));
	this.writable = false;
	this.readable = true;
	stream.Stream.call(this);
	// copy static information
	tracer && tracer("Options " + util.format(options));
	exports.extractDataFromRequest(options, this);
	this.headers = this.headers || {};
	tracer && tracer("Attributes " + util.format(this));
	this._response = resp; // does this stream belong to a response?
	this._number = number; // sequence number
	this._encoding = null;
	this._remainingBytes = 0;
	this._remainingBuffer = null;
	this._paused = true; // 'pause' has been called, but not yet 'resume', streams will be paused until listener for 'end' event is installed and pause()/resume() has not been called before
	this._chunk = null;
	this._ended = false; // if set, 'end' should be emitted.
	this._endEmitted = false; // has 'end' event already been emitted?
	this._statusChanged = false; // pause or resume has already been called?
	this._mock = mock;
	this.socket = {};
}

util.inherits(ReadableMockStream, stream.Stream);

ReadableMockStream.prototype.__on = ReadableMockStream.prototype.on;
ReadableMockStream.prototype.on = function(type, listener) {
	this.__on(type, listener);
	var self = this;
	if (type === "end" && !self._statusChanged) { // resume stream automatically when 'end' event is registered and pause()/resume() has not been called yet
		process.nextTick(function() {
			self.resume();
		});
	}
};

ReadableMockStream.prototype.pause = function() {
	tracer && tracer(!!this._response + "--- Stream pause " + this._number);
	this._statusChanged = true;
	this._paused = true;
};

ReadableMockStream.prototype.resume = function() {
	tracer && tracer(!!this._response + "--- Stream resume " + this._number);
	this._paused = false;
	this._statusChanged = true;
	if (this._chunk) this._processData();
	else {
		if (this._ended) this._processEnd();
	}
};

ReadableMockStream.prototype.destroy = function() {
	this._destroyInt();
};

ReadableMockStream.prototype._destroyInt = function(local) {
	var self = this;
	if (self.readable) {
		self.readable = false;
		if (!local) self._mock.close(self._number, !self._response);

		self.emit('close');
		tracer && tracer(self._number + " readstream destroy local " + local + " response " + !!self._response);
	}
};

ReadableMockStream.prototype._processEnd = function() {
	var self = this;
	process.nextTick(function() {
		if (!self._paused && self.readable && !self._endEmitted) {
			tracer && tracer("Process end event for " + self._number + "data " + !!self._chunk);
			if (self._chunk) {
				self._processData();
			} else {
				self._endEmitted = true;
				self.emit('end');
			}
		}
	});
	// no confirmation necessary for end event
};

ReadableMockStream.prototype._processData = function() {
	var self = this;
	process.nextTick(function() {
		if (!self._paused && self.readable) {
			tracer && tracer(!!self._response + "Process data event for " + self._number + " " + util.format(self._chunk));
			if (!self._chunk) {
				tracer && tracer("PD " + util.format(self._chunk) + ", " + self._response + ", " + self._number + ", " + self._encoding + ", " + self._remainingBytes + ", " + util.format(self._remainingBuffer) + ", " + self._ended);
			} else if (self._chunk.length > 0) {
				if (self._encoding) {
					// try whether buffer can be converted completely to string
					if (self._remainingBuffer) {
						self._chunk = Buffer.concat([self._remainingBuffer, self._chunk]);
						self._remainingBuffer = null;
					}
					var remaining = exports.bufferEncoding(self._chunk, self._encoding);
					if (remaining) {
						var start = self._chunk.length - remaining;
						if (start === 0) {
							self._remainingBuffer = self._chunk;
							// it does not make sense to send an empty string to the listeners - therefore no 'emit'
						} else {
							self._remainingBuffer = self._chunk.slice(self._chunk.length - remaining);
							var text = self._chunk.slice(0, self._chunk.length - remaining).toString(self._encoding);
							// transmit the data
							self.emit('data', text);
						}
					} else {
						var text = self._chunk.toString(self._encoding);
						self.emit('data', text);
					}
				} else self.emit('data', self._chunk);
			}
			self._chunk = null;
		}
		if (!self._ended) { // no confirmation with end event
			tracer && tracer("Data event with confirmation for " + self._number);
			self._mock._write(_frameHeader(CONFIRMATION + self._response, self._number, 0));
		} else {
			self._processEnd();
		}
	});
};

// write data of this frame to receiving stream (emit 'data' event)
// end: also emit end event
ReadableMockStream.prototype.frame = function(data, end) {
	tracer && tracer("Frame function " + end + " " + this._paused);
	if (this._chunk) throw new Error("Already chunk present " + this._response + "--" + util.format(this._chunk));
	this._ended = end;
	this._chunk = data;
	if (!this._paused) {
		if (data) this._processData();
		else {
			if (end) this._processEnd();
		}
	}
};

ReadableMockStream.prototype.setEncoding = function(encoding) {
	// normalize the encoding
	this._encoding = (encoding || "utf8").toLowerCase().replace(/[-_]/, '');
};


function _onWMSError(err) {
	console.log("WMS error " + (err.stack || err));
}

function WritableMockStream(options, number, mock, resp) {
	this.writable = true;
	this.readable = false;
	stream.Stream.call(this);
	this._options = options || {
		headers: {},
		statusCode: 200,
		sendDate: true
	};
	this._response = resp; // does this stream belong to a response?
	this._number = number; // sequence number of request
	this._mock = mock; // mock client or mock server
	this._chunk = null;
	this._used = false; // currently no all data have been totally processed
	this._finished = 0; // 0: end has not yet been called, 1: end has been called, 2: end header has been sent
	this.on('error', _onWMSError); // an error handler must be available
}



util.inherits(WritableMockStream, stream.Stream);

WritableMockStream.prototype.write = function(data, enc, cb, end) {
	var self = this;
	// handle callback parameter (ez-streams uses it to flush)
	// see https://nodejs.org/api/stream.html#stream_writable_end_chunk_encoding_callback
	if (typeof enc === 'function') {
		cb = enc;
		enc = null;
	} else if (typeof data === 'function') {
		cb = data;
		data = null;
		enc = null;
	}
	tracer && tracer(self._number + "---------- WRITE " + util.format(data) + " " + enc + " " + end + "--" + self._used + " " + !!cb);
	if (!self.writable || !self._mock) {
		tracer && tracer(self._number + " ignore write on closed stream");
		if (cb) process.nextTick(cb);
		return true;
	}
	if (self._used) throw new Error(self._number + "Data left");
	if (end) {
		if (!self._finished) self._finished = 1;
	} else {
		if (self._finished) throw new Error(self._number + "No writes after end");
	}
	if (!data) data = new Buffer(0);
	tracer && tracer(self._number + "DATA ????? " + util.format(data));
	if (!Buffer.isBuffer(data)) {
		if (!enc) enc = "utf8";
		data = new Buffer("" + data, enc);
	}
	var list = [];
	if (self._options && !self._hs) {
		tracer && tracer(self._number + "Send frame header for " + self._number);
		var content = new Buffer(JSON.stringify(self._options), "utf8");
		list.push(_frameHeader(STARTFRAME + self._response, self._number, content.length), content);
		self._hs = true; // header sent!!!
		self._options.headers = null;
	}
	if (data.length > 0) {
		tracer && tracer("Send data frame for " + self._number);
		list.push(_frameHeader(self._response + (end ? ENDMARKER : 0), self._number, data.length), data);
	} else {
		list.push(_frameHeader(self._response + (end ? ENDMARKER : 0), self._number, 0));
	}
	self._mock._write(list);
	if (end && self._response) {
		self._mock._deleteRegistry(self._number, true);
		self.emit('finish');
	}
	self._used = true;
	if (cb) self._cb = cb;
	return false;
};

WritableMockStream.prototype.end = function(data, enc, cb) {
	var self = this;
	// handle callback parameter (ez-streams uses it to flush)
	// see https://nodejs.org/api/stream.html#stream_writable_end_chunk_encoding_callback
	if (typeof enc === 'function') {
		cb = enc;
		enc = null;
	} else if (typeof data === 'function') {
		cb = data;
		data = null;
		enc = null;
	}
	tracer && tracer(self._number + "ENDDATA --- <" + data + ">");
	if (self._finished) {
		tracer && tracer("Ignore second end call");
	} else {
		self._finished = 1;
		if (!self._used) self.write(data, enc, undefined, true);
	}
	if (cb) process.nextTick(cb);
};

WritableMockStream.prototype.destroy = function() {
	this._destroyInt();
};

WritableMockStream.prototype._destroyInt = function(local) {
	var self = this;
	if (self.writable) {
		self.writable = false;
		if (!local) self._mock.close(self._number, self._response);
		self.emit('close');
		tracer && tracer(self._number + " write stream destroy local " + self.local + " response " + !!self._response);

	}
};

WritableMockStream.prototype._markFree = function() {
	var self = this;
	tracer && tracer("Mark stream as free again " + self._number);
	self._used = false;
	tracer && tracer(self._number + "USED " + self._used + " fin " + self._finished);
	if (!self._finished) {
		if (self._cb) {
			process.nextTick(self._cb);
			self._cb = undefined;
		} else
			self.emit('drain'); // more data can come unless 'end' has already been called		
	} else {
		if (self._finished === 1) self.write(null, null, undefined, true);
	}
};

// methods of HttpServerResponse
WritableMockStream.prototype.writeHead = function(statusCode) {
	var reasonPhrase;
	var headers;
	var self = this;
	switch (arguments.length) {
		case 3:
			reasonPhrase = arguments[1];
			headers = arguments[2];
			break;
		case 2:
			headers = arguments[1];
			break;
		default:
			break;
	}
	self._options = self._options || {}; // avoid null pointer exceptions 
	if (headers) {
		self._options.headers = headers;
		self._options.writeHeadCalled = true;
	}
	if (reasonPhrase) self._options.reasonPhrase = reasonPhrase;
	self._options.statusCode = statusCode;
	// write header data
	tracer && tracer(self._number + " Write just header data");
	var content = new Buffer(JSON.stringify(self._options), "utf8");
	if (self._mock) self._mock._write([_frameHeader(STARTFRAME + self._response, self._number, content.length), content]);
	self._hs = true; // header sent!!!
	self._options.headers = undefined;
};

// set/get the status code directly within the options property

WritableMockStream.prototype.__defineSetter__("statusCode", function(code) {
	this._options = this._options || {}; // avoid null pointer exceptions 
	this._options.statusCode = code;
});
WritableMockStream.prototype.__defineGetter__("statusCode", function() {
	this._options = this._options || {}; // avoid null pointer exceptions 
	return this._options.statusCode;
});

WritableMockStream.prototype.__defineSetter__("sendDate", function(val) {
	this._options = this._options || {}; // avoid null pointer exceptions 
	this._options.sendDate = val;
});
WritableMockStream.prototype.__defineGetter__("sendDate", function() {
	this._options = this._options || {}; // avoid null pointer exceptions 
	return this._options.sendDate;
});

WritableMockStream.prototype.setHeader = function(name, value) {
	this._options = this._options || {}; // avoid null pointer exceptions
	if (this._hs) throw new Error("setHeader already called");
	try {
		this._options.headers[name] = value;
	} catch (e) {
		throw new Error("setHeader already called");
	}

};

WritableMockStream.prototype.getHeader = function(name) {
	this._options = this._options || {}; // avoid null pointer exceptions
	if (this._hs) throw new Error("setHeader already called");
	try {
		return this._options.headers[name];
	} catch (e) {
		throw new Error("setHeader already called");
	}
};

WritableMockStream.prototype.removeHeader = function(name) {
	if (this._options && this._options.headers) {
		delete this._options.headers[name];
	}
};




/// finds out whether the last multibyte character of this buffer is complete. If not, it returns the number of bytes of this 
/// incomplete character. The function assumes that the buffer contains a part of correctly encoded data.
/// the function assumes that the encoding is already normalized!

function bufferEncoding(buffer, enc) {
	var length = buffer.length;
	switch (enc) {
		case "utf8":
			if (!(buffer[length - 1] & 0x80)) return 0; // single byte character at end
			var i = length - 1;
			var testbyte = 0x40;
			for (var i = 1; i <= length; i++) {
				var byte = buffer[length - i];
				// there cannot be a single byte character directly before a group of non-leading bytes of a multibyte character 
				if (!(byte & 0x80)) throw new Error("Invalid UTF8");
				if (byte & 0x40) { // leading byte
					return (byte & testbyte) ? i : 0; // incomplete sequence when test byte is also set
				}
				testbyte >>= 1;
			}
			// just sequence of non-leading bytes
			return length;
		case "utf16le":
		case "ucs2":
			return (length & 0x01); // number of bytes must be even
		case "hex":
		case "ascii":
			return 0;
		default:
			throw new Error("Wrong encoding " + enc);
	}
}

// builds the frame header out of type, number, length.
// for a frame header with end marker, the property "mockEndMarker" is set on the buffer.

function _frameHeader(type, number, length) {
	tracer && tracer("Header type " + type + " number " + number + " length " + length);
	var b = new Buffer(HEADERLENGTH);
	b[0] = type;
	b.writeUInt32LE(length, 1);
	b.writeUInt32LE(number, 5);
	if (type & ENDMARKER) b.mockEndMarker = true;
	return b;
}

/// ## MockStreamServer
/// This class emulates Streamline's HttpServer. The requests and responses are taken from the mock mechanism but are wrapped within
/// Streamline's HttpServerRequest, HttpServerResponse.
/// parameters: 
/// - disp: request dispatcher function
/// - outputStream: stream to write data to other mock (e. g. process.stdout)
/// - inputStream: stream to get data from other mock (e. g. process.stdin)
/// - clientOptions: options for mock (mainly: timeout)
/// - options: options which will be passed to Streamline's HttpServerRequest, HttpServerResponse
exports.MockStreamServer = function(disp, outputStream, inputStream, clientOptions, options) {
	events.EventEmitter.call(this);
	var self = this;

	var dispatcher = function(request, response) {
		tracer && tracer("+++++++++++++++++++++++++++++Request");
		return disp(request, response);
	};
	/// The listen method will start the server and resume the input stream
	/// Parameters: the last parameter must be the callback function, the other parameters will be ignored (for IPV6)
	self.listen = function() {
		tracer && tracer("Listen");
		var callback = arguments[arguments.length - 1];
		try {
			self.mockClient = new Mock(outputStream, inputStream, dispatcher, clientOptions, true);
			if (self._mockEngine) {
				self.mockClient._mockEngine = self._mockEngine;
				self._mockEngine.setMock(self.mockClient);
				self._mockEngine = undefined;
			}
			inputStream.resume();
			tracer && tracer("LISTEN start");
			return callback();
		} catch (e) {
			return callback(e);
		}
	};
};

util.inherits(exports.MockStreamServer, events.EventEmitter);

// mock engine is stored directly in MockStreamServer as long as there is no mockClient yet.
// when mockClient is created, mock engine will be shifted to mockClient.
exports.MockStreamServer.prototype.getMockEngine = function() {
	var obj = this;
	if (obj.mockClient) obj = obj.mockClient;
	if (!obj._mockEngine) {
		obj._mockEngine = new MockEngine(); // if there is no mock yet in MockEngine, it will be filled in listen function		
		obj._mockEngine.setMock(this.mockClient);
	}
	return obj._mockEngine;
};

Mock.prototype.makeMockEngine = function() {
	if (!this._mockEngine) {
		this._mockEngine = new MockEngine();
		this._mockEngine.setMock(this);
	}
};

/// ## MemoryStream
/// this class is a writable stream which appends all data to a string (content field). It emulates the HttpResponse methods writeHead etc.

function MemoryStream() {
	stream.Stream.call(this);
	this.writable = true;
	this.content = "";
	this._options = [];
	this.ended = false;
	return this;
}

util.inherits(MemoryStream, stream.Stream);

MemoryStream.prototype.write = function(data) {
	this.content += data;
	return true;
};
MemoryStream.prototype.end = function(data) {
	var self = this;
	if (data) self.content += data;
	self.ended = true;
};
MemoryStream.prototype.writeHead = function(statusCode) {
	var reasonPhrase;
	var headers;
	var self = this;
	switch (arguments.length) {
		case 3:
			reasonPhrase = arguments[1];
			headers = arguments[2];
			break;
		case 2:
			headers = arguments[1];
			break;
		default:
			break;
	}
	if (headers) {
		self._options.headers = headers;
		self._options.writeHeadCalled = true;
	}
	if (reasonPhrase) self._options.reasonPhrase = reasonPhrase;
	self._options.statusCode = statusCode;

};


// set/get the status code directly within the options property

MemoryStream.prototype.__defineSetter__("statusCode", function(code) {
	this._options.statusCode = code;
});
MemoryStream.prototype.__defineGetter__("statusCode", function() {
	return this._options.statusCode;
});

MemoryStream.prototype.__defineSetter__("sendDate", function(val) {
	this._options.sendDate = val;
});
MemoryStream.prototype.__defineGetter__("sendDate", function() {
	return this._options.sendDate;
});

MemoryStream.prototype.setHeader = function(name, value) {
	this._options.headers[name] = value;
};

MemoryStream.prototype.getHeader = function(name) {
	return this._options.headers[name];
};

MemoryStream.prototype.removeHeader = function(name) {
	delete this._options.headers[name];
};

exports.MemoryStream = MemoryStream;

//convenience function: send a request to a server with same options as above self.request, but already as an asynchronous function.
//returns the content of the return stream or throws an exception in case of an error. When the status code is not 200, it also throws
// an error, but with STATUS_CODE set to the status code
// When you want to do an internal request *with authentication*, you have to set
// - options.connection.localPort and options.connection.remoteAddress (to the corresponding values of the current "real" request).
// - you have to set an authorization header options.header.authorization = "Nanny ..." where "..." is the login name, UTF8 encoded, then base64 encoded
// - options.headers.host (only in multitenant mode)
var simpleRequest = function(client, options, content, callback) {
	var result = "";
	var answered = false;
	var req = client.request(options, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(chunk) {
			result += chunk;
		});
		res.on("end", function(chunk) {
			if (!answered) {
				answered = true;
				if (res.statusCode === 200) {
					return callback(null, result);
				} else {
					var error = new Error(result);
					error.STATUS_CODE = res.statusCode;
					return callback(error);
				}
			}
		});
		res.on('close', function() {
			if (!answered) {
				answered = true;
				return callback('Connection closed');
			}
		});
	});
	req.on("error", function(error) {
		if (!answered) {
			answered = true;
			return callback(error);
		}
	});
	if (content) req.end(content);
	else req.end();
};
exports.simpleRequest = simpleRequest;

exports.bufferEncoding = bufferEncoding;

// for unit tests
exports._frameHeader = _frameHeader;
exports._WritableMockStream = WritableMockStream;

// very simple write stream which 

function DescriptorWriteStream(fd) {
	var self = this;
	self.writable = true;
	var ended = false;
	self.write = function(data, offset) {
		offset = offset || 0;
		if (!data) {
			if (ended) {
				self.writable = false;
				fs.close(fd);
			}
			return true;
		}
		fs.write(fd, data, offset, data.length - offset, null, function(err, written, buffer) {
			if (err) {
				self.writable = false;
				self.emit('error', err);
			} else {
				if (buffer && written < buffer.length) {
					self.write(buffer, written);
				} else {
					if (ended) {
						self.writable = false;
						fs.close(fd);
					} else {
						self.emit('drain');
					}
				}
			}
		});
		return false;
	};
	self.end = function(data) {
		ended = true;
		self.write(data);
	};
};
DescriptorWriteStream.prototype = new events.EventEmitter();
exports.DescriptorWriteStream = DescriptorWriteStream;