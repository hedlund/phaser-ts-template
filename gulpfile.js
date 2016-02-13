'use strict';

const gulp = require('gulp');
const changed = require('gulp-changed');
const filter = require('gulp-filter');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const buffer = require('gulp-buffer');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const browserify = require('browserify');
const tsify = require('tsify');
const exorcist = require('exorcist');
const argv = require('yargs').argv;
const del = require('del');
const path = require('path');
const browserSync = require('browser-sync').create();
const runSequence = require('run-sequence');
const merge = require('merge-stream');
const globby = require('globby');
const through = require('through2');
const p = require('./package.json');

/**
 * Main file is read from `package.json` and it's directory is considered
 * the root of all the source code.
 */
const MAIN_FILE = p.main;
const SOURCE_DIR = path.dirname(MAIN_FILE);

/**
 * The application will be compiled to the target file, in the scripts
 * directory within the target directory.
 */
const TARGET_FILE = 'game.js';
const TARGET_DIR = './public';
const SCRIPTS_DIR = `${TARGET_DIR}/scripts`;
const STYLES_DIR = `${TARGET_DIR}/styles`;

/**
 * Dependencies such as Phaser itself will be copied form the vendor
 * directory.
 */
const VENDOR_DIR = './node_modules';
const TYPINGS_DIR = './typings';
const PHASER_DIR = `${VENDOR_DIR}/phaser`;

/**
 * Some small helpers to control the build process depending on if it's a
 * debug (development) or release (production) build.
 */
function isDebug()              { return !!argv.debug; }
function ifDebug(destination)   { return gulpif(isDebug(), destination); }
function ifRelease(destination) { return gulpif(!isDebug(), destination); }
function onError(error)         { gutil.log(gutil.colors.red(error.stack || error)) }

/**
 * Clean the target directories.
 */
gulp.task('clean', () => {
    return del([
        `${SCRIPTS_DIR}/**/*`
    ]);
});

/**
 * Install Phaser.
 * Also make sure it's type definitions are installed.
 */
gulp.task('phaser', () => {
    const jsFiles = ['phaser.min.js', 'phaser.js', 'phaser.map'];
    let js = gulp.src(jsFiles.map(_ => `${PHASER_DIR}/build/${_}`))
        .pipe(ifRelease(filter(['*.min.js'])))
        .pipe(changed(SCRIPTS_DIR))
        .pipe(gulp.dest(SCRIPTS_DIR));

    const tsdFiles = ['phaser.comments.d.ts', 'pixi.comments.d.ts', 'p2.d.ts'];
    let tsd = gulp.src(tsdFiles.map(_ => `${PHASER_DIR}/typescript/${_}`))
        .pipe(changed(TYPINGS_DIR))
        .pipe(gulp.dest(TYPINGS_DIR));

    return merge(js, tsd);
});

/**
 * Install dependencies.
 * A meta-step to defined all the third-party dependencies to install.
 */
gulp.task('dependencies', ['phaser']);

/**
 * Compile the application.
 * Pass the source files through Browserify & Babelify. If it's a DEBUG build,
 * extract the source map into it's own file, and if it's a RELEASE build
 * minify the results.
 */
gulp.task('compile', () => {
    if (isDebug()) {
        gutil.log(gutil.colors.yellow('Compiling DEBUG application...'));
    }
    else {
        gutil.log(gutil.colors.green('Compiling RELEASE application...'));
    }

    const tsFiles = [ MAIN_FILE, `${TYPINGS_DIR}/**/*.d.ts` ];

    // This stream is needed to turn browserify's stream into a gulp stream.
    // As we create the browserify stream in a callback, we need to declare
    // this up front...
    let stream = through();
    stream.pipe(ifDebug(exorcist(`${SCRIPTS_DIR}/${TARGET_FILE.replace('.js', '.map')}`)))
        .pipe(source(TARGET_FILE))
        .pipe(buffer())
        .pipe(ifRelease(uglify()))
        .on('error', onError)
        .pipe(gulp.dest(SCRIPTS_DIR));

    // As we need to pass multiple globbed entries to browserify, we use `globby`
    // to create the list and then pass that to browserify...
    globby(tsFiles).then(entries => {
        browserify({
            entries: entries,
            paths: [ SOURCE_DIR ],
            debug: isDebug()
        }).plugin(tsify).bundle().on('error', onError).pipe(stream);
    }).catch(err => stream.emit('error', err));

    return stream;
});

/**
 * Build the application.
 * Install the necessary dependencies and compile the application.
 */
gulp.task('build', ['dependencies', 'compile']);

/**
 * Rebuild the application.
 * Clean the target directory and then build the whole application again.
 */
gulp.task('rebuild', () => runSequence(['clean', 'build']));

/**
 * Start a local server using BrowserSync.
 * Watch for any changes in the TS code and automatically compile &
 * reload the server.
 */
gulp.task('serve', ['rebuild'], () => {
    // Start the BrowserSync server
    browserSync.init({
        server: TARGET_DIR,
        open: false
    });

    // Watch for changes to the JS code and reload
    gulp.watch(`${SOURCE_DIR}/**/*.ts`, ['watch-ts']);
});

/**
 * Compile changed JS files & reload BrowserSync.
 * Used by the serve task to keep the application updated.
 */
gulp.task('watch-ts', ['compile'], browserSync.reload);

/**
 * The default target is to start the application.
 */
gulp.task('default', ['serve']);
