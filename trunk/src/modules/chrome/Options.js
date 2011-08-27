/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Adds custom logic to the buttons on our options dialog.
 *
 * Changelog:
 * [2011-08] - Created options observer
 */

(function() {
    'use strict';

    var lazy = {},
    observer = {
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
    prefBaseName = 'extensions.' + ADDON_LNAME,
    prefs = require('prefs').branch,
    prefBranch = prefs(prefBaseName),

    clearPrefs = exports.clear = function clearPrefs() {
        prefs(prefBaseName, true).uninstall();
        prefs(prefBaseName + '@' + ADDON_DOMAIN, true).uninstall();
        Services.contentPrefs.removePrefsByName(prefBaseName + '.acceptHeader.json');
    };

    function resetPrefs() {
        clearPrefs();
        require('chrome/DefaultPrefs').set(require('prefs').branch(prefBaseName, true).set, prefBaseName);
    }

    XPCOMUtils.defineLazyServiceGetter(lazy, "idnService", "@mozilla.org/network/idn-service;1", "nsIIDNService");
    function addAccept() {
        var host = {}, mode = {
            value: !prefBranch.get('acceptHeader.json', 'boolean')
        };
        while(Services.prompt.prompt(null, 'Add host override', 'Enter a valid host name for which the default HTTP Accept setting should be overridden:', host, 'Send "application/json" in the HTTP Accept header for this host', mode)) {
            try {
                host = lazy.idnService.normalize(host.value);
            } catch(e) {
                require('log').error(e);
                Services.prompt.alert(null, 'Bad host', "The specified host name didn't look right.");
                continue;
            }
            Services.contentPrefs.setPref(host, prefBaseName + '.acceptHeader.json', mode.value);
            return;
        }
    }

    function removeAccept() {
        var overrides = [], overrideHosts = [], overridesEnum = Services.contentPrefs.getPrefsByName(prefBaseName + '.acceptHeader.json').enumerator, selected = {};
        while(overridesEnum.hasMoreElements()) {
            let property = overridesEnum.getNext().QueryInterface(Components.interfaces.nsIProperty);
            overrides.push('[' + (property.value ? 'send' : "don't send") + ']: ' + property.name);
            overrideHosts.push(property.name);
        }
        if(overrides.length == 0) {
            Services.prompt.alert(null, 'Remove host override', 'No host names are currently set to override the default HTTP Accept header setting.');
        } else if(Services.prompt.select(null, 'Remove host override', 'Select 1 host name that should no longer override the default HTTP Accept header setting:', overrides.length, overrides, selected)) {
            Services.contentPrefs.removePref(overrideHosts[selected.value], prefBaseName + '.acceptHeader.json');
        }
    }

    function addMime() {
        var mime = {};
        while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should intercept (only the application/ and text/ types are allowed):', mime, null, {})) {
            if(mime.value.length > 80 || (mime.value.lastIndexOf('application/') !== 0 && mime.value.lastIndexOf('text/') !== 0) || mime.value.split('/').length !== 2 || mime.value.indexOf('json', 5) === -1) {
                Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right.");
            } else {
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
            if(ext.value.length > 10 || ext.value.indexOf('/') !== -1 || ext.value.indexOf('.') !== -1) {
                Services.prompt.alert(null, 'Bad file extension', "The specified file extension didn't look right.");
            } else {
                var extensions = [], mappings = prefBranch.get('mime.extensionMap', 'string-ascii').split('|');
                mappings.map(function(v) {
                    extensions.push(v.split(':')[0]);
                });
                ext.value = ext.value.toLowerCase();
                if(extensions.indexOf(ext.value) !== -1) {
                    Services.prompt.alert(null, 'Bad file extension', 'The specified file extension is already handled by ' + ADDON_NAME + '.');
                } else {
                    while(Services.prompt.prompt(null, 'Add MIME type', 'Enter a valid MIME type that ' + ADDON_NAME + ' should map to the "' + ext.value + '" extension:', mime, null, {})) {
                        if(mime.value.length > 80 || (mime.value.lastIndexOf('application/') !== 0 && mime.value.lastIndexOf('text/') !== 0) || mime.value.split('/').length !== 2 || mime.value.indexOf('json', 5) === -1) {
                            Services.prompt.alert(null, 'Bad MIME type', "The specified MIME type didn't look right.");
                        } else {
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

    exports.observe = function observeOptions() {
        if(!observing) {
            Services.obs.addObserver(observer, 'addon-options-displayed', false);
            observing = true;
            require('unload').unload(function(){
                Services.obs.removeObserver(observer, 'addon-options-displayed');
                observing = false;
            });
        }
    };
})();
