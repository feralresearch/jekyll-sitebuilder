// gulpfile.js
//
//
//////////////////////////////////////////

// BrowserSync settings
const server_port = 4000;
const open_browser_on_start = false;

// Where do the jekyll files live?
//const siteSRC = '../';
var argv = require('yargs').argv;
if (typeof argv.src == "undefined") {
	console.log("Usage: gulp --src /path/to/jekyll/site");
	process.exit();
}

const siteSRC = argv.src;
console.log("GULPING: "+siteSRC);
const siteDEST = siteSRC+'/_site';
const files_siteContent =
	[
		siteSRC+'/_includes/**/*',
        siteSRC+'/_layouts/**/*',
        siteSRC+'/_posts/**/*',
        siteSRC+'/_pages/**/*'
	];

const files_scssAssets_in = siteSRC+'/_assets/scss/**/*.scss';
const files_scssAssets_out = siteSRC+'/_assets/scss/**/*.scss';

const files_cssAssets_in = siteSRC+'/_assets/css/**/*.css';
const files_cssAssets_out = siteDEST + '/assets/css';

const files_jsAssets_in = siteSRC+'/_assets/js/**/*.js';
const files_jsAssets_out = siteDEST + '/assets/js';

const files_imgAssets_in = siteSRC+'/_assets/img/**/*';
const files_imgAssets_out = siteDEST + '/assets/img';

const files_tagList = siteSRC+'/_site/assets/data/tag_listing.csv';
const files_categoryList = siteSRC+'/_site/assets/data/category_listing.csv';

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
		'--source', siteSRC,
		'--destination', siteDEST,
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
		'jekyll_src': siteSRC,
		'list_in': files_tagList,
		'type': 'tags',
		'clean': true
	});
	generateStubs.generate();
});

// Generate the category stubs
gulp.task('generate_categoryStubs', () => {
	generateStubs.init({
		'jekyll_src': siteSRC,
		'list_in': files_categoryList,
		'type': 'categories',
		'clean': true
	});
	generateStubs.generate();
});

gulp.task('copy_data', () => {
	gulp.src(siteSRC+'/_assets/data/*').pipe(gulp.dest(siteSRC+'/_site/assets/data/'));
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
		'jekyll_render',
		'generate_tagStubs',
		'generate_categoryStubs',
		'jekyll_render',
		'copy_data'
	);


	// Setup browserSync
	// Options: https://browsersync.io/docs/options
	browserSync.init({
		files: [siteDEST + '/**'],
		port: server_port,
		open: open_browser_on_start,
		server: {
			baseDir: siteDEST,
			// This middleware allows for "clean urls"
			middleware: hygienist(siteDEST)
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
					'copy_data',
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
