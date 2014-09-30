// Tools
//
var gulp       = require('gulp');
var connect    = require('gulp-connect');
var concat     = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var sass       = require('gulp-sass');
var hint       = require('gulp-jshint');
var stylish    = require('jshint-stylish');


// project vars
//
var src    = 'src/';
var markup = src + 'index.html';
var js     = src + '*.js';
var vendor = src + 'vendor/*.js';
var scss   = src + '*.scss';

var dest   = 'build/';
var assets = dest + 'assets/'


// tasks
//
gulp.task( 'html', function () {
	gulp.src( markup )
		.pipe( gulp.dest( dest ) )
		.pipe(connect.reload());
});

gulp.task('styles', function () {
	gulp.src( scss )
		.pipe(sass())
		.pipe(gulp.dest( assets ))
		.pipe(connect.reload());
});

gulp.task( 'lint', function () {
	return gulp.src( js )
		.pipe( hint() )
		.pipe( hint.reporter( stylish ) );
});

gulp.task( 'app', ['lint'], function() {
	gulp.src( js )
		.pipe(sourcemaps.init())
		.pipe(concat('script.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest( assets ))
		.pipe(connect.reload());
});

gulp.task( 'vendor', function() {
	gulp.src( vendor )
		.pipe(sourcemaps.init())
		.pipe(concat('vendor.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest( assets ));
});

gulp.task( 'build', ['html', 'styles', 'vendor', 'app' ])


gulp.task( 'server', ['build'], function (){
	connect.server({
		root: dest,
		livereload: true
	});
});

// A development task to run anytime a file changes
gulp.task('watch', function() {
 gulp.watch( markup, ['html']);
 gulp.watch( js, ['app']);
 gulp.watch( vendor, ['vendor']);
 gulp.watch( scss, ['styles']);
});

gulp.task( 'default', ['server', 'watch'] );
// gulp.task( 'default', ['server'] );
