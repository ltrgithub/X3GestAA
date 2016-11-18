"use strict";

exports.tracer = null;
var debug = true;

var _scripts = [];

_scripts[1] = function(_, db) {
	var hrmMenuPrefix = 'STD_X3_HRM_';
	var hrmMenuRegex = /^STD_X3_HRM_/;

	function findHRMApplications(_, db) {
		return db.db.collection("Application", _).find({
			application: 'x3',
			contract: 'hrm'
		}, {
			_id: 1
		}).toArray(_);
	}

	// Find all menu items that have an HRM application that do
	// not already start with the STD_X3_HRM_ prefix sorting by
	// fusion function or representation to help with fixing any
	// duplicates
	function findMenuItemsToUpdate(_, coll, hrmAppid, menuItemType, sortOrder) {
		var itemsFound = coll.find({
			application: {
				_uuid: hrmAppid,
			},
			linkType: menuItemType
		}).sort(sortOrder).toArray(_);

		exports.tracer && exports.tracer("Found " + itemsFound.length + " MenuItems");
		return itemsFound;
	}

	// Find all MenuModule and MenuBlock that have an HRM application that do
	// not already start with the STD_X3_HRM_ prefix. Code must be unique so
	// we don't have to worry about duplicates.
	function findRowsToUpdate(_, coll, hrmAppid) {
		return coll.find({
			application: {
				_uuid: hrmAppid
			}
		}).toArray(_).filter(function(it) {
			return (it.code || "").slice(0, 11) !== hrmMenuPrefix;
		});
	}

	// Generic function to update the collection (MenuItem, MenuModule, MenuSubmodule)
	// with the new code, adding a suffix if required
	function updateCollection(_, coll, id, menuCode) {
		coll.update({
			_id: id
		}, {
			$set: {
				code: menuCode,
				_updDate: new Date()
			}
		}, {
			safe: true,
			multi: true
		}, _);
	}

	// Updates to menu item require the following rules to be applied
	// function - STD_X3_HRM_ + fusionFunction
	// representation - STD_X3_HRM_ + representation
	// The sort is applied to allow us to identify duplicates and add a suffix
	function updateMenuItem(_, coll, hrmAppid, menuItemType, sortOrder) {
		var suffix = 0;

		var menuItems = findMenuItemsToUpdate(_, coll, hrmAppid, menuItemType, sortOrder);
		menuItems && menuItems.reduce_(_, function(_, previous, current) {
			var menuCode;
			if (previous) {
				var prevCode;
				var newCode;
				if (current.linkType === '$function') {
					prevCode = previous.fusionFunction;
					newCode = current.fusionFunction;
				} else {
					prevCode = previous.representation;
					newCode = current.representation;
				}
				if (prevCode === newCode) {
					suffix = suffix + 1;
					menuCode = newCode + '_' + suffix;
					exports.tracer && exports.tracer('Current Code: ' + newCode + ' New Code: ' + menuCode);
				} else {
					suffix = 0;
					menuCode = newCode;
				}
			} else {
				suffix = 0;
				if (current.linkType === '$function') {
					menuCode = current.fusionFunction;
				} else {
					menuCode = current.representation;
				}
			}
			updateCollection(_, coll, current._id, hrmMenuPrefix + menuCode);
			return current;
		});
	}

	// Updates to MenuModule and MenuBlock require that any menu code linked
	// to an HRM application must start with STD_X3_HRM_
	function updateMenuOther(_, coll, hrmAppid) {
		findRowsToUpdate(_, coll, hrmAppid).forEach_(_, function(_, mod) {
			updateCollection(_, coll, mod._id, hrmMenuPrefix + mod.code);
		});
	}

	exports.tracer && exports.tracer("Executing update script to version: 1; rename HRM menu entries");

	// We only want to update menu items, modules and submodules that are
	// attached to HRM applications
	findHRMApplications(_, db).forEach_(_, function(_, hrmAp) {
		// Menu items are updated in two passes, one for fusion functions, the other for representations.
		var sortOrder = {
			fusionFunction: 1
		};
		updateMenuItem(_, db.db.collection("MenuItem", _), hrmAp._id, '$function', sortOrder);
		sortOrder = {
			representation: 1
		};
		updateMenuItem(_, db.db.collection("MenuItem", _), hrmAp._id, '$representation', sortOrder);

		updateMenuOther(_, db.db.collection("MenuModule", _), hrmAp._id);
		updateMenuOther(_, db.db.collection("MenuBlock", _), hrmAp._id);
	});

	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

// Boilerplate function/metadata below

exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.log;
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "a9ba458957fe", // this id MUST never change and MUST be unique over all update scripts
	description: "7 patch 7 branch update script" // !important, some description, optional and can change
};