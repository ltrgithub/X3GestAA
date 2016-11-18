"use strict";

var util = require("./util");

exports.entity = {
	$titleTemplate: "Create word document",
	$descriptionTemplate: " ",
	$valueTemplate: " ",

	$isPersistent: false,

	$properties: {
		creationMode: {
			$title: "Create document by",
			$enum: [{
				$value: "use_tpl",
				$title: "Use existing template"
			}, {
				$value: "new_empty_doc",
				$title: "New empty document"
			}, {
				$value: "new_word_tpl",
				$title: "New document by word template"
			}],
			$default: "use_tpl"
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
				return instance.creationMode(_) !== "use_tpl";
			},
			$isMandatory: function(_, instance) {
				return instance.creationMode(_) === "use_tpl";
			},
			$lookupFilter: function(_, instance) {
				var filters = [];
				util.matchOrEmptyFilter(_, filters, "templateClass", instance.msoCurrentRepresentation(_));
				util.matchOrEmptyFilter(_, filters, "templateType", "mailmerge");
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