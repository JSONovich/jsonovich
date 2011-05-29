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
 *   Michael J. Giarlo
 *   William Elwood <we9@kent.ac.uk>
 *
 * ***** END LICENSE BLOCK *****
 *
 * This file contains the stream converter for JSON content types (JSONStreamConverter).
 *
 * Changelog:
 * [2008]    - Initial support for application/json pretty-printing in JSONovich.
 * [2010-09] - Support for XPCOM registration differences in Gecko 2 (Firefox 4).
 * [2010-12] - Remove separate JSON module, use native JSON parser.
 *           - Custom JSON stringifier module.
 * [2011-05] - Rewrote component registration to be dynamic so it can be used by
 *             both restartless and legacy bootstraps.
 */

'use strict';

let log = require(PLATFORM + '/log');

function JSONStreamConverter() {
    this.JSON2HTML = require('json2html').JSON2HTML;
    log.debug("JSONStreamConverter initialized");
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
        TS['StartRequest'] = [Date.now()];
        log.debug("Entered onStartRequest");
        this.data = "";
        this.rawdata = "";
        this.channel = aReq.QueryInterface(Ci.nsIChannel);
        this.uri = this.channel.URI.spec;
        log.debug(this.channel.contentType);
        this.channel.contentType = "text/html";
        if(this.listener)
            this.listener.onStartRequest(this.channel, aCtx);
        log.debug("Exiting onStartRequest");
        TS['StartRequest'].push(Date.now());
    },

    // nsIRequestObserver::onStopRequest
    onStopRequest: function(aReq, aCtx, aStatus) {
        TS['StopRequest'] = [Date.now()];
        log.debug("Entered onStopRequest");
        let prettyPrinted = "";
        try {
            TS['ParseJSON'] = [Date.now()];
            let jsonData = JSON.parse(this.data);
            TS['ParseJSON'].push(Date.now());
            TS['FormatJSON'] = [Date.now()];
            prettyPrinted = this.JSON2HTML.formatJSON(jsonData);
            TS['FormatJSON'].push(Date.now());
        } catch(e) {
            log.error(e);
            prettyPrinted = this.JSON2HTML.encodeHTML(this.data);
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
        log.debug("Exiting onStopRequest");
        TS['StopRequest'].push(Date.now());
    },

    // nsIStreamListener::onDataAvailable
    onDataAvailable: function(aReq, aCtx, aStream, aOffset, aCount) {
        TS['DataAvailable'] = [Date.now()];
        log.debug("Entered onDataAvailable");
        var sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
        sis.init(aStream);
        this.rawdata += sis.read(aCount);
        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        sis.close();
        this.data = converter.ConvertToUnicode(this.rawdata);
        log.debug("Exiting onDataAvailable");
        TS['DataAvailable'].push(Date.now());
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

var exports = {
    factory: JSONovichFactory
}
