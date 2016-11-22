"use strict";
var allSides = ['top', 'bottom', 'left', 'right'];

function defBorder() {
	return {
		width: 0,
		style: 'solid',
		color: 'black'
	};
}

exports.fixBoxStyle = function(style) {
	style = style || {};
	style.border = style.border || {};
	style.border.radius = style.border.radius || 0;
	style.margin = style.margin || {};
	style.padding = style.padding || {};
	// style.radius = style.radius || {};
	allSides.forEach(function(side) {
		style.border[side] = style.border[side] || defBorder();
		style.margin[side] = style.margin[side] || 0;
		style.padding[side] = style.padding[side] || 0;
		// style.radius[side] = style.radius[side] || 5;
	});
	return style;
};

/*
exports.fixFontStyle = function(style) {
	style = style || {};
	style.font = style.font || {};
	style.font.family = style.font.family || "Helvetica";
	style.font.size = style.font.size || 10;
	return style;
}*/

exports.parse = function(str) {
	function trim(s) {
		return s.trim();
	}

	function notEmpty(s) {
		return s;
	}

	function parseFont(s) {
		var vals = s.split(' ');
		if (vals.length < 2) throw new Error("font: invalid value: " + s);
		return {
			family: parseSimple(vals[vals.length - 1]),
			size: parseSimple(vals[vals.length - 2]),
			weight: parseSimple(vals[vals.length - 3] || 'normal'),
			variant: parseSimple(vals[vals.length - 4] || 'normal'),
			style: parseSimple(vals[vals.length - 5] || 'normal'),
		};
	}

	function parseBorder(atb, s) {
		var vals = s.split(' ');
		if (vals.length !== 3) throw new Error(atb + ": invalid value: " + s);
		return vals = {
			width: parseSimple(vals[0]),
			style: parseSimple(vals[1]),
			color: parseSimple(vals[2]),
		};
	}

	function parseSimple(s) {
		if (s[0] === '"' && s[s.length - 1] === '"') return s.substring(1, s.length - 1);
		if (s === 'true') return true;
		if (s === 'false') return false;
		return /\b-?\d+\b/.test(s) ? parseInt(s) : s;
	}

	function parseVal(style, atb, s) {
		var segs = atb.split('-');
		switch (segs[0]) {
			case 'border':
				style.border = style.border || {};
				if (segs.length > 1) {
					if (allSides.indexOf(segs[1]) >= 0) {
						if (segs.length === 2) style.border[segs[1]] = parseBorder(atb, s);
						else(style.border[segs[1]] = style.border[segs[1]] || defBorder())[segs[2]] = parseSimple(s);
					} else {
						switch (segs[1]) {
							case 'width':
							case 'style':
							case 'color':
								allSides.forEach(function(side) {
									(style.border[side] = style.border[side] || defBorder())[segs[1]] = parseSimple(s);
								});
								break;
							case 'collapse':
								style.border.collapse = parseSimple(s);
								break;
							case 'radius':
								style.border.radius = parseSimple(s);
								break;
							default:
								throw new Error("invalid CSS attribute: " + atb);
						}
					}
				} else {
					allSides.forEach(function(side) {
						style.border[side] = parseBorder(atb, s);
					});
				}
				break;
			case 'margin':
			case 'padding':
				// case 'radius':
				style[segs[0]] = style[segs[0]] || {};
				if (segs.length > 1) {
					if (allSides.indexOf(segs[1]) < 0) throw new Error("invalid CSS attribute: " + atb);
					style[segs[0]][segs[1]] = parseSimple(s);
				} else {
					allSides.forEach(function(side) {
						style[segs[0]][side] = parseSimple(s);
					});
				}
				break;
			case 'font':
				if (segs.length > 1) {
					style.font = style.font || {};
					style.font[segs[1]] = parseSimple(s);
				} else {
					style.font = parseFont(s);
				}
				break;
			default:
				segs.reduce(function(o, seg, i) {
					return o[seg] = i < segs.length - 1 ? (o[seg] || {}) : parseSimple(s);
				}, style);
		}
	}

	var css = {};
	// remove comments
	// str = str.replace(/\/\*(\r|\n|.)*\*\//g,"");
	// then process each blocks
	str.replace(/\/\*(\r|\n|.)*?\*\//g, "").split('}').map(trim).filter(notEmpty).forEach(function(s) {
		var pair = s.split('{').map(trim);
		if (pair.length !== 2) throw new Error("invalid CSS: unbalanced {}: " + pair.length);
		var style = css[pair[0]] = {};
		pair[1].split(';').map(trim).filter(notEmpty).forEach(function(s) {
			var pair = s.split(':').map(trim);
			if (pair.length < 2) throw new Error('invalid CSS attribute syntax: ' + s);
			var atb = pair[0];
			parseVal(style, atb, pair.slice(1).join(':'));
		});

	});
	return css;
};