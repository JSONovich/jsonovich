/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @copyright Portions (C) 2010 the Mozilla Foundation.
 * @description This file contains utility functions for logging to the error console.
 */

'use strict';

let debug = false,
prefixError = '[' + ADDON_NAME + ' Error] ',
prefixInfo = '[' + ADDON_NAME + ' Info] ',
prefixDebug = '[' + ADDON_NAME + ' Debug] ';

exports.error = function logError(err) {
    Cu.reportError(err instanceof Error ? err : prefixError + err);
}

exports.info = function logInfo(msg) {
    Services.console.logStringMessage(prefixInfo + msg);
}

exports.debug = function logDebug(msg) {
    if(debug) {
        Services.console.logStringMessage(prefixDebug + msg);
    }
}

exports.setDebug = function setDebug(enable) {
    debug = enable;
}
