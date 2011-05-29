/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains the JSONovich bootstrap for Gecko 2+ browsers.
 *
 * Changelog:
 * [2011-05] - Created FF4 restartless bootstrap for JSONovich extension
 */

'use strict';

var TS = {'Bootstrap': [Date.now()]};
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

const ADDON_NAME = 'JSONovich';
const ADDON_LNAME = 'jsonovich';
const ADDON_DOMAIN = 'lackoftalent.org';
const PLATFORM = 'gecko';
let jsonovich, getResourceURI;

function startup(data, reason) {
    let measure = reason == APP_STARTUP ? 'Startup' : (reason == ADDON_INSTALL ? 'Install' : 'Restart');
    AddonManager.getAddonByID(data.id, function(addon) {
        TS[measure] = [Date.now()];
        getResourceURI = function getResourceURI(path) {
            return addon.getResourceURI(path);
        }
        jsonovich = {};
        Services.scriptloader.loadSubScript(getResourceURI('modules/' + PLATFORM + '/jsonovich.js').spec, jsonovich);
        if(jsonovich.startup) {
            jsonovich.startup();
        }
        TS[measure].push(Date.now());
    });
}

function shutdown(data, reason) {
    if(reason == ADDON_UNINSTALL && jsonovich.uninstall) {
        jsonovich.uninstall();
    }
    if(reason != APP_SHUTDOWN && jsonovich.shutdown) {
        jsonovich.shutdown();
        jsonovich = null;
    }
}

TS['Bootstrap'].push(Date.now());
