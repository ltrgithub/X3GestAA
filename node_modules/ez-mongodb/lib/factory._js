"use strict";

var generic = require('ez-streams').devices.generic;
var ezMongodb = require('./index');
var MongoClient = require('streamline-mongodb').MongoClient;

function _mongoOptions(options) {
    // take relevant options from options
    return {			
        db: {
		  w: 1
		}
    };
}

function _getCollection(_, url, options) {
    var parts = url.split("?");
    var segs = (parts[0] || "").split("/");
    var dbUrl = segs.slice(0,4).join("/");
    // TODO: extract connect options from url query
    var connectOpt = _mongoOptions(options);
    var db = MongoClient.connect(dbUrl, connectOpt, _);
    return db.collection(segs[4], _);
}

function _parseQuery(url) {
    var query = ((url || "").split("?")[1] || "").split("&");
    return query.reduce(function(prev, crt) {
        var pp = crt.split("=");
        if (pp[0]) prev[pp[0]] = pp[1];
        return prev;
    }, {});
}

/// !doc
/// ## ez-stream factory for mongodb
/// 
/// `var ez = require('ez-streams');
///  // relevant url syntax here http://docs.mongodb.org/manual/reference/connection-string/
///  var factory = ez.factory("mongodb://server:port/schema/collection?connectOption1=some_opt");`
/// 
module.exports = {
    factory: function(url) {
 		var options = _parseQuery(url) || {};
        return {
            /// * `reader = factory.reader(_)`  
            reader: function(_) {
                // TODO: extract filter from query
                var cursor = _getCollection(_, url, options).find();
                return ezMongodb.reader(cursor);
            },
            /// * `writer = factory.writer(_)`  
            writer: function(_) {
                var collection = _getCollection(_, url, options);
                return ezMongodb.writer(collection, {
                    upsert: options.upsert
                });
            }
        }
    }
}