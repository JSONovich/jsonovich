/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains lifecycle functions specific to content processes.
 *
 * Changelog:
 * [2011-07] - Separated content-related lifecycle functions for Electrolysis
 */

'use strict';

function startup(optionsUI, once) {
    function init() {
        if(optionsUI) {
            TS['RegisterReqObserver'] = [Date.now()];
            require('content/RequestObserver').register('json');
            TS['RegisterReqObserver'].push(Date.now());
        }

        let prefs = require('prefs').branch,
        listenPref = prefs(ADDON_PREFROOT).listen;

        TS['RegisterConversions'] = [Date.now()];
        require('content/StreamConverter').register(listenPref);
        TS['RegisterConversions'].push(Date.now());
    }

    if(once) {
        once.runOnce('init', init);
    } else {
        init();
    }

// TODO: listen for document load event, prettify json
/*addEventListener("DOMContentLoaded", function() {
}, false);*/
}
