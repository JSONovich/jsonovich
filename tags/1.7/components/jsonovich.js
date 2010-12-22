/*
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
 * The Original Code has been modified to support XHTML mobile profile.
 * The modified code is Copyright (C) 2006 Gareth Hunt.
 *
 * The modified code has been further modified to support application/json
 * pretty printing
 * The further modified code is Copyright (C) 2008 Michael J. Giarlo.
 *
 * Changes by William Elwood:
 * [2010-09] - Support for XPCOM registration differences in Gecko 2 (Firefox 4)
 * [2010-12] - Remove separate JSON module, use native JSON parser
 *           - Custom JSON stringifier module
 *
 * This file contains the content handler for converting content of types
 * application/json and text/x-json (JSONStreamConverter)
 */

/* application/json & text/x-json -> text/html stream converter */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const COMPONENT_ID = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}");

function JSONStreamConverter() {
  this.wrappedJSObject = this;
}

JSONStreamConverter.prototype = {
  _logger: null,
  _initialized: false,
  _debug: false,

  init: function () {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    // twiddle this for more/less verbose console output
    this._debug = false;
    this._logger = Cc["@mozilla.org/consoleservice;1"]
                     .getService(Ci.nsIConsoleService);
    if (this._debug)
      this._logger.logStringMessage("JSONStreamConverter initialized");
    try {
      Cu.import("resource://jsonovich/json2html.js");
    }
    catch(e) {
      Cu.reportError(e);
      throw "Could not find JSON2HTML module";
    }
  },

  QueryInterface: function (aIid) {
    if (aIid.equals(Ci.nsISupports) ||
        aIid.equals(Ci.nsIStreamConverter) ||
        aIid.equals(Ci.nsIStreamListener) ||
        aIid.equals(Ci.nsIRequestObserver)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  // nsIRequest::onStartRequest
  onStartRequest: function (aReq, aCtx) {
    this.init();
    if (this._debug)
      this._logger.logStringMessage("Entered onStartRequest");
    this.data = "";
    this.rawdata = "";
    this.uri = aReq.QueryInterface(Ci.nsIChannel).URI.spec;
    this.channel = aReq;
    if (this._debug)
      this._logger.logStringMessage(this.channel.contentType);
    this.channel.contentType = "text/html";
    if (this._debug)
      this._logger.logStringMessage(this.channel.contentType);
    this.listener.onStartRequest(this.channel, aCtx);
    if (this._debug)
      this._logger.logStringMessage("Exiting onStartRequest");
  },

  // nsIRequest::onStopRequest
  onStopRequest: function (aReq, aCtx, aStatus) {
    let prettyPrinted = "";
    try {
      let jsonData = JSON.parse(this.data);
      prettyPrinted = JSON2HTML.formatJSON(jsonData);
    } catch(e) {
      this._logger.logStringMessage(e);
      prettyPrinted = JSON2HTML.encodeHTML(this.data);
    }
    let htmlDocument = "<!DOCTYPE html>\n" +
      "<html>\n" +
      "  <head>\n" +
      "    <title>" + this.uri + "</title>\n" +
      '    <link rel=stylesheet href="chrome://jsonovich/content/jsonovich.css">\n' +
      '    <script src="chrome://jsonovich/content/jsonovich.js"></script>\n' +
      "  </head>\n" +
      "  <body>\n" +
     "    <noscript>You need JavaScript on to expand/collapse nodes.</noscript>\n" +
      prettyPrinted +
      "  </body>\n" +
      "</html>\n";

    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var stream = converter.convertToInputStream(htmlDocument);
    var len = stream.available();

    // Pass the data to the main content listener
    this.listener.onDataAvailable(this.channel, aCtx, stream, 0, len);
    this.listener.onStopRequest(this.channel, aCtx, aStatus);
  },

  // nsIStreamListener methods
  onDataAvailable: function (aReq, aCtx, aStream, aOffset, aCount) {
    if (this._debug)
      this._logger.logStringMessage("Entered onDataAvailable");
    var sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance();
    sis = sis.QueryInterface(Ci.nsIScriptableInputStream);
    sis.init(aStream);
    this.rawdata += sis.read(aCount);
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
		      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    sis.close();
    this.data = converter.ConvertToUnicode(this.rawdata);
    if (this._debug)
      this._logger.logStringMessage("Exiting onDataAvailable");
  },

  asyncConvertData: function (aFromType, aToType, aListener, aCtx) {
    // Store the listener passed to us
    this.listener = aListener;
  },

  convert: function (aStream, aFromType, aToType, aCtx) {
    return aStream;
  }
};

// This factory returns an anonymous class
var JSONovichFactory = {
  // nsIFactory::createInstance
  createInstance: function (aOuter, aIid) {
    if (aOuter != null) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return (new JSONStreamConverter()).QueryInterface(aIid);
  }
};

/* Gecko <2 entrypoint */
function NSGetModule(aCompMgr, aFileSpec) {
  return {
    conversions: [
      "?from=application/json&to=*/*",
      "?from=application/jsonrequest&to=*/*",
      "?from=text/x-json&to=*/*",
      "?from=application/sparql-results+json&to=*/*",
      "?from=application/rdf+json&to=*/*",
      "?from=application/*+json&to=*/*"
    ],
    contractID: "@mozilla.org/streamconv;1",
    name: "JSONovich",

    registerSelf: function (aCompMgr, aFileSpec, aLocation, aType) {
      aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
      for (conv in this.conversions) {
        aCompMgr.registerFactoryLocation(COMPONENT_ID, this.name,
    this.contractID + this.conversions[conv],
          aFileSpec, aLocation, aType);
      }
    },

    unregisterSelf: function (aCompMgr, aFileSpec, aLocation) {
      aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
      aCompMgr.unregisterFactoryLocation(COMPONENT_ID, aLocation);
    },

    getClassObject: function (aCompMgr, aCid, aIid) {
      if (aCid.equals(COMPONENT_ID)) {
        return JSONovichFactory;
      }
      if (!aIid.equals(Ci.nsIFactory)) {
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
      }
      throw Cr.NS_ERROR_NO_INTERFACE;
    },

    canUnload: function (aCompMgr) {
      return true;
    }
  };
}

/* Gecko 2+ entrypoint */
function NSGetFactory(compMgr, fileSpec) {
  return JSONovichFactory;
}
