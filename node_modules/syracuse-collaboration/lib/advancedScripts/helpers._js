"use strict";

exports.loadMenusMap = function(_, db, factoryFilter, filter) {
	var map = {};
	db.fetchInstances(_, db.getEntity(_, "menuItem"), {
		sdataWhere: (filter ? "(" + filter + ") and (" + factoryFilter + ")" : factoryFilter),
		rawResults: "unescaped"
	}).forEach(function(dd) {
		map[dd._id] = dd;
	});
	return map;
};

exports.loadBlocksMap = function(_, db, factoryFilter, filter) {
	var map = {};
	db.fetchInstances(_, db.getEntity(_, "menuBlock"), {
		sdataWhere: (filter ? "(" + filter + ") and (" + factoryFilter + ")" : factoryFilter),
		rawResults: "unescaped"
	}).forEach(function(dd) {
		map[dd._id] = dd;
	});
	return map;
};

exports.loadModulesMap = function(_, db, factoryFilter, filter) {
	var map = {};
	db.fetchInstances(_, db.getEntity(_, "menuModule"), {
		sdataWhere: (filter ? "(" + filter + ") and (" + factoryFilter + ")" : factoryFilter),
		rawResults: "unescaped"
	}).forEach(function(dd) {
		map[dd._id] = dd;
	});
	return map;
};

exports.loadNavPages = function(_, db, factoryFilter, filter) {
	return db.fetchInstances(_, db.getEntity(_, "navigationPage"), {
		sdataWhere: (filter ? "(" + filter + ") and (" + factoryFilter + ")" : factoryFilter),
		rawResults: "unescaped"
	});
};