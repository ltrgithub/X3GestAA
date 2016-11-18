const checksum = require('../../../src/orm/checksum');

import { assert } from 'chai';
const strictEqual = assert.strictEqual;

describe(module.id, () => {

	it('Object signature', function () {
		var test: any;
		test = [];
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "empty array");
		test = [];
		test.push(test);
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "recursive array");
		test = [null];
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "recursive array");
		test[0] = 2;
		strictEqual(checksum.verify(test), false, "changed recursive array");
		test = [undefined];
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "array with undefined");
		test = {
			a: 5,
			b: 7
		};
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "simple object");
		test = {
			$creDate: 55,
			$updDate: 77
		};
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "object with $creDate");
		test.$creDate = 44;
		strictEqual(checksum.verify(test), true, "change $creDate");
		test.$updDate = 44;
		strictEqual(checksum.verify(test), true, "change $updDate");
		test = {
			hallo: [55],
			u: 7
		};
		checksum.sign(test, ["hallo"]);
		strictEqual(checksum.verify(test, ["hallo"]), true, "object with restrictions");
		strictEqual(checksum.verify(test), false, "test without restrictions");
		test.hallo = "";
		strictEqual(checksum.verify(test, ["hallo"]), true, "changed restricted value");
		test.u = 6;
		strictEqual(checksum.verify(test, ["hallo"]), false, "change other value");
		var d = new Date();
		test = {
			dat: d,
			bool: new Boolean(true),
			num: new Number(2),
			str: new String("8")
		};
		checksum.sign(test);
		strictEqual(checksum.verify(test), true, "object with date, boolean, number, String");
		test.bool = true;
		strictEqual(checksum.verify(test), false, "Boolean replaced by boolean");
		test.bool = new Boolean(false);
		strictEqual(checksum.verify(test), false, "different Boolean");
		test.bool = new Boolean(true);
		strictEqual(checksum.verify(test), true, "original Boolean");
	});
});