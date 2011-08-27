/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Module exporting default JSONovich preferences.
 *
 * Changelog:
 * [2011-05] - Created initial defaults
 */

'use strict';

var defaults = {
    'boolean': {
        'debug': false,            // user set to true enables debugging messages in console
        'acceptHeader.json': false // user set to true adds json mime to http accept header
    },
    'string-ascii': {
        'mime.conversions': [
        'application/json',                // standard, http://www.ietf.org/rfc/rfc4627.txt
        'application/sparql-results+json', // standard, http://www.w3.org/TR/rdf-sparql-json-res/
        'application/schema+json',         // draft, http://json-schema.org/
        'application/jsonrequest',         // proposed, http://json.org/JSONRequest.html
        'application/json-p',              // proposed, http://www.json-p.org/
        'text/json-p',                     // proposed, http://www.json-p.org/
        'application/x-json',              // legacy, officially application/json
        'text/json',                       // legacy, officially application/json
        'text/x-json',                     // legacy, officially application/json
        'application/rdf+json',            // legacy, officially application/json
        'application/jsonml+json'          // unofficial, http://jsonml.org/
        ].join('|'),

        'mime.extensionMap': [
        'json:application/json',
        'srj:application/sparql-results+json'
        ].join('|')
    }
},
contentDefaults = {
    'www.bbc.co.uk': {
        'acceptHeader.json': false
    }
};

/**
 * Dynamically sets default preferences
 *
 * @param setDefaultPref <function>  Reference to the set function for the appropriate default
 *                                   preferences branch, require('prefs').branch(<branch>, true).set
 * @param contentPrefBaseName <string>  Prefix for content preferences
 */
exports.set = function setDefaults(setDefaultPref, contentPrefBaseName) {
    for(let type in defaults) {
        for(let pref in defaults[type]) {
            setDefaultPref(pref, type, defaults[type][pref]);
        }
    }
    if(contentPrefBaseName) {
        if(contentPrefBaseName.charAt(contentPrefBaseName.length - 1) !== '.') {
            contentPrefBaseName += '.';
        }
        for(let host in contentDefaults) {
            for(let pref in contentDefaults[host]) {
                if(!Services.contentPrefs.hasPref(host, contentPrefBaseName + pref)) {
                    Services.contentPrefs.setPref(host, contentPrefBaseName + pref, contentDefaults[host][pref]);
                }
            }
        }
    }
}
