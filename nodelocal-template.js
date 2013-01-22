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

helpers.fusionProxyTracer = false;  // true ==> Every client/server exchanges are traced

helpers.proxy ={
	server: "your_proxy_server",
	port: 80
}

helpers.sageup = {
	format: 'json',  // format can be 'json' or 'xml'
	debug: false,  // Activate http request traces
	params: {   // add everything as http parameters at url queue ==> ?param1key=param1val&param2key=param2val...
		//returnDelta: true   
	}
};

exports.config = {
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
