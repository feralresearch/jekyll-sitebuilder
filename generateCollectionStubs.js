// generate_categoryFiles.js
// Pulls a CSV and generates stub files for category pages
// =======================================================

// Requires
const concat = require('gulp-concat');
const argv = require('minimist')(process.argv.slice(2));
const gulp = require('gulp');
const runSequence = require('run-sequence');
const fs = require('fs');

// Variables
var jekyll_src,list_in,collection_name,clean;
var runningAsScript = !module.parent;


// Gulp tasks
gulp.task('generate', () => {
	if (runningAsScript){
		console.log("GENERATE_STUBFILES: ** Generating '"+collection_name+"'");
	}else{
		//console.log("Working with: "+list_in);
	}

	// Set output path
	var outputPath = jekyll_src+"/_"+collection_name;

	// Singular-ize the output name
	var outputName=collection_name;
	if(collection_name==='categories'){
		outputName='category';
	}else if (collection_name==='tags'){
		outputName='tag';
	}

	if (! fs.existsSync(outputPath)){
		 fs.mkdirSync(outputPath, 0744);
	}


	// Generate the files
	var allowedFiles = [];
	fs.readFile(list_in, 'utf8', function(err, data) {
		if(err){
    		//console.log("GENERATE_STUBFILES: ERROR no file at:"+list_in);
			return;
		}else{
			data = data.replace(/\s/g, "");
			var dataAsArray = data.split(',');


			// Loop over collection
			for(var idx=0; idx < dataAsArray.length; idx++){

				// Create stub file if it doesn't exist
				var item_name = dataAsArray[idx];
				var fileName = item_name+".md";
				var outputFile = outputPath+"/"+fileName;
				allowedFiles.push(fileName);

				if (fs.existsSync(outputFile)){
					//console.log('GENERATE_STUBFILES: Skipping: '+ outputFile);
				}else{
					/*
						YAML frontmatter stub
						---
						layout: tag_listing
						name: TAG NAME
						---
					*/
					var stubContents =
									'---\n'+
								 	//'# This is a generated file, you can make changes and they will NOT be overwritten.\n'+
									//'# To re-generate the file, delete it\n'+
									'layout: '+outputName+'_listing\n'+
									'name: '+item_name+'\n'+
									'---\n';

					fs.writeFile(outputFile,stubContents,function (err) {if (err) {} else {}});
					console.log('GENERATE_STUBFILES: Creating:' + outputFile);
				}
			}
			runCleanup();

		}
	});

	function runCleanup(){
		// Clean up if requested
		if(clean){
			//console.log("GENERATE_STUBFILES: ** Cleaning... ");

			// Loop over the directory
			fs.readdir(outputPath, function(err, items) {
			    for (var i=0; i<items.length; i++) {
					thisFile = items[i];
					// Check to see if this file should exist
					if (allowedFiles.indexOf(thisFile) > -1) {}else{
						var outputFile = outputPath+"/"+thisFile;
						console.log("GENERATE_STUBFILES: Removing '"+outputFile+"'");
						fs.unlinkSync(outputFile);
					}
			    }
			});

		}
	}

});



// Public methods
module.exports = {

	// Set the locations
	init: function(options) {
		list_in = options.list_in;
		collection_name = options.type;
		jekyll_src = options.jekyll_src;
		clean = options.clean;
	},

	// Do SCSS processing
	generate: function() {
		runSequence('generate');
		return "GENERATE_STUBFILES: Generating";
	},

};

// Parse command line input, requires a pair:
// --scss_in= --scss_out  | --js_in= --js_out | --img_in= --img_out
if(
	(argv.list_in && argv.type && argv.jekyll_src)
){
	// Init
	module.exports.init({
		'jekyll_src':argv.jekyll_src,
		'list_in':argv.list_in,
		'type':argv.type,
		'clean':argv.clean
	});

	module.exports.generate();

}else{

	if (runningAsScript){
		console.log('USAGE: generateCollectionStubs --clean=true|false [--jekyll_src=PATH --list_in=CSVFILE --type=categories|tags]');
		console.log('EXAMPLE: node ./generateCollectionStubs.js --clean=true --jekyll_src=../ --list_in=../_site/data/category_listing.csv --type=categories');
	}
}
