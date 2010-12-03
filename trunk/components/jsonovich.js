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
 *  - 2010-09: Support for XPCOM registration differences in Gecko 2 (Firefox 4)
 *  - 2010-12: Custom JSON stringifier -
 *              - No need for external JSON module, use native JSON parser
 *              - No need for Google Code Prettify library
 *              - Initial work towards user-customisable formatting
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

function formatJSON(json) {
  let lines = [], lineBreaks = {
    "after array open": true,
    "before array items separator": false,
    "after array items separator": true,
    "after array items last": true,
    "after array close": true,
    "after object open": true,
    "before object properties separator": false,
    "after object properties separator": true,
    "after object properties last": true,
    "after object close": true,
    "end": true
  }, indent = 0,
  str_true = 'true', str_false = 'false',
  str_null = 'null', str_indent = '&nbsp;&nbsp;', sep_array_items = ',',
  sep_object_properties = ',', sep_object_property_kv = ': ',
  delim_open_array = '[', delim_close_array = ']',
  delim_open_object = '{', delim_close_object = '}',
  delim_string = '"', debug = false, starts = debug ? [] : null,
  logger = debug ? Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService) : null,
  // From Google code-prettify:
  // Define regexps here so that the interpreter doesn't have to create an
  // object each time the function containing them is called.
  // The language spec requires a new object created even if you don't access
  // the $1 members.
  r_amp = /&/g, r_lt = /</g, r_gt = />/g, r_quot = /\"/g,

  encodeHTML = function(aHtmlSource) {
    return aHtmlSource.replace(r_amp, '&amp;').replace(r_lt, '&lt;').replace(r_gt, '&gt;').replace(r_quot, '&quot;');
  },

  generateElement = function(cssClass, content) {
    let block = '<span';
    if(cssClass) {
      block += ' class="' + cssClass + '"';
    }
    block += '>' + content + '</span>';
    return block;
  },

  generateLine = function(event, content) {
    if(lineBreaks[event] && content.length) {
      let l = '<span class="line ' + (lines.length % 2 == 0 ? 'even' : 'odd') + '"><span class="gutter"></span><code>';
      if(indent > 0) {
        for(let i = indent; i > 0; i--) {
          l += str_indent;
        }
      }
      lines.push(l + content + '</code></span>');
      return '';
    }
    return content;
  },

  formatArray = function(arr, line) {
    line += generateElement("array delimiter open", delim_open_array);
    if(arr.length) {
      line = generateLine("after array open", line);
      indent++;
      for(let i in Iterator(arr, true)) {
        if(i > 0) {
          line = generateLine("before array items separator", line);
          line += generateElement("array separator", sep_array_items);
          line = generateLine("after array items separator", line);
        }
        line = formatRecursively(arr[i], line);
      }
      line = generateLine("after array items last", line);
      indent--;
    }
    return line + generateElement("array delimiter close", delim_close_array);
  },

  formatObject = function(obj, line) {
    line += generateElement("object delimiter open", delim_open_object);
    var membs = [];
    for(let memb in Iterator(obj, true)) {
      membs.push(memb);
    }
    if(membs.length) {
      line = generateLine("after object open", line);
      indent++;
      for(let i = 0; i < membs.length; i++) {
        if(i > 0) {
          line = generateLine("before object properties separator", line);
          line += generateElement("object separator", sep_object_properties);
          line = generateLine("after object properties separator", line);
        }
        line += generateElement("key", membs[i]);
        line += generateElement("object property separator", sep_object_property_kv);
        line = formatRecursively(obj[membs[i]], line);
      }
      line = generateLine("after object properties last", line);
      indent--;
    }
    return line + generateElement("object delimiter close", delim_close_object);
  },

  formatRecursively = function(thing, line) {
    if(thing == null) {
      return line + generateElement("null", str_null);
    } else {
      switch(typeof thing) {
        case "number":
          return line + generateElement("number", thing);
        case "boolean":
          return line + generateElement("boolean " + (thing ? "true" : "false"), thing ? str_true : str_false);
        case "string":
          return line + generateElement("string", generateElement("delimiter", delim_string)
           + generateElement("content", encodeHTML(thing))
           + generateElement("delimiter", delim_string));
        case "object":
          if(thing.constructor == Array) {
            if (debug)
              starts.push(new Date().getTime());
            let tmp = formatArray(thing, line);
            if (debug)
              logger.logStringMessage("formatJSON: formatted lvl " + indent + " array in " + (new Date().getTime() - starts.pop()) + "ms");
            return tmp;
          } else {
            if (debug)
              starts.push(new Date().getTime());
            let tmp = formatObject(thing, line);
            if (debug)
              logger.logStringMessage("formatJSON: formatted lvl " + indent + " object in " + (new Date().getTime() - starts.pop()) + "ms");
            return tmp;
          }
        default:
          return line + generateElement("unknown", thing);
      }
    }
  };

  if (debug)
    starts.push(new Date().getTime());
  generateLine("end", formatRecursively(json, ''));
  if (debug)
    logger.logStringMessage("formatJSON: formatted JSON in " + (new Date().getTime() - starts.pop()) + "ms");
  return '<pre class="json">\n' + lines.join('\n') + '</pre>\n';
}

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
    var prettyPrinted = "";
    try {
      let jsonData = JSON.parse(this.data);
      prettyPrinted = formatJSON(jsonData);
    } catch(e) {
      prettyPrinted = '<div class="error">' + e + "\n\nJSON input:\n" + this.data + '</div>\n';
    }
    var htmlDocument = "<!DOCTYPE html>\n" +
      "<html>\n" +
      "  <head>\n" +
      "    <title>"+ this.uri + "</title>\n" +
      "    <style type='text/css'>\n" +
      "      body,.json{margin:0;padding:0;}\n" +
      "      .json{font-family:monospace;white-space:pre-wrap;color:#666;display:table;counter-reset:line;}\n" +
      "      .json>.line{display:table-row;counter-increment:line;}\n" +
      "      .json>.line.even{background-color:#fafaff;}\n" +
      "      .json>.line.odd{background-color:#fafffa;}\n" +
      "      .json>.line:hover>.gutter{background-color:#eeeebb;}\n" +
      "      .json>.line:hover>code{background-color:#ffffcc;}\n" +
      "      .json>.line>.gutter,.json>.line>code{margin:0;padding:0;display:table-cell;}\n" +
      "      .json>.line>.gutter{text-align:right;background-color:#eee;margin:0;}\n" +
      "      .json>.line>.gutter:before{content:counter(line);}\n" +
      "      .json>.line>code{text-align:left;}\n" +
      "      .json>.line>code .string>.content{color:#080;}\n" +
      "      .json>.line>code .key{color:#008;}\n" +
      "      .json>.line>code .boolean{color:#066;}\n" +
      "      .json>.line>code .number{color:#066;}\n" +
      "      .json>.line>code .null{color:#066;}\n" +
      "      .json>.line>code .delimiter{color:#660;}\n" +
      "      .json>.line>code .separator{color:#660;}\n" +
      "      @media print{\n" +
      "      .json>.line>code .string>.content{color:#060;}\n" +
      "      .json>.line>code .key{color:#006;font-weight:bold;}\n" +
      "      .json>.line>code .boolean{color:#044;}\n" +
      "      .json>.line>code .number{color:#044;}\n" +
      "      .json>.line>code .null{color:#044;}\n" +
      "      .json>.line>code .delimiter{color:#440;}\n" +
      "      .json>.line>code .separator{color:#440;}\n" +
      "      }\n" +
/*      "      .collapser{margin:0;border:0;padding:0;}div.collapsed{overflow:hidden;height:1em;background-color:#ff9;}span.toggle{cursor:row-resize;background-color:#ff9;}\n" +
*/      "    </style>\n" +
/*      '    <script type="text/javascript"><!--\n' +
      '    function do_collapse(i) {' +
      '      var t = document.getElementById("toggle-" + i);' +
      '      var n = document.getElementById("num-" + i);' +
      '      var l = document.getElementById("line-" + i);' +
      '      if ("-" == t.innerHTML) {' +
      '        n.className += " collapsed";' +
      '        l.className += " collapsed";' +
      '        t.innerHTML = "+";' +
      '      } else {' +
      '        n.className = n.className.replace(/ collapsed\\b/,"");' +
      '        l.className = l.className.replace(/ collapsed\\b/,"");' +
      '        t.innerHTML = "-";' +
      '      }' +
      '    }' +
      "    // -->\n" +
      "    </script>\n" +
*/      "  </head>\n" +
      "  <body>\n" +
//      "    <noscript>You need JavaScript on to expand/collapse nodes.</noscript>\n" +
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
