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

    TS['PrepareAsyncLoad'] = [Date.now()];
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init({ // async load
        observe: function() {
            listenPref('debug', function(branch, pref) {
                let debug = branch.get(pref, 'boolean');
                let log = require('log');
                log.setDebug(debug);
                if(debug) {
                    let desc = {
                        'Bootstrap': 'time taken to execute bootstrap script',
                        'Startup': 'time between us receiving startup event and leaving event listener during browser startup',
                        'Install': 'time between us receiving startup event and leaving event listener during user-initiated install',
                        'Restart': 'time between us receiving startup event and leaving event listener after user-initiated enable',
                        'StartRequest': 'time spent in the most recent call to the stream converter\'s onStartRequest function',
                        'DataAvailable': 'time spent in the most recent call to the stream converter\'s onDataAvailable function',
                        'ParseJSON': 'time spent parsing the received JSON string into an object',
                        'FormatJSON': 'time spent tokenising the parsed object and generating a string of HTML',
                        'StopRequest': 'time spent in the most recent call to the stream converter\'s onStopRequest function',
                        'SetDefaultPrefs': 'time spent initialising default preferences',
                        'RegisterConversions': 'time taken to register stream converters',
                        'RegisterExtMap': 'time taken to register file extension to type mappings',
                        'RegisterAcceptHeader': 'time taken to set up Accept header',
                        'RegisterResAlias': 'time taken to register resource:// URL alias',
                        'PrepareAsyncLoad': 'time spent initialising nsiTimer to defer loading non-essentials'
                    };
                    for(let measure in TS) {
                        if(TS[measure].length>1) {
                            log.info(measure + ' Performance: ' + (TS[measure][1]-TS[measure][0]) + 'ms' + (measure in desc ? ' (' + desc[measure] + ')' : ''));
                        }
                    }
                }
            });
            timer = null; // "Users of instances of nsITimer should keep a reference to the timer until it is no longer needed in order to assure the timer is fired."
        }
    }, 500, timer.TYPE_ONE_SHOT);
    TS['PrepareAsyncLoad'].push(Date.now());
}

function uninstall() {
    let prefs = require('prefs').branch;
    prefs('extensions.' + ADDON_LNAME, true).uninstall();
    prefs('extensions.' + ADDON_LNAME + '@' + ADDON_DOMAIN, true).uninstall();
}

function shutdown() {
    require('unload').unload();
}
