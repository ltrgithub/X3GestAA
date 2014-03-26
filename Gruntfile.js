'use strict';

var fs = require('fs');
var harmony = false;
try {
	eval("(function*(){})");
	harmony = true;
} catch (ex) {}

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
			// server: ['node_modules/syracuse-*/test/{server,common}/*.{js,_js}', "!syracuse-license/test/server/parseLicenseTest"]
			// server: 'node_modules/syracuse-*/test/{server,common}/*.{js,_js}',
			server: 'node_modules/syracuse-core/test/{server,common}/*.{js,_js}'
			// server: 'node_modules/syracuse-core/test/{server,common}/bigintTest.{js,_js}'
			// server: 'node_modules/syracuse-core/test/{server,common}/timeTest.{js,_js}'
			// server: 'node_modules/bundles/test/{server,common}/dotTest.{js,_js}'
		}
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
				src: paths.test.server,
				filter: function(file) {
					return harmony || !/galaxy/.test(file);
				},
				options: {
					log: {
						assertions: true,
						errors: true,
						summary: true,
						// coverage: true
					},
					// coverage: true
				}
			}
		}
	});

	// Load NPM tasks
	grunt.loadNpmTasks('grunt-fixmyjs');
	grunt.loadNpmTasks('grunt-jsbeautifier');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-nodemon');
	grunt.loadNpmTasks('grunt-nodequnit');

	grunt.registerMultiTask('testrunner', 'run unit tests', function() {
		var data = this.data;

		// for coverage
		// this.filesSrc.forEach(function(test) {
		// var codeMatch = fs.readFileSync(test, 'utf8').match(new RegExp('["\'](' + test.split('/')[1] + '.+)["\']'));
		// var code = codeMatch ? 'node_modules/' + codeMatch[1] + test.substr(test.lastIndexOf('.')) : test;
		// if (code.slice(-3) === '_js' && !fs.exists(code)) code = code.substr(0, code.lastIndexOf('.')) + '.js';
		// data.options.code = code;
		grunt.config.set('nodequnit.all', data);
		grunt.task.run('nodequnit');
		// });
	});

	// Lint and fix
	grunt.registerTask('lint', ['fixmyjs', 'jsbeautifier', 'jshint']);

	// Test task
	grunt.registerTask('test', ['qunit', 'testrunner']);

	grunt.registerTask('default', ['nodemon']);
};
