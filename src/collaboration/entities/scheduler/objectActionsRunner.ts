"use strict";

var locale = require('streamline-locale');
var scheduler = require("syracuse-event/lib/scheduler");
var factory = require("../../../../../src/orm/factory");
var index = require("syracuse-search/lib/elasticIndex");
var IndexHelper = index.IndexHelper;
var sys = require("util");

var nextRun;

var _operationsMap = {
	"reindex": function(_, instance) {
		var ind = new IndexHelper(instance.getEndpoint(_), locale.current);
		ind.updateInstance(_, instance, {});
	}
};

exports.entity = {
	$functions: {
		scheduleAction: function(_, operation, id, url) {
			this._db.pushObjectAction(_, operation, id, url);
			// avoid flooding
			if (!nextRun || (Date.now() > nextRun)) {
				nextRun = Date.now() + 1000;
				return scheduler.schedule(_, this, this.$uuid, nextRun, {}, "db");
			}
		},
		fire: function(_, key, parameters) { // call by scheduler when a print document must be purge automatically
			var oper;
			while (oper = this._db.popObjectAction(_)) {
				if (!oper.operation || !_operationsMap[oper.operation]) throw new Error(locale.format(module, "operationUnknown", oper.operation));
				var inst = factory.fetchFromUrl(_, oper.url);
				if (!inst) throw new Error(locale.format(module, "instanceNotFound", oper.url));
				_operationsMap[oper.operation](_, inst);
			}
		}
	}
};