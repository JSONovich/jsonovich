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

var observer = {
    observe: function(aSubject, aTopic, aData) {
        if(aTopic == 'addon-options-displayed' && aData == ADDON_LNAME + '@' + ADDON_DOMAIN) {
            aSubject.getElementById(ADDON_LNAME + '-pref-reset').addEventListener('click', resetPrefs, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-accept-add').addEventListener('click', addAccept, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-accept-rem').addEventListener('click', removeAccept, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-mime-add').addEventListener('click', addMime, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-mime-rem').addEventListener('click', removeMime, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-ext-add').addEventListener('click', addExtMap, false);
            aSubject.getElementById(ADDON_LNAME + '-pref-ext-rem').addEventListener('click', removeExtMap, false);
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

XPCOMUtils.defineLazyGetter(this, 'valid', function() {
    return require('validate');
});

function addAccept() {
    var host = {}, mode = {
        value: !prefBranch.get('acceptHeader.json', 'boolean')
    };
    while(Services.prompt.prompt(null, 'Add host override', 'Enter a valid host name for which the default HTTP Accept setting should be overridden:', host, 'Send "application/json" in the HTTP Accept header for this host', mode)) {
        if(!valid.host(host.value)) {
            Services.prompt.alert(null, 'Bad host', "The specified host name didn't look right.");
            continue;
        }
        if(mode.value) {
            let q = {
                value: '1'
            };
            while(Services.prompt.prompt(null, 'Specify q-value', 'Enter the quality factor to attach to the JSON MIME type in the Accept header (greater than 0, up to and including 1, no more than 3 decimal digits):', q, null, {})) {
                if(valid.q(q.value)) {
                    q = parseFloat(q.value); // silently allow 0 here even though user could have just unticked box on 1st prompt
                    break;
                }
                Services.prompt.alert(null, 'Bad q-value', "The specified quality factor didn't look right.");
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

function addMime() {
    var mime = {};
    while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should intercept (only the application/ and text/ types are allowed):', mime, null, {})) {
        if(!valid.mime(mime.value)) {
            Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right.");
            continue;
        }
        var conversions = prefBranch.get('mime.conversions', 'string-ascii').split('|');
        mime.value = mime.value.toLowerCase();
        if(conversions.indexOf(mime.value) !== -1) {
            Services.prompt.alert(null, 'Bad MIME type', 'The specified MIME type is already intercepted by ' + ADDON_NAME + '.');
        } else {
            conversions.push(mime.value);
            prefBranch.set('mime.conversions', 'string-ascii', conversions.join('|'));
            return;
        }
    }
}

function removeMime() {
    var conversions = prefBranch.get('mime.conversions', 'string-ascii').split('|'), selected = {};
    if(conversions.length == 1 && conversions[0].length == 0) {
        Services.prompt.alert(null, 'Remove MIME type', 'No MIME types are currently set to be intercepted.');
    } else if(Services.prompt.select(null, 'Remove MIME type', 'Select 1 MIME type that ' + ADDON_NAME + ' should no longer intercept:', conversions.length, conversions, selected)) {
        conversions.splice(selected.value, 1);
        prefBranch.set('mime.conversions', 'string-ascii', conversions.join('|'));
    }
}

function addExtMap() {
    var ext = {}, mime = {};
    while(Services.prompt.prompt(null, 'Add file extension', 'Enter a valid file extension that ' + ADDON_NAME + ' should handle:', ext, null, {})) {
        if(!valid.fileExt(ext.value)) {
            Services.prompt.alert(null, 'Bad file extension', "The specified file extension didn't look right.");
            continue;
        }
        var extensions = [], mappings = prefBranch.get('mime.extensionMap', 'string-ascii').split('|');
        mappings.map(function(v) {
            extensions.push(v.split(':')[0]);
        });
        ext.value = ext.value.toLowerCase();
        if(extensions.indexOf(ext.value) !== -1) {
            Services.prompt.alert(null, 'Bad file extension', 'The specified file extension is already handled by ' + ADDON_NAME + '.');
        } else {
            while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should map to the "' + ext.value + '" extension:', mime, null, {})) {
                if(!valid.mime(mime.value)) {
                    Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right.");
                    continue;
                }
                var conversions = prefBranch.get('mime.conversions', 'string-ascii').split('|');
                mime.value = mime.value.toLowerCase();
                if(conversions.indexOf(mime.value) === -1) {
                    Services.prompt.alert(null, 'Bad MIME type', 'The specified MIME type is not intercepted by ' + ADDON_NAME + '.');
                } else if(mappings.indexOf(ext.value + ':' + mime.value) !== -1) {
                    Services.prompt.alert(null, 'Bad MIME type', 'The specified file extension to MIME type mapping already exists.');
                } else {
                    mappings.push(ext.value + ':' + mime.value);
                    prefBranch.set('mime.extensionMap', 'string-ascii', mappings.join('|'));
                    return;
                }
            }
        }
    }
}

function removeExtMap() {
    var mappings = prefBranch.get('mime.extensionMap', 'string-ascii').split('|'), selected = {};
    if(mappings.length == 1 && mappings[0].length == 0) {
        Services.prompt.alert(null, 'Remove file extension mapping', 'No mappings from file extensions to MIME types currently exist.');
    } else if(Services.prompt.select(null, 'Remove file extension mapping', 'Select 1 file extension mapping that ' + ADDON_NAME + ' should remove:', mappings.length, mappings, selected)) {
        mappings.splice(selected.value, 1);
        prefBranch.set('mime.extensionMap', 'string-ascii', mappings.join('|'));
    }
}

/**
 * Dynamically add functionality to buttons on inline options
 *
 * @param branch <object>  Reference to the branch object for the appropriate preferences,
 *                         require('prefs').branch(<branch>) - optional, provide it if
 *                         you're already using the branch to save mem.
 */
exports.observe = function observeOptions(branch) {
    if(!observing) {
        prefBranch = branch || prefs(ADDON_PREFROOT);
        Services.obs.addObserver(observer, 'addon-options-displayed', false);
        observing = true;
        require('unload').unload(function(){
            Services.obs.removeObserver(observer, 'addon-options-displayed');
            prefBranch = null;
            observing = false;
        });
    }
};
