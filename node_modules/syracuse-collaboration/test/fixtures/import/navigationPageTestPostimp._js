"use strict";

exports.execute = function(_, db, options) {
	// check some blocks
	var collMb = db.db.collection("MenuBlock", _);
	var menuBlocks = collMb.find({
		code: {
			$in: ["F_B1"]
		}
	}).toArray(_);
	strictEqual(menuBlocks.length, 1, "Got menu blocks ok");
	menuBlocks.forEach(function(mb) {
		if (mb.code === "F_B1") {
			var sb1 = mb.items[0];
			ok(sb1.code === "F_SB1" && (!sb1._mark || !sb1._mark.pre_import), "F_SB1 unmarked ok");
			ok(sb1.items[0] && (!sb1.items[0]._mark || !sb1.items[0]._mark.pre_import), "F_IT4 unmarked ok");
			ok(sb1.items[3] && sb1.items[3]._mark && sb1.items[3]._mark.pre_import, "F_IT2 marked ok");
		}
		if (mb.code === "F_B2") {
			var sb1 = mb.items[0];
			ok(sb1.code === "U_SB1" && (!sb1._mark || !sb1._mark.pre_import), "U_SB1 unmarked ok");
			var sb1 = mb.items[1];
			ok(sb1.code === "F_SB2" && sb1._mark && sb1._mark.pre_import, "F_SB2 marked ok");
			var sb1 = mb.items[2];
			ok(sb1 && sb1._mark && sb1._mark.pre_import, "F_IT5 marked ok");
		}
	});
	//
	require("syracuse-collaboration/lib/advancedScripts/post-import-sitemap").execute(_, db, options);
};