"use strict";
var upath = require('path');
var util = require('util');
var _mgr = require('syracuse-x3/lib/convergence/records/recordMgr').recordMgr;

// This entity is not persistent 
// Data are provided on demand by recordMgr.cvgRecordsGet
exports.entity = {
	$lockType: "noLock",
	$canDelete: true,
	$canCreate: false,
	$canEdit: false,
	$capabilities: "",
	$isPersistent: false,
	$titleTemplate: "Classic client records entities",
	$descriptionTemplate: " ",
	$valueTemplate: " ",
	$properties: {
		fileName: {
			$title: "fileName",
			$linksToDetails: true,
		},
		x3func: {
			$title: "X3Func",
			$displayLength: 5
		},
		x3solution: {
			$title: "x3Solution",
			$displayLength: 7
		},
		x3folder: {
			$title: "x3Folder",
			$displayLength: 7
		},
		x3host: {
			$title: "x3Host",
			$displayLength: 8
		},
		x3port: {
			$title: "x3Port",
			$displayLength: 3
		},
		x3user: {
			$title: "x3User",
			$displayLength: 6
		},
		x3lang: {
			$title: "x3Lang",
			$displayLength: 3
		},
		size: {
			$title: "size",
			$displayLength: 8
		},
		creationDate: {
			$title: "creationdate",
			$type: "datetime",
			$displayLength: 9
		},
		lastModifDate: {
			$title: "lastModification",
			$type: "datetime",
			$displayLength: 9
		},
		content: {
			$title: "",
			$type: "text/rtf",
			$capabilities: "raw"
		}
	},
	$functions: {
		// Its works by overriding parent method
		deleteSelf: function(_) {
			try {
				_mgr.cvgRecordDelete(_, this.fileName(_));
				return true;
			} catch (e) {
				this.deleteError = e.message;
				this.$addError(e.message);
				console.log("cvgRecord.deleteSelf error - $key:" + this.$key + "; message: " + e.message + "\n" + e.stack);
				return false;
			}
		},
		$setId: function(_, context, id) {
			// true -> read content
			// $setId is called for $detail facet -> we  display file content only in detail view
			var record = _mgr.cvgRecordGet(_, id, true);
			if (record == null) throw new Error("Record file [" + id + "] not found or can't read file");
			// fulfill instance
			for (var p in record) {
				this[p](_, record[p]);
			}
		}
	},
	$services: {
		play: {
			$method: "GET",
			$confirm: "You are going to launch record's player.\n\nDo you confirm this operation ?",
			$isMethod: true,
			$title: "Play record",
			$execute: function(_, context) {
				try {
					var inst = context.instance;
					if (inst) {
						var fileName = inst.fileName(_);
						_mgr.cvgRecordPlay(_, fileName, context);
					} else throw new Error("Instance not found in context");
					return {
						$diagnoses: [{
							severity: "info",
							message: "Record '" + fileName + "' has been played successfully"
						}]
					};
				} catch (e) {
					if (typeof e != "object") e = new Error(e);
					return {
						$diagnoses: [{
							severity: "error",
							message: e.message,
							detail: e.safeStack
						}]
					};
				}
			}
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var result = [],
			self = this;
		try {
			var entity = context.db.model.getEntity(_, "cvgRecord");
			var records = _mgr.cvgRecordsGet(_);
			console.log("cvgRecord.cvgRecordsGet ");
			records.forEach_(_, function(_, record) {
				var inst = entity.factory.createInstance(_, null, context.db);
				for (var p in record) {
					if (inst[p]) {
						// Remove .js in fileName for display only
						inst[p](_, p == 'fileName' ? upath.basename(record[p], '.js') : record[p]);
					}

				}
				inst.$uuid = record.fileName;
				inst.$key = record.fileName;
				result.push(inst);
			});
		} catch (e) {
			console.log("$fetchInstances - ERROR - " + e.stack);
			throw e;
		}
		return result;
	},
	$defaultOrder: [
		["fileName", true]
	]
};