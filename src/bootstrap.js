/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains the JSONovich bootstrap for Gecko 2+ browsers.
 *
 * Changelog:
 * [2011-05] - Created FF4 restartless bootstrap for JSONovich extension
 */

'use strict';

var TS = {
    'Bootstrap': [Date.now()]
};

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");
Components.utils['import']("resource://gre/modules/Services.jsm");
Components.utils['import']("resource://gre/modules/AddonManager.jsm");

(function(global) {
    'use strict';

    var ADDON_NAME = 'JSONovich',
    ADDON_LNAME = 'jsonovich',
    ADDON_DOMAIN = 'lackoftalent.org',
    electrolyte = null,
    bootstrapSyncListener = null;

    global.startup = function startup(data, reason) {
        let measure = reason == APP_STARTUP ? 'Startup' : (reason == ADDON_INSTALL ? 'Install' : 'Restart');
        AddonManager.getAddonByID(data.id, function(addon) {
            TS[measure] = [Date.now()];

            function getResourceURI(path) {
                return addon.getResourceURI(path);
            }

            function getResourceURISpec(path) {
                return getResourceURI(path).spec;
            }

            bootstrapSyncListener = function bootstrapSyncListener(msg) {
                switch(msg.name) {
                    case ADDON_LNAME + ':getResourceURISpec':
                        return {
                            spec: getResourceURI(msg.json.path).spec
                        };
                }
            };

            electrolyte = {
                ADDON_NAME: ADDON_NAME,
                ADDON_LNAME: ADDON_LNAME,
                ADDON_DOMAIN: ADDON_DOMAIN,
                IN_CHROME: true,
                IN_CONTENT: false,
                Cc: Components.classes,
                Ci: Components.interfaces,
                Cm: Components.manager,
                Cr: Components.results,
                Cu: Components.utils,
                getResourceURI: getResourceURI,
                getResourceURISpec: getResourceURISpec,
                messageManager: Components.classes["@mozilla.org/globalmessagemanager;1"].getService(Components.interfaces.nsIChromeFrameMessageManager)
            };
            electrolyte.messageManager.addMessageListener(ADDON_LNAME + ':getResourceURISpec', bootstrapSyncListener);
            electrolyte.messageManager.loadFrameScript(getResourceURISpec('modules/content/e10sbootstrap.js'), true);
            Services.scriptloader.loadSubScript(getResourceURISpec('modules/electrolyte.js'), electrolyte);
            if(electrolyte.startup) {
                electrolyte.startup();
            }
            TS[measure].push(Date.now());
        });
    };

    global.shutdown = function shutdown(data, reason) {
        if(electrolyte != null) {
            if(reason == ADDON_UNINSTALL) {
                if(electrolyte.uninstall) {
                    electrolyte.uninstall();
                }
            }
            if(reason != APP_SHUTDOWN) {
                if(electrolyte.messageManager) {
                    electrolyte.messageManager.sendAsyncMessage(ADDON_LNAME + ':shutdown', {});
                    electrolyte.messageManager.removeMessageListener(ADDON_LNAME + ':getResourceURISpec', bootstrapSyncListener);
                }
                if(electrolyte.shutdown) {
                    electrolyte.shutdown();
                }
                bootstrapSyncListener = null;
            }
        }
        electrolyte = null;
    };

    global.install = function install() {};
    global.uninstall = function uninstall() {};
})(this);
TS['Bootstrap'].push(Date.now());
