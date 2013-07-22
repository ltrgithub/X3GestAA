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

helpers.sageup = {
	format: 'json',  // format can be 'json' or 'xml'
	debug: false,  // Activate http request traces
	params: {   // add everything as http parameters at url queue ==> ?param1key=param1val&param2key=param2val...
		//returnDelta: true   
	}
};

exports.config = {
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
		"fibers": false,
		"cache": true,
		"verbose": true
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
