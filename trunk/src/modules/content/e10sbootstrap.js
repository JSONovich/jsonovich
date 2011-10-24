/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains the JSONovich content script bootstrap for platforms with IPC APIs.
 *
 * Changelog:
 * [2011-07] - Created content script bootstrap for JSONovich extension
 */

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");
Components.utils['import']("resource://gre/modules/Services.jsm");

(function(global) {
    'use strict';

    var TS = {
        'E10SBootstrap': [Date.now()]
    },
    ADDON_NAME = 'JSONovich',
    ADDON_LNAME = 'jsonovich',
    ADDON_DOMAIN = 'lackoftalent.org',
    electrolyte = null,
    once = null,
    installPath = null;

    function startup(startupConsts) {
        TS['E10SStartup'] = [Date.now()];
        function getResourceURI(aPath) { // @see http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/XPIProvider.jsm
            let doJar = false, bundle = installPath.clone();
            if(aPath) {
                if(bundle.isDirectory()) {
                    aPath.split("/").forEach(function(aPart) {
                        bundle.append(aPart);
                    });
                } else {
                    doJar = true;
                }
            }
            bundle = Services.io.newFileURI(bundle);
            if(doJar) {
                return Services.io.newURI("jar:" + bundle.spec + "!/" + aPath, null, null);
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
            IN_CHROME: false,
            IN_CONTENT: true,
            Cc: Components.classes,
            Ci: Components.interfaces,
            Cm: Components.manager,
            Cr: Components.results,
            Cu: Components.utils,
            getResourceURI: getResourceURI,
            getResourceURISpec: getResourceURISpec,
            messageManager: global
        };

        installPath = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        installPath.initWithPath(startupConsts.installPath);

        once = {
            path: getResourceURISpec('modules/content/OncePerProcess.jsm')
        };

        electrolyte.messageManager.addMessageListener(ADDON_LNAME + ':shutdown', shutdown);
        Components.utils['import'](once.path, once);
        Services.scriptloader.loadSubScript(getResourceURISpec('modules/electrolyte.js'), electrolyte);
        if(electrolyte.startup) {
            electrolyte.startup(once);
        }
        TS['E10SStartup'].push(Date.now());
    }

    function shutdown() {
        electrolyte.messageManager.removeMessageListener(ADDON_LNAME + ':shutdown', shutdown);
        if(electrolyte.shutdown) {
            electrolyte.shutdown();
        }
        once.resetOncePerProcess();
        if(typeof Components.utils['unload'] == 'function') {
            Components.utils['unload'](once.path);
        }
        installPath = null;
        once = null;
        electrolyte = null;
    }

    function ensureStartupConstants() {
        var reply = sendSyncMessage(ADDON_LNAME + ':getStartupConstants', {});
        if(reply.length) {
            startup(reply[0]);
        } else {
            scheduleSyncMessage();
        }
    }

    function scheduleSyncMessage() {
        Services.tm.mainThread.dispatch({
            run: ensureStartupConstants
        }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    }

    scheduleSyncMessage();
    TS['E10SBootstrap'].push(Date.now());
})(this);