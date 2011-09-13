/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Changes JSON MIME types to Javascript to trigger display in browser.
 *
 * Changelog:
 * [2011-07] - Created new simple stream converter to force me to implement support for Javascript MIME type
 *           - Registration function merged to ease support for Electrolysis
 * [2011-09] - Hacked in support for JavaScript MIME types using existing stream converter
 */

'use strict';

let classID = exports.classID = Components.ID('{dcc31be0-c861-11dd-ad8b-0800200c9a66}'),
prefName = 'mime.conversions',
catName = 'Gecko-Content-Viewers',
dlf = '@mozilla.org/content/document-loader-factory;1';

/**
 * Dynamically register converters
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
exports.register = function registerConversions(listenPref) {
    let aCatMgr = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager),
    aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar),
    factory = require('content/jsonStreamConverter').factory, // TODO: switch to JSON2JSFactory when we can listen to page-load DOM events and handle JSON from there
    backup = [],
    valid = require('validate'),
    unregister = function() {
        try {
            aCompMgr.unregisterFactory(classID, factory);
        } catch(e) {
            if(e.name != 'NS_ERROR_FACTORY_NOT_REGISTERED') {
                require('log').error(e);
            }
        }
        for(let i = 0; i < backup.length; i++) {
            aCatMgr.addCategoryEntry(catName, backup[i], dlf, false, true);
        }
        backup = [];
    };
    listenPref(prefName, function(branch, pref) {
        let tmpFactory = factory,
        orig = branch.get(pref, 'string-ascii'),
        conversions = orig.split('|');
        if(!conversions.length) {
            return;
        }
        unregister();
        try {
            let validConversions = [], existing;
            for(let i = 0; i < conversions.length; i++) {
                if(!valid.mime(conversions[i])) {
                    require('log').debug('Invalid MIME type conversion "' + conversions[i] + '".');
                    continue;
                }
                try {
                    existing = aCatMgr.getCategoryEntry(catName, conversions[i]);
                } catch(e) {
                    if(e.name == 'NS_ERROR_NOT_AVAILABLE') {
                        existing = null;
                    } else {
                        throw e;
                    }
                }
                if(existing == dlf) {
                    aCatMgr.deleteCategoryEntry(catName, conversions[i], false);
                    backup.push(conversions[i]);
                }
                try {
                    aCompMgr.registerFactory(classID, ADDON_NAME, '@mozilla.org/streamconv;1?from=' + conversions[i] + '&to=*/*', tmpFactory);
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
            require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
        } finally {
            require('unload').unload(unregister);
        }
    });
}
