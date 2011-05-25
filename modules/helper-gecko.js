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
            exports: {}
        }; // Load the module into a local scope
        Services.scriptloader.loadSubScript(getResourceURI('modules/' + path + '.js').spec, scope);

        let module = {}; // Construct the module for return
        if(scope.exports.length) { // Support CommonJS style
            module = scope.exports;
        } else if(scope.EXPORTED_SYMBOLS && scope.EXPORTED_SYMBOLS.length) { // Support existing .jsm style
            for(let i = 0; i < scope.EXPORTED_SYMBOLS.length; i++) {
                module[scope.EXPORTED_SYMBOLS[i]] = scope[scope.EXPORTED_SYMBOLS[i]];
            }
        } else {
            delete scope.exports;
            module = scope;
        }

        registry[path] = module; // Save the loaded module for repeated require()s
    }

    return registry[path];
}

function log(msg) {
    if(DEBUG) {
        Services.console.logStringMessage(msg);
    }
}

(function() {
    // Set up resource:// URLs
    function setResourceAlias(alias, target) {
        let proto = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
        proto.setSubstitution(alias, target);
        require('unload').unload(function() {
            proto.setSubstitution(alias, null);
        });
    }
    setResourceAlias(ADDON_LNAME, getResourceURI('resources/')); // trailing slash required inside XPI

    require('jsonStreamConverter');
})();