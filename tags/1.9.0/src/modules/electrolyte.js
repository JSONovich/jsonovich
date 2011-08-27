/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Dual-purpose code to support Electrolysis process separation.
 *
 * "The properties of electrolytes may be exploited using electrolysis to extract constituent elements
 *  and compounds contained within the solution."
 *
 * Changelog:
 * [2011-07] - Created module shared between chrome and content sides of Electrolysis
 *
 * NOTES:
 * - Assumes 'Services.scriptloader' has already been set up by the relevant
 *   bootstrap script (importing or emulating Services.jsm)
 * - Assumes the getResourceURISpec function is defined by the relevant bootstrap script
 */

'use strict';

/**
 * Helper to test for empty objects.
 *
 * @param obj <object>  Object to test for emptiness.
 * @return <boolean>    True if object is empty.
 */
function isEmpty(obj) {
    if(obj)
        for(var prop in obj)
            if(obj.hasOwnProperty(prop))
                return false;
    return true;
}

/**
 * A simple module loader, path is always resolved to:
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
        registry[path] = {};
        let scope = {
            TS: TS,
            ADDON_NAME: ADDON_NAME,
            ADDON_LNAME: ADDON_LNAME,
            ADDON_DOMAIN: ADDON_DOMAIN,
            ADDON_PREFROOT: 'extensions.' + ADDON_LNAME,
            IN_CHROME: IN_CHROME,
            IN_CONTENT: IN_CONTENT,
            Cc: Cc,
            Ci: Ci,
            Cm: Cm,
            Cr: Cr,
            Cu: Cu,
            getResourceURI: getResourceURI,
            getResourceURISpec: getResourceURISpec,
            require: require,
            exports: registry[path],
            module: {
                exports: registry[path]
            }
        }; // Load the module into a local scope
        Services.scriptloader.loadSubScript(getResourceURISpec('modules/' + path + '.js'), scope);

        let module;
        if(!isEmpty(scope.exports)) { // Support CommonJS style
            module = scope.exports;
        } else if(!isEmpty(scope.module.exports)) { // Support node.js style
            module = scope.module.exports;
        } else if(scope.EXPORTED_SYMBOLS && scope.EXPORTED_SYMBOLS.length && scope.EXPORTED_SYMBOLS instanceof Array) { // Support JavaScript code module style
            module = {};
            for(let i = 0; i < scope.EXPORTED_SYMBOLS.length; i++) {
                module[scope.EXPORTED_SYMBOLS[i]] = scope[scope.EXPORTED_SYMBOLS[i]];
            }
        } else { // Support plain old JS
            module = {};
            for(var prop in scope)
                if(scope.hasOwnProperty(prop) && prop != 'require' && prop != 'exports' && prop != 'module')
                    module[prop] = scope[prop];
        }

        registry[path] = module; // Save the loaded module for repeated require()s
    }

    return registry[path];
}

(function(global) {
    var chromeProcess = IN_CHROME ? require('chrome/' + ADDON_LNAME) : null,
    contentProcess = IN_CONTENT ? require('content/' + ADDON_LNAME) : null,
    bothProcesses = require(ADDON_LNAME);

    global.startup = function startup(once) {
        if(chromeProcess && (typeof chromeProcess.startup === 'function')) {
            chromeProcess.startup();
        }
        if(contentProcess && (typeof contentProcess.startup === 'function')) {
            contentProcess.startup(once);
        }
        if(typeof bothProcesses.startup === 'function'){
            bothProcesses.startup();
        }
    };

    global.uninstall = function uninstall() {
        if(chromeProcess && (typeof chromeProcess.uninstall === 'function')) {
            chromeProcess.uninstall();
        }
        if(contentProcess && (typeof contentProcess.uninstall === 'function')) {
            contentProcess.uninstall();
        }
        if(typeof bothProcesses.uninstall === 'function'){
            bothProcesses.uninstall();
        }
    };

    global.shutdown = function shutdown() {
        if(chromeProcess && (typeof chromeProcess.shutdown === 'function')) {
            chromeProcess.shutdown();
        }
        if(contentProcess && (typeof contentProcess.shutdown === 'function')) {
            contentProcess.shutdown();
        }
        if(typeof bothProcesses.shutdown === 'function'){
            bothProcesses.shutdown();
        }
    };
})(this);
