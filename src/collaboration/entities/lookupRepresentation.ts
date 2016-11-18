"use strict";

var dataModel = require("../../..//src/orm/dataModel");
var sdataRegistry = require("../../..//src/sdata/sdataRegistry");
var flows = require('streamline-runtime').flows;
var helpers = require('@sage/syracuse-core').helpers;
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');
var pluralize = helpers.string.pluralize;
var util = require("util");

exports.entity = {
	$properties: {
		name: {
			$title: "Name"
		},
		title: {
			$title: "Title"
		},
		entityName: {
			$title: "Entity"
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		var preliminary = [];

		var application = adminHelper.getApplication(_, context.parameters.application, context.parameters.contract);
		if (!application) return [];

		function isAdded(_, entityPluralName) {
			var len = preliminary.length;
			for (var i = 0; i < len; i++) {
				if (preliminary[i].entityName(_) === entityPluralName) {
					return true;
				}
			}
			return false;
		}

		if (application.protocol(_) === "syracuse") {
			var hasSelf = false;
			var contract = sdataRegistry.getContract(application.application(_), application.contract(_));
			var model = dataModel.make(contract);

			var entityName = model.singularize(context.parameters.entity);

			contract && flows.eachKey(_, contract.representations, function(_, key, repr) {
				if (entityName && ((repr.$entityName || key) !== entityName)) return;
				//
				if (entityName === key) hasSelf = true;
				//
				var instance = self.factory.createInstance(_, null, context.db, context);
				instance.name(_, key);
				instance.title(_, repr.$title || key);
				instance.entityName(_, pluralize(repr.$entityName));
				preliminary.push(instance);
			});
			if (entityName && !hasSelf) {
				var instance = self.factory.createInstance(_, null, context.db, context);
				instance.name(_, entityName);
				instance.title(_, (contract.entities[entityName] && contract.entities[entityName].$listTitle) || entityName);
				instance.entityName(_, entityName);
				preliminary.push(instance);
			}
			contract && flows.eachKey(_, contract.entities, function(_, key, entity) {
				if (!isAdded(_, entity.plural)) {
					var instance = self.factory.createInstance(_, null, context.db, context);
					instance.name(_, entity.name);
					instance.title(_, entity.title);
					instance.entityName(_, entity.plural);
					preliminary.push(instance);
				}
			});
			//

		}

		//		else if (application.protocol(_) === "x3"){
		//			
		//			var endPoint = adminHelper.getEndpoint(_, {application: context.parameters.application, contract: context.parameters.contract, dataset: context.parameters.dataset});
		//
		//			var handle = endPoint.getOrm(_);
		//			var entity = handle.getEntity(_, "AREPIDX", "$query");
		//
		//
		//			var instances = handle.fetchInstances(_, entity, {count: 100});
		//
		//			flows.eachKey(_, instances, function(_, key, repr) {
		//				var instance = self.factory.createInstance(_, null, context.db, context);
		//				instance.name(_, repr.NAME(_));
		//				instance.title(_, repr.TITLE(_));
		//				instance.entityName(_, repr.CLASSE(_));
		//				preliminary.push(instance);
		//			});
		//
		//		}
		//
		return preliminary;
	},
	$defaultOrder: [
		["name", true]
	]
};