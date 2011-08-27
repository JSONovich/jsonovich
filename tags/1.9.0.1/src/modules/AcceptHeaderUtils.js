/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Utility module for HTTP Accept related functions.
 *
 * Changelog:
 * [2011-08] - Created Accept header utility functions
 *             + validHost: check host to override is sensible
 *             + validQ: check quality factor of override is sensible
 *             + modifyAccept: cleanly alter an Accept string to (not) contain the given MIME by q-value
 */

(function() {
    'use strict';

    var lazy = {};

    XPCOMUtils.defineLazyServiceGetter(lazy, "idnService", "@mozilla.org/network/idn-service;1", "nsIIDNService");

    exports.validHost = function isValidHost(host) {
        try {
            let testURI = lazy.idnService.normalize(host);
            testURI = Services.io.newURI('http://' + testURI + '/', null, null);
            return testURI.host === host;
        } catch(e) {
            if(e.name != 'NS_ERROR_UNEXPECTED') {
                require('log').debug(e);
            }
            return false;
        }
    };

    exports.validQ = function isValidQFactor(q) {
        return (q && q.length && q.length < 6 && (/^(?:1(?:\.0{1,3})?|0(?:\.\d{1,3})?)$/).test(q));
    };

    exports.modifyAccept = function modifyAcceptHeader(acceptString, mime, q) {
        let cleanAccept = acceptString.split(/\s*,\s*/).filter(function(value) {
            return (value.indexOf(mime) != 0
                || (value.length > mime.length
                    && (value[mime.length] == ' '
                        || value[mime.length] == ';'
                        )
                    )
                );
        });
        if(q) {
            if(q < 1) {
                mime += ';q=' + q;
            }
            cleanAccept.push(mime);
        }
        return cleanAccept.join(',');
    };
})();
