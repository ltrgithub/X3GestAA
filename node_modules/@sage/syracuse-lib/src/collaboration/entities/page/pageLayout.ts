"use strict";

exports.entity = {
	$properties: {
		code: {
			$title: "Code",
			$isHidden: true,
			defaultValue: function(_, instance) {
				return instance.$uuid;
			}
		},
		content: {
			$title: "Content"
		},
		localization: {
			$title: "Localization"
		},
		pageContext: {
			$title: "Page context"
		}
	},
	$relations: {
		binding: {
			$title: "Binding",
			$variants: {
				user: {
					$type: "user"
				}
			}
		},
		page: {
			$title: "Page",
			$variants: {
				landingPage: {
					$type: "landingPage"
				},
				pageVariant: {
					$type: "pageVariant"
				}
			}
		}
	},
	$functions: {
		$onExportResource: function(_, key, resource, localizations) {
			if (!key || !localizations) return;
			//
			var self = this;
			var loc = JSON.parse(self.localization(_) || "{}");
			Object.keys(loc).forEach(function(lg) {
                var lang = lg.toLowerCase();
				var locLg = localizations[lang] = localizations[lang] || {};
				Object.keys(loc[lg]).forEach(function(kk) {
					locLg["pageLayout." + key + "." + kk] = loc[lg][kk];
				});
			});
		},
		$onImportResource: function(_, resource, proto, localization) {
			function _setLocalization(lang, importKey, value) {
				var key = importKey.substring(prefix.length);
				instLoc[lang] = instLoc[lang] || {};
				instLoc[lang][key] = value;
			}
			if (!resource || !proto || !localization) return;
			var self = this;
			//
			var keys = Array.isArray(proto.$key) ? proto.$key : [proto.$key];
			var key = keys.map(function(kk) {
				return resource[kk];
			}).join(".");
			var instLoc = JSON.parse(self.localization(_) || "{}");
			var prefix = "pageLayout." + key + ".";
			Object.keys(localization).forEach(function(lang) {
				Object.keys(localization[lang]).forEach(function(kk) {
					if (kk.indexOf(prefix) === 0) _setLocalization(lang, kk, localization[lang][kk]);
				});
			});
			if (Object.keys(instLoc).length) self.localization(_, JSON.stringify(instLoc));
		}
	}
};