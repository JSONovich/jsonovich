/**
 * This file contains utility functions for logging to the error console.
 *
 * Changelog:
 * [2011-05] - Created log module
 *
 * TODO: when dropping Gecko 1.9.2/Firefox 3.6 support, remove emulation of Services.jsm.
 *
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 All Rights Reserved
 * Portions Copyright (C) 2010 the Mozilla Foundation.
 */

'use strict';

let debug = false;

if(!Services.console) { // emulate Services.jsm (introduced in Gecko 2/FF4)
    // @see http://hg.mozilla.org/mozilla-central/diff/b264a7e3c0f5/toolkit/content/Services.jsm
    XPCOMUtils.defineLazyServiceGetter(Services, "console", "@mozilla.org/consoleservice;1", "nsIConsoleService");
}

function logError(msg) {
    Cu.reportError(msg);
}

function logInfo(msg) {
    Services.console.logStringMessage(msg);
}

function logDebug(msg) {
    if(debug) {
        Services.console.logStringMessage(msg);
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
