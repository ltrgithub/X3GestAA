"use strict";

var locale = require('streamline-locale');

var ez = require("ez-streams");
var httpClient = require('../../..//src/http-client/httpClient');

var locale = require('streamline-locale');
var config = require('config'); // must be first syracuse require

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Folder to update",
	$descriptionTemplate: "Folder to update",
	$helpPage: "Folder to update",
	$properties: {
		name: {
			$title: "Name",
			$isDisabled: true
		},
		parent: {
			$title: "Parent",
			$isDisabled: true
		},
		release: {
			$title: "Version",
			$isDisabled: true
		},
		history: {
			$title: "History",
			$type: "boolean",
			$isDisabled: true,
			$isHidden: true
		},
		updated: {
			$title: "Updated on",
			$type: "date",
			$isDisabled: true
		},
		patch: {
			$title: "Maintenance",
			$isDisabled: true
		},
		status: {
			$title: "Status",
			$isDisabled: true
		},
		detailedStatus: {
			$title: "Detailed status",
			$isDisabled: true
		},
		trace: {
			$title: "Trace",
			$type: "binary",
			$storage: "db_file",
			$allowUnsafeHtml: true
		},
		legislations: {
			$title: "Legislations",
			$isDisabled: true
		}
	},
	$relations: {},
	$functions: {},
	$services: {}
};