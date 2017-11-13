// gulpfile.js
/*

npm init

https://gulpjs.com/

npm install gulp-cli -g
npm install gulp -D

npm install gulp
npm install gulp-util
npm install gulp-sass
npm install gulp-autoprefixer
npm install gulp-minify-css
npm install gulp-rename
npm install gulp-exec
npm install gulp-livereload
npm install tiny-lr

npm install livereload

https://blog.iansinnott.com/super-birthday-post/

https://www.npmjs.com/package/livereload

*/

// BrowserSync settings
const server_port = 4000;
const open_browser_on_start = false;

// Where do the jekyll files live?
// 	_assets
//		- scss
// 		- js
//		- img
const siteRoot = '../_site';
const files_siteContent  = [
		'../_includes/**/*',
        '../_layouts/**/*',
        '../_posts/**/*',
        '../_pages/**/*'];

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

// We use our own asset pipline to handle CSS, JS, Sass and Images
// Asset pipline split out so it can be run seperately
// by a deployment server for instance
const assetPipeline = require('./asset_pipeline');
const stubGenerator = require('./generate_collectionStubFiles');


// Other packages we require
const gulp = require('gulp');
const gutil = require('gulp-util');
const child = require('child_process');
const browserSync = require('browser-sync').create();
const hygienist = require('hygienist-middleware');
const runSequence = require('run-sequence');
//////////////////////////////////////////////////////////////////////




// Jekyll itself
// Jekyll does the job of actually watching and jekyll-ing
// We use _config.yml to exclude the assets directory,
// which we will handle ourselves with gulp
gulp.task('jekyll', () => {
	const jekyll = child.spawn('jekyll',
		['build',
		'--source', '../',
		'--destination', siteRoot,
		//'--incremental',
		'--drafts'
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


gulp.task('generate_tagStubs', () => {
	stubGenerator.init({
		'jekyll_src': '../',
		'list_in': files_tagList,
		'type': 'tags',
		'clean': true
	});

	stubGenerator.generate();
});

gulp.task('generate_categoryStubs', () => {
	stubGenerator.init({
		'jekyll_src': '../',
		'list_in': files_categoryList,
		'type': 'categories',
		'clean': true
	});
	stubGenerator.generate();
});


// Watch and Serve (Main function)
gulp.task('serve', function(gulpCallback) {

	// Setup asset pipline
	assetPipeline.init({
		browserSync: browserSync,

		scss_files_in: files_scssAssets_in,
		scss_files_out: files_cssAssets_out,

		js_files_in: files_jsAssets_in,
		js_files_out: files_jsAssets_out,

		img_files_in: files_imgAssets_in,
		img_files_out: files_imgAssets_out
	});

	// Run the asset pipeline once at start
	// This gets run again on watch (below) on file change
	assetPipeline.processSCSS();
	assetPipeline.processJS();
	assetPipeline.processIMG();



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
			scroll: false
		},
		logLevel: "silent"

		// BrowserSync server is now up...
	}, function callback() {

		// Watch the non-assets
		var watcher = gulp.watch(files_siteContent, console.log("CHangE!"));
		watcher.on('change', function(event) {
		  console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
		  runSequence(
			  		'generate_tagStubs',
  					'generate_categoryStubs',
  					'jekyll',
  					browserSync.reload);
		});

		// Handle the assets
		gulp.watch(files_scssAssets_in, assetPipeline.processSCSS);
		gulp.watch(files_jsAssets_in, assetPipeline.processJS);
		gulp.watch(files_imgAssets_in, assetPipeline.processIMG);

		// Notify gulp that this task is done
		gulpCallback();
	});
});

// Default task: launch jekyll, watch
gulp.task('default', ['jekyll', 'serve']);
