"use strict";

var generic = require('ez-streams').devices.generic;
var oracle = require('oracledb');

/// !doc
/// ## ez-streams wrapper for oracle
/// 
/// `var ezoracle = require('ez-oracle');`
/// 
var active = 0;
var tracer = console.error;

module.exports = {
	/// * `reader = ezoracle.reader(cursor)`  
	reader: function read(connection, sql, args) {
		args = args || [];
		var rd, stopped;
		return generic.reader(function(_) {
			if (!rd && !stopped) {
				tracer && tracer("READER OPEN: " + ++active + ", SQL:" + sql, args);
				rd = connection.execute(sql, args, {
					resultSet: true,
					outFormat: oracle.OBJECT,
				}, ~_);
			}
			if (!rd) return undefined;
			var row = rd.resultSet.getRow(~_);
			if (!row) {
				rd.resultSet.close(~_);
				tracer && tracer("READER CLOSED: " + --active)
				rd = null;
				return undefined;
			}
			tracer && tracer("ROW: " + JSON.stringify(row));
			return row;
		}, function stop() {
			tracer && tracer("READER STOPPED: " + active + ", alreadyStopped=" + stopped);
			stopped = true;
			if (rd) rd.resultSet.close(function(err) {
				if (err) throw err;
				tracer && tracer("READER CLOSED: " + --active)
			});
			rd = null;
		});
	},


	/// * `writer = ezoracle.writer(statement)`  
	writer: function(connection, sql) {
		var done;
		tracer && tracer("writer initialized : " + sql);
		return generic.writer(function(_, row) {
			if (row === undefined) done = true; 
			if (done) return;
			var values = Array.isArray(row) ? row : Object.keys(row).map(function(key) { return row[key] });
			tracer && tracer("Writing values " + JSON.stringify(values));
			connection.execute(sql, values, {}, ~_);
		});
	},
};