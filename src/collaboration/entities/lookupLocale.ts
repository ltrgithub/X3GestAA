"use strict";

var fs = require('streamline-fs');
var fsp = require('path');
var localeHelpers = require('@sage/syracuse-core').localeHelpers;

exports.entity = {
	$properties: {
		name: {
			$title: "Name"
		},
		englishName: {
			$title: "English name"
		},
		nativeName: {
			$title: "Native name"
		}
	},
	$fetchInstances: function(_, context, parameters) {
		// TODO: filters
		var self = this;
		var locales = localeHelpers.loadAllLocales(_);
		return locales.map_(_, function(_, localeParams) {
			var instance = self.factory.createInstance(_, null, context.db, context);
			instance.name(_, localeParams.name);
			instance.englishName(_, localeParams.englishName);
			instance.nativeName(_, localeParams.nativeName);
			return instance;
		});
	},
	$defaultOrder: [
		["name", true]
	]
};