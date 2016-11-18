"use strict";

var adminHelper = require("../../../collaboration/helpers").AdminHelper;
var flows = require('streamline-runtime').flows;

exports.entity = {
	$listTitle: "List of template purposes",
	$properties: {
		name: {
			$title: "Name"
		}
	},
	// displays a distinct selection of the property "templatePurpose" of all documents templates matching the current template class and type 
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		var codes = [];
		var names = [];
		var params = {
			"jsonWhere": {
				"templateClass": parameters.templateClass,
				"templateType": parameters.templateType
			}
		};
		var db = adminHelper.getCollaborationOrm(_);
		var entity = db.getEntity(_, "msoWordTemplateDocument");
		var instances = db.fetchInstances(_, entity, params);
		flows.eachKey(_, instances, function(_, key, e) {
			var name = e.templatePurpose(_);
			if (name && name !== "" && names.indexOf(name) < 0) {
				names.push(name);
			}
		});
		flows.eachKey(_, names, function(_, key, e) {
			var instance = self.factory.createInstance(_, null, context.db, context);
			instance.name(_, e);
			codes.push(instance);
		});

		return codes;
	},
	$defaultOrder: [
		["name", true]
	]
};