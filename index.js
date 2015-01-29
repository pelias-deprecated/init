/**
 * @file i
 */

'use strict';

var prompt = require( 'prompt' );
var fs = require( 'fs' );
var path = require( 'path' );
var util = require( 'util' );
var childProcess = require( 'child_process' );

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
      description: 'Comma-separated list of keywords.'
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

function initializeProject( name, description, keywords, tests ){
  fs.mkdirSync( name );
  process.chdir( name );

  var filesToCopy = [ '.gitignore', '.jshintignore', '.jshintrc' ];
  filesToCopy.forEach( function copyFile( filePath ){
    copyTemplateFile( filePath );
  });

  fs.writeFile( 'README.md', util.format( '# %s\n%s\n', name, description ) );

  var packageJson = require( getTemplateFilePath( 'package.json' ) );
  if( tests ){
    packageJson.scripts = {
      test: 'node test/test.js | tap-spec'
    };

    packageJson.devDependencies.tape = '3.0.3';
    packageJson.devDependencies[ 'tap-spec' ] = '2.1.2';

    fs.mkdirSync( 'test' );
    copyTemplateFile( 'test/test.js' );
    copyTemplateFile( '.travis.yml' );
  }

  packageJson.name = 'pelias-' + name;
  packageJson.description = description;
  packageJson.keywords = keywords;

  var githubUrl = 'https://github.com/pelias/' + name;
  packageJson.repository = githubUrl;
  packageJson.bugs.url = githubUrl + '/issues';
  packageJson.homepage = githubUrl;

  var strPackageJson = JSON.stringify( packageJson, undefined, 2 ) + '\n';
  fs.writeFileSync( 'package.json', strPackageJson );

  childProcess.exec( 'git init', function cb(){
    var procOpts = {
      detached: true,
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    };
    childProcess.spawn('npm', [ 'install' ], procOpts ).unref();
  });
}
