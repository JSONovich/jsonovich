/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Build script.
 */

'use strict';

const gulp = require('gulp');
const plugin = {
    get jsonModify() {
      delete this.jsonModify;
      return this.jsonModify = require('gulp-json-modify');
    },
    get zip() {
      delete this.zip;
      return this.zip = require('gulp-vinyl-zip');
    },
};
const data = {
    get package() {
        delete this.package;
        return this.package = require('./package.json');
    }
};

/**
 * Update version numbers in the source files using package.json as the source of truth.
 * Intended to be called by npm after it has incremented the package.json version.
 */
function version() {
    return gulp.src(['src/manifest.json'], {base: '.'})
        .pipe(plugin.jsonModify({
            key: 'version',
            value: data.package.version.replace(/-([^\.0-9]+)\./, '$1').replace(/(\d)-(\d)/, '$1pre$2')
        }))
        .pipe(gulp.dest('.'));
}

/**
 * Build the Firefox .xpi from the source files.
 */
function xpi() {
    return gulp.src('src/**/*', { nodir: true })
        .pipe(plugin.zip.zip('jsonovich.xpi'))
        .pipe(gulp.dest('build'));
}

gulp.task('version', version);
gulp.task('xpi', xpi);
gulp.task('build', ['xpi']);
gulp.task('default', ['build']);
