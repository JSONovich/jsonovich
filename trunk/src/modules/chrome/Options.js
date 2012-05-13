/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Adds custom logic to the buttons on our options dialog.
 *
 * Changelog:
 * [2011-08] - Created options observer
 */

'use strict';

XPCOMUtils.defineLazyGetter(this, 'l', function() {
    return require('l10n').bundle('options');
});
XPCOMUtils.defineLazyGetter(this, 'valid', function() {
    return require('validate');
});

var prefNameConv = 'mime.conversions',
prefNameExt = 'mime.extensionMap',
events = {},
observer = {
    observe: function(aSubject, aTopic, aData) {
        if(aTopic != 'addon-options-displayed' || aData != ADDON_LNAME + '@' + ADDON_DOMAIN) {
            return;
        }
        [].forEach.call(aSubject.querySelectorAll('setting,setting button,.preferences-description'), function(node) {
            ['title', 'desc', 'label'].forEach(function(attr) {
                var t = node.getAttribute(attr);
                if(t) {
                    node.setAttribute(attr, l(t));
                }
            });
            if(node.textContent) {
                node.textContent = l(node.textContent);
            }
        });
        for(var k in events) {
            aSubject.getElementById(k).addEventListener('click', events[k], false);
        }
    }
},
observing = false,
prefs = require('prefs').branch,
prefBranch = null,

clearPrefs = exports.clear = function clearPrefs() {
    prefs(ADDON_PREFROOT, true).uninstall();
    prefs(ADDON_PREFROOT + '@' + ADDON_DOMAIN, true).uninstall();
};

function resetPrefs() {
    clearPrefs();
    require('chrome/DefaultPrefs').set(prefs(ADDON_PREFROOT, true).set);
}
events[ADDON_LNAME + '-pref-reset'] = resetPrefs;

function promptAdd(options) {
    var textbox = {}, checkbox = {};
    if(typeof options.textbox !== 'undefined') {
        textbox.value = options.textbox;
    }
    if(typeof options.checkbox !== 'undefined') {
        checkbox.value = options.checkbox;
    }
    while(Services.prompt.prompt(null, l('prompt.add.' + options.type + '.title'), l('prompt.add.' + options.type + '.text', options.msgParams ? options.msgParams : null), textbox, options.checkbox ? l('prompt.add.' + options.type + '.checkbox') : null, checkbox)) {
        if(options.test && !options.test(textbox.value)) {
            Services.prompt.alert(null, l('error.invalid.' + (options.testType ? options.testType : options.type) + '.title'), l('error.invalid.' + (options.invalidType ? options.invalidType : options.type) + '.text', options.invalidMsgParams ? options.invalidMsgParams : null));
            continue;
        }
        if(options.onOk && options.onOk(textbox.value, checkbox.value)) {
            continue;
        } else {
            return true;
        }
    }
    if(options.onCancel) {
        options.onCancel();
    }
    return false;
}

function promptRemove(options) {
    var selected = {};
    if(!options.choices.length || (options.choices.length == 1 && !options.choices[0].length)) {
        Services.prompt.alert(null, l('error.none.' + options.type + '.title'), l('error.none.' + options.type + '.text'));
        return false;
    } else if(Services.prompt.select(null, l('prompt.remove.' + options.type + '.title'), l('prompt.remove.' + options.type + '.text'), options.choices.length, options.choices, selected)) {
        if(options.onOk) {
            options.onOk(selected.value);
        }
        return true;
    }
    if(options.onCancel) {
        options.onCancel();
    }
    return false;
}

function addAccept() {
    promptAdd({
        type: 'host',
        checkbox: !prefBranch.get('acceptHeader.json', 'boolean'),
        test: valid.host,
        invalidMsgParams: valid.host.maxLen,
        onOk: function(host, checked) {
            var q = 0;
            if(checked && !promptAdd({
                type: 'q',
                textbox: '1',
                test: valid.q,
                onOk: function(textbox) {
                    q = parseFloat(textbox); // silently allow 0 here even though user could have just unticked box on 1st prompt
                }
            })) {
                return true; // q-value prompt cancelled, go back to host prompt
            }
            prefBranch.set('acceptHeaderOverride.json.' + host, 'string-ascii', q);
        }
    });
}
events[ADDON_LNAME + '-pref-host-add'] = addAccept;

function removeAccept() {
    var overrideBranch = prefs(ADDON_PREFROOT + '.acceptHeaderOverride.json'),
    overrideHosts = overrideBranch.getChildList(),
    overrides = [];
    for(let i = 0; i < overrideHosts.length; i++) {
        overrides.push('[q=' + overrideBranch.get(overrideHosts[i], 'string-ascii') + ']: ' + overrideHosts[i]);
    }
    promptRemove({
        type: 'host',
        choices: overrides,
        onOk: function(sel) {
            overrideBranch.unset(overrideHosts[sel]);
        }
    });
}
events[ADDON_LNAME + '-pref-host-remove'] = removeAccept;

function addMime() {
    promptAdd({
        type: 'mime',
        test: valid.mime,
        invalidMsgParams: valid.mime.maxLen,
        onOk: function(mime) {
            var conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|');
            mime = mime.toLowerCase();
            if(conversions.indexOf(mime) !== -1) {
                Services.prompt.alert(null, l('error.already.mime.title'), l('error.already.mime.text'));
                return true;
            }
            conversions.push(mime);
            prefBranch.set(prefNameConv, 'string-ascii', conversions.join('|'));
        }
    });
}
events[ADDON_LNAME + '-pref-mime-add'] = addMime;

function removeMime() {
    var conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|');
    promptRemove({
        type: 'mime',
        choices: conversions,
        onOk: function(sel) {
            conversions.splice(sel, 1);
            prefBranch.set(prefNameConv, 'string-ascii', conversions.join('|'));
        }
    });
}
events[ADDON_LNAME + '-pref-mime-remove'] = removeMime;

function addExtMap() {
    promptAdd({
        type: 'fileExt',
        test: valid.fileExt,
        invalidMsgParams: valid.fileExt.maxLen,
        onOk: function(ext) {
            var extensions = [], mappings = (prefBranch.get(prefNameExt, 'string-ascii') || '').split('|');
            mappings.map(function(v) {
                extensions.push(v.split(':')[0]);
            });
            ext = ext.toLowerCase();
            if(extensions.indexOf(ext) !== -1) {
                Services.prompt.alert(null, l('error.already.fileExt.title'), l('error.already.fileExt.text'));
                return true;
            }
            return !promptAdd({
                type: 'mapping',
                msgParams: ext,
                test: valid.mime,
                testType: 'mime',
                invalidMsgParams: valid.mime.maxLen,
                onOk: function(mime) {
                    var conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|');
                    mime = mime.toLowerCase();
                    if(conversions.indexOf(mime) === -1) {
                        Services.prompt.alert(null, l('error.invalid.mapping.title'), l('error.invalid.mapping.text'));
                        return true;
                    } else if(mappings.indexOf(ext + ':' + mime) !== -1) {
                        Services.prompt.alert(null, l('error.already.mapping.title'), l('error.already.mapping.text'));
                        return true;
                    }
                    mappings.push(ext + ':' + mime);
                    prefBranch.set(prefNameExt, 'string-ascii', mappings.join('|'));
                }
            });
        }
    });
}
events[ADDON_LNAME + '-pref-fileExt-add'] = addExtMap;

function removeExtMap() {
    var mappings = (prefBranch.get(prefNameExt, 'string-ascii') || '').split('|');
    promptRemove({
        type: 'mapping',
        choices: mappings,
        onOk: function(sel) {
            mappings.splice(sel, 1);
            prefBranch.set(prefNameExt, 'string-ascii', mappings.join('|'));
        }
    });
}
events[ADDON_LNAME + '-pref-fileExt-remove'] = removeExtMap;

/**
 * Dynamically add functionality to buttons on inline options
 *
 * @param branch <object>  Reference to the branch object for the appropriate preferences,
 *                         require('prefs').branch(<branch>) - optional, provide it if
 *                         you're already using the branch to save mem.
 */
exports.observe = function observeOptions(branch) {
    prefBranch = branch || prefs(ADDON_PREFROOT);
    if(observing) {
        return;
    }
    Services.obs.addObserver(observer, 'addon-options-displayed', false);
    observing = true;
    require('unload').unload(function(){
        Services.obs.removeObserver(observer, 'addon-options-displayed');
        prefBranch = null;
        observing = false;
    });
};
