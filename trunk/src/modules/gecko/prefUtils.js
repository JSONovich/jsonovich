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

/**
 * Dynamically register converters
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
function registerConversions(listenPref) {
    let cid = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}");
    let aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar);
    let factory = require('jsonStreamConverter').factory;
    let unregister = function() {
        try {
            aCompMgr.unregisterFactory(cid, factory);
        } catch(e) {
            if(e.name != 'NS_ERROR_FACTORY_NOT_REGISTERED') {
                require(PLATFORM + '/log').error(e);
            }
        }
    };
    listenPref('mime.conversions', function(branch, pref) {
        let conversions = branch.get(pref, 'string-ascii').split('|');
        if(conversions.length) {
            unregister();
            let tmpFactory = factory;
            try {
                for(let i = 0; i < conversions.length; i++) {
                    try {
                        aCompMgr.registerFactory(cid, ADDON_NAME,
                            '@mozilla.org/streamconv;1?from=' + conversions[i] + '&to=*/*',
                            tmpFactory);
                    } catch(e) {
                        if(e.name == 'NS_ERROR_FACTORY_EXISTS') { // this only happens in Gecko 2+...
                            tmpFactory = null; // set null to avoid factory exists warning
                            i--; // and try again
                        } else {
                            require(PLATFORM + '/log').error(e);
                        }
                    }
                }
            } finally {
                require('unload').unload(unregister);
            }
        }
    });
}

/**
 * Dynamically register filetype mapping
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
function registerExtMap(listenPref) {
    let aCatMgr = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    let registered = [];
    let unregister = function() {
        for(let i = 0; i < registered.length; i++) {
            aCatMgr.deleteCategoryEntry('ext-to-type-mapping', registered[i], false);
        }
    };
    listenPref('mime.extensionMap', function(branch, pref) {
        let extensions = branch.get(pref, 'string-ascii').split('|');
        if(extensions.length) {
            unregister();
            try {
                for(let i = 0; i < extensions.length; i++) {
                    let ext = extensions[i].split(':');
                    if(ext.length == 2) {
                        aCatMgr.addCategoryEntry('ext-to-type-mapping', ext[0], ext[1], false, true);
                        registered.push(ext[0]);
                    }
                }
            } finally {
                require('unload').unload(unregister);
            }
        }
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
            require('unload').unload(setCleanAccept);
        } else {
            setCleanAccept();
        }
    }
    listenPref(mimePref, function(branch, pref) {
        setAccept(mimeType, branch.get(pref, 'boolean'));
    });
}

var exports = {
    registerConversions: registerConversions,
    registerExtMap: registerExtMap,
    registerAcceptHeader: registerAcceptHeader
};
