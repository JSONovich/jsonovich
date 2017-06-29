/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Module to migrate preferences into WebExtension storage.
 */

'use strict';

const {defaults} = require('chrome/DefaultPrefs');
const {debug} = require('log');

exports.migrate = listenPref => {
    webext.then(api => {
        const {onConnect} = api.browser.runtime;
        onConnect.addListener(port => {
            if(port.name != 'migrate' || port.sender.id != `${ADDON_LNAME}@${ADDON_DOMAIN}`)
                return;
            debug(`Webext connected: ${port.sender.url}`);

            listenPref('', (branch, pref) => {
                let type = 'string-ascii';
                for(let [t, prefs] of defaults) {
                    if(pref in prefs) {
                        type = t;
                        break;
                    }
                }
                port.postMessage({
                    pref: pref,
                    value: branch.get(pref, type)
                });
            });
        });
    });
};
