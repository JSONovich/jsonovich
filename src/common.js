/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Common code for background scripts.
 */

'use strict';

const ts = {
    common: Date.now()
};
const defaultConfig = {
    mimetypes: {
        'application/json': 'json',                // standard, http://www.ietf.org/rfc/rfc4627.txt
        'application/sparql-results+json': 'json', // standard, http://www.w3.org/TR/rdf-sparql-json-res/
        'application/schema+json': 'json',         // draft, http://json-schema.org/
        'application/jsonrequest': 'json',         // proposed, http://json.org/JSONRequest.html
        'application/x-json': 'json',              // legacy, officially application/json
        'text/json': 'json',                       // legacy, officially application/json
        'text/x-json': 'json',                     // legacy, officially application/json
        'application/rdf+json': 'json',            // legacy, officially application/json
        'application/jsonml+json': 'json',         // unofficial, http://jsonml.org/
        'application/manifest+json': 'json',       // proposed, https://w3c.github.io/manifest/
        'application/json-p': 'js',                // proposed, http://www.json-p.org/
        'text/json-p': 'js',                       // proposed, http://www.json-p.org/
        'application/javascript': 'js',            // standard, http://www.ietf.org/rfc/rfc4329.txt
        'application/ecmascript': 'js',            // standard, http://www.ietf.org/rfc/rfc4329.txt
        'text/javascript': 'js',                   // obsolete, http://www.ietf.org/rfc/rfc4329.txt
        'text/ecmascript': 'js',                   // obsolete, http://www.ietf.org/rfc/rfc4329.txt
        'application/x-javascript': 'js',          // legacy, officially application/javascript
        'application/x-ecmascript': 'js',          // legacy, officially application/ecmascript
        'text/x-javascript': 'js',                 // legacy, officially application/javascript
        'text/x-ecmascript': 'js'                  // legacy, officially application/ecmascript
    },
    extensions: {
        'json': 'json', // application/json
        'srj': 'json'   // application/sparql-results+json
    },
    accept: {},
    debug: false
};
const configInit = browser.storage.local.get(defaultConfig);

const valid = {
    expect: {
        mimetype: { // ref: https://tools.ietf.org/html/rfc7231#section-3.1.1.1
            maxLen: 80,
            regex: /^(?:application|text)\/[^\*/]+$/
        },
        extension: {
            maxLen: 10,
            regex: /^[^\*\.?#/\\]+$/
        },
        pattern: { // ref: https://developer.mozilla.org/Add-ons/WebExtensions/Match_patterns
            maxLen: 2000,
            regex: /^<all_urls>|(?:\*|https?|file|ftp|app):\/\/(?:\*(?:\.[^\./]+)?|[^\./][^/]*|)(?:\/.*)?$/
        },
        format: {
            choice: ['json', 'js']
        },
        accept: {
            obj: {
                k: 'mimetype',
                v: 'q'
            },
            choice: [{'application/json':'1'}]
        },
        q: { // number between 0 and 1 with up to 3 decimal digits, ref: https://tools.ietf.org/html/rfc7231#section-5.3.1
            maxLen: 5,
            regex: /^(?:1(?:\.0{1,3})?|0(?:\.\d{1,3})?)$/
        }
    },
    schema: {
        mimetypes: {
            k: 'mimetype',
            v: 'format'
        },
        extensions: {
            k: 'extension',
            v: 'format'
        },
        accept: {
            k: 'pattern',
            v: 'accept'
        },
        debug: true
    },
    entry: (expect, value) => {
        switch(typeof expect) {
        case 'boolean':
            return value === false || value === true;
        case 'string':
            if((expect = valid.expect[expect])) {
                if(expect.obj)
                    return valid.entry(expect.obj, value);
                else
                    return value && typeof value === 'string' && value.length
                        && (!expect.maxLen || value.length <= expect.maxLen)
                        && (!expect.choice || expect.choice.includes(value))
                        && (!expect.regex || expect.regex.test(value));
            }
            break;
        case 'object':
            if(expect.k && expect.v && typeof value === 'object') {
                for(const k in value) {
                    if(!valid.entry(expect.k, k) || !valid.entry(expect.v, value[k]))
                        return false;
                }
                return true;
            }
            break;
        }
        return false;
    },
    config: (config) => {
        if(typeof config !== 'object')
            throw 'Configuration must be an object.';
        for(const k in config) {
            if(!(k in valid.schema))
                delete config[k]; // ignore unrecognised keys
            else if(!valid.entry(valid.schema[k], config[k]))
                throw `Invalid configuration entry "${k}": ${JSON.stringify(config[k])}.`;
        }
    }
};

const logger = {
    disabled: () => {},
    get enabled() {
        let page = window.location.href;
        switch(page) {
        case browser.runtime.getURL('_generated_background_page.html'):
            page = 'background';
            break;
        case browser.runtime.getURL('options/options.html'):
            page = 'options';
            break;
        default:
            const base = browser.runtime.getURL();
            if(page.startsWith(base))
                page = page.replace(base, '');
        }
        const logger = Function.prototype.bind.call(console.log, console, `[JSONovich ${page}]`);
        logger('Debugging enabled', browser.runtime.getManifest());
        delete this.enabled;
        return this.enabled = logger;
    }
};
let log = logger.disabled;
const setDebug = enable => log = enable ? logger.enabled : logger.disabled;

setDebug(defaultConfig.debug);
configInit.then(config => {
    setDebug(config.debug);
    browser.storage.onChanged.addListener((changes, areaName) => {
        const {debug} = changes;
        if(areaName === 'local' && typeof debug !== 'undefined')
            setDebug('newValue' in debug && debug.newValue);
    });
    log('common.js started', Date.now() - ts.common);
});
