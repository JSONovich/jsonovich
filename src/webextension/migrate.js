/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Transitional WebExtension to receive preferences from legacy bootstrap addon for future-proof storage.
 */

'use strict';

function noop() {}

function logDebug(message) {
    console.log(`[JSONovich Webext] ${message}`);
}

browser.storage.local.get({
    accept: {},
    debug: false
}).then(config => {
    const notJson = /script|json-?p/i;
    const accept = config.accept;
    let log = config.debug ? logDebug : noop;

    browser.storage.onChanged.addListener((changes, areaName) => {
        log(`Change in ${areaName} storage: ${JSON.stringify(changes)}`);
        if('debug' in changes && 'newValue' in changes.debug && (log = changes.debug.newValue ? logDebug : noop))
            browser.storage[areaName].get().then(config => log(`Current config: ${JSON.stringify(config)}`));
    });

    browser.runtime.connect({name: 'migrate'}).onMessage.addListener(message => {
        log(`Message from bootstrap: ${JSON.stringify(message)}`);
        if(!message.pref)
            return; // not a preference

        const data = {};
        switch(message.pref) {
        case 'debug':
            data[message.pref] = message.value;
            break;

        case 'mime.conversions':
            data['mimetypes'] = message.value.split('|').reduce((accumulator, current) => {
                accumulator[current] = notJson.test(current) ? 'js' : 'json';
                return accumulator;
            }, {});
            break;

        case 'mime.extensionMap':
            data['extensions'] = message.value.split('|').reduce((accumulator, current) => {
                current = current.split(':');
                accumulator[current[0]] = notJson.test(current[1]) ? 'js' : 'json';
                return accumulator;
            }, {});
            break;

        case 'acceptHeader.json':
            if(message.value)
                accept['*://*/*'] = {'application/json': '1'};
            else
                delete accept['*://*/*'];
            data['accept'] = accept;
            break;

        default:
            if(message.pref.startsWith('acceptHeaderOverride.json.')) {
                if(message.pref.endsWith('.bbc.co.uk') && message.value === '0')
                    message.value = null; // removing from defaults, not relevant to all users

                message.pref = `*://${message.pref.substring('acceptHeaderOverride.json.'.length)}/*`;
                if(message.value)
                    accept[message.pref] = {'application/json': message.value};
                else
                    delete accept[message.pref];
                data['accept'] = accept;
            } else
                return; // unrecognised preference
        }
        browser.storage.local.set(data).then(noop, log);
    });

    log(`Started: ${window.location}`);
});
