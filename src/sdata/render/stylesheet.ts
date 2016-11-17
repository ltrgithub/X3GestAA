"use strict";
var fs = require('streamline-fs');
var path = require('path');
var cssParser = require('./cssParser');
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");

/// !doc
///
/// # Style sheet management for PDF customization
///
exports.create = function(_, css) {
	var defStyles = css && typeof(css) === 'object' ? css : loadStyles(_, css || './default.css');
	// console.log("StyleSheet.create: defStyles=" + sys.inspect(defStyles));
	var curStyles = {};
	var defBorder = {
		width: 0,
		style: 'solid',
		color: 'black'
	};

	function loadStyles(_, p) {
		return cssParser.parse(fs.readFile(path.join(__dirname, p), 'utf8', _));
	}

	function extend(_, css) {
		var styles = css && typeof(css) === 'object' ? css : loadStyles(_, css || './default.css');
		// If we decide that it sould be immutable
		// var newStyles =  helpers.object.clone(defStyles, true);
		// newStyles = helpers.object.extend(newStyles, styles, true, true);
		// return exports.create(_, newStyles);
		defStyles = helpers.object.extend(defStyles, css, true, true);
		return this;
	}

	function css1(styles, clas, atb) {
		var style = styles[clas];
		return style && style[atb];
	}

	function cssValue(clas, atb, def) {
		return css1(curStyles, clas, atb) || css1(defStyles, clas, atb) //
			||
			css1(curStyles, 'default', atb) || css1(defStyles, 'default', atb) || def;
	}

	function boxStyle(clas) {
		return cssParser.fixBoxStyle(defStyles[clas]);
	}

	function getStyle(clas) {
		return defStyles[clas] || {};
	}

	return {
		extend: extend,
		cssValue: cssValue,
		boxStyle: boxStyle,
		getStyle: getStyle,
	};
};