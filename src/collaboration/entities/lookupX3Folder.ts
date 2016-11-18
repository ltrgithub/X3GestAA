"use strict";

var ez = require("ez-streams");
var locale = require('streamline-locale');
var adminHelper = require("../../collaboration/helpers").AdminHelper;

exports.entity = {
	$isPersistent: false,
	$titleTemplate: "Folder",
	$descriptionTemplate: "Folder",
	$valueTemplate: "{name}",
	$properties: {
		name: {
			$title: "Name"
		},
		version: {
			$title: "Version"
		}
	},
	// standard functions
	$fetchInstances: function(_, context, parameters) {
		var self = this;

		var solution;
		if (parameters.x3solutionUuid) {
			var adminDb = adminHelper.getCollaborationOrm(_);
			var ent = adminDb.getEntity(_, "x3solution");


			solution = adminDb.fetchInstance(_, ent, parameters.x3solutionUuid);
			if (!solution) {
				throw new Error(locale.format(module, "solutionMustBeSaved"));
			}


		} else {
			// get the endpoint (working copy)
			var ep = context.httpSession[context.parameters.trackingId];
			if (!ep) throw new Error(locale.format(module, "endpointNotFound", context.parameters.trackingId));
			// get folders.json from solution web public rep.
			solution = ep.x3solution(_);
			if (!solution) return [];
		}

		var items = [];
		var folders = exports.getFoldersFromJson(_, solution);
		folders.forEach_(_, function(_, folder) {
			var item = self.factory.createInstance(_, null, context.db, context);
			item.name(_, folder.name);
			item.version(_, folder.version);
			//
			items.push(item);
		});
		//
		//			context.totalCount = folders.folders.length;
		//
		return items;
	},
	$defaultOrder: [
		["name", true]
	]
};

exports.getFoldersFromJson = function(_, solution, filterFn) {
	var baseUrl = solution.baseUrl(_);
	var solutionName = solution.solutionName(_);
	var url = baseUrl + "/" + ["Adonix_" + solutionName, "FOLDERS.json"].join("/");
	var options = {
		url: url,
		method: "GET"
	};
	var request = ez.devices.http.client(options);
	request.setTimeout(500);
	var resp = request.end().response(_);

	if (resp.statusCode >= 400) {
		var error;
		if (resp.statusCode === 404) {
			error = new Error(locale.format(module, "foldersNotFound", url));
		} else {
			error = new Error(resp.readAll(_));
		}
		error.statusCode = resp.statusCode;
		throw error;
	}
	var folders = [];
	try {
		folders = JSON.parse(resp.readAll(_)).folders;
		if (filterFn) folders = folders.filter(filterFn);
	} catch (e) {
		console.error(e.stack);
	}
	return folders;
};