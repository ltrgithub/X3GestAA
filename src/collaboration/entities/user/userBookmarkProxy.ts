"use strict";
var locale = require('streamline-locale');

exports.entity = {
	$isPersistent: false,
	$properties: {
		content: {
			$title: "Content",
			$type: "json"
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			var self = this;
			// id is a user's $uuid
			var db = self._db;
			var userEnt = db.getEntity(_, "user");
			var user = db.fetchInstance(_, userEnt, id);
			if (!user) throw new Error(locale.format(module, "userNotFound", id));
			self._user = user;
			//
			if (user.bookmarks(_)) self.content(_, JSON.parse(user.bookmarks(_).content(_) || "{}"));
			else self.content(_, {});
		},
		$save: function(_, saveRes) {
			var self = this;
			// id is a user's $uuid
			var user = self._user;
			if (!user) throw new Error(locale.format(module, "userNotFound", user.login(_)));
			//
			var bk = user.bookmarks(_);
			if (!bk) {
				bk = user.createChild(_, "bookmarks");
				user.bookmarks(_, bk);
				var res = user.save(_, null, {
					shallowSerialize: true,
					ignoreRestrictions: true
				});
				saveRes.$diagnoses = saveRes.$diagnoses || [];
				user.getAllDiagnoses(_, saveRes.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
			}
			bk.content(_, JSON.stringify(self.content(_) || {}));
			var res = bk.save(_, null, {
				shallowSerialize: true
			});
			saveRes.$diagnoses = saveRes.$diagnoses || [];
			bk.getAllDiagnoses(_, saveRes.$diagnoses, {
				addEntityName: true,
				addPropName: true
			});
		}
	}
};