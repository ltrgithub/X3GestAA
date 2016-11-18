"use strict";

var locale = require('streamline-locale');
var importTool = require("syracuse-import/lib/jsonImport");
var adminHelper = require("../../../collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var zip = require('streamline-zip');

var _sourceMap = {
	"file": function(_, instance, options) {
		importTool.jsonImport(_, instance.endpoint(_).getOrm(_), instance.fileName(_), options);
	},
	"direct": function(_, instance, options) {
		importTool.jsonImportFromJson(_, null, instance.content(_), options);
	},
	"clientjson": function(_, instance, options) {
		var upload = instance.upload(_);
		if (!upload.fileExists(_)) {
			throw new Error(locale.format(module, "noContent"));
		} else {
			var content = upload.createReadableStream(_).readAll(_).toString("utf8");
			importTool.jsonImportFromJson(_, null, content, options);
		}
	},
	"clientzip": function(_, instance, options) {
		var upload = instance.upload(_);
		if (!upload.fileExists(_)) throw new Error(locale.format(module, "noContent"));
		var content = upload.createReadableStream(_).readAll(_);
		var counter = 0;
		var total = 1;
		var unzip = new zip.Unzip(
			content,
			function(filename, filecontent, headers, _) {
				options._filename = filename;
				options._lower = counter * 100 / total;
				options._step = 100 / total;
				counter++;
				try {
					importTool.jsonImportFromJson(_, null, filecontent.toString("utf8"), options);
				} catch (e) {
					options.$diagnoses.push({
						severity: "error",
						message: "" + e
					});
				}
			});
		// number of entries (only needed for progress information)
		total = unzip.list(_).length;
		if (!total) return;
		// process the files
		unzip.unzip(_);
	}
};

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Data import assistant",
	$descriptionTemplate: "Generic import interface. Choose a file name is based in \"import\" folder.",
	$helpPage: "Administration-reference_import-tool",
	$properties: {
		importSrc: {
			$title: "Source",
			$enum: [{
				$title: "Direct input",
				$value: "direct"
			}, {
				$title: "Server file",
				$value: "file"
			}, {
				$title: "Client JSON file",
				$value: "clientjson"
			}, {
				$title: "Client zip file",
				$value: "clientzip"
			}],
			$default: "direct"
		},
		fileName: {
			$title: "File name",
			$isHidden: function(_, instance) {
				return instance.importSrc(_) !== "file";
			}
		},
		upload: {
			$title: "Client file",
			$contentType: "application/octet-stream",
			$type: "binary",
			$storage: "db_file",
			$isHidden: function(_, instance) {
				return instance.importSrc(_).substr(0, 6) !== "client";
			}
		},
		content: {
			$title: "Content to import (JSON)",
			$type: "text/plain",
			$isHidden: function(_, instance) {
				return instance.importSrc(_) !== "direct";
			}
		},
		createSession: {
			$title: "Create import session",
			$type: "boolean"
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true,
			$lookupFilter: {
				protocol: "syracuse"
			}
		}
	},
	$init: function(_, instance) {
		instance.fileName(_, "syracuse-admin-init.json");
		// init to admin endpoint
		var ep = adminHelper.getEndpoint(_, {
			application: "syracuse",
			contract: "collaboration",
			dataset: "syracuse"
		});
		if (ep) instance.endpoint(_, ep);
	},
	$functions: {
		$setParameters: function(_, context) {
			if (!this.$uuid) {
				this.$uuid = this.$key = helpers.uuid.generate();
				this.$created = true;
			}
		},
		$save: function(_, saveRes) {
			importTool.jsonImport(_, this.endpoint(_).getOrm(_), this.fileName(_), {
				importMode: "update",
				$diagnoses: saveRes.$diagnoses,
				createSession: (this.endpoint(_) && this.endpoint(_).dataset(_) === "syracuse")
			});
		}
	},
	$services: {
		import: {
			$title: "Import",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$permanent: true,
			$capabilities: "abort",
			$execute: function(_, context, instance) {
				var t = context && context.tracker;
				var d = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				_sourceMap[instance.importSrc(_)](_, instance, {
					importMode: "update",
					$diagnoses: d,
					tracker: t,
					createSession: instance.createSession(_) && (instance.endpoint(_) && instance.endpoint(_).dataset(_) === "syracuse")
				});
			}
		},
		simplifyItems: {
			$isHidden: true,
			$method: "POST",
			$isMethod: false,
			$title: "Get simplified version of an item collection",
			$overridesReply: true,
			$execute: function(_, context, instance, parameters) {
				var input = JSON.parse(context.request.readAll(_));
				var items = importTool.simplifyItems(_, null, input);
				context.reply(_, 200, items);
			}
		}
	}
};