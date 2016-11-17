"use strict";

var ez = require('ez-streams');
var jedi = require('ez-jedi');

exports.convert = function(_, reader) {
	var x3Log = {
		$name: "X3LOG",
		$type: "application/x-variant",
		$after: "\n",
		$variants: {
			channel1: {
				$type: "application/json",
				$control: "^<channel 1>",
				$properties: {
					channel: {
						$type: "application/x-number",
						$before: "<channel ",
						$after: ">"
					},
					code: {
						$type: "application/x-string",
						$before: "/",
						$after: "$"
					},
					line: {
						$type: "application/x-number",
						$before: "(",
						$after: ")"
					},
					expression: {
						$type: "application/x-string",
						$after: ","
					},
					tick: {
						$type: "application/x-number",
						$before: "tick:"
					},
				}
			},
			channel3: {
				$type: "application/json",
				$control: "^<channel 3>",
				$properties: {
					channel: {
						$type: "application/x-number",
						$before: "<channel ",
						$after: ">"
					},
					code: {
						$type: "application/x-string",
						$before: "/",
						$after: "$"
					},
					line: {
						$type: "application/x-number",
						$before: "(",
						$after: ")"
					},
					expression: {
						$type: "application/x-string",
						$after: ","
					},
					tick: {
						$type: "application/x-number",
						$before: "tick:"
					},
				}
			},
			channel4: {
				$type: "application/json",
				$control: "^<channel 4>",
				$properties: {
					channel: {
						$type: "application/x-number",
						$before: "<channel ",
						$after: ">"
					},
					expression: {
						$type: "application/x-string"
					},
					tick: {
						$type: "application/x-number",
						$before: "tick : "
					}
				}
			}
		}
	};

	var log = reader.transform(jedi.parser(x3Log))
		.map(function() {
			return function(_, record) {
				var channel = record.channel1 || record.channel3;
				if (channel) {
					channel.level = 0;
					var match = channel.expression.match(/^([\|\s]*)/);
					if (match) {
						channel.level += match[0].replace(/\s/g, '').length;
						channel.expression = channel.expression.substring(match[0].length);
					}
				}
				return record;
			};
		}())
		.transform(function(_, reader, writer) {
			var data = {
				res: {},
				idFrames: ["io"],
				frames: ["io"],
				codes: []
			};
			var record;
			var samplesIo = 0;
			var ioStart;
			var stack = [];
			while ((record = reader.read(_)) !== undefined) {
				// console.log(record);
				if (record.channel3) {
					// save the element in a stack
					stack[record.channel3.level] = Object.keys(record.channel3).reduce((r, k) => {
						r[k] = record.channel3[k];
						return r;
					}, {});
				} else if (record.channel1) {
					// report stack elements in the frame
					var res = stack.slice(0, record.channel1.level).reduce((r, e) => {
						var idFrame = [e.code, e.expression, e.line].join('-');
						var posFrame = data.idFrames.indexOf(idFrame);
						if (posFrame < 0) {
							var posCode = data.codes.indexOf(e.code);
							if (posCode < 0) {
								data.codes.push(e.code);
								posCode = data.codes.length - 1;
							}
							data.frames.push([posCode, e.line, e.expression].join(';'));
							data.idFrames.push(idFrame);
							posFrame = data.idFrames.length - 1;
						}
						r.push(posFrame);
						return r;
					}, []);

					var element = stack[record.channel1.level];
					var samples = (element.expression !== "Call SYRRCV From  ASYRCOM") ? (record.channel1.tick - element.tick) : 0;

					var idRes = res.join(';');
					data.res[idRes] = (data.res[idRes] || 0) + samples;
					if (samplesIo) {
						// Add IO
						res.push(0);
						var idRes2 = res.join(';');
						data.res[idRes2] = (data.res[idRes2] || 0) + samplesIo;
						data.res[idRes2] = Math.min(data.res[idRes2], data.res[idRes]);
						samplesIo = 0;
					}

				} else if (record.channel4) {
					if (/^Execution/.test(record.channel4.expression)) {
						ioStart = record.channel4.tick;
					} else if (/^Query end/.test(record.channel4.expression)) {
						samplesIo += record.channel4.tick - ioStart;
					}
				}
			}
			writer.write(_, data);
		}).toArray(_)[0];

	return {
		frames: log.frames,
		codes: log.codes,
		res: Object.keys(log.res).map(key => key + "; " + log.res[key])
	};
};