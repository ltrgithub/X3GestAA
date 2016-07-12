"use strict";

var jsurl = require("jsurl");
var locale = require('streamline-locale');

exports.entity = {
	$titleTemplate: "Select export target",
	$valueTemplate: "",
	$isPersistent: false,
	$canSave: false,
	$capabilities: "",
	$properties: {
		targetType: {
			$title: "Target type",
			$enum: function(_, instance) {
				return (instance._targetTypes || ["download", "file", "db_file", "server"]).map(function(t) {
					return {
						$value: t,
						$title: locale.format(module, "target_" + t)
					};
				});
			},
			$default: "download"
		},
		beautify: {
			$title: "Beautify output",
			$type: "boolean"
		},
		path: {
			$title: "File name",
			$description: "The file will be stored on the server's import folder",
			$isHidden: function(_, instance) {
				return (instance.targetType(_) !== "file");
			},
			$isMandatory: function(_, instance) {
				return (instance.targetType(_) === "file");
			}
		},
		storageDescription: {
			$title: "Description",
			$isHidden: function(_, instance) {
				return instance.targetType(_) !== "db_file";
			},
			$isMandatory: function(_, instance) {
				return instance.targetType(_) === "db_file";
			}
		},
		parameters: {
			$title: "Parameters",
			$isHidden: true,
			$compute: function(_, instance) {
				return jsurl.stringify(instance.toJson(_));
			}
		},
		linkType: {
			$title: "Link type",
			$isHidden: true,
			$compute: function(_, instance) {
				switch (instance.targetType(_)) {
					case "download":
						return "application/x-export";
					case "file":
					case "db_file":
					case "server":
						return "application/json";
				}
			}
		}
	},
	$relations: {
		storageVolume: {
			$title: "Volume",
			$type: "storageVolume",
			$isHidden: function(_, instance) {
				return instance.targetType(_) !== "db_file";
			},
			$isMandatory: function(_, instance) {
				return instance.targetType(_) === "db_file";
			}
		},
		friendServer: {
			$title: "Server",
			$type: "friendServer",
			$isHidden: function(_, instance) {
				return instance.targetType(_) !== "server";
			},
			$isMandatory: function(_, instance) {
				return instance.targetType(_) === "server";
			}
		}
	},
	$functions: {
		toJson: function(_) {
			var instance = this;
			return {
				targetType: instance.targetType(_),
				path: instance.path(_),
				storageDescription: instance.storageDescription(_),
				storageVolume: {
					$uuid: (instance.storageVolume(_) && instance.storageVolume(_).$uuid)
				},
				friendServer: {
					$uuid: (instance.friendServer(_) && instance.friendServer(_).$uuid)
				},
				beautify: instance.beautify(_)
			};
		}
	},
	$init: function(_, instance, context) {
		if (context && context.parameters && context.parameters.targetTypes) //
			instance._targetTypes = context.parameters.targetTypes.split(",");
		else instance._targetTypes = ["download", "file", "db_file", "server"];
	}
};