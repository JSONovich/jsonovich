/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Utility to return boolean flags allowing operations in frame scripts to be run only once per process rather than per tab.
 *
 * Changelog:
 * [2011-08] - Created frame script run-once-per-process utility
 */

'use strict';

var EXPORTED_SYMBOLS = ['runOnce', 'resetOncePerProcess'];

var flags = {};

function runOnce(name, callback) {
    if(typeof flags[name] == 'undefined') {
        flags[name] = true;
        callback();
    }
}

function resetOncePerProcess() {
    flags = {};
}
