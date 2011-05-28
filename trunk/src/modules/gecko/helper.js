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
 * The Original Code is JSONovich Gecko helper module.
 *
 * The Initial Developer of the Original Code is
 * William Elwood <we9@kent.ac.uk>.
 * Portions created by the Initial Developer are Copyright (C) 2011
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
 * This file contains utility functions and initialisation specific to Gecko environments.
 *
 * Changelog:
 * [2011-05] - Added require and log functions and closure for initialisation.
 *
 * NOTES:
 * - Assumes 'Services.scriptloader' has already been set up by the relevant
 *   bootstrap script (importing or emulating Services.jsm)
 * - Assumes the ADDON_LNAME constant is defined by the relevant bootstrap script
 * - Assumes the getResourceURI function is defined by the relevant bootstrap script
 */

'use strict';

let defaults = {
    'boolean': {
        'debug': false,           // user set to true enables debugging messages in console
        'acceptHeader.json': true // user set to false stops us adding json mime to http accept header
    },
    'string-ascii': {

        'mime.conversions': [
        'application/json',                // http://www.ietf.org/rfc/rfc4627.txt
        'application/x-json',              // legacy, officially application/json
        'text/json',                       // legacy, officially application/json
        'text/x-json',                     // legacy, officially application/json
        'application/jsonrequest',         // http://json.org/JSONRequest.html
        'application/sparql-results+json', // http://www.w3.org/TR/rdf-sparql-json-res/
        'application/rdf+json',            // legacy, officially application/json
        'application/schema+json',         // http://json-schema.org/
        'application/*+json'               // untested, not expected to work as a wildcard
        ].join('|'),

        'mime.extensionMap': [
        'json:application/json',
        'srj:application/sparql-results+json'
        ].join('|')
    }
};

/**
 * Because this is a simple loader, path is always resolved to:
 *   'modules/' + path + '.js'
 * relative to this addon's installation root.
 * There is also no support for circular dependencies - don't use them...
 *
 * @param path <string>  Path to desired module.
 * @return <object>      The loaded module.
 */
function require(path) {
    let registry = require.registry;
    if(registry == null) { // Initialise the module registry on the first usage
        registry = require.registry = {};
    }

    if(!registry[path]) {
        let scope = {
            require: require
        }; // Load the module into a local scope
        Services.scriptloader.loadSubScript(getResourceURI('modules/' + path + '.js').spec, scope);

        let module = scope; // Construct the module for return
        if(scope.exports) { // Support CommonJS style
            module = scope.exports;
        } else if(scope.EXPORTED_SYMBOLS && scope.EXPORTED_SYMBOLS.length) { // Support existing .jsm style
            for(let i = 0; i < scope.EXPORTED_SYMBOLS.length; i++) {
                module[scope.EXPORTED_SYMBOLS[i]] = scope[scope.EXPORTED_SYMBOLS[i]];
            }
        }

        registry[path] = module; // Save the loaded module for repeated require()s
    }

    return registry[path];
}

function startup() {
    let unload = require('unload').unload;
    let prefs = require(PLATFORM + '/prefs').branch;
    let setDefaultPref = prefs('extensions.' + ADDON_LNAME, true).set;
    for(let type in defaults) {
        for(let pref in defaults[type]) {
            setDefaultPref(pref, type, defaults[type][pref]);
        }
    }
    let listenPref = prefs('extensions.' + ADDON_LNAME).listen;

    listenPref('debug', function(branch, pref) {
        require(PLATFORM + '/log').setDebug(branch.get(pref, 'boolean'));
    });

    function setAcceptHeader(acceptPart, enabled) {
        function setCleanAccept(suffix) {
            let pref = prefs('network.http.accept');
            let accept = pref.get('default', 'string-ascii');
            if(suffix && accept.indexOf(acceptPart) != -1) {
                return; // already accepting specified suffix
            }
            accept = accept.split(',');
            let index;
            while((index = accept.indexOf(acceptPart)) != -1) {
                accept.splice(index, 1);
            }
            if(suffix) {
                accept.push(acceptPart);
            }
            pref.set('default', 'string-ascii', accept.join(','));
        }

        if(enabled) {
            setCleanAccept(true);
            unload(setCleanAccept);
        } else {
            setCleanAccept();
        }
    }
    listenPref('acceptHeader.json', function(branch, pref) {
        // maybe we can add a lower q-value in the future, track https://issues.apache.org/jira/browse/COUCHDB-234
        setAcceptHeader('application/json', branch.get(pref, 'boolean'));
    });

    (function registerConversions() { // dynamically register converters
        let cid = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}");
        let aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        let factory = require('jsonStreamConverter').factory;
        let unregister = function() {
            try {
                aCompMgr.unregisterFactory(cid, factory);
            } catch(e) {
                if(e.name != 'NS_ERROR_FACTORY_NOT_REGISTERED') {
                    require(PLATFORM + '/log').error(e);
                }
            }
        };
        listenPref('mime.conversions', function(branch, pref) {
            let conversions = branch.get(pref, 'string-ascii').split('|');
            if(conversions.length) {
                unregister();
                let tmpFactory = factory;
                try {
                    for(let i = 0; i < conversions.length; i++) {
                        try {
                            aCompMgr.registerFactory(cid, ADDON_NAME,
                                '@mozilla.org/streamconv;1?from=' + conversions[i] + '&to=*/*',
                                tmpFactory);
                        } catch(e) {
                            if(e.name == 'NS_ERROR_FACTORY_EXISTS') { // this only happens in Gecko 2+...
                                tmpFactory = null; // set null to avoid factory exists warning
                                i--; // and try again
                            } else {
                                require(PLATFORM + '/log').error(e);
                            }
                        }
                    }
                } finally {
                    unload(unregister);
                }
            }
        });
    })();

    (function registerExtMap() { // dynamically register filetype mapping
        let aCatMgr = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
        let registered = [];
        let unregister = function() {
            for(let i = 0; i < registered.length; i++) {
                aCatMgr.deleteCategoryEntry('ext-to-type-mapping', registered[i], false);
            }
        };
        listenPref('mime.extensionMap', function(branch, pref) {
            let extensions = branch.get(pref, 'string-ascii').split('|');
            if(extensions.length) {
                unregister();
                try {
                    for(let i = 0; i < extensions.length; i++) {
                        let ext = extensions[i].split(':');
                        if(ext.length == 2) {
                            aCatMgr.addCategoryEntry('ext-to-type-mapping', ext[0], ext[1], false, true);
                            registered.push(ext[0]);
                        }
                    }
                } finally {
                    unload(unregister);
                }
            }
        });
    })();

    (function setResourceAlias(alias, target) { // set up resource:// URLs
        let proto = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
        proto.setSubstitution(alias, target);
        unload(function() {
            proto.setSubstitution(alias, null);
        });
    })(ADDON_LNAME, getResourceURI('resources/')); // trailing slash required inside XPI
}

function uninstall() {
    let prefs = require(PLATFORM + '/prefs').branch;
    prefs('extensions.' + ADDON_LNAME, true).uninstall();
    prefs('extensions.' + ADDON_LNAME + '@' + ADDON_DOMAIN, true).uninstall();
}

function shutdown() {
    require('unload').unload();
}
