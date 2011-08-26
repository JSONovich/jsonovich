/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions specific to chrome processes.
 *
 * Changelog:
 * [2011-05] - Added require, startup, uninstall and shutdown functions.
 * [2011-05] - Moved require out for Electrolysis.
 */

'use strict';

function startup() {
    let prefs = require('prefs').branch,
    listenPref = prefs('extensions.' + ADDON_LNAME).listen;

    TS['SetDefaultPrefs'] = [Date.now()];
    require('chrome/DefaultPrefs').set(prefs('extensions.' + ADDON_LNAME, true).set);
    TS['SetDefaultPrefs'].push(Date.now());

    TS['RegisterExtMap'] = [Date.now()];
    require('chrome/ExtToTypeMapping').register(listenPref);
    TS['RegisterExtMap'].push(Date.now());

    // maybe we can add a lower q-value in the future, track https://issues.apache.org/jira/browse/COUCHDB-234
    TS['RegisterAcceptHeader'] = [Date.now()];
    require('chrome/DefaultAcceptHeader').register(listenPref, 'acceptHeader.json', 'application/json');
    TS['RegisterAcceptHeader'].push(Date.now());

    TS['RegisterResAlias'] = [Date.now()];
    require('chrome/ResourceAlias').register(ADDON_LNAME, getResourceURI('resources/')); // trailing slash required inside XPI;
    TS['RegisterResAlias'].push(Date.now());

    if(Services.vc.compare(Services.appinfo.platformVersion, '6.9') > 0) { // no point loading this before Gecko7
        TS['ObserveOptionsUI'] = [Date.now()];
        require('chrome/Options').observe();
        TS['ObserveOptionsUI'].push(Date.now());
    }
}

function uninstall() {
    require('chrome/Options').clear();
}
