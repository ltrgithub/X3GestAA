"use strict";

exports.tracer; // = console.log;

var _scripts = [];

function addCodeSuffix(_, coll, elts) {
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, n, idx) {
			var val = n.code + "_TWIN_" + (idx + 1);
			exports.tracer && exports.tracer(" >> Element [" + n._id + "] new code is '" + val + "'");
			if (val != null) {
				coll.update({
					_id: n._id
				}, {
					$set: {
						code: val,
						_updDate: new Date()
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
}


_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; Remove representationRef property on non $reprentation menuItems");
	//
	var coll = db.db.collection("MenuItem", _);
	var elts = coll.find({
		linkType: {
			$ne: "$representation"
		}
	}).toArray(_);
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			// UPDATE
			coll.update({
				_id: e._id
			}, {
				$set: {
					_updDate: new Date(),
					representationRef: {}
				}
			}, {
				safe: true,
				multi: true
			}, _);

		});
	}
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; Set code on global settings unique instance");
	//
	var coll = db.db.collection("Setting", _);
	var elts = coll.find().toArray(_);
	if (elts && elts.length === 1) {
		var setting = elts[0];
		if (!setting.code) {
			// UPDATE
			coll.update({
				_id: setting._id
			}, {
				$set: {
					_updDate: new Date(),
					code: "settings"
				}
			}, {
				safe: true,
				multi: true
			}, _);
		}
	}
	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; Rename twins menuModules");
	//
	var homePageMods = [];
	var collNav = db.db.collection("NavigationPage", _);
	var home = collNav.find({
		"pageName": "home"
	}).toArray(_)[0];
	home.modules && home.modules.forEach_(_, function(_, m) {
		homePageMods.push(m._uuid);
	});

	var modsMap = {};

	var collMods = db.db.collection("MenuModule", _);
	var mods = collMods.find({}).toArray(_);
	if (mods && mods.length > 0) {
		mods.forEach_(_, function(_, mod) {
			modsMap[mod.code] = modsMap[mod.code] || [];
			modsMap[mod.code].push(mod);
		});
	}

	Object.keys(modsMap).forEach_(_, function(_, modCode) {
		if (modsMap[modCode].length > 1) {
			exports.tracer && exports.tracer("Twin modules found with code '" + modCode + "' (Count: " + modsMap[modCode].length + ")");

			var modToKeepIdx = -1;
			modsMap[modCode].forEach(function(mod, idx) {
				if (homePageMods.indexOf(mod._id) !== -1) {
					exports.tracer && exports.tracer(" > Module [" + mod._id + "] is linked to navigation page. So no change will be applied");
					modToKeepIdx = idx;
				}
			});
			// if no module linked to nav page home --> keep older one
			if (modToKeepIdx === -1) {
				exports.tracer && exports.tracer(" > No module found linked to navigation page. Do not modify the older one");

				var lastUpdDate;
				modsMap[modCode].forEach(function(mod, idx) {
					if (!lastUpdDate || (lastUpdDate && new Date(mod._updDate) < lastUpdDate)) {
						lastUpdDate = new Date(mod._updDate);
						modToKeepIdx = idx;
					}
				});
			}
			modsMap[modCode].splice(modToKeepIdx, 1);
			addCodeSuffix(_, collMods, modsMap[modCode]);
		}
	});
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; Rename twins menuItems");
	//
	var misMap = {};
	var collMi = db.db.collection("MenuItem", _);
	var mis = collMi.find({}).toArray(_);
	if (mis && mis.length > 0) {
		mis.forEach_(_, function(_, mi) {
			misMap[mi.code] = misMap[mi.code] || [];
			misMap[mi.code].push(mi);
		});
	}
	Object.keys(misMap).forEach_(_, function(_, miCode) {
		if (misMap[miCode].length > 1) {
			exports.tracer && exports.tracer("Twin menu items found with code '" + miCode + "' (Count: " + misMap[miCode].length + ")");
			var miToKeepIdx = -1;
			exports.tracer && exports.tracer(" > Do not modify older menu item");
			var lastUpdDate;
			misMap[miCode].forEach(function(mi, idx) {
				if (!lastUpdDate || (lastUpdDate && new Date(mi._updDate) < lastUpdDate)) {
					lastUpdDate = new Date(mi._updDate);
					miToKeepIdx = idx;
				}
			});
			misMap[miCode].splice(miToKeepIdx, 1);
			addCodeSuffix(_, collMi, misMap[miCode]);
		}
	});
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; Rename twins menuBlock");
	//
	var mbsMap = {};
	var collMb = db.db.collection("MenuBlock", _);
	var mbs = collMb.find({}).toArray(_);
	if (mbs && mbs.length > 0) {
		mbs.forEach_(_, function(_, mb) {
			mbsMap[mb.code] = mbsMap[mb.code] || [];
			mbsMap[mb.code].push(mb);
		});
	}
	Object.keys(mbsMap).forEach_(_, function(_, mbCode) {
		if (mbsMap[mbCode].length > 1) {
			exports.tracer && exports.tracer("Twin menu items found with code '" + mbCode + "' (Count: " + mbsMap[mbCode].length + ")");
			var mbToKeepIdx = -1;
			exports.tracer && exports.tracer(" > Do not modify older menu item");
			var lastUpdDate;
			mbsMap[mbCode].forEach(function(mb, idx) {
				if (!lastUpdDate || (lastUpdDate && new Date(mb._updDate) < lastUpdDate)) {
					lastUpdDate = new Date(mb._updDate);
					mbToKeepIdx = idx;
				}
			});
			mbsMap[mbCode].splice(mbToKeepIdx, 1);
			addCodeSuffix(_, collMb, mbsMap[mbCode]);
		}
	});
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.error;
	//
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "0aci07cd6e2e", // this id MUST never change and MUST be unique over all update scripts
	description: "Akira P0 update script" // !important, some description, optional and can change
};