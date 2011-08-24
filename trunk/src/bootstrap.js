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
    messages = null;

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
                getResourceURISpec: getResourceURISpec
            };
            messages = {
                manager: Components.classes["@mozilla.org/globalmessagemanager;1"].getService(Components.interfaces.nsIChromeFrameMessageManager),
                listener: function bootstrapSyncListener(msg) {
                    switch(msg.name) {
                        case ADDON_LNAME + ':getResourceURISpec':
                            return {
                                spec: getResourceURI(msg.json.path).spec
                            };
                    }
                }
            };

            // unloadable global frame scripts OR no choice (Fennec)
            if('removeDelayedFrameScript' in messages.manager || Services.appinfo.ID == '{a23983c0-fd0e-11dc-95ff-0800200c9a66}') { // TODO: check if adding support for more platforms
                messages.manager.addMessageListener(ADDON_LNAME + ':getResourceURISpec', messages.listener);
                messages.manager.loadFrameScript(getResourceURISpec('modules/content/e10sbootstrap.js'), true);
                electrolyte.messageManager = messages.manager;
                // https://bugzilla.mozilla.org/show_bug.cgi?id=681206 cannot be avoided in Fennec
                // TODO: manually add frame script to each existing and future tab's message manager instead of using global message manager
                // ref: http://adblockplus.org/jsdoc/adblockplus/symbols/src/modules_AppIntegrationFennec.jsm.html
            } else { // avoid IPC system, performance of not sending messages is obviously better without multi-process
                electrolyte.IN_CONTENT = true;
                messages = null;
            }

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
                if(messages) {
                    if('removeDelayedFrameScript' in messages.manager) {
                        messages.manager.removeDelayedFrameScript(getResourceURISpec('modules/content/e10sbootstrap.js'));
                    }
                    messages.manager.sendAsyncMessage(ADDON_LNAME + ':shutdown', {});
                    messages.manager.removeMessageListener(ADDON_LNAME + ':getResourceURISpec', messages.listener);
                }
                if(electrolyte.shutdown) {
                    electrolyte.shutdown();
                }
                messages = null;
            }
        }
        electrolyte = null;
    };

    global.install = function install() {};
    global.uninstall = function uninstall() {};
})(this);
TS['Bootstrap'].push(Date.now());
