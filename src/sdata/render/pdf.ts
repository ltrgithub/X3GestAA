"use strict";
/// !doc
///
/// # Pdf rendering
///
/// The Pdf rendering use the concept of [CSSboxes](http://www.w3schools.com/css/css_boxmodel.asp)
/// ```
/// +------------------------------------------------------------------+
/// |                             margin                               |
/// |  (x,y)--------------------------------------------------------+  |
/// |  |                           border                           |  |
/// |  |  +------------------------------------------------------+  |  |
/// |  |  |                         padding                      |  |  |
/// |  |  |  +------------------------------------------------+  |  |  |
/// |  |  |  |                                                |  |  |  |
/// |  |  |  |                content (inner rect)            |  |  |  |
/// |  |  |  |                                                |  |  |  |
/// |  |  |  +------------------------------------------------+  |  |  |
/// |  |  |                                                      |  |  |
/// |  |  +------------------------------------------------------+  |  |
/// |  |                                                            |  |
/// |  +------------------------------------------------------------+  |
/// |                           (outer rect)                           |
/// +------------------------------------------------------------------+
/// ```
///
/// The (x, y) point determines the top left point of the drawing part so it
/// excludes the margin as it is a transparent area.
///
// TODO: 
// - review ranges.items 
// - manage table in a recursive way
var PdfDocument = require('streamline-pdfkit');
var PdfImage = require('streamline-pdfkit/lib/image');
var stylesheet = require('./stylesheet');

var sys = require('util');
var fs = require('streamline-fs');
var path = require('path');
var ez = require('ez-streams');
var config = require('config'); // must be first syracuse require
var helpers = require('@sage/syracuse-core').helpers;
var glob = require('streamline-runtime').globals;
var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var time = require('@sage/syracuse-core').types.time;

// to control debug feature add this fragment to your nodelocal.js file.
// pdfReport: {
// 	debug: {
// 		format: true,
// 		data: true,
// 		proto: true,
// 		image: true,
// 		box: true,
// 		buildBox: true,
// 		valueBox: true,
// 		output: {
// 			pdf: "pdf_report.pdf",
// 			data: "pdf_data.js",
// 			proto: "pdf_proto.js",
// 		},
// 		log: function(s) {
// 			var fs = require('streamline-fs');
// 			this._fd = fs.openSync("pdf_output.txt", this._fd == null ? "w" : "a");
// 			fs.writeSync(this._fd, s + "\n");
// 			fs.closeSync(this._fd);
// 		}
// 	}
// }
var fontMap = {
	"DejaVuSans": "DejaVuSans.ttf",
	"HelveticaUnc": "Helvetica.dfont",
	"CourrierUnc": "cour.ttf"
};

exports.render = function(_, context, data, proto, options) {
	var debug = (options && options.debug) || (config.pdfReport && config.pdfReport.debug);
	if (debug) debug.log = debug.log || console.log;
	var renderOptions = options || {};
	var dataStack = [];
	debug && debug.log("context=" + sys.inspect(context, false, null));

	function _logBox(box, prefix, indent) {
		if (!box || !debug) return;
		var s;
		debug.log((indent ? indent : "") + (prefix ? prefix + " " : "") + box.ident + " " + (typeof(box.data) === "string" ? "'" + box.data + "'" : typeof(box.data)) //
			+
			", layout=" + box.layoutType + ", parent=" + (box.parent && box.parent.ident) + ", before=" + (box.before && box.before.ident) + ", above=" + (box.above && box.above.ident));
		s = (indent ? indent : "") + "\trect={" + box.x + "," + box.y + "," + box.width + "," + box.height + "}";
		// s+= ", margin={" + box.style.margin.right + ", " + box.style.margin.left + "}";
		// s+= ", padding={" + box.style.padding.right + ", " + box.style.padding.left + "}";
		// s+= ", border={" + box.style.border.left.width + ", " + box.style.border.left.height + "}";
		debug.log("" + s);
		debug.log((indent ? indent : "") + "\tranges=" + sys.inspect(box.ranges, true, null));
		debug.log((indent ? indent : "") + "\titems=" + (box.items && box.items.map(function(b) {
			return b.ident;
		})));
	};

	if (debug) {
		debug.log("****************************** Pdf.render **********************************\n");
		debug.log("debug=" + sys.inspect(debug, false, null));
		// debug.log("context=" + sys.inspect(context, false, null));		
		debug.output && debug.output.data && fs.writeFile(debug.output.data, JSON.stringify(data), "utf8", _);
		debug.output && debug.output.proto && fs.writeFile(debug.output.proto, JSON.stringify(proto), "utf8", _);
	}
	var options = {
		size: 'A4',
		layout: data.$resources ? 'landscape' : 'portrait'
	};
	var doc = createPdfDocument(_, options);
	var baseProto = proto;

	var pageUrl = (context.request.headers.referer || '');
	pageUrl = pageUrl.substring(0, pageUrl.indexOf('?'));

	var sst = stylesheet.create(_, debug && debug.useDebugCss ? './debug.css' : null).extend(_, renderOptions.css);
	var cssValue = sst.cssValue;

	var defStyle = sst.getStyle("default");

	debug && debug.log("section-title" + sys.inspect(sst.getStyle("section-title"), true, null));

	function format(expression, proto, res) {
		debug && debug.format && debug.log("format: " + expression);
		res = res || {};
		var value = expression && expression.replace(/\{(.*?)\}/g, function(match, p1) {
			debug && debug.format && debug.log("\tp1=" + p1 + ", res=" + res[p1] + ", data=" + data[p1] + ", proto=" + proto[p1] + ", baseProto=" + baseProto[p1]);
			return res[p1] || data[p1] || proto[p1] || baseProto[p1];
		});
		debug && debug.format && debug.log("format => " + value);
		return value;
	}

	function clone(options) {
		return Object.keys(options).reduce(function(obj, key) {
			obj[key] = options[key];
			return obj;
		}, {});
	}

	function fontRessource(fontFamily) {
		return (fontMap[fontFamily] && path.join(__dirname, 'fonts/' + fontMap[fontFamily])) || fontFamily;
		// return (fontMap[fontFamily] && path.join(__dirname, '../../../streamline-pdfkit/demo/fonts/' + fontMap[fontFamily])) || fontFamily
	}

	function createPdfDocument(_, options) {
		var doc = PdfDocument.create(_, options);
		doc.cx = {};
		doc.transparent = PdfDocument.create(_, options);

		doc.setColor = function(color) {
			if (color && color !== this.cx.color) {
				this.fillColor(color);
				this.cx.color = color;
			}
			return this;
		};

		doc.setFontStyle = function(_, style) {
			var font = style.font || {};
			// helpers.object.extend(font, defStyle.font, false, true);
			helpers.object.extend(font, defStyle.font);
			debug && debug.log("setFontStyle with" + JSON.stringify(font));
			if (font) {
				if (font.family && font.family !== this.cx.fontFamily) {
					var fontRes = fontRessource(font.family);
					debug && debug.log("setFont to " + fontRes);
					this.font(_, fontRes);
					this.cx.fontFamily = font.family;
				}
				if (font.size && font.size !== this.cx.fontSize) {
					this.fontSize(font.size);
					this.cx.fontSize = font.size;
				}
			}
			if (style.color) {
				this.fillColor(style.color);
				this.cx.color = style.color;
			}
		};

		doc.textLink = function(s, url, x, y, options) {
			if (!url) return this.text(s, x, y, options);
			var y0 = this.y;
			options = clone(options);
			var color = cssValue('link', 'color', 'blue');
			options.underlineColor = color;
			options.url = url;
			return this.fillColor(color).text(s, x, y, options).fillColor(this.cx.color);
		};

		doc.setFont = function(_, clas) {
			this.setFontStyle(_, sst.getStyle(clas));
			return this;
		};

		doc.computeTextRect = function(text, x, y, options) {
			this.transparent.text(text, x, y, options);
			return {
				x: this.transparent.x,
				y: this.transparent.y,
				width: this.transparent.width,
				height: this.transparent.height
			};
		};

		doc.computeImageRect = function(_, src, x, y, options) {
			this.transparent.image(_, src, x, y, options);
			return {
				x: this.transparent.x,
				y: this.transparent.y,
				width: this.transparent.width,
				height: this.transparent.height
			};
		};
		doc.anyRect = function(x, y, w, h, r) {
			// roundedRect with a zero radius has not the same rendering as rect
			if (r) {
				this.roundedRect(x, y, w, h, r);
			} else {
				this.rect(x, y, w, h);
			}
			return this;
		};
		return doc;
	}

	function setFontStyle(_, style) {
		doc.setFontStyle(_, style);
	}

	function getUrl(prop, val, res) {
		debug && debug.log("getUrl: " + val);
		if (prop.$format === '$email') return 'mailto:' + val;
		var url = prop.$links && prop.$links.$details && prop.$links.$details.$url;
		return url && format(url, proto, res);
	}

	function mapUrl(url) {
		return (url && /^http:.*/.test(url)) ? pageUrl + "?url=" + encodeURIComponent(url) : url;
	}

	function mapProperties(_, fn) {
		return Object.keys(proto.$properties).filter(function(name) {
			return name[0] !== '$';
		}).map_(_, function(_, name, i) {
			return fn && fn(_, proto.$properties[name], name, i);
		});
	}

	function toStr(val) {
		return val == null ? '' : val.toString();
	}

	function sum(vals) {
		return vals.reduce(function(result, w) {
			return result + w;
		}, 0);
	}

	function splitVal(str, url, split) {
		return split ? str.split(' ').map(function(s) {
			return {
				str: s,
				url: url
			};
		}) : [{
			str: str,
			url: url
		}];
	}

	function getImage(_, prop, val) {
		if (!val || !val.$url) return;
		debug && debug.image && debug.log("GET IMAGE: val=" + sys.inspect(val) + "\n, prop=" + sys.inspect(prop) + "\n, res=" + sys.inspect(res));
		var url = format(val.$url || prop.$url, prop, res || {});
		debug && debug.image && debug.log("LOADING IMAGE: url='" + url + "', data=" + val);
		var image = val.$data || (val.$data = ez.devices.http.client({
			url: url,
			headers: {
				cookie: context.httpSession.cookie,
				accept: "image"
			}

		}).end().response(_).readAll(_));
		debug && debug.image && fs.writeFile(".out/good.jpeg", image, _);
		return {
			str: '',
			url: val.$url,
			data: image,
		};
	}

	function segs(_, res, prop, name, split) {
		var val = res[name];
		// debug.log(name + ": " + prop.$type + " val=" + val)
		if (val == null) return [];
		switch (prop.$type) {
			case 'application/x-array':
				return (val || []).reduce(function(r, v, i) {
					var url = mapUrl(format(prop.$item.$url, prop.$item, v));
					var str = format(prop.$item.$value, prop.$item, v);
					return r.concat(splitVal(str, url, split));
				}, []);
			case 'application/x-reference':
				var url = mapUrl(format(prop.$links.$details.$url, prop, val));
				var str = format(prop.$value, prop, val);
				return splitVal(str, url, split);
			default:
				/*
            if ((val.$type || prop.$type).indexOf('image') >= 0) {
                var image = getImage(_, res, prop, val)
                image.width = (image.height = 3 * doc.currentLineHeight(true));
                return [image];
            }*/
				var url = mapUrl(getUrl(prop, val, res));
				val = val == null ? '' : val.toString();
				return splitVal(val, url, split);
		}
	}

	var boxId = 0;
	var Box = helpers.defineClass(

		function(parent, clas, meta, data, unbreakable) {
			// debug.log(clas + ": meta=" + meta.$type + "(" + meta.$title + "), data=" + data);
			this.parent = parent;
			this.clas = clas;
			this.meta = meta;
			this.data = data;
			this.unbreakable = unbreakable;
			this.style = sst.boxStyle(clas);
			// coordinates describe border (margin excluded).
			this.x = 0;
			this.y = 0;
			this.width = 0;
			this.height = 0;
			this.id = boxId++;
			this.ranges = {
				items: {},
			};
			debug && debug.box && debug.log("new Box: " + clas + "(" + this.id + ") < (" + (this.parent ? this.parent.ident : "null") + "), data=" + data + ", meta=" + meta + ", data.$title=" + (data ? data.$title : "") + ", meta.$title=" + (meta ? meta.$title : ""));
			// debug && debug.box && debug.log("new Box: " + clas + "(" + this.id + ")\n, data=" + sys.inspect(data) //
			// + "\n, meta=" + sys.inspect(meta) + "\n, data.$title=" + (data ? data.$title : "") //
			// + ", meta.$title=" + (meta ? meta.$title : ""));
		}, null, {
			traverse: function(_, visitor) {
				if (this.meta === 'application/x-string') {
					visitor.visitString && visitor.visitString(this);
				} else if (this.meta === 'image') {
					visitor.visitImage && visitor.visitImage(this);
				} else {
					visitor.visit && visitor.visit(this);
				}
				this.items && this.items.forEach_(_, function(_, b) {
					b.traverse(_, visitor);
				});
				return this;
			},
			place: function(parent, before, above) {
				// x,y define the top corner of the visible part
				this.parent = parent;
				this.before = before;
				this.above = above;
				debug && debug.box && debug.log("\tBox.place: this=" + this.ident + " '" + this.data + "', parent=" + (parent && parent.ident) + ", before=" + (before && before.ident) + ", above=" + (above && above.ident));
				if (before) {
					this.x = before.x + before.width + Math.max(before.style.margin.right, this.style.margin.left) - this.style.margin.left;
				} else {
					this.x = parent.x + parent.style.border.left.width + parent.style.padding.left;
				}
				if (above) {
					this.y = above.y + above.height + Math.max(above.style.margin.bottom, this.style.margin.top) - this.style.margin.top;
				} else {
					this.y = parent.y + parent.style.margin.top + parent.style.border.top.width;
				}
				this.x += this.style.margin.left;
				this.y += this.style.margin.top;

				if (debug && debug.box) {
					_logBox(this, "this", "\t\t");
					parent && _logBox(parent, "parent", "\t\t");
					before && _logBox(before, "before", "\t\t");
					above && _logBox(above, "above", "\t\t");
				}
				return this;
			},
			fill: function(_, outerWidth) {
				if (debug && debug.box) {
					debug.log("\tBox.fill: " + this.ident + ", outerWidth=" + outerWidth + ", data='" + this.data + "'");
					debug.log("\t\tbefore:");
					_logBox(this, "this", "\t\t\t");
					_logBox(this.parent, "parent", "\t\t\t");
					// debug.log("\t\t\ttransparent.rect={" + doc.transparent.x + "," + doc.transparent.y + "," + doc.transparent.width + "," + doc.transparent.height + "}");
				}
				this.setWidth(outerWidth);
				var style = this.style,
					border = style.border,
					padding = style.padding,
					stext = style.text,
					x = this.x + border.left.width + padding.left,
					y = this.y + border.top.width + padding.top,
					inner = this.inner,
					rect = {
						x: x,
						y: y,
						width: inner,
						height: 0
					};

				if (this.meta === 'application/x-string') {
					debug && debug.box && debug.log("\t\ttext:" + this.data + " at {" + x + "," + y + "}");
					setFontStyle(_, style);
					rect = doc.computeTextRect(this.data, x, y, {
						width: inner,
						align: (stext && stext.align) || 'left'
					});
				} else if (this.meta === 'image') {
					var image = this.data;
					if (image) {
						debug && debug.box && debug.log("\t\timage at {" + x + "," + y + "}, size={" + image.width + "," + image.height + "}");
						image.height = image.height || 3 * doc.currentLineHeight(true);
						image.width = image.width || image.height;
						rect = {
							x: x + image.width,
							y: y + image.height
						};
						// rect = doc.computeImageRect(_, image.data, x, y, {
						// 	fit: [image.width, image.height]
						// });
					}
				}
				// var bodySize = getBodySize(),
				var height = Math.max(this.height, rect.y - this.y + padding.bottom + border.bottom.width);
				if (this.y + height + style.margin.bottom > bodySize.height) {
					// this.breakReport();
					flushUntil(_, this);
					debug && debug.log("\t\tafter flushUntil: " + this.ident);
				}
				this.adjustHeight(height);
				if (debug && debug.box) {
					debug.log("\t\tafter:");
					debug.log("\t\ty=" + rect.y);
					_logBox(this, "this", "\t\t\t");
					_logBox(this.parent, "parent", "\t\t\t");
				}
				return this;
			},
			reset: function(_, placeOnly) {
				debug && debug.box && _logBox(this, "reset box", "\t\t\t");
				var outer = this.outer,
					p = this.parent,
					above = null,
					before = null;
				this.width = 0;
				this.height = 0;
				switch (p.layoutType) {
					case 'property':
						// should not be possible!
						break;
					case 'columns':
						above = p.title;
						break;
					case 'table':
						above = p.title;
						break;
					default:
						above = p.value || p.title;
						break;
				}

				if (this.layoutType === "table" && this.items.length) {
					// reset header place
					var header = this.items[0];
					debug && debug.box && _logBox(header, "reset header", "\t\t\t");
					delete header.ranges.items.start;
					delete header.ranges.items.end;
					header.place(this);
					debug && debug.box && _logBox(header, "reset header -> after", "\t\t\t");
				} else if (this.clas === "row") {
					debug && debug.box && _logBox(this, "reset row", "\t\t\t");
					delete this.ranges.items.start;
					delete this.ranges.items.end;
					above = p.items[0];
					debug && debug.box && _logBox(this, "reset row -> after", "\t\t\t");
				}
				this.place(p, before, above);
				if (!placeOnly) {
					this.fill(_, outer);
				}
				this.ranges.items.start = this.ranges.items.end;
				debug && debug.box && _logBox(this, "reset box -> after", "\t\t\t");
				return this;
			},
			ident: {
				get: function() {
					return "" + this.clas + "(" + this.id + ")";
				}
			},
			inner: {
				get: function() {
					var border = this.style.border;
					var padding = this.style.padding;
					// margins are already substracted from the width
					return this.width - border.left.width - padding.left - padding.right - border.right.width;
				}
			},
			innerRect: {
				get: function() {
					var border = this.style.border;
					var padding = this.style.padding;
					// margins are already substracted from the width
					return {
						width: this.width - border.left.width - padding.left - padding.right - border.right.width,
						height: this.height - border.top.width - padding.top - padding.bottom - border.bottom.width
					};
				}
			},
			outer: {
				get: function() {
					var margin = this.style.margin;
					return this.width + margin.left + margin.right;
				}
			},
			rootBox: {
				get: function() {
					return this.parent == null ? this : this.parent.rootBox;
				}
			},
			// $resource: {
			// 	get: function() {
			// 		return this.resource == null && this.parent != null ? this.parent.$resource : this.resource;
			// 	}
			// },
			getBoxPath: function() {
				var path = [];
				for (var b = this.parent; b != null; b = b.parent) {
					// path.push({
					path.unshift({
						box: b
					});
				}
				return path;
			},
			setWidth: function(outerWidth) {
				var margin = this.style.margin;
				this.width = outerWidth - margin.left - margin.right;
			},
			adjustHeight: function(h) {
				this.height = h;
				var p = this.parent;
				if (p) {
					var border = p.style.border,
						padding = p.style.padding;
					p.adjustHeight(Math.max(p.height, (this.y + h + this.style.margin.bottom - p.y + padding.bottom + border.bottom.width)));
				}
			},
			setInnerHeight: function(last) {
				var border = this.style.border;
				var padding = this.style.padding;
				if (last) {
					this.height = last.y + last.height - this.y;
				} else {
					this.height = border.top.width + padding.top;
				}
				this.height += padding.bottom + border.bottom.width;
			},
			draw: function(_, state) {
				var stop = false;
				state = state || {};
				if (debug && debug.box) {
					debug.log("Box.draw: " + this.ident);
				}
				if (state.until === this) {
					debug && debug.box && debug.log("\tuntil reached..");
					return false;
				}
				if (doc.pendingBreak) {
					debug && debug.box && debug.log("\tadd page...");
					doc.addPage();
					doc.pendingBreak = false;
				}
				// debug && debug.box && debug.log("\tBox.draw:  this=" + this.ident + " '" + this.data + "'");
				var bg = this.style.background,
					border = this.style.border,
					padding = this.style.padding,
					stext = this.style.text,
					bw = border.top.width,
					bc = border.top.color;
				// if (debug && debug.box) {
				// 	debug.log("\tborder=" + JSON.stringify(border));
				// }
				doc.lineWidth(bw);
				bg && bg.color && doc.anyRect(this.x, this.y, this.width, this.height, border.radius).fill(bg.color);
				// TODO: manage borders with diffrent width
				if (bc && (bw || border.bottom.width || border.left.width || border.right.width)) {
					if (bw === border.bottom.width && bw === border.left.width && bw === border.right.width && //
						bc === border.bottom.color && bc === border.left.color && bc === border.right.color) {
						doc.anyRect(this.x, this.y, this.width, this.height, border.radius).stroke(bc);
					}
				}
				var x = this.x + border.left.width + padding.left,
					y = this.y + border.top.width + padding.top,
					inner = this.inner;

				// Background image
				if (bg && bg.image) {
					var url = /url\('(.*)'\)/.exec(bg.image)[1];
					debug && debug.box && debug.log("background: " + bg.image + ", url=" + url);
					if (url) {
						var image = ez.devices.http.client({
							url: url,
							headers: {
								cookie: context.httpSession.cookie,
								accept: "image"
							}
						}).end().response(_).readAll(_);
						debug && debug.image && image && fs.writeFile(".out/background.png", image, _);
						var rect = this.innerRect;
						image && doc.image(_, image, x, y, {
							fit: [rect.width, rect.height]
						});
					}
				}
				if (this.meta === 'application/x-string') {
					debug && debug.box && debug.log("\ttext:" + this.data + " at {" + x + "," + y + "}");
					setFontStyle(_, this.style);
					doc.text(this.data, x, y, {
						width: inner,
						align: (stext && stext.align) || 'left'
					});
				} else if (this.meta === 'image') {
					var image = this.data;
					if (image) {
						debug && debug.box && debug.log("\t\tdraw image: '" + image.url + "'' at {" + x + "," + y + "}, size={" + image.width + "," + image.height + "}");
						doc.image(_, image.data, x, y, {
							fit: [image.width, image.height]
						}).link(x, y, image.width, image.height, image.url);
					}
				}
				if (debug && debug.box) {
					_logBox(this, "box", "\t\t");
				}

				stop = stop || (this.title && !this.title.draw(_, state));
				stop = stop || (this.value && !this.value.draw(_, state));
				stop && debug && debug.box && debug.log("\tStopped at " + this.ident);

				if (!stop && this.items) {
					// a bit tricky, but the header need to be drawn and currently is the first item of the array
					// we probably need to review this!
					// if (this.latoutType === "table" && this.ranges && this.ranges.items && this.ranges.items.start > 0) {
					if (this.layoutType === "table") {
						debug && debug.box && debug.log("\t\t\tdraw header");
						this.items[0].draw(_, state);
					}
					stop = !this.every(_, "items", function(_, b, i) {
						return b.draw(_, state);
					});
					stop && debug && debug.box && debug.log("\tStopped in items loop at " + this.ident);
				}

				return !stop;
			},
			every: function(_, name, cb) {
				var a = name && this[name],
					range = a && this.ranges[name];
				if (a) {
					var end = (range.end + 1) || a.length;
					a = a.slice(range.start, end);

					debug && debug.box && debug.log("every: [" + range.start + ", " + end + "]=" + a.map(function(b) {
						return b.ident;
					}));
					return a.every_(_, cb);
				}
				return false;
			},
			toString: function() {
				var self = this;
				return '{' + Object.keys(self).map(function(k) {
					return k + ': ' + (Array.isArray(self[k]) ? '[' + self[k].length + ']' : self[k]);
				}) + '}';
			}
		});

	function buildBox(parent, article, meta, data, clas, title) {
		if (debug && debug.buildBox) {
			debug.log("buildBox: data=" + data + ", meta=" + meta + ", class=" + clas + ", data.$title=" + (data ? data.$title : "") + ", article.$title=" + article.$title + ", meta.$title=" + (meta ? meta.$title : ""));
			// debug.log("\tarticle=" + JSON.stringify(article));
		}
		clas = clas || article.$category || (article.$bind ? 'property' : 'layout');
		if (!article.$isTitleHidden) {
			if (title && typeof(title) === 'object') {
				title = title.$title;
			} else {
				title = (clas === 'layout') ? null : title || (data && data.$title) || article.$title || (meta && meta.$title);
			}
		}
		var box = new Box(parent, clas, meta, data);
		if (debug && debug.displayBoxId) {
			title = box.ident;
		}
		if (title) {
			title = localizedText(title);
			box.title = new Box(box, clas + '-title', 'application/x-string', title, true);
		}
		var items = article.$items || (article.$layout && article.$layout.$items);
		if (article.$bind) {
			box.layoutType = items ? 'table' : 'property';
			box.bind = article.$bind;
		} else {
			box.layoutType = article.$layoutType || "stack";
			box.layoutSubType = article.$layoutSubType;
		}
		if (debug && debug.buildBox) {
			debug.log("\tlayoutType=" + box.layoutType + ", titleText='" + title + "'");
			// _logBox(box, "box", "\t");
			// _logBox(box.title, "title", "\t");
			// debug.log("\titems=" + JSON.stringify(items));
			debug.log("\titerate " + box.ident + " items ...");
		}

		var child = box;
		if (box.layoutType === 'table') {
			child = new Box(box, 'header', box.meta, box.data);
			box.items = [child];
		}

		child.items = items && items.map(function(item) {
			var m = meta;
			if (box.layoutType === 'table') {
				m = m.$item;
			}
			m = (m.$properties && item.$bind) ? m.$properties[item.$bind] : m;
			var d = (data && item.$bind) ? data[item.$bind] : data;
			if (m && m.$url && d && !d.$url) {
				d.$url = format(m.$url, meta, data);
			}
			debug && debug.buildBox && debug.log("\t\titerate " + child.ident + ", meta=" + m + ", data=" + d);
			return buildBox(box, item, m, d);
		});
		if (debug && debug.buildBox) {
			debug.log("\tend iterate " + box.ident);
			debug.log("\titems=" + (box.items && box.items.map(function(b) {
				return b.ident;
			})));
			debug.log("\tend buildBox " + box.ident);
		}
		return box;
	}

	function localizedText(val) {
		return val && val.replace(/\{(@[\w-]+)\}/g, function(match, p1) {
			return (baseProto.$localization && baseProto.$localization[p1]) || match;
		});
	}

	function objText(val, prop) {
		debug && debug.format && debug.log("objText: val=" + sys.inspect(val) + "\n, prop=" + sys.inspect(prop));
		var type = prop && prop.$type;
		switch (type) {
			case 'application/json':
				return '[application/json]';
			default:
				return prop && prop.$value ? format(prop.$value, proto, val) : (val != null ? val.toString() : '');
		}
	}

	function titleBox(_, box) {

	}

	function valueBox(_, box) {
		var prop = box.meta;
		var val = box.data;
		var type = 'application/x-string';
		debug && debug.valueBox && debug.log("valueBox: type=" + (prop ? prop.$type : "undefined") //
			+
			"\nval=" + sys.inspect(val));
		// debug && debug.valueBox && debug.log("valueBox: " + sys.inspect(box));
		if (val != null && prop) {
			switch (prop.$type) {
				case 'application/x-choice':
					val = val.toString();
					prop.$value.$enum.some(function(e, i, a) {
						if (e.$value === val) {
							val = e.$title;
							return true;
						}
						return false;
					});
					break;
				case 'application/x-string':
				case 'application/x-integer':
				case 'application/x-decimal':
				case 'application/x-boolean':
					val = val.toString();
					break;
				case 'application/x-date':
					val = date.parse(val).toString(glob.context.localePreferences.shortDate);
					break;
				case 'application/x-datetime':
					val = datetime.parse(val).toString(glob.context.localePreferences.shortDatetime);
					break;
				case 'application/x-time':
					val = time.parse(val).toString(glob.context.localePreferences.shortTime);
					break;
				case 'application/x-array':
					return tableBox(_, box, val, prop);
					break;
				case 'application/x-reference':
					val = objText(val, prop.$item);
					break;
				case 'application/x-graph':
					// TODO: get a snapshot if possible
					val = null;
					break;
				case 'image':
					type = 'image';
					val = val.$url ? getImage(_, prop, val) : null;
					break;
				default:
					val = prop.$type;
			}
			debug && debug.valueBox && debug.log("valueBox: val=" + val);
			return val != null ? new Box(box, 'property-value', type, val, true) : null;
		}
	}

	function tableBox(_, box, items, proto) {
		items = items || [];
		var meta = proto.$item;
		if (meta && meta.$type !== 'application/json') {
			var val = items.map(function(v) {
				return objText(v, meta);
			});
			return val != null ? new Box(box, 'property-value', 'application/x-string', val, true) : null;
		}
		return new Box(box, 'property-value', 'application/x-string', '[application/json]', true);

		var data = box.data || (box.parent && box.parent.data);
		var table = new Box(box, 'property-value', box.meta, data);
		table.layoutType = "table";
		var header = new Box(table, 'header', table.meta, data, true);
		table.items = [header];
		header.items = [];

		var $fields = (meta && meta.$properties) || {};
		debug && debug.valueBox && debug.log("tableBox: " + box.ident);
		// iterate keys to create header columns
		var $binds = Object.keys($fields).forEach(function($bind) {
			var $field = $fields[$bind];
			$field && !$field.$isHidden && header.items.push(new Box(header, 'cell', $field.$type, $field.$title), true);
			debug && debug.valueBox && debug.log("\t$field$[" + $bind + "]=" + sys.inspect($field));
		});
		// iterate values to create rows
		var rows = items.map_(_, function(_, r) {
			// data = r;
			var row = new Box(table, 'row', meta, r);
			// header.items are column's header
			debug && debug.log("create row: " + sys.inspect(r));
			row.items = header.items.map_(_, function(_, col) {
				var prop = col.meta;
				debug && debug.log("create cell: " + col.bind + ", " + sys.inspect(r[col.bind]));
				var cell = new Box(row, 'cell', prop, r[col.bind], true);
				cell.value = valueBox(_, cell);
				return cell;
			});
			row.ranges.items.end = row.items.length - 1;
			return row;
		});
		// var val = items.forEach(function(v) {
		// 	var row =
		// 	return objText(v, proto.$item);
		// });
		return table;
	}

	function computeBox(_, box) {
		if (debug && debug.computeBox) {
			debug.log("computeBox: " + box.ident + ", inner=" + box.inner + ", layoutType=" + box.layoutType + ", layoutSubType=" + box.layoutSubType);
		}
		var style = box.style;
		var inner = box.inner;
		switch (box.layoutType) {
			case 'property':
				box.title && box.title.place(box).fill(_, box.title.style.width);
				box.value = valueBox(_, box);
				box.value && box.value.place(box, box.title, null).fill(_, inner - (box.title ? box.title.style.width : 0));
				break;
			case 'columns':
				box.title && box.title.place(box).fill(_, inner);
				var widths = box.layoutSubType.split(',').map(function(s) {
					return parseInt(s, 10);
				});
				var total = Math.max(1, sum(widths));
				if (debug && debug.computeBox) {
					debug.log("\t columns: widths=" + widths + ", total=" + total);
				}
				var prev = null;
				widths.forEach_(_, function(_, w, i) {
					box.ranges.items.end = i;
					var b = box.items[i];
					if (!b) b = new Box(box, 'layout');
					b.place(box, prev, box.title).fill(_, inner * w / total);
					prev = b;
					computeBox(_, b);
				});
				break;
			case 'table':
				box.title && box.title.place(box).fill(_, inner);
				var resources = box.data || [];
				var m = box.meta.$item;

				var header = box.items[0];
				// Trivial partitioning of boxes. See later if we can be smarter.
				var count = header.items.length;
				header.ranges.items.end = count - 1;

				if (debug && debug.computeBox) {
					debug.log("\tcompute table box:");
					debug.log("\t\tressources=" + JSON.stringify(resources));
					debug.log("\t\tmeta=" + JSON.stringify(m));
					debug.log("\t\count=" + count);
				}

				// create data rows
				dataStack.push(data);
				var rows = resources.map_(_, function(_, r) {
					data = r;
					var row = new Box(box, 'row', m, r);
					// header.items are column's header
					// debug && debug.log("create row: " + sys.inspect(r))
					row.items = header.items.map_(_, function(_, col) {
						var prop = col.meta;
						// debug && debug.log("create cell: " + col.bind + ", " + sys.inspect(r[col.bind]))
						var cell = new Box(row, 'cell', prop, r[col.bind], true);
						cell.value = valueBox(_, cell);
						return cell;
					});
					row.ranges.items.end = row.items.length - 1;
					return row;
				});
				data = dataStack.pop();

				var prev = null,
					tallest = null,
					last = box.title,
					above = box.title;

				if (debug && debug.computeBox) {
					debug.log("\t\tplace header");
				}
				header.place(box);
				var w = inner / count;

				if (debug && debug.computeBox) {
					debug.log("\t\tcompute row headers");
				}
				// row headers
				header.items.forEach_(_, function(_, cell) {
					cell.place(header, prev, above).fill(_, w);
					cell.title && cell.title.place(cell).fill(_, cell.inner);
					tallest = tallest && tallest.height > cell.height ? tallest : cell;
					prev = cell;
				});
				header.items.forEach(function(cell) {
					cell.adjustHeight(tallest.height);
				});
				last = tallest || last;

				var prevRow = header;
				if (debug && debug.computeBox) {
					debug.log("\t\tcompute data rows");
				}

				// data rows
				rows.forEach_(_, function(_, row, i) {
					box.items.push(row);
					box.ranges.items.end = i + 1; // +1 for header
					// above = tallest;
					prev = null;
					tallest = null;

					row.place(box, null, prevRow);
					prevRow = row;
					row.items.forEach_(_, function(_, cell, i) {
						cell.place(row, prev, null).fill(_, w);
						cell.value && cell.value.place(cell).fill(_, cell.inner);
						tallest = tallest && tallest.height > cell.height ? tallest : cell;
						prev = cell;
					});
					row.items.forEach(function(cell) {
						cell.adjustHeight(tallest.height);
					});
					last = tallest || last;
				});
				break;
			default:
				// stack layout
				var above = null,
					tallest = null;

				above = (box.title && box.title.place(box, null, above).fill(_, inner)) || above;
				above = (box.value && box.value.place(box, null, above).fill(_, inner)) || above;
				box.items && box.items.forEach_(_, function(_, b, i) {
					box.ranges.items.end = i;
					b.place(box, null, above);
					b.setWidth(inner);
					debug && debug.box && _logBox(b, "\tb");
					computeBox(_, b);
					above = b;
				});
				box.setInnerHeight(above);
				break;
		}
	}

	function flushUntil(_, box) {
		var rootBox = box.rootBox;
		var container = box;
		while (container.unbreakable) container = container.parent;
		var boxPath = box.getBoxPath();
		if (debug && debug.box) {
			debug.log("\tflushUntil");
			_logBox(box, "\ttargetBox", "\t\t");
			debug.log("\t\tunbreakable=" + box.unbreakable);
			_logBox(container, "\tcontainer", "\t\t");
			_logBox(rootBox, "\trootBox", "\t\t");
			debug.log("\t\tboxPath=" + boxPath.map(function(b) {
				return b.box.ident;
			}));
		}
		rootBox.height = getBodySize().height;
		rootBox.draw(_, {
			until: container
		});
		// reset parents
		debug && debug.box && debug.log("\t\treset chain: boxPath=" + boxPath.map(function(b) {
			return b.box.ident;
		}));
		var p = rootBox;
		p.ranges.items.start = p.ranges.items.end;
		debug && debug.box && _logBox(rootBox, "reset rootBox", "\t\t\t");
		var boxes = boxPath.slice(1);
		boxes.forEach_(_, function(_, b) {
			b.box.reset(_);
		});
		box.place(box.parent);
		debug && debug.box && _logBox(box, "reset targetBox", "\t\t\t");
		debug && debug.box && debug.log("\tend flushUntil");
		doc.pendingBreak = true;
	}

	function measureMin(str) {
		return str.split(' ').reduce(function(w, s) {
			return Math.max(w, doc.widthOfString(s + ' '));
		}, 0);
	}

	function getBodySize() {
		return {
			width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
			height: doc.page.height - doc.page.margins.top - doc.page.margins.bottom
		};
	}

	try {
		var bodySize = getBodySize();
		var pageStyle = sst.boxStyle("page");
		debug && debug.log("********* Building PDF **********");
		var title = format(data.$description || proto.$description || data.$title || proto.$title, proto, data);
		// doc.lineWidth(pageStyle.border.top.width);
		// debug && doc.anyRect(doc.page.margins.left, doc.page.margins.top, bodyWidth, bodyHeight, pageStyle.border.radius).stroke(pageStyle.border.top.color);
		var res = data;
		var rootBox = buildBox(null, proto.$article, proto, res, 'page', title);
		rootBox.x = doc.x;
		rootBox.y = doc.y;
		rootBox.width = bodySize.width;
		computeBox(_, rootBox);
		rootBox.height = bodySize.height;
		debug && debug.box && debug.log("Final draw");
		rootBox.draw(_);
	} catch (ex) {
		doc.setFont(_, 'error').text(ex.safeStack);
	}
	doc.save();
	debug && debug.output && debug.output.pdf && doc.write(".out/" + debug.output.pdf);
	return doc.output(_);
};
/*if (false && data.$resources) {
            setFont(_, 'page-title').text(title, {
                align: cssValue('page-title', 'text-align', 'center')
            });
            doc.moveDown().fontSize(10);

            proto = proto.$properties.$resources.$item;
            setFont(_, 'column-title');
            // note: always measure words with trailing space because this is how pdfkit's word wrap cuts them.
            // otherwise longuest word gets shifted one line down
            var minWidths = mapProperties(_, function(_, prop, name, i) {
                return measureMin(prop.$title);
            });
            var maxWidths = mapProperties(_, function(_, prop, name, i) {
                return doc.widthOfString(prop.$title + ' ');
            });
            var maxWidths = minWidths.slice(0);
            var n = 1;
            setFont(_, 'column-value');
            data.$resources.forEach_(_, function(_, res) {
                //debug.log(res);
                mapProperties(_, function(_, prop, name, i) {
                    segs(_, res, prop, name, true).forEach(function(seg) {
                        minWidths[i] = Math.max(minWidths[i], seg.width || doc.widthOfString(seg.str + ' '));
                    });
                    segs(_, res, prop, name, false).forEach(function(seg) {
                        maxWidths[i] = Math.max(maxWidths[i], seg.width || doc.widthOfString(seg.str + ' '));
                    });
                });
                n++;
            });

            // here: get css extra size info            
            var dw = 0,
                dh = 2;
            var minSum = sum(minWidths);
            var maxSum = sum(maxWidths);
            bodyWidth = Math.min(bodyWidth, maxSum + n * dw);
            var avail = Math.max(bodyWidth - minSum - n * dw, 0);
            var widths = minWidths.map(function(w, i) {
                return w + avail * (maxWidths[i] - minWidths[i] + 1) / (maxSum - minSum + 1);
            })
            var totalWidth = sum(widths);
            //debug.log("minWidths=" + minWidths.join(' '))
            //debug.log("maxWidths=" + maxWidths.join(' '))
            //debug.log("avail=" + avail)
            //debug.log("widths=" + widths.join(' '))
            doc.scale(bodyWidth / totalWidth);
            //doc.transform(1, 1, 0, 1, 0, 0).translate(10, 20).transform(1, 0, 0, 1.5, 0, 0).scale(0.8).transform(1, -1, 0, 1, 0, 0);
            setFont(_, 'column-title');
            var x0 = doc.x,
                y0 = doc.y,
                y1 = y0,
                y2 = y0,
                x = x0;
            doc.x = x0;
            mapProperties(_, function(_, prop, name, i) {
                doc.text(prop.$title, x, y0, {
                    width: widths[i],
                    align: 'left'
                });
                x += widths[i] + dw;
                y1 = Math.max(y1, doc.y);
            });
            setFont(_, 'column-value');
            data.$resources.forEach_(_, function(_, res, i) {
                doc.strokeColor('#ddd').lineWidth(i ? 1 : 2).moveTo(x0, y1).lineTo(x0 + totalWidth, y1).stroke();
                y1 += dh;
                x = x0, y2 = y1;
                mapProperties(_, function(_, prop, name, i) {
                    segs(_, res, prop, name, false).forEach_(_, function(_, seg) {
                        //doc.y = y1;
                        if (seg.data) {
                            //debug.log("IMAGE: " + seg.data.length + ", url=" + seg.url);
                            doc.image(_, seg.data, x, y1, {
                                fit: [seg.width, seg.height]
                            }).link(x, y1, seg.width, seg.height, seg.url);
                            y2 += seg.height;
                        } else {
                            //debug.log("drawing " + seg.str + " at " + x + " " + y1)
                            doc.textLink(seg.str, seg.url, x, y1, {
                                width: widths[i],
                                align: 'left'
                            });
                        }
                    });
                    x += widths[i] + dw;
                    y2 = Math.max(y2, doc.y);

                });
                y1 = y2;
            });
        } else {*/