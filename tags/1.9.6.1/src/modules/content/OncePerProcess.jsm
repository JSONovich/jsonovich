/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Utility allowing operations in frame scripts to be run only once per process rather than per tab.
 */

'use strict';

var EXPORTED_SYMBOLS = ['load', 'unload'];

var unloads = {};

function load(name, callback, unloadCallback) {
    if(!unloads[name]) {
        unloads[name] = unloadCallback || true;
        callback();
    }
}

function unload(name) {
    if(unloads[name]) {
        var u = unloads[name];
        delete unloads[name];
        typeof u == 'function' && u();
    }
}
