"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.query = function(_, context, parameters, entity, facet, func, where) {
	var ep = _getX3EntitiesEndpoint(_, context, parameters);
	if (!ep) return false;
	var handle = ep.getOrm(_);
	var entity = handle.getEntity(_, entity, facet);
	where = where || {};
	var instances = handle.fetchInstances(_, entity, where);
	instances.forEach_(_, func);
	//flows.eachKey(_, instances, function(_, key, e) { func(_, e); });
};

exports.matchOrEmptyFilter = function(_, filters, property, value) {
	if (value) {
		var filter = {};
		var val = {};
		var emptyStr = {};
		var nul = {};
		nul[property] = null;
		emptyStr[property] = "";

		if (value.$uuid) {
			value = value.$uuid;
			property += ".$uuid";
		}
		val[property] = value;

		filter["$or"] = [val, emptyStr, nul];
		filters.push(filter);
	}
};

// find an endpoint by matching the string <application>.<contract>.<dataset>
exports.findMatchingEndpoint = function(_, context, endpointName) {
	var epMatch;
	var eps = adminHelper.getEndpoints(_, {});
	epMatch = eps.filter_(_, function(_, ep) {
		return (endpointName === ep.application(_) + "." + ep.contract(_) + "." + ep.dataset(_));
	});
	return epMatch && epMatch[0];
};

function _getX3EntitiesEndpoint(_, context, parameters) {
	var epMatch;
	var eps = adminHelper.getEndpoints(_, {});
	epMatch = eps.filter_(_, function(_, ep) {
		return (ep.application(_) === parameters.application && ep.contract(_) === parameters.contract && ep.dataset(_) === parameters.dataset);
	});
	return epMatch && epMatch[0];
};