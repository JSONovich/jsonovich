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

// TODO: separate from Firefox specific code
let JSONovich = function() {
  let lineBreaks = {
/**/    "before block": false, // default formatting
    "before items": true,
    "before separator": false,
    "after separator": true,
    "after items": true,
    "after block": false
/*/    "before block": true, // alternative formatting, similar to suggestion from Rijk van Haaften
    "before items": false,
    "before separator": true,
    "after separator": false,
    "after items": true,
    "after block": false
/**/  },
  str_true = 'true', str_false = 'false',
  str_null = 'null', str_indent = '  ', sep_array_items = ',',
  sep_object_properties = ',', sep_object_property_kv = ': ',
  delim_open_array = '[', delim_close_array = ']',
  delim_open_object = '{', delim_close_object = '}',
  delim_string = '"',
  // From Google code-prettify:
  // Define regexps here so that the interpreter doesn't have to create an
  // object each time the function containing them is called.
  // The language spec requires a new object created even if you don't access
  // the $1 members.
  r_amp = /&/g, r_lt = /</g, r_gt = />/g, r_quot = /\"/g,

  encodeHTML = function(aHtmlSource) {
    return aHtmlSource.replace(r_amp, '&amp;').replace(r_lt, '&lt;').replace(r_gt, '&gt;').replace(r_quot, '&quot;');
  },

  foldStart = function(data) {
    if(data.lines.length > 1) { // root object not collapsible
      data.currentLine.fold = ++data.numFolds;
      data.folds.unshift(data.currentLine.fold);
    }
  },

  formatArray = function(data, arr) {
    new Line(data, "before block");
    data.currentLine.addDelimiter(new Element(delim_open_array, "array delimiter open"));
    if(arr.length) {
      foldStart(data);
      new Line(data, "before items");
      data.currentLine.indentInc(data);
      for(let i in Iterator(arr, true)) {
        if(i > 0) {
          new Line(data, "before separator");
          data.currentLine.addDelimiter(new Element(sep_array_items, "array separator"));
          new Line(data, "after separator");
        }
        formatRecursively(data, arr[i]);
      }
      new Line(data, "after items");
      data.currentLine.indentDec(data);
      data.folds.shift();
    }
    data.currentLine.addDelimiter(new Element(delim_close_array, "array delimiter close"));
    new Line(data, "after block");
  },

  formatObject = function(data, obj) {
    let it = Iterator(obj, true);
    new Line(data, "before block");
    data.currentLine.addDelimiter(new Element(delim_open_object, "object delimiter open"));
    try {
      let memb = it.next();
      foldStart(data);
      new Line(data, "before items");
      data.currentLine.indentInc(data);
      try {
        for(;;) {
          data.currentLine.addElement(new Element(memb, "key"));
          data.currentLine.addElement(new Element(sep_object_property_kv, "object property separator"));
          formatRecursively(data, obj[memb]);
          memb = it.next();
          new Line(data, "before separator");
          data.currentLine.addDelimiter(new Element(sep_object_properties, "object separator"));
          new Line(data, "after separator");
        }
      } catch(e) {
        if(!(e instanceof StopIteration)) {
          throw e;
        }
      }
      new Line(data, "after items");
      data.currentLine.indentDec(data);
      data.folds.shift();
    } catch(e) {
      if(!(e instanceof StopIteration)) {
        throw e;
      }
    }
    data.currentLine.addDelimiter(new Element(delim_close_object, "object delimiter close"));
    new Line(data, "after block");
  },

  formatRecursively = function(data, thing) {
    if(thing == null) {
      data.currentLine.addElement(new Element(str_null, "null"));
    } else {
      switch(typeof thing) {
        case "number":
          data.currentLine.addElement(new Element(thing, "number"));
          break;
        case "boolean":
          data.currentLine.addElement(new Element(thing ? str_true : str_false,
            "boolean " + (thing ? "true" : "false")));
          break;
        case "string":
          data.currentLine.addElement(new Element([
            new Element(delim_string, "delimiter"),
            new Element(encodeHTML(thing), "content"),
            new Element(delim_string, "delimiter")
            ], "string"));
          break;
        case "object":
          if(thing.constructor == Array) {
            formatArray(data, thing);
          } else {
            formatObject(data, thing);
          }
          break;
        default:
          data.currentLine.addElement(new Element(thing, "unknown"));
          break;
      }
    }
  };

  // formatting tokens
  function Element(content, css) {
    this.content = content;
    this.length = content.length;
    this.css = css;
  }
  Element.prototype = {
    toString: function() {
      let content = this.content, block = "<span";
      if(this.css) {
        block += ' class="' + this.css + '"';
      }
      return block + ">" + ((typeof content == "object" && content.constructor == Array)
        ? content.join("") : content) + "</span>";
    }
  };

  function Line(data, event) {
    if(!data.currentLine || (lineBreaks[event] && (data.currentLine.content.length || event.indexOf("before") !== -1 || event.indexOf("after") !== -1 || event.indexOf("separator") !== -1))) {
      data.currentLine = this;
      data.lines.push(this);
      this.folds = data.folds.length // in FF4, empty data attributes are equivalent to not having the attribute
        ? '" data-fold' + data.folds.join('="1" data-fold') + '="1"' : "";
      this.indent = data.numIndent;
      this.indentContent = [];
      this.content = [];
    }
  }
  Line.prototype = {
    addDelimiter: function(d) {
      if(this.content.length) {
        this.content.push(d);
      } else {
        this.indentContent.push(d);
      }
    },
    addElement: function(e) {
      this.content.push(e);
    },
    indentInc: function(data) {
      data.numIndent++;
      this.indent++;
    },
    indentDec: function(data) {
      data.numIndent--;
      this.indent--;
    },
    toString: function() {
      let content = this.content, indentContent = this.indentContent,
      gutter = '<span class="line' + this.folds, prefix = "";
      if(!content.length && indentContent.length && (!this.indent || ((lineBreaks["before items"] || indentContent[0].css.indexOf("open") === -1) && (lineBreaks["before separator"] || indentContent[0].css.indexOf("separator") === -1)))) {
        content = indentContent;
        indentContent = [];
      }
      if(this.fold) {
        gutter += '" data-fold="' + this.fold;
      }
      if(this.indent) {
        for(let i = this.indent, j = indentContent.length - this.indent, d; i > 0; i--, j++) {
          d = indentContent[j];
          if(d) {
            prefix += d + str_indent.substr(d.length);
          } else {
            prefix += str_indent;
          }
        }
      }
      return gutter
        + '"><span class="fold gutter"></span><span class="number gutter"></span><code>'
        + (prefix
        + content.join("")).trimRight()
        + "</code></span>";
    }
  };

  return {
    encodeHTML: encodeHTML,
    formatJSON: function(json) {
      let data = {
        numFolds: 0,
        numIndent: 0,
        folds: [],
        lines: []
      };
      new Line(data);
      formatRecursively(data, json);
      return '<pre class="json">' + data.lines.join("\n") + "</pre>";
    }
  }
}();

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
    let prettyPrinted = "";
    try {
      let jsonData = JSON.parse(this.data);
      prettyPrinted = JSONovich.formatJSON(jsonData);
    } catch(e) {
      this._logger.logStringMessage(e);
      prettyPrinted = JSONovich.encodeHTML(this.data);
    }
    // TODO: move the in-line style&script to external files for proper syntax highlighting and less \n+ cruft
    let htmlDocument = "<!DOCTYPE html>\n" +
      "<html>\n" +
      "  <head>\n" +
      "    <title>" + this.uri + "</title>\n" +
      '    <style type="text/css">\n' +
      "      body,.json{margin:0;padding:0;}\n" +
      "      .json{font-family:monospace;white-space:pre-wrap;color:#666;display:table;counter-reset:line;}\n" +
      "      .json .line{display:table-row;counter-increment:line;}\n" +
      "      .json .line:nth-of-type(even){background-color:#fafaff;}\n" +
      "      .json .line:nth-of-type(odd){background-color:#fafffa;}\n" +
      "      .json .line:hover>.gutter{background-color:#eeeebb;}\n" +
      "      .json .line:hover>code{background-color:#ffffcc;}\n" +
      "      .json .gutter,.json code{margin:0;padding:0;display:table-cell;}\n" +
      "      .json .gutter{text-align:right;background-color:#eee;}\n" +
      "      .json .foldable{cursor:vertical-text;}\n" +
      "      .json .foldable.toggled{cursor:row-resize;background-color:#fa7;}\n" +
      "      .json .foldable.toggled>.gutter{background-color:#ea8;}\n" +
      "      .json .foldable.toggled>code{background-color:#fb9;}\n" +
      "      .json .foldable.toggled:hover>.gutter{background-color:#ecb;}\n" +
      "      .json .foldable.toggled:hover>code{background-color:#fdc;}\n" +
      "      .json .folded.line{visibility:collapse;}\n" +
      "      .json .foldable .fold.gutter:before{content:'-';}\n" +
      "      .json .foldable.toggled .fold.gutter:before{content:'+';}\n" +
      "      .json .foldable.toggled code:first-of-type:after{content:' \\2026 ';}\n" +
      "      .json .number.gutter:before{content:counter(line);}\n" +
      "      .json code{text-align:left;}\n" +
      "      .json code .string>.content{color:#080;}\n" +
      "      .json code .key{color:#008;}\n" +
      "      .json code .boolean{color:#066;}\n" +
      "      .json code .number{color:#066;}\n" +
      "      .json code .null{color:#066;}\n" +
      "      .json code .delimiter{color:#660;}\n" +
      "      .json code .separator{color:#660;}\n" +
      "      @media print{\n" +
      "      .json code .string>.content{color:#060;}\n" +
      "      .json code .key{color:#006;font-weight:bold;}\n" +
      "      .json code .boolean{color:#044;}\n" +
      "      .json code .number{color:#044;}\n" +
      "      .json code .null{color:#044;}\n" +
      "      .json code .delimiter{color:#440;}\n" +
      "      .json code .separator{color:#440;}\n" +
      "      }\n" +
      "    </style>\n" +
      '    <script type="application/javascript;version=1.8">\n\
document.addEventListener("DOMContentLoaded", function() {\n\
  let r_folded = / folded\\b/, r_toggled = / toggled\\b/;\n\
  Array.prototype.map.call(document.querySelectorAll(".json [data-fold]"), makeFoldable);\n\
\n\
  function makeFoldable(fold) {\n\
    fold.className += " foldable";\n\
    fold.addEventListener("click", toggleFold, false);\n\
  }\n\
\n\
  function toggleFold() {\n\
    let fold = this.getAttribute("data-fold"),\n\
    folded = this.hasAttribute("data-folded"),\n\
    foldLines = this.parentNode.querySelectorAll("[data-fold" + fold + "]"),\n\
    foldStart = this.querySelector("code");\n\
    toggle(this, "toggled", r_toggled);\n\
    Array.prototype.map.call(foldLines, helper);\n\
    if(folded) {\n\
      this.removeAttribute("data-folded");\n\
      //foldStart.removeChild(foldStart.lastChild);\n\
    } else {\n\
      this.setAttribute("data-folded", "1");\n\
      //let end = document.createTextNode(" \2026 " + foldLines.item(foldLines.length-1).textContent.trim());\n\
      //foldStart.appendChild(end);\n\
    }\n\
\n\
    function helper(line) {\n\
      toggle(line, "folded", r_folded);\n\
    }\n\
\n\
    function toggle(element, style, regex) {\n\
      if(folded) {\n\
        element.className = element.className.replace(regex, "");\n\
      } else {\n\
        element.className += " " + style;\n\
      }\n\
    }\n\
  }\n\
}, false);\n' +
      "    </script>\n" +
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
