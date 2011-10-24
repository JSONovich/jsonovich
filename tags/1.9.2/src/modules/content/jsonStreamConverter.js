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

let log = require('log');
XPCOMUtils.defineLazyGetter(this, "JSON2HTML", function() {
    return require('content/json2html').JSON2HTML;
});
XPCOMUtils.defineLazyGetter(this, "BinaryInputStream", function() {
    return Components.Constructor("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream", "setInputStream");
});
XPCOMUtils.defineLazyGetter(this, "scriptableunicodeconverter", function() {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    return converter;
});
XPCOMUtils.defineLazyServiceGetter(this, "utf8Converter", "@mozilla.org/intl/utf8converterservice;1", "nsIUTF8ConverterService");

function JSONStreamConverter() {}
JSONStreamConverter.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamConverter, Ci.nsIStreamListener, Ci.nsIRequestObserver]),

    // nsIStreamConverter::convert
    convert: function(aStream, aFromType, aToType, aCtx) {
        return aStream;
    },

    // nsIStreamConverter::asyncConvertData
    asyncConvertData: function(aFromType, aToType, aListener, aCtx) {
        this.listener = aListener; // Store the listener passed to us
    },

    // nsIStreamListener::onDataAvailable
    onDataAvailable: function(aReq, aCtx, aStream, aOffset, aCount) {
        TS['DataAvailable'] = [Date.now()];
        log.debug("Entered onDataAvailable");
        var bis = new BinaryInputStream(aStream);
        this.rawdata += bis.readBytes(aCount);
        log.debug("Exiting onDataAvailable");
        TS['DataAvailable'].push(Date.now());
    },

    // nsIRequestObserver::onStartRequest
    onStartRequest: function(aReq, aCtx) {
        TS['StartRequest'] = [Date.now()];
        log.debug("Entered onStartRequest");
        this.rawdata = "";
        aReq.QueryInterface(Ci.nsIChannel);
        this.uri = aReq.URI.spec;
        this.mimetype = aReq.contentType || "application/json";
        aReq.contentType = "text/html";
        this.charset = aReq.contentCharset || "UTF-8";
        aReq.contentCharset = "UTF-8";
        this.listener.onStartRequest(aReq, aCtx);
        log.debug("Exiting onStartRequest");
        TS['StartRequest'].push(Date.now());
    },

    // nsIRequestObserver::onStopRequest
    onStopRequest: function(aReq, aCtx, aStatus) {
        TS['StopRequest'] = [Date.now()];
        log.debug("Entered onStopRequest");
        var data = utf8Converter.convertStringToUTF8(this.rawdata, this.charset, true);
        let prettyPrinted = "";
        try {
            TS['ParseJSON'] = [Date.now()];
            let jsonData = JSON.parse(data);
            TS['ParseJSON'].push(Date.now());
            TS['FormatJSON'] = [Date.now()];
            prettyPrinted = JSON2HTML.formatJSON(jsonData);
            TS['FormatJSON'].push(Date.now());
        } catch(e) {
            log.error(e);
            prettyPrinted = JSON2HTML.encodeHTML(data);
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

        var stream = scriptableunicodeconverter.convertToInputStream(htmlDocument);
        var len = stream.available();

        // Pass the data to the main content listener
        this.listener.onDataAvailable(aReq, aCtx, stream, 0, len);
        this.listener.onStopRequest(aReq, aCtx, aStatus);
        log.debug("Exiting onStopRequest");
        TS['StopRequest'].push(Date.now());
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
