/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Modifies the default HTTP Accept header based on user preference.
 *
 * Changelog:
 * [2011-07] - Created separate module for default Accept header
 */

'use strict';

/**
 * Dynamically append to default HTTP Accept header
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 * @param mimePref <string>  The boolean preference to watch, when true given MIME type should be appended
 * @param mimeType <string>  The MIME type to append to the Accept header. May include q-value, etc.
 */
exports.register = function registerAcceptHeader(listenPref, mimePref, mimeType) {
    let prefs = require('prefs').branch;
    function setAccept(acceptPart, enabled) {
        function setCleanAccept(suffix) {
            let pref = prefs('network.http.accept');
            let accept = pref.get('default', 'string-ascii');
            if(suffix && accept.indexOf(acceptPart) != -1) {
                return; // already accepting specified suffix
            }
            accept = accept.split(',');
            let index;
            while((index = accept.indexOf(acceptPart)) != -1) {
                accept.splice(index, 1);
            }
            if(suffix) {
                accept.push(acceptPart);
            }
            pref.set('default', 'string-ascii', accept.join(','));
        }

        if(enabled) {
            setCleanAccept(true);
            require('unload').unload(setCleanAccept);
        } else {
            setCleanAccept();
        }
    }
    listenPref(mimePref, function(branch, pref) {
        try {
            setAccept(mimeType, branch.get(pref, 'boolean'));
        } catch(e) {
            require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
        }
    });
}
