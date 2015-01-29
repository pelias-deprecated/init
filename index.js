#! /usr/bin/env node

/**
 * @file An interactive CLI script for initializing new Pelias projects, to
 *    spare developers from having to reinstantiate all of the boilerplate all
 *    the time.
 */

'use strict';

var prompt = require( 'prompt' );
var fs = require( 'fs' );
var path = require( 'path' );
var childProcess = require( 'child_process' );
var markup = require( 'markup-js' );

/**
 * Configure and initialize the CLI prompt.
 */
(function initPrompt(){
  prompt.start();

  var schema = {
    properties: {
      name: {
        pattern: /^[a-z0-9._-]*$/i,
        message: 'Valid name characters: [a-zA-Z0-9._-]',
        required: true
      },
      description: {},
      keywords: {
        description: 'Comma-separated list of keywords'
      },
      tests: {
        description: 'Initialize unit-tests? [yn]',
        pattern: /^[yn]$/i
      }
    }
  };

  prompt.message = '';
  prompt.delimiter = ':';
  prompt.colors = false;

  prompt.get(
    schema,
    function ( err, input ){
      if( err ){
        console.error( err );
        process.exit( 1 );
      }
      initializeProject(
        input.name,
        input.description,
        input.keywords.split( ',' ).map( function trim( keyword ){
          return keyword.trim();
        }),
        input.tests.toLowerCase() === 'y'
      );
    }
  );
})();

/**
 * Get the absolute path of a file in `project_template/`.
 */
function getTemplateFilePath( filePath ){
  return path.join( __dirname, 'project_template', filePath );
}

/**
 * Copy a file from the script's `project_template/` directory to the CWD.
 */
function copyTemplateFile( filePath ){
  fs.createReadStream( getTemplateFilePath( filePath ) )
    .pipe( fs.createWriteStream( filePath ) );
}

/**
 * @param {string} filePath The path of a `Markup-js` template file inside
 *    `project_template/`.
 * @param {object} formatObj The object to inject into the template file with
 *    `Markup.up()`.
 * @return {string} The template with `formatObj` injected.
 */
function readFormatFileSync( filePath, formatObj ){
  var corpus = fs.readFileSync( getTemplateFilePath( filePath ) ).toString();
  return markup.up( corpus, formatObj );
}

/**
 * Create a project file/directory tree, and inject content like the project
 * name and description where relevant.
 *
 * @param {string} name The name of the project.
 * @param {string} description An ideally brief (one sentence) description of
 *    the project.
 * @param {array of string} keywords Keywords to describe the project.
 * @param {boolean} tests Whether or not to initialize unit tests.
 */
function initializeProject( name, description, keywords, tests ){
  fs.mkdirSync( name );
  process.chdir( name );

  [ '.jshintignore', '.jshintrc' ].forEach( copyTemplateFile );
  fs.createReadStream( getTemplateFilePath( 'gitignore' ) )
    .pipe( fs.createWriteStream( '.gitignore' ) );

  var readmeStr = readFormatFileSync(
    'README.md', { name: name, description: description }
  );
  fs.writeFileSync( 'README.md', readmeStr );

  if( tests ){
    fs.mkdirSync( 'test' );
    copyTemplateFile( 'test/test.js' );
    copyTemplateFile( '.travis.yml' );
  }

  /**
   * Formatting the `keywords` value is easier/cleaner here than it is in the
   * Markup template.
   */
  var formattedKeywords = keywords.map( function enquote( str ){
    return ( str.length > 0) ?
      '"' + str + '"' :
      str;
  }).join( ', ' );

  var strPkgJson = readFormatFileSync( 'package.json', {
    name: name,
    description: description,
    keywords: formattedKeywords,
    tests: tests
  });
  fs.writeFileSync( 'package.json', strPkgJson );

  /**
   * Run `git init` and then `npm install` (in the background, to prevent the
   * user from waiting). These must be executed in sequential order, to allow
   * the installation of `precommit-hook` to register a Git hook.
   */
  childProcess.exec( 'git init', function cb(){
    var procOpts = {
      detached: true,
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    };
    childProcess.spawn('npm', [ 'install' ], procOpts ).unref();
  });
}
