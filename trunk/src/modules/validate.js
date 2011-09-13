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

XPCOMUtils.defineLazyServiceGetter(this, 'idnService', '@mozilla.org/network/idn-service;1', 'nsIIDNService');

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

exports.q = function isValidQFactor(q) {
    return (q && q.length && q.length < 6 && (/^(?:1(?:\.0{1,3})?|0(?:\.\d{1,3})?)$/).test(q));
};

exports.mime = function isValidMimeType(mime) {
    if(mime && mime.length && mime.length < 81 && (mime.lastIndexOf('application/') === 0 || mime.lastIndexOf('text/') === 0)) {
        let parts = mime.split('/');
        return (parts.length === 2 && (parts[1].indexOf('json') !== -1 || parts[1].indexOf('javascript') !== -1 || parts[1].indexOf('ecmascript') !== -1));
    }
    return false;
};

exports.fileExt = function isValidFileExtension(ext) {
    return (ext && ext.length && ext.length < 11 && ext.indexOf('/') === -1 && ext.indexOf('.') === -1);
};
