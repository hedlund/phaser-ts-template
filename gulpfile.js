'use strict';

const gulp = require('gulp');
const changed = require('gulp-changed');
const filter = require('gulp-filter');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const buffer = require('gulp-buffer');
const uglify = require('gulp-uglify');
const tslint = require("gulp-tslint");
const source = require('vinyl-source-stream');
const browserify = require('browserify');
const tsify = require('tsify');
const exorcist = require('exorcist');
const argv = require('yargs').argv;
const del = require('del');
const path = require('path');
const browserSync = require('browser-sync').create();
const runSequence = require('run-sequence');
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
function onError(error)         { gutil.log(gutil.colors.red(error.stack || error)); }

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
 */
gulp.task('phaser', () => {
    const files = ['phaser.min.js', 'phaser.js', 'phaser.map'];
    return gulp.src(files.map(_ => `${PHASER_DIR}/build/${_}`))
        .pipe(ifRelease(filter(['*.min.js'])))
        .pipe(changed(SCRIPTS_DIR))
        .pipe(gulp.dest(SCRIPTS_DIR));
});

/**
 * Install dependencies.
 * A meta-step to defined all the third-party dependencies to install.
 */
gulp.task('dependencies', ['phaser']);

/**
 * Lint the code to increase quality.
 * All the actual configuration for eslint is in the file `tslint.json`.
 */
gulp.task('lint', () => {
    return gulp.src(`${SOURCE_DIR}/**/*.ts`)
        .pipe(tslint())
        .pipe(tslint.report("verbose", { summarizeFailureOutput: true }));
});

/**
 * Compile the application.
 * Pass the source files through Browserify & Tsify. If it's a DEBUG build,
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

    const b = browserify({
        entries: [ MAIN_FILE, `${TYPINGS_DIR}/tsd.d.ts` ],
        paths: [ SOURCE_DIR ],
        debug: isDebug()
    });

    return b.plugin(tsify)
        .bundle().on('error', onError)
        .pipe(ifDebug(exorcist(`${SCRIPTS_DIR}/${TARGET_FILE.replace('.js', '.map')}`)))
        .pipe(source(TARGET_FILE))
        .pipe(buffer())
        .pipe(ifRelease(uglify()))
        .pipe(gulp.dest(SCRIPTS_DIR));
});

/**
 * Build the application.
 * Install the necessary dependencies, lint the source and then compile
 * the application.
 */
gulp.task('build', ['dependencies', 'lint', 'compile']);

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

    // Watch for changes to the TS code and reload
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
