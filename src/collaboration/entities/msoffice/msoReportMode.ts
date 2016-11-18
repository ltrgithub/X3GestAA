"use strict";

var util = require("./util");

exports.entity = {
	$titleTemplate: "Word report",
	$descriptionTemplate: " ",
	$valueTemplate: " ",

	$isPersistent: false,
	$properties: {
		reportMode: {
			$title: "Word report",
			$enum: [{
				$value: "choose_tpl",
				$title: "Choose existing template"
			}, {
				$value: "new_tpl",
				$title: "Create template"
			}, {
				$value: "mod_tpl",
				$title: "Modify template"
			}],
			$default: "choose_tpl"
		},
		msoCurrentRepresentation: {
			$title: "Representation",
			$isHidden: true,
			$isDisabled: true
		},
		msoLocaleCode: {
			$title: "Locale Code",
			$isHidden: true,
			$isDisabled: true
		},
		cpy: {
			$type: "string",
			$title: "Company",
			$isHidden: true,
			$isDisabled: true
		},
		leg: {
			$type: "string",
			$title: "Legislation",
			$isHidden: true,
			$isDisabled: true
		},
		activ: {
			$type: "string",
			$title: "Activity Code",
			$isHidden: true,
			$isDisabled: true
		}
	},
	$relations: {
		endpoint: {
			$type: "endPoint",
			$title: "Endpoint",
			$isDisabled: true,
			$isHidden: true
		},
		document: {
			$title: "Description",
			$type: "msoWordTemplateDocument",
			$isDisabled: function(_, instance) {
				return instance.reportMode(_) === "new_tpl";
			},
			$isMandatory: function(_, instance) {
				return instance.reportMode(_) !== "new_tpl";
			},
			$lookupFilter: function(_, instance) {
				var filters = [];
				util.matchOrEmptyFilter(_, filters, "templateClass", instance.msoCurrentRepresentation(_));
				util.matchOrEmptyFilter(_, filters, "templateType", "report");
				util.matchOrEmptyFilter(_, filters, "localeCode", instance.msoLocaleCode(_));
				util.matchOrEmptyFilter(_, filters, "cpy", instance.cpy(_));
				util.matchOrEmptyFilter(_, filters, "leg", instance.leg(_));
				util.matchOrEmptyFilter(_, filters, "activ", instance.activ(_));
				util.matchOrEmptyFilter(_, filters, "endpoint", instance.endpoint(_));

				var filter = {
					"$and": filters
				};
				return filter;
			}
		}
	},
	$init: function(_, instance, context) {
		var params = context.parameters;
		if (!params) return;

		instance.msoCurrentRepresentation(_, params.$msoRepr);
		instance.msoLocaleCode(_, params.$msoLocale);
		instance.cpy(_, params.$msoCpy);
		instance.leg(_, params.$msoLeg);
		instance.activ(_, params.$msoActiv);
		instance.endpoint(_, util.findMatchingEndpoint(_, context, params.$msoEndpoint));
	}
};