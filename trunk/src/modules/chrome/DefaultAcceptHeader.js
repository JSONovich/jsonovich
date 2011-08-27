/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Modifies the default HTTP Accept header based on user preference.
 *
 * Changelog:
 * [2011-07] - Created separate module for default Accept header
 */

(function() {
    'use strict';

    var lazy = {},
    observers = {
        'json': {
            mime: 'application/json'
        }
    };

    XPCOMUtils.defineLazyGetter(lazy, 'globalAccept', function() {
        return require('prefs').branch('network.http.accept');
    });

    /**
     * Dynamically append to default HTTP Accept header
     *
     * @param listenPref <function>  Reference to the listen function for the appropriate preferences
     *                               branch, require('prefs').branch(<branch>).listen
     * @param type <string>  A string matching an entry in this module's private observers object.
     */
    exports.register = function registerAcceptHeader(listenPref, type) {
        if(observers[type]) {
            listenPref('acceptHeader.' + type, function(branch, pref) {
                function setDefaultAccept(suffix) {
                    let acceptOrig = lazy.globalAccept.get('default', 'string-ascii'),
                    accept = acceptOrig.split(/\s*,\s*/).filter(function(value) {
                        return (value.indexOf(observers[type].mime) != 0
                            || (value.length > observers[type].mime.length
                                && (value[observers[type].mime.length] == ' '
                                    || value[observers[type].mime.length] == ';'
                                    )
                                )
                            );
                    });
                    if(suffix) {
                        accept.push(observers[type].mime);
                    }
                    accept = accept.join(',');
                    if(acceptOrig != accept) {
                        lazy.globalAccept.set('default', 'string-ascii', accept);
                    }
                }

                try {
                    if(observers[type].cleanup) {
                        observers[type].cleanup();
                        delete observers[type].cleanup;
                    }
                    if(branch.get(pref, 'boolean')) {
                        setDefaultAccept(true);
                        observers[type].cleanup = require('unload').unload(setDefaultAccept);
                    } else {
                        setDefaultAccept();
                    }
                } catch(e) {
                    require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
                }
            });
        }
    }
})();
