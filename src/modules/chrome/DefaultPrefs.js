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
        'debug': false,           // user set to true enables debugging messages in console
        'acceptHeader.json': true // user set to false stops us adding json mime to http accept header
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
};

/**
 * Dynamically sets default preferences
 *
 * @param setDefaultPref <function>  Reference to the set function for the appropriate default
 *                                   preferences branch, require('prefs').branch(<branch>, true).set
 */
exports.set = function setDefaults(setDefaultPref) {
    for(var type in defaults) {
        for(var pref in defaults[type]) {
            setDefaultPref(pref, type, defaults[type][pref]);
        }
    }
}
