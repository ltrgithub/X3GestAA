"use strict";

var ez = require('ez-streams');
var hdb = require('hdb');

/// !doc
/// ## ez-streams wrapper for Hana DB
/// 
/// `var ezhdb = require('ez-hdb');`
/// 
module.exports = {
	/// * `reader = ezhdb.reader(rs)`  
	reader: function(rs) {
		return ez.devices.node.reader(rs.createObjectStream());
	},
	writer: function(prepared, options) {
		options = options || {};
		var windowSize = options.windowSize || 10000;
		var window = [];
		return ez.devices.generic.writer(function(_, row) {
			function flush(_) {
				prepared.exec(window, ~_);
				window = [];
			}
			if (row === undefined) {
				if (window.length > 0) flush(_);
				prepared = null; 
				return;
			} else if (prepared) {
				//console.log("ROW=" + row);
				window.push(row);
				if (window.length >= windowSize) flush(_);
			}
		});
	},
};