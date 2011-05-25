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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;
const Cr = Components.results;
const Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const ADDON_NAME = 'JSONovich';
const ADDON_LNAME = 'jsonovich';
const DEBUG = false;
let rootPath = null;
let global = this;

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
XPCOMUtils.defineLazyServiceGetter(Services, "io", "@mozilla.org/network/io-service;1", "nsIIOService2");

function JSONovichBootstrap() {}
JSONovichBootstrap.prototype = {
    classDescription: ADDON_NAME,
    classID:          Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a65}"),
    contractID:       "@lackoftalent.org/jsonovichbootstrap;1",
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
    _xpcom_categories: [{
        category: "profile-after-change"
    }],

    observe: function(aSubject, aTopic, aData) {
        switch(aTopic) {
            case "profile-after-change": // startup
                let helper = rootPath.clone();
                helper.append('modules');
                helper.append('helper-gecko.js');
                Services.scriptloader.loadSubScript(Services.io.newFileURI(helper).spec, global);
                break;
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    }
};

function NSGetModule(compMgr, fileSpec) { // legacy Gecko entrypoint
  rootPath = fileSpec.parent.parent;
  return XPCOMUtils.generateModule([JSONovichBootstrap]);
}
