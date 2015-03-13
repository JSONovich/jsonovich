/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions specific to content processes.
 */

'use strict';

function startup(once) {
    let prefs = require('prefs').branch,
    listenPref = prefs(ADDON_PREFROOT).listen;

    TS['RegisterConversions'] = [Date.now()];
    require('content/StreamConverter').register(once, listenPref);
    TS['RegisterConversions'].push(Date.now());
}
