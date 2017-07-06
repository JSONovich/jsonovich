/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Transitional WebExtension to receive preferences from legacy bootstrap addon for future-proof storage.
 */

'use strict';

defaults.then(config => {
    const notJson = /script|json-?p/i;

    function changeAccept(data, matcher, q) {
        const accept = Object.assign({}, config.accept);
        if(q) {
            if(!(matcher in accept))
                accept[matcher] = {};
            else if('application/json' in accept[matcher] && accept[matcher]['application/json'] === q)
                return false; // unchanged
            accept[matcher]['application/json'] = q;
        } else if(matcher in accept)
            delete accept[matcher];
        else
            return false; // unchanged
        data.accept = accept;
        return true;
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
        log(`Change in ${areaName} storage:`, changes);
        if('debug' in changes && 'newValue' in changes.debug && changes.debug.newValue)
            browser.storage[areaName].get().then(c => log('Current config:', c));
    });

    browser.runtime.connect({name: 'migrate'}).onMessage.addListener(message => {
        log('Message from bootstrap:', message);
        if(!message.pref)
            return; // not a preference

        let changed = false;
        const data = {};
        switch(message.pref) {
        case 'debug':
            data[message.pref] = message.value;
            changed = config[message.pref] !== data[message.pref];
            break;

        case 'mime.conversions':
            const {mimetypes} = config;
            data.mimetypes = message.value.split('|').reduce((accumulator, current) => {
                if(current) {
                    accumulator[current] = notJson.test(current) ? 'js' : 'json';
                    changed |= !(current in mimetypes) || mimetypes[current] !== accumulator[current];
                }
                return accumulator;
            }, {
                'application/manifest+json': 'json' // adding to defaults (handled by native viewer)
            });
            if(!changed)
                changed = Object.keys(mimetypes).some(mime => !(mime in data.mimetypes) || data.mimetypes[mime] !== mimetypes[mime]);
            message.pref = 'mimetypes';
            break;

        case 'mime.extensionMap':
            const {extensions} = config;
            data.extensions = message.value.split('|').reduce((accumulator, current) => {
                if(current) {
                    current = current.split(':', 2);
                    if(current.length == 2) {
                        accumulator[current[0]] = notJson.test(current[1]) ? 'js' : 'json';
                        changed |= !(current[0] in extensions) || extensions[current[0]] !== accumulator[current[0]];
                    }
                }
                return accumulator;
            }, {});
            if(!changed)
                changed = Object.keys(extensions).some(ext => !(ext in data.extensions) || data.extensions[ext] !== extensions[ext]);
            message.pref = 'extensions';
            break;

        case 'acceptHeader.json':
            changed = changeAccept(data, '<all_urls>', message.value);
            message.pref = 'accept';
            break;

        default:
            if(message.pref.startsWith('acceptHeaderOverride.json.')) {
                if(message.pref.endsWith('.bbc.co.uk') && message.value === '0')
                    message.value = null; // removing from defaults, not relevant to all users
                message.pref = `*://${message.pref.substring('acceptHeaderOverride.json.'.length)}/*`;
                changed = changeAccept(data, message.pref, message.value);
                message.pref = 'accept';
            }
        }
        if(changed)
            browser.storage.local.set(data).then(() => {
                config[message.pref] = data[message.pref];
            }, log);
    });

    log('migration.js started', window.location);
});
