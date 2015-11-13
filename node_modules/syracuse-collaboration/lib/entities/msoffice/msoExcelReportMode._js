"use strict";

var util = require("./util");
var locale = require('streamline-locale');

exports.entity = {
	$titleTemplate: "Excel report",
	$descriptionTemplate: " ",
	$valueTemplate: " ",

	$isPersistent: false,
	$properties: {
		excelReportMode: {
			$title: "Excel report",
			$enum: function(_, instance) {
				var repr = instance.msoCurrentRepresentation(_) || instance.representation;
				var exportOptions = (repr && repr.indexOf(".$details") !== -1) ? ["choose_tpl", "new_tpl", "mod_tpl"] : ["choose_tpl", "new_tpl", "mod_tpl", "no_tpl"];
				return (exportOptions).map(function(option) {
					return {
						$value: option,
						$title: locale.format(module, option)
					};
				});
			},
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
			$type: "msoExcelTemplateDocument",
			$isDisabled: function(_, instance) {
				return instance.excelReportMode(_) === "new_tpl" || instance.excelReportMode(_) === "no_tpl";
			},
			$isMandatory: function(_, instance) {
				return instance.excelReportMode(_) !== "new_tpl" && instance.excelReportMode(_) !== "no_tpl";
			},
			$lookupFilter: function(_, instance) {
				var filters = [];
				util.matchOrEmptyFilter(_, filters, "templateClass", instance.msoCurrentRepresentation(_));
				util.matchOrEmptyFilter(_, filters, "templateType", "excelReport");
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

		instance.representation = params.representation;
		instance.msoCurrentRepresentation(_, params.$msoExcelRepr);
		instance.msoLocaleCode(_, params.$msoLocale);
		instance.cpy(_, params.$msoCpy);
		instance.leg(_, params.$msoLeg);
		instance.activ(_, params.$msoActiv);
		instance.endpoint(_, util.findMatchingEndpoint(_, context, params.$msoEndpoint));
	}
};