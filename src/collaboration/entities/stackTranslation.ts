"use strict";
var locale = require('streamline-locale');
var patchcreate = require("syracuse-patch/lib/patchcreate");

exports.entity = {
	$titleTemplate: "Stack trace translation",
	$valueTemplate: "Stack trace translation",
	$summaryTemplate: "Stack trace translation",
	$descriptionTemplate: "Stack trace translation",
	$isPersistent: false,
	$canDelete: false,
	$canSave: false,

	$autoRecreateWorkingCopy: true,
	$properties: {
		sha1: {
			title: "GIT commit"
		},
		originalTrace: {
			title: "Original stack trace"
		},
		translatedTrace: {
			title: "Translated stack trace"
		}
	},
	$services: {
		translate: {
			$method: "POST",
			$isMethod: true,
			$title: "Translate",
			$execute: function(_, context, instance) {
				var translated = patchcreate.translateStackTrace(_, instance.sha1(_), instance.originalTrace(_));
				instance.translatedTrace(_, translated);
				return instance;
				console.log("End");
			}
		},
		err: {
			$method: "POST",
			$isMethod: true,
			$title: "Test error",
			$execute: function(_, context, instance) {
				throw new Error("Test");
			}
		}

	}
};