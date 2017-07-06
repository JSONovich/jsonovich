/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions specific to chrome processes.
 */

'use strict';

function startup() {
    var prefs = require('prefs').branch,
    prefBranch = prefs(ADDON_PREFROOT),
    listenPref = prefBranch.listen;

    TS['SetDefaultPrefs'] = [Date.now()];
    require('chrome/DefaultPrefs').set(prefs(ADDON_PREFROOT, true).set);
    TS['SetDefaultPrefs'].push(Date.now());

    TS['L10n'] = [Date.now()];
    require('l10n').register();
    TS['L10n'].push(Date.now());

    TS['ObserveOptionsUI'] = [Date.now()];
    require('chrome/Options').observe(prefBranch);
    TS['ObserveOptionsUI'].push(Date.now());

    if(webext) {
        TS['WebextMigratePrefs'] = [Date.now()];
        require('chrome/WebextMigrate').migrate(listenPref);
        TS['WebextMigratePrefs'].push(Date.now());
    }
}

function uninstall() {
    require('chrome/Options').clear();
}
