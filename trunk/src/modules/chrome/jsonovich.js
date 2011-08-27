/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions specific to chrome processes.
 *
 * Changelog:
 * [2011-05] - Added require, startup, uninstall and shutdown functions.
 * [2011-05] - Moved require out for Electrolysis.
 * [2011-08] - Moved logging initialisation out since it's also needed by content processes
 */

'use strict';

function startup(optionsUI) {
    let prefs = require('prefs').branch,
    listenPref = prefs(ADDON_PREFROOT).listen;

    TS['SetDefaultPrefs'] = [Date.now()];
    let defaults = require('chrome/DefaultPrefs');
    defaults.set(prefs(ADDON_PREFROOT, true).set);
    if(optionsUI) {
        defaults.setContent(ADDON_PREFROOT);
    }
    TS['SetDefaultPrefs'].push(Date.now());

    TS['RegisterExtMap'] = [Date.now()];
    require('chrome/ExtToTypeMapping').register(listenPref);
    TS['RegisterExtMap'].push(Date.now());

    TS['RegisterAcceptHeader'] = [Date.now()];
    require('chrome/DefaultAcceptHeader').register(listenPref, 'json');
    TS['RegisterAcceptHeader'].push(Date.now());

    TS['RegisterResAlias'] = [Date.now()];
    require('chrome/ResourceAlias').register(ADDON_LNAME, getResourceURI('resources/')); // trailing slash required inside XPI
    TS['RegisterResAlias'].push(Date.now());

    if(optionsUI) {
        TS['ObserveOptionsUI'] = [Date.now()];
        require('chrome/Options').observe();
        TS['ObserveOptionsUI'].push(Date.now());
    }
}

function uninstall() {
    require('chrome/Options').clear();
}
