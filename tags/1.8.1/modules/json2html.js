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
 * The Original Code is JSON to HTML stringifier.
 *
 * The Initial Developer of the Original Code is
 * William Elwood <we9@kent.ac.uk>.
 * Portions created by the Initial Developer are Copyright (C) 2010
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
 * [2010-12] - Created custom JSON stringifier for JSONovich extension
 *              + No need for Google Code Prettify library
 *              + Initial work towards user-customisable formatting
 */

'use strict';

var EXPORTED_SYMBOLS = ["JSON2HTML"],
JSON2HTML = function() {
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
          if(Object.prototype.toString.call(thing) === '[object Array]') {
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