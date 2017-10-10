/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Build script.
 */

'use strict';

const path = require('path');

const gulp = require('gulp');
const plugin = {
    get addonsLinter() {
      delete this.addonsLinter;
      return this.addonsLinter = require('addons-linter');
    },
    get jsonModify() {
      delete this.jsonModify;
      return this.jsonModify = require('gulp-json-modify');
    },
    get newer() {
      delete this.newer;
      return this.newer = require('gulp-newer');
    },
    get signAddon() {
      delete this.signAddon;
      return this.signAddon = require('sign-addon').default;
    },
    get zip() {
      delete this.zip;
      return this.zip = require('gulp-vinyl-zip');
    },
};
const data = {
    get manifest() {
        delete this.manifest;
        return this.manifest = require('./src/manifest.json');
    },
    get package() {
        delete this.package;
        return this.package = require('./package.json');
    },
    get secret() {
        delete this.secret;
        return this.secret = require('./secret.json');
    }
};

/**
 * Update version numbers in the source files using package.json as the source of truth.
 * Intended to be called by npm after it has incremented the package.json version.
 */
function version() {
    return gulp.src(['src/manifest.json'], {base: '.'})
        .pipe(plugin.newer('package.json'))
        .pipe(plugin.jsonModify({
            key: 'version',
            value: data.package.version.replace(/-([^\.0-9]+)\./, '$1').replace(/(\d)-(\d)/, '$1pre$2')
        }))
        .pipe(gulp.dest('.'));
}

/**
 * Run the addon linter to check for addon-specific coding issues.
 */
function lint() {
    return plugin.addonsLinter.createInstance({
        config: {
            _: [path.resolve('src')],
            logLevel: process.env.VERBOSE ? 'debug' : 'fatal',
            stack: Boolean(process.env.VERBOSE)
        }
    }).run().then(result => {
        const n = result.errors.length;
        if(n)
            throw `${n} error${n == 1 ? '' : 's'} found by addon linter.`;
    });
}

/**
 * Build an unsigned .xpi from the source files.
 */
function buildXPI() {
    return gulp.src('src/**/*', {nodir: true})
        .pipe(plugin.newer('build/jsonovich.xpi'))
        .pipe(plugin.zip.dest('build/jsonovich.xpi', {unlessEmpty: true}));
}

/**
 * Upload an unsigned .xpi to AMO for signing/review.
 */
function uploadXPI() {
    return plugin.signAddon({
        xpiPath: path.resolve('build/jsonovich.xpi'),
        id: data.manifest.applications.gecko.id, // docs say optional and "will have no effect!", but server disagrees
        version: data.manifest.version,
        apiKey: data.secret.jwtIssuer,
        apiSecret: data.secret.jwtSecret,
        downloadDir: path.resolve('build') // doesn't seem to be used for a listed addon
    })
    .then(result => {
        console.log(result); // helpfully, for a listed addon, result == {success: false} and all the useful information went to stdout
    });
}

gulp.task('version', version);
gulp.task('lint', lint);
gulp.task('build:xpi', buildXPI);
gulp.task('build', ['build:xpi']);
gulp.task('publish:xpi', ['build:xpi'], uploadXPI);
gulp.task('publish', ['publish:xpi']);
gulp.task('default', ['build']);
