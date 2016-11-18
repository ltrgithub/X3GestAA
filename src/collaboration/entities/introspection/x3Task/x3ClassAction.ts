"use strict";

var adminHelper = require("../../../../../src/collaboration/helpers").AdminHelper;



exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "X3 actions",
	$descriptionTemplate: "Administration task to schedule X3 action",
	$valueTemplate: "{action}",

	$properties: {
		action: {
			$title: "Action Name",
			$type: "string",
		},
		parameters: {
			$title: "Parameters",
			$isHidden: true
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var facet = parameters.facet;

		if (!parameters.ep) throw new Error("No endpoint");
		var dbAdmin = adminHelper.getCollaborationOrm(_);
		var ep = dbAdmin.fetchInstance(_, dbAdmin.model.getEntity(_, "endPoint"), {
			jsonWhere: {
				$uuid: parameters.ep
			}
		});
		if (!ep) throw new Error("No endpoint for uuid");
		var dbX3 = ep.getOrm(_);
		var className = parameters.class;
		var entity = dbX3.getEntity(_, className, facet);
		var repName = parameters.rep || className;

		var prototype = entity.getPrototype(_, repName, facet);
		// check list of actions
		var actions = prototype && prototype.$actions;
		var properties = prototype && prototype.$properties;


		var model = dbAdmin.model;
		var entityAction = model.getEntity(_, "x3ClassAction");
		var arr = [];
		for (var act in actions) {
			if (act.indexOf('$') !== 0) {
				var inst = entityAction.factory.createInstance(_, null, dbAdmin);
				inst.action(_, act);
				inst.parameters(_, {});

				arr.push(inst);
				// parameters?
				var content = actions[act];
				var paramobject = {};
				if (content.$parameters) {
					// var instparams = inst.parameters(_);
					for (var param in content.$parameters) {
						// var instparam = instparams.add(_);
						// instparam.name(_, param);
						var value = content.$parameters[param];
						if (value && /^\{[A-Z0-9_]+\}$/.test(value)) {
							value = value.substr(1);
							value = value.substr(0, value.length - 1);
							if (properties[value]) {
								paramobject[param] = properties[value].$type;
							} else {
								paramobject[param] = "???";
							}
						} else {
							paramobject[param] = "???2";
							//console.log("Value wrong " + value);
						}
					}
				}
				inst.parameters(_, JSON.stringify(paramobject));
			}
		}
		return arr;

	},
	$functions: {

	},
	$services: {}
};