"use strict";

var flows = require('streamline-runtime').flows;
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("../../collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');

exports.entity = {
	$properties: {
		name: {
			$title: "Name"
		},
		title: {
			$title: "Title"
		},
		attrType: {
			$title: "Type"
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		var preliminary = [];
		var ep = adminHelper.getEndpoint(_, {
			dataset: context.parameters.dataset
		});
		if (!ep) return [];
		//
		var db = ep.getOrm(_);
		var entity = db.getEntity(_, context.parameters.entity);
		if (!entity) return [];
		//
		entity && flows.eachKey(_, entity.$properties, function(_, key, prop) {
			var instance = self.factory.createInstance(_, null, context.db, context);
			instance.name(_, key);
			instance.title(_, prop.$title || key);
			instance.attrType(_, prop.$type);
			preliminary.push(instance);
		});
		entity && flows.eachKey(_, entity.$relations, function(_, key, prop) {
			var instance = self.factory.createInstance(_, null, context.db, context);
			instance.name(_, key);
			instance.title(_, prop.$title || key);
			instance.attrType(_, prop.$type);
			preliminary.push(instance);
		});
		//
		return preliminary;
	},
	$defaultOrder: [
		["name", true]
	]
};