/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description HTTP request observer to override default Accept header for specific hosts.
 *
 * Changelog:
 * [2011-08] - Created request observer for per-domain Accept header overrides
 */

(function() {
    'use strict';

    var observers = {
        'json': {
            mime: 'application/json'
        }
    };

    /**
     * Dynamically register an HTTP request observer for the given type
     *
     * @param type <string>  A string matching an entry in this module's private observers object.
     */
    exports.register = function registerRequestObserver(type) {
        if(observers[type] && typeof observers[type].observer != 'object') {
            observers[type].observer = {
                observe: function(aSubject, aTopic, aData) {
                    if(aTopic == 'http-on-modify-request') {
                        var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
                        try {
                            if((httpChannel.loadFlags & httpChannel.LOAD_DOCUMENT_URI)
                                && Services.contentPrefs.hasPref(httpChannel.originalURI.host, ADDON_PREFROOT + '.acceptHeader.' + type)) {
                                let accept = httpChannel.getRequestHeader('Accept').split(/\s*,\s*/).filter(function(value) {
                                    return (value.indexOf(observers[type].mime) != 0
                                        || (value.length > observers[type].mime.length
                                            && (value[observers[type].mime.length] == ' '
                                                || value[observers[type].mime.length] == ';'
                                                )
                                            )
                                        );
                                }),
                                q = Services.contentPrefs.getPref(httpChannel.originalURI.host, ADDON_PREFROOT + '.acceptHeader.' + type);
                                if(q) {
                                    let acceptPart = observers[type].mime;
                                    if(q < 1) {
                                        acceptPart += ';q=' + q;
                                    }
                                    accept.push(acceptPart);
                                }
                                httpChannel.setRequestHeader('Accept', accept.join(','), false);
                            }
                        } catch(e) {
                            log.error(e);
                        }
                    }
                }
            };
            Services.obs.addObserver(observers[type].observer, 'http-on-modify-request', false);
            require('unload').unload(function(){
                Services.obs.removeObserver(observers[type].observer, 'http-on-modify-request');
                delete observers[type].observer;
            });
        }
    };
})();
