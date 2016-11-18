"use strict";
var check = require('syracuse-license/lib/check');
var date = require('@sage/syracuse-core').types.date;
var util = require('util');
var tracer; // = console.error;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	var today = date.today();

	// returns exception message for invocation

	function callException(data, newLicenses) {
		try {
			check._p(data, newLicenses);
			return "";
		} catch (e) {
			return e.toString();
		};
		return "";
	}


	//General remark: test data do not have checksums, because they are not tested in _parseLicenses
	//test for splitting input into licenses
	it('Input splitting', function() {
		var input1 = "Preliminary text ,.-\n%&/{ a: {} }Final text";
		var res = check._s(input1);
		strictEqual(res.length, 1, "Number of items 1");
		strictEqual(res[0], "{ a: {} }", "Correct content of item");
		var input2 = "Preliminary text ,.-\n%&/{ a: {} }\n{ b: [] }\n text";
		var res = check._s(input2);
		strictEqual(res.length, 2, "Number of items 2");
		strictEqual(res[0], "{ a: {} }", "Correct content of item 0");
		strictEqual(res[1], "{ b: [] }", "Correct content of item 1");
		var input2 = "Preliminary text ,.-\n%&/{ a: {},b:{} }---\n====================\nTTT { b: [], c:5 }\n\n\n { a:{}, b:{'c':{}}} text";
		var res = check._s(input2);
		strictEqual(res.length, 3, "Number of items 3");
		strictEqual(res[0], "{ a: {},b:{} }", "Correct content of item 0");
		strictEqual(res[1], "{ b: [], c:5 }", "Correct content of item 1");
		strictEqual(res[2], "{ a:{}, b:{'c':{}}}", "Correct content of item 2");
	});


	it('Pre-Parse license test', function() {
		var pol1 = {
			"partnerId": "A",
			"product": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			"baseProduct": "ERP",
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:01",
			modules: [{
				"code": "A",
				"keyFunctions": ["A1", "A2", "A3"],
				"condition": "License"
			}]
		};
		var pol2 = {
			"partnerId": "A",
			"product": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			"baseProduct": "ERP",
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:02",
			modules: [{
				"code": "B",
				"keyFunctions": ["A1", "A2", "A3"],
				"condition": "License"
			}]
		};
		var res = check._preParseLicenses([JSON.stringify(pol1), JSON.stringify(pol2)]);

		strictEqual(Object.keys(res.policies).length, 1, "One policy");
		strictEqual(Object.keys(res.licenses).length, 0, "No license");
		strictEqual(Object.keys(res.licenseContents).length, 0, "No license");
		strictEqual(Object.keys(res.partnerContents).length, 0, "No partner");
		var key = pol2.partnerId + "\0" + pol2.product.code + "\0" + pol2.product.version + "\0" + pol2.policy.code + "\0" + pol2.policy.version;
		strictEqual(!!res.policies[key], true, "Correct key");
		strictEqual(res.policies[key].modules[0].code, "B", "Correct module name");
		strictEqual(res.policyContents[key], JSON.stringify(pol2), "Correct module content");
		var res = check._preParseLicenses([JSON.stringify(pol2), JSON.stringify(pol1)]);
		strictEqual(res.policies[key].modules[0].code, "B", "Different ordering - Correct module name");
		strictEqual(res.policyContents[key], JSON.stringify(pol2), "Correct module content");


		var lic1 = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "7.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"licensedTo": {},
			"validity": ["2012-09-01", "2014-08-31"],
			"modules": [{
				"code": "SAL",
				"validity": ["2012-10-01", "2012-12-31"]
			}]
		};
		var lic2 = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:11Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "7.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"licensedTo": {},
			"validity": ["2012-09-01", "2014-08-31"],
			"modules": [{
				"code": "SAL2",
				"validity": ["2012-10-01", "2012-12-31"]
			}]
		};
		var part = {
			"partners": [{
				"partnerId": "P1",
				"description": "Partner1",
				"publicKey": "MB"
			}],
			"fileType": "Partner"
		};
		var res = check._preParseLicenses([JSON.stringify(lic1), JSON.stringify(lic2), JSON.stringify(part)]);

		strictEqual(Object.keys(res.policies).length, 0, "No policy");
		strictEqual(Object.keys(res.licenses).length, 1, "1 license");
		strictEqual(Object.keys(res.licenseContents).length, 1, "1 license");
		strictEqual(res.partnerContents[""], JSON.stringify(part), "1 partner");
		var key = lic2.partnerId + "\0" + lic2.product.code + "\0" + lic2.product.version + "\0" + lic2.policy.code + "\0" + lic2.policy.version;
		strictEqual(!!res.licenses[key], true, "Correct key");
		strictEqual(res.licenses[key].modules[0].code, "SAL2", "Correct module name");
		strictEqual(res.licenseContents[key], JSON.stringify(lic2), "Correct module content");
		var res = check._preParseLicenses([JSON.stringify(lic2), JSON.stringify(lic1)]);
		strictEqual(res.licenses[key].modules[0].code, "SAL2", "Different ordering - Correct module name");
		strictEqual(res.licenseContents[key], JSON.stringify(lic2), "Correct module content");
		var error = false;
		try {
			check._preParseLicenses([JSON.stringify({
				fileType: "Policy",
				product: {},
				policy: {}
			})]);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error " + e);
		}
		strictEqual(error, false, "Detect missing generation stamp");
		var error = false;
		try {
			check._preParseLicenses([JSON.stringify({
				fileType: "Policy",
				product: {},
				policy: {},
				generationStamp: "abcde"
			})]);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error " + e);
		}
		strictEqual(error, false, "Detect wrong generation stamp");

		try {
			check._preParseLicenses([JSON.stringify({
				fileType: "Partner",
				partnerId: "P1",
				partners: []
			})]);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error " + e);
		}
		strictEqual(error, false, "Detect wrong number of partners");
		try {
			check._preParseLicenses([JSON.stringify({
				fileType: "Partner",
				partnerId: "P1",
				partners: [{
					partnerId: "P1"
				}, {
					partnerId: "P1"
				}]
			})]);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error " + e);
		}
		strictEqual(error, false, "Detect wrong number 2 of partners");
		try {
			check._preParseLicenses([JSON.stringify({
				fileType: "Partner",
				partnerId: "P1",
				partners: [{
					partnerId: "P2"
				}]
			})]);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error " + e);
		}
		strictEqual(error, false, "Detect wrong partner ID");
		var part_new = {
			"fileType": "Partner",
			"companyName": "New Tech inc",
			"companyRegistration": "12456785446777",
			"address": {
				"adress1": "ZAC Innova",
				"adress2": "15 rue de l'Europe",
				"city": "GRENOBLE",
				"zip": "38000",
				"state": "",
				"country": "FRANCE"
			},
			"partnerId": "P1",
			"publicKey": "zUa9Rtk8JJm0....",
			"codificationRange": {
				"dictionnaryPrefix": "YA,YBC",
				"localMenus": "12000-12100,14000-14020",
				"miscTables": "12000-12100,14000-14020",
				"transcodImpexp": " 90-100 "
			},
			"signature": "a9Rtk8JJm0....",
			"signatureText": "Sage"
		};
		var res = check._preParseLicenses([JSON.stringify(lic1), JSON.stringify(lic2), JSON.stringify(part_new)]);
		strictEqual(Object.keys(res.policies).length, 0, "No policy");
		strictEqual(Object.keys(res.licenses).length, 1, "1 license");
		strictEqual(Object.keys(res.licenseContents).length, 1, "1 license");
		strictEqual(res.partnerContents["P1"], JSON.stringify(part_new), "1 partner");
		var res = check._preParseLicenses();
		strictEqual(Object.keys(res.policies).length, 0, "No policy");
	});


	it('Parse license test', function() {
		var pol1 = {
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:01",
			"sessionTypes": [{
				"code": "desktop",
				"title": {
					"en-US": "Desktop",
					"fr-FR": "Bureau"
				},
				"devices": ["desktop"]
			}, {
				"code": "mobile",
				"title": {
					"en-US": "Mobile",
					"fr-FR": "Mobile"
				},
				"devices": ["tablet", "phone"]
			}],

			modules: [{
				"code": "A",
				"keyFunctions": ["FA"],
				"condition": "license"
			}, {
				"code": "A2",
				"keyFunctions": ["FA2"],
				"condition": "always"
			}, {
				"code": "A3",
				"keyFunctions": ["FA3"],
				"condition": "never"
			}],
			parameterKits: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			legislations: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			badges: [{
				code: "BADGE",
				functions: ["FA", "FA2", "FA3", "FA4"]
			}],
			activityCodes: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			languages: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			parameters: [{
				code: "P1",
				type: "string"
			}]
		};
		// same parameters etc., but different product
		var pol1_pro = {
			"partnerId": "",
			"product": {
				"code": "ERP_PRO",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:01",
			"sessionTypes": [{
				"code": "desktop",
				"title": {
					"en-US": "Desktop",
					"fr-FR": "Bureau"
				},
				"devices": ["desktop"]
			}, {
				"code": "mobile",
				"title": {
					"en-US": "Mobile",
					"fr-FR": "Mobile"
				},
				"devices": ["tablet", "phone"]
			}],

			modules: [{
				"code": "A",
				"keyFunctions": ["FA"],
				"condition": "license"
			}, {
				"code": "A2",
				"keyFunctions": ["FA2"],
				"condition": "always"
			}, {
				"code": "A3",
				"keyFunctions": ["FA3"],
				"condition": "never"
			}],
			parameterKits: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			legislations: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}, {
				"code": "extra",
				"condition": "license"
			}],
			badges: [{
				code: "BADGE",
				functions: ["FA", "FA2", "FA3", "FA4"]
			}],
			activityCodes: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			languages: [{
				"code": "A",
				"condition": "license"
			}, {
				"code": "A2",
				"condition": "always"
			}, {
				"code": "A3",
				"condition": "never"
			}],
			parameters: [{
				code: "P1",
				type: "string"
			}]
		};


		// same product and partner, but different version and policy
		var pol2 = {
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.1",
				title: {
					"en-US": "X3S"
				}
			},
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD1",
				"version": "1.1",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:02",
			modules: [{
				"code": "XX",
				"keyFunctions": ["A1", "A2", "A3"],
				"condition": "license"
			}]
		};
		// different product
		var pol3 = {
			"partnerId": "",
			"product": {
				"code": "ERP2",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD1",
				"version": "1.1",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:02",
			modules: [{
				"code": "YY",
				"keyFunctions": ["A1", "A2", "A3"],
				"condition": "license"
			}]
		};

		// different partner
		var pol4 = {
			"partnerId": "A",
			"product": {
				"code": "ERP3",
				"version": "1.0",
				title: {
					"en-US": "X3S"
				}
			},
			"baseProduct": "ERP",
			fileType: "Policy",
			"policy": {
				"code": "ERPSTD3",
				"version": "1.1",
				title: {
					"en-US": "X3S"
				}
			},
			generationStamp: "2013-10-10T00:00:02",
			badges: [{
				"code": "ZZ1",
				"functions": ["A1", "A2", "A3"],
			}]
		};
		// license for pol1
		var lic1 = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"serial": "ABC",
			"sessionControl": "concurrent",
			"licenseType": "STANDARD",
			"sessionTypes": [{
				"code": "desktop",
				"max": 50
			}, {
				"code": "mobile",
				"max": 100
			}],
			"licensedTo": {},
			"validity": [today.addDays(3).toString(), today.addDays(5).toString()],
			"modules": [{
				"code": "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				"code": "EXTRA"
			}],
			parameters: [{
				code: "P1",
				value: "A"
			}, {
				code: "P2",
				value: "B"
			}],
			activityCodes: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			badges: [{
				code: "BADGE",
				max: 10
			}],
			languages: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			parameterKits: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			legislations: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}]


		};
		// license for pol1 (valid already now!)
		var lic1val = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"serial": "ABC",
			"sessionControl": "concurrent",
			"licenseType": "STANDARD",
			"sessionTypes": [{
				"code": "desktop",
				"max": 50
			}, {
				"code": "mobile",
				"max": 100
			}],
			"licensedTo": {},
			"validity": [today.addDays(-1).toString(), today.addDays(5).toString()],
			"modules": [{
				"code": "A",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}, {
				"code": "EXTRA"
			}],
			parameters: [{
				code: "P1",
				value: "A"
			}, {
				code: "P2",
				value: "B"
			}],
			activityCodes: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			badges: [{
				code: "BADGE",
				max: 10
			}],
			languages: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			parameterKits: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			legislations: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}]


		};
		// license for pol1_pro
		var lic1val_pro = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP_PRO",
				"version": "1.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"serial": "ABC",
			"sessionControl": "concurrent",
			"licenseType": "STANDARD",
			"sessionTypes": [{
				"code": "desktop",
				"max": 51
			}, {
				"code": "mobile",
				"max": 101
			}],
			"licensedTo": {},
			"validity": [today.addDays(-1).toString(), today.addDays(5).toString()],
			"modules": [{
				"code": "A",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}, {
				"code": "EXTRA"
			}],
			parameters: [{
				code: "P1",
				value: "A_PRO"
			}, {
				code: "P2",
				value: "B_PRO"
			}],
			activityCodes: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			badges: [{
				code: "BADGE",
				max: 15
			}],
			languages: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			parameterKits: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			legislations: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}, {
				code: "extra"
			}]


		};

		var lic1a = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"licensedTo": {},
			"validity": [today.addDays(-3).toString(), today.addDays(5).toString()],
			"modules": [{
				"code": "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				"code": "EXTRA"
			}],
			parameters: [{
				code: "P1",
				value: "A"
			}, {
				code: "P2",
				value: "B"
			}],
			activityCodes: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			languages: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			parameterKits: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			badges: [{
				code: "BADGE1",
				max: 10
			}],
			legislations: [{
				code: "A",
				"validity": [today.addDays(3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}]


		};
		var lic1b = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:10Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.0"
			},
			"policy": {
				"code": "ERPSTD",
				"version": "1.0"
			},
			"sessionControl": "concurrent",
			"licensedTo": {},
			"validity": [today.addDays(-3).toString(), today.addDays(5).toString()],
			"modules": [{
				"code": "A",
				"validity": [today.addDays(-3).toString(), today.addDays(4).toString()]
			}, {
				"code": "EXTRA"
			}],
			parameters: [{
				code: "P1",
				value: "A"
			}, {
				code: "P2",
				value: "B"
			}],

			activityCodes: [{
				code: "A",
				"validity": [today.addDays(-3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			languages: [{
				code: "A",
				"validity": [today.addDays(-3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			parameterKits: [{
				code: "A",
				"validity": [today.addDays(-3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}],
			legislations: [{
				code: "A",
				"validity": [today.addDays(-3).toString(), today.addDays(4).toString()]
			}, {
				code: "B",
				"validity": [today.addDays(-1).toString(), today.addDays(4).toString()]
			}]


		};
		// license for pol2
		var lic2 = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:11Z",
			"partnerId": "",
			"product": {
				"code": "ERP",
				"version": "1.1"
			},
			"policy": {
				"code": "ERPSTD1",
				"version": "1.1"
			},
			"licensedTo": {},
			"validity": [today.addDays(-3).toString(), today.addDays(3).toString()],
			"modules": [{
				"code": "XX"
			}]
		};
		// license for pol3
		var lic3 = {
			"fileType": "License",
			"generationStamp": "2014-01-03-08:34:11Z",
			"partnerId": "",
			"product": {
				"code": "ERP2",
				"version": "1.0",
			},
			"policy": {
				"code": "ERPSTD1",
				"version": "1.1",
			},
			"licensedTo": {},
			"validity": [today.addDays(-3).toString(), today.addDays(3).toString()],
			"modules": [{
				"code": "YY"
			}]
		};
		// license for pol4
		var lic4 = {
			"partnerId": "A",
			"product": {
				"code": "ERP3",
				"version": "1.0"
			},
			fileType: "License",
			"policy": {
				"code": "ERPSTD3",
				"version": "1.1"
			},
			"validity": [today.addDays(-3).toString(), today.addDays(3).toString()],
			generationStamp: "2013-10-10T00:00:02",
			badges: [{
				"code": "ZZ1",
				"max": 5
			}]
		};

		//_parseLicenses(data, newLicenses, diagnoses, deleteProfile, firstTime)
		// license invalid
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4), JSON.stringify(lic1)], null
		], []);
		strictEqual(res[0].length, 5, "4 old policies, 1 license");
		strictEqual(res[1].nextCheck, today.addDays(2).toString(), "Next check");
		strictEqual(Object.keys(res[1].products).length, 1, "One licensed product");
		strictEqual(!!res[1].products.ERP, true, "One licensed product: ERP");
		["modules", "legislations", "parameterKits", "languages", "activityCodes"].forEach(function(type) {
			strictEqual(Object.keys(res[1].products.ERP[type]).length, 3, "3 " + type);
			strictEqual(res[1].products.ERP[type].A, false, type + " A not licensed");
			strictEqual(res[1].products.ERP[type].A2, true, type + " A2 always licensed");
			strictEqual(res[1].products.ERP[type].A3, false, type + " A3 not licensed");
		});
		strictEqual(Object.keys(res[1].products.ERP.parameters).length, 1, "1 parameter");
		strictEqual(res[1].products.ERP.parameters.P1, "A", "correct value");
		strictEqual(res[1].products.ERP.licenses.length, 1, "1 version data");
		strictEqual(res[1].products.ERP.licenses[0].licenseExpired, true, "expired");
		strictEqual(res[1].products.ERP.licenses[0].partnerId, lic1.partnerId, "correct partner");
		strictEqual(res[1].products.ERP.licenses[0].productCode, lic1.product.code, "product code");
		strictEqual(res[1].products.ERP.licenses[0].productVersion, lic1.product.version, "product version");
		strictEqual(res[1].products.ERP.licenses[0].policyCode, lic1.policy.code, "policy code");
		strictEqual(res[1].products.ERP.licenses[0].policyVersion, lic1.policy.version, "policy version");
		strictEqual(res[1].products.ERP.licenses[0].serial, lic1.serial, "serial number");
		strictEqual(res[1].products.ERP.productVersion, lic1.product.version, "product version again");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(","), "FA,FA2,FA3", "key functions for product");
		// devices
		strictEqual(res[1].products.ERP.deviceMapping.desktop, "desktop", "device mapping 1");
		strictEqual(res[1].products.ERP.deviceMapping.tablet, "mobile", "device mapping 2");
		strictEqual(res[1].products.ERP.deviceMapping.phone, "mobile", "device mapping 3");
		strictEqual(res[1].products.ERP.sessionTypes.desktop, 50, "session type desktop");
		strictEqual(res[1].products.ERP.sessionTypes.mobile, 100, "session type mobile");
		strictEqual(res[1].products.ERP.concurrent, true, "concurrent license");
		strictEqual(!!res[1].badges.BADGE, true, "Badge available");
		strictEqual(res[1].badges.BADGE.max, 10, "users");
		strictEqual(res[1].badges.BADGE.func.sort().join(","), "", "functions"); // license outdated: functions unavailable
		strictEqual(res[1].badges.BADGE.allFunc, "FA,FA2,FA3,FA4", "all functions");
		strictEqual(res[1].badges.BADGE.product, "ERP", "product name");

		strictEqual(res[1].sessionControl, "concurrent", "concurrent users");
		// license valid, but not its items
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4), JSON.stringify(lic1a)], null
		], []);
		strictEqual(res[0].length, 5, "4 old policies, 1 license (license now valid, but not its items)");
		strictEqual(res[1].nextCheck, today.addDays(2).toString(), "Next check");
		strictEqual(Object.keys(res[1].products).length, 1, "One licensed product");
		strictEqual(!!res[1].products.ERP, true, "One licensed product: ERP");
		["modules", "legislations", "parameterKits", "languages", "activityCodes"].forEach(function(type) {
			strictEqual(Object.keys(res[1].products.ERP[type]).length, 3, "3 " + type);
			strictEqual(res[1].products.ERP[type].A, false, type + " A not licensed");
			strictEqual(res[1].products.ERP[type].A2, true, type + " A2 always licensed");
			strictEqual(res[1].products.ERP[type].A3, false, type + " A3 not licensed");
		});
		strictEqual(Object.keys(res[1].products.ERP.parameters).length, 1, "1 parameter");
		strictEqual(res[1].products.ERP.parameters.P1, "A", "correct value");
		strictEqual(res[1].products.ERP.licenses.length, 1, "1 version data");
		strictEqual(res[1].products.ERP.licenses[0].licenseExpired, false, "expired");
		strictEqual(res[1].products.ERP.licenses[0].partnerId, lic1.partnerId, "correct partner");
		strictEqual(res[1].products.ERP.licenses[0].productCode, lic1.product.code, "product code");
		strictEqual(res[1].products.ERP.licenses[0].productVersion, lic1.product.version, "product version");
		strictEqual(res[1].products.ERP.licenses[0].policyCode, lic1.policy.code, "policy code");
		strictEqual(res[1].products.ERP.licenses[0].policyVersion, lic1.policy.version, "policy version");
		strictEqual(res[1].products.ERP.licenses[0].serial, lic1a.serial || "", "serial number");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(","), "FA,FA2,FA3", "key functions for product");
		strictEqual(res[1].products.ERP.concurrent, false, "no concurrent license");
		strictEqual(res[1].sessionControl, "named", "named users");
		strictEqual(res[1].badges.BADGE.max, 0, "users");
		strictEqual(res[1].badges.BADGE.func.sort().join(","), "FA2", "functions");
		strictEqual(res[1].badges.BADGE.allFunc, "FA,FA2,FA3,FA4", "all functions");
		strictEqual(res[1].badges.BADGE.product, "ERP", "product name");

		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4), JSON.stringify(lic1b)], null
		], []);
		strictEqual(res[0].length, 5, "4 old policies, 1 license (license now valid, license items also valid");
		strictEqual(res[1].nextCheck, today.addDays(4).toString(), "Next check");
		strictEqual(Object.keys(res[1].products).length, 1, "One licensed product");
		strictEqual(!!res[1].products.ERP, true, "One licensed product: ERP");
		["modules", "legislations", "parameterKits", "languages", "activityCodes"].forEach(function(type) {
			strictEqual(Object.keys(res[1].products.ERP[type]).length, 3, "3 " + type);
			strictEqual(res[1].products.ERP[type].A, true, type + " A now licensed licensed");
			strictEqual(res[1].products.ERP[type].A2, true, type + " A2 always licensed");
			strictEqual(res[1].products.ERP[type].A3, false, type + " A3 not licensed");
		});
		strictEqual(Object.keys(res[1].products.ERP.parameters).length, 1, "1 parameter");
		strictEqual(res[1].products.ERP.parameters.P1, "A", "correct value");
		strictEqual(res[1].products.ERP.licenses.length, 1, "1 version data");
		strictEqual(res[1].products.ERP.licenses[0].licenseExpired, false, "expired");
		strictEqual(res[1].products.ERP.licenses[0].partnerId, lic1.partnerId, "correct partner");
		strictEqual(res[1].products.ERP.licenses[0].productCode, lic1.product.code, "product code");
		strictEqual(res[1].products.ERP.licenses[0].productVersion, lic1.product.version, "product version");
		strictEqual(res[1].products.ERP.licenses[0].policyCode, lic1.policy.code, "policy code");
		strictEqual(res[1].products.ERP.licenses[0].policyVersion, lic1.policy.version, "policy version");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(","), "FA,FA2,FA3", "key functions for product");
		strictEqual(!!res[1].badges.BADGE, true, "Badge available");
		strictEqual(res[1].badges.BADGE.max, 0, "users");
		strictEqual(res[1].badges.BADGE.func.sort().join(","), "FA,FA2", "functions");
		strictEqual(res[1].badges.BADGE.allFunc, "FA,FA2,FA3,FA4", "all functions");
		strictEqual(res[1].badges.BADGE.product, "ERP", "product name");


		var res = check._p([
			[JSON.stringify(pol3), JSON.stringify(pol4)], null
		], [JSON.stringify(pol1), JSON.stringify(pol2)]);
		strictEqual(res[0].length, 4, "2 old, 2 new policies: 4 policies");
		// first time: delete "old" Sage policies
		var res = check._p([
			[JSON.stringify(pol3), JSON.stringify(pol4)], null
		], [JSON.stringify(pol1), JSON.stringify(pol2)], null, null, true);
		strictEqual(res[0].length, 3, "remove 1 old Sage policy: 3 policies");
		var deleteProfile = {
			partnerId: "",
			productCode: pol1.product.code,
			productVersion: pol1.product.version,
			policyCode: pol1.policy.code,
			policyVersion: pol1.policy.version
		};
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4), JSON.stringify(lic1)], null
		], [], null, deleteProfile);
		strictEqual(res[0].length, 4, "delete profile: 4 old policies");
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4)], null
		], [], null, deleteProfile);
		strictEqual(res[0].length, 4, "delete profile: 4 old policies");
		var deleteProfile = {
			partnerId: pol4.partnerId,
			productCode: pol4.product.code,
			productVersion: pol4.product.version,
			policyCode: pol4.policy.code,
			policyVersion: pol4.policy.version
		};
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(pol3), JSON.stringify(pol4)], null
		], [], null, deleteProfile);
		strictEqual(res[0].length, 3, "delete profile for partner: 3 old policies");
		// one license replaces another license
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(pol2), JSON.stringify(lic1b)], null
		], [JSON.stringify(lic2)]);
		strictEqual(!!res[1].products.ERP, true, "license replacement: ERP product available");
		strictEqual(res[1].sessionControl, "named", "named license");
		strictEqual(res[1].products.ERP.modules.XX, true, "license replacement: modules XX licensed");
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1b)], null
		], [JSON.stringify(pol2), JSON.stringify(lic2)]);
		strictEqual(!!res[1].products.ERP, true, "license replacement: ERP product available");
		strictEqual(res[1].products.ERP.modules.XX, true, "license replacement: modules XX licensed");
		strictEqual(res[1].sessionControl, "named", "named license");
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1b)], null
		], [JSON.stringify(lic2)]);
		strictEqual(!!res[1].products.ERP, true, "license replacement: without corresponding policy");
		strictEqual(res[1].products.ERP.modules.A, true, "license replacement: modules A licensed");
		strictEqual(res[1].sessionControl, "concurrent", "concurrent license");
		// licenses for different applications
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1b)], null
		], [JSON.stringify(lic3), JSON.stringify(pol3)]);
		strictEqual(!!res[1].products.ERP, true, "licenses for 2 products: product ERP");
		strictEqual(!!res[1].products.ERP2, true, "licenses for 2 products: product ERP2");
		strictEqual(res[1].products.ERP.modules.A, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP2.modules.YY, true, "module YY of ERP2 licensed");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(","), "FA,FA2,FA3", "key functions for product ERP");
		strictEqual(res[1].products.ERP2.keyFunctions.sort().join(","), "A1,A2,A3", "key functions for product ERP2");
		strictEqual(res[1].sessionControl, "mixed", "mixed license");
		// licenses for different partners
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1b)], null
		], [JSON.stringify(lic4), JSON.stringify(pol4)]);
		strictEqual(!!res[1].products.ERP, true, "licenses for partner: product ERP (partner license new)");
		strictEqual(res[1].products.ERP.modules.A, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(), "A1,A2,A3,FA,FA2,FA3", "key functions for ERP with partner");
		// licenses for different partners
		var res = check._p([
			[JSON.stringify(lic4), JSON.stringify(pol4)], null
		], [JSON.stringify(pol1), JSON.stringify(lic1b)]);
		strictEqual(!!res[1].products.ERP, true, "licenses for partner: product ERP (Sage license new)");
		strictEqual(res[1].products.ERP.modules.A, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(), "A1,A2,A3,FA,FA2,FA3", "key functions for ERP with partner");
		// licenses for different partners
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1b), JSON.stringify(lic4), JSON.stringify(pol4)], null
		], []);
		strictEqual(!!res[1].products.ERP, true, "licenses for partner: product ERP");
		strictEqual(res[1].products.ERP.modules.A, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP.keyFunctions.sort().join(), "A1,A2,A3,FA,FA2,FA3", "key functions for ERP with partner");
		// licenses for different applications: no base product
		var res = check._p([
			[JSON.stringify(pol3), JSON.stringify(lic3)], null
		], [JSON.stringify(lic4), JSON.stringify(pol4)]);
		strictEqual(!!res[1].products.ERP2, true, "partner license for different product (partner license new)");
		strictEqual(res[1].products.ERP2.modules.YY, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP2.keyFunctions.sort().join(), "A1,A2,A3", "key functions for ERP2 with partner");
		strictEqual(res[1].sessionControl, "named", "named license");
		// licenses for different applications: no base product
		var res = check._p([
			[JSON.stringify(pol3), JSON.stringify(lic3), JSON.stringify(lic4), JSON.stringify(pol4)], null
		], []);
		strictEqual(!!res[1].products.ERP2, true, "partner license for different product");
		strictEqual(res[1].products.ERP2.modules.YY, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP2.keyFunctions.sort().join(), "A1,A2,A3", "key functions for ERP2 with partner");
		// licenses for different applications: no base product
		var res = check._p([
			[JSON.stringify(lic4), JSON.stringify(pol4)], null
		], [JSON.stringify(pol3), JSON.stringify(lic3)]);
		strictEqual(!!res[1].products.ERP2, true, "partner license for different product (Sage license new)");
		strictEqual(res[1].products.ERP2.modules.YY, true, "module A of ERP licensed");
		strictEqual(res[1].products.ERP2.keyFunctions.sort().join(), "A1,A2,A3", "key functions for ERP2 with partner");
		// partner file tests
		var part1 = {
			fileType: "Partner",
			partnerId: "",
			partners: [{
				partnerId: "P1"
			}]
		};
		var part2 = {
			fileType: "Partner",
			partnerId: "",
			partners: [{
				partnerId: "P2"
			}]
		};
		var part11 = {
			fileType: "Partner",
			partnerId: "P1",
			partners: [{
				partnerId: "P1"
			}]
		};
		var part13 = {
			fileType: "Partner",
			partnerId: "P3",
			partners: [{
				partnerId: "P3"
			}]
		};
		var part130 = {
			fileType: "Partner",
			partnerId: "P3",
			partners: [{
				partnerId: "P3",
				key: "abc"
			}]
		};
		var part12 = {
			fileType: "Partner",
			partnerId: "P2",
			partners: [{
				partnerId: "P2"
			}]
		};
		var res = check._p([
			[JSON.stringify(part1), JSON.stringify(part11), JSON.stringify(part13)], null
		], [JSON.stringify(part2), JSON.stringify(part130), JSON.stringify(part12)]);
		strictEqual(res[0].length, 4, "4 files");
		res[0].forEach(function(file) {
			var par = JSON.parse(file);
			switch (par.partnerId) {
				case "":
					strictEqual(par.partners[0].partnerId, "P2", "Sage partner file is updated");
					break;
				case "P1":
					strictEqual(par.partners[0].partnerId, "P1", "P1 partner file");
					break;
				case "P2":
					strictEqual(par.partners[0].partnerId, "P2", "P2 partner file");
					break;
				case "P3":
					strictEqual(par.partners[0].partnerId, "P3", "P3 partner file");
					strictEqual(par.partners[0].key, "abc", "P3 partner file is updated");
					break;
			}
		});

		// same parameters for different products
		var diags = [];
		var res = check._p([
			[JSON.stringify(pol1), JSON.stringify(lic1val)], null
		], [JSON.stringify(pol1_pro), JSON.stringify(lic1val_pro)], diags);
		strictEqual(diags.length, 1, "1 diagnose");
		var res1 = res[1].products.ERP;
		var res2 = res[1].products.ERP_PRO;
		strictEqual(res1.activityCodes.A, false, "Activity code A");
		strictEqual(res2.activityCodes.A, false, "Activity code A 2");
		strictEqual(res1.activityCodes.B, undefined, "Activity code B");
		strictEqual(res2.activityCodes.B, undefined, "Activity code B 2");
		strictEqual(res1.activityCodes.A2, true, "Activity code A2");
		strictEqual(res2.activityCodes.A2, true, "Activity code A2 2");
		strictEqual(res1.activityCodes.A3, false, "Activity code A3");
		strictEqual(res1.languages.A, false, "Language A");
		strictEqual(res2.languages.A, false, "Language A 2");
		strictEqual(res1.parameterKits.A, false, "parameterKits A");
		strictEqual(res2.parameterKits.A, false, "parameterKits A 2");
		strictEqual(res1.legislations.A, false, "legislations A");
		strictEqual(res2.legislations.A, false, "legislations A 2");
		strictEqual(res1.legislations.extra, undefined, "legislations extra");
		strictEqual(res2.legislations.extra, true, "legislations extra 2");
		strictEqual(Object.keys(res[1].badges).join(","), "BADGE", "Correct badges");
		strictEqual(Object.keys(res[1].badges).join(","), "BADGE", "Correct badges");
		strictEqual(res[1].badges.BADGE.max, 10, "take max number of first license");
		strictEqual(res1.sessionTypes.desktop, 50, "Max sessions for product ERP");
		strictEqual(res2.sessionTypes.desktop, 51, "Max sessions for product ERP");

	});

	it('evaluate badges', function() {
		// availableBadges: array with badge codes
		// parsedData: result of getParsedLicense()
		// badgeInfo: must be an object, will be populated with badge codes as keys and
		//	      if the corresponding product matches the session control type: array of max user number and product code
		//	      otherwise: undefined
		// productInfo: must be an object, will be populated with product codes as keys and maximum user numbers as values
		// concurrent: boolean: gives desired session control type
		// diagnoses: array; diagnostic messages will be appended
		// result: true: when there is at least one badge with desired session control type
		var parsedData = {
			badges: {
				"A": {
					max: 10,
					product: "ERP"
				},
				"B": {
					max: 12,
					product: "ERP"
				},
				"C": {
					max: 15,
					product: "ERP2"
				},
			},
			products: {
				"ERP": {
					concurrent: true,
					deviceMapping: {
						tablet: "mobile",
						phone: "mobile",
						desktop: "desktop"
					},
					sessionTypes: {
						mobile: 50,
						desktop: 100
					}
				},
				"ERP2": {
					concurrent: false,
					deviceMapping: {
						tablet: "mobile",
						phone: "mobile",
						desktop: "desktop"
					},
					sessionTypes: {
						mobile: 5,
						desktop: 10
					}
				}
			}
		};
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var res = check._evaluateBadges(["A", "B", "D"], parsedData, badgeInfo, productInfo, true, "phone", diagnoses);
		strictEqual(res, true, "Products found");
		strictEqual(badgeInfo.A[0], 10, "concurrent badges for phone: 10 users for A");
		strictEqual(badgeInfo.A[1], "ERP", "Product for A");
		strictEqual(badgeInfo.B[0], 12, "12 users for B");
		strictEqual(badgeInfo.B[1], "ERP", "Product for B");
		strictEqual(productInfo.ERP, 50, "maximum for product ERP");
		strictEqual(diagnoses.length, 1, "diagnosis");
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var otherBadges = {};
		var res = check._evaluateBadges(["A", "B", "D"], parsedData, badgeInfo, productInfo, false, "phone", diagnoses, otherBadges);
		strictEqual(badgeInfo.A, undefined, "Badges for phone and named licensing: badge A: undefined");
		strictEqual(badgeInfo.B, undefined, "badge B: undefined");
		strictEqual(res, false, "Products not found");
		strictEqual(Object.keys(productInfo).length, 0, "no product");
		strictEqual(diagnoses.length, 1, "diagnosis");
		strictEqual(Object.keys(otherBadges).length, 1, "one other badge");
		strictEqual(otherBadges.C, "ERP2", "correct product for other badge");
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var otherBadges = {};
		var res = check._evaluateBadges(["A", "B"], parsedData, badgeInfo, productInfo, true, "desktop", diagnoses, otherBadges);
		strictEqual(res, true, "concurrent badges for desktop: Products found");
		strictEqual(productInfo.ERP, 100, "maximum for product ERP");
		strictEqual(diagnoses.length, 0, "diagnosis");
		strictEqual(Object.keys(otherBadges).length, 0, "no other badge");
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var res = check._evaluateBadges(["A", "B", "C"], parsedData, badgeInfo, productInfo, true, "desktop", diagnoses);
		strictEqual(res, true, "concurrent badges for desktop: Products found");
		strictEqual(badgeInfo.C[0], 15, "users for C");
		strictEqual(badgeInfo.C[1], "ERP2", "Product for C");
		strictEqual(productInfo.ERP, 100, "maximum for product ERP");
		strictEqual(productInfo.ERP2, 10, "maximum for product ERP");
		strictEqual(diagnoses.length, 0, "diagnosis");
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var res = check._evaluateBadges(["A", "B", "C"], parsedData, badgeInfo, productInfo, false, "desktop", diagnoses);
		strictEqual(res, true, "named badges for desktop: Products found");
		strictEqual(badgeInfo.C[0], 15, "users for C");
		strictEqual(badgeInfo.C[1], "ERP2", "Product for C");
		strictEqual(productInfo.ERP, undefined, "no maximum for product ERP");
		strictEqual(productInfo.ERP2, 10, "maximum for product ERP");
		strictEqual(diagnoses.length, 0, "diagnosis");
		var badgeInfo = {};
		var productInfo = {};
		var diagnoses = [];
		var error = false;
		try {
			var res = check._evaluateBadges(["A", "B", "C"], parsedData, badgeInfo, productInfo, true, "unsinn", diagnoses);
			error = true;
		} catch (e) {
			tracer && tracer("Expected error: " + e);
		}
		if (error) throw new Error();
	});


	it('X3 license info', function() {
		var diagnoses = [];
		var parsedLicense = {
			badges: {
				ACCTCLRK: {
					max: 2,
					func: ['GENLEDGERMGT', 'ACCTPLAN'],
					allFunc: 'GENLEDGERMGT,ACCTPLAN',
					product: 'ERP'
				},
				CFO: {
					max: 1,
					func: ['GENLEDGERMGT', 'ACCTPLAN', 'ACCTKPIS'],
					allFunc: 'GENLEDGERMGT,ACCTPLAN,ACCTKPIS',
					product: 'ERP'
				},
				CFO2: {
					max: 3,
					func: ['GENLEDGERMGT', 'ACCTPLAN', 'ACCTKPIS'],
					allFunc: 'GENLEDGERMGT,ACCTPLAN,ACCTKPIS',
					product: 'ERP'
				}
			},
			products: {
				ERP: {
					modules: {
						FIN: true,
						FIN2: false,
						SAL: false
					},
					activityCodes: {
						C1: true,
						C2: true
					},
					languages: {
						FRA: true,
						ENG: false
					},
					parameterKits: {
						KIT1: true,
						KIT2: true
					},
					legislations: {
						FRA: true,
						ENG: false
					},
					parameters: {
						MAXFIXEDASSETS: 10000
					},
					keyFunctions: [
						"GENLEDGERMGT", "ACCTPLAN", "ACCTKPIS", "XXX", "YYY", "..."
					],
					licenses: [{
						partnerId: '',
						productCode: 'ERP',
						productVersion: '7.0',
						policyCode: 'ERPSTD',
						policyVersion: '1.0',
						licenseExpired: false,
						serial: 'ABC'
					}],
					sessionTypes: {
						desktop: 2,
						mobile: 100,
						tablet: 100,
						phone: 100
					},
					deviceMapping: {
						desktop: 'desktop',
						tablet: 'mobile',
						phone: 'mobile'
					},
					concurrent: true,
					productVersion: '7.0'
				}
			},
			validLicenses: [{
				expiryDate: '2014-08-31',
				partnerId: '',
				productCode: 'ERP',
				productTitle: {
					'en-us': 'Sage ERP X3',
					'fr-fr': 'Sage ERP X3',
					'default': 'Sage ERP X3'
				},
				productVersion: '7.0',
				policyCode: 'ERPSTD',
				policyTitle: {
					'en-us': 'Standard edition',
					'fr-fr': 'Edition standard',
					'default': 'Standard edition'
				},
				policyVersion: '1.0'
			}],
			sessionControl: 'concurrent',
			expires: [],
			nextCheck: '2014-08-31',
			previousCheck: '2013-01-01'
		};
		var res = check._getX3LicenseInfoInt("ERP10", "1.0", "ACCTCLRK", parsedLicense, diagnoses);
		strictEqual(res, undefined, "Wrong product");
		var res = check._getX3LicenseInfoInt("ERP", "10.0", "ACCTCLRK", parsedLicense, diagnoses);
		strictEqual(res, undefined, "Low version");
		var res = check._getX3LicenseInfoInt("ERP", "6.9.9", "", parsedLicense, diagnoses);
		strictEqual(res, undefined, "No badge");
		var res = check._getX3LicenseInfoInt("ERP", "6.9.9", "ACCTCLRK", parsedLicense, diagnoses);
		strictEqual(!!res, true, "Information available");
		var res = check._getX3LicenseInfoInt("ERP", "7.0", "ACCTCLRK", parsedLicense, diagnoses);
		strictEqual(!!res, true, "Information available");
		strictEqual(res.licenses.length, 1, "One license");
		strictEqual(res.licenses[0], parsedLicense.products.ERP.licenses[0], "correct content");
		strictEqual(res.legislations.FRA, true, "FRA legislation")
		strictEqual(res.legislations.ENG, false, "ENG legislation");
		strictEqual(res.keyFunctions.GENLEDGERMGT, true, "key function GENLEDGERMGT")
		strictEqual(res.keyFunctions.ACCTPLAN, true, "key function ACCTPLAN")
		strictEqual(res.keyFunctions.ACCTKPIS, false, "key function ACCTKPIS")
		strictEqual(res.keyFunctions.XXX, false, "key function XXX")
		var res = check._getX3LicenseInfoInt("ERP", "7.0", "ACCTCLRK,UNSINN,CFO", parsedLicense, diagnoses);
		strictEqual(!!res, true, "Information available");
		strictEqual(res.licenses.length, 1, "One license");
		strictEqual(res.licenses[0], parsedLicense.products.ERP.licenses[0], "correct content");
		strictEqual(res.legislations.FRA, true, "FRA legislation")
		strictEqual(res.legislations.ENG, false, "ENG legislation");
		strictEqual(res.keyFunctions.GENLEDGERMGT, true, "key function GENLEDGERMGT")
		strictEqual(res.keyFunctions.ACCTPLAN, true, "key function ACCTPLAN")
		strictEqual(res.keyFunctions.ACCTKPIS, true, "key function ACCTKPIS")
		strictEqual(res.keyFunctions.XXX, false, "key function XXX")

	})

	it('check ISO date', function() {
		strictEqual(check._ci(""), false, "No date")
		strictEqual(check._ci("abcde"), false, "abcde")
		strictEqual(check._ci("2012"), false, "2012")
		strictEqual(check._ci("2014-02-29"), false, "2014-02-29")
		strictEqual(check._ci("2014-11-31"), false, "2014-11-31")
		strictEqual(check._ci("2014-11-30Z"), false, "2014-11-30Z")
		strictEqual(check._ci(56), false, "No date")
		strictEqual(check._ci("2014-11-30"), true, "2014-11-30")
	});
});