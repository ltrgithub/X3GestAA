"use strict";


exports.entity = {
	$properties: {
		path: {
			$title: "path of css file",
		}
	},
	$isPersistent: false,
	$titleTemplate: "ccsFile",
	$descriptionTemplate: "css file description for customized theme",
	$valueTemplate: "{path}",
	$relations: {},
	$events: {},
	$searchIndex: {
		$fields: ["path"]
	}
};