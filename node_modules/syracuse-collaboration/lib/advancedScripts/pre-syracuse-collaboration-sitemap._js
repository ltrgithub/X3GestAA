"use strict";

var helper = require('syracuse-collaboration/lib/entities/page/navPageHelper');
exports.tracer = null;

exports.dataUpdate = function(_, db) {
	// force log: always
	exports.tracer = console.error;
	//
	exports.tracer && exports.tracer("* Begin pre script 'pre-syracuse-collaboration-sitemap'");
	helper.cleanNavPage(_, db, "syracuse", "collaboration", {
		tracer: exports.tracer
	});
	exports.tracer && exports.tracer("* End pre script 'pre-syracuse-collaboration-sitemap'");
};