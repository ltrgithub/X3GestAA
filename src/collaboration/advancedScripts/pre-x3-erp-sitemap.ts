"use strict";

var helper = require('../../../src/collaboration/entities/page/navPageHelper');
exports.tracer = null;

exports.dataUpdate = function(_, db) {
	// force log: always
	exports.tracer = console.error;
	//
	exports.tracer && exports.tracer("* Begin pre script 'pre-x3-erp-sitemap'");
	helper.cleanNavPage(_, db, "x3", "erp", {
		tracer: exports.tracer
	});
	exports.tracer && exports.tracer("* End pre script 'pre-x3-erp-sitemap'");
};