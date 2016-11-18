"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var forEachKey = helpers.object.forEachKey;
var config = require('config'); // must be first syracuse require
var dataModel = require("../../../../src/orm/dataModel");
var registry = require("../../../../src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var sys = require("util");
var factory = require("../../../../src/orm/factory");
var jsonImport = require("syracuse-import/lib/jsonImport");
var jsonExport = require("syracuse-import/lib/jsonExport");
var locale = require('streamline-locale');

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');

import {
	assert
} from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {
	//force basic auth
	config.session = config.session || {};
	config.session.auth = "basic";
	// no integration server
	config.integrationServer = null;

	helpers.pageFileStorage = false;

	var tracer; // = console.log;

	var cookie = "";
	var x3sId;
	var applicationId;
	var adminEp;

	/*function _getModel() {
	    return dataModel.make(registry.applications.syracuse.contracts.collaboration, "mongodb_demo");
	}
    
	function get(_, cookie, url, statusCode, fullResponse) {
	    return testAdmin.get(_, cookie, url.indexOf("http") == 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_demo/" + url, statusCode, fullResponse);
	}
	*/

	var db;
	var ep;

	it("init database", function(_) {
		locale.setCurrent(_, "en-us");
		//
		db = testAdmin.initializeTestEnvironnement(_);
		ok(db != null, "Environnement initialized");
		//
	});

	/*
	//start syracuse server
	it("initialize syracuse test server", function(_) {
	    require('syracuse-main/lib/syracuse').startServers(_, port);
	    ok(true, "server initialized");
	    
	});
	*/
	function onlyInfo(diags) {
		return testAdmin.onlyInfo(diags);
	}

	it("data setup", function(_) {
		tracer && tracer("inside data setup");
		//  db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_demo);
		// import
		var opt = {
			$diagnoses: []
		};
		jsonImport.jsonImport(_, db, "syracuse-admin-demo.json", opt);
		//  tracer && tracer("import demo db diags (134): "+sys.inspect(diag));
		ok(onlyInfo(opt.$diagnoses), "Demo database import ok");
		console.log("$diagnoses:", opt.$diagnoses);
		// change the collaboration ep
		/*  ep = adminHelper.getEndpoint(_, {
		    dataset: "syracuse"
		});
		if (ep) {
		    tracer && tracer("(98) - Found endpoint, modify dataset");
		    ep.dataset(_, "mongodb_demo");
		    var res = ep.save(_);
		    tracer && tracer("(101) - endpoint modified: " + sys.inspect(res, null, 4));
		}*/
		ep = adminHelper.getEndpoint(_, {
			dataset: "unit_test"
		});
		// create some page data
		var pdEnt = db.getEntity(_, "pageData");
		var pageData1 = pdEnt.createInstance(_, db);
		pageData1.content(_, "{ \"$title\": \"PageData1\" }");
		pageData1.save(_);
		var pageData2 = pdEnt.createInstance(_, db);
		pageData2.content(_, "{ \"$title\": \"PageData2\" }");
		pageData2.save(_);
		var pageData3 = pdEnt.createInstance(_, db);
		pageData3.content(_, "{ \"$title\": \"PageData3\" }");
		pageData3.save(_);
		// create a page
		var pdefEnt = db.getEntity(_, "pageDef");
		var pageDef1 = pdefEnt.createInstance(_, db);
		pageDef1.code(_, "syracuse.collaboration.user.$query");
		pageDef1.setLocalizedProp(_, "title", "en-us", "PageDef1 title");
		pageDef1.setLocalizedProp(_, "title", "fr-fr", "titre PageDef1");
		pageDef1.setLocalizedProp(_, "description", "en-us", "PageDef1 description");
		pageDef1.setLocalizedProp(_, "description", "fr-fr", "description PageDef1");
		pageDef1.facet(_, "$query");
		pageDef1.representation(_, "user");
		pageDef1.application(_, db.fetchInstance(_, db.getEntity(_, "application"), {
			jsonWhere: {
				application: "syracuse",
				contract: "collaboration"
			}
		}));
		var v = pageDef1.variants(_).add(_);
		v.code(_, "PDef1V1");
		v.setLocalizedProp(_, "title", "en-us", "PageDef1 Var1");
		v.setLocalizedProp(_, "title", "fr-fr", "PageDef1 Var1");
		v.setLocalizedProp(_, "description", "en-us", "PageDef1 Var1 desc");
		v.setLocalizedProp(_, "description", "fr-fr", "PageDef1 Var1 desc");
		v.pageData(_, pageData1);
		var v = pageDef1.variants(_).add(_);
		v.code(_, "PDef1V2");
		v.setLocalizedProp(_, "title", "en-us", "PageDef1 Var2");
		v.setLocalizedProp(_, "title", "fr-fr", "PageDef1 Var2");
		v.setLocalizedProp(_, "description", "en-us", "PageDef1 Var2 desc");
		v.setLocalizedProp(_, "description", "fr-fr", "PageDef1 Var2 desc");
		v.pageData(_, pageData2);
		pageDef1.save(_);

		var pageDef2 = pdefEnt.createInstance(_, db);
		pageDef2.setLocalizedProp(_, "title", "en-us", "PageDef2 title");
		pageDef2.setLocalizedProp(_, "title", "fr-fr", "titre PageDef2");
		pageDef2.setLocalizedProp(_, "description", "en-us", "PageDef2 description");
		pageDef2.setLocalizedProp(_, "description", "fr-fr", "description PageDef2");
		pageDef2.facet(_, "$query");
		pageDef2.representation(_, "group");
		pageDef2.application(_, db.fetchInstance(_, db.getEntity(_, "application"), {
			jsonWhere: {
				application: "syracuse",
				contract: "collaboration"
			}
		}));
		var v = pageDef2.variants(_).add(_);
		v.code(_, "PDef2V1");
		v.setLocalizedProp(_, "title", "en-us", "PageDef2 Var1");
		v.setLocalizedProp(_, "title", "fr-fr", "PageDef2 Var1");
		v.setLocalizedProp(_, "description", "en-us", "PageDef2 Var1 desc");
		v.setLocalizedProp(_, "description", "fr-fr", "PageDef2 Var1 desc");
		v.pageData(_, pageData3);
		pageDef2.save(_);


	});

	it("standard profile export test", function(_) {
		var profileEnt = db.getEntity(_, "exportProfile");
		var profile = profileEnt.createInstance(_, db);
		profile.code(_, "P1");
		profile.description(_, "P1");
		profile.endpoint(_, ep);
		var it = profile.exportProfileItem(_).add(_);
		it.className(_, "pageDef");
		it.title(_, "PageDefs");
		it.standardProfile(_, true);
		it.filter(_, "(representation eq \"user\")");
		profile.save(_);
		// export
		var res = jsonExport.profileToJsonContent(_, profile, {
			tracer: tracer
		});
		tracer && tracer("(187) Exported object is: " + sys.inspect(res, null, 6));
		// prototypes check
		deepEqual(res.$prototypes.pageDef.$key, ["code"], "pageDef prototype key ok");
		strictEqual(res.$prototypes.pageData.$key, "code", "Page data prototype ok");
		// data check
		strictEqual(res.$items.length, 3, "One item + 2 page datas exported ok");
		strictEqual(res.$localization["en-us"][res.$items[2].title], "PageDef1 title", "Title exported ok");
		strictEqual(res.$localization["en-us"][res.$items[2].description], "PageDef1 description", "Description exported ok");
		strictEqual(res.$items[2].variants.length, 2, "Variants length ok");
		// export was with all locales, check fr-fr locales
		ok(res.$localization["fr-fr"][res.$items[2].title] != null, "PageDef1 title in fr-fr ok");
		// redo export with fr-fr locales only
		var res = jsonExport.profileToJsonContent(_, profile, {
			tracer: tracer,
			locales: ["fr-fr"]
		});
		tracer && tracer("(199) Exported object is: " + sys.inspect(res, null, 6));
		ok(res.$localization["fr-fr"][res.$items[2].title] != null, "PageDef1 title in fr-fr ok");
		ok((res.$localization["en-us"] && res.$localization["en-us"][res.$items[2].title]) == null, "PageDef1 title in en-us ok");


	});

	it("children filters options", function(_) {
		var profileEnt = db.getEntity(_, "personalizationManagement");
		var profile = profileEnt.createInstance(_, db);
		profile.code(_, "P2");
		profile.description(_, "P2");
		profile.pagesExport(_, true);
		profile.pageFilter(_, "(representation eq \"user\")");
		profile.pageVignetteFilter(_, "(code eq \"PDef1V1\")");
		profile.save(_);
		// export
		tracer && tracer("(209) before export");
		var diag = [];
		var res = profile.exportPersonalizations(_, {
			targetType: "download",
			$diagnoses: diag
		});
		//  console.log("res: "+JSON.stringify(res));
		//  res = JSON.parse(res);
		tracer && tracer("(214) Exported object is: " + sys.inspect(res, null, 6));
		tracer && tracer("(215) diags: " + sys.inspect(diag, null, 6));
		// data check
		strictEqual(res.$items.length, 2, "One item + 1 page datas exported ok");
		strictEqual(res.$items[1].variants.length, 1, "Variants length ok");
		var variantTitle = res.$items[1].variants[0].title;
		strictEqual(res.$localization["en-us"][variantTitle], "PageDef1 Var1", "Localized variant title ok");
		//
		profile.pageVignetteFilter(_, "(code eq \"NOT_EXISTS\")");
		profile.save(_);
		// export
		var diag = [];
		var res = profile.exportPersonalizations(_, {
			targetType: "download",
			$diagnoses: diag
		});
		//res = JSON.parse(res);
		tracer && tracer("(227) Exported object is: " + sys.inspect(res, null, 6));
		tracer && tracer("(228) diags: " + sys.inspect(diag, null, 6));
		// data check
		strictEqual(res.$items.length, 1, "One item + 0 page datas exported ok");
		strictEqual(res.$items[0].variants.length, 0, "Variants length ok");
		// inner join option
		profile.pageInnerJoin(_, true);
		profile.save(_);
		// export
		var diag = [];
		var res = profile.exportPersonalizations(_, {
			targetType: "download",
			$diagnoses: diag
		});
		//res = JSON.parse(res);
		tracer && tracer("(240) Exported object is: " + sys.inspect(res, null, 6));
		tracer && tracer("(241) diags: " + sys.inspect(diag, null, 6));
		// data check
		strictEqual(res.$items.length, 0, "Zero item + 0 page datas exported ok");
		ok(res.$localization["en-us"][variantTitle] == null, "Variant title not exported ok");


	});

	var navPageProto = {
		"navigationPage": {
			"$key": "pageName",
			"modules": {
				"$key": "code"
			},
			"$localized": ["title", "description"]
		},
		"menuModule": {
			"$key": "code",
			"submodules": {
				"$key": "code"
			},
			"application": {
				"$key": ["application", "contract"]
			}
		},
		"menuBlock": {
			"$key": "code",
			"items": {
				"$variants": {
					"menuItem": {
						"$key": "code"
					},
					"menuBlock": {
						"$key": "code",
						"$id": "menuBlock",
						"items": {
							"$variants": {
								"menuBlock": {
									"$id": "menuBlock",
									"$type": "pointer"
								},
								"menuItem": {
									"$key": "code"
								}
							}
						},
						"$localized": [
							"title"
						]
					},
				}
			},
			"application": {
				"$key": ["application", "contract"]
			}
		},
		"menuItem": {
			"$key": "code",
			"application": {
				"$key": [
					"application",
					"contract"
				]
			},
			"endpoint": {
				"$key": "dataset"
			},
			"representationRef": {},
			"$localized": [
				"title",
				"description"
			]
		}
	};

	it("navigation pages import test", function(_) {
		var diag = jsonImport.jsonImportFromJson(_, null, {
			$prototypes: navPageProto,
			$items: [{
				"$type": "menuItem",
				"code": "NAVPAGE_MENU1",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": "T1",
				"linkType": "$representation",
				"facet": "$query"
			}, {
				"$type": "menuItem",
				"code": "NAVPAGE_MENU2",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": "T2",
				"linkType": "$representation",
				"facet": "$query"
			}, {
				"$type": "menuItem",
				"code": "NAVPAGE_MENU3",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": "T3",
				"linkType": "$representation",
				"facet": "$query"
			}, {
				"$type": "menuBlock",
				"code": "B1",
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"items": [{
					"$variantType": "menuItem",
					"code": "NAVPAGE_MENU1"
				}, {
					"$variantType": "menuItem",
					"code": "NAVPAGE_MENU2"
				}]
			}, {
				"$type": "menuBlock",
				"code": "B2",
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"items": [{
					"$variantType": "menuItem",
					"code": "NAVPAGE_MENU3"
				}]
			}, {
				"$type": "menuBlock",
				"code": "B3",
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"items": [{
					"$variantType": "menuBlock",
					"code": "B3_SB1",
					"items": [{
						"code": "B3_SB1_SB1",
						"$variantType": "menuBlock",
						"items": [{
							"code": "B3_SB1_SB1_SB1",
							"$variantType": "menuBlock",
							"items": [{
								"code": "NAVPAGE_MENU1",
								"$variantType": "menuItem"
							}]
						}]
					}]
				}]
			}, {
				"$type": "menuModule",
				"code": "M1",
				"title": "T4",
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"submodules": [{
					"code": "B1"
				}, {
					"code": "B2"
				}]
			}, {
				"$type": "menuModule",
				"code": "M2",
				"title": "T7",
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"submodules": [{
					"code": "B3"
				}]
			}, {
				"$type": "navigationPage",
				"pageName": "home1",
				"title": "T5",
				"modules": [{
					"code": "M1"
				}]
			}, {
				"$type": "navigationPage",
				"pageName": "home2",
				"title": "T6",
				"modules": [{
					"code": "M2"
				}]
			}],
			"$localization": {
				"en-us": {
					"T1": "T1",
					"T2": "T2",
					"T3": "T3",
					"T4": "T4",
					"T5": "T5",
					"T6": "T6",
					"T7": "T7"
				}
			}
		}, {
			tracer: tracer,
			importMode: "update"
		});
		tracer && tracer("import diags: (470) " + sys.inspect(diag));
		// 
		var d = db.fetchInstances(_, db.getEntity(_, "navigationPage"), {
			jsonWhere: {
				pageName: "home1"
			}
		})[0];
		strictEqual(d.pageName(_), "home1", "Navigation page home1 fetch ok");
		var mods = d.modules(_).toArray(_);
		strictEqual(mods.length, 1, "Modules length ok");
		var smods = mods[0].submodules(_).toArray(_);
		strictEqual(smods.length, 2, "Submodules length ok");
		// fetch block1
		var b = db.fetchInstances(_, db.getEntity(_, "menuBlock"), {
			jsonWhere: {
				code: "B1"
			}
		})[0];
		strictEqual(b.code(_), "B1", "B1 fetched ok");
		var items = b.items(_).toArray(_);
		strictEqual(items.length, 2, "B1 items count ok");
		//
		// fetch block3
		var b = db.fetchInstances(_, db.getEntity(_, "menuBlock"), {
			jsonWhere: {
				code: "B3"
			}
		})[0];
		var items = b.items(_).toArray(_);
		strictEqual(items[0].code(_), "B3_SB1", "First B3 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "B3_SB1_SB1", "Second B3 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "B3_SB1_SB1_SB1", "Third B3 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "NAVPAGE_MENU1", "Menu entry level 3 ok");

		// export test
		var profEntity = db.getEntity(_, "exportProfile");
		var profile = profEntity.createInstance(_, db);
		profile.endpoint(_, adminHelper.getEndpoint(_, {
			dataset: "unit_test"
		}));
		var ent = db.getEntity(_, "navigationPage");
		var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
		var dItem = profile.exportProfileItem(_).add(_);
		dItem.className(_, "navigationPage");
		dItem.standardProfile(_, true);
		dItem.filter(_, "(pageName eq 'home2')");
		dItem._stdExportProfile = stdProfileItem;
		var orgRes = jsonExport.jsonExport(_, profile, {
			targetType: "download",
			tracer: tracer
		});
		//  var res = JSON.parse(orgRes);
		var res = orgRes;
		tracer && tracer("export result (582): " + JSON.stringify(res, null, "\t"));
		var items = res.$items[1].items;
		strictEqual(items[0].code, "B3_SB1", "Exported First B3 subblock ok");
		var items = items[0].items;
		strictEqual(items[0].code, "B3_SB1_SB1", "Exported Second B3 subblock ok");
		var items = items[0].items;
		strictEqual(items[0].code, "B3_SB1_SB1_SB1", "Exported Third B3 subblock ok");
		var items = items[0].items;
		strictEqual(items[0].code, "NAVPAGE_MENU1", "Exported Menu entry level 3 ok");
		//
		// lets change some codes, the exported data should reimport
		var impJson = JSON.parse(JSON.stringify(orgRes).replace(/B3/g, "B4").replace(/M2/g, "M3").replace("home2", "home3"));
		var diag = jsonImport.jsonImportFromJson(_, null, impJson, {
			tracer: tracer,
			importMode: "update"
		});
		tracer && tracer("import diags: (609) " + sys.inspect(diag));
		// fetch block4
		var b = db.fetchInstances(_, db.getEntity(_, "menuBlock"), {
			jsonWhere: {
				code: "B4"
			}
		})[0];
		var items = b.items(_).toArray(_);
		strictEqual(items[0].code(_), "B4_SB1", "First B4 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "B4_SB1_SB1", "Second B4 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "B4_SB1_SB1_SB1", "Third B4 subblock ok");
		var items = items[0].items(_).toArray(_);
		strictEqual(items[0].code(_), "NAVPAGE_MENU1", "Menu entry level 3 ok");



	});

	it("navigation page scripts", function(_) {
		var profileEnt = db.getEntity(_, "personalizationManagement");
		var profile = profileEnt.createInstance(_, db);
		profile.code(_, "P3");
		profile.description(_, "P3");
		profile.navPagesExport(_, true);
		profile.navPageCleanupScript(_, true);
		profile.navPageFilter(_, "(pageName eq \"home1\")");
		profile.save(_);
		// export
		tracer && tracer("(588) before export");
		var diag = [];
		var res = profile.exportPersonalizations(_, {
			targetType: "download",
			$diagnoses: diag
		});
		tracer && tracer("(594) exported resource", sys.inspect(res, null, 6));

		strictEqual(res.$options.unmark, "pre_import", "Preimport data ok");
		strictEqual(res.$scriptsBefore[0].options.homepagesFilter, "(pageName eq \"home1\")", "homepages pre-filter ok");
		strictEqual(res.$scriptsAfter[0].options.homepagesFilter, "(pageName eq \"home1\")", "homepages post-filter ok");


	});

	var lpProto = {
		"landingPage": {
			"$key": "pageName",
			"roles": {
				"$key": "code"
			},
			"vignettes": {
				"$key": "bind",
				"vignette": {
					"$key": "code"
				}
			},
			"$localized": ["title", "description"]
		},
		"pageLayout": {
			"$key": "code",
			"page": {
				"$variants": {
					"landingPage": {
						"$key": "pageName"
					}
				}
			}
		},
		"menuItem": {
			"$key": "code",
			"application": {
				"$key": [
					"application",
					"contract"
				]
			},
			"endpoint": {
				"$key": "dataset"
			},
			"representationRef": {},
			"$localized": [
				"title",
				"description"
			]
		}
	};

	it("landing pages import/export test", function(_) {
		var diag = jsonImport.jsonImportFromJson(_, null, {
			$prototypes: lpProto,
			$items: [{
				"$type": "menuItem",
				"code": "LP1_MENU1",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": "LP_IT1",
				"linkType": "$representation",
				"facet": "$query"
			}, {
				"$type": "menuItem",
				"code": "LP1_MENU2",
				"representationRef": {
					"application": {
						"application": "syracuse",
						"contract": "collaboration"
					},
					"entity": "applications",
					"representation": "application"
				},
				"application": {
					"application": "syracuse",
					"contract": "collaboration"
				},
				"title": "LP_IT2",
				"linkType": "$representation",
				"facet": "$query"
			}, {
				"$type": "landingPage",
				"pageName": "home1",
				"useCurrentEndpoint": true,
				"$factory": true,
				"title": "LP_T1",
				"roles": [{
					"code": "ADMIN"
				}, {
					"code": "GUEST"
				}],
				"vignettes": [{
					"bind": "LP_IT1_BIND",
					"vignette": {
						"code": "LP1_MENU1"
					}
				}, {
					"bind": "LP_IT2_BIND",
					"vignette": {
						"code": "LP1_MENU2"
					}
				}]
			}, {
				"$type": "pageLayout",
				"code": "LP1_STD_LAYOUT",
				"page": {
					"$variantType": "landingPage",
					"pageName": "home1"
				},
				"content": "{ \"prop1\": \"string1\" }"
			}, {
				"$type": "landingPage",
				"pageName": "home_test",
				"useCurrentEndpoint": true,
				"$factory": true,
				"title": "LP_T1",
				"vignettes": [{
					"bind": "LP_IT1_BIND",
					"vignette": {
						"code": "LP1_MENU1"
					}
				}, {
					"bind": "LP_IT2_BIND",
					"vignette": {
						"code": "LP1_MENU2"
					}
				}]
			}, {
				"$type": "pageLayout",
				"code": "TEST_STD_LAYOUT",
				"page": {
					"$variantType": "landingPage",
					"pageName": "home_test"
				},
				"content": "{ \"prop1\": \"string1\" }"
			}],
			"$localization": {
				"en-us": {
					"LP_IT1": "T1",
					"LP_IT2": "T2",
					"LP_T1": "LP_T1",
					"pageLayout.LP1_STD_LAYOUT.@STDLOC1": "Test std loc1",
					"pageLayout.TEST_STD_LAYOUT.@LOC1": "Test loc 1"
				}
			}
		}, {
			tracer: tracer,
			importMode: "update"
		});
		tracer && tracer("import diags: (705) " + sys.inspect(diag));
		// 
		var d = db.fetchInstances(_, db.getEntity(_, "landingPage"), {
			jsonWhere: {
				pageName: "home1"
			}
		})[0];
		strictEqual(d.pageName(_), "home1", "Landing page home1 fetch ok");
		var vgs = d.vignettes(_).toArray(_);
		strictEqual(vgs.length, 2, "Vignettes length ok");
		strictEqual(d.stdLayout(_).content(_), "{ \"prop1\": \"string1\" }", "Std layout content ok");
		strictEqual(d.stdLayout(_).localization(_), "{\"en-us\":{\"@STDLOC1\":\"Test std loc1\"}}", "Std layout localization ok");

		// export test
		var profEntity = db.getEntity(_, "exportProfile");
		var profile = profEntity.createInstance(_, db);
		profile.endpoint(_, adminHelper.getEndpoint(_, {
			dataset: "unit_test"
		}));
		var ent = db.getEntity(_, "landingPage");
		var stdProfileItem = helpers.object.clone(ent.$exportProfile, true);
		var dItem = profile.exportProfileItem(_).add(_);
		dItem.className(_, "landingPage");
		dItem.standardProfile(_, true);
		dItem.filter(_, "(pageName eq 'home1')");
		dItem._stdExportProfile = stdProfileItem;
		var orgRes = jsonExport.jsonExport(_, profile, {
			targetType: "download",
			tracer: tracer
		});
		//var res = JSON.parse(orgRes);
		var res = orgRes;
		tracer && tracer("export result (762): " + JSON.stringify(res, null, "\t"));
		var lpRes = res.$items.filter(function(it) {
			return it.$type === "landingPage";
		})[0];
		strictEqual(lpRes.pageName, "home1", "Exported pageName ok");
		strictEqual(lpRes.vignettes.length, 2, "Exported vignettes length ok");
		var layouts = res.$items.filter(function(it) {
			return it.$type === "pageLayout";
		});
		var layout = layouts[0];
		strictEqual(layout.page.pageName, "home1", "Exported layout pageName ok");
		strictEqual(layout.content, "{ \"prop1\": \"string1\" }", "Exported layout content ok");
		strictEqual(layouts.length, 1, "Exported one layout ok");
		strictEqual(res.$localization["en-us"]["pageLayout.LP1_STD_LAYOUT.@STDLOC1"], "Test std loc1", "Layout localization exported ok");
		//
		// lets change some codes, the exported data should reimport
		var impJson = JSON.parse(JSON.stringify(orgRes).replace(/home1/g, "home2").replace(/LP1/g, "LP2"));
		var diag = jsonImport.jsonImportFromJson(_, null, impJson, {
			tracer: tracer,
			importMode: "update"
		});
		tracer && tracer("import diags: (609) " + sys.inspect(diag));
		// 
		var lp1 = db.fetchInstances(_, db.getEntity(_, "landingPage"), {
			jsonWhere: {
				pageName: "home1"
			}
		})[0];
		strictEqual(lp1.pageName(_), "home1", "Landing page home1 still there ok");
		var lp2 = db.fetchInstances(_, db.getEntity(_, "landingPage"), {
			jsonWhere: {
				pageName: "home2"
			}
		})[0];
		strictEqual(lp2.pageName(_), "home2", "Landing page home2 created ok");
		var d = db.fetchInstances(_, db.getEntity(_, "pageLayout"), {
			jsonWhere: {
				code: "LP1_STD_LAYOUT"
			}
		})[0];
		strictEqual(d.page(_).$uuid, lp1.$uuid, "home1 layout ok");
		var d = db.fetchInstances(_, db.getEntity(_, "pageLayout"), {
			jsonWhere: {
				code: "LP2_STD_LAYOUT"
			}
		})[0];
		strictEqual(d.page(_).$uuid, lp2.$uuid, "home2 layout ok");


	});
});