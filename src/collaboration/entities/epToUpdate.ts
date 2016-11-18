"use strict";

var locale = require('streamline-locale');
var date = require('@sage/syracuse-core').types.date;

var ez = require("ez-streams");
var httpClient = require('../../..//src/http-client/httpClient');

var locale = require('streamline-locale');
var config = require('config'); // must be first syracuse require

function listFolders(_, instance, folders, parent, history) {
	if (!folders) return;

	var list = instance.folders(_);
	folders.forEach_(_, function(_, folder) {
		var item = list.add(_);
		item.parent(_, parent || "");
		item.name(_, folder.name);
		item.release(_, folder.release);
		item.history(_, history || false);
		var folderDate = (folder.dat === "00/00/0000") ? "01/01/1970" : folder.dat;
		item.updated(_, date.parse(folderDate, "dd/MM/yyyy"));
		item.patch(_, folder.nump);
		item.legislations(_, folder.legislations || "");
		listFolders(_, instance, folder.folders, folder.name);
		//if (folder.history) listFolders(_, instance, [folder.history], folder.name, true);
	});
}

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Patches",
	$descriptionTemplate: "Patches",
	$helpPage: "Patches",
	$properties: {},
	$relations: {
		endpoint: {
			$type: "endPoint",
			$title: "Endpoint",
			$isMandatory: true,
			$displayLength: 15,
			$propagate: function(_, instance, ep) {
				var foldersTree = ep.getService(_, "foldersTree");

				// Reset the list of folders
				instance.folders(_).reset(_);

				if (foldersTree && foldersTree.name) {
					listFolders(_, instance, [foldersTree]);
				}
			},
		},
		folders: {
			$type: "folderToUpdates",
			$title: "Folders to update",
			$isMandatory: false,
			$inv: "epToUpdate",
			$isChild: true,
			$capabilities: "delete",
			$isPlural: true,
			$treeview: {
				$mode: "parentKey",
				$bindings: {
					$id: "name",
					$parent: "parent"
				}
			}
		}
	},
	$functions: {},
	$services: {}
};