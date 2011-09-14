/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description HTTP request observer to override default Accept header for specific hosts.
 *
 * Changelog:
 * [2011-08] - Created request observer for per-domain Accept header overrides
 */

'use strict';

var modes = {
    'json': {
        mime: 'application/json'
    }
};

XPCOMUtils.defineLazyGetter(this, 'generateAcceptHeader', function() {
    return require('chrome/AcceptHeader').generate;
});

/**
 * Dynamically register an HTTP request observer for the given type
 *
 * @param mode <string>  A string matching an entry in this module's private observers object.
 */
exports.register = function registerRequestObserver(mode) {
    if(modes[mode] && typeof modes[mode].observer != 'object') {
        modes[mode].overrideBranch = require('prefs').branch(ADDON_PREFROOT + '.acceptHeaderOverride.' + mode);
        modes[mode].observer = {
            observe: function(aSubject, aTopic, aData) {
                if(aTopic != 'http-on-modify-request') {
                    return;
                }
                try {
                    aSubject.QueryInterface(Ci.nsIHttpChannel);
                    let q = (aSubject.loadFlags & aSubject.LOAD_DOCUMENT_URI) ? modes[mode].overrideBranch.get(aSubject.originalURI.host, 'string-ascii') : null;
                    if(q !== null) {
                        let acceptOrig = aSubject.getRequestHeader('Accept'),
                        accept = generateAcceptHeader(acceptOrig, modes[mode].mime, parseFloat(q));
                        if(acceptOrig != accept) {
                            aSubject.setRequestHeader('Accept', accept, false);
                        }
                    }
                } catch(e) {
                    require('log').error(e);
                }
            }
        };
        Services.obs.addObserver(modes[mode].observer, 'http-on-modify-request', false);
        require('unload').unload(function(){
            Services.obs.removeObserver(modes[mode].observer, 'http-on-modify-request');
            delete modes[mode].observer;
            delete modes[mode].overrideBranch;
        });
    }
};
