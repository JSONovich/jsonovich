/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions, browser */
/* global configInit:false, defaultConfig:false, log:false, ts:false, valid:false */
'use strict';

{
ts.options = Date.now();

const l = msg => browser.i18n.getMessage(msg) || `\u25BA${msg}\u25C4`;
const config = {};
const nodes = {};

/**
 * Reports an error to the user.
 *
 * @param err Error The original error object.
 * @param msg string Localisation lookup key.
 */
function userError(err, msg) {
    log(err.toString() + '\n' + err.stack);
    msg; // TODO: use this to present a localised message in the page
}

/**
 * Destructively write a new configuration. The existing configuration will be completely wiped first.
 *
 * @param newConfig Object The new configuration.
 */
function replaceConfig(newConfig) {
    browser.storage.local.clear().then(() => browser.storage.local.set(newConfig)).catch(e => userError(e, 'error.misc'));
}

/**
 * Update preferences associated with the current grid selection to the given value.
 *
 * @param grid HTMLElement Reference to the root node of the grid.
 * @param value string|falsy The value to set, or falsy to delete the existing value.
 */
function bulkModifyConfig(grid, value) {
    const type = grid.dataset.type;
    const prefChanges = {};
    let changed = false;
    for(const selected of grid.querySelectorAll('label[data-pref][data-key] input[type=checkbox]:not([id]):checked')) {
        const row = selected.closest('label[data-pref][data-key]');
        const pref = row.dataset.pref;
        const key = row.dataset.key;
        if(!(pref in valid.schema)
            || (value && key in config[pref] && config[pref][key] === value)
            || (value && !valid.entry(type, value)))
            continue;
        if(!(pref in prefChanges))
            prefChanges[pref] = Object.assign({}, config[pref]);
        if(value)
            prefChanges[pref][key] = value;
        else
            delete prefChanges[pref][key];
        changed = true;
    }
    if(changed)
        browser.storage.local.set(prefChanges);
}

const events = {
    click: {
        /**
         * Exports the current configuration to a file the user can download.
         */
        '#btn-export': () => {
            const blob = new Blob([JSON.stringify(config, null, '\t')], {type: 'application/json', endings: 'native'});
            const url = URL.createObjectURL(blob);
            const a = document.getElementById('link-export');
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        },

        /**
         * Triggers a file upload dialog where the user can select a configuration file to load.
         */
        '#btn-import': () => document.getElementById('file-import').click(),

        /**
         * Immediately restores the fresh-install default configuration.
         */
        '#btn-reset': () => replaceConfig(defaultConfig),

        /**
         * Immediately adds the new entry to the configuration.
         * Detects the appropriate preference by matching against the user's input.
         */
        '.grid[data-type] button[name=add]': node => {
            const row = node.closest('footer > div');
            if(!row)
                return;
            const grid = row.closest('.grid[data-type]');
            const type = grid.dataset.type;
            const kNode = row.querySelector('input[data-input=key][data-name=add]');
            const vNode = row.querySelector('[data-input=value][data-name=add] input[type=radio]:checked');
            if(!(kNode && vNode))
                return;
            const key = kNode.value;
            const value = valid.expect[type] && valid.expect[type].choice && valid.expect[type].choice[vNode.value];
            if(!(key && value))
                return;
            const entry = {[key]: value}
            for(const pref in valid.schema) {
                const schema = valid.schema[pref];
                if(typeof schema !== 'object' || schema.v !== type || !schema.k
                    || (typeof config[pref] === 'object' && key in config[pref] && config[pref][key] === value)
                    || !valid.entry(schema, entry))
                    continue;
                browser.storage.local.set({[pref]: Object.assign({}, config[pref], entry)});
                kNode.value = '';
                const defaultChoice = valid.expect[type] && valid.expect[type].choice && valid.expect[type].choice.length;
                if(defaultChoice) {
                    const defaultRadio = row.querySelector('[data-input=value][data-name=add] input[type=radio]' + (defaultChoice ? '[value="0"]' : ':checked'));
                    if(defaultRadio)
                        defaultRadio.checked = defaultChoice;
                }
            }
        },

        /**
         * Immediately removes the currently selected preference(s) from the configuration.
         */
        '.grid[data-type] button[name=remove]': node => {
            bulkModifyConfig(node.closest('.grid[data-type]'), null);
        }
    },
    keyup: {
        'input[data-name]': (node, ev) => {
            if(!ev || ev.key != 'Enter')
                return;
            const row = node.closest('footer > div');
            if(!row)
                return;
            const btn = row.querySelector('button[name=' + node.dataset.name + ']');
            if(btn)
                btn.click();
        }
    },
    change: {
        /**
         * Immediately updates the relevant boolean preference with the value of the given checkbox.
         */
        'input[type=checkbox][id]': node => {
            const pref = node.id;
            if(pref in config && typeof config[pref] === 'boolean')
                browser.storage.local.set({[pref]: node.checked});
        },

        /**
         * Updates parts of grid UI triggered by checkboxes.
         */
        '.grid input[type=checkbox]:not([id])': node => {
            const row = node.closest('.grid header, .grid label');
            if(!row)
                return;
            const grid = row.closest('.grid');
            const pref = row.nodeName == 'HEADER' ? row.id : row.dataset.pref;
            switch(row.nodeName) {
                case 'HEADER': {
                    for(const box of grid.querySelectorAll('label[data-pref=' + pref + '] input[type=checkbox]:not([id])' + (node.checked ? ':not(:checked)' : ':checked'))) {
                        box.checked = node.checked;
                    }
                    break;
                }
                case 'LABEL': {
                    const selectAll = nodes[pref].querySelector('input[type=checkbox]:not([id])');
                    selectAll.checked = grid.querySelector('label[data-pref=' + pref + '] input[type=checkbox]:not([id]):checked');
                    selectAll.indeterminate = selectAll.checked && grid.querySelector('label[data-pref=' + pref + '] input[type=checkbox]:not([id]):not(:checked)');
                    break;
                }
            }
            const footers = grid.querySelectorAll('footer > div');
            if(footers.length < 2)
                return;
            const isAnyBoxChecked = Boolean(grid.querySelector('label input[type=checkbox]:not([id]):checked'));
            const isEditFormActive = Boolean(footers[0].querySelector('button[name=remove]'));
            if(isAnyBoxChecked != isEditFormActive)
                footers[0].before(footers[1]);
            for(const radio of grid.querySelectorAll('[data-input=value][data-name=edit] input[type=radio]')) {
                radio.checked = false; // reset edit radios every time selection changes
            }
        },

        /**
         * Immediately updates the currently selected preference(s) with the value of this radio button.
         */
        '.grid[data-type] [data-input=value][data-name=edit] input[type=radio]:checked': node => {
            bulkModifyConfig(node.closest('.grid[data-type]'), node.value);
        },

        /**
         * Imports a new configuration from the file the user just uploaded.
         */
        '#file-import': node => {
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const newConfig = JSON.parse(ev.target.result);
                    valid.config(newConfig);
                    replaceConfig(newConfig);
                } catch(e) {
                    userError(e, 'error.invalid.import');
                }
            };
            reader.readAsText(node.files[0]);
        }
    }
};

/**
 * Delegates UI events to the relevant handler by matching the target with a selector.
 *
 * @param ev Event The event object.
 */
function onUIEvent(ev) {
    const handlers = events[ev.type];
    if(!handlers)
        return; // should never happen?
    const node = ev.target;
    if(node.id) {
        const handler = handlers['#' + node.id];
        if(handler) // avoids loop
            return handler(node, ev);
    }
    for(const selector in handlers) {
        if(selector[0] !== '#' && node.matches(selector))
            return handlers[selector](node, ev);
    }
}

/**
 * Update UI when user preferences change.
 *
 * @param changes storage.StorageChange An object representing a change to a storage area.
 * @param areaName storage.StorageArea An object representing a storage area.
 */
function onPrefChanged(changes, areaName) {
    if(areaName != 'local')
        return;

    for(const pref in changes) {
        const change = changes[pref];

        if(!(pref in valid.schema)) {
            log(`Unknown ${pref} preference change ignored.`);
            continue;
        }
        const schema = valid.schema[pref];

        if(!valid.entry(schema, change.newValue)) {
            log(`Invalid ${pref} preference change ignored.`);
            continue;
        }
        config[pref] = change.newValue;

        const node = nodes[pref];
        if(node) {
            switch(typeof schema) {
                case 'boolean': {
                    if(node.nodeName == 'INPUT' && node.type == 'checkbox') {
                        node.checked = change.newValue;
                        continue;
                    }
                    break;
                }
                case 'object': {
                    if(node.nodeName == 'HEADER' && nodes['tpl-grid-head-' + schema.k]) {
                        const frag = document.createDocumentFragment();
                        const tpl = nodes['tpl-grid-row'];
                        for(const k in change.newValue) {
                            const row = tpl.cloneNode(true);
                            const label = row.querySelector('label');
                            label.dataset.pref = pref;
                            label.dataset.key = k;
                            label.children[1].textContent = k;
                            label.children[2].textContent = valid.expect[schema.v].choice && !valid.expect[schema.v].obj ? change.newValue[k] : JSON.stringify(change.newValue[k]);
                            frag.appendChild(row);
                        }
                        const selectAll = node.querySelector('input[type=checkbox]:not([id])');
                        if(selectAll && selectAll.checked)
                            selectAll.click(); // deselect all to restore correct footer
                        for(const n of node.parentNode.querySelectorAll('label[data-pref=' + pref + ']')) {
                            n.remove();
                        }
                        node.classList.toggle('empty', !frag.childElementCount);
                        node.after(frag);
                        continue;
                    }
                    break;
                }
            }
        }
        log(`Unable to display ${typeof change.newValue} preference "${pref}" in ${node ? node.nodeName : 'null'} node.`);
    }
}

/**
 * Translate the contents of textual nodes and attributes below a given root.
 *
 * @param root HTMLElement The ancestor node of all translatable nodes.
 */
function localise(root) {
    for(const node of root.querySelectorAll('input,button,label,summary,aside,span,p,a,th')) {
        const props = ['title', 'placeholder'];
        if(!node.childElementCount)
            props.push('textContent');
        for(const prop of props) {
            if(node[prop])
                node[prop] = l(node[prop]);
        }
    }
}

/**
 * Insert templated but static parts of grids.
 */
function generateTemplatedUI() {
    for(const grid of document.querySelectorAll('.grid[data-type]')) {
        const type = grid.dataset.type;
        const gridFrag = nodes['tpl-grid'].cloneNode(true);
        const main = gridFrag.querySelector('main');
        const inputAddMatch = gridFrag.querySelector('footer input[data-input=key][data-name=add]');
        inputAddMatch.placeholder = l('placeholder.match.' + type);

        for(const pref in valid.schema) {
            const schema = valid.schema[pref];
            if(nodes[pref] || typeof schema !== 'object' || schema.v !== type || !schema.k)
                continue;
            if(valid.expect[schema.k]) {
                if(valid.expect[schema.k].regex)
                    inputAddMatch.pattern = (inputAddMatch.pattern ? inputAddMatch.pattern + '|' : '') + valid.expect[schema.k].regex.source;
                if(valid.expect[schema.k].maxLen)
                    inputAddMatch.maxLength = Math.max(inputAddMatch.maxLength || 0, valid.expect[schema.k].maxLen);
            }
            const frag = nodes['tpl-grid-head'].cloneNode(true);
            const header = frag.querySelector('header');
            header.id = pref;
            for(const col of [schema.k, schema.v]) {
                if(nodes['tpl-grid-head-' + col])
                    header.appendChild(nodes['tpl-grid-head-' + col].cloneNode(true));
            }
            main.appendChild(frag);
            nodes[pref] = header;
        }

        if(valid.expect[type].choice) {
            const inputsFrag = document.createDocumentFragment();
            for(let [k, choice] of valid.expect[type].choice.entries()) {
                if(valid.expect[type].obj)
                    choice = JSON.stringify(choice);
                const radio = document.createElement('input');
                const label = document.createElement('label');
                radio.type = 'radio'; // using radio because select was very buggy in nightly58's inline options, revisit this when more than 2 choices wastes too much screen space
                radio.value = k;
                label.textContent = choice;
                label.prepend(radio);
                inputsFrag.appendChild(label);
            }
            for(const parent of gridFrag.querySelectorAll('[data-input=value][data-name]')) {
                const name = parent.dataset.name + '-' + type;
                const checkedValue = parent.dataset.name == 'add' ? '0' : null;
                const inputs = inputsFrag.cloneNode(true);
                for(const radio of inputs.querySelectorAll('input[type=radio]')) {
                    radio.name = name;
                    radio.checked = radio.value === checkedValue;
                }
                parent.classList.add('radio');
                parent.appendChild(inputs);
            }
        }
        grid.appendChild(gridFrag);
    }
}

/**
 * Promise that resolves once the DOM is ready.
 */
const ready = new Promise((resolve) => {
    if(document.readyState !== 'loading')
        resolve();
    else
        document.addEventListener('readystatechange', resolve, {capture: true, once: true, passive: true});
});

ready.then(() => { // l10n and event delegation (neither depend on config)
    localise(document);

    for(const node of document.querySelectorAll('template[id]')) {
        nodes[node.id] = node.content;
        localise(node.content);
    }

    generateTemplatedUI();

    for(const ev in events) {
        document.body.addEventListener(ev, onUIEvent, false);
    }
});

Promise.all([configInit, ready]).then(([initialConfig]) => {
    log(initialConfig);
    for(const pref in initialConfig) {
        nodes[pref] = document.getElementById(pref);
        initialConfig[pref] = {newValue: initialConfig[pref]};
    }

    browser.storage.onChanged.addListener(onPrefChanged);
    onPrefChanged(initialConfig, 'local');

    log('options.js started', Date.now() - ts.options);
});
}
