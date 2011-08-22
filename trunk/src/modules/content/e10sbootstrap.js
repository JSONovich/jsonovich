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

    var ADDON_NAME = 'JSONovich',
    ADDON_LNAME = 'jsonovich',
    ADDON_DOMAIN = 'lackoftalent.org',
    electrolyte = null;

    function startup() {

        function getResourceURI(path) {
            return Services.io.newFileURI(getResourceURISpec(path));
        }

        function getResourceURISpec(path) {
            return sendSyncMessage(ADDON_LNAME + ':getResourceURISpec', {
                path: path
            })[0].spec;
        }

        electrolyte = {
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
            messageManager: global,
            once: {}
        };
        electrolyte.messageManager.addMessageListener(ADDON_LNAME + ':shutdown', shutdown);
        Components.utils['import'](getResourceURISpec('modules/content/OncePerProcess.jsm'), electrolyte.once);
        Services.scriptloader.loadSubScript(getResourceURISpec('modules/electrolyte.js'), electrolyte);
        if(electrolyte.startup) {
            electrolyte.startup();
        }
    }

    function shutdown() {
        electrolyte.messageManager.removeMessageListener(ADDON_LNAME + ':shutdown', shutdown);
        if(electrolyte.shutdown) {
            electrolyte.shutdown();
        }
        electrolyte.once.resetOncePerProcess();
        if(typeof Components.utils['unload'] == 'function') {
            Components.utils['unload'](getResourceURISpec('modules/content/OncePerProcess.jsm'));
        }
        electrolyte = null;
    }

    startup();
})(this);
