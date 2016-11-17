"use strict";

var helpers = require('@sage/syracuse-core').helpers;
// must be first syracuse require
var config = require('config');
var stylesheet = require('syracuse-sdata/lib/render/stylesheet');
var tracer; // = console.log;

var sys = require("util");

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('Default Style Sheet', function(_) {
		var sst = stylesheet.create(_, null);
		ok(sst != null, "Default style definition not null");
		ok(sst.getStyle("default") != null, "default style not null");
		ok(sst.getStyle("page") != null, "page style not null");
		ok(sst.getStyle("section") != null, "section style not null");
		ok(sst.getStyle("section-title") != null, "section-title style not null");
		ok(sst.getStyle("block") != null, "block style not null");
		ok(sst.getStyle("block-title") != null, "block-title style not null");
		ok(sst.getStyle("property-title") != null, "property-title style not null");
		ok(sst.getStyle("property-value") != null, "property-value style not null");
		ok(sst.getStyle("table") != null, "table style not null");
		ok(sst.getStyle("column") != null, "column style not null");
		ok(sst.getStyle("cell") != null, "cell style not null");
		ok(sst.getStyle("column-title") != null, "column-title style not null");
		ok(sst.getStyle("column-value") != null, "column-value style not null");
		ok(sst.getStyle("link") != null, "link style not null");
		ok(sst.getStyle("error") != null, "error style not null");

	});

	it('Extend Style', function(_) {
		var sst = stylesheet.create(_, null);
		ok(sst != null, "Default style definition not null");
		var css = {
			// "default": {
			// 	font: {
			// 		size: 9,
			// 		// family: "Helvetica"
			// 		family: "DejaVuSans"
			// 	}
			// },
			page: {
				background: {
					image: "url('http://localhost:8124/syracuse-sdata/lib/render/images/sage-banner.png')",
					size: "80 60",
					position: "center"
				}
			},
			"page-title": {
				padding: {
					top: 10
				},
			}
		};
		var pageDef = helpers.object.clone(sst.boxStyle("page"), true);
		var pageTitleDef = helpers.object.clone(sst.boxStyle("page-title"), true);
		var sst2 = sst.extend(_, css);
		ok(sst === sst2, "object returned by extend is equal to self object");
		var page = sst.boxStyle("page");
		var pageTitle = sst.boxStyle("page-title");
		// tracer && tracer("pageTitleDef=" + sys.inspect(pageTitleDef, false, 10));
		// tracer && tracer("pageTitle=" + sys.inspect(pageTitle, false, 10));
		equal(page.background.image, "url('http://localhost:8124/syracuse-sdata/lib/render/images/sage-banner.png')", "background image");
		equal(page.background.position, "center", "background center");
		equal(page.background.size, "80 60", "background size");

		equal(pageTitle.padding.top, 10, "page-title padding");
		equal(pageTitle.margin.top, pageTitleDef.margin.top, "page-title margin equals to default");
	});
});