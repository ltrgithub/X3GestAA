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
	/*
	 * With this flag set to true, even Syracuse administrators will not be able to associate 
	 * Syracuse users to X3 users on specific endpoints if the login match to Sage factory syracuse user's login.
	 * For instance, it will be impossible to map a Syracuse user with ADMIN X3 user.
	 */
	adminUserRestrict: false,
	hosting: {
		// multiTenant should be set to true when hosted in Cloud.
		// When this option is set, the tenantId is extracted from the HTTP Host header and is used to prefix
		// the mongodb database names and the elastic search index names.
		multiTenant: false,
		// https indicates if the public URLs must all be https URLs.
		// This is the case if the syracuse service is front-ended by a proxy or a load balancer that handles
		// https on its behalf.
		https: false,
		// Enable only if you would like to check status of site
		/*sitecheck: {
			localTest: "true",
			host: "localhost",
			port: 8124,
			dataset: "production",
			landingPage: "http://localhost:8080/"
		},*/
		// allow to pass some node parameter like --prof
		nodeOptions:""
	},
    security: {
        http: {
        	// set 'x-frame-options' to enable embedding into another site via iframe
            // 'x-frame-options': 'allow-from http://other-site',
        	// set 'allow' to define what OPTIONS request can be executed
        	"allow": "POST, GET"
		},
		cors: {
			// set 'all access-control' headers wanted for cross-origin calls
			// "access-control-allow-origin": "*",
			// "access-control-allow-headers": "authorization, content-type, soapaction, x-requested-with",
		}
        
    },
	system: {
		// enables memwatch module
		memwatch: false,
		// this options enables developpement features like extended authoring rights.
		// it shouldn't be enabled in client configurations as modifications made can be lost
		// on patch application, etc.
		enableDevelopmentFeatures: false,
		// next option disables caching of UI resources (JS scripts, CSS files, images)
		// it should only be turned on by platform UI developers.
		noUiCache: false,
		// enables some specific client framework attributes for use with the test robot
		enableTestRobot: false,
		// optional: path to some stubs to use in development and tests, relative to index.js
		// stubsPath = "stubs"
		protectSettings: false, // internal: true for some production servers to avoid import of initial data
		// limit memory usage
		memoryLimit: 500, // strategy to limit memory usage: limit is an indication; 0 means no limit,
        // flag to expose stack traces to the UI (off by default for security)
        exposeStacktrace: false,
        // bindIP if IP_ANY is not the good binding (IPV6)
        bindIP: "0000:00:00:00:00:00000"
	},
	/*	integrationServer: {
		port: 8125
	},
	*/
    collaboration: {
        certdir: "certificates"  // path to certificates folder
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
		// interactive session timeout (minutes).
		timeout: 20, // minutes
		// session extra timeout (minutes) if async tracker is running.
		asyncTimeout: 20,
		// session timeout (minutes - decimals allowed) for stateless (web service) requests.
		statelessTimeout: 1,
		// interval (in seconds) between scans to release sessions.
		checkInterval: 60,
		// ?
		//		ignoreStoreSession: true,
		// authentication modes
		"auth": "basic",
	},
	streamline: {
		// "homedrive": "c:", // running node as service
		// "homepath": "/syracuse", // running node as service
		"fibers": true,
		"cache": true,
		"verbose": true,
		"fast": true,
        // comment out the flamegraph block to activate flame graphs
        // options are documented on https://github.com/Sage/streamline-flamegraph#configuration
		// flamegraph: { rate: 1, },	
	},
	docTool: {
		"verbose": false,
		"disabled": false // do not generate doc at startup. Useful for having cleaner flame graph.
	},
	x3fusion: {
		// 		prototypesLocalServerRoot: "/sdata/x3stb/erp/fusion",
		//		prototypesFolder: "GEN/SYR/FR-FR/FENJ",
		//		tracer: console.log,
		//		profiler: console.log
		// protocol tracing
        plugin : {
            killTimeoutOnCreate : 120000 // timeout switch orchestration mode
        },
		protocol: {
			// trace: console.log,
			LBFChunkSize: 64 // in Kb
		},
		// session tracing
		sessions: {
			// trace: console.log,
		},
		// enable perfmon logging
		perfmon: {
			// activate: true,
			// more details
			// detail: true
		},
		// cache tracing
		cache: {
			// trace: console.log,
		},
        reuseTimeout: 20 // timeout of sessions reuse, in minutes (miliseconds values also tolerated)
        // webProxyWhitelist: "^(.*)/(GEN|RES)/.*\.(js|json|gif|png|jpeg|jpg|ico|bmp)$", // whitelist for PUB web folder, there is a builtin whitelist. Regexp or array of regexp.
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
		// offStemmer : true, // desactivation of the stemmer for the search indexation
        // useFolderNameAsIndexName: false, // for X3 instead of dataset, use solutionName.folderName as index name
	},
	notificatonServer: {
		//"log Level" : 3,
		//'connect timeout': 1000,
		//'reconnect': true,
		//'reconnection delay': 300,
		//'max reconnection attempts': 10000,
		//'force new connection':true
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
	upload: {
		// White list of media types that we allow in upload operations
		// This entry is mandatory when hosting.multiTenant is true.
		// The white list may be specified as a single regular expression or an array or regular expressions.
	    allowedTypes: /^(application|image|text\/(plain|rtf))(\/|$)/
	},
	sage_id: {
		// base URL of sage ID service - this one is staging, not prod
		baseUrl: "https://services.sso.staging.services.sage.com/SSO",
		// absolute file name of the PFX certificate file provided by Sage ID. This one only works with staging server
		pfxFile: __dirname + "/node_modules/syracuse-auth/test/certificates/Sage_ERP_X3_Development.pfx",
		// passphrase for the certificate file. This one works with the staging test certificate
		passphrase: "as985k3bZ8p2",
		devOpsEmail: 'SageERPX3DevOps@sage.com',
		oauth: {
			client_id: 'pl4JKQLpgNdEFTgM2Oe1juQQ0dHiv3VD',
			scope: 'vstf4mpl();',
			secret_key: 'ZUcNBEOCkvwSahYavgKZXl6RL+S8b5CGxaE7MpOhtqM=',
			baseUrl: 'https://signon.sso.staging.services.sage.com/SSO',
			redirectUrl: 'http://localhost:8124/auth/oauth2/sageid/sageIdRedirect',
			redirectPath: '/auth/oauth2/sageid/sageIdCallback',
			key: 'RtsQnOKEIqY3+AX0m169DmvWNqQjkyBqDTWI6CL4ZK4=',
			iv: '6KYYzs9BZFxeR6i0exR/Tg==',
			retrieveTokenPath: '/auth/oauth2/sageid/sageIdTokenRetrieval'
		}
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
			notifications:"error",
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
			help: "error",
			studio: {
				proxy: "error",
				helper: "error",
				session: "error",
				dispatch: "error"
			},
			"soap-generic": {
				pool: "error",
				stub: "error",
				request: "error",
				ackcall: "error"
			},
		}
    },	
    unit_test: {
        // unit tests related options
        x3endpoint: {},
        elasticsearch: {}
    },
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


