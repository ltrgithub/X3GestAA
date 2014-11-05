"use strict";

var generic = require('ez-streams').devices.generic;

/// !doc
/// ## ez-stream wrapper for mongodb
/// 
/// `var ezmongo = require('ez-mongodb');`
/// 
module.exports = {
	/// * `reader = ezmongo.reader(cursor)`  
	reader: function(cursor) {
		return generic.reader(function(_) {
			var obj = cursor.nextObject(_);
			return obj == null ? undefined : obj;
		});
	},
	/// * `writer = ezmongo.writer(collection)`  
	writer: function(collection, options) {
		options = options || {};
		var done;
		return generic.writer(function(_, obj) {
			if (obj === undefined) done = true;
			if (!done) {
				if (options.upsert) {
					collection.update({
						_id: obj._id
					}, obj, {
						upsert: true
					}, _);
				} else {
					collection.insert(obj, _);
				}
			}
		});
	},
};