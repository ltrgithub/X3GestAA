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
		//https: true,
		chefUrl: 'http://10.198.254.20:8181'
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
		secure: true,
		auth: ["basic", "certificate"]
	},
	apiHealthScheduler: {
		//Enable external health checks from web API
		enabled: true,
		delay: 300,
		siteuriSuffix: "/auth/login/page",
		timeout: 30,
		cloudwatch: true,
		esHostName: "http://internal-ElasticSearch-1335197430.us-west-1.elb.amazonaws.com",
		esPort: 9200,
		mongoHostName: "10.198.2.4:27017,10.198.2.68",
		mongoPort: 27017,
		ds:	{
			healthId: "c2E6U0BnZVgzQ0xPVUQjMSFUWGw=",
			instance: "X3CLOUD",
			catalog: "sagex3",
			timeout: 10000,
		},
	},
	alerts:{
        consecutivePeriods: 1,
        period: 300,
		threshold: 60000,
		actionsEnabled: true,
		actions: "arn:aws:sns:us-east-1:653201425183:Ron",
		env: "QA"
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
	sage_id: {
		// base URL of sage ID service - this one is staging, not prod
		baseUrl: "https://services.sso.staging.services.sage.com/SSO",
		// absolute file name of the PFX certificate file provided by Sage ID. This one only works with staging server
		pfxFile: __dirname + "/node_modules/syracuse-auth/test/certificates/Sage_ERP_X3_Development.pfx",
		// passphrase for the certificate file. This one works with the staging test certificate
		passphrase: "as985k3bZ8p2",
		devOpsEmail: 'SageERPX3DevOps@sage.com',
	},
	skyAutomation: {
        	mongo:{
            		server:"10.198.2.4,10.198.2.68",
            		port:27017,
        	},
        	vpcId: "vpc-d3c1f1b6",
    	},
	aws: {
        "region": "us-east-1",
	},
	siteCountries: {
		list: ["USA", "Canada", "UK", "France"],
	},
	collaboration: {
		driver: "mongodb",
		dataset: "syracuse",
		hostname: "10.198.254.52:27017,10.198.254.53:27017,10.198.254.135:27017,10.198.254.136",
		port: 27017
	},
	opa: {
		emailSettings: {
			host: '10.198.254.25',
			port: 25,
			text: {
				from: 'provisioningmaster@sage.com',
				to: 'SageERPX3DevOps@sage.com',
				subject: 'Provisiong complete for ',
				html: 'Hello, <br><br> The following site has finished provisioning, <b>+//+replacesite+//+</b>. <br><br> Please navigate to the following URL and apply the necessary manual steps: <br> <b>+//+replaceurl+//+</b> <br><br> Thank you'
			},
		},
	},
	xmSymphony: {
		api: "https://localhost:8124",
		certPath: __dirname + '/node_modules/sky-automation/lib/ssl/admca.crt',
		keyPath: __dirname + '/node_modules/sky-automation/lib/ssl/admca.key',
		passphrase: 'admca',
	},
	SEI: {
		s3Region: "us-east-1",
		s3Bucket: "SEIConfig",
		key: "QA"
	},
	cloudflare: {
		options : {
	        hostname: 'api.cloudflare.com',
	        port: 443,
	        headers: {
	            "X-Auth-Email": "infra.arch@sage.com",
	            "X-Auth-Key": "2d03c4a22cc1dabc7439f07e95897e2e48c59"
	        }
	    },
	    zoneName: "dev-sageerpx3online.com",
	    content: "qa.sei.cloud.dev-sageerpx3online.com",
	    paths: {
	        getRecord :'/client/v4/zones/:zoneID/dns_records?name=',
	        deleteRecord: '/client/v4/zones/:zoneID/dns_records/',
	        addRecord: '/client/v4/zones/:zoneID/dns_records',
	        updateRecord:  '/client/v4/zones/:zoneID/dns_records/',
	        listZones: '/client/v4/zones?per_page=999',
	        getZone: '/client/v4/zones?name=:zoneName',
	    }
	},

};
