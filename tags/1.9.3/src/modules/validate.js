/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Validation for various user inputs.
 *
 * Changelog:
 * [2011-08] - Created Accept header utility functions
 *             + validHost: check host to override is sensible
 *             + validQ: check quality factor of override is sensible
 *             + modifyAccept: cleanly alter an Accept string to (not) contain the given MIME by q-value
 * [2011-09] - Move towards validating user input in one place, here
 *             + Added MIME type and file extension validation
 *             + Moved modifyAccept out
 */

'use strict';

var reg_q = /^(?:1(?:\.0{1,3})?|0(?:\.\d{1,3})?)$/; // compile once

XPCOMUtils.defineLazyServiceGetter(this, 'idnService', '@mozilla.org/network/idn-service;1', 'nsIIDNService');

exports.explainHost = 'Host must be fewer than 254 characters and be IDN-normalised.';
exports.host = function isValidHost(host) {
    if(host && host.length && host.length < 254) {
        try {
            let testURI = idnService.normalize(host);
            testURI = Services.io.newURI('http://' + testURI + '/', null, null);
            return testURI.host === host;
        } catch(e) {
            if(e.name != 'NS_ERROR_UNEXPECTED') {
                require('log').debug(e);
            }
        }
    }
    return false;
};

exports.explainQ = 'Q-factor must be a number between 0 and 1 with up to 3 decimal places, the period character "." must be used as the decimal separator if present.';
exports.q = function isValidQFactor(q) {
    return (q && q.length && q.length < 6 && reg_q.test(q));
};

exports.explainMime = 'MIME type must be fewer than 80 characters, type must be application or text, sub-type must mention "json, "javascript" or "ecmascript" and there must be no wildcards.';
exports.mime = function isValidMimeType(mime) {
    if(mime && mime.length && mime.length < 81) {
        let parts = mime.split('/', 3);
        return (parts.length === 2
            && (parts[0] == 'application' || parts[0] == 'text')
            && parts[1].indexOf('*') === -1 && parts[1].indexOf('?') === -1
            && (parts[1].indexOf('json') !== -1 || parts[1].indexOf('javascript') !== -1 || parts[1].indexOf('ecmascript') !== -1));
    }
    return false;
};

exports.explainFileExt = 'Extension must be fewer than 10 characters and not contain wildcards, "." or "/".';
exports.fileExt = function isValidFileExtension(ext) {
    return (ext && ext.length && ext.length < 11
        && ext.indexOf('/') === -1 && ext.indexOf('.') === -1
        && ext.indexOf('*') === -1 && ext.indexOf('?') === -1);
};
