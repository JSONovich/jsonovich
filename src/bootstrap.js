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
    ADDON_LNAME = 'jsonovich',
    ADDON_DOMAIN = 'lackoftalent.org',
    electrolyte = null,
    ipcServices = {},
    PRIVILEGED = typeof global.sendSyncMessage === 'undefined',
    Services = null;

    PRIVILEGED ? chrome_init() : content_init();
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
            IN_CHROME: PRIVILEGED,
            IN_CONTENT: !PRIVILEGED,
            content: global.content,
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
        ipcServices = {
            once: {
                path: electrolyte.getResourceURISpec('modules/content/OncePerProcess.jsm')
            }
        };
        scopedImport(ipcServices.once.path, ipcServices.once);

        PRIVILEGED ? chrome_startup(data, reason) : content_startup(data, reason);
        Services.scriptloader.loadSubScript(getResourceURISpec('modules/electrolyte.js'), electrolyte);
        if(electrolyte.startup) {
            electrolyte.startup(ipcServices.once);
        }
        TS[measure].push(Date.now());
    };

    function shutdown(data, reason) {
        if(electrolyte != null) {
            if(electrolyte.shutdown) {
                electrolyte.shutdown();
            }
            PRIVILEGED ? chrome_shutdown(data, reason) : content_shutdown(data, reason);
            electrolyte = null;
        }
    };

    function chrome_init() {
        Services = scopedImport('resource://gre/modules/Services.jsm').Services;
        global.startup = startup;
        global.shutdown = shutdown;
        global.install = global.uninstall = function() {};
    }

    function chrome_startup(data, reason) {
        var content_constants = {
            installPath: data.installPath.path
        };
        ipcServices.messageManager = Components.classes['@mozilla.org/globalmessagemanager;1'].getService('nsIMessageBroadcaster' in Components.interfaces ? Components.interfaces.nsIMessageBroadcaster : Components.interfaces.nsIChromeFrameMessageManager);
        ipcServices.messageListener = function bootstrapSyncListener(msg) {
            switch(msg.name) {
                case ADDON_LNAME + ':getStartupConstants':
                    return content_constants;
            }
        };
        // unloadable global frame scripts OR no choice (Fennec)
        if('removeDelayedFrameScript' in ipcServices.messageManager || Services.appinfo.ID == '{a23983c0-fd0e-11dc-95ff-0800200c9a66}') { // TODO: check if adding support for more platforms
            ipcServices.messageManager.addMessageListener(ADDON_LNAME + ':getStartupConstants', ipcServices.messageListener);
            ipcServices.messageManager.loadFrameScript(electrolyte.getResourceURISpec('bootstrap.js'), true);
        // https://bugzilla.mozilla.org/show_bug.cgi?id=681206 cannot be avoided in Fennec
        // TODO: manually add frame script to each existing and future tab's message manager instead of using global message manager
        // ref: http://adblockplus.org/jsdoc/adblockplus/symbols/src/modules_AppIntegrationFennec.jsm.html
        } else {
            electrolyte.IN_CONTENT = true;
        }
    }

    function chrome_shutdown(data, reason) {
        if(reason == ADDON_UNINSTALL && electrolyte.uninstall) {
            electrolyte.uninstall();
        }
        if(reason != APP_SHUTDOWN) {
            if(ipcServices.messageManager) {
                if('removeDelayedFrameScript' in ipcServices.messageManager) {
                    ipcServices.messageManager.removeDelayedFrameScript(electrolyte.getResourceURISpec('bootstrap.js'));
                }
                'broadcastAsyncMessage' in ipcServices.messageManager ? ipcServices.messageManager.broadcastAsyncMessage(ADDON_LNAME + ':shutdown', {}) : ipcServices.messageManager.sendAsyncMessage(ADDON_LNAME + ':shutdown', {});
                ipcServices.messageManager.removeMessageListener(ADDON_LNAME + ':getStartupConstants', ipcServices.messageListener);
            }
            ipcServices = {};
        }
    }

    function content_init() {
        if(global.docShell && !global.docShell.loadType) {
            global.addEventListener('DOMContentLoaded', content_load, false);
        } else {
            content_load();
        }
    }

    function content_load() {
        if(['chrome:', 'resource:', 'about:', 'view-source:'].indexOf(global.content.location.protocol) > -1) {
            return;
        }
        var data = {
            installPath: Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile)
        };
        function content_ensureStartupConstants() {
            var reply = global.sendSyncMessage(ADDON_LNAME + ':getStartupConstants', {});
            if(reply.length) {
                data.installPath.initWithPath(reply[0].installPath);
                startup(data, 'Startup');
            } else {
                content_scheduleSyncMessage();
            }
        }
        function content_scheduleSyncMessage() {
            Services.tm.mainThread.dispatch({
                run: content_ensureStartupConstants
            }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
        }
        global.removeEventListener('DOMContentLoaded', content_load, false);
        Services = scopedImport('resource://gre/modules/Services.jsm').Services;
        content_scheduleSyncMessage();
    }

    function content_startup(data, reason) {
        ipcServices.messageManager = global;
        ipcServices.once.load('bootstrap', function() {
            ipcServices.messageManager.addMessageListener(ADDON_LNAME + ':shutdown', shutdown);
            global.addEventListener('unload', shutdown, false);
        }, function() {
            ipcServices.messageManager.removeMessageListener(ADDON_LNAME + ':shutdown', shutdown);
            global.removeEventListener('unload', shutdown, false);
            if(typeof Components.utils['unload'] == 'function') {
                Components.utils['unload'](ipcServices.once.path);
            }
            ipcServices = {};
        });
    }

    function content_shutdown(data, reason) {
        ipcServices.once.unload('bootstrap');
    }
})(this);
