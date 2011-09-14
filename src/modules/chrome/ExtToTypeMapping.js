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

let catName = 'ext-to-type-mapping',
prefName = 'mime.extensionMap';

/**
 * Dynamically register filetype mapping
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
exports.register = function registerExtMap(listenPref) {
    let mimeSvc = null,
    aCatMgr = XPCOMUtils.categoryManager,
    registered = [],
    valid = require('validate'),
    unregister = function() {
        for(let i = 0; i < registered.length; i++) {
            aCatMgr.deleteCategoryEntry(catName, registered[i], false);
        }
    };
    listenPref(prefName, function(branch, pref) {
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
                    require('log').debug('Invalid file extension to MIME type mapping "' + extensions[i] + '".');
                    continue;
                }
                if(!valid.fileExt(ext[0])) {
                    require('log').debug('Invalid file extension "' + ext[0] + '" for mapping "' + extensions[i] + '".');
                    continue;
                }
                if(!valid.mime(ext[1])) {
                    require('log').debug('Invalid MIME type "' + ext[1] + '" for mapping "' + extensions[i] + '".');
                    continue;
                }
                if(conversions.indexOf(ext[1]) == -1) { // only register if we handle the MIME type
                    require('log').debug('MIME type "' + ext[1] + '" isn\'t registered to ' + ADDON_NAME + ' for mapping "' + extensions[i] + '".');
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
                        require('log').debug('MIME type "' + ext[1] + '" is already mapped to "' + existing + '", not overriding for mapping "' + extensions[i] + '".');
                        continue;
                    }
                }
                aCatMgr.addCategoryEntry(catName, ext[0], ext[1], false, true);
                registered.push(ext[0]);
                validMappings.push(extensions[i]);
            }
            validMappings = validMappings.join('|');
            if(orig != validMappings) { // some mappings were invalid, let's remove them from prefs
                branch.set(pref, 'string-ascii', validMappings);
            }
        } catch(e) {
            require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
        } finally {
            require('unload').unload(unregister);
        }
        if(!mimeSvc) {
            mimeSvc = Cc['@mozilla.org/mime;1'].getService(Ci.nsIMIMEService);
        }
    });
}
