"use strict";

var dataModel = require("../../../../src/orm/dataModel");
var sdataRegistry = require("../../../../src/sdata/sdataRegistry");
var flows = require('streamline-runtime').flows;
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.entity = {
	$properties: {
		name: {
			$title: "Name"
		},
		title: {
			$title: "Title"
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		// TODO: dataset ?
		var preliminary = [];
		var application = adminHelper.getApplication(_, context.parameters.application, context.parameters.contract);
		if (!application) return [];
		if (application.protocol(_) === "syracuse") {
			var contract = sdataRegistry.getContract(application.application(_), application.contract(_));
			contract && flows.eachKey(_, contract.entities, function(_, key, entity) {
				var instance = self.factory.createInstance(_, null, context.db, context);
				instance.name(_, helpers.string.pluralize(key));
				instance.title(_, entity.$listTitle || key);
				preliminary.push(instance);
			});
		}
		//
		return preliminary;
	},
	$defaultOrder: [
		["name", true]
	]
};