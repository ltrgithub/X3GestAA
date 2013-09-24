// This file must be copied as nodelocal.js
// You should edit the copy to adapt it to your local settings.
//
// YOUR LOCAL COPY MAY CONTAIN CONFIDENTIAL INFORMATION (passwords for example)
// SO DO NOT EDIT THE TEMPLATE ITSELF, ONLY EDIT YOUR COPY (nodelocal.js)
//
// The nodelocal.js file is marked as "ignored" for subversion. 
// So subversion will not try to add it when you run the subversion Add command. 

var helpers = require('syracuse-core/lib/helpers');

helpers.stubsPath = "stubs";
helpers.enableDeveloppementFeatures = true;


exports.config = {
	hosting: {
		// multiTenant should be set to true when hosted in Cloud.
		// When this option is set, the tenantId is extracted from the HTTP Host header and is used to prefix
		// the mongodb database names and the elastic search index names.
		multiTenant: false,
		// https indicates if the public URLs must all be https URLs.
		// This is the case if the syracuse service is front-ended by a proxy or a load balancer that handles
		// https on its behalf.
		https: false,
	},
	system: {
//			memwatch: true
	},
/*	integrationServer: {
		port: 8125
	},
*/
	session: {
		timeout: 20, // minutes
		checkInterval: 60, // secondes
//		ignoreStoreSession: true,
		"auth": "basic"
	},
	streamline: {
		// "homedrive": "c:", // running node as service
		// "homepath": "/syracuse", // running node as service
		"fibers": true,
		"cache": true,
		"verbose": true,
		"fast": true
	},
	session: {
		"auth": "basic"
	},
	x3fusion: {
// 		prototypesLocalServerRoot: "/sdata/x3stb/erp/fusion",
//		prototypesFolder: "GEN/SYR/FR-FR/FENJ",
//		tracer: console.log,
//		profiler: console.log
	}
};
