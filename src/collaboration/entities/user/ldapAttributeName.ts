"use strict";
var locale = require('streamline-locale');
var util = require('util');
var ldapEntity = require('./ldap');
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.entity = {
	$canCreate: false,
	$canDelete: false,
	$canEdit: false,
	$titleTemplate: "LDAP attribute",
	$valueTemplate: "{attrName}",
	$descriptionTemplate: "{attrName}",

	$properties: {
		attrName: {
			$title: "Name"
		}
	},

	$fetchInstances: function(_, context, parameters) {
		var self = this;
		var preliminary = [];
		if (!parameters.name) {
			throw new Error(locale.format(module, "NoLdapName"));
		}
		var db = context.db;
		var entity = db.model.getEntity(_, "ldap");
		// fetch user
		var whereClause = "(name eq \"" + parameters.name + "\")";
		var ldaps = db.fetchInstances(_, entity, {
			sdataWhere: whereClause
		});
		if (!ldaps || ldaps.length < 1) {
			throw new Error(locale.format(module, "NoLdapInst", parameters.name));
		}
		var attrs = ldapEntity.getLdapAttributes(ldaps[0], _);
		attrs.forEach_(_, function(_, key) {
			var instance = self.factory.createInstance(_, null, context.db, context);
			instance.attrName(_, key);
			preliminary.push(instance);
		});
		return preliminary;
	},
	$defaultOrder: [
		["attrName", true]
	]
};