'use strict';

module.exports = function(grunt) {
	var src = ['*.js', 'node_modules/streamline*/**', 'node_modules/syracuse*/**', 'node_modules/etna*/**'];

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			all: {
				src: src,
				options: {
					jshintrc: true,
					extensions: '_js'
				}
			}
		},
		fixmyjs: {
			options: {
				indent: 1,
				indentpref: 'tabs',
				legacy: true
			},
			test: {
				files: [{
					expand: true,
					src: src
				}]
			}
		},
		jsbeautifier: {
			files: src,
			options: {
				js: {
					indentWithTabs: true,
					indentSize: 1
				}
			}
		},
		qunit: {
			all: ['node_modules/**/test/**/*.js'],
			client: ['node_modules/**/test/cient/*', 'node_modules/**/test/common/*'],
			server: ['node_modules/**/test/server/*.', 'node_modules/**/test/common/*']
		}
	});

	//Load NPM tasks
	grunt.loadNpmTasks('grunt-fixmyjs');
	grunt.loadNpmTasks('grunt-jsbeautifier');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');

	// Lint and fix
	grunt.registerTask('default', ['jsbeautifier', 'fixmyjs', 'jshint']);

	//Test task.
	grunt.registerTask('test', ['qunit']);
};
