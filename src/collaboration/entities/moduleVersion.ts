"use strict";

exports.entity = {
	$isPersistent: false,
	$properties: {
		code: {
			$title: "Module code"
		},
		version: {
			$title: "Module version"
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			this.code(_, id);
			switch (id) {
				case "excelAddin":
					this.version(_, "0.1.0.1");
					break;
				case "officeAddin":
					this.version(_, "1.12.0005");
					break;
				default:
					this.version(_, "undefined");
			}
		}
	}
};