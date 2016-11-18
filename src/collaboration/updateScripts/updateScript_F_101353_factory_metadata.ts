"use strict";

exports.tracer; // = console.log;

var _scripts = [];

function changeFactoryProperty(_, coll, elts) {
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, n) {
			var val = n.isFactory;
			if (val != null) {
				coll.update({
					_id: n._id
				}, {
					$set: {
						_factory: val,
						_updDate: new Date()
					}
				}, {
					safe: true,
					multi: true
				}, _);
				if (val) {
					coll.update({
						_id: n._id
					}, {
						$set: {
							_factoryOwner: "SAGE"
						},
					}, {
						safe: true,
						multi: true
					}, _);
				}
			}
		});
	}
}

function changeChildrenFactoryProperty(_, coll, elts, childName) {
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			if (e[childName] && e[childName].length > 0) {
				var array = [];
				e[childName].forEach_(_, function(_, c) {
					c._factory = c._factory || c.isFactory;
					if (c._factory) c._factoryOwner = "SAGE";
					array.push(c);
				});
				var $set = {
					_updDate: new Date()
				};
				$set[childName] = array;
				// UPDATE
				coll.update({
					_id: e._id
				}, {
					$set: $set
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
}

_scripts[1] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 1; change NavigationPage isFactory property to $factory");
	//
	var coll = db.db.collection("NavigationPage", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 1 executed");
};

_scripts[2] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 2; change LandingPage isFactory property to $factory");
	//
	var coll = db.db.collection("LandingPage", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 2 executed");
};

_scripts[3] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 3; change MenuItem isFactory property to $factory");
	//
	var coll = db.db.collection("MenuItem", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 3 executed");
};

_scripts[4] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 4; change MenuBlock isFactory property to $factory");
	//
	var coll = db.db.collection("MenuBlock", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 4 executed");
};

_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; change MenuModule isFactory property to $factory");
	//
	var coll = db.db.collection("MenuModule", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 5 executed");
};

_scripts[6] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 6; change DashboardDef variants isFactory property to $factory");
	//
	var coll = db.db.collection("DashboardDef", _);
	var elts = coll.find().toArray(_);
	changeChildrenFactoryProperty(_, coll, elts, "variants");
	exports.tracer && exports.tracer("Update script to version: 6 executed");
};

_scripts[7] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 7; change PageDef variants isFactory property to $factory");
	//
	var coll = db.db.collection("PageDef", _);
	var elts = coll.find().toArray(_);
	changeChildrenFactoryProperty(_, coll, elts, "variants");
	exports.tracer && exports.tracer("Update script to version: 7 executed");
};

_scripts[8] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 8; change AuthoringSaveParam isFactory property to $factory");
	//
	var coll = db.db.collection("AuthoringSaveParam", _);
	var elts = coll.find().toArray(_);
	changeFactoryProperty(_, coll, elts);
	exports.tracer && exports.tracer("Update script to version: 8 executed");
};

_scripts[9] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 9; change PageDef variants name property to SAGE");
	//
	var defArr = ["DEFAULT", "DEFAUT"];
	var coll = db.db.collection("PageDef", _);
	var elts = coll.find().toArray(_);
	if (elts && elts.length > 0) {
		elts.forEach_(_, function(_, e) {
			if (e.variants && e.variants.length > 0) {
				var array = [];
				e.variants.forEach_(_, function(_, v) {
					if (defArr.indexOf(v.code) !== -1) v.code = "SAGE";
					if (v.title) Object.keys(v.title).forEach(function(loc) {
						if (defArr.indexOf(v.title[loc]) !== -1) v.title[loc] = "SAGE";
					});

					if (v.description) Object.keys(v.description).forEach(function(loc) {
						if (defArr.indexOf(v.description[loc]) !== -1) v.description[loc] = "SAGE";
					});
					array.push(v);
				});
				var $set = {
					_updDate: new Date()
				};
				$set.variants = array;
				// UPDATE
				coll.update({
					_id: e._id
				}, {
					$set: $set
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
	exports.tracer && exports.tracer("Update script to version: 9 executed");
};


exports.dataUpdate = function(_, db, actualVersion, targetVersion) {
	// force log: always
	exports.tracer = console.log;
	//
	_scripts.slice(actualVersion + 1, targetVersion + 1).forEach_(_, function(_, sequence) {
		sequence && sequence(_, db);
	});
};

exports.metadata = {
	fileId: "2rec67cda5fe", // this id MUST never change and MUST be unique over all update scripts
	description: "F_101353_factory_metadata update script" // !important, some description, optional and can change
};