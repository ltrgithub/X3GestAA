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
helpers.useInstances = true;
helpers.useMongodb = true;
helpers.enableDeveloppementFeatures = true;

helpers.debug.traces = { 
	//"sql.mapping": true,
	//"sql.execute": true
};

exports.config = {
	session: {
		timeout: 20, // minutes
		checkInterval: 60, // secondes
//		ignoreStoreSession: true,
		"auth": "basic"
	},
	streamline: {
		"fibers": false,
		"cache": true,
		"verbose": true
	},
	session: {
		"auth": "basic"
	},
	x3fusion: {
//		tracer: console.log,
//		profiler: console.log
	}
};
