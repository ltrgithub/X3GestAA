'use strict';

var fs = require('fs');

module.exports = function(grunt) {

	var paths = {
		src: ['*.js',
			'node_modules/streamline*/**/*.{js,_js}',
			'node_modules/syracuse*/**/*.{js,_js}',
			'node_modules/etna*/**/*.{js,_js}',
			'node_modules/ez-streams*/**/*.{js,_js}'
		],
		test: {
			client: 'node_modules/*/test/client/*.{js,_js}',
			// server: 'node_modules/*/test/{server,common}/*.{js,_js}'
			server: 'node_modules/syracuse-*/test/{server,common}/*.{js,_js}'
		},
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
					src: paths.src
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
		qunit: {
			all: {
				options: {
					urls: [
						'http://localhost:8124/test-runner/lib/client/testClientCI.html'
					]
				}
			}
		},
		nodemon: {
			dev: {
				script: 'index.js',
				options: {
					delayTime: 1,
					ext: 'js,_js',
					ignore: ['Gruntfile.js']
				}
			}
		},
		testrunner: {
			all: {
				src: paths.test.server
			}
		}
	});

	// Load NPM tasks
	grunt.loadNpmTasks('grunt-fixmyjs');
	grunt.loadNpmTasks('grunt-jsbeautifier');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-nodemon');

	grunt.registerMultiTask("testrunner", "run unit tests", function() {
		require('streamline').register(require('./nodelocal').config.streamline);
		var done = this.async(),
			started = new Date();
		var qunit = require('qunit');

		// Setup Qunit
		qunit.setup({
			log: {
				summary: true,
				errors: true,
				coverage: true
			},
			coverage: true
		});

		var harmony = false;
		try {
			eval("(function*(){})");
			harmony = true;
		} catch (ex) {}

		this.filesSrc.filter(function(file) {
			return harmony || !/galaxy/.test(file);
		}).forEach(function(test) {
			var codeMatch = fs.readFileSync(test, 'utf8').match(new RegExp('["\'](' + test.split('/')[1] + '.+)["\']'));
			if (!codeMatch) console.log("code for?", test);
			var code = codeMatch ? 'node_modules/' + codeMatch[1] + test.substr(test.lastIndexOf('.')) : test;
			var files = {
				code: code,
				tests: test
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
						qunit.log.reset();
					};
				};
				if (!waitForAsync) {
					done(result.failed === 0);
					qunit.log.reset();
				}
			});
		});
	});

	// Lint and fix
	grunt.registerTask('lint', ['fixmyjs', 'jsbeautifier', 'jshint']);

	// Test task
	grunt.registerTask('test', ['qunit', 'testrunner']);

	grunt.registerTask('default', ['nodemon']);
};
