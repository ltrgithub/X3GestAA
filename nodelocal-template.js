// This file must be copied as nodelocal.js
// You should edit the copy to adapt it to your local settings.
//
// YOUR LOCAL COPY MAY CONTAIN CONFIDENTIAL INFORMATION (passwords for example)
// SO DO NOT EDIT THE TEMPLATE ITSELF, ONLY EDIT YOUR COPY (nodelocal.js)
//
// The nodelocal.js file is marked as "ignored" for subversion.
// So subversion will not try to add it when you run the subversion Add command.

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
		// enables memwatch module
		memwatch: false,
		// this options enables developpement features like extended authoring rights.
		// it shouldn't be enabled in client configurations as modifications made can be lost
		// on patch application, etc.
		enableDevelopmentFeatures: false,
		// enables some specific client framework attributes for use with the test robot
		enableTestRobot: false,
		// optional: path to some stubs to use in development and tests, relative to index.js
		// stubsPath = "stubs"
		protectSettings: false // internal: true for some production servers to avoid import of initial data
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
	x3fusion: {
		// 		prototypesLocalServerRoot: "/sdata/x3stb/erp/fusion",
		//		prototypesFolder: "GEN/SYR/FR-FR/FENJ",
		//		tracer: console.log,
		//		profiler: console.log
	},

	help: {
		// trace: console.log,
		//
		// Path to help stored on local file system
		// rootDir: c:/help-path/online-doc/DOCV7-X3,
		//
		// Override help URL with local file system path
		// local: true,
		//
		// Override cloud based help URL
		// url: "http://uranus2:8080/AdxDoc_DOCV7X3/"
	},
	searchEngine: {
		//tracer: console.log,

		// Using a minimal stemmer should only group plurals rather than a
		// deeper root of the word.
		stemmer: "minimal",

		// Leading wildcards can affect search performance
		allowLeadingWildcard: false,
        /*tracer : {
            trace : console.log,
            info : true
        }*/
        //deactivateRight: true,
		// default configuration options for fuzzy search
		// minSimilarity: 0.5,
		// ignoreFrequency: true,
        // offStemmer : true // desactivation of the stemmer for the search indexation
	},
	translation: {
		// trace: console.log,
		// redirect diagnosis in the trace
		traceDiagnosis: true,
		// skip extraction and updating of the specified resource type
		skip: {
			// syracuse: true,
			// dotnet: true,
			// admin: true,
		}
	},
	orm: {
		x3: {
			// trace: console.log,
		}
	},
};
