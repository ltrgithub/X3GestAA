"use strict";

var sys = require("util");
var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;

exports.entity = {
	$titleTemplate: "Export",
	$descriptionTemplate: "Administration data export",
	$valueTemplate: "{title}",
	$properties: {
		className: {
			$title: "Class Name",
			$isMandatory: true,
			$isUnique: true
		},
		title: {
			$title: "Title",
			$isMandatory: true
		},
		contract: {
			$isHidden: true,
			$compute: function(_, instance) {
					//console.log("************instance._parent************: "+sys.inspect(instance._parent)) ;
					//if (instance._parent)
					//console.log("************instance._parent.contractName(_)************: "+sys.inspect(instance._parent.contractName(_))) ;

					return (instance._parent && instance._parent.contractName(_)) || "collaboration";
				}
				//defaultValue: "collaboration"
		},
		application: {
			$isHidden: true,
			$compute: function(_, instance) {

					return (instance._parent && instance._parent.applicationName(_)) || "syracuse";
				}
				//defaultValue: "syracuse",
		},
		endpointName: {
			$isHidden: true,
			$compute: function(_, instance) {
					return (instance._parent && instance._parent.endpointName(_)) || "syracuse";
				}
				//defaultValue : "syracuse"
		},
		standardProfile: {
			$title: "Use standard profile",
			$type: "boolean"
				/*,
				$isDisabled: function(_, instance) {
					return (instance.getEntity(_).$exportProfile == null);
				},
				defaultValue: function(_, instance) {
					return (instance.getEntity(_).$exportProfile != null);
				}*/
		},
		filter: {
			$title: "Filter"
		},
		exportAll: {
			$title: "Export all",
			$type: "boolean"
		}
	},
	$relations: {
		exportedObjects: {
			$title: "Exported objects",
			// for now we must provide a type (might change later) but the real type is dynamicaly defined in className propagate
			$type: "exportProfileObjects",
			$isDynamicType: true,
		},
		entityKeyAttribute: {
			$title: "Profile Item Key",
			$type: "entityAttributes",
			//$isMandatory: true,
			$isChild: true,
			$select: {
				$title: "Attributes",
				$type: "lookupEntityAttr",
				//$type: "portlet",
				//$fieldMap: { portlet: "$uuid" }
				$fieldMap: {
					name: "name"
				},
				$parameters: "application={application}&contract={contract}&dataset={application}&entity={className}"

			},
		},
		entityAttribute: {
			$title: "Profile Item Attributes",
			$type: "entityAttributes",
			$isChild: true,
			$select: {
				$title: "Attributes",
				$type: "lookupEntityAttr",
				$fieldMap: {
					name: "name" /*, title: "title", type : "attrType"*/
				},
				$parameters: "application={application}&contract={contract}&dataset={application}&entity={className}"

			},
		},

	},
	$functions: {
		$serialize: function(_) {
			// dynamicaly define the $select link
			var self = this;
			var res = self._internalSerialize(_);
			//console.log("parent is: "+sys.inspect(self._parent));
			//console.log("parent endpoint: " +sys.inspect( self._parent._data.endpoint)) ;
			//console.log("RES: "+ sys.inspect(res)) ;
			var ep = adminHelper.getEndpoint(_, {
				jsonWhere: {
					application: "{applicationName}",
					contract: "{contractName}",
					dataset: "{dataset}"
				}
			});

			if (self._parent && self._parent._data.endpoint && self.className(_) /*&& self.representation(_)*/ ) {
				// get "exportedObjects" $properties node
				res.$properties = res.$properties || {};
				res.$properties.exportedObjects = res.$properties.exportedObjects || {};
				var l = res.$properties.exportedObjects.$links = res.$properties.exportedObjects.$links || {};
				l.$select = {
					$type: "application/json; vnd-sage=syracuse",
					$url: [self._parent._data.endpoint.getBaseUrl(_), self.className(_)].join("/") + "?representation=" + self.className(_) /*self.representation(_)*/ + ".$select"
				};
			}
			// 
			return res;
		},
		getKeyAttributeNames: function(_) {
			var self = this;
			if (self.standardProfile(_)) {

			} else return self.entityKeyAttribute(_).toArray(_).map_(_, function(_, attr) {
				return attr.name(_);
			});
		},
		getExportedEntity: function(_) {
			var ep = this._parent.endpoint(_);
			var db = ep && ep.getOrm(_);
			return db && db.getEntity(_, this.className(_));
		},
		getStandardProfile: function(_) {
			if (this._stdExportProfile) return this._stdExportProfile;
			else {
				var ent = this.getExportedEntity(_);
				return helpers.object.clone(ent.$exportProfile, true);
			}
		}
	},
	$searchIndex: {
		$fields: ["title"]
	}
};