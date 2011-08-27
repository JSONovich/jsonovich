/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @copyright Portions (C) 2010 the Mozilla Foundation.
 * @description This file contains utility functions for logging to the error console.
 * @todo When dropping Gecko 1.9.2/Firefox 3.6 support, remove emulation of Services.jsm.
 *
 * Changelog:
 * [2011-05] - Created log module
 * [2011-06] - Don't clobber Error objects
 */

'use strict';

let debug = false,
prefixError = '[' + ADDON_NAME + ' Error] ',
prefixInfo = '[' + ADDON_NAME + ' Info] ',
prefixDebug = '[' + ADDON_NAME + ' Debug] ';

if(!("console" in Services)) { // emulate Services.jsm (introduced in Gecko 2/FF4)
    // @see http://hg.mozilla.org/mozilla-central/diff/b264a7e3c0f5/toolkit/content/Services.jsm
    XPCOMUtils.defineLazyServiceGetter(Services, "console", "@mozilla.org/consoleservice;1", "nsIConsoleService");
}

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
