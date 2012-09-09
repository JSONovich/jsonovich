/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Changes JSON MIME types to Javascript to trigger display in browser.
 */

'use strict';

var prefUtils = require('prefUtils'),
classID = exports.classID = Components.ID('{dcc31be0-c861-11dd-ad8b-0800200c9a66}'),
prefName = 'mime.conversions',
catName = 'Gecko-Content-Viewers',
dlf = '@mozilla.org/content/document-loader-factory;1';

/**
 * Dynamically register converters
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
exports.register = function registerConversions(once, listenPref) {
    var aCatMgr = XPCOMUtils.categoryManager,
    aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar),
    factory = require('content/jsonStreamConverter').factory, // TODO: switch to JSON2JSFactory when we can listen to page-load DOM events and handle JSON from there
    backup = [],
    valid = require('validate'),
    unregister = function(stayListening) {
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
        if(!stayListening && undoListen) {
            undoListen();
            undoListen = null;
        }
    },
    undoListen = null;
    once.load('StreamConverter', function() {
        undoListen = listenPref(prefName, function(branch, pref) {
            var tmpFactory = factory;
            unregister(true);
            prefUtils.stringSet(branch, pref, '|', function(entry) {
                var existing, tryagain = false;
                if(!valid.mime(entry)) {
                    require('log').debug('Invalid MIME type conversion "' + entry + '".');
                    return false;
                }
                try {
                    existing = aCatMgr.getCategoryEntry(catName, entry);
                } catch(e) {
                    if(e.name == 'NS_ERROR_NOT_AVAILABLE') {
                        existing = null;
                    } else {
                        throw e;
                    }
                }
                if(existing == dlf) {
                    aCatMgr.deleteCategoryEntry(catName, entry, false);
                    backup.push(entry);
                }
                do {
                    try {
                        aCompMgr.registerFactory(classID, ADDON_NAME, '@mozilla.org/streamconv;1?from=' + entry + '&to=*/*', tmpFactory);
                        return true;
                    } catch(e) {
                        if(tmpFactory && e.name == 'NS_ERROR_FACTORY_EXISTS') { // this only happens in Gecko 2+...
                            tmpFactory = null; // set null to avoid factory exists warning
                            tryagain = true; // and try again
                        } else {
                            throw e;
                        }
                    }
                } while(tryagain);
                return false;
            });
        });
    }, function() {
        unregister();
    });
    require('unload').unload(function() {
        once.unload('StreamConverter');
    });
}
