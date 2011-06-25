/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Utility functions for JSONovich related to user preferences.
 *
 * Changelog:
 * [2011-05] - Created module
 */

'use strict';

let unload = require('unload').unload;

/**
 * Dynamically register converters
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
function registerConversions(listenPref) {
    let webNavInfo = null,
    cid = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}"),
    aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar),
    factory = require('jsonStreamConverter').factory,
    unregister = function() {
        try {
            aCompMgr.unregisterFactory(cid, factory);
        } catch(e) {
            if(e.name != 'NS_ERROR_FACTORY_NOT_REGISTERED') {
                require(PLATFORM + '/log').error(e);
            }
        }
    };
    listenPref('mime.conversions', function(branch, pref) {
        let tmpFactory = factory,
        orig = branch.get(pref, 'string-ascii'),
        conversions = orig.split('|');
        if(!conversions.length) {
            return;
        }
        unregister();
        try {
            let validConversions = [];
            for(let i = 0; i < conversions.length; i++) {
                // slow, don't check on 1st pass (assume preference valid on startup)
                if(webNavInfo && webNavInfo.UNSUPPORTED != webNavInfo.isTypeSupported(conversions[i], null)) {
                    debugInvalid('MIME type conversion', '"' + conversions[i] + '" is already handled by the browser, cannot override.');
                    continue;
                }
                try {
                    aCompMgr.registerFactory(cid, ADDON_NAME, '@mozilla.org/streamconv;1?from=' + conversions[i] + '&to=*/*', tmpFactory);
                    validConversions.push(conversions[i]);
                } catch(e) {
                    if(e.name == 'NS_ERROR_FACTORY_EXISTS') { // this only happens in Gecko 2+...
                        tmpFactory = null; // set null to avoid factory exists warning
                        i--; // and try again
                    } else {
                        throw e;
                    }
                }
            }
            validConversions = validConversions.join('|');
            if(orig != validConversions) { // some conversions were invalid, let's remove them from prefs
                branch.set(pref, 'string-ascii', validConversions);
            }
        } catch(e) {
            uncaughtE(pref, e);
        } finally {
            unload(unregister);
        }
        webNavInfo = Cc["@mozilla.org/webnavigation-info;1"].getService(Ci.nsIWebNavigationInfo)
    });
}

/**
* Dynamically register filetype mapping
*
* @param listenPref <function>  Reference to the listen function for the appropriate preferences
*                               branch, require('prefs').branch(<branch>).listen
*/
function registerExtMap(listenPref) {
    let mimeSvc = null,
    aCatMgr = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager),
    what = 'extension to MIME type mapping',
    validExt = /^[a-z0-9]+$/i,
    registered = [],
    unregister = function() {
        for(let i = 0; i < registered.length; i++) {
            aCatMgr.deleteCategoryEntry('ext-to-type-mapping', registered[i], false);
        }
    };
    listenPref('mime.extensionMap', function(branch, pref) {
        let orig = branch.get(pref, 'string-ascii'),
        extensions = orig.split('|');
        if(!extensions.length) {
            return;
        }
        unregister();
        try {
            let validMappings = [], ext, existing,
            conversions = branch.get('mime.conversions', 'string-ascii').split('|');
            for(let i = 0; i < extensions.length; i++) {
                ext = extensions[i].split(':');
                if(ext.length != 2) {
                    debugInvalid(what, '"' + extensions[i] + '"');
                    continue;
                }
                if(!validExt.test(ext[0])) {
                    debugInvalid(what, '"' + ext[0] + '" doesn\'t look like a file extension.');
                    continue;
                }
                if(conversions.indexOf(ext[1]) == -1) { // only register if we handle the MIME type
                    debugInvalid(what, '"' + ext[1] + '" isn\'t registered to ' + ADDON_NAME + '.');
                    continue;
                }
                if(mimeSvc) { // slow, don't check on 1st pass (assume preference valid on startup)
                    try { // only register extensions that aren't already mapped
                        existing = mimeSvc.getTypeFromExtension(ext[0]);
                    } catch(e) {
                        if(e.name == 'NS_ERROR_NOT_AVAILABLE') {
                            existing = false;
                        } else {
                            throw e;
                        }
                    }
                    if(existing) {
                        debugInvalid(what, '"' + ext[0] + '" is already mapped to ' + existing + ', not overriding.');
                        continue;
                    }
                }
                aCatMgr.addCategoryEntry('ext-to-type-mapping', ext[0], ext[1], false, true);
                registered.push(ext[0]);
                validMappings.push(extensions[i]);
            }
            validMappings = validMappings.join('|');
            if(orig != validMappings) { // some mappings were invalid, let's remove them from prefs
                branch.set(pref, 'string-ascii', validMappings);
            }
        } catch(e) {
            uncaughtE(pref, e);
        } finally {
            unload(unregister);
        }
        mimeSvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    });
}

/**
* Dynamically append to default HTTP Accept header
*
* @param listenPref <function>  Reference to the listen function for the appropriate preferences
*                               branch, require('prefs').branch(<branch>).listen
* @param mimePref <string>  The boolean preference to watch, when true given MIME type should be appended
* @param mimeType <string>  The MIME type to append to the Accept header. May include q-value, etc.
*/
function registerAcceptHeader(listenPref, mimePref, mimeType) {
    let prefs = require(PLATFORM + '/prefs').branch;
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
            unload(setCleanAccept);
        } else {
            setCleanAccept();
        }
    }
    listenPref(mimePref, function(branch, pref) {
        try {
            setAccept(mimeType, branch.get(pref, 'boolean'));
        } catch(e) {
            uncaughtE(pref, e);
        }
    });
}

function uncaughtE(pref, e) {
    require(PLATFORM + '/log').error('Uncaught exception in "' + pref + '" listener - ' + e);
}

function debugInvalid(what, msg) {
    require(PLATFORM + '/log').debug('Invalid ' + what + ': ' + msg + '.');
}

var exports = {
    registerConversions: registerConversions,
    registerExtMap: registerExtMap,
    registerAcceptHeader: registerAcceptHeader
};
