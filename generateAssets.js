// generateAssets
// ================

// Requires
const concat = require('gulp-concat');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const argv = require('minimist')(process.argv.slice(2));
const gulp = require('gulp');
const runSequence = require('run-sequence');

const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');

const f_debug = false;

// Variables
var scss_files, js_files, img_files, data_files;

var runningAsScript = !module.parent;

// Gulp tasks
gulp.task('generateAssets_js', () => {
	if (runningAsScript){}

	if(f_debug){
		gulp.src(js_files_in)
			.pipe(concat('site.js'))
			.pipe(gulp.dest(js_files_out));
	}else{
		gulp.src(js_files_in)
			.pipe(concat('site.js'))
			.pipe(babel())
			.on('error', function(err) {
				gutil.log(gutil.colors.red('[Error]'), err.toString());
			})
			.pipe(uglify({
				output: { // http://lisperator.net/uglifyjs/codegen
					beautify: f_debug,
					comments: f_debug ? true : /^!|\b(copyright|license)\b|@(preserve|license|cc_on)\b/i,
				},
				compress: { // http://lisperator.net/uglifyjs/compress, http://davidwalsh.name/compress-uglify
					sequences: !f_debug,
					booleans: !f_debug,
					conditionals: !f_debug,
					hoist_funs: false,
					hoist_vars: f_debug,
					warnings: f_debug,
				},
			}))
			.on('error', function(err) {
				gutil.log(gutil.colors.red('[Error]'), err.toString());
			})
			.pipe(gulp.dest(js_files_out));
	}
});

gulp.task('generateAssets_img', () => {
	if (runningAsScript){
		console.log("AssetPipeline: IMG Handler - not implemented yet, passing files through --->");
	}
	// Just pass the files through
	gulp.src(img_files_in).pipe(gulp.dest(img_files_out));
});

gulp.task('generateAssets_data', () => {
	if (runningAsScript){
		console.log("AssetPipeline: Data Handler passing files through --->");
	}
	// Just pass the files through
	gulp.src(data_files_in).pipe(gulp.dest(data_files_out));
});

gulp.task('generateAssets_sass', () => {
	if (runningAsScript){
		console.log("AssetPipeline: SASS Handler - compiling");
	}
	gulp.src(scss_files_in)
		.pipe(sass().on('error', sass.logError))
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(gulp.dest(scss_files_out));
});

// Public methods
module.exports = {

	// Set the locations
	init: function(options) {
		broswerSync = options.broswerSync;

		scss_files_in = options.scss_files_in;
		scss_files_out = options.scss_files_out;

		js_files_in = options.js_files_in;
		js_files_out = options.js_files_out;

		img_files_in = options.img_files_in;
		img_files_out = options.img_files_out;

		data_files_in = options.data_files_in;
		data_files_out = options.data_files_out;
	},

	// Do SCSS processing
	processSCSS: function() {
		runSequence('generateAssets_sass');
	},

	// Do IMG processing
	processIMG: function() {
		runSequence('generateAssets_img');
		return "Asset Pipeline: IMG processing";
	},

	// Do JS processing
	processJS: function() {
		runSequence('generateAssets_js');
		return "Asset Pipeline: JS processing";
	},

	// Do Data file processing
	processData: function() {
		runSequence('generateAssets_data');
		return "Asset Pipeline: Data processing";
	}

};

// Parse command line input, requires a pair:
// --scss_in= --scss_out  | --js_in= --js_out | --img_in= --img_out
if(
	(argv.scss_in && argv.scss_out) ||
	(argv.js_in && argv.js_out) 	||
	(argv.img_in && argv.img_out)	||
	(argv.data_in && argv.data_out)
){
	// Init
	module.exports.init({
		'scss_files_in':argv.scss_in,
		'scss_files_out':argv.scss_out,

		'js_files_in':argv.js_in,
		'js_files_out':argv.js_out,

		'img_files_in':argv.img_in,
		'img_files_out':argv.img_out,

		'data_files_in':argv.data_in,
		'data_files_out':argv.data_out,
	});

	if(scss_files_in){	module.exports.processSCSS(); }
	if(js_files_in){	module.exports.processJS(); }
	if(img_files_in){	module.exports.processIMG();  }
	if(data_files_in){	module.exports.processData();  }
}else{

	if (runningAsScript){
		console.log('USAGE: asset_pipline [--scss_in --scss_out | --js_in --js_out | --img_in --img_out  ]');
		console.log('EXAMPLE: node ./generateAssets.js --scss_in=_assets/scss/**/*.scss --scss_out=/Users/andrew/Desktop/Output');
	}
}
