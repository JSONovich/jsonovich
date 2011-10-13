/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Maps JSON file extensions to the appropriate content type.
 *
 * Changelog:
 * [2011-07] - Created separate module for file extension mapping
 */

'use strict';

var prefUtils = require('prefUtils'),
catName = 'ext-to-type-mapping',
prefName = 'mime.extensionMap',
mapped = null;

/**
 * Dynamically register filetype mapping
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
exports.register = function registerExtMap(listenPref) {
    if(mapped) {
        mapped();
    }
    var mimeSvc = null,
    aCatMgr = XPCOMUtils.categoryManager,
    registered = [],
    valid = require('validate'),
    undoUnload = null,
    unregister = function() {
        for(let i = 0; i < registered.length; i++) {
            aCatMgr.deleteCategoryEntry(catName, registered[i], false);
        }
        mapped = null;
        if(undoUnload) {
            undoUnload();
            undoUnload = null;
        }
    };
    listenPref(prefName, function(branch, pref) {
        unregister();
        var conversions = (branch.get('mime.conversions', 'string-ascii') || '').split('|');
        prefUtils.stringMap(branch, pref, '|', ':', function(entry, parts) {
            if(parts.length != 2) {
                require('log').debug('Invalid file extension to MIME type mapping "' + entry + '".');
                return false;
            }
            if(!valid.fileExt(parts[0])) {
                require('log').debug('Invalid file extension "' + parts[0] + '" for mapping "' + entry + '".');
                return false;
            }
            if(!valid.mime(parts[1])) {
                require('log').debug('Invalid MIME type "' + parts[1] + '" for mapping "' + entry + '".');
                return false;
            }
            if(conversions.indexOf(parts[1]) == -1) { // only register if we handle the MIME type
                require('log').debug('MIME type "' + parts[1] + '" isn\'t registered to ' + ADDON_NAME + ' for mapping "' + entry + '".');
                return false;
            }
            if(mimeSvc) { // slow, don't check on 1st pass (assume preference valid on startup)
                let existing;
                try { // only register extensions that aren't already mapped
                    existing = mimeSvc.getTypeFromExtension(parts[0]);
                } catch(e) {
                    if(e.name == 'NS_ERROR_NOT_AVAILABLE') {
                        existing = false;
                    } else {
                        throw e;
                    }
                }
                if(existing) {
                    require('log').debug('MIME type "' + parts[1] + '" is already mapped to "' + existing + '", not overriding for mapping "' + entry + '".');
                    return false;
                }
            }
            aCatMgr.addCategoryEntry(catName, parts[0], parts[1], false, true);
            registered.push(parts[0]);
            return true;
        });
        undoUnload = require('unload').unload(unregister);
        mapped = unregister;
        if(!mimeSvc) {
            mimeSvc = Cc['@mozilla.org/mime;1'].getService(Ci.nsIMIMEService);
        }
    });
}
