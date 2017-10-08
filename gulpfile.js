/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Build script.
 */

'use strict';

const gulp = require('gulp');
const plugin = {
    get zip() {
      delete this.zip;
      return this.zip = require('gulp-vinyl-zip');
    },
};

function xpi() {
    return gulp.src('src/**/*', { nodir: true })
        .pipe(plugin.zip.zip('jsonovich.xpi'))
        .pipe(gulp.dest('build'));
}

gulp.task('xpi', xpi);
gulp.task('build', ['xpi']);
gulp.task('default', ['build']);
