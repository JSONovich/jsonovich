/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Validation for various user inputs.
 */

'use strict';

var reg_q = /^(?:1(?:\.0{1,3})?|0(?:\.\d{1,3})?)$/; // compile once

XPCOMUtils.defineLazyServiceGetter(this, 'idnService', '@mozilla.org/network/idn-service;1', 'nsIIDNService');

exports.host = function isValidHost(host) {
    if(host && host.length && host.length < exports.host.maxLen) {
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
exports.host.maxLen = 254;

exports.q = function isValidQFactor(q) {
    return (q && q.length && q.length < 6 && reg_q.test(q));
};

exports.mime = function isValidMimeType(mime) {
    if(mime && mime.length && mime.length < exports.mime.maxLen) {
        let parts = mime.split('/', 3);
        return (parts.length === 2
            && (parts[0] == 'application' || parts[0] == 'text')
            && parts[1].indexOf('*') === -1 && parts[1].indexOf('?') === -1
            && (parts[1].indexOf('json') !== -1 || parts[1].indexOf('javascript') !== -1 || parts[1].indexOf('ecmascript') !== -1));
    }
    return false;
};
exports.mime.maxLen = 80;

exports.fileExt = function isValidFileExtension(ext) {
    return (ext && ext.length && ext.length < exports.fileExt.maxLen
        && ext.indexOf('/') === -1 && ext.indexOf('.') === -1
        && ext.indexOf('*') === -1 && ext.indexOf('?') === -1);
};
exports.fileExt.maxLen = 10;
