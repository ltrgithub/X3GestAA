"use strict";

var generic = require('ez-streams').devices.generic;

/// !doc
/// ## ez-streams wrapper for oracle
/// 
/// `var ezoracle = require('ez-oracle');`
/// 
module.exports = {
	/// * `reader = ezoracle.reader(cursor)`  
	reader: function(connection, sql, args) {
		var rd = connection.reader(sql, args);
		return generic.reader(function(_) {
			var row = rd && rd.nextRow(~_);
			return row == null ? (rd = undefined) : row;
		});
	},
	/// * `writer = ezoracle.writer(statement)`  
	writer: function(connection, sql) {
		var statement = connection.prepare(sql);
		return generic.writer(function(_, row) {
			if (row === undefined) {
				statement = null; 
				return;
			} else if (statement) {
				statement.execute(row, ~_);
			}
		});
	},
};