/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions relevant to both chrome and content processes.
 */

'use strict';

function startup() {
    var listenPref = require('prefs').branch(ADDON_PREFROOT).listen;
    TS['L10n'] = [Date.now()];
        require('l10n').register(listenPref);
    TS['L10n'].push(Date.now());

    TS['PrepareAsyncLoad'] = [Date.now()];
    var async = {
        timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
        done: require('unload').unload(function() {
            async.timer.cancel();
            async = null;
        })
    };
    async.timer.init({ // async load
        observe: function() {
            listenPref('debug', function(branch, pref) {
                var debug = branch.get(pref, 'boolean'),
                log = require('log');
                log.setDebug(debug);
                if(debug) {
                    let url = typeof content === 'object' && typeof content.document === 'object' && content.document.location ? content.document.location : 'chrome',
                    desc = {
                        'Bootstrap': 'time taken to execute bootstrap script',
                        'Startup': 'time between us receiving startup event and leaving event listener',
                        'Install': 'time between us receiving startup event and leaving event listener during user-initiated install',
                        'Restart': 'time between us receiving startup event and leaving event listener after user-initiated enable',
                        'StartRequest': 'time spent in the most recent call to the stream converter\'s onStartRequest function',
                        'DataAvailable': 'time spent in the most recent call to the stream converter\'s onDataAvailable function',
                        'ParseJSON': 'time spent parsing the received JSON string into an object',
                        'FormatJSON': 'time spent tokenising the parsed object and generating a string of HTML',
                        'StopRequest': 'time spent in the most recent call to the stream converter\'s onStopRequest function',
                        'SetDefaultPrefs': 'time spent initialising default preferences',
                        'RegisterReqObserver': 'time taken to register request observer',
                        'RegisterConversions': 'time taken to register stream converters',
                        'RegisterExtMap': 'time taken to register file extension to type mappings',
                        'RegisterAcceptHeader': 'time taken to set up default Accept header',
                        'RegisterResAlias': 'time taken to register resource:// URL alias',
                        'ObserveOptionsUI': 'time taken to add options UI observer',
                        'PrepareAsyncLoad': 'time spent initialising nsiTimer to defer loading non-essentials',
                        'L10n': 'time spent registering localisation module'
                    };
                    for(let measure in TS) {
                        if(TS[measure].length>1) {
                            log.info('<' + url + '> ' + measure + ': ' + (TS[measure][1]-TS[measure][0]) + 'ms' + (measure in desc ? ' (' + desc[measure] + ')' : ''));
                        }
                    }
                }
            });
            async.done();
            async = null; // "Users of instances of nsITimer should keep a reference to the timer until it is no longer needed in order to assure the timer is fired."
        }
    }, 500, async.timer.TYPE_ONE_SHOT);
    TS['PrepareAsyncLoad'].push(Date.now());
}

function shutdown() {
    require('unload').unload();
}
