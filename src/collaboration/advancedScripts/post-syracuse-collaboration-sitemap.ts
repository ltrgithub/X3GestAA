"use strict";

var helper = require('../../../src/collaboration/entities/page/navPageHelper');
exports.tracer = null;

exports.dataUpdate = function(_, db) {
	// force log: always
	exports.tracer = console.error;
	//
	exports.tracer && exports.tracer("* Begin post script 'post-syracuse-collaboration-sitemap'");
	helper.reorderModules(_, db, "home", {
		tracer: exports.tracer
	});
	exports.tracer && exports.tracer("* End post script 'post-syracuse-collaboration-sitemap'");
};