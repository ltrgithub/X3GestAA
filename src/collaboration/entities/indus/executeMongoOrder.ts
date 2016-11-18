"use strict";

var locale = require('streamline-locale');
var sys = require("util");

var _operationMap = {
	"query": function(_, coll, instance) {
		return coll.find(JSON.parse(instance.query(_) || "{}")).toArray(_);
	},
	"update": function(_, coll, instance) {
		return coll.update(JSON.parse(instance.query(_) || {}), JSON.parse(instance.update(_)), {
			upsert: false,
			multi: true,
			safe: true
		}, _);
	},
	"remove": function(_, coll, instance) {
		return coll.remove(JSON.parse(instance.query(_) || {}), {
			safe: true
		}, _);
	}
};

exports.entity = {
	$titleTemplate: "Mongodb direct operations",
	$descriptionTemplate: "This tool is intended for maintainance only. Use it if you realy know what you are doing !",
	$properties: {
		operation: {
			$title: "Operation",
			$enum: [{
				$title: "Query",
				$value: "query"
			}, {
				$title: "Update",
				$value: "update"
			}, {
				$title: "Remove",
				$value: "remove"
			}],
			$default: "query"
		},
		collection: {
			$title: "Collection",
			$isMandatory: true
		},
		query: {
			$title: "Query",
			$type: "text/plain",
			$default: "{}"
		},
		update: {
			$title: "Update",
			$type: "text/plain",
			$isHidden: function(_, instance) {
				return instance.operation(_) !== "update";
			},
			$default: "{}"
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true
		}
	},
	$services: {
		execute: {
			$title: "Execute",
			$method: "GET",
			$isMethod: true,
			$type: "application/x-content",
			$execute: function(_, context, instance) {
				var db = instance.endpoint(_).getOrm(_);
				try {
					var coll = db.db.collection(instance.collection(_), _);
					if (!coll) {
						throw new Error(locale.format(module, "wrongCollection", instance.collection(_)));
					}
					var res = _operationMap[instance.operation(_)](_, coll, instance);
					console.log("res=" + sys.inspect(res));
					return {
						headers: {
							"content-type": "application/json"
						},
						body: (res != null && JSON.stringify(res, null, "\t")) || "No result"
					};
				} catch (e) {
					return {
						headers: {
							"content-type": "text/html"
						},
						body: e.message + "\n" + e.safeStack
					};
				}
			}
		}
	}
};