/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env node */
/* eslint-disable no-console */
'use strict';

const path = require('path');

const gulp = require('gulp');
const importLazy = require('import-lazy')(require);

const addonsLinter = importLazy('addons-linter');
const {default: signAddon} = importLazy('sign-addon');

const plugin = {
    eslint: importLazy('gulp-eslint'),
    if: importLazy('gulp-if'),
    jsonModify: importLazy('gulp-json-modify'),
    jsonValidate: importLazy('gulp-json-validator'),
    newer: importLazy('gulp-newer'),
    stylelint: importLazy('gulp-stylelint'),
    zip: importLazy('gulp-vinyl-zip')
};

const data = {
    manifest: importLazy('./src/manifest.json'),
    package: importLazy('./package.json'),
    secret: importLazy('./secret.json')
};

/**
 * Update version numbers in the source files using package.json as the source of truth.
 * Intended to be called by npm after it has incremented the package.json version.
 */
function version() {
    return gulp.src(['src/manifest.json'], {base: '.'})
        .pipe(plugin.newer({dest: '.', extra: 'package.json'}))
        .pipe(plugin.jsonModify({
            key: 'version',
            value: data.package.version.replace(/-([^.0-9]+)\./, '$1').replace(/(\d)-(\d)/, '$1pre$2')
        }))
        .pipe(gulp.dest('.'));
}

/**
 * Check for problems in CSS files.
 */
function lintCSS(fix) {
    return gulp.src(['**/*.css', '!node_modules/**'], {nodir: true})
        .pipe(plugin.stylelint({
            fix: fix,
            reporters: [
                {
                    formatter: 'string',
                    console: true
                }
            ],
            reportNeedlessDisables: true
        }));
}

/**
 * Check for invalid JSON files.
 */
function lintJSON() {
    return gulp.src(['**/*.json', '!node_modules/**'], {nodir: true})
        .pipe(plugin.jsonValidate());
}

/**
 * Check for general coding issues with ESlint.
 *
 * @param fix boolean Controls whether eslint will fix any issues it knows how.
 */
function lintJS(fix) {
    return gulp.src(['**/*.js', '!node_modules/**'], {nodir: true})
        .pipe(plugin.eslint({
            fix: fix
        }))
        .pipe(plugin.eslint.format())
        .pipe(plugin.if(file => file.eslint && file.eslint.fixed, gulp.dest('.')))
        .pipe(plugin.eslint.failAfterError());
}

/**
 * Check for addon-specific coding issues with addons-linter.
 */
function lintAddon() {
    return addonsLinter.createInstance({
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
    return gulp.src(['src/**/*', 'LICENSE.txt'], {nodir: true})
        .pipe(plugin.newer('build/jsonovich.xpi'))
        .pipe(plugin.zip.dest('build/jsonovich.xpi', {unlessEmpty: true}));
}

/**
 * Upload an unsigned .xpi to AMO for signing/review.
 */
function uploadXPI() {
    return signAddon({
        xpiPath: path.resolve('build/jsonovich.xpi'),
        id: data.manifest.applications.gecko.id, // docs say optional and "will have no effect!", but server disagrees
        version: data.manifest.version,
        apiKey: data.secret.jwtIssuer,
        apiSecret: data.secret.jwtSecret,
        downloadDir: path.resolve('build') // doesn't seem to be used for a listed addon
    }).then(result => console.log(result)); // helpfully, for a listed addon, result == {success: false} and all the useful information went to stdout
}

gulp.task('version', version);
gulp.task('lint:css:fix', lintCSS.bind(null, true));
gulp.task('lint:css', lintCSS);
gulp.task('lint:json', lintJSON);
gulp.task('lint:js:fix', lintJS.bind(null, true));
gulp.task('lint:js', lintJS);
gulp.task('lint:addon', lintAddon);
gulp.task('lint', ['lint:css', 'lint:json', 'lint:js', 'lint:addon']);
gulp.task('build:xpi', buildXPI);
gulp.task('build', ['build:xpi']);
gulp.task('publish:xpi', ['build:xpi'], uploadXPI);
gulp.task('publish', ['publish:xpi']);
gulp.task('default', ['build']);
