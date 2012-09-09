/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Dual-purpose code to support Electrolysis process separation.
 *
 * "The properties of electrolytes may be exploited using electrolysis to extract constituent elements
 *  and compounds contained within the solution."
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
            Services: Services,
            XPCOMUtils: XPCOMUtils,
            isEmpty: isEmpty,
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
    var lifecycle = [require(ADDON_LNAME)]; // code common to both types of process
    if(IN_CONTENT) {
        lifecycle.unshift(require('content/' + ADDON_LNAME)); // code only needed in content processes
    }
    if(IN_CHROME) {
        lifecycle.unshift(require('chrome/' + ADDON_LNAME)); // code only needed in the main process
    }

    function cycle(mode, args) {
        if(args && !Array.isArray(args)) {
            args = [args];
        }
        lifecycle.forEach(function(lc) {
            if(typeof lc[mode] === 'function') {
                lc[mode].apply(global, args);
            }
        });
    }

    ['startup', 'uninstall', 'shutdown'].forEach(function(mode) {
        global[mode] = function(args) {
            cycle(mode, args);
        }
    });
})(this);
