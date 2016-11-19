"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "importTool",
	$facets: {
		$edit: {
			$prototype: {
				$links: {
					$query: {
						$isHidden: true
					},
					$print: {
						$isHidden: true
					}
				}
			}
		}
	}
};