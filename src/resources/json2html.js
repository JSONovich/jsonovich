/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const JSON2HTML = (() => {
  const lineBreaks = {
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
  literal = {
    true: 'true',
    false: 'false',
    null: 'null',
    indent: '  ',
    delim: {
      open: {
        array: '[',
        object: '{',
        string: '"'
      },
      close: {
        array: ']',
        object: '}',
        string: '"'
      }
    },
    sep: {
      value: ',',
      key: ': '
    }
  },
  // From Google code-prettify:
  // Define regexps here so that the interpreter doesn't have to create an
  // object each time the function containing them is called.
  // The language spec requires a new object created even if you don't access
  // the $1 members.
  r_amp = /&/g, r_lt = /</g, r_gt = />/g, r_quot = /\"/g,

  encodeHTML = function(aHtmlSource) {
    return (aHtmlSource+'').replace(r_amp, '&amp;').replace(r_lt, '&lt;').replace(r_gt, '&gt;').replace(r_quot, '&quot;');
  },

  escapeString = function(str) {
    return JSON.stringify(str).slice(1, -1);
  },

  foldStart = function(data) {
    if(data.lines.length > 1) { // root object not collapsible
      data.currentLine.fold = ++data.numFolds;
      data.folds.unshift(data.currentLine.fold);
    }
  },

  formatObject = function(data, obj) {
    const showKeys = Object.prototype.toString.call(obj) !== '[object Array]';
    const mode = showKeys ? "object" : "array";
    const entries = Object.entries(obj);
    new Line(data, "before block");
    data.currentLine.addDelimiter(new Element(literal.delim.open[mode], mode + " delimiter open"));
    if(entries.length) {
      foldStart(data);
      new Line(data, "before items");
      data.currentLine.indentInc(data);
      let first = true;
      for(const [k, v] of entries) {
        if(first) {
          first = false;
        } else {
          new Line(data, "before separator");
          data.currentLine.addDelimiter(new Element(literal.sep.value, mode + " separator"));
          new Line(data, "after separator");
        }
        if(showKeys) {
          data.currentLine.addElement(new Element(literal.delim.open.string, "key delimiter"));
          data.currentLine.addElement(new Element(encodeHTML(escapeString(k)), "key"));
          data.currentLine.addElement(new Element(literal.delim.close.string, "key delimiter"));
          data.currentLine.addElement(new Element(literal.sep.key, "object property separator"));
        }
        formatRecursively(data, v);
      }
      new Line(data, "after items");
      data.currentLine.indentDec(data);
      data.folds.shift();
    }
    data.currentLine.addDelimiter(new Element(literal.delim.close[mode], mode + " delimiter close"));
    new Line(data, "after block");
  },

  formatRecursively = function(data, thing) {
    if(thing == null) {
      data.currentLine.addElement(new Element(literal.null, "null"));
    } else {
      switch(typeof thing) {
          case "number": {
          data.currentLine.addElement(new Element(thing, "number"));
          break;
          }
          case "boolean": {
          data.currentLine.addElement(new Element(thing ? literal.true : literal.false,
            "boolean " + (thing ? "true" : "false")));
          break;
          }
          case "string": {
          data.currentLine.addElement(new Element([
            new Element(literal.delim.open.string, "delimiter"),
            new Element(encodeHTML(escapeString(thing)), "content"),
            new Element(literal.delim.close.string, "delimiter")
            ], "string"));
          break;
          }
          case "object": {
          formatObject(data, thing);
          break;
          }
          default: {
          data.currentLine.addElement(new Element(thing, "unknown"));
          break;
      }
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
        ? (' data-fold' + data.folds.join('="1" data-fold') + '="1"') : '';
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
      gutter = '<span class="line' + (this.fold ? ' foldable" data-fold="' + this.fold : '') + '"' + this.folds, prefix = "";
      if(!content.length && indentContent.length && (!this.indent || ((lineBreaks["before items"] || indentContent[0].css.indexOf("open") === -1) && (lineBreaks["before separator"] || indentContent[0].css.indexOf("separator") === -1)))) {
        content = indentContent;
        indentContent = [];
      }
      if(this.indent) {
        for(let i = this.indent, j = indentContent.length - this.indent, d; i > 0; i--, j++) {
          d = indentContent[j];
          if(d) {
            prefix += d + literal.indent.substr(d.length);
          } else {
            prefix += literal.indent;
          }
        }
      }
      return gutter
        + '><span class="fold gutter"></span><span class="number gutter"></span><code>'
        + (prefix
        + content.join("")).trimRight()
        + "</code></span>";
    }
  };

  return {
    encodeHTML: encodeHTML,
    formatJSON: function(json) {
      const data = {
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
})();
