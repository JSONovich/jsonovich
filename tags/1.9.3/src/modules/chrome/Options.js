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

var prefNameConv = 'mime.conversions',
prefNameExt = 'mime.extensionMap',
events = {},
observer = {
    observe: function(aSubject, aTopic, aData) {
        if(aTopic != 'addon-options-displayed' || aData != ADDON_LNAME + '@' + ADDON_DOMAIN) {
            return;
        }
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

XPCOMUtils.defineLazyGetter(this, 'valid', function() {
    return require('validate');
});

function addAccept() {
    var host = {}, mode = {
        value: !prefBranch.get('acceptHeader.json', 'boolean')
    };
    while(Services.prompt.prompt(null, 'Add host override', 'Enter a valid host name for which the default HTTP Accept setting should be overridden:', host, 'Send "application/json" in the HTTP Accept header for this host', mode)) {
        if(!valid.host(host.value)) {
            Services.prompt.alert(null, 'Bad host', "The specified host name didn't look right." + valid.explainHost);
            continue;
        }
        if(mode.value) {
            let q = {
                value: '1'
            };
            while(Services.prompt.prompt(null, 'Specify q-value', 'Enter the quality factor to attach to the JSON MIME type in the Accept header:', q, null, {})) {
                if(valid.q(q.value)) {
                    q = parseFloat(q.value); // silently allow 0 here even though user could have just unticked box on 1st prompt
                    break;
                }
                Services.prompt.alert(null, 'Bad q-value', "The specified quality factor didn't look right." + valid.explainQ);
            }
            if(typeof q === 'object') {
                continue; // q-value prompt cancelled, go back to host prompt
            } else {
                mode = q;
            }
        } else {
            mode = 0;
        }
        prefBranch.set('acceptHeaderOverride.json.' + host.value, 'string-ascii', mode);
        return;
    }
}
events[ADDON_LNAME + '-pref-accept-add'] = addAccept;

function removeAccept() {
    var overrideBranch = prefs(ADDON_PREFROOT + '.acceptHeaderOverride.json'),
    overrideHosts = overrideBranch.getChildList(),
    overrides = [], selected = {};
    for(let i = 0; i < overrideHosts.length; i++) {
        overrides.push('[q=' + overrideBranch.get(overrideHosts[i], 'string-ascii') + ']: ' + overrideHosts[i]);
    }
    if(overrides.length == 0) {
        Services.prompt.alert(null, 'Remove host override', 'No host names are currently set to override the default HTTP Accept header setting.');
    } else if(Services.prompt.select(null, 'Remove host override', 'Select 1 host name that should no longer override the default HTTP Accept header setting:', overrides.length, overrides, selected)) {
        overrideBranch.unset(overrideHosts[selected.value]);
    }
}
events[ADDON_LNAME + '-pref-accept-rem'] = removeAccept;

function addMime() {
    var mime = {};
    while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should intercept:', mime, null, {})) {
        if(!valid.mime(mime.value)) {
            Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right. " + valid.explainMime);
            continue;
        }
        let conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|');
        mime.value = mime.value.toLowerCase();
        if(conversions.indexOf(mime.value) !== -1) {
            Services.prompt.alert(null, 'Bad MIME type', 'The specified MIME type is already intercepted by ' + ADDON_NAME + '.');
        } else {
            conversions.push(mime.value);
            prefBranch.set(prefNameConv, 'string-ascii', conversions.join('|'));
            return;
        }
    }
}
events[ADDON_LNAME + '-pref-mime-add'] = addMime;

function removeMime() {
    var conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|'), selected = {};
    if(conversions.length == 1 && conversions[0].length == 0) {
        Services.prompt.alert(null, 'Remove MIME type', 'No MIME types are currently set to be intercepted.');
    } else if(Services.prompt.select(null, 'Remove MIME type', 'Select 1 MIME type that ' + ADDON_NAME + ' should no longer intercept:', conversions.length, conversions, selected)) {
        conversions.splice(selected.value, 1);
        prefBranch.set(prefNameConv, 'string-ascii', conversions.join('|'));
    }
}
events[ADDON_LNAME + '-pref-mime-rem'] = removeMime;

function addExtMap() {
    var ext = {}, mime = {};
    while(Services.prompt.prompt(null, 'Add file extension', 'Enter a valid file extension that ' + ADDON_NAME + ' should handle:', ext, null, {})) {
        if(!valid.fileExt(ext.value)) {
            Services.prompt.alert(null, 'Bad file extension', "The specified file extension didn't look right." + valid.explainFileExt);
            continue;
        }
        let extensions = [], mappings = (prefBranch.get(prefNameExt, 'string-ascii') || '').split('|');
        mappings.map(function(v) {
            extensions.push(v.split(':')[0]);
        });
        ext.value = ext.value.toLowerCase();
        if(extensions.indexOf(ext.value) !== -1) {
            Services.prompt.alert(null, 'Bad file extension', 'The specified file extension is already handled by ' + ADDON_NAME + '.');
        } else {
            while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should map to the "' + ext.value + '" extension:', mime, null, {})) {
                if(!valid.mime(mime.value)) {
                    Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right." + valid.explainMime);
                    continue;
                }
                let conversions = (prefBranch.get(prefNameConv, 'string-ascii') || '').split('|');
                mime.value = mime.value.toLowerCase();
                if(conversions.indexOf(mime.value) === -1) {
                    Services.prompt.alert(null, 'Bad MIME type', 'The specified MIME type is not intercepted by ' + ADDON_NAME + '.');
                } else if(mappings.indexOf(ext.value + ':' + mime.value) !== -1) {
                    Services.prompt.alert(null, 'Bad MIME type', 'The specified file extension to MIME type mapping already exists.');
                } else {
                    mappings.push(ext.value + ':' + mime.value);
                    prefBranch.set(prefNameExt, 'string-ascii', mappings.join('|'));
                    return;
                }
            }
        }
    }
}
events[ADDON_LNAME + '-pref-ext-add'] = addExtMap;

function removeExtMap() {
    var mappings = (prefBranch.get(prefNameExt, 'string-ascii') || '').split('|'), selected = {};
    if(mappings.length == 1 && mappings[0].length == 0) {
        Services.prompt.alert(null, 'Remove file extension mapping', 'No mappings from file extensions to MIME types currently exist.');
    } else if(Services.prompt.select(null, 'Remove file extension mapping', 'Select 1 file extension mapping that ' + ADDON_NAME + ' should remove:', mappings.length, mappings, selected)) {
        mappings.splice(selected.value, 1);
        prefBranch.set(prefNameExt, 'string-ascii', mappings.join('|'));
    }
}
events[ADDON_LNAME + '-pref-ext-rem'] = removeExtMap;

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
