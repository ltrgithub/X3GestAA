"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var excelHelpers = require("msoffice/lib/helpers");
var dataModel = require("../../../../../src/orm/dataModel");
var sdataRegistry = require("../../../../../src/sdata/sdataRegistry");

exports.entity = {
	$titleTemplate: "Select datasource",
	$isPersistent: false,
	$canEdit: false,
	$createActionTitle: "New datasource",
	$listTitle: "List of datasources",
	$properties: {
		title: {
			$title: "Title"
		},
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
			$isHidden: true
		},
		representation: {
			$title: "Representation",
			$isHidden: true
		},
		serviceUrl: {
			$title: "Service url",
			$isDisabled: true,
			$compute: function(_, instance) {
				return instance.computeServiceUrl(_);
			}
		},
		fetchAll: {
			$title: "Fetch all",
			$type: "boolean",
			$default: false
		},
		fetchLimit: {
			$title: "Fetch limit",
			$type: "integer",
			$default: 1000,
			$isDefined: function(_, instance) {
				return !instance.fetchAll(_);
			}
		},
		filter: {
			$title: "Filter",
			$type: "filter",
			$isDisabled: function(_, instance) {
				return !instance.entity(_);
			},
			$links: {
				$prototype: {
					$url: "/sdata/{application}/{contract}/{dataset}/$prototypes('{representation}.$query')"
				}
			}
		}
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
		menuItem: {
			$title: "Datasource",
			$type: "menuItem",
			$propagate: function(_, instance, val) {
				if (val) {
					instance.representationRef(_, val.representationRef(_));
					instance.title(_, val.title(_));
				} else {
					instance.representationRef(_, null);
					instance.title(_, "");
				}
			},
			$isDisabled: function(_, instance) {
				return instance.endpoint(_) == null;
			},
			$lookupFilter: {
				application: "{endpoint}.{applicationRef}",
				$or: [{
					linkType: "$representation",
					facet: "$query"
				}, {
					linkType: "$request"
				}, {
					linkType: "$stats"
				}]
			}
		},
		representationRef: {
			$title: "Representation",
			$type: "representationProxy",
			isChild: true,
			$lookup: {
				parameters: "dataset={dataset}"
			},
			$propagate: function(_, instance, val) {
				instance.computePrototype(_);
				if (val) {
					instance.representation(_, val.representation(_));
					instance.entity(_, val.entity(_));
					instance.title(_, val.title(_));
				} else {
					instance.representation(_, "");
					instance.entity(_, "");
				}
			},
			$isDisabled: function(_, instance) {
				return instance.dataset(_) == null;
			}
		},
		orderBys: {
			$title: "Order by",
			$type: "excelOrderAttrs",
			$isChild: true,
			$select: {
				$title: "Attributes",
				$type: "lookupEntityAttr",
				$fieldMap: {
					name: "name",
					title: "title"
				},
				$parameters: "application={application}&contract={contract}&dataset={dataset}&entity={entity}"
			}
		}
	},
	$functions: {
		$save: function(_, saveRes) {
			saveRes.$clientAgent = saveRes.$clientAgent || {};
			saveRes.$clientAgent.$id = "excelDatasources";
			saveRes.$clientAgent.$action = "saveDatasource";
			//
			saveRes.$links.$home = {
				$title: "Ok",
				$url: "?representation=excelconfig.$dashboard",
				$type: "application/json; vnd-sage=syracuse"
			};
			if (saveRes.$links.$create) saveRes.$links.$create.$isHidden = false;
		},
		getMaxFetchCount: function(_) {
			return (this.fetchAll(_) ? 0 : this.fetchLimit(_));
		},
		computeServiceUrl: function(_) {
			if (this.endpoint(_) && this.representationRef(_) && this.representationRef(_).representation(_) && this.representationRef(_).entity(_)) {
				var facetName = "$bulk";
				var limit = this.fetchLimit(_);
				var params = ["representation=" + this.representationRef(_).representation(_) + "." + facetName];
				if (!this.fetchAll(_)) params.push("count=" + limit);
				return (["", "sdata", this.endpoint(_).applicationRef(_).application(_),
					this.endpoint(_).applicationRef(_).contract(_),
					this.endpoint(_).dataset(_),
					this.representationRef(_).entity(_)
				].join("/") + "?" + params.join("&"));
				// TODO: compute data count

			} else return "";
		},
		$serialize: function(_) {
			var self = this;
			self.computePrototype(_);
			var res = self._internalSerialize(_);
			return res;
		},
		computePrototype: function(_) {
			return;
			var self = this;
			var labelFilter = "Filter:";
			var labelNoEntity = "<no entity selected>";
			if (!self.representationRef(_)) return;

			self.$properties = self.$properties || {};
			self.$properties.filter = {
				$title: labelFilter + " " + labelNoEntity,
				$links: {
					$prototype: {
						$url: this.endpoint(_).getBaseUrl(_) + "/$prototypes('user.$details')"
					}
				}
				/*				$item: { 
					$properties: { }
				}*/
			};

			var ep = self.endpoint(_);
			if (ep) {
				var contract = sdataRegistry.getContract(ep.applicationRef(_).application(_), ep.applicationRef(_).contract(_));
				if (contract) {
					var model = dataModel.make(contract, ep.dataset(_));
					if (model) {
						var name = model.singularize(self.representationRef(_).entity(_));
						var entity = contract.entities[name];
						if (entity) {
							// TODO: Localize
							self.$properties.filter.$title = labelFilter + " " + ((entity.$titleTemplate && entity.$titleTemplate.expression) || name);
							/*							var $fprops = self.$properties.filter.$item.$properties;
							Object.keys(entity.$properties).map_(_, function(_, $property) {
								var props = entity.$properties[$property].getPropertyPrototype(_);
								if (props.$capabilities.indexOf("filter") >= 0) {
									props.$isUnique = false;
									props.$isMandatory = false;
									props.$isReadOnly = false;
									props.$linksToDetails = false;
									$fprops[$property] = props;
								}
							});*/
						}
					}
				}
			}
		}
	}
};