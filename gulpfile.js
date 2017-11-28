// gulpfile.js
//
//
//////////////////////////////////////////

// BrowserSync settings
const server_port = 4000;
const open_browser_on_start = false;

// Where do the jekyll files live?
const siteRoot = '../_site';
const files_siteContent =
	[
		'../_includes/**/*',
        '../_layouts/**/*',
        '../_posts/**/*',
        '../_pages/**/*'
	];

const files_scssAssets_in = '../_assets/scss/**/*.scss';
const files_scssAssets_out = '../_assets/scss/**/*.scss';

const files_cssAssets_in = '../_assets/css/**/*.css';
const files_cssAssets_out = siteRoot + '/assets/css';

const files_jsAssets_in = '../_assets/js/**/*.js';
const files_jsAssets_out = siteRoot + '/assets/js';

const files_imgAssets_in = '../_assets/img/**/*';
const files_imgAssets_out = siteRoot + '/assets/img';

const files_tagList = '../_site/assets/data/tag_listing.csv';
const files_categoryList = '../_site/assets/data/category_listing.csv';

// We use our own scripts handle CSS, JS, Sass and Images and category stub generation
const generateAssets = require('./generateAssets');
const generateStubs = require('./generateCollectionStubs');

// Node requirements
const gulp = require('gulp');
const gutil = require('gulp-util');
const child = require('child_process');
const browserSync = require('browser-sync').create();
const hygienist = require('hygienist-middleware');
const runSequence = require('run-sequence');

//////////////////////////////////////////////////////////////////////

// Jekyll itself
// Jekyll does the job of compiling the site
// We use _config.yml to exclude the assets directory,
// which we will handle ourselves with gulp
gulp.task('jekyll_render', () => {
	const jekyll = child.spawn('jekyll',
		['build',
		'--source', '../',
		'--destination', siteRoot,
		//'--incremental',
		'--drafts',
		'--quiet'
	]);

	// Clean up jekyll log so it looks nice alongside Gulp output
	const jekyllLogger = (buffer) => {
		buffer.toString()
			.split(/\n/)
			.forEach((message) => gutil.log('Jekyll: ' + message));
	};
	jekyll.stdout.on('data', jekyllLogger);
	jekyll.stderr.on('data', jekyllLogger);
});

// Generate the tag stubs
gulp.task('generate_tagStubs', () => {
	generateStubs.init({
		'jekyll_src': '../',
		'list_in': files_tagList,
		'type': 'tags',
		'clean': true
	});
	generateStubs.generate();
});

// Generate the category stubs
gulp.task('generate_categoryStubs', () => {
	generateStubs.init({
		'jekyll_src': '../',
		'list_in': files_categoryList,
		'type': 'categories',
		'clean': true
	});
	generateStubs.generate();
});

gulp.task('copy_data', () => {
	gulp.src('../assets/data/*').pipe(gulp.dest('../_site/assets/data/'));
});


// Watch and Serve (Main function)
gulp.task('browserSync_serve', function(gulpCallback) {

	// Setup asset pipline
	generateAssets.init({
		browserSync: browserSync,

		scss_files_in: files_scssAssets_in,
		scss_files_out: files_cssAssets_out,

		js_files_in: files_jsAssets_in,
		js_files_out: files_jsAssets_out,

		img_files_in: files_imgAssets_in,
		img_files_out: files_imgAssets_out
	});

	// Run the render / stubs / render once at startup
	generateAssets.processSCSS();
	generateAssets.processJS();
	runSequence(
		'copy_data',
		'jekyll_render',
		'generate_tagStubs',
		'generate_categoryStubs',
		'jekyll_render'
	);


	// Setup browserSync
	// Options: https://browsersync.io/docs/options
	browserSync.init({
		files: [siteRoot + '/**'],
		port: server_port,
		open: open_browser_on_start,
		server: {
			baseDir: siteRoot,
			// This middleware allows for "clean urls"
			middleware: hygienist(siteRoot)
		},
		ghostMode: {
			clicks: true,
			forms: true,
			scroll: true
		},
		logLevel: "silent"

	// BrowserSync server is now up...
	}, function callback() {

		// Watch non-assets
		var watcher = gulp.watch(files_siteContent);
		watcher.on('change', function(event) {
		  //console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');

		  // This could be gulp.series, once v4 is released
		  // Sequence is important so we don't get stuck in a loop
		  runSequence(
			  		'generate_tagStubs',
  					'generate_categoryStubs',
  					'jekyll_render',
				 	 //generateAssets.processIMG,
  					 browserSync.reload
				);
		});

		// Handle the js/css assets via injection
		gulp.watch(files_scssAssets_in, generateAssets.processSCSS);
		gulp.watch(files_jsAssets_in, generateAssets.processJS);

		// Notify gulp that this task is done
		gulpCallback();
	});
});

// Default task: launch jekyll, watch
gulp.task('default', ['jekyll_render', 'browserSync_serve']);
