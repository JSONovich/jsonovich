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
 * The Original Code is JSONovich restartless bootstrap.
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
 * Changelog:
 * [2011-05] - Created FF4 restartless bootstrap for JSONovich extension
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;
const Cr = Components.results;
const Cu = Components.utils;
const COMPONENT_ID = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

let global = this;
let addonData = {
    name: 'JSONovich',
    lname: 'jsonovich',
    conversions: [
    "application/json",
    "application/jsonrequest",
    "text/x-json",
    "application/sparql-results+json",
    "application/rdf+json",
    "application/*+json"
    ],
    debug: false
}

function startup(data, reason) {
    AddonManager.getAddonByID(data.id, function(addon) {
        /* don't use Cu.import for anything we want to be reloadable without restart
         * (saves messing with the ugly workaround of changing directories and URLs...) */
        Services.scriptloader.loadSubScript(addon.getResourceURI("includes/unload.js").spec, global);

        utils.setResourceAlias(addonData.lname, addon.getResourceURI());

        Services.scriptloader.loadSubScript(addon.getResourceURI("modules/json2html.js").spec, global);

        let aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        let aFactory = JSONovichFactory;
        for(let conv in addonData.conversions) {
            aCompMgr.registerFactory(COMPONENT_ID, addonData.name,
                '@mozilla.org/streamconv;1?from=' + addonData.conversions[conv] + '&to=*/*',
                aFactory);
            aFactory = null; // set null after 1st pass to avoid factory exists warning...
        }
        unload(function() {
            aCompMgr.unregisterFactory(COMPONENT_ID, JSONovichFactory);
        });
    });
}

function shutdown(data, reason) {
    if(reason != APP_SHUTDOWN) unload();
    if(reason == ADDON_DISABLE && addonData.debug) {
        AddonManager.getAddonByID(data.id, function(addon) {
            addon.userDisabled = false;
        });
    }
}
function install(data, reason) {}
function uninstall(data, reason) {}

function log(msg) {
    if(addonData.debug) {
        Services.console.logStringMessage(msg);
    }
}

let utils = {
    setResourceAlias: function(alias, target) {
        let proto = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
        proto.setSubstitution(alias, target);
        unload(function() {
            proto.setSubstitution(alias, null);
        });
    }
};

let JSONovichFactory = {
    // nsIFactory::createInstance
    createInstance: function (aOuter, aIid) {
        if(aOuter != null) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
        }
        return (new JSONStreamConverter()).QueryInterface(aIid);
    }
};

function JSONStreamConverter() {
    log("JSONStreamConverter initialized");
}
JSONStreamConverter.prototype = {
    listener: null,

    QueryInterface: function(aIid) {
        if(aIid.equals(Ci.nsISupports)
            || aIid.equals(Ci.nsIStreamConverter)
            || aIid.equals(Ci.nsIStreamListener)
            || aIid.equals(Ci.nsIRequestObserver)) {
            return this;
        }
        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    // nsIRequestObserver::onStartRequest
    onStartRequest: function(aReq, aCtx) {
        log("Entered onStartRequest");
        this.data = "";
        this.rawdata = "";
        this.channel = aReq.QueryInterface(Ci.nsIChannel);
        this.uri = this.channel.URI.spec;
        log(this.channel.contentType);
        this.channel.contentType = "text/html";
        if(this.listener)
            this.listener.onStartRequest(this.channel, aCtx);
        log("Exiting onStartRequest");
    },

    // nsIRequestObserver::onStopRequest
    onStopRequest: function(aReq, aCtx, aStatus) {
        log("Entered onStopRequest");
        let prettyPrinted = "";
        try {
            let jsonData = JSON.parse(this.data);
            prettyPrinted = JSON2HTML.formatJSON(jsonData);
        } catch(e) {
            log(e);
            prettyPrinted = JSON2HTML.encodeHTML(this.data);
        }
        let htmlDocument = "<!DOCTYPE html>\n" +
        "<html>\n" +
        "  <head>\n" +
        "    <title>" + this.uri + "</title>\n" +
        '    <link rel=stylesheet href="resource://jsonovich/chrome/public/jsonovich.css">\n' +
        '    <script src="resource://jsonovich/chrome/public/jsonovich.js"></script>\n' +
        "  </head>\n" +
        "  <body>\n" +
        "    <noscript>You need JavaScript on to expand/collapse nodes.</noscript>\n" +
        prettyPrinted +
        "  </body>\n" +
        "</html>\n";

        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        var stream = converter.convertToInputStream(htmlDocument);
        var len = stream.available();

        // Pass the data to the main content listener
        if(this.listener){
            this.listener.onDataAvailable(this.channel, aCtx, stream, 0, len);
            this.listener.onStopRequest(this.channel, aCtx, aStatus);
        }
        log("Exiting onStopRequest");
    },

    // nsIStreamListener::onDataAvailable
    onDataAvailable: function(aReq, aCtx, aStream, aOffset, aCount) {
        log("Entered onDataAvailable");
        var sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
        sis.init(aStream);
        this.rawdata += sis.read(aCount);
        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        sis.close();
        this.data = converter.ConvertToUnicode(this.rawdata);
        log("Exiting onDataAvailable");
    },

    // nsIStreamConverter::asyncConvertData
    asyncConvertData: function(aFromType, aToType, aListener, aCtx) {
        // Store the listener passed to us
        this.listener = aListener;
    },

    // nsIStreamConverter::convert
    convert: function(aStream, aFromType, aToType, aCtx) {
        return aStream;
    }
};