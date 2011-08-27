/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Registers resource:// aliases.
 *
 * Changelog:
 * [2011-07] - Created separate module for resource:// URLs
 */

'use strict';

/**
 * Dynamically register a resource:// alias
 *
 * @param alias <string>  The unique alias part of the resource URL.
 * @param target <nsIURI>  Path to point alias at.
 */
exports.register = function registerResourceAlias(alias, target) {
    let proto = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
    proto.setSubstitution(alias, target);
    require('unload').unload(function() {
        proto.setSubstitution(alias, null);
    });
}
