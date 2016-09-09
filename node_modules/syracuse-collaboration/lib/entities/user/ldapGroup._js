"use strict";
var locale = require('streamline-locale');
var util = require('util');
var ldapEntity = require('./ldap');
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.entity = {
	$canCreate: false,
	$canDelete: false,
	$canEdit: false,
	$titleTemplate: "LDAP group",
	$valueTemplate: "{name}",
	$descriptionTemplate: "{name}",

	$properties: {
		name: {
			$title: "LDAP group"
		}
	},
	$relations: {
		ldap: {
			$title: "LDAP server",
			$type: "ldap",
			$isComputed: true
		},
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		var preliminary = [];

		var db = context.db;
		var entity = db.model.getEntity(_, "ldap");

		var ldaps = db.fetchInstances(_, entity, {
			jsonWhere: {
				active: true
			}
		});
		if (!ldaps || ldaps.length < 1) {
			throw new Error(locale.format(module, "NoLdapInst", parameters.name));
		}

		ldaps.forEach_(_, function(_, ldap) {
			var groups = ldap.getAllGroups(_);
			for (var i in groups) {
				var instance = self.factory.createInstance(_, null, context.db, context);
				instance.name(_, groups[i][ldap.groupNameMapping(_)].toString("utf8"));
				instance.ldap(_, ldap);
				preliminary.push(instance);
			}

		});

		return preliminary;
	},
	$defaultOrder: [
		["name", true]
	]
};