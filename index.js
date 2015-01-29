/**
 * @file i
 */

'use strict';

var prompt = require( 'prompt' );
var fs = require( 'fs' );
var path = require( 'path' );
var childProcess = require( 'child_process' );
var markup = require( 'markup-js' );

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

function getTemplateFilePath( filePath ){
  return path.join( __dirname, 'project_template', filePath );
}

function copyTemplateFile( filePath ){
  fs.createReadStream( getTemplateFilePath( filePath ) )
    .pipe( fs.createWriteStream( filePath ) );
}

function readFormatFileSync( filePath, formatObj ){
  var corpus = fs.readFileSync( getTemplateFilePath( filePath ) ).toString();
  return markup.up( corpus, formatObj );
}

function initializeProject( name, description, keywords, tests ){
  fs.mkdirSync( name );
  process.chdir( name );

  var filesToCopy = [ '.gitignore', '.jshintignore', '.jshintrc' ];
  filesToCopy.forEach( function copyFile( filePath ){
    copyTemplateFile( filePath );
  });

  var readmeStr = readFormatFileSync(
    'README.md', { name: name, description: description }
  );
  fs.writeFileSync( 'README.md', readmeStr );

  if( tests ){
    fs.mkdirSync( 'test' );
    copyTemplateFile( 'test/test.js' );
    copyTemplateFile( '.travis.yml' );
  }

  var strPkgJson = readFormatFileSync( 'package.json', {
    name: name,
    description: description,
    keywords: keywords.map( function quote( str ){
      return '"' + str + '"';
    }),
    tests: tests
  });
  fs.writeFileSync( 'package.json', strPkgJson );

  childProcess.exec( 'git init', function cb(){
    var procOpts = {
      detached: true,
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    };
    childProcess.spawn('npm', [ 'install' ], procOpts ).unref();
  });
}
