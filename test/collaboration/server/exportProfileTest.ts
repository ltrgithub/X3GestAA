"use strict";
var helpers = require('@sage/syracuse-core').helpers;
var uuid = helpers.uuid;
var config = require('config'); // must be first
var dataModel = require("../../../src/orm/dataModel");
var registry = require("../../../src/sdata/sdataRegistry");
var mongodb = require('mongodb');
var ez = require('ez-streams');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var jsonExport = require("syracuse-import/lib/jsonExport");
var jsonImport = require("syracuse-import/lib/jsonImport");
var fs = require('streamline-fs');
var fsp = require("path");
var locale = require('streamline-locale');
var sys = require("util");
var flows = require('streamline-runtime').flows;


var tracer; // = console.log;

// force basic auth
config.session = config.session || {};
config.session.auth = "basic";
helpers.pageFileStorage = false;
//no integration server
config.integrationServer = null;

var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var port = (config.unit_test && config.unit_test.serverPort) || 3004;
var baseUrl = "http://localhost:" + port;
var acceptLanguage = "fr,fr-fr";

var profileId;

var cookie = "";

/*var traceFilePrefix = "C:\\trace\\";
function trace(str) {
	var f = traceFilePrefix + "exportProfile.log";
	var strn = str + "\n";
	var options = {
		flag: 'a+'
	};
	fs.appendFileSync(f, new Buffer(strn, 'utf8'), options);
}
tracer =trace ;*/

function _getModel() {
	return dataModel.make(
		registry.applications.syracuse.contracts.collaboration,
		"mongodb_admin_test");
}

function getCookie(_, login, pass) {
	var response = new ez.devices.http.client({
		url: baseUrl + "/syracuse-main/html/main.html",
		user: login || "admin",
		password: pass || "admin"
	}).end().response(_);
	response.readAll(_);
	strictEqual(response.statusCode, 200, "user authenticated");
	return response.headers["set-cookie"];
}

function post(_, cookie, url, data, statusCode) {

	var response = ez.devices.http.client({
		method: "post",
		url: url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).end(JSON.stringify(data)).response(_);
	var responsetext = response.readAll(_);
	strictEqual(response.statusCode, statusCode || 201, "status verified: post " + url);

	return JSON.parse(responsetext);

}

function put(_, cookie, url, data, statusCode) {
	var response = ez.devices.http.client({
		method: "put",
		url: url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
		headers: {
			"content-type": "application/json",
			cookie: cookie
		}
	}).end(JSON.stringify(data)).response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified: put " + url);
	return JSON.parse(response.readAll(_));
}

function get(_, cookie, url, statusCode) {

	var response = ez.devices.http.client({
		method: "get",
		url: url.indexOf("http") === 0 ? url : baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
		headers: {
			cookie: cookie,
			"Accept-Language": acceptLanguage,
			accept: "application/json;vnd.sage=syracuse"
		}
	}).end().response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified: get " + url);
	var resp = response.readAll(_);

	// console.log("Response : "+JSON.stringify(JSON.parse(resp),null,2));
	return JSON.parse(resp);
}

function del(_, cookie, url, statusCode) {
	var response = ez.devices.http.client({
		method: "delete",
		url: baseUrl + "/sdata/syracuse/collaboration/mongodb_admin_test/" + url,
		headers: {
			cookie: cookie
		}
	}).end().response(_);
	strictEqual(response.statusCode, statusCode || 200, "status verified: delete " + url);
	return JSON.parse(response.readAll(_));
}

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {



	it('init database', function(_) {
		var server = new mongodb.Server(
			endPoint.datasets.mongodb_admin_test.hostname,
			endPoint.datasets.mongodb_admin_test.port, {});
		var db = testAdmin.newMongoDb(config.collaboration.dataset, server, {});
		db = db.open(_);
		db.dropDatabase(_);
		//
		ok(true, "mongodb initialized");

	});


	//start syracuse server
	it('initialize syracuse test server', function(_) {
		require('syracuse-main/lib/syracuse').startServers(_, port);
		ok(true, "server initialized");
	});


	var applicationId;
	var adminEp;

	it('create administration endpoint: ', function(_) {

		cookie = getCookie(_);
		tracer && tracer("create administration endpoint");
		var appli = adminHelper.getApplication(_, "syracuse", "collaboration");
		ok(appli != null, "Application fetch ok");
		applicationId = appli.$uuid;
		//console.log("applicationId " + appli.$uuid);


		//console.log("create administration endpoint before post");
		var data = {
			description: "Administration",
			dataset: "mongodb_admin_test",
			enableSearch: false,
			protocol: "syracuse",
			databaseDriver: "mongodb",
			databaseHost: "localhost",
			databasePort: config.collaboration.port || 27017,
			applicationRef: {
				$uuid: applicationId
			},
			$actions: {
				$save: {
					$isRequested: true
				}
			}
		};



		var body = post(_, cookie, "endPoints/$template/$workingCopies?trackingId=" + uuid.generate(), data);

		adminEp = get(_, cookie, "endPoints('" + body.$uuid + "')");
	});

	it('very simple entity: entityAttribute', function(_) {

		cookie = getCookie(_);

		var testAttributes = [{
			name: "test1"
		}, {
			name: "test2"
		}, {
			name: "test3"
		}];

		var exportItems = [{
			className: "entityAttributes",
			title: "entityAttributes",
			entityKeyAttribute: [{
				name: "name"
			}],
			entityAttribute: [{
					name: "name"
				}

			]
		}];

		var body, data, obj;
		testAttributes.forEach_(_, function(_, prop) {
			body = post(_, cookie, "entityAttributes/$template/$workingCopies?trackingId=" + uuid.generate(), {});
			data = helpers.object.clone(prop);
			prop.$uuid = body.$uuid;
			data.$key = prop.$uuid;
			data.$etag = body.$etag;
			data.$actions = {
				$save: {
					$isRequested: true
				}
			};
			body = put(_, cookie, body.$url, data);
		});

		var item = exportItems[0];
		var coll = get(_, cookie, item.className, 200);
		//console.log( "GET EXPORTED OBJECTS: "+JSON.stringify(coll,null,2)) ;
		if (coll.$resources.length) item.exportedObjects = [];
		coll.$resources.forEach_(_, function(_, el) {
			//console.log("EL : " + el.$uuid);
			item.exportedObjects.push({
				$uuid: el.$uuid
			});
		});

		body = post(_, cookie, "exportProfileItems", item);

		var expProfile = {
			description: "Very Simple Export Profile",
			code: "VSEP",
			applicationName: "syracuse",
			endpoint: adminEp,
			exportProfileItem: exportItems,
		};

		var profile = post(_, cookie, "exportProfiles", expProfile);
		// console.log("EXPORT PROFILE : "+JSON.stringify(profile,null,2)) ;
		profileId = profile.$uuid;

		var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_admin_test);
		var model = db.model;
		var entity = model.getEntity(_, "exportProfile");
		var profileInst = db.fetchInstance(_, entity, {
			jsonWhere: {
				code: "VSEP"
			}
		});
		ok(profileInst != null, "very simple export profile created");
		var entityAttr = model.getEntity(_, "entityAttribute");
		var expFilePath = "test/collaboration/fixtures/very-simple-export-profile";


		var content = jsonExport.jsonExport(_, profileInst, {
			targetType: "download",
			//		path: expFilePath,
			beautify: true,
			tracer: tracer
		});

		testAttributes.forEach_(_, function(_, prop) {

			body = del(_, cookie, "entityAttributes('" + prop.$uuid + "')", 200);

			obj = db.fetchInstance(_, entityAttr, {
				jsonWhere: {
					name: prop.name
				}
			});
			ok(obj === null, "record destroyed");

		});

		jsonImport.jsonImportFromJson(_, null, content, {});

		testAttributes.forEach_(_, function(_, prop) {
			//console.log("prop:" + prop.name);
			var obj = db.fetchInstance(_, entityAttr, {
				jsonWhere: {
					name: prop.name
				}
			});

			strictEqual(obj.name(_), prop.name, "after import");

		});

	});

	var testSettings = [{
		nbrs: 7,
		nbrc: 21,
		profileDescr: "plural-ref-relation-localized-prop",
		profileCode: "PRRLPEP",
		exportItems: [{
			className: "users",
			title: "Users",
			entityKeyAttribute: [{
				name: "login"
			}],
			entityAttribute: [{
				name: "password"
			}, {
				name: "lastName"
			}, {
				name: "groups"
			}]
		}, {
			className: "groups",
			title: "groups",
			entityKeyAttribute: [{
				name: "description"
			}],
			entityAttribute: [{
				name: "description"
			}]
		}]
	}, {
		nbrs: 7,
		nbrc: 7,
		profileDescr: "singular-ref-relation-localized-prop",
		profileCode: "SRRLPEP",
		exportItems: [{
			className: "groups",
			title: "Groups",
			entityKeyAttribute: [{
				name: "description"
			}],
			entityAttribute: [{
				name: "role"
			}]
		}, {
			className: "roles",
			title: "Roles",
			entityKeyAttribute: [{
				name: "description"
			}],
			entityAttribute: []
		}]
	}, {
		profileDescr: "plural-child-relation",
		profileCode: "PCREP",
		exportItems: [{
			className: "users",
			title: "Users",
			entityAttribute: [{
				name: "login"
			}, {
				name: "password"
			}, {
				name: "title"
			}, {
				name: "firstName"
			}, {
				name: "lastName"
			}, {
				name: "locales"
			}, {
				name: "autentication"
			}],
			entityKeyAttribute: [{
				name: "lastName"
			}]
		}, {
			className: "localePreferences",
			title: "Locale Preferences",
			entityKeyAttribute: [{
				name: "code"
			}],
			entityAttribute: [{
				name: "description"
			}, {
				name: "shortDate"
			}, {
				name: "shortTime"
			}, {
				name: "longTime"
			}, {
				name: "shortDatetime"
			}, {
				name: "longDatetime"
			}, {
				name: "longDate"
			}, {
				name: "firstDayOfWeek"
			}, {
				name: "numberDecimalSeparator"
			}, {
				name: "numberGroupSeparator"
			}, {
				name: "numberGroupSize"
			}, {
				name: "enabled"
			}]
		}]
	}];




	function hasWarnings(diags) {
		return (diags || []).some(function(diag) {
			var s = diag.$severity || diag.severity;
			return (s === "warning");
		});
	}

	function hasErrors(diags) {
		return (diags || []).some(function(diag) {
			var s = diag.$severity || diag.severity;
			return (s === "error");
		});
	}

	function isLocalized(proto, prop) {
		return (proto.$localized && proto.$localized.indexOf(prop) !== -1);
	}

	testSettings.forEach(function(test) {
		//console.log("TEST: " + JSON.stringify(test,null,2));
		var profileDescr = test.profileDescr;
		var importFile = "test/collaboration/fixtures/exportTestSamples/" + test.profileDescr + "-import.json";
		var profileCode = test.profileCode;
		var exportItems = test.exportItems;
		var content;


		function testSetup(_) {
			tracer && tracer("test setup");
			cookie = getCookie(_);
			var diag = [];
			var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_admin_test);

			var model = db.model;
			//tracer && tracer("importFile: " + importFile);

			jsonImport.jsonImport(_, db, importFile, {
				$diagnoses: diag
			});
			tracer && tracer("Import diagnoses: " + JSON.stringify(diag));
			tracer && tracer("Import done!");


			exportItems.forEach_(_, function(_, item) {

				/*var whereClause=""
				var entity = db.getEntity(_, model.singularize(item.className),"$query");
				var count = db.count(_, entity, {
					sdataWhere: whereClause
				});*/
				var coll = get(_, cookie, item.className, 200);
				tracer && tracer("JsonExport: nb. objects to export for " + item.className + ' : ' + coll.$resources.length);

				if (coll.$resources.length) item.exportedObjects = [];
				coll.$resources.forEach_(_, function(_, el) {
					tracer && tracer("EL : " + el.$uuid);
					item.exportedObjects.push({
						$uuid: el.$uuid
					});
				});


				var body = post(_, cookie, "exportProfileItems/$template/$workingCopies?trackingId=" + uuid.generate(), item);
				tracer && tracer("exportProfileItem post: " + JSON.stringify(body, null, 2));

			});


			var expProfile = {
				description: profileDescr,
				code: profileCode,
				applicationName: "syracuse",
				endpoint: adminEp,
				exportProfileItem: exportItems,
			};


			var profile = post(_, cookie, "exportProfiles", expProfile);
			tracer && tracer("Export profile" + JSON.stringify(profile, null, 2));

			var entity = model.getEntity(_, "exportProfile");
			var profileInst = db.fetchInstance(_, entity, {
				jsonWhere: {
					code: profileCode
				}
			});
			ok(profileInst !== null, "exportprofile instance created: " + profileDescr);
			diag = [];
			content = jsonExport.jsonExport(_, profileInst, {
				targetType: "download",
				$diagnoses: diag,
				beautify: true,
				tracer: tracer
			});



			var diagnoses = [];
			profileInst.getAllDiagnoses(_, diagnoses);
			tracer && tracer("Diagnoses after export: " + JSON.stringify(diagnoses, null, 2));
			var raisedWarnings = hasWarnings(diagnoses);
			var raisedErrors = hasErrors(diagnoses);


			if (test.profileCode === 'SCREP') {
				ok(raisedWarnings, "warning raised ");
			}

			if (test.profileCode === 'MREP') {
				//delete inproto.team.administrator ;
				ok(raisedWarnings, "warning raised ");
			}
			if (test.profileCode === 'NSKEP') {

				ok(raisedErrors, "error raised ");
			}
		}



		function testCheck(_) {
			//tracer= trace ;
			function findItem(_, keyattrs, initem, outdata, localized, inLocalization, outLocalization) {
				tracer && tracer("find item");
				tracer && tracer("outdata: " + sys.inspect(outdata));
				tracer && tracer("keys: " + sys.inspect(keyattrs));

				var res = outdata.filter_(_, function(_, it) {
					tracer && tracer("type: " + it.$type);
					if (it.$type !== initem.$type) return false;

					var ok = keyattrs.every_(_, function(_, attr) {
						var prop = attr.name;
						tracer && tracer("attr: " + prop + ' ' + it[prop]);
						if (initem[prop]) {
							tracer && tracer("initem[" + prop + "]=" + sys.inspect(initem[prop]));
							if (localized && localized.indexOf(prop) !== -1) {
								tracer && tracer("localized: " + sys.inspect(localized));
								var outcode = it[prop];
								var incode = initem[prop];
								//tracer && tracer("outLocalization: "+JSON.stringify(outLocalization,null,2));
								//tracer && tracer("inLocalization: "+JSON.stringify(inLocalization,null,2));
								return (outLocalization[locale.current.toLowerCase()][outcode] === inLocalization[locale.current.toLowerCase()][incode]);
							} else {
								tracer && tracer("it[" + prop + "] === initem[" + prop + "] ? " + (it[prop]) + " ===" + initem[prop]);
								return (it[prop] === initem[prop]);
							}
						} //else

					});
					tracer && tracer("filter pass?  " + ok);
					return ok;
				});
				tracer && tracer("res: " + sys.inspect(res));
				return res[0];
			}

			var db = dataModel.getOrm(_, _getModel(), endPoint.datasets.mongodb_admin_test);
			var model = db.model;

			tracer && tracer("test check");
			if (test.profileCode === 'NSKEP') {
				return;
			}
			var infpath = fsp.join(__dirname, "../../../", importFile);
			tracer && tracer("PATH(input):  " + infpath);
			var inputTxt = fs.readFile(infpath, "utf8", _);
			//tracer && tracer("inputTxt: " + test.profileDescr + ' >>>>>' + inputTxt);
			var input = JSON.parse(inputTxt);
			tracer && tracer("INPUT: " + JSON.stringify(input, null, 2));
			var inproto = input.$prototypes || {};
			var indata = input.$items || [];

			//var outfpath = fsp.join(__dirname, "../../../", exportFile + ".json");
			//tracer && tracer("outfpath :"+outfpath) ;
			//var outputTxt = fs.readFile(outfpath, "utf8", _);

			//tracer && tracer("outputTxt " + test.profileDescr + ' >>>>>' + outputTxt);
			//var output = JSON.parse(outputTxt);
			var output = content;
			tracer && tracer("OUTPUT: " + JSON.stringify(output, null, 2));
			var outproto = output.$prototypes || {};
			var outdata = output.$items || [];
			var outLocal = output.$localization || {};
			var inLocal = input.$localization || {};




			function checkExportItem(_, it) {

				function checkDataItem(_, inItem) {
					function checkAttr(_, attr) {
						function checkProp(_, obj, idx) {

							tracer && tracer("checkProp: " + sys.inspect(obj));
							tracer && tracer("type: " + typeof obj);

							if (typeof obj === "object") {
								if (inproto[entityName][prop]) {
									tracer && tracer("child relation ");
									flows.eachKey(_, obj, function(_, key, value) {

										//if  (isLocalized(inproto[obj.$type], key)){
										var regex = new RegExp(key + "_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}");
										var match = regex.exec(value);
										if (match) {
											var outcode = outItem[prop][idx][key];
											var incode = obj[key];
											var l = locale.current.toLowerCase();
											strictEqual(outLocal[l][outcode], inLocal[l][incode], prop + "[" + idx + "]." + key);

										} else {
											var outval = outItem[prop][idx][key];
											tracer && tracer(prop + "." + key + ": " + sys.inspect(outval));
											if (typeof outval === "object") {
												// TODO: make a recursive check , deal with the case of object alone and a list of objects
												/*flows.eachKey(_, obj[key], function(_, k, val) {

								 strictEqual(val,outval[k],prop+"["+idx+"]."+key+"."+k+" outval is object ") ;
								});*/
											} else strictEqual(obj[key], outval, prop + "[" + idx + "]." + key);
										}
									});

								} else tracer && tracer("Combined key ");
							} else {
								if (inproto[entityName][prop]) { // prop is relation
									tracer && tracer("prop is relation " + prop);
									var key = inproto[entityName][prop].$key;
									tracer && tracer("key: " + key);
									ok(!Array.isArray(key), "simple key when item has simple value");

									var rel = model.singularize(prop);
									if (!rel) rel = prop;

									var parts = key.split('.');
									if (parts.length > 1) {
										ok(isLocalized(inproto[rel], parts[0]), " localized according to (in)prototype");
										ok(isLocalized(outproto[rel], parts[0]), "loaclized according to (out)prototype");
										var incode = obj;
										var outcode = (idx === -1) ? outItem[prop] : outItem[prop][idx];
										var invalue = inLocal[parts[1]][incode];
										var outvalue = outLocal[parts[1]][outcode];
										// TODO : see later about this test
										//strictEqual(invalue, outvalue, "localized key value  in plural refeference relationship:  " + key);
									} else {
										//non localized key
										var outval = (idx === -1) ? outItem[key] : outItem[key][idx];
										strictEqual(obj, outval, "non localized key for reference relation");
									}

								} else if (isLocalized(inproto[entityName], prop)) {
									/*tracer && tracer("prop is not relation " + prop);
								tracer && tracer("localized prop " + outItem[prop]);
								var value = outItem[prop];
								var regex = new RegExp(prop + "_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}");
								var match = regex.exec(value);
								ok(match != null, "localized prop format value");
								var inval = obj;
								strictEqual(outLocal[locale.current.toLowerCase()][value], inLocal[locale.current.toLowerCase()][inval], "value for localized prop");
*/
								} else {
									tracer && tracer("not localized " + prop);
									tracer && tracer("inproto[" + entityName + "]=" + sys.inspect(inproto[entityName]));
									strictEqual(obj, outItem[prop], 'check item.prop: ' + prop);
								}
							}
							tracer && tracer("end f-n function checkProp");
						} //function checkProp


						var prop = attr.name;
						tracer && tracer(" check item.prop: " + prop);

						if (!inItem[prop]) return;

						if (Array.isArray(inItem[prop])) { //is Array
							tracer && tracer("array");
							inItem[prop].forEach_(_, checkProp);
						} ////is Array
						else {
							tracer && tracer("not array " + prop);
							checkProp(_, inItem[prop], -1);
						}



					} // checkAttr


					if (inItem.$type !== model.singularize(it.className)) return;
					tracer && tracer("inItem: " + sys.inspect(inItem));
					var outItem = findItem(_, keyattrs, inItem, outdata, outproto[entityName].$localized, inLocal, outLocal);
					tracer && tracer("outItem: " + sys.inspect(outItem));
					ok(outItem !== null, "item is exported");
					props.map_(_, checkAttr); //props.map

				} //checkDataItem

				var keyattrs = it.entityKeyAttribute;
				var attrs = it.entityAttribute || [];
				var props = keyattrs.concat(attrs);
				tracer && tracer("keyattrs: " + sys.inspect(keyattrs));
				tracer && tracer("attrs: " + sys.inspect(attrs));
				var entityName = model.singularize(it.className);
				tracer && tracer("exportItem: " + entityName);
				if (!inproto[entityName]) return;

				var prop;
				tracer && tracer("props: " + sys.inspect(props));
				props.map_(_, function(_, attr) {
					prop = attr.name;
					tracer && tracer(" check attr: " + prop);
					if (inproto[entityName] && inproto[entityName][prop]) {
						ok(outproto[entityName][prop] !== null, 'check proto.prop: ' + attr.name);

						if (isLocalized(inproto[entityName], prop)) ok(outproto[entityName].$localized.indexOf(attr.name) !== -1, "localized prop " + prop);
					}
				});

				if (keyattrs.length === 1) {
					prop = keyattrs[0].name;
					//if (isLocalized(inproto[entityName], prop)) strictEqual(outproto[entityName].$key, prop + '.' + locale.current.toLowerCase(), "simple key check localized prop: " + prop);
					//else strictEqual(outproto[entityName].$key, prop, "simple key check prop: " + prop);
				} else keyattrs.map_(_, function(_, attr) {
					prop = attr.name;
					var l = locale.current.toLowerCase();
					if (isLocalized(inproto[entityName], prop)) ok(outproto[entityName].$key.indexOf(prop + '.' + l) !== -1, "combined key check localized prop: " + prop);
				});




				indata.forEach_(_, checkDataItem);


			} //check export item

			test.exportItems.forEach_(_, checkExportItem);





			//specific checks
			if (test.profileCode === 'SCREP') {

				//ok (raisedWarnings,"warning raised ") ;
				delete(inproto.searchAdmin.endpoint);

				test.exportItems.forEach(function(item) {
					if (item.$type === "endpoint") return;
					item.entityAttribute && item.entityAttribute.forEach(function(prop) {
						strictEqual(indata[prop.name], outdata[prop.name], prop.name);
					});
				});
			}

			if (test.profileCode === 'MREP') {
				delete inproto.team.administrator;
				//ok (raisedWarnings,"warning raised ") ;
			}

			if (!test.profileDescr.match(/^spe/)) {
				test.exportItems.forEach(function(item) {
					item.entityAttribute && item.entityAttribute.forEach(function(prop) {
						strictEqual(indata[prop.name], outdata[prop.name], prop.name);
					});
				});
			}




		}

		it("test_setup_ " + profileDescr, testSetup);
		//setTimeout(function() {
		it("test " + profileDescr, testCheck);
		//}, 10);
	});
});