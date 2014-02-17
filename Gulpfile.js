var gulp = require('gulp'),
	qunit = require('gulp-qunit'),
	nodemon = require('gulp-nodemon'),
	jshint = require('gulp-jshint'),
	beautify = require('gulp-beautify');

var paths = {
	src: ['*.js',
		'node_modules/streamline*/**',
		'node_modules/syracuse*/**',
		'node_modules/etna*/**',
		'node_modules/ez-streams*/**'
	],
	test: 'node_modules/*/test/{client,server,common}/*.{js,_js}'
};

// Tasks
gulp.task('jshint', function() {
	gulp.src(paths.src)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('beautify', function() {
	gulp.files(paths.src)
		.pipe(beautify({
			indentSize: 1
		}));
});

gulp.task('develop', function() {
	nodemon({
		script: 'index.js',
		options: '-e js,_js -i Gulpfile.js'
	});
		// .on('restart', ['jshint']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['develop']);
