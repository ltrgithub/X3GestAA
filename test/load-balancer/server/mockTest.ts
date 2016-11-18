"use strict";

var mocks = require('../../../src/load-balancer/mock');
var util = require('util');
var stream = require('stream');
var tracer; // = console.log;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	// very simple pipe which just passes through everything without change

	function SimplePipeStream() {
		var self = this;
		self.readable = true;
		self.writable = true;
		stream.Stream.call(this);
	}

	util.inherits(SimplePipeStream, stream.Stream);

	SimplePipeStream.prototype.write = function(data) {
		tracer && tracer("SPS " + util.format(data));
		this.emit("data", data);
		return true;
	};

	// simple pipe which just passes through everything without change, but on next tick

	function AsyncPipeStream() {
		var self = this;
		self.readable = true;
		self.writable = true;
		stream.Stream.call(this);
	}

	util.inherits(AsyncPipeStream, stream.Stream);

	AsyncPipeStream.prototype.write = function(data) {
		tracer && tracer("SPS " + util.format(data));
		var self = this;
		process.nextTick(function() {
			self.emit("data", data);
			self.emit("drain");
		});
		return false;
	};

	//simple pipe which just passes through everything without change, but after waiting for the number of milliseconds in the timeout

	function WaitPipeStream(timeout) {
		var self = this;
		self.readable = true;
		self.writable = true;
		self.timeout = timeout;
		stream.Stream.call(this);
	}

	util.inherits(WaitPipeStream, stream.Stream);

	WaitPipeStream.prototype.write = function(data) {
		var self = this;
		tracer && tracer("Wait PS " + util.format(data) + " timeout " + self.timeout);
		setTimeout(function() {
			self.emit("data", data);
			self.emit("drain");
		}, self.timeout);
		return false;
	};

	//pipe which divides input into 4byte chunks (it 'hashes' the input into pieces)

	function HashPipeStream() {
		var self = this;
		self.readable = true;
		self.writable = true;
		stream.Stream.call(this);
	}

	util.inherits(HashPipeStream, stream.Stream);

	HashPipeStream.prototype.write = function(data) {
		var i = 0;
		for (i = 0; i + 4 <= data.length; i += 4) {
			this.emit("data", data.slice(i, i + 4));
		}
		if (i < data.length) this.emit("data", data.slice(i));
		return true;
	};

	it('mock server test with encoding and async write API', function(_) {
		tracer && tracer("=========================================================1====");
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		tracer && tracer("-----------------------------------------------------------");
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			var number = 0;
			var type = 0;
			tracer && tracer(">>>>>>>>>>>>>>> " + util.format(request.headers));
			request.setEncoding('ucs2');
			request.on('data', function(chunk) {
				tracer && tracer("DATA" + chunk);
				data += chunk;
			});
			request.on('end', function() {
				tracer && tracer("uuuuuuuuuuuuuuuuuServer end");
				response.end(data);
			});
		});

		/// test for encoding: input bytes will be converted to output on server using ucs2 encoding
		/// input is an array of strings
		var performRequest = function(input, callback, enc) {
			function loop(err, result) {
				if (err) return err;
				if (input.length > 0) {
					if (enc) req.write(input.shift(), enc, loop);
					else req.write(input.shift(), loop);
				} else req.end();
			}
			var req = client.request({
				headers: {
					test: 1
				}
			}, function(res) {
				tracer && tracer("Client response");
				var resultData = "";
				res.on('data', function(chunk) {
					tracer && tracer("Client DATA" + chunk);
					resultData += chunk;
				});
				res.on('end', function() {
					tracer && tracer("Client END " + resultData);
					return callback(null, resultData);
				});
			});
			tracer && tracer("PERF " + util.format(input));
			req.on('drain', function() {
				throw new Error("Wrong event");
			});
			loop();
		};

		strictEqual(performRequest(["a\0b\0", "c\0"], _), "abc", "Request with complete characters");
		strictEqual(performRequest(["a\0b", "\0c", "\0", "d", "\0"], _), "abcd", "Request with incomplete characters");
		strictEqual(performRequest([""], _), "", "Request with incomplete characters 2");
		strictEqual(performRequest(["a\0b\0", "c\0"], _, "utf8"), "abc", "Request with complete characters");
		strictEqual(performRequest(["a\0b", "\0c", "\0", "d", "\0"], _, "utf8"), "abcd", "Request with incomplete characters");
		strictEqual(performRequest([""], _, "utf8"), "", "Request with incomplete characters 2");
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

	});

	it('mock server test with encoding', function(_) {
		tracer && tracer("=========================================================1====");
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		tracer && tracer("-----------------------------------------------------------");
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			var number = 0;
			var type = 0;
			tracer && tracer(">>>>>>>>>>>>>>> " + util.format(request.headers));
			request.setEncoding('ucs2');
			request.on('data', function(chunk) {
				tracer && tracer("DATA" + chunk);
				data += chunk;
			});
			request.on('end', function() {
				tracer && tracer("uuuuuuuuuuuuuuuuuServer end");
				response.end(data);
			});
		});

		/// test for encoding: input bytes will be converted to output on server using ucs2 encoding
		/// input is an array of strings
		var performRequest = function(input, callback) {
			var req = client.request({
				headers: {
					test: 1
				}
			}, function(res) {
				tracer && tracer("Client response");
				var resultData = "";
				res.on('data', function(chunk) {
					tracer && tracer("Client DATA" + chunk);
					resultData += chunk;
				});
				res.on('end', function() {
					tracer && tracer("Client END " + resultData);
					return callback(null, resultData);
				});
			});
			tracer && tracer("PERF " + util.format(input));
			if (input.length > 0) req.write(input.shift());
			else {
				tracer && tracer("------CLIENT END");
				req.end();
			}
			req.on('drain', function() {
				if (input.length > 0) {
					req.write(input.shift());
				} else {
					req.end();
				}
			});
		};

		strictEqual(performRequest(["a\0b\0", "c\0"], _), "abc", "Request with complete characters");
		strictEqual(performRequest(["a\0b", "\0c", "\0", "d", "\0"], _), "abcd", "Request with incomplete characters");
		strictEqual(performRequest([""], _), "", "Request with incomplete characters 2");
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

	});

	it('mock server test with encoding and writeHead', function(_) {
		tracer && tracer("=========================================================2====");
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		tracer && tracer("-----------------------------------------------------------");
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			var number = 0;
			var type = 0;
			tracer && tracer(">>>>>>>>>>>>>>> " + util.format(request.headers));
			response.writeHead(202);
			request.setEncoding('ucs2');
			request.on('data', function(chunk) {
				tracer && tracer("DATA" + chunk);
				data += chunk;
			});
			request.on('end', function() {
				tracer && tracer("uuuuuuuuuuuuuuuuuServer end");
				response.end(data);
			});
		});

		/// test for encoding: input bytes will be converted to output on server using ucs2 encoding
		/// input is an array of strings
		var performRequest = function(input, callback) {
			var req = client.request({
				headers: {
					test: 1
				}
			}, function(res) {
				tracer && tracer("Client response");
				var resultData = "";
				res.on('data', function(chunk) {
					tracer && tracer("Client DATA" + chunk);
					resultData += chunk;
				});
				res.on('end', function() {
					tracer && tracer("Client END " + resultData);
					return callback(null, resultData);
				});
			});
			tracer && tracer("PERF " + util.format(input));
			if (input.length > 0) req.write(input.shift());
			else {
				tracer && tracer("------CLIENT END");
				req.end();
			}
			req.on('drain', function() {
				if (input.length > 0) {
					req.write(input.shift());
				} else {
					req.end();
				}
			});
		};

		strictEqual(performRequest(["a\0b\0", "c\0"], _), "abc", "Request with complete characters");
		strictEqual(performRequest(["a\0b", "\0c", "\0", "d", "\0"], _), "abcd", "Request with incomplete characters");
		strictEqual(performRequest([""], _), "", "Request with incomplete characters 2");
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

	});

	it('mock read stream test', function(_) {
		var parts = [];

		parts.push(mocks._frameHeader(1, 5, 0));
		parts.push(mocks._frameHeader(2, 7, 4));
		parts.push(new Buffer("abcd"));
		parts.push(mocks._frameHeader(3, 5, 7));
		parts.push(new Buffer("abcdefg"));

		var expected = [
			[1, 5, null],
			[2, 7, "abcd"],
			[3, 5, "abcdefg"]
		];

		var total = Buffer.concat(parts);
		// tracer && tracer("TOTOAL"+util.format(total))

		var st = new SimplePipeStream();
		var output = new SimplePipeStream();
		var mock = new mocks.Mock(output, st);

		var results = [];
		mock._chunkProcessing = function(type, number, data) {
			tracer && tracer(type + " " + number + " " + util.format(data));
			results.push([type, number, data ? data.toString("utf8") : data]);
		};

		st.write(total);
		// compare results
		strictEqual(results.length, expected.length, "correct number");
		for (var i = 0; i < results.length; i++) {
			var res = results[i];
			var exp = expected[i];
			for (var j = 0; j < res.length; j++) {
				strictEqual(res[j], exp[j], "Entry " + j + " of result " + i);
			}
		}

		var st2 = new HashPipeStream();
		mock = new mocks.Mock(output, st2);
		var results = [];
		mock._chunkProcessing = function(type, number, data) {
			tracer && tracer(type + " " + number + " " + util.format(data));
			results.push([type, number, data ? data.toString("utf8") : data]);
		};

		st2.write(total);
		// compare results
		strictEqual(results.length, expected.length, "correct number");
		for (var i = 0; i < results.length; i++) {
			var res = results[i];
			var exp = expected[i];
			for (var j = 0; j < res.length; j++) {
				strictEqual(res[j], exp[j], "Entry " + j + " of result " + i);
			}
		}

	});

	it('ping test', function(_) {
		var toServer = new WaitPipeStream(5);
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		tracer && tracer("-----------------------------------------------------------");
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			response.end();
		});
		var result = client.ping(_);
		tracer && tracer(result);
		strictEqual(result >= 0, true, "Ping test with milliseconds: " + result);

		var result = client.ping(_, 2000);
		strictEqual(result >= 0, true, "Ping test with large timeout and milliseconds: " + result);

		toServer.timeout = 500;

		var text = "";
		try {
			result = client.ping(_, 400);
		} catch (e) {
			text = "" + e;
		}
		strictEqual(text, "Error: Timeout after 400 milliseconds", "Ping test with reached timeout");
	});

	it('ping status test', function(_) {
		var toServer = new WaitPipeStream(5);
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		tracer && tracer("-----------------------------------------------------------");
		var server = new mocks.Mock(toClient, toServer, function(request, response) {
			response.end();
		});
		var result = client.ping2(_);
		tracer && tracer(result);
		strictEqual(result[1], "No function", "Ping status test without function");
		server.pingfunction = function() {
			throw new Error("Test error");
		};
		var result = client.ping2(_);
		strictEqual(result[1], "Error: Test error", "Ping status test with function with error");
		server.pingfunction = function() {
			return 789;
		};
		var result = client.ping2(_);
		tracer && tracer(result[1]);
		strictEqual(result[1], "789", "Ping test with function");

		var result = client.ping2(_, 2000);
		strictEqual(result[1], "789", "Ping test with large timeout");

		toServer.timeout = 500;

		var text = "";
		try {
			result = client.ping2(_, 400);
		} catch (e) {
			text = "" + e;
		}
		strictEqual(text, "Error: Timeout after 400 milliseconds", "Ping test with reached timeout");
	});


	it('copy test', function(_) {
		var result = mocks.extractDataFromRequest({
			url: 5,
			method: "get",
			foo: 18,
			connection: {
				authorized: true,
				_peerCertificate: 55
			}
		});
		strictEqual(result.url, 5, "Correct url");
		strictEqual(result.method, "get", "Correct method");
		strictEqual(result.foo, undefined, "Do not copy foo");
		strictEqual(result.connection.authorized, true, "authorized connection");
		strictEqual(result.connection.getPeerCertificate(), 55, "peer certificate");
	});

	it('encoding test', function(_) {
		strictEqual(mocks.bufferEncoding(new Buffer([0xa0, 0x55]), "utf8"), 0, "Single character byte at the end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x81, 0x81]), "utf8"), 2, "Sequence of following bytes");
		strictEqual(mocks.bufferEncoding(new Buffer([0xa0, 0xc0]), "utf8"), 1, "Leading byte of double byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0xc0, 0x81]), "utf8"), 0, "Double byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xe0]), "utf8"), 1, "Part of 3 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xe0, 0x81]), "utf8"), 2, "Part of 3 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xe0, 0x81, 0x81]), "utf8"), 0, "Complete 3 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xf0, 0x81, 0x81]), "utf8"), 3, "Part of 4 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xf0, 0x81]), "utf8"), 2, "Part of 4 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xf0]), "utf8"), 1, "Part of 4 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xf0, 0x81, 0x81, 0x81]), "utf8"), 0, "Complete of 4 byte character at end");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xe0, 0x81]), "ucs2"), 1, "Odd length for ucs2 encoding");
		strictEqual(mocks.bufferEncoding(new Buffer([0xa0, 0x55]), "ucs2"), 0, "Even length for ucs2 encoding");
		strictEqual(mocks.bufferEncoding(new Buffer([0x55, 0xe0, 0x81]), "hex"), 0, "Odd length for hex encoding");
	});

	it('mock server test', function(_) {
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient);
		// server with request handler
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			var number = 0;
			var type = 0;
			response.statusCode = 555;
			if (type & 0x04) {
				request.pause();
				setTimeout(function() {
					request.resume();
				}, 300);
			}
			tracer && tracer(">>>>>>>>>>>>>>> " + util.format(request.headers));
			request.on('data', function(chunk) {
				tracer && tracer("DATA" + chunk);
				data += chunk.toString();
				number = data.substr(2, 1) * 1;
				type = data.substr(3, 1) * 1;
				tracer && tracer("Server config " + number + " " + type);
				if (type & 0x02) {
					request.pause();
					tracer && tracer("PAUSED");
					setTimeout(function() {
						request.resume();
					}, 200);
				}
			});
			request.on('end', function() {
				var output = data.length;
				tracer && tracer("END <" + output + ">");
				if (--number >= 0) response.write(output);
				else {
					if (type & 0x01) response.end(output);
					else response.end();
				}
				response.on('drain', function() {
					if (--number >= 0) {
						response.write(output);
					} else {
						if (type & 0x01) response.end(output);
						else response.end();
					}
				});
			});
		});

		// test function for requests. input is a string of length 4 and has the following format: 
		// 1st/3rd digit: number of chunks sent by client/server not including end call 
		// 2nd/4th digit: odd: last chunk is end(), even: last chunk is end(...) with content, bit 0x02 set: use pause/resume, bit 0x04 set: use pause/resume in the beginning
		// 3rd/4th digit are only evaluated when at least one chunk of data is sent to the server (1st digit must be > 0 or 2nd digit odd)
		// return value: server computes total length of input (4* first digit) and send this as often as 3rd digit of input requires
		var performRequest = function(input, callback) {
			var number = input.substr(0, 1) * 1;
			var type = input.substr(1, 1) * 1;
			var req = client.request({
				headers: {
					test: 1
				}
			}, function(res) {
				tracer && tracer("Client response");
				var resultData = "";
				if (type & 0x04) {
					res.pause();
					setTimeout(function() {
						res.resume();
					}, 2000);
				}
				res.on('data', function(chunk) {
					tracer && tracer("Client DATA" + chunk);
					resultData += chunk;
					if (type & 0x02) {
						res.pause();
						setTimeout(function() {
							res.resume();
						}, 250);
					}
				});
				res.on('end', function() {
					tracer && tracer("Client END " + resultData);
					return callback(null, [resultData, res]);
				});
			});
			if (--number >= 0) req.write(input);
			else {
				if (type & 0x01) req.end(input);
				else req.end();
			}
			req.on('drain', function() {
				if (--number >= 0) {
					req.write(input);
				} else {
					if (type & 0x01) req.end(input);
					else req.end();
				}
			});
		};

		tracer && tracer("=============================================================");

		var completeResult = performRequest("0000", _);
		var result = completeResult[0].toString();
		tracer && tracer("RESULT <" + result + ">");
		strictEqual("", result, "Request with empty response");
		strictEqual(completeResult[1].statusCode, 555, "Correct response status code");

		var result = performRequest("0100", _)[0].toString();
		strictEqual("", result, "Request with end() input and empty response");

		var result = performRequest("1000", _)[0].toString();
		strictEqual("", result, "Request with write() input and empty end() and empty response");

		var result = performRequest("1002", _)[0].toString();
		tracer && tracer("RESULT <" + result + ">");
		strictEqual("", result, "Request with write() input and empty end() and empty response and pause/resume on server");

		var result = performRequest("1100", _)[0].toString();
		strictEqual("", result, "Request with write() input and non empty end() and empty response");
		var result = performRequest("1102", _)[0].toString();
		strictEqual("", result, "Request with write() input and non empty end() and empty response and pause/resume on server");

		var result = performRequest("3102", _)[0].toString();
		strictEqual("", result, "Request with write() input and non empty end() and empty response and pause/resume on server");

		var result = performRequest("1101", _)[0].toString();
		strictEqual("8", result, "Request with write() input and non empty end() and response with end()");

		var result = performRequest("1120", _)[0].toString();
		strictEqual("88", result, "Request with write() input and non empty end() and response with write()");

		var result = performRequest("1320", _)[0].toString();
		strictEqual("88", result, "Request with write() input and non empty end() and response with write() and pause/resume on client");

		var result = performRequest("2322", _)[0].toString();
		strictEqual("1212", result, "Request with write() input and non empty end() and response with write() and pause/resume on client and server");

		var result = performRequest("2323", _)[0].toString();
		strictEqual("121212", result, "Request with write() input and non empty end() and response with write() and non empty end() and pause/resume on client and server");

		var result = performRequest("2723", _)[0].toString();
		strictEqual("121212", result, "Request with write() input and non empty end() and response with write() and non empty end() and pause/resume on client and server and pause/resume in the beginning");

		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

	});

	it('Mock HttpServerResponse metadata test', function(_) {
		var r = new mocks._WritableMockStream(null, 1, null);
		strictEqual(r._options.statusCode, 200, "Correct initial status code");
		r.statusCode = 205;
		strictEqual(r._options.statusCode, 205, "Correct setter status code");
		r._options.statusCode = 208;
		strictEqual(r.statusCode, 208, "Correct getter status code");
		r.setHeader("test", "test1");
		strictEqual(r._options.headers.test, "test1", "Correct set header");
		strictEqual(r.getHeader("test"), "test1", "Correct get header");
		r.removeHeader("test");
		strictEqual("test" in r._options.headers, false, "Correct remove header");
	});

	it('Double sided mock test', function(_) {
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient, function(request, response, _) {
			tracer && tracer("ANSWER in client");
			var cliData = "";
			request.on('data', function(chunk) {
				cliData += chunk;
			});
			request.on('end', function() {
				response.end("CL" + cliData);
			});

		});
		// server with request handler
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			response.statusCode = 555;
			tracer && tracer(">>>>>>>>>>>>>>> " + util.format(request.headers));
			request.on('data', function(chunk) {
				data += chunk.toString();
			});
			request.on('end', function() {
				// call back to client
				var intData = "";
				var internalRequest = server.request({
					header: {
						test: 2
					}
				}, function(res) {
					res.on('data', function(chunk) {
						intData += chunk;
					});
					res.on('end', function() {
						response.end("SRV" + intData);
					});
				});
				internalRequest.end(data);
			});
		});

		var performRequest = function(input, callback) {
			var req = client.request({
				headers: {
					test: 1
				}
			}, function(res) {
				tracer && tracer("Client response");
				var resultData = "";
				res.on('data', function(chunk) {
					tracer && tracer("Client DATA" + chunk);
					resultData += chunk;
				});
				res.on('end', function() {
					tracer && tracer("Client END " + resultData);
					return callback(null, resultData);
				});
			});
			req.end(input);
		};

		strictEqual(performRequest("D", _), "SRVCLD", "server calls client back");
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");
	});

	it('Stream destroy test', function(_) {
		var serverReqClosed = 0;
		var serverResClosed = 0;
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient, null);
		// server with request handler
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			tracer && tracer("URL " + request.url);
			request.on('close', function() {
				tracer && tracer("CLOSED");
				serverReqClosed = 1;
			});
			response.on('close', function() {
				tracer && tracer("CLOSED");
				serverResClosed = 1;
			});
			switch (request.url) {
				case '/destroyRequest':
					request.destroy();
					break;
				case '/destroyResponse':
					response.destroy();
					break;
				case '/destroyResponse2':
					response.write("Test");
					setTimeout(function() {
						response.destroy();
					}, 1000);
					break;
				default:
					setTimeout(function() {
						response.end("Timeout");
					}, 2000);
			}
		});

		serverReqClosed = 0;
		serverResClosed = 0;
		try {
			mocks.simpleRequest(client, {
				path: "/destroyRequest"
			}, "", _);
			throw new Error("No close detected");
		} catch (e) {
			strictEqual("" + e, "Connection closed", "destroy request on server");
		}
		strictEqual(serverReqClosed, 1, "server request closed");
		strictEqual(serverResClosed, 1, "server response closed");
		serverReqClosed = 0;
		serverResClosed = 0;
		try {
			mocks.simpleRequest(client, {
				path: "/destroyResponse"
			}, "", _);
			throw new Error("No close detected");
		} catch (e) {
			strictEqual("" + e, "Connection closed", "destroy response on server");
		}
		strictEqual(serverReqClosed, 1, "server request closed");
		strictEqual(serverResClosed, 1, "server response closed");
		serverReqClosed = 0;
		serverResClosed = 0;
		try {
			mocks.simpleRequest(client, {
				path: "/destroyResponse2"
			}, "", _);
			throw new Error("No close detected");
		} catch (e) {
			strictEqual("" + e, "Connection closed", "destroy response on server after part of answer");
		}
		strictEqual(serverReqClosed, 1, "server request closed");
		strictEqual(serverResClosed, 1, "server response closed");
		serverReqClosed = 0;
		serverResClosed = 0;
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient, null);
		// server with request handler
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			tracer && tracer("URL " + request.url);
			request.on('close', function() {
				tracer && tracer("CLOSED");
				serverReqClosed = 1;
			});
			response.on('close', function() {
				tracer && tracer("CLOSED");
				serverResClosed = 1;
			});
			switch (request.url) {
				case '/destroyRequest':
					request.destroy();
					break;
				case '/destroyResponse':
					response.destroy();
					break;
				case '/destroyResponse2':
					response.write("Test");
					setTimeout(function() {
						response.destroy();
					}, 1000);
					break;
				default:
					setTimeout(function() {
						response.end("Timeout");
					}, 2000);
			}
		});

		var closeClient = function(mode, callback) {
			var req = client.request({
				path: "/"
			}, function(response) {
				var data = "";
				var answered = false;
				response.on('close', function() {
					if (!answered) {
						answered = true;
						return callback(null, "closed");
					}
				});
				response.on('data', function(chunk) {
					data += chunk;
				});
				response.on('end', function() {
					if (!answered) {
						answered = true;
						return callback(null, "ended");
					}
				});
			});
			switch (mode) {
				case 1:
					req.destroy();
				case 2:
					req.write("Hallo");
					setTimeout(function() {
						req.destroy();
					}, 1000);
			}
		};

		tracer && tracer("1--------------------------------");
		strictEqual(closeClient(1, _), "closed", "close client request at once");
		strictEqual(serverReqClosed, 0, "server request not closed");
		strictEqual(serverResClosed, 0, "server response not closed");
		serverReqClosed = 0;
		serverResClosed = 0;
		tracer && tracer("2--------------------------------");
		strictEqual(closeClient(2, _), "closed", "close client request after first data");
		strictEqual(serverReqClosed, 1, "server request closed");
		strictEqual(serverResClosed, 1, "server response closed");
		serverReqClosed = 0;
		serverResClosed = 0;

		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");

	});

	it('Timeout test', function(_) {
		var toServer = new AsyncPipeStream();
		var toClient = new AsyncPipeStream();
		var client = new mocks.Mock(toServer, toClient, null, {
			timeout: 1
		});
		// server with request handler
		var server = new mocks.Mock(toClient, toServer, function(request, response, _) {
			var data = "";
			tracer && tracer("URL " + request.url);
			var time = request.url.replace(/[^\d]/g, "");
			tracer && tracer("URL2 " + time);
			setTimeout(function() {
				response.end("OK");
			}, 1 * time);
		});

		// fast request within timeout limit
		var result = mocks.simpleRequest(client, {
			path: "/0"
		}, "", _);
		strictEqual(result, "OK", "within timeout");
		// slow request not within timeout limit
		try {
			mocks.simpleRequest(client, {
				path: "/1500"
			}, "", _);
			throw new Error("No timeout detected");
		} catch (e) {
			strictEqual("" + e, "Error: Timeout", "with timeout");
		}
		strictEqual(server.numberRequests(), "0/0", "no open request on server");
		strictEqual(client.numberRequests(), "0/0", "no open request on client");
	});
});