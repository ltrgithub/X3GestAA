"use strict";

var f = require('syracuse-collaboration/lib/entities/licenseView').simplify;


import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('simplify', function(_) {
		//
		var obj = {};
		strictEqual(f("a_b", obj), "0_b", "First user");
		strictEqual(f("a_b", obj), "0_b", "First user again");
		strictEqual(f("a2_b", obj), "1_b", "First user, other connection");
		strictEqual(f("a2_c", obj), "0_c", "Second user");
		strictEqual(f("a2_b", obj), "1_b", "First user again2");
		strictEqual(f("a_c", obj), "1_c", "Second user, other connection");
		strictEqual(f("a23_b", obj), "2_b", "First user, third connection");
		strictEqual(f("a23b", obj), "a23b", "No underscore");
		//
	});
});