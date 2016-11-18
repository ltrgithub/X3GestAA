"use strict";

var sys = require("util");

exports.entity = {
	$titleTemplate: "File upload utility",
	$isPersistent: false,
	$canSave: false,
	$properties: {
		fileName: {
			$title: "File name",
			$isDisabled: true,
			$propagate: function(_, instance, val) {
				var volume = instance.volume(_);
				var fileName = val;
				instance.content(_).init(_, volume ? volume.resolvePath(_, fileName) : "");
			}
		},
		contentType: {
			$title: "Content type",
			$isDisabled: true
		},
		content: {
			$title: "Content",
			$type: "binary",
			$storage: function(_, instance) {
				return ((instance.volume(_) && instance.volume(_).getStoreType(_)) || "db_file");
			},
			$propagate: function(_, instance, val) {
				if (val) {
					if (!instance.fileName(_)) instance.fileName(_, val.fileName);
					instance.contentType(_, val.contentType);
				}
			},
			$isDisabled: function(_, instance) {
				return !instance.volume(_);
			},
			$uploadDone: function(_, instance) {
				if (instance.volume(_) && instance.volume(_).mustStoreMeta(_)) instance.volume(_).storeContentMeta(_, instance.content(_));
			}
		}
	},
	$relations: {
		volume: {
			$title: "Volume",
			$type: "storageVolumeQuery",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				var volume = val;
				//console.log("volume (50): " + sys.inspect(val));
				var fileName = instance.fileName(_);
				instance.content(_).init(_, volume ? volume.resolvePath(_, fileName) : "");
			}
		}
	}
};