/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description This file contains helper functions specific to Gecko environments.
 *
 * Changelog:
 * [2011-05] - Added require, startup, uninstall and shutdown functions.
 *
 * NOTES:
 * - Assumes 'Services.scriptloader' has already been set up by the relevant
 *   bootstrap script (importing or emulating Services.jsm)
 * - Assumes the ADDON_LNAME constant is defined by the relevant bootstrap script
 * - Assumes the getResourceURI function is defined by the relevant bootstrap script
 */

'use strict';

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
    let prefs = require(PLATFORM + '/prefs').branch;
    require('defaultPrefs').setDefaults(prefs('extensions.' + ADDON_LNAME, true).set);

    let listenPref = prefs('extensions.' + ADDON_LNAME).listen;
    listenPref('debug', function(branch, pref) {
        require(PLATFORM + '/log').setDebug(branch.get(pref, 'boolean'));
    });

    let prefUtils = require(PLATFORM + '/prefUtils');
    prefUtils.registerConversions(listenPref);
    prefUtils.registerExtMap(listenPref);
    // maybe we can add a lower q-value in the future, track https://issues.apache.org/jira/browse/COUCHDB-234
    prefUtils.registerAcceptHeader(listenPref, 'acceptHeader.json', 'application/json');

    (function setResourceAlias(alias, target) { // set up resource:// URLs
        let proto = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
        proto.setSubstitution(alias, target);
        require('unload').unload(function() {
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
