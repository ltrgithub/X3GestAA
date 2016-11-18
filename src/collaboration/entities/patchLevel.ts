"use strict";

var Template = require('@sage/syracuse-core').resource.proxy.Template;
var helpers = require('@sage/syracuse-core').helpers;
var util = require('util');
var patchtools = require("syracuse-patch/lib/patchtools");
var patchcreate = require("syracuse-patch/lib/patchcreate");

exports.entity = {
	$titleTemplate: "Patch levels",
	$valueTemplate: "{relNumber}-{patchNumber}",
	$descriptionTemplate: "Version {relNumber}-{patchNumber}",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,
	$listTitle: "List of versions on roll-out repository",
	$key: "{rollout}",
	$properties: {
		type: {
			$title: "Type",
			$compute: function(_, instance) {
				return instance.patchNumber(_) > 0 ? "Level" : "Branch";
			}
		},
		relNumber: {
			$title: "Branch number",
			$computeSortValue: helpers.relNumberCmp
		},
		patchNumber: {
			$title: "Level",
			$type: "integer"
		},
		comment: {
			$title: "Comment"
		},
		date: {
			$title: "Date"
		},
		rollout: {
			$title: "Roll-out Checksum",
		},
		source: {
			$title: "Source checksum"
		},
		branchings: {
			$title: "Branchings"
		}
	},
	$relations: {},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		var config = require('config');
		var patches = patchcreate.allPatches(config.patch, _);
		var result = [];
		var entity = context.db.model.getEntity(_, "patchLevel");
		var i = patches.length;
		while (--i >= 0) {
			var patch = patches[i];
			var inst = entity.factory.createInstance(_, null, context.db);
			inst.relNumber(_, patch.relNumber);
			inst.patchNumber(_, patch.patchNumber);
			inst.comment(_, patch.comment);
			inst.rollout(_, patch.rollout);
			inst.source(_, patch.source);
			inst.date(_, patch.date);
			inst.branchings(_, patch.branchings || "");
			result.push(inst);
		}
		return result;
	},
	$functions: {
		$setId: function(_, context, id) {
			var config = require('config');
			var patch = patchcreate.commitDataFromHash(id || "HEAD", config.patch, _);
			this.rollout(_, patch.rollout);
			this.relNumber(_, patch.relNumber);
			this.patchNumber(_, patch.patchNumber);
			//
		}
	},
	$links: {}
	// ,
	// $defaultOrder: [["relNumber", true], ["patchNumber", true]]
};