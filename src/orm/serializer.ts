"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var flows = require('streamline-runtime').flows;
var resourceHelpers = require('@sage/syracuse-core').resource.util;
var checksum = require("./checksum");
var globals = require('streamline-runtime').globals;
var sys = require("util");
var Template = require('@sage/syracuse-core').resource.proxy.Template;

var factoryTracer = require('@sage/syracuse-core').getTracer("orm.factory");

function Serializer(snapshotType) {
	this._snapshotType = snapshotType;
}

var getFactoryOwner = exports.getFactoryOwner = function(_, sp) {
	sp = sp || globals.context.session && globals.context.session.getSecurityProfile(_);
	if (sp && sp.factoryOwner(_) === "SAGE") return "SAGE";
	if (sp && sp.factoryOwner(_) && sp.factoryOwner(_) !== "") {
		return sp.factoryOwner(_);
	}
};


helpers.defineClass(Serializer, null, {
	canSerializeProperty: function(_, instance, property) {
		return true;
	},
	serializeProperty: function(_, instance, property, resource) {

	},
	canSerializeRelation: function(_, instance, relation) {
		return true;
	},
	serializePlural: function(_, instance, relation, resource) {

	},
	serializeReference: function(_, instance, relation, resource) {

	},
	serialize: function(_, instance, options, withMeta) {
		if (!instance) return null;
		factoryTracer.debug && factoryTracer.debug("serializer.serialize: " + instance.$uuid);
		//
		var serializer = this;
		//
		var meta = instance._meta;
		var resource = {};
		// properties
		flows.eachKey(_, meta.$properties, function(_, key, property) {
			serializer.canSerializeProperty(_, instance, property) && serializer.serializeProperty(_, instance, property, resource);
		});
		// relations
		flows.eachKey(_, meta.$relations, function(_, key, relation) {
			if (relation.isPlural) {
				serializer.canSerializeRelation(_, instance, relation) && serializer.serializePlural(_, instance, relation, resource);
			} else serializer.canSerializeRelation(_, instance, relation) && serializer.serializeReference(_, instance, relation, resource);
		});
		if (Object.keys(resource).length === 0) return null;
		else {
			resource.$uuid = instance.$uuid;
			if (instance.$syncUuid) resource.$syncUuid = instance.$syncUuid;
			if (withMeta) {
				if (instance.$tick) resource.$tick = instance.$tick;
				if (instance.$endpoint) resource.$endpoint = instance.$endpoint;
				if (instance.$creUser) resource.$creUser = instance.$creUser;
				if (instance.$creDate) resource.$creDate = instance.$creDate;
				if (instance.$updUser) resource.$updUser = instance.$updUser;
				if (instance.$updDate) resource.$updDate = instance.$updDate;
				if (instance.$factory) {
					resource.$factory = instance.$factory;
					resource.$factoryOwner = instance.$factoryOwner || getFactoryOwner(_);
				} else if (instance.$factoryOwner) {
					resource.$factory = false;
					resource.$factoryOwner = null;
				}
				if (instance._data.$signature) resource.$signature = instance._data.$signature;
				if (meta.$key)
				// TODO: make a "resolveInstance" function to template, to avoid use of _data
					resource.$key = (new Template(meta.$key)).resolve(instance._data);
			}
		}
		//
		factoryTracer.debug && factoryTracer.debug("serializer.serialize exit : " + sys.inspect(resource, null, 4));
		return resource;
	}
});

function SaveSerializer(withDelta) {

}

// TODO: delta
exports.SaveSerializer = helpers.defineClass(SaveSerializer, Serializer, {
	serializeProperty: function(_, instance, property, resource) {
		// TODO: delta
		if (property.$compute) return;
		var key = property.name;
		var instVal = instance[key](_);
		var newVal = resourceHelpers.formatValue(property, (property.$isLocalized) ? instance._data[key] : instVal);
		if (property.isExternalStorage()) {
			if (instVal) {
				resource[key] = {
					$uuid: instance[key](_).getUuid()
				};
			}
		} else {
			if (instance._data.hasOwnProperty(key)) resource[key] = newVal;
		}
	},
	serializePlural: function(_, instance, relation, resource) {
		// plural relations are always fully stored
		if (relation.isComputed) return;
		//
		var key = relation.name;
		var self = this;
		resource[key] = instance[key](_).toArray(_, true).map_(_, function(_, e) {
			var r;
			if (relation.$isDynamicType && !relation.getIsChild()) {
				r = {
					$url: e.$url || e.computeUrl()
				};
			} else {
				r = relation.getIsChild(e.$variantType) ? self.serialize(_, e) : {
					$uuid: e.$uuid
				};
				if (r && (relation.$isDynamicType || relation.$variants)) r.$type = e.getEntity(_).name;
				if (e.$variantType) r.$variantType = e.$variantType;
				if (relation.getIsChild(e.$variantType) && e.$factory) {
					r.$factory = e.$factory;
					r.$factoryOwner = e.$factoryOwner || getFactoryOwner(_);
				}
				if (e.$creUser) r.$creUser = e.$creUser;
				if (e.$creDate) r.$creDate = e.$creDate;
				if (e.$updUser) r.$updUser = e.$updUser;
				if (e.$updDate) r.$updDate = e.$updDate;
				// 
				if (e.$mark) r.$mark = e.$mark;
			}
			if (e.hasOwnProperty("$index")) r.$index = e.$index;
			if (e.hasOwnProperty("$allowFactoryUnlink")) r.$allowFactoryUnlink = e.$allowFactoryUnlink;

			// special case for inverse relations
			if (e._relatedInst && e._relatedInst[instance.$uuid] && e._relatedInst[instance.$uuid].hasOwnProperty("$allowFactoryUnlink")) {
				r.$allowFactoryUnlink = e._relatedInst[instance.$uuid].$allowFactoryUnlink;
			}


			return r;
		});
	},
	serializeReference: function(_, instance, relation, resource) {
		// TODO: delta
		var self = this;
		var key = relation.name;
		resource[key] = null;
		// avoid reference load
		var v = instance._data[key];
		if (!v) return;
		//
		if (relation.getIsChild(v.$variantType) || relation.$inlineStore) {
			// force load if lazy
			v = instance[key](_);
			resource[key] = self.serialize(_, v);
			if (v && resource[key] && (relation.$isDynamicType || relation.$variants)) resource[key].$type = v.getEntity(_).name;
		} else
		// avoid reference load
		if (instance._data[key] && instance._data[key].$uuid) {
			resource[key] = {};
			if (relation.$isDynamicType) resource[key].$url = instance._data[key].$url || instance._data[key].computeUrl();
			else resource[key].$uuid = instance._data[key].$uuid;
			factoryTracer.debug && factoryTracer.debug("Serialize reference: " + key + "; isDynamic: " + !!(relation.$isDynamicType) + "; url: " + resource[key].$url);
		}
		if (v.$variantType) resource[key].$variantType = v.$variantType;
		if (v.$factory) {
			resource[key].$factory = v.$factory;
			resource[key].$factoryOwner = v.$factoryOwner || getFactoryOwner(_);
		}
	}
});

function SignSerializer() {}

exports.SignSerializer = helpers.defineClass(SignSerializer, SaveSerializer, {
	canSerializeProperty: function(_, instance, property) {
		if (property.isExternalStorage() || property.$compute) return false;
		var ent = instance.getEntity(_);
		var val = instance[property.name](_);
		if (!val) return false;
		return ent.$signed && (ent.$signed.indexOf(property.name) >= 0);
	},
	canSerializeResourceProperty: function(resource, entity, property) {
		if (property.isExternalStorage() || property.$compute) return false;
		var ent = entity;
		var val = resource[property.name];
		if (!val) return false;
		return ent.$signed && (ent.$signed.indexOf(property.name) >= 0);
	},
	canSerializeRelation: function(_, instance, relation) {
		if (relation.isComputed) return false;
		var ent = instance.getEntity(_);
		var r = instance[relation.name](_);
		if (relation.isPlural && (r.getLength() === 0)) return false;
		if (!relation.isPlural && !r) return false;
		return ent.$signed && (ent.$signed.indexOf(relation.name) >= 0);
	},
	canSerializeResourceRelation: function(resource, entity, relation) {
		if (relation.isComputed) return false;
		var ent = entity;
		var r = resource[relation.name];
		if (!r) return false;
		if (relation.isPlural && (r.length === 0)) return false;
		if (!relation.isPlural && (Object.keys(r).length === 0)) return false;
		return ent.$signed && (ent.$signed.indexOf(relation.name) >= 0);
	},
	serializePluralResource: function(instance, relation, resource) {
		// plural relations are always fully stored
		if (relation.isComputed) return;
		//
		var key = relation.name;
		var self = this;
		if (!instance[key]) return;
		resource[key] = instance[key].map(function(e) {
			var r;
			if (relation.$isDynamicType && !relation.getIsChild()) {
				r = {
					$url: e.$url
				};
			} else {
				r = relation.getIsChild() ? self.serializeResource(relation.targetEntity, e) : {
					$uuid: e.$uuid
				};
			}
			return r;
		});
	},
	serializeReferenceResource: function(instance, relation, resource) {
		// TODO: delta
		var self = this;
		var key = relation.name;
		resource[key] = null;
		var v = instance[key];
		if (!v) return;
		if (relation.getIsChild() || relation.$inlineStore) {
			resource[key] = self.serializeResource(relation.targetEntity, v);
		} else
		// avoid reference load
		if (v.$uuid) {
			resource[key] = {
				$uuid: v.$uuid
			};
			if (relation.$isDynamicType || relation.$variants) resource[key].$url = v.$url;
		}
	},
	serializeResource: function(entity, instance) {
		if (!instance) return null;
		// !!!! instance is a resource here !!!!
		factoryTracer.debug && factoryTracer.debug("serializer.serialize: " + instance.$uuid);
		//
		var serializer = this;
		var self = this;
		//
		var meta = entity;
		var resource = {};
		// properties
		Object.keys(meta.$properties).forEach(function(key) {
			var property = meta.$properties[key];
			if (self.canSerializeResourceProperty(instance, entity, property)) resource[key] = instance[key];
		});
		// relations
		Object.keys(meta.$relations).forEach(function(key) {
			var relation = meta.$relations[key];
			if (!self.canSerializeResourceRelation(instance, entity, relation)) return;
			if (relation.isPlural) {
				(instance[key] && instance[key].length) && serializer.serializePluralResource(instance, relation, resource);
			} else instance[key] && serializer.serializeReferenceResource(instance, relation, resource);
		});
		if (Object.keys(resource).length === 0) return null;
		else {
			if (instance.$uuid) resource.$uuid = instance.$uuid;
			if (instance.$syncUuid) resource.$syncUuid = instance.$syncUuid;
			if (instance.$creUser) resource.$creUser = instance.$creUser;
			if (instance.$updUser) resource.$updUser = instance.$updUser;
			if (instance.$signature) resource.$signature = instance.$signature;
		}
		//
		factoryTracer.debug && factoryTracer.debug("serializer.serializeResource exit : " + sys.inspect(resource, null, 4));
		return resource;
	}
});

exports.serialize = function(_, instance, serializer, options) {
	return serializer.serialize(_, instance, options, true);
};