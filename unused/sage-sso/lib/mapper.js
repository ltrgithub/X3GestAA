"use strict";
var helpers = require('syracuse-core').helpers;
var XmlHelper = Packages.syracuse.xml.XmlHelper;

function XmlMapper(options) {
	var self = this;

	options = options || {};
	var _rootName = options.rootName || "root";
	var _mappings = options.mappings || {};
	var _defaultNS = options.defaultNamespace;
	var _doc;

	var _parserMappings;

	function _createElement(name) {
		var mapping = _mappings[name];
		if (mapping) {
			name = mapping.name || name;
			return _doc.createElementNS(mapping.namespace, name);
		} else {
			return _defaultNS ? _doc.createElementNS(_defaultNS, name) : _doc.createElement(name);
		}
	}

	function _fillAttribute(elt, name, val) {
		var mapping = _mappings[name];
		if (!mapping || !mapping.isAttribute) return false;

		// will see about type conversions later
		var str = "" + val;
		name = mapping.name || name;
		if (mapping.namespace && mapping.namespace != elt.getNamespaceURI()) {
			elt.setAttributeNS(mapping.namespace, name, str);
		} else {
			//print("name=" + name + ", str=" + str);
			elt.setAttribute(name, str);
		}
		return true;
	}

	function _fill(elt, obj) {
		// handle simple types
		switch (typeof obj) {
			case "string":
			case "number":
			case "boolean":
				elt.setTextContent(obj.toString());
				return;
			case "function":
				return;
		}

		helpers.debug.assert(!(elt instanceof Array));
		helpers.object.forEachKey(obj, function(key, val) {
			if (val instanceof Array) {
				val.forEach(function(childObj) {
					// cannot handle arrays of arrays: needs a name
					var childElt = elt.appendChild(_createElement(key));
					_fill(childElt, childObj);
				});
			} else {
				if (_fillAttribute(elt, key, val)) return;
				var childElt = elt.appendChild(_createElement(key));
				if (val) _fill(childElt, val);
			}
		});
	}

	function _toDocument(obj) {
		_doc = XmlHelper.newDocument();
		_fill(_doc, obj, _rootName);
		return _doc;
	}

	self.format = function(obj, options) {
		var doc = _toDocument(obj);
		return XmlHelper.format(doc, options && options.indent);
	};

	function _parse(elt) {
		var firstChild = elt.getFirstChild();
		var atbs = elt.getAttributes();
		if ((firstChild && firstChild.getNodeType() == 1) || (atbs && atbs.getLength() > 0)) {
			var result = {};
			for (var node = firstChild; node; node = node.getNextSibling()) {
				if (node.getNodeType() != 1) continue;
				var key = node.getNamespaceURI() + ":" + node.getLocalName();
				var mapping = _parserMappings[key];
				//print(key + " => " + mapping);
				var name = (mapping && mapping.name) || node.getNodeName();
				if (mapping && mapping.isArray) {
					result[name] = result[name] || [];
					result[name].push(_parse(node));
				}
				result[name] = _parse(node);
			}
			for (var i = 0; i < atbs.getLength(); i++) {
				var atb = atbs.item(i);
				if (atb.getNodeName().indexOf('xmlns') == 0) continue;
				var mapping = _parserMappings[atb.getNamespaceURI() + ":" + atb.getLocalName()];
				var name = (mapping && mapping.name) || atb.getNodeName();
				// will worry about types later
				result[name] = "" + atb.getNodeValue();
			}
			return result;
		} else {
			if (firstChild && firstChild.getNodeType() == 3) {
				// worry about types later
				return "" + firstChild.getNodeValue();
			} else {
				return "";
			}
		}
	}

	function _initParserMappings() {
		_parserMappings = {};
		helpers.object.forEachKey(_mappings, function(key, mapping) {
			var ns = mapping.namespace || _defaultNS;
			var name = mapping.name || key;
			_parserMappings[ns + ":" + name] = {
				name: key,
				isArray: mapping.isArray,
				isAttribute: mapping.isAttribute
			};
		});
	}

	self.xmlToJs = function(doc) {
		_initParserMappings();
		return _parse(doc.getDocumentElement());

	};
	self.parse = function(str) {
		var doc = XmlHelper.parse(str);
		return self.xmlToJs(doc);
	};

}

exports.XmlMapper = helpers.defineClass(XmlMapper);