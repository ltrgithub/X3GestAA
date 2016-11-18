"use strict";

var locale = require('streamline-locale');
var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var globals = require('streamline-runtime').globals;
var util = require('util');
var scheduler = require("syracuse-event/lib/scheduler");

function _getProperties(_, instance) {
	var prop = instance.content(_);
	return (prop && prop.fileExists(_) && prop.getProperties(_)) || {};
}

exports.entity = {
	$titleTemplate: "Document",
	$valueTemplate: "{description}",
	$descriptionTemplate: "Storage area management",
	$helpPage: "Administration-reference_Documents",
	$properties: {
		expiration: {
			$title: "Expiration time (in millisecond)",
			$type: "datetime",
			$default: datetime.fromJsDate(new Date(0))
		},
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,
			$linksToDetails: true
		},
		documentType: {
			$title: "Document type",
			/*$compute: function(_, instance, propName) {
				return _getProperties(_, instance).contentType;
			},*/
			$isReadOnly: true
		},
		documentDate: {
			$title: "Upload date",
			$type: "date",
			/*$compute: function(_, instance, propName) {
				var upDate = _getProperties(_, instance).uploadDate;
				return upDate && date.fromJsDate(upDate);
			},*/
			$isReadOnly: true,
			$isNullable: true
		},
		fileName: {
			$title: "Filename",
			/*$compute: function(_, instance, propName) {
				return _getProperties(_, instance).fileName;
			},*/
			$isReadOnly: true
		},
		uri: {
			$title: "Uri",
			$isExcluded: true,
			$isDisabled: function(_, instance) {
				return (instance.content(_) && instance.content(_).fileExists(_));
			},
			$isDefined: function(_, instance) {
				return instance.volume(_) && (instance.volume(_).storageType(_) !== "db_file");
			}
		},
		isReadOnly: {
			$title: "Read only",
			$type: "boolean",
			$default: false
		},
		content: {
			$title: "Content",
			$type: "binary",
			$isDisabled: function(_, instance) {
				return !instance.volume(_);
			},
			$storage: function(_, instance) {
				return ((instance.volume(_) && instance.volume(_).storageType(_)) || "db_file");
			},
			$propagate: function(_, instance, val) {
				if (!instance.description(_) && val && val.fileName) instance.description(_, val.fileName);
				instance.documentType(_, val.contentType);
				instance.documentDate(_, date.today());
				instance.fileName(_, val.fileName);
			}
		},
		/* Properties to link a document to an X3 resource */
		className: {
			$title: "Class",
			$type: "string",
			$isDisabled: function(_, instance) {
				return true;
			}
		},
		x3Keys: {
			$title: "Keys",
			$isDisabled: function(_, instance) {
				return true;
			}
		},
		representationName: {
			$title: "Representation",
			$type: "string",
			$isDisabled: function(_, instance) {
				return true;
			}
		}
	},
	$relations: {
		volume: {
			$title: "Storage volume",
			$type: "storageVolume",
			$isMandatory: true,
			$control: function(_, instance, val) {
				// update script twick
				if (instance._inUpdateScript) return;
				// check if there is a document
				if ((instance.volume(_) && !instance.volume(_).isCompatible(_, instance.$snapshot && instance.$snapshot.volume(_))) || !instance.volume(_))
					if (instance.content(_) && instance.content(_).fileExists(_)) throw new Error(locale.format(module, "storageTypeChange"));
			},
			$propagate: function(_, instance, val) {
					// reset property store to allow creating the appropriate type
					instance._propertyStores["content"] = null;
				}
				/*,
				$isDisabled: function(_, instance) {
					// for error management, disable only if there is one
					return (instance.volume(_) && instance.content(_) && instance.content(_).fileExists(_));
				}*/
		},
		teams: {
			$title: "Teams",
			$type: "teams",
			$inv: "documents",
			$nullOnDelete: true
				/*,
				$isComputed: true*/
		},
		owner: {
			$title: "Owner",
			$type: "user",
			$isMandatory: true
		},
		tags: {
			$title: "Tags",
			$type: "documentTags",
			$inv: "documents"
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: false,
			$isDisabled: function(_, instance) {
				return true;
			}
		}
	},
	$init: function(_, instance) {
		var up = globals.context && globals.context.session && globals.context.session.getUserProfile(_);
		up && instance.owner(_, up.user(_));
		var params = (((globals.context && globals.context.request && globals.context.request.context) || {}).parameters || {});
		if (params.volumeCode) {
			var v = instance._db.fetchInstance(_, instance._db.getEntity(_, "storageVolume"), {
				jsonWhere: {
					code: params.volumeCode
				}
			});
			v && instance.volume(_, v);
		}

		var x3linkProps = ["className", "x3Keys", "representationName"];
		x3linkProps.forEach_(_, function(_, x3Prop) {
			if (params && params[x3Prop]) {
				instance[x3Prop](_, params[x3Prop]);
			}
		});

		if (params.officeEndpoint) {
			var ep = instance._db.fetchInstance(_, instance._db.getEntity(_, "endPoint"), {
				jsonWhere: {
					dataset: params.officeEndpoint
				}
			});
			ep && instance.endpoint(_, ep);
		}
	},
	$searchIndex: {
		$fields: ["description", "documentType", "documentDate", "fileName", "volume", "teams", "owner", "tags"]
	},
	$functions: {
		schedule: function(_) {
			if (new Date(this.expiration(_)._value).getTime() > 0) //
				return scheduler.schedule(_, this, this.$uuid, new Date(this.expiration(_)._value).getTime(), {}, "db");
		},
		fire: function(_, key, parameters) { // call by scheduler when a print document must be purge automatically

			this.deleteSelf(_);
		}
	},
};