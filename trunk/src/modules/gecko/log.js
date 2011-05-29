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
 */

'use strict';

let debug = false;

if(!Services.console) { // emulate Services.jsm (introduced in Gecko 2/FF4)
    // @see http://hg.mozilla.org/mozilla-central/diff/b264a7e3c0f5/toolkit/content/Services.jsm
    XPCOMUtils.defineLazyServiceGetter(Services, "console", "@mozilla.org/consoleservice;1", "nsIConsoleService");
}

function logError(msg) {
    Cu.reportError('[' + ADDON_NAME + ' Error] ' + msg);
}

function logInfo(msg) {
    Services.console.logStringMessage('[' + ADDON_NAME + ' Info] ' + msg);
}

function logDebug(msg) {
    if(debug) {
        Services.console.logStringMessage('[' + ADDON_NAME + ' Debug] ' + msg);
    }
}

function setDebug(enable) {
    debug = enable;
}

var exports = {
    error: logError,
    info: logInfo,
    debug: logDebug,
    setDebug: setDebug
};
