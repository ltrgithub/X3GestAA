"use strict";

var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var sdataRegistry = require("../../../..//src/sdata/sdataRegistry");
var flows = require('streamline-runtime').flows;
var helpers = require('@sage/syracuse-core').helpers;
var pluralize = helpers.string.pluralize;
var locale = require('streamline-locale');
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
		representation: "NAME",
		title: "TITLE",
		entity: "CLASSE"
	});
	return p;
}

var _listSolverMap = {
	syracuse: function(_, ep, ent, context) {
		var db = context.db;
		var params = context.parameters;
		var self = ent;
		var contract = sdataRegistry.getContract(ep.application(_), ep.contract(_));
		var added = {};
		var preliminary = [];
		contract && flows.eachKey(_, contract.entities, function(_, key, entity) {
			var instance = self.factory.createInstance(_, null, db);
			instance.representation(_, entity.name);
			instance.title(_, entity.title || entity.name);
			instance.entity(_, entity.plural);
			//instance.dataset(_, ep.dataset(_));
			instance.application(_, ep.applicationRef(_));
			instance.endpointRef(_, ep);
			preliminary.push(instance);
			added[entity.name] = 1;
		});
		contract && flows.eachKey(_, contract.representations, function(_, key, repr) {
			if (added[key]) return;
			var instance = self.factory.createInstance(_, null, db);
			instance.representation(_, key);
			instance.title(_, repr.$title || key);
			instance.entity(_, pluralize(repr.$entityName));
			//			instance.dataset(_, ep.dataset(_));
			instance.application(_, ep.applicationRef(_));
			instance.endpointRef(_, ep);
			preliminary.push(instance);
		});
		if (params.key) {
			var prop = (params.orderBy && params.orderBy.length && params.orderBy[0].binding) || "representation";
			var k = params.key.split(".");
			preliminary = preliminary.filter_(_, function(_, p) {
				return k[0] === "gt" ? p[prop](_) > k[1] : p[prop](_) < k[1];
			});
		}
		return preliminary;
	},
	x3: function(_, ep, ent, context) {
		var db = context.db;
		var params = _fixParameters(context.parameters);
		var ep_db = ep.getOrm(_);
		//
		var repr = ep_db.fetchInstances(_, ep_db.getEntity(_, "AREPIDX", "$query"), params);
		if (repr) {
			var hasError = false;
			for (var i = 0; repr.$diagnoses && i < repr.$diagnoses.length && !hasError; i++) {
				hasError = repr.$diagnoses[i].$severity === "error";
			}

			if (hasError) {
				var instance = ent.factory.createInstance(_, null, db);
				instance.$diagnoses = repr.$diagnoses;
				return [instance];
			} else {
				return repr.map_(_, function(_, r) {
					var instance = ent.factory.createInstance(_, null, db);
					instance.representation(_, r.NAME && r.NAME(_));
					instance.title(_, r.TITLE && r.TITLE(_));
					instance.entity(_, r.CLASSE && r.CLASSE(_));
					//			instance.dataset(_, ep.dataset(_));
					instance.application(_, ep.applicationRef(_));
					instance.endpointRef(_, ep);
					return instance;
				});
			}
		}
	}
};

var _itemSolverMap = {
	syracuse: function(_, ep, inst, key) {
		var contract = sdataRegistry.getContract(ep.application(_), ep.contract(_));
		if (!contract) return;
		var repr = contract.representations[key];
		var ent = contract.entities[(repr && repr.$entityName) || key];
		inst.representation(_, key);
		if (!ent) return;
		inst.title(_, (repr && repr.$title) || (ent && ent.$title));
		inst.entity(_, ent.plural);
		//		inst.dataset(_, ep.dataset(_));
		inst.application(_, ep.applicationRef(_));
		inst.endpointRef(_, ep);
	},
	x3: function(_, ep, inst, key) {
		var db = ep.getOrm(_);
		//
		var r = db.fetchInstance(_, db.getEntity(_, "AREPIDX", "$query"), {
			sdataWhere: "NAME eq \"" + key + "\""
		});

		if (r) {
			var hasError = false;
			for (var i = 0; r.$diagnoses && i < r.$diagnoses.length && !hasError; i++) {
				hasError = r.$diagnoses[i].$severity === "error";
			}

			if (hasError) {
				inst.$diagnoses = r.$diagnoses;
			} else {
				inst.representation(_, r.NAME && r.NAME(_));
				inst.title(_, r.TITLE && r.TITLE(_));
				inst.entity(_, r.CLASSE && r.CLASSE(_));
				//			inst.dataset(_, ep.dataset(_));
				inst.application(_, ep.applicationRef(_));
				inst.endpointRef(_, ep);
			}
		}
	}
};
exports.entity = {
	$titleTemplate: "Representation",
	$valueTemplate: "{representation}",
	$valueTitleTemplate: "{entity}",
	$listTitle: "Representations",
	// $key: "{application.$uuid}~{endpointRef.$uuid}~{representation}",
	// data will contain the properties directly, without access via "(_)" functions
	$keyFunction: function(data) {
		return (data.application && data.application.$uuid || "") + "~" + (data.endpointRef && data.endpointRef.$uuid || "") + "~" + (data.representation || "");
	},
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$keyPager: true,
	$isProxyClass: true,
	$properties: {
		representation: {
			$title: "Representation",
			$isMandatory: function(_, instance) {
				return (instance._parent && instance._parent._meta && instance._parent._meta.name === "menuItem" && instance._parent.linkType(_) === "$representation");
			},
			$propagate: function(_, instance, val) {
				if (instance._parent && instance._relation) {
					// force propagate
					if (instance._relation.$propagate) instance._relation.$propagate(_, instance._parent, instance);
				}
			}
		},
		title: {
			$title: "Title",
			$isHidden: true
		},
		entity: {
			$title: "Entity",
			$isMandatory: function(_, instance) {
				return (instance._parent && instance._parent._meta && instance._parent._meta.name === "menuItem" && instance._parent.linkType(_) === "$representation");
			},
			$propagate: function(_, instance, val) {
				if (instance._parent && instance._relation) {
					// force propagate
					if (instance._relation.$propagate) instance._relation.$propagate(_, instance._parent, instance);
				}
			}
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
		return ep && _listSolverMap[ep.protocol(_)] && _listSolverMap[ep.protocol(_)](_, ep, self, context) || [];
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
		["representation", true]
	],
	$searchIndex: {
		$fields: ["entity", "representation"]
	}
};