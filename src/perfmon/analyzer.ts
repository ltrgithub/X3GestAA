"use strict";

var fs = require('streamline-fs');
var fsp = require("path");
var sys = require("util");
var config = require('config'); // must be first syracuse require
var helpers = require('@sage/syracuse-core').helpers;
var perfConfig = (config || {}).perfmon || {};
var tracer = perfConfig.trace;
var topLimit = 20;

var PerfStat = helpers.defineClass(function(opt) {
	this.options = opt || {};
	this.perfStat = {};
}, null, {

	compute: function computeStat(_, dir) {
		var dircontent = fs.readdir(dir, _);
		dircontent.forEach_(_, this.walk.bind(this, dir));
		return this;
	},

	save: function writeStat(_, file) {
		this.perfStat.top && this.perfStat.top.sort(sortTimingDesc);
		fs.writeFile(file, JSON.stringify(this.perfStat, null, "\t"), "utf8", _);
	},

	walk: function walkTree(dir, _, file) {
		var path = fsp.join(dir, file); // dir + '\\' + file;
		tracer && tracer("walk PATH " + path);
		var stat = fs.stat(path, _);
		var dircontent;
		if (stat.isDirectory()) {
			fs.readdir(path, _).forEach_(_, this.walk.bind(this, path));
		} else {
			this._compute(_, readJson(_, path));
		}
	},

	_compute: function internalCompute(_, data) {
		// perfStat
		if (!data.perfmon) return;

		if (data.perfmon.lastSeqId < this.perfStat.seqId) {
			// new sequence so reset current
			// this.perfStat = {};
		}

		var self = this,
			pe = data.perfmon,
			regex = self.options.regex;

		Object.keys(pe).forEach_(_, function(_, kpe) {
			var session = pe[kpe];
			session.timings.forEach_(_, function(_, t) {
				if (!regex || regex && regex.exec(t.details)) {
					self._analyze(_, t);
				}
			});
		});

		var tags = self.perfStat.byTag || {},
			a;

		// reorder "byTag" collection by duration
		a = Object.keys(tags).map(function(k) {
			return {
				tag: k,
				value: tags[k]
			};
		}).sort(function(v1, v2) {
			return v2.value.duration - v1.value.duration;
		});

		tags = self.perfStat.byTag = {};
		a.forEach(function(e) {
			tags[e.tag] = e.value;
		});
	},

	_analyze: function analyzeTiming(_, t, tp) {
		var self = this,
			perfStat = self.perfStat;
		perfStat.duration = perfStat.duration || 0;
		perfStat.untrackedDuration = perfStat.untrackedDuration || 0;
		perfStat.top = perfStat.top || [];
		perfStat.max = perfStat.max || t;
		perfStat.byTag = perfStat.byTag || {};
		var p = perfStat.byTag[t.tag] = perfStat.byTag[t.tag] || {
				count: 0,
				duration: 0,
				average: 0,
				untrackedDuration: 0
			},
			childrenDuration = 0;
		p.count++;
		p.duration += t.duration;
		perfStat.duration += t.duration;
		p.average = p.duration / p.count;

		if (perfStat.max.duration < t.duration) {
			perfStat.max = t;
		}
		if (!tp && (perfStat.top[0] && perfStat.top[0].duration || 0) < t.duration) {
			perfStat.top.push(t);
			perfStat.top.sort(sortTimingAsc);
			if (perfStat.top.length > topLimit) perfStat.top.shift();
		}
		perfStat.seqId = t.seqId;
		t.children.forEach_(_, function(_, tc) {
			childrenDuration += self._analyze(_, tc, t);
		});
		t.childrenDuration = childrenDuration;
		t.untrackedDuration = t.children.length > 0 ? (t.duration - t.childrenDuration) : 0;
		p.untrackedDuration += t.untrackedDuration;
		perfStat.untrackedDuration += t.untrackedDuration;
		p.trackedRatio = 1 - p.untrackedDuration / p.duration;
		p.ratio = p.duration / perfStat.duration;
		return t.duration;
	}

});

function sortTimingAsc(t1, t2) {
	return t1.duration - t2.duration;
}

function sortTimingDesc(t1, t2) {
	return t2.duration - t1.duration;
}

function readJson(_, filename) {
	var data = fs.exists(filename, _) && fs.readFile(filename, "utf8", _);
	if (!data) {
		tracer && tracer("data is empty ");
		return {};
	} else {
		try {
			return JSON.parse(data);
			// tracer && tracer("index data " + JSON.stringify(index, null, 2));
		} catch (e) {
			throw new Error("IncorrectJsonFormat: " + filename);
		}
	}
}

exports.analyze = function(path, file, opt) {
	var opt = opt || {};
	if (opt.regex)
		opt.regex = new RegExp(opt.regex, "gi");
	_analyze(_error, path, file, opt);
};

function _analyze(_, path, file, opt) {
	var perf = new PerfStat(opt);
	perf.compute(_, path);
	perf.save(_, file);
}

function _error(err) {
	if (err) throw err;
}