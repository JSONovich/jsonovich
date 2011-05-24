/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is the wmlbrowser extension.
 *
 * The Initial Developer of the Original Code is Matthew Wilson
 * <matthew@mjwilson.demon.co.uk>. Portions created by the Initial Developer
 * are Copyright (C) 2004 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  - Initial support for application/json pretty-printing.
 *    Portions Copyright (C) 2008 Michael J. Giarlo.
 *
 *  - Gecko 2 support and other changes listed below.
 *    Portions Copyright (C) 2010, 2011 William Elwood <we9@kent.ac.uk>.
 *
 * ***** END LICENSE BLOCK *****
 *
 * This file contains the stream converter for JSON content types (JSONStreamConverter).
 *
 * Changes by William Elwood:
 * [2010-09] - Support for XPCOM registration differences in Gecko 2 (Firefox 4).
 * [2010-12] - Remove separate JSON module, use native JSON parser.
 *           - Custom JSON stringifier module.
 * [2011-05] - Rewrote component registration to be dynamic so it can be used by
 *             both restartless and legacy bootstraps.
 */

var streamConvData = {
    cid: Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}"),
    conversions: [
    "application/json",
    "application/jsonrequest",
    "text/x-json",
    "application/sparql-results+json",
    "application/rdf+json",
    "application/*+json"
    ]
};

function log(msg) {
    if(bootstrapData.debug) {
        Services.console.logStringMessage(msg);
    }
}

var JSON2HTML = null;

function JSONStreamConverter() {
    if(JSON2HTML == null) {
        // require('modules/json2html.js');
        Services.scriptloader.loadSubScript('resource://' + bootstrapData.lname + '-modules/json2html.js', global);
    }
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
        '    <link rel=stylesheet href="resource://jsonovich/jsonovich.css">\n' +
        '    <script src="resource://jsonovich/jsonovich.js"></script>\n' +
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

var JSONovichFactory = {
    // nsIFactory::createInstance
    createInstance: function (aOuter, aIid) {
        if(aOuter != null) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
        }
        return (new JSONStreamConverter()).QueryInterface(aIid);
    }
};

// dynamically register converters
let aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar);
let aFactory = JSONovichFactory;
for(let conv in streamConvData.conversions) {
    aCompMgr.registerFactory(streamConvData.cid, streamConvData.name,
        '@mozilla.org/streamconv;1?from=' + streamConvData.conversions[conv] + '&to=*/*',
        aFactory);
    aFactory = null; // set null after 1st pass to avoid factory exists warning...
}
unload(function() {
    aCompMgr.unregisterFactory(streamConvData.cid, JSONovichFactory);
});
