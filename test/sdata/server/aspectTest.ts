"use strict";
import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var aspect = require("../../test/fixtures/aspect");

	it('Before aspect point cut', function() {
		var obj = {
				fun1: function(a, b, c) {}
			},
			before = {};

		aspect.before(obj, "fun1", function(
			context, args, result) {
			before.context = context;
		});

		obj.fun1("a", "b", "c");

		ok(before.context != null, "aspect context not null");
		equal(before.context.name, "fun1", "function names are equal");
		equal(before.context.pointCut, "before", "before point cut");
	});

	it('After aspect point cut', function() {
		var obj = {
				fun1: function(a, b, c) {}
			},
			after = {};

		aspect.after(obj, "fun1", function(
			context, args, result) {
			after.context = context;
		});

		obj.fun1("a", "b", "c");

		ok(after.context != null, "aspect context not null");
		equal(after.context.name, "fun1", "function names are equal");
		equal(after.context.pointCut, "after", "after point cut");
	});

	it('Around aspect point cut', function() {
		var obj = {
				fun1: function(a, b, c) {}
			},
			before = {},
			after = {};

		aspect.around(obj, "fun1", function(
			context, args, result) {
			if (context.pointCut === "before") {
				before.context = context;
			} else if (context.pointCut === "after") {
				after.context = context;
			}
		});

		obj.fun1("a", "b", "c");

		ok(before.context != null, "before aspect context not null");
		equal(before.context.name, "fun1", "before function names are equal");
		equal(before.context.pointCut, "before", "before point cut");

		ok(after.context != null, "after aspect context not null");
		equal(after.context.name, "fun1", "after function names are equal");
		equal(after.context.pointCut, "after", "after point cut");
	});
});