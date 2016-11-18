"use strict";

var util = require('util'),
	pdfUtils = require('./utils'),
	helpers = require('@sage/syracuse-core').helpers;

var types = exports.types = {
	ROOT: "ROOT",
	STRING: "STRING",
	NUMBER: "NUMBER",
	NAME: "NAME",
	ARRAY: "ARRAY",
	DICTIONARY: "DICTIONARY",
	NULL: "NULL"
};

var Obj = helpers.defineClass(function(type, key, value) {
	this.type = type;
	this.key = key;
	this.value = value;
	this.children = [];
}, null, {
	addDictionary: function(str) {
		//	console.log("add dico : "+str);
		var n = new Obj(types.DICTIONARY, "", str.split('/')[0]);

		this.children.push(n);
		n.addNames(str);
		return n;
	},
	addArray: function(str) {
		//	console.log("add array : "+str);
		var n = new Obj(types.ARRAY, "", str);
		this.children.push(n);
		return n;
	},
	addString: function(str) {
		//	console.log("add str : "+str);
		var n = new Obj(types.STRING, "", str);
		this.children.push(n);
		return n;
	},
	addNumber: function(str) {
		//	console.log("add number : "+str);
		var n = new Obj(types.NUMBER, "", str);
		this.children.push(n);
		return n;
	},
	addNames: function(str) {
		//	console.log("add names : "+str);
		var self = this;
		var lastAdded;
		// wrong: / may be inside ()
		str.split('/').slice(1).forEach(function(line) {
			lastAdded = self.addName("/" + line);
		});
		return lastAdded;
	},
	addName: function(str) {
		var match = /^(\/[^\[\(\< ]*)(.*)$/.exec(str);
		//console.error("add name:"+str+" match=" + match);
		var n = new Obj(types.NAME, match[1], match[2]);
		this.children.push(n);
		return n;
	},
	getEntry: function(name) {
		function isInStr(str) {
			return str != null ? str.indexOf("/" + name) !== -1 : false;
		}

		function getValue(entry) {

			if (entry.type === types.NAME || entry.type === types.ARRAY) {
				var result = entry;
				return result;
			}
			return null;
		}

		function searchEntry(entry) {
			if (isInStr(entry.key)) {
				return getValue(entry);
			}
			var result = null;
			for (var i = 0; i < entry.children.length; i++) {
				result = searchEntry(entry.children[i]);
				if (result !== null) break;
			}
			return result;
		}

		return searchEntry(this);
	},
	stringify: function() {
		function stringify1(n) {

			var key = n.key != null ? n.key : "";
			var value = n.value != null ? n.value : "";
			var res = key + value;
			n.children.forEach(function(element, index) {
				res += stringify1(element);
			});

			if (n.type === types.DICTIONARY) {
				res = "<<" + res + ">>";
			}

			return res;
		}
		var result = stringify1(this);

		if (this.type === types.ROOT) {
			var firstSubObjectType = this.children[0].type;
			if (firstSubObjectType === types.NAME) {
				result = "<<" + result + ">>";
			}
		}
		return result;
	}
});

exports.create = function() {
	return new Obj(types.ROOT, "");
};

exports.parse = function(buf) {

	function getObjectType(str) {

		var arr = [],
			dicIdx = str.indexOf('<<'),
			arrIdx = str.indexOf('['),
			namIdx = str.indexOf('/'),
			strIdx = str.indexOf('(');

		if (dicIdx !== -1) {
			arr.push(dicIdx);
		}
		if (arrIdx !== -1) {
			arr.push(arrIdx);
		}
		if (namIdx !== -1) {
			arr.push(namIdx);
		}
		if (strIdx !== -1) {
			arr.push(strIdx);
		}

		arr.sort(function(a, b) {
			return a - b;
		});
		var firstIdx = arr[0];
		if (pdfUtils.startsWith(str.substring(firstIdx), '<<')) {
			return types.DICTIONARY;
		} else if (pdfUtils.startsWith(str.substring(firstIdx), '[')) {
			return types.ARRAY;
		} else if (pdfUtils.startsWith(str.substring(firstIdx), '/')) {
			return types.NAME;
		} else if (pdfUtils.startsWith(str.substring(firstIdx), '(')) {
			return types.STRING;
		} else if (typeof parseInt(str, 10) === 'number') {
			return types.NUMBER;
		} else {
			throw pdfUtils.error("Unknow Pdf Object type :" + str.substring(firstIdx));
		}

	}

	function parse1(buf) {
		var pos = 0;
		var len = buf.length;
		var end = pos + len;

		var level = 0;
		var type = getObjectType(buf.toString().substring(0, 5));
		var root = new Obj(types.ROOT, "");
		var currentObj;

		if (type === types.DICTIONARY) {
			buf.toString().split('<<').slice(1).map(function(line) {
				//				console.log("line = "+line);

				function getCurrentObj(lev) {
					var nodeResult = getLastNode(root);

					function getLastNode(node) {
						return node.children[node.children.length - 1];
					}
					if (lev <= 0) return root;
					for (var i = 0; i < lev - 1; i++) {
						nodeResult = getLastNode(nodeResult);
					}
					return nodeResult;
				}
				if (line.indexOf('>>') !== -1) {

					line.split('>>').reduce(function(previousValue, currentValue, index, array) {

						if (index !== 0) {
							level--;
						}

						if (currentValue !== "") {
							//							console.log("Add C : "+currentValue);
							getCurrentObj(level).addNames(currentValue);
							if (index === array.length - 1) {
								level++;
								//								console.log("Add E : "+currentValue);
								getCurrentObj(level).addDictionary("");
								level++;
							}
						} else {
							//							console.log("Add D : "+currentValue);
							level--;
							level--;
						}
						return currentValue;
					}, '');
				} else {
					//					console.log("Add A value : "+line);
					getCurrentObj(level).addNames(line);
					level++;
					getCurrentObj(level).addDictionary("");
					level++;
				}

				return currentObj;
			}, root);
		} else if (type === types.ARRAY) {
			root.addArray(buf.toString());
		} else if (type === types.STRING) {
			root.addString(buf.toString());
		} else if (type === types.NUMBER) {
			root.addNumber(buf.toString());
		}
		return root;
	}

	try {
		return parse1(buf);
	} catch (e) {
		console.error("Parsing error : " + e);
	}
};