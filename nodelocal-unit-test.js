// This file must be copied as nodelocal.js
// You should edit the copy to adapt it to your local settings.
//
// YOUR LOCAL COPY MAY CONTAIN CONFIDENTIAL INFORMATION (passwords for example)
// SO DO NOT EDIT THE TEMPLATE ITSELF, ONLY EDIT YOUR COPY (nodelocal.js)
//
// The nodelocal.js file is marked as "ignored" for subversion. 
// So subversion will not try to add it when you run the subversion Add command. 

exports.config = {
    // Partner feature correspond actually to factory creation capability.
    // This option allow to partners to set a factory ID on security 
    // profiles and then flag some data as factory to protect them.
    enablePartnerFeatures: false,
    hosting: {
        nocompress: true,
		// multiTenant should be set to true when hosted in Cloud.
		// When this option is set, the tenantId is extracted from the HTTP Host header and is used to prefix
		// the mongodb database names and the elastic search index names.
		multiTenant: false,
		// https indicates if the public URLs must all be https URLs.
		// This is the case if the syracuse service is front-ended by a proxy or a load balancer that handles
		// https on its behalf.
		https: false
	},
    system: {
        // enables memwatch module
        memwatch: false,
        // this options enables developpement features like extended authoring rights.
        // it shouldn't be enabled in client configurations as modifications made can be lost
        // on patch application, etc.
        enableDevelopmentFeatures: true,
        // next option disables caching of UI resources (JS scripts, CSS files, images)
        // it should only be turned on by platform UI developers.
        noUiCache: false,
        // enables some specific client framework attributes for use with the test robot
        enableTestRobot: true,
        // optional: path to some stubs to use in development and tests, relative to index.js
        // stubsPath = "stubs"
        protectSettings: false, // internal: true for some production servers to avoid import of initial data
        // limit memory usage
        memoryLimit: 500, // strategy to limit memory usage: limit is an indication; 0 means no limit,
        // flag to expose stack traces to the UI (off by default for security)
        exposeStacktrace: false
    },
    collaboration: {
        certdir: "certificatetest",  // path to certificates folder
        port: 27019
    },
    mongodb: {
        // connect options as expected by MongoClient.connect of nodejs mongodb driver
        options: {
            db: {
                w: 1
            },
            server: {
            },
            replSet: {
            },
            mongos: {
            }
        }
    },
    session: {
        timeout: 20, // minutes
        asyncTimeout: 20, // Delete asynchronous sdata trackers after 20 minutes by default for GET operations.
        checkInterval: 60, // secondes
        //		ignoreStoreSession: true,
        auth: [
            "basic",
            "ldap",
            "oauth2",
            "saml2"
        ]
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
        allowLeadingWildcard: false
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
	streamline: {
		// "homedrive": "c:", // running node as service
		// "homepath": "/syracuse", // running node as service
		"fibers": true,
		"cache": true,
		"verbose": true,
		"fast": true
	},
    docTool: {
        "verbose": false,
        "disabled": false // do not generate doc at startup. Useful for having cleaner flame graph.
    },
    traces: {
        console: false, // For developers
        // Levels specified here will be used for default traces settings
        // Valid levels are : 'info', 'debug', 'warn', and 'error'
        // Levels not specified will be initialized with 'error' level
        levels: {
            // Object-relational mapping
            orm: {
                factory: "error", // Syracuse entities management
                x3: "error", // X3 ERP entities management
                mongodb: "error", // MongoDB interactions
            },
            // Elastic search communication
            search: "error",
            // X3 ERP communication layer
            x3Comm: {
                jsRunner: "error", // Syracuse calls from 4GL processes
                pool: "error", // X3 clients pools
                print: "error", // Print server comunication layer
                adxwhat: "error"
            },
            // Classic server
            classic: {
                srvCache: "error", // Cache management with Web application server
                protocol: "error", // Protocol communication layer
                std: "error", // Basic traces
                action: "error", // Sent actions
                session: "error", // Sessions management
            },
            businessObjects: "error", // Business Objects integration
            // X3 HRM portal integration 
            hrm: {
                loadBalancer: "error", // Load balancer
                proxy: "error", // Proxy calls
            },
            // Online help integation
            help: "error"
        }
    },	
    tracker: {
        maxTimeBeforeSend : 100000
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
    rest: {
        client: {
            tracer: true
        }
    },
    orm: {
        x3: {
			// trace: console.log,
        }
    },
    upload: {
        // White list of media types that we allow in upload operations
        // This entry is mandatory when hosting.multiTenant is true.
        // The white list may be specified as a single regular expression or an array or regular expressions.
        allowedTypes: /^(application|image|text\/(plain|rtf))(\/|$)/
    },
    jsRunner: {
        trace: console.log
    },
	x3fusion: {
// 		prototypesLocalServerRoot: "/sdata/x3stb/erp/fusion",
//		prototypesFolder: "GEN/SYR/FR-FR/FENJ",
//		tracer: console.log,
//		profiler: console.log
        log : {
            trace: console.log
        },
        records: {
            user : "admin",
            password : "admin",
            trace : console.log,
            overwrite : true
        },
        protocol : {
            //trace : console.log
        },
        actions : {
            //trace : console.log
        },
        sessions : {
            //trace : console.log
        }
	},
	x3debug: {
		port: 8127
	},
    unit_test: {
        // unit tests related options
        // x3endpoint: {},
        awsTest: true,
        elasticsearch: {},
        suppress: {
            officeX3Lookup: true,
            x3print: true
        }
    }
};

// for git enabled configurations one can override the standard config
exports.branch_configs = [{
        branch: "V7\.0.*|V7\.1.*", // branch name should match this regular expression
        config : {
            collaboration: {
                databaseName: "Syracuse_V7",
                localInitScript: [] // some local data to import on database creation : standard import json file
            }
        }
    }, {
        branch: "akira.*", // branch name should match this regular expression
        config : {
            collaboration: {
                databaseName: "Syracuse_V8",
                localInitScript: [] // some local data to import on database creation
            }
        }
    }];

