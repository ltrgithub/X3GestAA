"use strict";

var adminHelper = require("../../../../collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var parser = require('@sage/syracuse-sdata-parser');


function _applyProxyMap(where, proxyMap) {
	switch (where.type) {
		case "identifier":
			where.value = proxyMap[where.value] || where.value;
			break;
		default:
			(where.children || []).forEach(function(c) {
				_applyProxyMap(c, proxyMap);
			});
	}
}

function _fixParameters(params) {
	var p = helpers.object.clone(params, true);
	p.where && _applyProxyMap(p.where, {
		login: "LOGIN",
		description: "INTUSR"
	});
	return p;
}

var _listSolverMap = function(_, ep, ent, context, parameters) {
	var db = context.db;
	//
	var expr = parameters && parser.jsonToSdata(JSON.stringify(parameters));
	if (expr) context.parameters.where = parser.parse(expr);
	//
	var params = _fixParameters(context.parameters);
	var ep_db = ep.getOrm(_);
	//
	var repr = ep_db.fetchInstances(_, ep_db.getEntity(_, "AUTILIS", "$query"), params);
	return repr.map_(_, function(_, r) {
		var instance = ent.factory.createInstance(_, null, db);
		instance.login(_, r.LOGIN(_));
		//instance.description(_, r.INTUSR(_));
		return instance;
	});
};

var _itemSolverMap = function(_, ep, inst, key) {
	var db = ep.getOrm(_);
	//
	var r = db.fetchInstance(_, db.getEntity(_, "AUTILIS", "$query"), {
		sdataWhere: "LOGIN eq \"" + key + "\""
	});
	if (r) {
		console.log("setId is working.");
		inst.login(_, r.LOGIN(_));
		//inst.description(_, r.INTUSR(_));
	}
};

exports.entity = {
	$titleTemplate: "User",
	$valueTemplate: "{login}",
	$valueTitleTemplate: "{title}",
	$listTitle: "Users",
	$key: "{login}",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$keyPager: true,
	$isProxyClass: true,
	$properties: {
		login: {
			$title: "X3 user",
		},
		//		description: {
		//			$title: "Description",
		//		}
	},
	$relations: {

	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		console.log("Dataset: " + context.parameters.dataset);
		if (!context.parameters.dataset) return [];
		//
		var ep = adminHelper.getEndpoint(_, {
			dataset: context.parameters.dataset
		});
		return ep && _listSolverMap(_, ep, self, context, parameters) || [];
	},
	$functions: {
		$setId: function(_, context, id) {
			console.log("SETID");
			//			var ids = id.split("~");
			//			if (!ids[0]) return;
			//			var db = adminHelper.getCollaborationOrm(_);
			//			var app = db.fetchInstance(_, db.getEntity(_, "application"), ids[0]);
			//			if (!app) return;
			//			var ep = (ids[1] && db.fetchInstance(_, db.getEntity(_, "endPoint"), ids[1])) || app.defaultEndpoint(_);
			//			if (!ep) return;
			//			ep && _itemSolverMap(_, ep, this, ids[2]);
		}
	},
	$defaultOrder: [
		["login", true]
	],
	$searchIndex: {
		$fields: ["login"]
	}
};