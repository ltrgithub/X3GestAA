"use strict";

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var config = require('config'); // must be first syracuse require
	var port = (config.unit_test && config.unit_test.serverPort) || 3004;
	var baseUrl = "http://localhost:" + port;

	var fs = require('streamline-fs');
	var ez = require('ez-streams');
	var helpers = require('@sage/syracuse-core').helpers;
	var aspect = require('../fixtures/aspect');
	var types = require('@sage/syracuse-core').types;
	var pdfRenderer = require('../../../src/sdata/render/pdf');
	var sys = require("util");
	var forEachKey = helpers.object.forEachKey;

	var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
	var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

	var tracer; // = console.log;
	var roundedRectCalled;

	var context = {
		request: {
			headers: {
				referer: ''
			}
		},
		httpSession: {
			cookie: ''
		}
	};

	function link(desc, url) {
		return '<a href="' + url + '" target="_blank">' + desc + '</a>';
	}

	var db;
	it('cookie', function(_) {
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//
		context.httpSession.cookie = testAdmin.getCookie(_, baseUrl, "admin", "admin");
		ok(context.httpSession.cookie && context.httpSession.cookie.length > 0, "cookie ok");

	});

	it(link("full page user", "/syracuse-sdata/test/server/output/user_full.pdf"), function(_) {
		var name = "user_full",
			rep = _load("user", _);
		rep.proto.$article = _loadArticle(name, _);

		ok(rep.data != null, "data not null");
		equal(rep.data.login, "erbou", "login ok");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");
		delete context.pdfReport;
		var options = {
			// debug: {
			// 	format: true,
			// 	image: true,
			// 	box: true,
			// 	buildBox: true,
			// 	computeBox: true,
			// 	valueBox: true
			// },
			css: {
				// "default": {
				// 	font: {
				// 		size: 9,
				// 		family: "Helvetica"
				// 		// family: "DejaVuSans"
				// 	}
				// },
				page: {
					background: {
						image: "url('http://localhost:8124/syracuse-sdata/lib/render/images/sage-banner.png')",
						// image: "url('http://localhost:8124/syracuse-sdata/lib/render/images/bg_lightGreen.3698.jpg')",
						// size: "80 60",
						// position: "center"
					}
				},
				block: {
					background: {
						image: "url('http://localhost:8124/syracuse-sdata/lib/render/images/Koala-watermark.png')",
					}

				}
			}
		};
		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto, options);
		_writePdf(pdf, name, _);

	});

	it(link("2 pages user", "/syracuse-sdata/test/server/output/2_pages_user_full.pdf"), function(_) {
		var name = "2_pages_user_full",
			rep = _load("user", _);
		rep.proto.$article = _loadArticle(name, _);

		ok(rep.data != null, "data not null");
		equal(rep.data.login, "erbou", "login ok");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");
		delete context.pdfReport;
		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto);
		_writePdf(pdf, name, _);

	});

	it(link("user list on a single page", "/syracuse-sdata/test/server/output/user_list.pdf"), function(_) {
		var name = "user_list",
			rep = _load("user_list", _);
		rep.proto.$article = _loadArticle(name, _);

		ok(rep.data != null, "data not null");
		ok(rep.data.$resources.length > 0, "$resources array not empty");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");
		var options = {
			// 	debug: {
			// 		format: true,
			// 		image: true,
			// 		box: true,
			// 		buildBox: true,
			// 		computeBox: true,
			// 		valueBox: true,
			// 	}
		};

		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto, options);
		_writePdf(pdf, name, _);

	});

	it(link("user list on several pages", "/syracuse-sdata/test/server/output/user_list_more_pages.pdf"), function(_) {
		var name = "user_list",
			rep = _load("user_list", _);
		rep.proto.$article = _loadArticle(name, _);

		ok(rep.data != null, "data not null");
		ok(rep.data.$resources.length > 0, "$resources array not empty");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");

		// duplicate users
		rep.data.$resources.forEach(function(e, i, a) {
			for (var n = 1; n <= 20; n++) {
				var user = helpers.object.clone(e, true);
				// user.$key = user.$uuid = helpers.uuid.generate();
				user.login += n;
				a.push(user);
			}
		});

		var options = {
			// 	debug: {
			// 		format: true,
			// 		image: true,
			// 		box: true,
			// 		buildBox: true,
			// 		computeBox: true,
			// 		valueBox: true,
			// 	}
		};
		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto);
		_writePdf(pdf, name + "_more_pages", _);

	});

	it(link("unicode string", "/syracuse-sdata/test/server/output/unicode_string.pdf"), function(_) {
		var name = "unicode_string",
			rep = _load("unicode_string", _);
		ok(rep.data != null, "data not null");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");
		// var unicode = getUnicodeString();
		// 		var unicode = "\
		// 00a0-00cf: ¡¢£¤¥¦§¨©ª«¬-®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ\n\
		// 00d0-00ff:ÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿn\
		// 0100-01ff:ĀāĂăĄą";
		// €àâäéèêëîïôöùûü§º
		var unicode = "\
00a0-00cf: ...........ÈÉÊËÌÍÎÏ\n\
00d0-00ff:ÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ\n";
		// 00a0-00cf: ¡¢£¤¥¦§¨©ª«¬-®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ\n\
		// 00d0-00ff:ÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ\n\
		// 0100-01ff:ĀāĂăĄą";
		unicode = "00a0-00ff: ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ";
		rep.data = {
			// "unicode": " ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƠơƢƣƤƥƦƧƨƩƪƫƬƭƮƯưƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǄǅǆǇǈǉǊǋǌǍǎǏǐǑǒǓǔǕǖǗǘǙǚǛǜǝǞǟǠǡǢǣǤǥǦǧǨǩǪǫǬǭǮǯǰǱǲǳǴǵǶǷǸǹǺǻǼǽǾǿ"
			unicode: unicode
		};

		var path = __dirname + "/output";
		try {
			var stats = fs.stat(path, _);
		} catch (e) {
			if (e.code === 'ENOENT') fs.mkdir(path, undefined, _);
		}
		fs.writeFile(path + "/" + name + ".txt", unicode, _);

		var options = {
			// 	debug: {
			// 		// output: {
			// 		// 	pdf: "pdf_report.pdf",
			// 		// 	data: "pdf_data.json",
			// 		// 	proto: "pdf_proto.json",
			// 		// }
			// 	},
			// 	css: {
			// 		"default": {
			// 			font: {
			// 				size: 9,
			// 				// family: "Helvetica"
			// 				family: "DejaVuSans"
			// 			}
			// 		}
			// 	}
		};
		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto, options);
		_writePdf(pdf, name, _);

	});

	it(link("unicode char table", "/syracuse-sdata/test/server/output/unicode_table.pdf"), function(_) {
		var name = "unicode_table",
			rep = _load("unicode_table", _);
		// rep.proto.$article = _loadArticle(name, _);
		ok(rep.data != null, "data not null");
		ok(rep.data.$resources.length > 0, "$resources array not empty");
		ok(rep.proto != null, "proto not null");
		equal(rep.proto.$type, "application/json", "proto $type is application/json");
		var options = {
			// 	debug: {
			// 		output: {
			// 			pdf: "pdf_report.pdf",
			// 			data: "pdf_data.json",
			// 			proto: "pdf_proto.json",
			// 		}
			// 	}
		};
		var pdf = pdfRenderer.render(_, context, rep.data, rep.proto);
		_writePdf(pdf, name, _);

	});

	function getUnicodeString() {
		var cstart = 0x00a0;
		var cend = 0x0200;
		var unicode;
		// var cend = 0x0100;
		for (var i = cstart; i < cend; i++) {
			if ((i - cstart) % 48 == 0) {
				unicode += (i == cstart ? "" : "\n") + ("00" + i.toString(16)).slice(-4) + "-" + ("00" + (i + 47).toString(16)).slice(-4) + ":";
			}
			// if ([0x00AD,0x00EC,0x00ED,0x00EE,0x00EF].some(function(e) {
			// 	return e === i;
			// })) {
			// 	unicode += String.fromCharCode(0x007E);
			// } else {
			unicode += String.fromCharCode(i);
			// }
		}
		return unicode;
	}

	var current = {};

	function _load(name, _) {
		current[name] = current[name] || {
			proto: JSON.parse(fs.readFile(__dirname + "/resources/" + name + "_proto.json", 'utf8', _)),
			data: JSON.parse(fs.readFile(__dirname + "/resources/" + name + "_data.json", 'utf8', _))
		};

		return current[name];
	}

	function _loadArticle(name, _) {
		return JSON.parse(fs.readFile(__dirname + "/resources/" + name + "_article.json", 'utf8', _));
	}

	function _writePdf(pdf, name, _) {
		var path = __dirname + "/output";
		// var exists = fs.exists(path, _);
		try {
			var stats = fs.stat(path, _);
		} catch (e) {
			if (e.code === 'ENOENT') fs.mkdir(path, undefined, _);
		}
		fs.writeFile(path + "/" + name + ".pdf", pdf, 'binary', _);
	}

	function LayoutBuilder() {
		this.items = [];
		this.layout = {
			$layout: {
				$items: this.items
			}
		};
	};

	exports.LayoutBuilder = helpers.defineClass(LayoutBuilder, null, {
		appendSection: function(items) {
			items = items || this.items;
			this.items = [];
			items.push({
				$category: "section",
				$layout: {
					$items: this.items
				}
			});
			return this;
		},
		appendLayout: function(layoutType, layoutSubType, items) {
			items = items || this.items;
			this.items = [];
			items.push({
				$layoutType: layoutType,
				$layoutSubType: layoutSubType,
				$items: this.items
			});
			return this;
		},
		appendBlock: function(title, items) {
			items = items || this.items;
			this.items = [];
			items.push({
				$title: title,
				$category: "block",
				$layout: {
					$items: this.items
				}
			});
			return this;
		},
		addProperty: function(bind, options, items) {
			items = items || this.items;
			var prop = options || {};
			prop.$bind = bind;
			items.push(prop);
			return this;
		},
	});

	function _inject() {
		var PdfDocument = require('streamline-pdfkit');
		aspect.around(PdfDocument, ["roundedRect", "text", "fillColor", "lineWidth", "widthOfString", "currentLineHeight"], function(
			context, args, result) {
			if (context.pointCut === "before") {
				tracer("before " + context.name + " [" + args + "]");
			} else {
				tracer("after " + context.name + " ==> " + result);
			}
		});
	}
});