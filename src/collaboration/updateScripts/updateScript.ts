"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var sys = require("util");
var flows = require('streamline-runtime').flows;
var checksum = require("../../../../src/orm/checksum");
var signSerializer = new(require("../../../../src/orm/serializer").SignSerializer)();

exports.tracer = null;

var _scripts = [];
// script index MUST be target version number for this script
_scripts[5] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 5; PageDatas content reset as format changed.");
	// update related data
	db.db.collection("PageData", _).update({}, {
		$set: {
			content: null
		}
	}, {
		safe: true,
		multi: true
	}, _);
};
_scripts[6] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 6; Create standard applications. Migrate pages settings");
	// create applications
	[{
		"description": "Syracuse Collaboration",
		"application": "syracuse",
		"contract": "collaboration"
	}, {
		"description": "X3 ERP",
		"application": "x3",
		"contract": "erp"
	}].forEach_(_, function(_, appData) {
		var app = db.fetchInstance(_, db.model.getEntity(_, "application"), {
			jsonWhere: {
				application: {
					$regex: "^" + appData.application + "$",
					$options: "i"
				},
				contract: {
					$regex: "^" + appData.contract + "$",
					$options: "i"
				},
			}
		});
		if (!app) {
			app = db.model.getEntity(_, "application").factory.createInstance(_, null, db);
			app._initialize(_);
			app.description(_, appData.description);
			app.application(_, appData.application);
			app.contract(_, appData.contract);
			app.save(_);
		}
		// update related data
		db.db.collection("PageData", _).update({
			application: {
				$regex: "^" + appData.application + "$",
				$options: "i"
			},
			contract: {
				$regex: "^" + appData.contract + "$",
				$options: "i"
			},
		}, {
			$set: {
				application: {
					_uuid: app.$uuid
				}
			}
		}, {
			safe: true,
			multi: true
		}, _);
		// update menu item
		db.db.collection("MenuItem", _).update({
			application: {
				$regex: "^" + appData.application + "$",
				$options: "i"
			},
			contract: {
				$regex: "^" + appData.contract + "$",
				$options: "i"
			},
		}, {
			$set: {
				application: {
					_uuid: app.$uuid
				}
			}
		}, {
			safe: true,
			multi: true
		}, _);
		// update portlets
		db.db.collection("Portlet", _).update({
			application: {
				$regex: "^" + appData.application + "$",
				$options: "i"
			},
			contract: {
				$regex: "^" + appData.contract + "$",
				$options: "i"
			},
		}, {
			$set: {
				application: {
					_uuid: app.$uuid
				}
			}
		}, {
			safe: true,
			multi: true
		}, _);
		// update endpoints
		db.db.collection("EndPoint", _).update({
			application: {
				$regex: "^" + appData.application + "$",
				$options: "i"
			},
			contract: {
				$regex: "^" + appData.contract + "$",
				$options: "i"
			},
		}, {
			$set: {
				applicationRef: {
					_uuid: app.$uuid
				}
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	//
};

_scripts[7] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 7; Create x3 servers");
	var eps = db.db.collection("EndPoint", _).find({
		protocol: "x3"
	}).toArray(_);
	eps.forEach_(_, function(_, ep) {
		// find a x3server
		var x3server = db.fetchInstance(_, db.model.getEntity(_, "x3server"), {
			jsonWhere: {
				serverHost: ep.serverHost,
				serverPort: ep.serverPort
			}
		});
		if (!x3server) {
			x3server = db.model.getEntity(_, "x3server").factory.createInstance(_, null, db);
			x3server.description(_, ep.serverHost);
			x3server.serverHost(_, ep.serverHost);
			x3server.serverPort(_, ep.serverPort);
			x3server.serverName(_, ep.serverName);
			x3server.serverTimeout(_, ep.serverTimeout);
			//x3server.serverFolder(_, ep.serverFolder);
			x3server.save(_);
		}
		//
		var epInst = db.fetchInstance(_, db.model.getEntity(_, "endPoint"), {
			jsonWhere: {
				$uuid: ep._id
			}
		});
		if (epInst) {
			epInst.x3server(_, x3server);
			epInst.save(_);
		}
	});
};

_scripts[8] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 8; Update application protocol");
	// update applications for protocol
	// first make everything Syracuse
	db.db.collection("Application", _).update({}, {
		$set: {
			protocol: "syracuse"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	// make x3=x3
	db.db.collection("Application", _).update({
		application: {
			$regex: "^x3$",
			$options: "i"
		}
	}, {
		$set: {
			protocol: "x3"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	// change ep server list to ref
	var app = db.db.collection("Application", _).find({
		protocol: "x3"
	}).toArray(_);
	if (app && app.length) {
		exports.tracer && exports.tracer("Updating endpoints for application:" + app[0].description);
		var eps = db.db.collection("EndPoint", _).find({
			applicationRef: {
				_uuid: app[0]._id
			}
		}).toArray(_);
		eps.forEach_(_, function(_, ep) {
			exports.tracer && exports.tracer("Updating endpoint:" + ep.description);
			if (ep.x3servers && ep.x3servers._keys && ep.x3servers._keys.length) {
				exports.tracer && exports.tracer("Updating endpoint - server:" + ep.x3servers._keys[0]);
				db.db.collection("EndPoint", _).update({
					_id: ep._id
				}, {
					$set: {
						x3server: {
							_uuid: ep.x3servers._keys[0]
						}
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
};

_scripts[9] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 9; Fix x3server webServerPort and endpoint.x3ServerFolder");
	//
	db.db.collection("X3server", _).update({
		webServerPort: null
	}, {
		$set: {
			webServerPort: 80
		}
	}, {
		safe: true,
		multi: true
	}, _);
	//
	db.db.collection("EndPoint", _).update({
		x3ServerFolder: null,
		x3server: {
			$ne: null
		}
	}, {
		$set: {
			x3ServerFolder: "SUPERV"
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[10] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 10; locales model modification");
	//
	db.db.collection("LocalePreference", _).update({}, {
		$set: {
			enabled: true
		}
	}, {
		safe: true,
		multi: true
	}, _);
	db.db.collection("User", _).update({}, {
		$set: {
			locales: {}
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[11] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 11 delete portlets");
	//
	db.db.collection("Portlet", _).remove({}, {
		safe: true
	}, _);
	db.db.collection("MenuItem", _).remove({}, {
		safe: true
	}, _);
	db.db.collection("PageData", _).remove({
		facet: "$dashboard"
	}, {
		safe: true
	}, _);
};

_scripts[12] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 12; menu items and vignettes changes");
	// get X3 applications
	var x3apps = (db.db.collection("Application", _).find({
		protocol: "x3"
	}).toArray(_).map(function(item) {
		return item._id;
	})) || [];
	// menu items
	db.db.collection("MenuItem", _).update({}, {
		$set: {
			target: "self"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	//
	var menuItems = db.db.collection("MenuItem", _).find({}).toArray(_);
	menuItems.forEach_(_, function(_, menuItem) {
		if (!menuItem.representation) return;
		if (menuItem.menuFusion) {
			// fusion
			db.db.collection("MenuItem", _).update({
				_id: menuItem._id
			}, {
				$set: {
					linkType: "$function",
					fusionFunction: menuItem.representation
				}
			}, {
				safe: true,
				multi: true
			}, _);
		} else {
			if (menuItem.facet === "$dashboard") {
				db.db.collection("MenuItem", _).update({
					_id: menuItem._id
				}, {
					$set: {
						linkType: "$dashboard",
						dashboard: menuItem.representation
					}
				}, {
					safe: true,
					multi: true
				}, _);
			} else {
				// representation
				db.db.collection("MenuItem", _).update({
					_id: menuItem._id
				}, {
					$set: {
						linkType: "$representation",
						entity: ((x3apps.indexOf((menuItem.application && menuItem.application._uuid) || "") >= 0) ? menuItem.representation : helpers.string.pluralize(menuItem.representation)),
						facet: (menuItem.facet === "$edit") ? "$create" : menuItem.facet
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		}
	});
	// pages
	var pages = db.db.collection("PageData", _).find({}).toArray(_);
	pages.forEach_(_, function(_, page) {
		var updData = {
			$set: {
				allApplications: (page.application && page.application._uuid) ? false : true,
				dashboardName: page.representation
			}
		};
		if (!page.title) updData.$set.title = page._id;
		//
		page.portlets && Object.keys(page.portlets).forEach(function(ppUuid) {
			updData.$set["portlets." + ppUuid + ".generateStyle"] = "vignette";
		});
		//		console.log("upddata: "+require("util").inspect(updData));
		//
		db.db.collection("PageData", _).update({
			_id: page._id
		}, updData, {
			safe: true,
			multi: true
		}, _);
	});
};
_scripts[13] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 13; admin menu import");
	require("syracuse-import/lib/jsonImport").jsonImport(_, db, "syracuse-admin-menu.json");
};
_scripts[14] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 14; make all users active");
	db.db.collection("User", _).update({}, {
		$set: {
			active: true
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[15] = function(_, db) {
	function getApp(_, appId) {
		return apps[appId] || (apps[appId] = db.fetchInstance(_, appEntity, appId));
	}
	exports.tracer && exports.tracer("Executing update script to version: 15; set title to mr");
	db.db.collection("User", _).update({}, {
		$set: {
			title: "mr"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	exports.tracer && exports.tracer("Executing update script to version: 15; pageData to dashboards conversion");
	//
	var apps = {};
	var appEntity = db.model.getEntity(_, "application");
	var dashEntity = db.model.getEntity(_, "dashboardDef");
	var pages = db.db.collection("PageData", _).find({
		facet: "$dashboard"
	}).toArray(_);
	pages.forEach_(_, function(_, page) {
		try {
			// look for existing dashboard
			exports.tracer && exports.tracer("Migrating page: " + page.dashboardName + "." + page._id);
			var dash = db.fetchInstance(_, dashEntity, {
				jsonWhere: {
					dashboardName: page.dashboardName
				}
			});
			if (!dash) {
				exports.tracer && exports.tracer("Creating dashboard: " + page.dashboardName);
				dash = dashEntity.factory.createInstance(_, null, db);
				dash.dashboardName(_, page.dashboardName);
				page.title && dash.title(_, page.title);
				page.description && exports.tracer && exports.tracer("Migrating page setting description: " + sys.inspect(page.description));
				page.description && dash.description(_, page.description);
			}
			// create variant
			var variant = dash.variants(_).add(_);
			variant.allApplications(_, page.allApplications || false);
			// set variant title and desc
			page.title && variant.title(_, page.title);
			page.description && variant.description(_, page.description);
			//
			var appId = page.application && page.application._uuid;
			appId && variant.application(_, variant.createChild(_, "application", appId));
			page.roles && Object.keys(page.roles).forEach_(_, function(_, roleId) {
				if (roleId === "_keys") return;
				variant.roles(_).set(_, variant.createChild(_, "roles", roleId));
			});
			page.users && Object.keys(page.users).forEach_(_, function(_, userId) {
				if (userId === "_keys") return;
				variant.users(_).set(_, variant.createChild(_, "users", userId));
			});
			page.endpoints && Object.keys(page.endpoints).forEach_(_, function(_, epId) {
				if (epId === "_keys") return;
				variant.endpoints(_).set(_, variant.createChild(_, "endpoints", epId));
			});
			page.portlets && Object.keys(page.portlets).forEach_(_, function(_, pId) {
				if (pId === "_keys") return;
				var p = page.portlets[pId];
				var v = variant.vignettes(_).add(_);
				p.portlet && p.portlet._uuid && v.portlet(_, v.createChild(_, "portlet", p.portlet._uuid));
				v.allEndpoints(_, p.allEndpoints);
				p.endpoint && p.endpoint._uuid && v.endpoint(_, v.createChild(_, "endpoint", p.endpoint._uuid));
			});
			variant.pageData(_, variant.createChild(_, "pageData", page._id));
			//
			dash.save(_);
			var diag = [];
			dash.getAllDiagnoses(_, diag, {
				addPropName: true,
				addEntityName: true
			});
			if (diag.length) exports.tracer && exports.tracer("Save dashboard: " + page.dashboardName + " errors " + sys.inspect(diag, null, 4));
		} catch (e) {
			exports.tracer && exports.tracer("Dashboard migration exception: " + page.dashboardName + " errors " + e.message);
		}
	});
	// create a menu item for dashboards
	var items = db.db.collection("MenuItem", _).find({
		entity: "dashboardDefs"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.title(_, {
			"default": "Dashboards",
			"fr-FR": "Portails",
			"en-US": "Dashboards"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "dashboardDefs");
		menuItem.representation(_, "dashboardDef");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse personalization"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[16] = function(_, db) {
	function getApp(_, appId) {
		return apps[appId] || (apps[appId] = db.fetchInstance(_, appEntity, appId));
	}
	exports.tracer && exports.tracer("Executing update script to version: 16; pageData to pageDef conversion");
	//
	var apps = {};
	var appEntity = db.model.getEntity(_, "application");
	var dashEntity = db.model.getEntity(_, "pageDef");
	var pages = db.db.collection("PageData", _).find({
		facet: {
			$ne: "$dashboard"
		}
	}).toArray(_);
	pages.forEach_(_, function(_, page) {
		try {
			// look for existing dashboard
			exports.tracer && exports.tracer("Migrating page: " + page.representation + "." + page._id);
			var dash = db.fetchInstance(_, dashEntity, {
				jsonWhere: {
					representation: page.representation
				}
			});
			if (!dash) {
				exports.tracer && exports.tracer("Creating page: " + page.representation);
				dash = dashEntity.factory.createInstance(_, null, db);
				dash.representation(_, page.representation);
				page.title && dash.title(_, page.title);
				page.description && exports.tracer && exports.tracer("Migrating page setting description: " + sys.inspect(page.description));
				page.description && dash.description(_, page.description);
				dash.facet(_, page.facet);
			}
			// app
			var appId = page.application && page.application._uuid;
			appId && dash.application(_, dash.createChild(_, "application", appId));
			// create variant
			var variant = dash.variants(_).add(_);
			// set variant title and desc
			page.title && variant.title(_, page.title);
			page.description && variant.description(_, page.description);
			//
			page.roles && Object.keys(page.roles).forEach_(_, function(_, roleId) {
				if (roleId === "_keys") return;
				variant.roles(_).set(_, variant.createChild(_, "roles", roleId));
			});
			page.users && Object.keys(page.users).forEach_(_, function(_, userId) {
				if (userId === "_keys") return;
				variant.users(_).set(_, variant.createChild(_, "users", userId));
			});
			page.endpoints && Object.keys(page.endpoints).forEach_(_, function(_, epId) {
				if (epId === "_keys") return;
				variant.endpoints(_).set(_, variant.createChild(_, "endpoints", epId));
			});
			variant.pageData(_, variant.createChild(_, "pageData", page._id));
			//
			dash.save(_);
			var diag = [];
			dash.getAllDiagnoses(_, diag, {
				addPropName: true,
				addEntityName: true
			});
			if (diag.length) exports.tracer && exports.tracer("Save page: " + page.dashboardName + " errors " + sys.inspect(diag, null, 4));
		} catch (e) {
			exports.tracer && exports.tracer("Page migration exception: " + page.representation + " errors " + e.message);
		}
	});
	//
	exports.tracer && exports.tracer("Modifying page menu items");
	var menus = db.db.collection("MenuItem", _).update({
		entity: "pageDatas"
	}, {
		$set: {
			entity: "pageDefs",
			representation: "pageDef"
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[18] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 18; storage volumes");
	// find / create standard volume
	var stdVolUuid = "";
	var vols = db.db.collection("StorageVolume", _).find({
		code: "STD"
	}).toArray(_);
	if (vols && vols.length) stdVolUuid = vols[0]._id;
	else {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "STD");
		vol.description(_, {
			"default": "Standard storage volume",
			"en-US": "Standard storage volume",
			"fr-FR": "Volume standard"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
		//
		stdVolUuid = vol.$uuid;
	}
	//
	var docs = db.db.collection("Document", _).find({
		volume: null
	}).toArray(_);
	//
	var docEntity = db.model.getEntity(_, "document");
	docs.forEach_(_, function(_, doc) {
		exports.tracer && exports.tracer("Migrating document: " + doc._id);
		var d = db.fetchInstance(_, docEntity, doc._id);
		d._inUpdateScript = true;
		d.volume(_, d.createChild(_, "volume", stdVolUuid));
		d.save(_);
	});
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_VOL"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_VOL");
		menuItem.title(_, {
			"default": "Volumes",
			"fr-FR": "Volumes",
			"en-US": "Volumes"
		});
		menuItem.description(_, {
			"default": "Storage volumes",
			"en-US": "Storage volumes",
			"fr-FR": "Volumes de stockage"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "storageVolumes");
		menuItem.representation(_, "storageVolume");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse collaboration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[19] = function(_, db) {
	var vols = db.db.collection("StorageVolume", _).find({
		code: "WORD_TEMPLATE_MAILMERGE"
	}).toArray(_);
	if (!vols || !vols.length) {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "WORD_TEMPLATE_MAILMERGE");
		vol.description(_, {
			"default": "Word templates for mail merge",
			"fr-FR": "Modèles word pour publipostage",
			"en-US": "Word templates for mail merge"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
	}
	var vols = db.db.collection("StorageVolume", _).find({
		code: "WORD_TEMPLATE_REPORT"
	}).toArray(_);
	if (!vols || !vols.length) {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "WORD_TEMPLATE_REPORT");
		vol.description(_, {
			"default": "Word templates for reporting",
			"fr-FR": "Modèles word pour publication",
			"en-US": "Word templates for reporting"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
	}
};

_scripts[20] = function(_, db) {
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_AUTOMATES"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_AUTOMATES");
		menuItem.title(_, {
			"default": "Scheduler",
			"fr-FR": "Automates",
			"en-US": "Scheduler"
		});
		menuItem.description(_, {
			"default": "Scheduler",
			"fr-FR": "Automates",
			"en-US": "Scheduler"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "automates");
		menuItem.representation(_, "automate");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse administration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[21] = function(_, db) {
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_SERVERLOGS"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_SERVERLOGS");
		menuItem.title(_, {
			"default": "Server logs",
			"fr-FR": "Traces",
			"en-US": "Server logs"
		});
		menuItem.description(_, {
			"default": "Server logs",
			"fr-FR": "Traces",
			"en-US": "Server logs"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "serverLogs");
		menuItem.representation(_, "serverLog");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse administration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[22] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 22; Sage Intelligence storage volumes");
	var vols = db.db.collection("StorageVolume", _).find({
		code: "SI_REPORTS"
	}).toArray(_);
	if (!vols || !vols.length) {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "SI_REPORTS");
		vol.description(_, {
			"default": "Sage Intelligence reports",
			"fr-FR": "Etats Sage Intelligence",
			"en-US": "Sage Intelligence reports"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
	}
	var vols = db.db.collection("StorageVolume", _).find({
		code: "SI_TEMPLATES"
	}).toArray(_);
	if (!vols || !vols.length) {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "SI_TEMPLATES");
		vol.description(_, {
			"default": "Sage Intelligence templates",
			"fr-FR": "Modèles Sage Intelligence",
			"en-US": "Sage Intelligence templates"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
	}
	exports.tracer && exports.tracer("Executing update script to version: 22; set enpoints protocol property");
	var apps = db.db.collection("Application", _).find({}).toArray(_);
	apps && apps.forEach_(_, function(_, app) {
		db.db.collection("EndPoint", _).update({
			"applicationRef._uuid": app._id
		}, {
			$set: {
				protocol: app.protocol
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[23] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 23; remove endpoints NOT having applicationRef property");
	db.db.collection("EndPoint", _).remove({
		applicationRef: null
	}, {
		safe: true
	}, _);
};

_scripts[24] = function(_, db) {
	function _migrateCollection(_, entity, relations) {
		exports.tracer && exports.tracer("Migrating entity: " + entity.name);
		var instances = db.fetchInstances(_, entity, {});
		instances.forEach_(_, function(_, i) {
			try {
				i._dirtyList = relations;
				i.save(_);
			} catch (e) {}
		});
	}
	exports.tracer && exports.tracer("Executing update script to version: 24; convert mongodb maps to array");
	var entities = db.model.getEntities();
	Object.keys(entities).forEach_(_, function(_, eName) {
		var e = entities[eName];
		var pluralRels = (e.$relations && Object.keys(e.$relations).filter_(_, function(_, rName) {
			return e.$relations[rName].isPlural;
		})) || [];
		pluralRels.length && _migrateCollection(_, e, pluralRels);
	});
};

_scripts[25] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 25; initialize searchable for locales");
	db.db.collection("LocalePreference", _).update({}, {
		$set: {
			searchable: true
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[26] = function(_, db) {
	// do nothing, is just index creation
};

_scripts[27] = function(_, db) {
	function _fixCollection(_, colName, fields) {
		exports.tracer && exports.tracer("Fixing collection: " + colName);
		db.db.collection(colName, _).find({}).toArray(_).forEach_(_, function(_, e) {
			fields.forEach_(_, function(_, f) {
				//				exports.tracer && exports.tracer("Fixing field: "+f);
				if (!e[f]) return;
				if (typeof e[f] !== "object") return;
				//				exports.tracer && exports.tracer("Field has keys: "+JSON.stringify(Object.keys(e[f])));
				var keys = Object.keys(e[f]);
				keys.forEach(function(k) {
					if (k !== k.toLowerCase()) {
						//						exports.tracer && exports.tracer("Replacing: "+k+" by "+k.toLowerCase());
						e[f][k.toLowerCase()] = e[f][k];
						delete e[f][k];
					}
				});
			});
			//
			exports.tracer && exports.tracer("Updating: " + JSON.stringify(e));
			db.db.collection(colName, _).update({
				_id: e._id
			}, e, {
				safe: true
			}, _);
		});
	}
	exports.tracer && exports.tracer("Executing update script to version: 27; fix localized properties (codes to lowercase)");
	_fixCollection(_, "MenuItem", ["description", "title"]);
	_fixCollection(_, "DashboardDef", ["description", "title"]);
	_fixCollection(_, "PageDef", ["description", "title"]);
	_fixCollection(_, "Portlet", ["description", "title"]);
	_fixCollection(_, "StorageVolume", ["description"]);
};

_scripts[28] = function(_, db) {
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_IMPORTSESSIONS"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_IMPORTSESSIONS");
		menuItem.title(_, {
			"default": "Import sessions",
			"en-US": "Import sessions",
			"fr-FR": "Sessions d'import"
		});
		menuItem.description(_, {
			"default": "Import sessions",
			"en-US": "Import sessions",
			"fr-FR": "Sessions d'import"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "importSessions");
		menuItem.representation(_, "importSession");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse administration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[29] = function(_, db) {
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_FRIENDSERVERS"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_FRIENDSERVERS");
		menuItem.title(_, {
			"default": "Friend collaboration servers",
			"en-US": "Friend collaboration servers",
			"fr-FR": "Serveurs collaboration associés"
		});
		menuItem.description(_, {
			"default": "Friend collaboration servers",
			"en-US": "Friend collaboration servers",
			"fr-FR": "Serveurs collaboration associés"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "friendServers");
		menuItem.representation(_, "friendServer");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse administration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[30] = function(_, db) {
	// create a menu item for volumes
	var items = db.db.collection("MenuItem", _).find({
		code: "S_SECURITYPROFILES"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_SECURITYPROFILES");
		menuItem.title(_, {
			"default": "Security profiles",
			"en-US": "Security profiles",
			"fr-FR": "Profiles de sécurité"
		});
		menuItem.description(_, {
			"default": "Security profiles",
			"en-US": "Security profiles",
			"fr-FR": "Profiles de sécurité"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "securityProfiles");
		menuItem.representation(_, "securityProfile");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse administration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
	var items = db.db.collection("MenuItem", _).find({
		code: "S_WORDTEMPLATES"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_WORDTEMPLATES");
		menuItem.title(_, {
			"default": "Word templates",
			"en-US": "Word templates",
			"fr-FR": "Modèles de document Word"
		});
		menuItem.description(_, {
			"default": "Word templates",
			"en-US": "Word templates",
			"fr-FR": "Modèles de document Word"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "msoWordTemplateDocuments");
		menuItem.representation(_, "msoWordTemplateDocument");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse collaboration"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[31] = function(_, db) {
	var u = db.db.collection("User", _).find({
		login: "import"
	}).toArray(_);
	if (!u || !u.length) {
		var ue = db.getEntity(_, "user");
		var ge = db.getEntity(_, "group");
		var g = db.fetchInstance(_, ge, {
			jsonWhere: {
				description: "Endpoint administrators"
			}
		});
		var u = ue.createInstance(_, db);
		u.login(_, "import");
		u.firstName(_, "Import");
		u.lastName(_, "Special user");
		u.password(_, "import");
		g && u.groups(_).set(_, g);
		u.save(_);
	}
};

_scripts[32] = function(_, db) {
	function _makeAppEntry(_, appId) {
		var apps = db.db.collection("Application", _).find({
			_id: appId
		}).toArray(_);
		if (!apps || !apps.length) return;
		var a = apps[0];
		var eps = a.defaultEndpoint ? db.db.collection("EndPoint", _).find({
			_id: a.defaultEndpoint._uuid
		}).toArray(_) : db.db.collection("EndPoint", _).find({
			"applicationRef._uuid": appId
		}).toArray(_);
		if (!eps || !eps.length) return;
		return _apps[appId] = {
			dataset: eps[0].dataset
		};
	}
	exports.tracer && exports.tracer("Executing update script to version: 32; create representationRef for menuItems");
	var _apps = {};
	var mList = db.db.collection("MenuItem", _).find({
		linkType: "$representation"
	}).toArray(_);
	mList.forEach_(_, function(_, m) {
		if (m.representationRef) return;
		if (!m.application) return;
		var a = _apps[m.application._uuid] || _makeAppEntry(_, m.application._uuid);
		if (!a) return;
		db.db.collection("MenuItem", _).update({
			_id: m._id
		}, {
			$set: {
				representationRef: {
					_uuid: helpers.uuid.generate(),
					representation: m.representation,
					entity: m.entity,
					dataset: a.dataset
				}
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[33] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 33; update representationRef for menuItems");
	var _apps = {};
	var mList = db.db.collection("MenuItem", _).find({
		linkType: "$representation"
	}).toArray(_);
	mList.forEach_(_, function(_, m) {
		if (!m.application) return;
		db.db.collection("MenuItem", _).update({
			_id: m._id
		}, {
			$set: {
				"representationRef.application._uuid": m.application._uuid
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[34] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 34; fix update representationRef for menuItems");
	// fix the case of a wrong defaultEndpoint on an application
	var _apps = {};
	var mList = db.db.collection("MenuItem", _).find({
		linkType: "$representation"
	}).toArray(_);
	mList.forEach_(_, function(_, m) {
		if (!m.application) return;
		if (m.representationRef && m.representationRef._uuid && m.representationRef.representation && m.representationRef.entity) return;
		db.db.collection("MenuItem", _).update({
			_id: m._id
		}, {
			$set: {
				"representationRef.application._uuid": m.application._uuid,
				"representationRef._uuid": helpers.uuid.generate(),
				"representationRef.representation": m.representation,
				"representationRef.entity": m.entity
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[35] = function(_, db) {
	var config = require('config');
	// fix the case of a wrong defaultEndpoint on an application
	var realm = 'Syracuse';
	exports.tracer && exports.tracer("Executing update script to version: 35; replace clear text passwords with hashes. Realm: " + realm);
	var crypto = require('crypto');
	// hash function from RFC2617

	function h(value) {
		var hash = crypto.createHash('MD5');
		hash.update(value, "utf8");
		return hash.digest("hex");
	}

	var mList = db.db.collection("User", _).find({}).toArray(_);
	mList.forEach_(_, function(_, m) {
		if (!m.password) return;
		var newPassword = h(m.login + ":" + realm + ":" + m.password);
		db.db.collection("User", _).update({
			_id: m._id
		}, {
			$set: {
				"password": newPassword
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[36] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 36; Change authoring storage mode to string");
	//
	var pageDatas = db.db.collection("PageData", _).find({}).toArray(_);
	//
	pageDatas.forEach_(_, function(_, p) {
		if (p.content && (typeof p.content === "object")) {
			db.db.collection("PageData", _).update({
				_id: p._id
			}, {
				$set: {
					"content": JSON.stringify(p.content).replace(/\u007F/g, "$")
				}
			}, {
				safe: true,
				multi: true
			}, _);
		}
	});
};

_scripts[37] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 37; Code property added to pageData");
	var pageDatas = db.db.collection("PageData", _).find({}).toArray(_);
	//
	pageDatas.forEach_(_, function(_, p) {
		db.db.collection("PageData", _).update({
			_id: p._id
		}, {
			$set: {
				code: p._id
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[38] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 38; provide default instance of settings singleton if there is none yet");
	var settings = db.db.collection("Setting", _).find({}).toArray(_);
	//
	if (settings.length < 1) {
		exports.tracer && exports.tracer("Add a new settings singleton");
		var setting = db.model.getEntity(_, "setting").factory.createInstance(_, null, db);
		setting.authentication(_, "basic");
		setting.save(_);
	}
};

_scripts[39] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 39; initialize pageDef's code");
	var apps = db.db.collection("Application", _).find({}).toArray(_).reduce(function(prev, app) {
		prev[app._id] = app;
		return prev;
	}, {});
	exports.tracer && exports.tracer("Apps cache: " + sys.inspect(apps));
	var pageDefs = db.db.collection("PageDef", _).find({}).toArray(_);
	//
	pageDefs.forEach_(_, function(_, p) {
		if (!p.application || !p.application._uuid) return;
		var app = apps[p.application._uuid];
		if (!app) return;
		db.db.collection("PageDef", _).update({
			_id: p._id
		}, {
			$set: {
				code: [app.application, app.contract, p.representation, p.facet].join(".")
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	// create some menus
	var items = db.db.collection("MenuItem", _).find({
		code: "S_PERS_MNGT"
	}).toArray(_);
	if (!items || !items.length) {
		var menuItem = db.model.getEntity(_, "menuItem").factory.createInstance(_, null, db);
		menuItem.code(_, "S_PERS_MNGT");
		menuItem.title(_, {
			"default": "Personalizations management",
			"en-US": "Personalizations management",
			"fr-FR": "Gestion des personnalisations"
		});
		menuItem.description(_, {
			"default": "Personalizations management",
			"en-US": "Personalizations management",
			"fr-FR": "Gestion des personnalisations"
		});
		menuItem.application(_, adminHelper.getCollaborationApplication(_));
		menuItem.entity(_, "personalizationManagements");
		menuItem.representation(_, "personalizationManagement");
		// find the personnalisation vignette
		var v = db.fetchInstance(_, db.model.getEntity(_, "portlet"), {
			jsonWhere: {
				"title.en-US": "Syracuse tools"
			}
		});
		v && menuItem.menus(_).set(_, v);
		//
		menuItem.save(_);
	}
};

_scripts[40] = function(_, db) {
	exports.tracer && exports.tracer("Remove existing dashboard authoring as format has changed");
	var dash = db.db.collection("DashboardDef", _).find({}).toArray(_);
	dash.forEach_(_, function(_, d) {
		if (d.variants && d.variants.length) {
			var s = {};
			for (var i = 0; i < d.variants.length; i++)
				s["variants." + i + ".pageData"] = null;
			db.db.collection("DashboardDef", _).update({
				_id: d._id
			}, {
				$set: s
			}, {
				safe: true,
				multi: true
			}, _);
		}
	});
};

_scripts[41] = function(_, db) {
	exports.tracer && exports.tracer("Initialize pages device to \"desktop\"");
	db.db.collection("PageDef", _).update({}, {
		$set: {
			device: "desktop"
		}
	}, {
		safe: true,
		multi: true
	}, _);
};

_scripts[42] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 42; introduce connection information for host");
	var hosts = db.db.collection("Host", _).find({}).toArray(_);
	hosts.forEach_(_, function(_, h) {
		var host = db.fetchInstance(_, db.model.getEntity(_, "host"), {
			jsonWhere: {
				"hostname": h.hostname
			}
		});
		exports.tracer && exports.tracer("Host " + host.hostname(_));
		host.deactivated(_, !h.active);
		try {
			var connData = host.connectionData(_);
			if (connData) {
				var conns = connData.toArray(_);
				if (conns.length > 0) {
					exports.tracer && exports.tracer("Already done for " + host.hostname(_));
					host.save(_);
					return;
				}
			}
		} catch (e) {
			exports.tracer && exports.tracer("Exception " + e);
		}

		var connection = host.connectionData(_).add(_);
		connection.port(_, h.nannyPort || 8124);
		host.save(_);
	});
};

_scripts[43] = function(_, db) {
	var vols = db.db.collection("StorageVolume", _).find({
		code: "PRINTS"
	}).toArray(_);
	if (!vols || !vols.length) {
		// create std volume
		var vol = db.model.getEntity(_, "storageVolume").factory.createInstance(_, null, db);
		vol.code(_, "PRINTS");
		vol.description(_, {
			"default": "Temporary volume for prints",
			"fr-FR": "Volume temporaire pour les impressions",
			"en-US": "Temporary volume for prints"
		});
		vol.storageType(_, "db_file");
		vol.save(_);
	}
};

function _stringToLocalizedString(_, db, collectionName, properties) {
	var objects = db.db.collection(collectionName).find().toArray(_);
	objects.forEach_(_, function(_, c) {
		function updateProp(_, prop) {
			upd[prop] = {
				"default": c[prop]
			};
		}

		var upd = {};

		properties.forEach_(_, updateProp);
		//console.log("update "+collectionName+"obj "+c._id + " with "+JSON.stringify(upd)) ;
		db.db.collection(collectionName, _).update({
			_id: c._id
		}, {
			$set: upd
		}, {
			safe: true,
			multi: true
		}, _);
	});
}

_scripts[44] = function(_, db) {
	var toUpdate = {
		"Document": ["description"],
		"MsoWordTemplateDocument": ["description"],
		"DocumentTag": ["description"],
		"DocumentTagCategory": ["description"],
		"Team": ["description"],
		"Application": ["description"],
		"Role": ["description"],
		"Badge": ["title"],
		"X3server": ["description"],
		"EndPoint": ["description"],
		"Group": ["description"],
		"Oauth2": ["displayName"],
		"LocalePreference": ["description"],
		"MenuCategory": ["description"],
		"Configuration": ["description"],
		"ImportSession": ["description"],
		"ExportProfile": ["description"],
		"Automate": ["description"],
		"Apatch": ["comment"],
		"AsyncOperation": ["phase", "phaseDetail"],
		"SoapWebService": ["description"]
	};

	flows.eachKey(_, toUpdate, function(_, collectionName, properties) {
		_stringToLocalizedString(_, db, collectionName, properties);

	});
};

function _unescape(obj) {
	Object.keys(obj).forEach(function(prop) {
		if (obj[prop] && (typeof obj[prop] === "object")) _unescape(obj[prop]);
		if (prop[0] === "_") {
			obj["$" + prop.slice(1)] = obj[prop];
			delete obj[prop];
		}
	});
}
_scripts[45] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 45; compute checksum for users");
	/*	var userEnt = db.getEntity(_, "user");
	var users =  db.db.collection("User", _).find({}).toArray(_);
	users.forEach_(_, function(_, user) {
		var id = user._id;
		user.$uuid = user._id;
		delete user._id;
		user = signSerializer.serializeResource(userEnt, db.unescapeJson(user), {
			tracer: exports.tracer
		});
		checksum.sign(user, ["_id", "$key", "$loaded"]);
		db.db.collection("User", _).update({
			_id: id
		}, {
			$set: {
				_signature: user.$signature
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});*/
};

_scripts[46] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 46; update personalization codes");
	var appMap = db.db.collection("Application", _).find({}).toArray(_).reduce_(_, function(_, prev, app) {
		prev[app._id] = app;
		return prev;
	}, {});
	var pageDefColl = db.db.collection("PageDef, _");
	pageDefColl.find({}).toArray(_).forEach_(_, function(_, page) {
		var app = (appMap[page.application._uuid] || {});
		var device = page.device || "desktop";
		var code = [app.application, app.contract, page.representation, page.facet, device].join(".");
		pageDefColl.update({
			_id: page._id
		}, {
			$set: {
				code: code,
				device: device
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[47] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 47; add relation from connectionData to host");
	var hosts = db.db.collection("Host", _).find({}).toArray(_).forEach_(_, function(_, h) {
		var host = db.fetchInstance(_, db.model.getEntity(_, "host"), {
			jsonWhere: {
				"hostname": h.hostname
			}
		});
		// console.log("Host "+host.hostname(_));
		exports.tracer && exports.tracer("Host " + host.hostname(_));
		try {
			var connData = host.connectionData(_);
			if (connData) {
				var conns = connData.toArray(_);
				conns.forEach_(_, function(_, connection) {
					exports.tracer && exports.tracer("Connection " + connection.port(_));
					connection.host(_, host); // add relation
				});
			}
		} catch (e) {
			console.log("Ex " + e);
			exports.tracer && exports.tracer("Exception " + e);
		}
		host.syracuseNoNotifyMarker = true; // do not notify other processes
		host.save(_);
	});
};

_scripts[48] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 48; remove PageDataHistory");
	try {
		db.db.dropCollection("PageDataHistory", _);
	} catch (e) {
		// don't bother about the error, it occurs if the collection doesn't exists
	}
};

_scripts[49] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 49; add notification event for license expiry unless available");
	var items = db.db.collection("notificationEvent", _).find({
		code: "license"
	}).toArray(_);
	if (items.length > 0) return;
	var notificationEvent = db.model.getEntity(_, "notificationEvent").factory.createInstance(_, null, db);

	notificationEvent.code(_, "license");
	notificationEvent.description(_, {
		"default": "License expiry warning",
		"en-US": "License expiry warning",
		"fr-FR": "Licence expiration notification"
	});
	notificationEvent.titleTemplate(_, {
		"default": "License expiry of {productTitle} {productVersion}",
		"en-US": "License expiry of {productTitle} {productVersion}",
		"fr-FR": "Expiration de la licence de produit {productTitle} {productVersion}"
	});
	notificationEvent.textTemplate(_, {
		"default": "Dear {user.firstName} {user.lastName},\nThe license for the product {productTitle} {productVersion} of {policyTitle} {policyVersion} will expire within {daysBefore} days ({date:expiryDate}).\nPlease renew it.\nThank you in advance",
		"en-US": "Dear {user.firstName} {user.lastName},\nThe license for the product {productTitle} {productVersion} of {policyTitle} {policyVersion} will expire within {daysBefore} days ({date:expiryDate}).\nPlease renew it.\nThank you in advance",
		"fr-FR": "{user.firstName} {user.lastName},\nLa licence pour le produit {productTitle} {productVersion} ({policyTitle} {policyVersion}) expire en {daysBefore} jours ({date:expiryDate}).\nS'il vous plaît renouveler.\nCordialement"
	});
	notificationEvent.save(_);

};

_scripts[50] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 50; add code to role");
	var rolesColl = db.db.collection("Role", _);
	var roles = rolesColl.find({}).toArray(_);
	roles.forEach_(_, function(_, role) {
		if (role.code) return;
		var desc = role.description || {};
		rolesColl.update({
			_id: role._id
		}, {
			$set: {
				code: desc["en-us"] || desc["default"]
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
};

_scripts[51] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 51; add synchronization priority to global settings");
	var settings = db.fetchInstance(_, db.model.getEntity(_, "setting"), {});
	settings.conflictPriority(_, 5);
	settings.save(_);
};

_scripts[52] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 52; delete some authorings");
	var pagesColl = db.db.collection("PageDef", _);
	var pageDataColl = db.db.collection("PageData", _);
	var pages = pagesColl.find({
		"representation": {
			"$in": ["FCNSBAG$MODEL", "FCNSBAH$MODEL", "FCNSBAN$MODEL", "FCNSCHQ$MODEL", "FCNSFAC$MODEL", "FCNSOPX$MODEL", "FCNSPAY$MODEL", "FCNSSST$MODEL"]
		}
	}).toArray(_);
	pages.forEach_(_, function(_, pp) {
		exports.tracer && exports.tracer("Deleting authoring: " + pp.representation);
		(pp.variants || []).forEach_(_, function(_, vv) {
			if (vv.pageData && vv.pageData._uuid) pageDataColl.remove({
				_id: vv.pageData._uuid
			}, {
				safe: true
			}, _);
		});
		pagesColl.remove({
			_id: pp._id
		}, {
			safe: true
		}, _);
	});
};

_scripts[53] = function(_, db) {
	function _getDate(aDate) {
		try {
			return date.fromJsDate(aDate).toString();
		} catch (e) {
			return null;
		}
	}

	function _updateDocClass(_, docEntName, docCollName) {
		var docEnt = db.getEntity(_, docEntName);
		var docs;
		try {
			docs = db.fetchInstances(_, docEnt, {});
		} catch (e) {
			docs = [];
		}
		var docColl = db.db.collection(docCollName, _);
		docs.forEach_(_, function(_, dd) {
			var content = dd.content(_);
			if (dd.documentType(_)) return;
			var pp = (content && content.fileExists(_) && content.getProperties(_));
			if (pp) {
				docColl.update({
					_id: dd.$uuid,
				}, {
					$set: {
						fileName: pp.fileName,
						documentDate: _getDate(pp.uploadDate),
						documentType: pp.contentType
					}
				}, {
					safe: true,
					multi: true
				}, _);
			}
		});
	}
	exports.tracer && exports.tracer("Executing update script to version: 53; update documents metadata");
	var date = require('@sage/syracuse-core').types.date;
	_updateDocClass(_, "document", "Document");
	_updateDocClass(_, "msoWordTemplateDocument", "MsoWordTemplateDocument");
};

_scripts[54] = function(_, db) {
	// moved to 55
};

_scripts[55] = function(_, db) {
	// moved to 7P2 v. 2
};

_scripts[56] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 56; create expire indexes");
	db.db.collection("CvgSession", _).remove({}, {
		safe: true
	}, _);
	db.db.collection("SessionInfo", _).remove({}, {
		safe: true
	}, _);
	db.ensureExpireIndex(_, db.getEntity(_, "cvgSession"));
	db.ensureExpireIndex(_, db.getEntity(_, "sessionInfo"));
	exports.tracer && exports.tracer("Update script to version: 56 executed");
};

_scripts[57] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 57; convert menu entries");
	//
	var miColl = db.db.collection("MenuItem", _);
	var portColl = db.db.collection("Portlet", _);
	//
	portColl.update({
		type: "$page",
		linkType: null
	}, {
		$set: {
			linkType: "$representation"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	//
	var menus = miColl.find({
		linkType: "$representation"
	}).toArray(_);
	menus.forEach_(_, function(_, mm) {
		var ent = mm.representationRef && mm.representationRef.entity;
		if (!ent) return;
		ent = ent.split("(")[0];
		var rep = mm.representationRef.representation.replace(ent + "~", "");
		if (!rep) return;
		rep = rep.split("~");
		var linkType;
		switch (ent) {
			case "QUERY":
				linkType = "$request";
				miColl.update({
					_id: mm._id
				}, {
					$set: {
						linkType: linkType,
						requestName: rep[0],
						requestLevel: rep[1] || ""
					}
				}, {
					safe: true,
					multi: true
				}, _);
				break;
			case "STATS":
				linkType = "$stats";
				miColl.update({
					_id: mm._id
				}, {
					$set: {
						linkType: linkType,
						statName: rep[0]
					}
				}, {
					safe: true,
					multi: true
				}, _);
				break;
			case "PROCESS":
				linkType = "$process";
				var pName = rep.length === 1 ? rep[0] : rep[1];
				var pLeg = rep.length === 1 ? "" : rep[0];
				miColl.update({
					_id: mm._id
				}, {
					$set: {
						linkType: linkType,
						processLeg: pLeg,
						processName: pName,
						processMenu: rep[2] || ""
					}
				}, {
					safe: true,
					multi: true
				}, _);
				break;
		}
		//
		linkType && portColl.update({
			"pageItem._uuid": mm._id
		}, {
			$set: {
				linkType: linkType
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	//
	exports.tracer && exports.tracer("Update script to version: 57 executed");
};

_scripts[58] = function(_, db) {
	function _updateForType(_, linkType) {
		exports.tracer && exports.tracer("Updating link type: " + linkType);
		miColl.find({
			linkType: linkType,
		}).toArray(_).forEach_(_, function(_, mm) {
			portColl.update({
				"pageItem._uuid": mm._id
			}, {
				$set: {
					linkType: linkType
				}
			}, {
				safe: true,
				multi: true
			}, _);
		});
	}
	exports.tracer && exports.tracer("Executing update script to version: 58; update vignettes link type");
	//
	var miColl = db.db.collection("MenuItem", _);
	var portColl = db.db.collection("Portlet", _);
	// initialize all to $representation
	portColl.update({
		type: "$page"
	}, {
		$set: {
			linkType: "$representation"
		}
	}, {
		safe: true,
		multi: true
	}, _);
	_updateForType(_, "$process");
	_updateForType(_, "$request");
	_updateForType(_, "$stats");
	//
	exports.tracer && exports.tracer("Update script to version: 58 executed");
};

_scripts[59] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 59; update application/endpoint");
	//
	var miColl = db.db.collection("MenuItem", _);
	var portColl = db.db.collection("Portlet", _);
	portColl.find({
		"type": "$page"
	}).toArray(_).forEach_(_, function(_, pp) {
		if (!pp.pageItem || !pp.pageItem._uuid) return;
		var mi = miColl.find({
			_id: pp.pageItem._uuid
		}).toArray(_)[0];
		if (mi) {
			var upd = {
				$set: {

				}
			};
			if (mi.application && mi.application._uuid) upd.$set["application._uuid"] = mi.application._uuid;
			else upd.$set.application = null;
			if (mi.endpoint && mi.endpoint._uuid) upd.$set["endpoint._uuid"] = mi.endpoint._uuid;
			else upd.$set.endpoint = null;
		}
		portColl.update({
			_id: pp._id
		}, upd, {
			safe: true,
			multi: true
		}, _);
	});
	//
	exports.tracer && exports.tracer("Update script to version: 59 executed");
};

_scripts[60] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 60; set false value for V6 connections");
	//
	var userColl = db.db.collection("User", _);
	userColl.update({}, {
		$set: {
			"infov6": false
		}
	}, {
		safe: true,
		multi: true
	}, _);
	exports.tracer && exports.tracer("Update script to version: 60 executed");
};

_scripts[61] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 61; change vignettes format");
	//
	var portColl = db.db.collection("Portlet", _);
	var lpColl = db.db.collection("LandingPage", _);
	lpColl.find({}).toArray(_).forEach_(_, function(_, lp) {
		var mod = false;
		var vignettes = lp.vignettes;
		vignettes.forEach_(_, function(_, vv) {
			if (vv.vignette._uuid) {
				var pp = portColl.find({
					_id: vv.vignette._uuid
				}).toArray(_)[0];
				if (pp && pp.pageItem && pp.pageItem._uuid) {
					vv.vignette._uuid = pp.pageItem._uuid;
					mod = true;
				}
			}
		});
		mod && lpColl.update({
			_id: lp._id
		}, {
			$set: {
				vignettes: vignettes
			}
		}, {
			safe: true,
			multi: true
		}, _);
	});
	exports.tracer && exports.tracer("Update script to version: 61 executed");
};

_scripts[62] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 62; add code on default instance of settings singleton");
	var settings = db.fetchInstances(_, db.model.getEntity(_, "setting"));
	if (settings.length === 1) {
		exports.tracer && exports.tracer("Get settings singleton");
		var setting = settings[0];
		setting.code(_, "settings");
		setting.save(_);
	}
};

_scripts[63] = function(_, db) {
	exports.tracer && exports.tracer("Executing update script to version: 63; add protocol binding for saml2");
	var ent = db.model.getEntity(_, "saml2");
	var defBinding = ent.$properties.protocolBinding.defaultValue;
	var col = db.fetchInstances(_, ent);
	col.forEach_(_, function(_, el) {
		el.protocolBinding(_, defBinding);
		el.save(_);
	});
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
	fileId: "8e5e0f884cbe", // this id MUST never change and MUST be unique over all update scripts
	description: "Master branch update script" // !important, some description, optional and can change
};