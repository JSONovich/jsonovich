/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is JSONovich legacy bootstrap.
 *
 * The Initial Developer of the Original Code is
 * William Elwood <we9@kent.ac.uk>.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  - Gecko 2 emulation from mozilla-central.
 *    Portions Copyright (C) 2009, 2010 the Mozilla Foundation.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * This file contains the JSONovich bootstrap for older Gecko browsers.
 *
 * Changelog:
 * [2011-05] - Created FF4 legacy bootstrap for JSONovich extension
 *
 * TODO: when dropping Gecko 1.9.1/Firefox 3.5 support, remove emulation of XPCOMUtils lazy getters.
 * TODO: when dropping Gecko 1.9.2/Firefox 3.6 support, all this code becomes unnecessary.
 */

const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const ADDON_NAME = 'JSONovich';
const ADDON_LNAME = 'jsonovich';
const ADDON_DOMAIN = 'lackoftalent.org';
const PLATFORM = 'gecko';
const DEBUG = false;
let jsonovich, getResourceURI;

if(!XPCOMUtils.defineLazyGetter) { // emulate XPCOMUtils.defineLazyGetter (introduced in Gecko 1.9.2/FF3.6)
    // see http://hg.mozilla.org/mozilla-central/diff/f2ebd467b1cd/js/src/xpconnect/loader/XPCOMUtils.jsm
    XPCOMUtils.defineLazyGetter = function XPCU_defineLazyGetter(aObject, aName, aLambda) {
        aObject.__defineGetter__(aName, function() {
            delete aObject[aName];
            return aObject[aName] = aLambda.apply(aObject);
        });
    }
}
if(!XPCOMUtils.defineLazyServiceGetter) { // emulate XPCOMUtils.defineLazyServiceGetter (introduced in Gecko 1.9.2/FF3.6)
    // see http://hg.mozilla.org/mozilla-central/diff/acb4f43ba5ab/js/src/xpconnect/loader/XPCOMUtils.jsm
    XPCOMUtils.defineLazyServiceGetter = function XPCU_defineLazyServiceGetter(aObject, aName, aContract, aInterfaceName) {
        XPCOMUtils.defineLazyGetter(aObject, aName, function XPCU_serviceLambda() {
            return Cc[aContract].getService(Ci[aInterfaceName]);
        });
    }
}
let Services = {}; // emulate Services.jsm (introduced in Gecko 2/FF4)
// see http://hg.mozilla.org/mozilla-central/diff/b264a7e3c0f5/toolkit/content/Services.jsm
XPCOMUtils.defineLazyServiceGetter(Services, "console", "@mozilla.org/consoleservice;1", "nsIConsoleService");
// see http://hg.mozilla.org/mozilla-central/diff/365acfca64dc/toolkit/content/Services.jsm
XPCOMUtils.defineLazyServiceGetter(Services, "scriptloader", "@mozilla.org/moz/jssubscript-loader;1", "mozIJSSubScriptLoader");
// see http://hg.mozilla.org/mozilla-central/diff/78e5543c0bc4/toolkit/content/Services.jsm
XPCOMUtils.defineLazyServiceGetter(Services, "obs", "@mozilla.org/observer-service;1", "nsIObserverService");
XPCOMUtils.defineLazyServiceGetter(Services, "io", "@mozilla.org/network/io-service;1", "nsIIOService2");

function startup() {
    jsonovich = {};
    Services.scriptloader.loadSubScript(getResourceURI('modules/' + PLATFORM + '/helper.js').spec, jsonovich);
    if(jsonovich.startup) {
        jsonovich.startup();
    }
}

function uninstall() {
    if(jsonovich.uninstall) {
        jsonovich.uninstall();
    }
    shutdown();
}

function shutdown() { // thanks to work on restartless support, we can do this on-demand in legacy Gecko :D
    if(jsonovich.shutdown) {
        jsonovich.shutdown();
    }
    jsonovich = null;
}

function JSONovichBootstrap() {}
JSONovichBootstrap.prototype = {
    classDescription: ADDON_NAME,
    classID:          Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a65}"),
    contractID:       '@' + ADDON_DOMAIN + '/' + ADDON_LNAME + 'bootstrap;1',
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
    _xpcom_categories: [{category: "profile-after-change"}],

    observe: function(aSubject, aTopic, aData) {
        switch(aTopic) {
            case "profile-after-change": // startup
                startup();
                Services.obs.addObserver(this, "em-action-requested", false);
                break;
            case "em-action-requested":
                aSubject.QueryInterface(Ci.nsIUpdateItem);
                if(aSubject.id == ADDON_LNAME + '@' + ADDON_DOMAIN) {
                    switch(aData) {
                        case "item-uninstalled": // uninstall
                            uninstall();
                            break;
                        case "item-disabled": // disable
                            shutdown();
                            break;
                        case "item-cancel-action": // re-enable
                            startup();
                            break;
                    }
                }
                break;
        }
    }
};

function NSGetModule(compMgr, fileSpec) { // legacy Gecko entrypoint
    let rootPath = fileSpec.parent.parent;

    // emulate more Gecko 2, based mostly on buildJarURI and AddonWrapper.getResourceURI in http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/XPIProvider.jsm
    getResourceURI = function getResourceURI(aPath) {
        let bundle = rootPath.clone();
        if(aPath) {
            if(bundle.isDirectory()) {
                aPath.split("/").forEach(function(aPart) {
                    bundle.append(aPart);
                });
            } else {
                return Services.io.newURI("jar:" + bundle.spec + "!/" + aPath, null, null);
            }
        }
        return Services.io.newFileURI(bundle);
    }

    return XPCOMUtils.generateModule([JSONovichBootstrap]);
}
