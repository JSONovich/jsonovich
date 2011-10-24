/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Modifies the default HTTP Accept header based on user preference.
 *
 * Changelog:
 * [2011-07] - Created separate module for default Accept header
 * [2011-09] - Moved Accept header generating function in
 */

'use strict';

var modes = {
    'json': {
        mime: 'application/json'
    }
},
reg_separator = /\s*,\s*/;

XPCOMUtils.defineLazyGetter(this, 'valid', function() {
    return require('validate');
});
XPCOMUtils.defineLazyGetter(this, 'globalAccept', function() {
    return require('prefs').branch('network.http.accept');
});

/**
 * Dynamically append to default HTTP Accept header and check host overrides are valid
 *
 * @param mode <string>  A string matching an entry in this module's private modes object.
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen - optional,
 *                               provide it if you're already using the branch to save mem.
 */
exports.register = function registerAcceptHeader(mode, listenPref) {
    if(modes[mode]) {
        listenPref = listenPref || require('prefs').branch(ADDON_PREFROOT).listen;

        // global
        listenPref('acceptHeader.' + mode, function(branch, pref) {
            function setDefaultAccept(suffix) {
                var acceptOrig = globalAccept.get('default', 'string-ascii'),
                accept = generateAcceptHeader(acceptOrig, modes[mode].mime, suffix);
                if(acceptOrig != accept) {
                    globalAccept.set('default', 'string-ascii', accept);
                }
            }

            try {
                if(modes[mode].cleanup) {
                    modes[mode].cleanup();
                    delete modes[mode].cleanup;
                }
                if(branch.get(pref, 'boolean')) {
                    setDefaultAccept(true);
                    modes[mode].cleanup = require('unload').unload(setDefaultAccept);
                } else {
                    setDefaultAccept();
                }
            } catch(e) {
                require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
            }
        });

        // host override
        var overrides = require('prefs').branch(ADDON_PREFROOT + '.acceptHeaderOverride.' + mode),
        startupCount = overrides.getChildList().length;
        overrides.listen('', function(branch, pref) {
            if((startupCount == 0 && !valid.host(pref)) || !valid.q(branch.get(pref, 'string-ascii'))) {
                branch.unset(pref);
            }
            if(startupCount > 0) {
                startupCount--;
            }
        });
    }
};

function generateAcceptHeader(acceptString, mime, q) {
    var cleanAccept = acceptString.split(reg_separator).filter(function(value) {
        return (value.indexOf(mime) != 0
            || (value.length > mime.length
                && value[mime.length] != ' '
                && value[mime.length] != ';'
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
}

exports.generate = generateAcceptHeader;
