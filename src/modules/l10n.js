/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2012 JSONovich Team. All Rights Reserved.
 * @copyright Portions (C) 2010 the Mozilla Foundation.
 * @description Helper for localisation.
 */

'use strict';

exports.register = function register() {
    require('unload').unload(Services.strings.flushBundles);
};

exports.bundle = function getBundle(name) {
    if(!name || typeof name != 'string' || !name.length) {
        return null;
    }
    var file = 'chrome://' + ADDON_LNAME + '/locale/' + name + '.properties';
    var bundle = Services.strings.createBundle(file);

    return function(key, params) {
        try {
            if(arguments.length < 2) {
                return bundle.GetStringFromName(key);
            }
            if(!Array.isArray(params)) {
                params = [].slice.call(arguments, 1);
            }
            return bundle.formatStringFromName(key, params, params.length);
        } catch(e) {
            require('log').debug(key + ' not found in ' + name + ' (' + file + ')');
            return '»' + key + '«';
        }
    };
}
