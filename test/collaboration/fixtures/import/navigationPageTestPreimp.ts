"use strict";

exports.execute = function(_, db, options) {
	require("../../../../src/collaboration/advancedScripts/pre-import-sitemap").execute(_, db, options);
	// check some blocks
	var collMb = db.db.collection("MenuBlock", _);
	var menuBlocks = collMb.find({
		code: {
			$in: ["F_B1", "F_B2"]
		}
	}).toArray(_);
	strictEqual(menuBlocks.length, 2, "Got menu blocks ok");
	menuBlocks.forEach(function(mb) {
		if (mb.code === "F_B1") {
			var sb1 = mb.items[0];
			ok(sb1.code === "F_SB1" && sb1._mark && sb1._mark.pre_import, "F_SB1 marked ok");
			ok(sb1.items[0] && sb1.items[0]._mark && sb1.items[0]._mark.pre_import, "F_IT1 marked ok");
			ok(sb1.items[1] && !sb1.items[1]._mark, "U_IT1 not marked ok");
			ok(sb1.items[2] && sb1.items[2]._mark && sb1.items[2]._mark.pre_import, "F_IT2 marked ok");
		}
		if (mb.code === "F_B2") {
			var sb1 = mb.items[0];
			ok(sb1.code === "U_SB2" && !sb1._mark, "U_SB2 not marked ok");
			var sb1 = mb.items[1];
			ok(sb1.code === "F_SB2" && sb1._mark && sb1._mark.pre_import, "F_SB2 marked ok");
			ok(sb1.items[0] && sb1.items[0]._mark && sb1.items[0]._mark.pre_import, "F_IT3 marked ok");
			var sb1 = mb.items[2];
			ok(sb1._mark && sb1._mark.pre_import, "F_IT5 marked ok");
		}
	});
};