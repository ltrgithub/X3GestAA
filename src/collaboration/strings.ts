"use strict";

var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var helpers = require('@sage/syracuse-core').helpers;


var cache = {};

exports.mods = [];

exports.extendResources = function(mod) {
	exports.mods.push(mod);
	// clear cache
	cache = {};
};

exports.resources = function() {
	var loc = globals.context && globals.context.sessionLocale || locale.current;
	if (loc in cache) return cache[loc];
	var res = locale.resources(module, loc)();
	exports.mods.forEach(function(m) {
		helpers.object.merge(locale.resources(m, globals.context && globals.context.sessionLocale)(), res);
	});
	return (cache[loc] = res);
};