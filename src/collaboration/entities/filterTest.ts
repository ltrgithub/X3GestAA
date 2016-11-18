"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var dataModel = require("../../../../src/orm/dataModel");
var sdataRegistry = require("../../../../src/sdata/sdataRegistry");

exports.entity = {
	$titleTemplate: "Filter test",
	$isPersistent: true,
	$canEdit: true,
	$properties: {
		application: {
			$isHidden: true
		},
		contract: {
			$isHidden: true
		},
		dataset: {
			$isHidden: true
		},
		entity: {
			$title: "Entity",
			$isMandatory: false,
			$linksToDetails: true,
			$lookup: {
				entity: "lookupEntity",
				field: "name",
				parameters: "application={application}&contract={contract}&dataset={dataset}"
			},
			$propagate: function(_, instance, val) {
				var ep = instance.endpoint(_);
				if (!ep) return;
				var contract = sdataRegistry.getContract(ep.applicationRef(_).application(_), ep.applicationRef(_).contract(_));
				if (!contract) return;
				var model = dataModel.make(contract, ep.dataset(_));
				if (!model) return;
				instance.computePrototype(_);

			}
		},
		filter: {
			$title: "Filter",
			$type: "filter",
			$isDisabled: function(_, instance) {
				return !instance.entity(_);
			}
		},
		someDate: {
			$title: "Some date",
			$type: "date",
		},
		title: {
			$title: "Title",
			$enum: [{
				$title: "Mr.",
				$value: "mr"
			}, {
				$title: "Mrs.",
				$value: "mrs"
			}],
			$default: "mr"
		},
		someDecimalValue: {
			$title: "Some decimal",
			$type: "decimal",
		},
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val) {
					instance.application(_, val.applicationRef(_).application(_));
					instance.contract(_, val.applicationRef(_).contract(_));
					instance.dataset(_, val.dataset(_));
				} else {
					instance.application(_, "");
					instance.contract(_, "");
					instance.dataset(_, "");
				}
			}
		},
	},
	$functions: {
		$serialize: function(_) {
			var self = this;
			self.computePrototype(_);
			var res = self._internalSerialize(_);
			return res;
		},
		computePrototype: function(_) {
			var self = this;
			var labelFilter = "Filter:";
			var labelNoEntity = "<no entity selected>";

			self.$properties = self.$properties || {};
			self.$properties.filter = {
				$title: labelFilter + " " + labelNoEntity,
				$item: {
					$properties: {}
				}
			};

			var ep = self.endpoint(_);
			if (ep) {
				var contract = sdataRegistry.getContract(ep.applicationRef(_).application(_), ep.applicationRef(_).contract(_));
				if (contract) {
					var model = dataModel.make(contract, ep.dataset(_));
					if (model) {
						var name = model.singularize(self.entity(_));
						var entity = contract.entities[name];
						if (entity) {
							// TODO: Localize
							self.$properties.filter.$title = labelFilter + " " + ((entity.$titleTemplate && entity.$titleTemplate.expression) || name);
							var $fprops = self.$properties.filter.$item.$properties;
							Object.keys(entity.$properties).map_(_, function(_, $property) {
								var props = entity.$properties[$property].getPropertyPrototype(_);
								if (props.$capabilities.indexOf("filter") >= 0) {
									props.$isUnique = false;
									props.$isMandatory = false;
									props.$isReadOnly = false;
									props.$linksToDetails = false;
									$fprops[$property] = props;
								}
							});
						}
					}
				}
			}
		}
	}
};