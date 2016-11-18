"use strict";

var factory = require("../../../..//src/orm/factory");
var helpers = require('@sage/syracuse-core').helpers;

function _computeDelta(oldContent, newContent) {
	var result = {};
	// most probably added content
	for (var key in newContent) {
		var value = newContent[key];
		var oldValue = oldContent && oldContent[key];
		if (Array.isArray(value)) {
			if (!oldValue || (oldValue && value.some(function(item, index) {
					return item !== oldValue[index];
				}))) result[key] = value;
		} else if (typeof value === "object") {
			var diff = _computeDelta(oldValue, value);
			if (diff && diff.keys) result[key] = diff;
		} else if (value !== oldValue) result[key] = value;
	}
	// look for deleted content
	if (oldContent)
		for (var key in oldContent) {
			value = oldContent[key];
			if (!newContent.hasOwnProperty(key)) result[key] = {
				$isDeleted: true
			};
		}
	return result;
}

function _applyDelta(content, delta) {
	for (var key in delta) {
		var value = delta[key];
		if (typeof value === "object") {
			if (value.$isDeleted) delete content[key];
			else _applyDelta(content[key], value);
		} else content[key] = value;
	}
}

exports.entity = {
	$properties: {
		version: {
			$title: "Version",
			$isMandatory: true,
			$type: "integer"
		},
		content: {
			$type: "json"
		},
		contentType: {
			$enum: [{
				$value: "Differential",
				$title: "Differential"
			}, {
				$value: "FullContent",
				$title: "Full content"
			}],
			$isMandatory: true,
			$default: "Differential"
		}
	},
	$titleTemplate: "Page content history",
	$descriptionTemplate: "Page content version control",
	$valueTemplate: "{version} {contentType}",
	$relations: {
		pageData: {
			$title: "Page data",
			$type: "pageData",
			$inv: "history"
		},
		historyItems: {
			$title: "History items",
			$type: "pageDataHistoryItems",
			$inv: "pageHistory",
			isChild: true,
			defaultOrder: [
				["version", true]
			]
		}
	},
	$functions: {
		addVersion: function(_, oldValue, value) {
			var histItem = this.createChild(_, "historyItems");
			histItem.content(_, _computeDelta(oldValue, value));
			histItem.version(_, this.historyItems(_).getLength() + 1);
			this.historyItems(_).set(_, histItem);
		},
		getVersionContent: function(_, versionNum) {
			// merge
			var content = this.content(_);
			this.historyItems(_).toArray(_).filter_(_, function(_, item) {
				return item.version(_) <= versionNum;
			}).sort_(_, function(_, a, b) {
				return a.version(_) - b.version(_);
			}).forEach_(_, function(_, version) {
				_applyDelta(content, version.content(_));
			});
			//
			return content;
		}
	},
	$facets: {
		$thumb: ["version", "contentType"]
	},
	$defaultOrder: [
		["version", true]
	]
};