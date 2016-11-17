"use strict";

var locale = require('streamline-locale');
var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var config = require('config');
var fsp = require('path');
var flamegraphSettings = require('./setting');
var flows = require('streamline-runtime').flows;
var ez = require('ez-streams');

var enabledByConfig = !!config.streamline.flamegraph;

var defaultFile = fsp.join(__dirname, "../../../..", "flamegraph.txt");

var tasks = {};

function getOptions(_, instance) {
	return {
		rate: instance.rate(_),
		condensed: true,
		sourceRoot: fsp.join(__dirname, "../../../.."),
		// exclude our own stack frames
		exclude: /[\\\/]syracuse-flamegraph[\\\/]lib[\\\/]entities[\\\/]recording/,

	};
}

exports.entity = {
	$titleTemplate: enabledByConfig ? "{name}" : "{name} (not enabled by nodelocal)",
	$valueTemplate: "{name}",
	$descriptionTemplate: "{description}",
	$capabilities: "mailTemplate",
	$canCreate: false,
	$canDelete: true,
	$canEdit: enabledByConfig,
	$properties: {
		name: {
			$title: "Name",
			$isMandatory: true,
			$linksToDetails: true,
			$default: function(_, instance) {
				return "Flamegraph " + datetime.now();
			}
		},
		description: {
			$title: "Description",
		},
		rate: {
			$title: "Sampling rate (ms)",
			$type: "integer",
			$isReadOnly: function(_, instance) {
				return instance.status(_) !== 'created';
			},
			$default: 10,
		},
		stamp: {
			$title: "Timestamp",
			$type: "datetime",
			$isReadOnly: true,
			$isNullable: true,
			$default: function(_, instance) {
				return datetime.now();
			},
		},
		pid: {
			$title: "Process ID",
			$type: "integer",
			$isReadOnly: true,
			$isNullable: true,
			$default: process.pid,
		},
		status: {
			$title: "Status",
			$enum: [{
				$title: "created",
				$value: "created",
			}, {
				$title: "running",
				$value: "running",
			}, {
				$title: "paused",
				$value: "paused",
			}, {
				$title: "complete",
				$value: "complete",
			}, {
				$title: "error",
				$value: "error",
			}],
			$isReadOnly: true,
			$default: "created",
		},
		size: {
			$title: "Size",
			$type: "integer",
			$compute: function(_, instance) {
				var recording = instance.recording(_);
				return recording.fileExists(_) ? recording.getProperties(_).length : null;
			},
		},
		recording: {
			$title: "Recording",
			$type: "binary",
			$isReadOnly: true,
			$isDisabled: false,
			$storage: "db_file",
		},
		filename: {
			$title: "File name",
			$default: defaultFile
		},
		fullGraph: {
			$title: "Full Graph",
			$type: "binary",
			$isReadOnly: true,
			$isDisabled: false,
			$storage: "db_file",
		},
		cpuGraph: {
			$title: "CPU Graph",
			$type: "binary",
			$isReadOnly: true,
			$isDisabled: false,
			$storage: "db_file",
		},
		invertedFullGraph: {
			$title: "Inverted Full Graph",
			$type: "binary",
			$isReadOnly: true,
			$isDisabled: false,
			$storage: "db_file",
		},
		invertedCpuGraph: {
			$title: "Inverted CPU Graph",
			$type: "binary",
			$isReadOnly: true,
			$isDisabled: false,
			$storage: "db_file",
		},
		transcript: {
			$title: "Transcript",
			$type: "text/plain",
			$isReadOnly: true,
			$default: "",
		}
	},
	$relations: {},
	$functions: {
		log: function(_, message) {
			this.transcript(_, this.transcript(_) + '\n' + datetime.now() + ' ' + message);
		},
		startRecording: function(_) {
			var self = this;
			if (this.status(_) !== "created" && this.status(_) !== "complete") throw new Error("bad status: " + this.status(_));
			// create task
			var task = require('streamline-flamegraph/lib/record').create(getOptions(_, this));
			tasks[this._id] = task;

			// create output stream
			if (this.recording(_).fileExists(_)) this.recording(_).deleteFile(_);
			if (this.fullGraph(_).fileExists(_)) this.fullGraph(_).deleteFile(_);
			if (this.cpuGraph(_).fileExists(_)) this.cpuGraph(_).deleteFile(_);
			if (this.invertedFullGraph(_).fileExists(_)) this.invertedFullGraph(_).deleteFile(_);
			if (this.invertedCpuGraph(_).fileExists(_)) this.invertedCpuGraph(_).deleteFile(_);
			var output = this.recording(_).createWritableStream(_, {
				"contentType": "application/x-flamegraph",
				"contentEncoding": "gzip",
				"fileName": this.name(_) + ".gz",
			});
			output = ez.helpers.binary.writer(output, {
				bufSize: 64000,
			});

			// run the pipe (do not wait)
			task.reader.nodeTransform(require('zlib').createGzip()).pipe(function(err) {
				if (err) console.error("Flamegraph pipe error " + err);
				// self.finishRecording(!_, err);
			}, output);
			task.start();

			// update status and save
			this.status(_, "running");
			this.transcript(_, "");
			this.log(_, "recording started");
			this.save(_);
		},
		finishRecording: function(_, err) {
			this.status(_, err ? "error" : "complete");
			this.log(_, err ? "recording failed: " + err.message : "recording complete");
			this.save(_);
		},
		stopRecording: function(_) {
			var err;
			try {
				var task = tasks[this._id];
				if (task) {
					delete tasks[this._id];
					task.stop(_);
				}
			} catch (e) {
				console.log("Error " + e);
				err = e;
			}
			this.finishRecording(_, err);
		},
		pauseRecording: function(_) {
			if (this.status(_) !== "running") throw new Error("bad status: " + this.status(_));
			var task = tasks[this._id];
			task.pause();
			this.status(_, "paused");
			this.log(_, "recording paused");
			this.save(_);
		},
		resumeRecording: function(_) {
			if (this.status(_) !== "paused") throw new Error("bad status: " + this.status(_));
			var task = tasks[this._id];
			task.resume();
			this.status(_, "running");
			this.log(_, "recording resumed");
			this.save(_);
		},
		generateSvg: function(_) {
			if (this.status(_) !== "complete") throw new Error("bad status: " + this.status(_));
			var recording = this.recording(_);
			if (!recording.fileExists(_)) throw new Error("Recording doesn't exist");

			var input = recording.createReadableStream(_) //
				.nodeTransform(require('zlib').createGunzip()) //
				.map(ez.mappers.convert.stringify());
			var outputs = {};
			['full', 'cpu', 'invertedFull', 'invertedCpu'].forEach_(_, function(_, k) {
				outputs[k + 'Writer'] = this[k + 'Graph'](_).createWritableStream(_, {
					contentType: "image/svg+xml",
					fileName: this.name(_) + "-" + k + ".svg",
				});
			}, this);
			this.save(_);

			// do the folding pass once
			var options = getOptions(_, this);
			// generate links
			options.sourceUrl = "https://github.com/Sage-ERP-X3/Syracuse/tree/master/{0}#L{1}";
			options.target = "_blank";
			options.hash = 2; // colouring by module name
			require('streamline-flamegraph/lib/fold').convert(_, input, outputs, options);

			this.log(_, "SVG graphs generated");
		}
	},
	$services: {
		create: {
			$title: "Create",
			$description: "Create new recording",
			$method: "POST",
			$isDefined: function(_, instance) {
				return instance == null;
			},
			$execute: function(_, context) {
				var instance = context.entity.createInstance(_, context.db);
				instance.stamp(_, datetime.now());
				instance.name(_, "Flamegraph " + instance.stamp(_));
				instance.status(_, "created");
				instance.save(_);
			},
		},
		start: {
			$title: "Start",
			$description: "Start recording",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "created";
			},
			$execute: function(_, context, instance) {
				instance.startRecording(_);
			},
		},
		restart: {
			$title: "Restart",
			$description: "Restart recording",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "complete";
			},
			$execute: function(_, context, instance) {
				instance.startRecording(_);
			},
		},
		stop: {
			$title: "Stop",
			$description: "Stop recording",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) {
				return enabledByConfig && /^(running|paused)$/.test(instance.status(_));
			},
			$execute: function(_, context, instance) {
				instance.stopRecording(_);
			},
		},
		pause: {
			$title: "Pause",
			$description: "Stop recording",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "running";
			},
			$execute: function(_, context, instance) {
				instance.pauseRecording(_);
			},
		},
		resume: {
			$title: "Resume",
			$description: "Stop recording",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "paused";
			},
			$execute: function(_, context, instance) {
				instance.resumeRecording(_);
			},
		},
		generateSvg: {
			$title: "Generate Graphs",
			$description: "Generate SVG graphs",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			//$invocationMode: "async",
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "complete" && !instance.fullGraph(_).fileExists(_);
			},
			$execute: function(_, context, instance) {
				instance.generateSvg(_);
			},
		},
		generateFile: {
			$title: "Generate file",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			//$invocationMode: "async",
			$isDefined: function(_, instance) {
				return enabledByConfig && instance.status(_) === "complete";
			},
			$execute: function(_, context, instance) {
				var recording = instance.recording(_);
				if (!recording.fileExists(_)) throw new Error("Recording doesn't exist");
				var recordingReader = recording.createReadableStream(_) //
					.nodeTransform(require('zlib').createGunzip()) //
					.map(ez.mappers.convert.stringify());
				var output = require('streamline-flamegraph/lib/fold').fold(_, recordingReader, {
					exclude: /[\\\/]syracuse-flamegraph[\\\/]lib[\\\/]entities[\\\/]recording/,
					excludeInv: true // no inverse
				});
				var filename = instance.filename(_) || defaultFile;
				require('streamline-fs').writeFile(filename, JSON.stringify(output), _);

				instance.$addDiagnose("info", locale.format(module, "fileCreated", filename));
				return;

			},

		}
	},
	$links: {
		settings: flamegraphSettings.getLink(),
	},
	$defaultOrder: [
		["stamp", false]
	],
};