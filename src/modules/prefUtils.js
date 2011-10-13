/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Utilities for dealing with preferences.
 *
 * Changelog:
 * [2011-10] - Created preferences helper functions
 */

'use strict';

var stringSet = exports.stringSet = function stringSet(branch, pref, entrySep, callback) {
    var orig = branch.get(pref, 'string-ascii') || '',
    entries = orig.split(entrySep),
    validEntries = [];
    try {
        for(let i = 0; i < entries.length; i++) {
            if(callback(entries[i])) {
                validEntries.push(entries[i]);
            }
        }
        validEntries = validEntries.join(entrySep);
        if(orig != validEntries) { // some entries were invalid, let's remove them from prefs
            branch.set(pref, 'string-ascii', validEntries);
        }
    } catch(e) {
        require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
    }
};

exports.stringMap = function stringMap(branch, pref, entrySep, kvSep, callback) {
    stringSet(branch, pref, entrySep, function(entry) {
        return callback(entry, entry.split(kvSep));
    });
};
