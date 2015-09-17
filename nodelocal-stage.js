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
                adminUserRestrict: true,
                enablePartnerFeatures: false,
                hosting: {
                                // multiTenant should be set to true when hosted in Cloud.
                                // When this option is set, the tenantId is extracted from the HTTP Host header and is used to prefix
                                // the mongodb database names and the elastic search index names.
                                multiTenant: true,
                                // https indicates if the public URLs must all be https URLs.
                                // This is the case if the syracuse service is front-ended by a proxy or a load balancer that handles
                                // https on its behalf.
                                https: true,
								dbUnlock: true,
								localBalancer: true
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
                                protectSettings: false, // internal: true for some production servers to avoid import of initial data
        // limit memory usage
        memoryLimit: 0, // strategy to limit memory usage: limit is an indication; 0 means no limit
        // flag to expose stack traces to the UI (off by default for security)
        exposeStacktrace: false,
                },
                port: 8124,

                collaboration: {
                                driver: "mongodb",
                                dataset: "syracuse",
                                hostname: "10.198.2.4:27017,10.198.2.68:27017,10.198.2.132",
                                port: 27017,
                                logpath: "D:\\Sage\\Syracuse\\syracuse\\logs",
                                //certdir: "D:\\Sage\\Syracuse\\syracuse\\certs",
        cacheDir: "D:\\Sage\\Syracuse\\syracuse\\cache"
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
                readPreference: "primaryPreferred",
                rs_name: "mongoStagvRepl"
            },
            mongos: {
            }
        }
    },
                session: {
                                timeout: 20, // minutes
                                asyncTimeout: 20, // Delete asynchronous sdata trackers after 20 minutes by default for GET operations.
                                checkInterval: 60, // secondes
                                //                            ignoreStoreSession: true,
                                "auth": ["sage-id"]
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
                                //                            prototypesLocalServerRoot: "/sdata/x3stb/erp/fusion",
                                //                            prototypesFolder: "GEN/SYR/FR-FR/FENJ",
                                //                            tracer: console.log,
                                //                            profiler: console.log
                                // protocol tracing
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
                                }
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
                                hostname: "elastic_search_master",
        port: 9200,
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
                upload: {
                                // White list of media types that we allow in upload operations
                                // This entry is mandatory when hosting.multiTenant is true.
                                // The white list may be specified as a single regular expression or an array or regular expressions.
                    allowedTypes: /^(application|image|text\/(plain|rtf))(\/|$)/
                },
                sage_id: {
                                // base URL of sage ID service - this one is staging, not prod
                                baseUrl: "https://na-services.sso.staging.services.sage.com/SSO",
                                // absolute file name of the PFX certificate file provided by Sage ID. This one only works with staging server
                                pfxFile: __dirname + "/node_modules/syracuse-auth/test/certificates/Sage_ERP_X3_Development.pfx",
                                // passphrase for the certificate file. This one works with the staging test certificate
                                passphrase: "as985k3bZ8p2",
                },
                mongoNotify: {
                                host: 'sage_id_notifications',
                                port: '27017',
                                database: 'syracuse',
                },
								health:{
							parallel: 4,
							delay: 300,
							logUrl: "https://staging-api.sagex3.com/healthLogs/production",
                            siteUrl: "https://staging-api.sagex3.com/sdata/sky/automation/production",
                            site: "c2t5YWRtOiRreVdlYiR2YyQwMSE=",
						cloudwatch: true,
	},
					aws: {

		region: 'us-east-1'
	},
          unit_test: {
        // unit tests related options
        x3endpoint: {},
        elasticsearch: {}
    }
};
