"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var sdataRegistry = require("../../../../../src/sdata/sdataRegistry");
var flows = require('streamline-runtime').flows;
var helpers = require('@sage/syracuse-core').helpers;
var pluralize = helpers.string.pluralize;
var locale = require('streamline-locale');
var parser = require('@sage/syracuse-sdata-parser');
var sys = require("util");

function _applyProxyMap(where, proxyMap) {
	var res = "";
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
		entity: "NAME",
		title: "TITLE",
		canSearch: "FLGSEARCH"
	});
	return p;
}

var _listSolverMap = {
	syracuse: function(_, ep, ent, context, parameters) {
		var db = context.db;
		var params = context.parameters;
		var self = ent;
		var contract = sdataRegistry.getContract(ep.application(_), ep.contract(_));
		//
		var expr = parameters && parser.jsonToSdata(parameters);
		if (expr) expr = parser.parse(expr);
		//
		var preliminary = [];
		contract && flows.eachKey(_, contract.entities, function(_, key, entity) {
			var instance = self.factory.createInstance(_, null, db);
			instance.entity(_, entity.name);
			instance.title(_, entity.$title || entity.name);
			instance.application(_, ep.applicationRef(_));
			instance.endpointRef(_, ep);
			instance.canSearch(_, (entity.$searchIndex != null));
			if (expr && !instance.match(_, expr)) return;
			preliminary.push(instance);
		});
		if (params.key) {
			var prop = (params.orderBy && params.orderBy.length && params.orderBy[0].binding) || "entity";
			var k = params.key.split(".");
			preliminary = preliminary.filter_(_, function(_, p) {
				return k[0] === "gt" ? p[prop](_) > k[1] : p[prop](_) < k[1];
			});
		}
		return preliminary;
	},
	x3: function(_, ep, ent, context, parameters) {
		var db = context.db;
		//
		var flgSearch = false;

		if (parameters && parameters.jsonWhere && parameters.jsonWhere.canSearch) {
			flgSearch = true;
			delete parameters.jsonWhere.canSearch;
		}
		var expr = parameters && parser.jsonToSdata(parameters);
		if (expr) context.parameters.where = parser.parse(expr);
		//
		var params = _fixParameters(context.parameters);
		context.isLastPage = params.key === "lt.zzzzzz"; // it's last page if this key is spocified (fix probleme with display links)
		var ep_db = ep.getOrm(_);
		//
		var repr = ep_db.fetchInstances(_, ep_db.getEntity(_, flgSearch ? "ACLAIDXSRH" : "ACLAIDX", "$query"), params);

		return Array.isArray(repr) ? repr.map_(_, function(_, r) {
			var instance = ent.factory.createInstance(_, null, db);
			instance.entity(_, r.NAME(_));
			instance.title(_, r.TITLE(_));
			instance.canSearch(_, flgSearch ? true : r.FLGSEARCH(_));
			instance.application(_, ep.applicationRef(_));
			instance.endpointRef(_, ep);
			return instance;
		}) : repr;
	}
};

var _itemSolverMap = {
	syracuse: function(_, ep, inst, key) {
		var contract = sdataRegistry.getContract(ep.application(_), ep.contract(_));
		if (!contract) return;
		var ent = contract.entities[key];
		if (!ent) return;
		inst.title(_, ent && ent.$title);
		inst.entity(_, ent.name);
		inst.application(_, ep.applicationRef(_));
		inst.endpointRef(_, ep);
	},
	x3: function(_, ep, inst, key) {
		var db = ep.getOrm(_);
		//
		var r = db.fetchInstance(_, db.getEntity(_, "ACLAIDX", "$query"), {
			sdataWhere: "NAME eq \"" + key + "\""
		});
		if (r) {
			inst.title(_, r.TITLE(_));
			inst.entity(_, r.NAME(_));
			inst.canSearch(_, r.FLGSEARCH(_));
			inst.application(_, ep.applicationRef(_));
			inst.endpointRef(_, ep);
		}
	}
};
exports.entity = {
	$classTitle: "Class",
	$titleTemplate: "Class",
	$valueTemplate: "{entity}",
	$valueTitleTemplate: "{title}",
	$listTitle: "Classes",
	$key: "{application.$uuid}~{endpointRef.$uuid}~{entity}",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$keyPager: true,
	$isProxyClass: true,
	$properties: {
		title: {
			$title: "Title",
			$isHidden: true
		},
		entity: {
			$title: "Entity",
			$propagate: function(_, instance, val) {
				if (instance._parent && instance._relation) {
					// force propagate
					if (instance._relation.$propagate) instance._relation.$propagate(_, instance._parent, instance);
				}
			}
		},
		canSearch: {
			$title: "Searchable",
			$type: "boolean"
		}
	},
	$relations: {
		application: {
			$type: "application",
			$isHidden: true
		},
		endpointRef: {
			$type: "endPoint",
			$isHidden: true
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		if (!context.parameters.dataset) return [];
		//
		var ep = adminHelper.getEndpoint(_, {
			dataset: context.parameters.dataset
		});
		return ep && _listSolverMap[ep.protocol(_)] && _listSolverMap[ep.protocol(_)](_, ep, self, context, parameters) || [];
	},
	$functions: {
		$setId: function(_, context, id) {
			var ids = id.split("~");
			if (!ids[0]) return;
			var db = adminHelper.getCollaborationOrm(_);
			var app = db.fetchInstance(_, db.getEntity(_, "application"), ids[0]);
			if (!app) return;
			var ep = (ids[1] && db.fetchInstance(_, db.getEntity(_, "endPoint"), ids[1])) || app.defaultEndpoint(_);
			if (!ep) return;
			ep && _itemSolverMap[ep.protocol(_)] && _itemSolverMap[ep.protocol(_)](_, ep, this, ids[2]);
		}
	},
	$defaultOrder: [
		["entity", true]
	],
	$searchIndex: {
		$fields: ["entity"]
	}
};