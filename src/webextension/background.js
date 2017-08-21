/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Background script handling networking tasks.
 */

'use strict';

{
// pre-compiled RegExps
const rAcceptSep = /\s*,\s*/;
const rParamSep = /\s*;\s*/;
const rAccept = /^accept$/i;
const rContentType = /^content-type$/i;
const rCharset = /; *charset *= *([^; ]+)/i;

// internal state
const reqs = new Map();
const tabs = new Map();

// user config
const acceptMatchers = new Map();
const mimes = new Map();
const exts = new Map();

/**
 * Update the given internal state map based on a changed preference.
 *
 * @param map Map The internal map to be updated.
 * @param changes storage.StorageChange An object representing a change to a storage area.
 */
function updateMap(map, changes) {
    const {oldValue = {}, newValue = {}, onDelete = false, onAdd = false} = changes;
    for(const key in oldValue)
        if(!(key in newValue)) {
            if(onDelete)
                onDelete(key);
            map.delete(key);
        }
    for(const key in newValue) {
        if(onAdd)
            onAdd(key);
        map.set(key, newValue[key]);
    }
}

/**
 * Override the value of a particular header, adding it if necessary.
 *
 * @param headers Array Each HTTP header line as an Object.
 * @param current Object The header line to be overridden, if it exists.
 * @param name String Name of header, if it doesn't exist yet.
 * @param value String Value of header to override/add.
 * @return Array The passed headers parameter, modified.
 */
function headerOverride(headers, current, name, value) {
    if(current)
        current.value = value;
    else
        headers.push({
            name: name,
            value: value
        });

    return headers;
}

/**
 * Override q-values of the given MIME types within an Accept header, adding them if necessary.
 *
 * @param current String The unmodified Accept header.
 * @param overrides Object MIME types to override along with q-values to use for each.
 * @return String The overridden Accept header.
 */
function acceptOverride(current, overrides) {
    const accept = current.split(rAcceptSep).filter(value => !(value.split(rParamSep, 2)[0] in overrides));

    for(let mime in overrides) {
        let q = overrides[mime];
        if(q == 0)
            continue;
        if(q < 1)
            mime += ';q=' + q;
        accept.push(mime);
    }

    return accept.join(',');
}

/**
 * Helper to match the extension of the given URL to a mode.
 *
 * @param url String The URL to be matched.
 * @return String The mode to use, or undefined.
 */
function handleUrl(url) {
    log('handleUrl', url);
    url = new URL(url);
    const ext = url.pathname.lastIndexOf('.');
    return ext > -1 ? exts.get(url.pathname.slice(ext + 1)) : undefined;
}

const listeners = {
    accept: new Map(),
    storage: {
        /**
         * Update internal state when user preferences change.
         *
         * @param changes storage.StorageChange An object representing a change to a storage area.
         * @param areaName storage.StorageArea An object representing a storage area.
         */
        onChanged(changes, areaName) {
            if(areaName != 'local')
                return; // shouldn't have non-local prefs
            const {mimetypes, extensions, accept} = changes;

            if(mimetypes)
                updateMap(mimes, mimetypes);
            if(extensions)
                updateMap(exts, extensions);
            if(accept) {
                accept.onDelete = accept.onAdd = matcher => {
                    const listener = listeners.accept.get(matcher);
                    log('onDelete/onAdd', matcher, !!listener);
                    if(!listener)
                        return;
                    browser.webRequest.onBeforeRequest.removeListener(listener);
                    listeners.accept.delete(matcher);
                };
                updateMap(acceptMatchers, accept);
            }

            if(mimetypes || extensions || accept)
                ensureListeners();
        }
    },
    tabs: {
        /**
         * Clean up internal state after a tab closes.
         *
         * @param tabId Number ID of the closed tab.
         */
        onRemoved(tabId) {
            tabs.delete(tabId);
        }
    },
    webRequest: {
        /**
         * Determine if the request is going to have a different Accept header.
         *
         * @param details Object Details of the request.
         * @return webRequest.BlockingResponse Changed headers.
         */
        onBeforeSendHeaders(details) {
            log('onBeforeSendHeaders', details, log === noop ? undefined : JSON.stringify(details.requestHeaders));
            if(details.tabId == -1)
                return; // internal request

            const q = reqs.get(details.requestId);
            if(typeof q === 'undefined')
                return; // no matching url
            reqs.delete(details.requestId);

            const accept = details.requestHeaders.find(header => header.value && rAccept.test(header.name));
            const overrideAccept = acceptOverride(accept.value, q);
            if(overrideAccept == accept.value)
                return;
            log(`Overriding Accept header for tab ${details.tabId} with ${overrideAccept}.`);

            return {
                requestHeaders: headerOverride(details.requestHeaders, accept, 'Accept', overrideAccept)
            };
        },

        /**
         * Determine if the response is going to be handled.
         *
         * @param details Object Details of the request.
         * @return webRequest.BlockingResponse Changed headers.
         */
        onHeadersReceived(details) {
            log('onHeadersReceived', details, log === noop ? undefined : JSON.stringify(details.responseHeaders));
            if(details.tabId == -1 || details.statusCode != 200)
                return; // internal request or non-OK response

            const mime = details.responseHeaders.find(header => header.value && rContentType.test(header.name));
            let mode;
            if((!mime || !(mode = mimes.get(mime.value.split(rParamSep, 2)[0]))) && !(mode = handleUrl(details.url)))
                return; // no matching mimetype or extension
            tabs.set(details.tabId, mode);
            log(`Handling tab ${details.tabId} as ${mode}.`);

            let override = 'text/plain';
            if(mode === 'json') {
                override += ';charset=UTF-8';
            } else if(mime) {
                let charset = mime.value.match(rCharset);
                if(charset)
                    override += ';charset=' + charset[1];
            }

            return { // bypasses any download dialog and built-in viewer
                responseHeaders: headerOverride(details.responseHeaders, mime, 'Content-Type', override)
            };
        },

        /**
         * Clean up internal state after a network error.
         *
         * @param details Object Details of the request.
         */
        onErrorOccurred(details) {
            reqs.delete(details.requestId);
        }
    },
    webNavigation: {
        /**
         * Determine if the navigation is going to be handled.
         *
         * @param details Object Details of the navigation.
         */
        onBeforeNavigate(details) {
            log('onBeforeNavigate', details);
            if(details.tabId == -1)
                return; // internal request

            let mode = handleUrl(details.url);
            if(!mode)
                return; // no matching extension
            tabs.set(details.tabId, mode);
            log(`Handling tab ${details.tabId} as ${mode}.`);
        },

        /**
         * Inject our content script.
         *
         * @param details Object Details of the navigation.
         */
        onCommitted(details) {
            log('onCommitted', details, Array.from(tabs), Array.from(reqs));
            if(!tabs.has(details.tabId))
                return;

            browser.tabs.executeScript(details.tabId, {
                file: '/content.js',
                runAt: 'document_start'
            }).then(result => {
                tabs.delete(details.tabId);
            }, error => {
                tabs.delete(details.tabId);
                log('Failed to load content script!', error);
            });
        }
    }
};

/**
 * Called after any change to config maps to make sure that approprate event listeners are active.
 */
function ensureListeners() {
    log('ensureListeners', acceptMatchers.size, mimes.size, exts.size);

    if(acceptMatchers.size) {
        for(const [matcher, q] of acceptMatchers) { // discover desired Accept header modifications
            if(listeners.accept.has(matcher))
                continue;
            const listener = details => {
                log('onBeforeRequest', details, matcher, q);
                reqs.set(details.requestId, Object.assign({}, reqs.get(details.requestId), q));
            };
            browser.webRequest.onBeforeRequest.addListener(listener, {
                urls: [matcher],
                types: ['main_frame']
            });
            listeners.accept.set(matcher, listener);
        }

        // perform Accept header modification
        browser.webRequest.onBeforeSendHeaders.addListener(listeners.webRequest.onBeforeSendHeaders, {
            urls: ['<all_urls>'],
            types: ['main_frame']
        }, [
            'blocking',
            'requestHeaders'
        ]);
    } else {
        for(const listener of listeners.accept.values()) {
            browser.webRequest.onBeforeRequest.removeListener(listener);
        }
        listeners.accept.clear();
        browser.webRequest.onBeforeSendHeaders.removeListener(listeners.webRequest.onBeforeSendHeaders);
    }
    log('acceptMatchers', log === noop ? undefined : [...acceptMatchers], acceptMatchers.size, listeners.accept.size);

    if(exts.size) {
        // handle file and ftp(s)
        browser.webNavigation.onBeforeNavigate.addListener(listeners.webNavigation.onBeforeNavigate, {
            url: [{
                urlMatches: `^(?:file|ftps?)://.+\.(?:${Array.from(exts.keys()).join('|')})$`
            }]
        });
    } else {
        browser.webNavigation.onBeforeNavigate.removeListener(listeners.webNavigation.onBeforeNavigate);
    }

    if(mimes.size || exts.size) {
        // handle http(s)
        browser.webRequest.onHeadersReceived.addListener(listeners.webRequest.onHeadersReceived, {
            urls: ['<all_urls>'],
            types: ['main_frame']
        }, [
            'blocking',
            'responseHeaders'
        ]);

        // inject content script
        browser.webNavigation.onCommitted.addListener(listeners.webNavigation.onCommitted);
    } else {
        browser.webRequest.onHeadersReceived.removeListener(listeners.webRequest.onHeadersReceived);
        browser.webNavigation.onCommitted.removeListener(listeners.webNavigation.onCommitted);
    }

    if(acceptMatchers.size || mimes.size || exts.size) { // cleanup
        browser.webRequest.onErrorOccurred.addListener(listeners.webRequest.onErrorOccurred, {
            urls: ['<all_urls>'],
            types: ['main_frame']
        });

        browser.tabs.onRemoved.addListener(listeners.tabs.onRemoved);
    } else {
        browser.webRequest.onErrorOccurred.removeListener(listeners.webRequest.onErrorOccurred);
        browser.tabs.onRemoved.removeListener(listeners.tabs.onRemoved);
    }
}

defaults.then(config => {
    browser.storage.onChanged.addListener(listeners.storage.onChanged);

    // pretend everything changed to kick all other necessary listeners into life
    listeners.storage.onChanged({
        mimetypes: {newValue: config.mimetypes},
        extensions: {newValue: config.extensions},
        accept: {newValue: config.accept}
    }, 'local');

    log('background.js started', window.location);
});
}
