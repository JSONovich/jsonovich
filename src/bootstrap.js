/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains the JSONovich bootstrap for Gecko 2+ browsers.
 */

(function(global) {
    'use strict';

    var TS = {
        'Bootstrap': [Date.now()]
    },
    ADDON_NAME = 'JSONovich',
    ADDON_LNAME = ADDON_NAME.toLowerCase(),
    ADDON_DOMAIN = 'lackoftalent.org',
    electrolyte = null,
    Services = scopedImport('resource://gre/modules/Services.jsm').Services;

    chrome_init();
    TS['Bootstrap'].push(Date.now());

    function scopedImport(path, scope) {
        scope = scope ? scope : {};
        Components.utils['import'](path, scope);
        return scope;
    }

    function startup(data, reason) {
        var measure = typeof reason === 'string' ? reason : (reason === APP_STARTUP ? 'Startup' : (reason === ADDON_INSTALL ? 'Install' : 'Restart'));
        TS[measure] = [Date.now()];

        function getResourceURI(aPath) { // @see http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/XPIProvider.jsm
            var doJar = false, bundle = data.installPath.clone();
            if(aPath) {
                if(bundle.isDirectory()) {
                    aPath.split('/').forEach(function(aPart) {
                        bundle.append(aPart);
                    });
                } else {
                    doJar = true;
                }
            }
            bundle = Services.io.newFileURI(bundle);
            if(doJar) {
                return Services.io.newURI('jar:' + bundle.spec + '!/' + aPath, null, null);
            }
            return bundle;
        }
        function getResourceURISpec(path) {
            return getResourceURI(path).spec;
        }

        electrolyte = {
            TS: TS,
            ADDON_NAME: ADDON_NAME,
            ADDON_LNAME: ADDON_LNAME,
            ADDON_DOMAIN: ADDON_DOMAIN,
            webext: data.webExtension ? data.webExtension.startup(reason) : false,
            Cc: Components.classes,
            Ci: Components.interfaces,
            Cm: Components.manager,
            Cr: Components.results,
            Cu: Components.utils,
            getResourceURI: getResourceURI,
            getResourceURISpec: getResourceURISpec,
            Services: Services
        };
        scopedImport('resource://gre/modules/XPCOMUtils.jsm', electrolyte);

        Services.scriptloader.loadSubScript(getResourceURISpec('modules/electrolyte.js'), electrolyte);
        if(electrolyte.startup) {
            electrolyte.startup();
        }
        TS[measure].push(Date.now());
    };

    function shutdown(data, reason) {
        if(electrolyte != null) {
            if(electrolyte.shutdown) {
                electrolyte.shutdown();
            }
            if(reason == ADDON_UNINSTALL && electrolyte.uninstall) {
                electrolyte.uninstall();
            }
            electrolyte = null;
        }
    };

    function chrome_init() {
        global.startup = startup;
        global.shutdown = shutdown;
        global.install = global.uninstall = function() {};
    }
})(this);
