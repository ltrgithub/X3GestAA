'use strict';

module.exports = function(grunt) {

	var paths = {
		src: ['*.js',
			'node_modules/streamline*/**/*.{js,_js}',
			'node_modules/syracuse*/**/*.{js,_js}',
			'node_modules/etna*/**/*.{js,_js}',
			'node_modules/ez-streams*/**/*.{js,_js}'
		],
		test: 'node_modules/*/test/{client,server,common}/*.{js,_js}',
		images: 'node_modules/*/images/**/*.{png,jpg,gif}'
	};

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			all: {
				src: paths.src,
				options: {
					jshintrc: true,
					reporter: require('jshint-stylish'),
					extensions: '_js'
				}
			}
		},
		fixmyjs: {
			all: {
				files: [{
					expand: true,
					src: paths.src,
				}]
			},
			options: {
				indent: 1,
				indentpref: 'tabs',
				legacy: true
			}
		},
		jsbeautifier: {
			src: paths.src,
			options: {
				js: {
					indentWithTabs: true
				}
			}
		},
		nodemon: {
			dev: {
				script: 'index.js',
				options: {
					ext: 'js,_js',
					ignore: ['Gruntfile.js']
				}
			}
		},
		testrunner: {
			all: paths.test
		}
	});

	// Load NPM tasks
	grunt.loadNpmTasks('grunt-fixmyjs');
	grunt.loadNpmTasks('grunt-jsbeautifier');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-nodemon');

	grunt.registerMultiTask("testrunner", "run unit tests", function() {
		var done = this.async(),
			started = new Date();
		var qunit = require('qunit');
		var log = qunit.log;
		// Setup Qunit
		qunit.setup({
			log: {
				summary: true,
				errors: true
			}
		});

		var harmony = false;
		try {
			eval("(function*(){})");
			harmony = true;
		} catch (ex) {}

		var files = {};

		this.filesSrc.forEach(function(file) {
			if (!harmony && /galaxy/.test(file)) return;

			// Run tests
			files = {
				code: file,
				tests: this.filesSrc
				// tests: ['node_modules/html5-binary/test/client/bufferTest.js']
			};
			qunit.run(files, function(err, result) {
				if (!result) {
					throw "Could not get results for Qunit test. Check previous exceptions";
				}
				result.started = started;
				result.completed = new Date();
				var waitForAsync = false;
				done = function() {
					waitForAsync = true;
					return function(status) {
						done(typeof status === "undefined" ? (result.failed === 0) : status);
					};
				};
				if (!waitForAsync) {
					done(result.failed === 0);
				}
				log.reset();
			});
		});
		// }
		// if (['server', 'all'].contains(this.target)) {
		// 	var files = this.filesSrc.map(function(file) {
		// 		return file.split("node_modules/").pop();
		// 	});
		// 	require('streamline').register(require('./nodelocal').config.streamline);
		// 	var tester = require('test-runner/lib/server/testServer');
		// 	files.forEach_(_, function(_, file) {
		// 		console.log(tester.runUnitTest(_, file, true));
		// 		done();
		// 	});
		// }
	});

	// Lint and fix
	grunt.registerTask('lint', ['fixmyjs', 'jsbeautifier', 'jshint']);

	// Test task
	grunt.registerTask('test', ['testrunner:all']);

	grunt.registerTask('default', ['nodemon']);
};
