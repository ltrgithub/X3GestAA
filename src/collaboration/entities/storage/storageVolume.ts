"use strict";

var Template = require('@sage/syracuse-core').resource.proxy.Template;
var fsp = require("path");
var globals = require('streamline-runtime').globals;
var helpers = require('@sage/syracuse-core').helpers;
var locale = require('streamline-locale');

var _pathSolverMap = {
	"file": function(_, volume, fileName) {
		var path = volume.path(_).replace(/\\/g, "/");
		var session = globals.context.session;
		var userLogin = (session && session.getUserLogin(_)) || "anonymous";
		path = (new Template(path)).resolve({
			syracuse: "../../../..",
			user: userLogin
		});
		if (!path) throw new Error("The path must contain variables {syracuse} and {user}");
		//
		return fsp.join(__dirname, path, fileName);
	},
	"db_file": function(_, volume, fileName) {
		return helpers.uuid.generate();
	}
};

var _browseLinkMap = {
	"file": {
		$title: "List of files",
		$url: "{$baseUrl}/storageVolumeItems?representation=storageVolumeItem.$query&volume={$uuid}",
		$target: "blank"
	},
	"db_file": {
		$title: "List of files",
		$url: "{$baseUrl}/documents?representation=document.$query&where=(volume eq \"{$uuid}\")",
		$target: "blank"
	}
};

exports.entity = {
	$titleTemplate: "Storage volume",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Storage-volumes-management",
	$allowFactory: true,
	$properties: {
		code: {
			$title: "Code"
		},
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,

			$isUnique: true,
			$linksToDetails: true
		},
		storageType: {
			$title: "Storage",
			$enum: [{
					$value: "db_file",
					$title: "Mongodb"
				},
				//			{
				//				$value: "file",
				//				$title: "File"
				//			}, 
			],
			$default: "db_file",
			$control: function(_, instance, val) {
				// can change this in create mode only
				if (!instance.$created) throw new Error(locale.format(module, "storageTypeChange", instance.code(_)));
			},
			$isDisabled: function(_, instance) {
				// can change this in create mode only
				return (instance.$created != true);
			}
		},
		path: {
			$title: "Path",
			$isDefined: function(_, instance) {
				return (instance.storageType(_) === "file");
			}
		},
		dynamic: {
			$title: "Dynamic",
			$type: "boolean",
			$description: "Automatic content update",
			$isDefined: function(_, instance) {
				return (instance.storageType(_) === "file");
			}
		}
	},
	$functions: {
		resolvePath: function(_, fileName) {
			return (_pathSolverMap[this.storageType(_)] && _pathSolverMap[this.storageType(_)](_, this, (fileName || ""))) || fileName;
		},
		mustStoreMeta: function(_) {
			return (this.storageType(_) === "db_file");
		},
		storeContentMeta: function(_, store) {
			// create a document
			var document = this._db.model.getEntity(_, "document").factory.createInstance(_, null, this._db);
			document.volume(_, this);
			document.description(_, store.getProperties(_).fileName);
			document.content(_).attach(_, store);
			document.save(_);
		},
		isCompatible: function(_, volume) {
			return (!volume || ((volume.storageType(_) === "db_file") && (this.storageType(_) === "db_file")));
		}
	},
	$links: {
		$browse: function(_, instance) {
			return _browseLinkMap[instance.storageType(_)] || {};
		}
	},
	$searchIndex: {
		$fields: ["code", "description", "storageType"]
	}
};