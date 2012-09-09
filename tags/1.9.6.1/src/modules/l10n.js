/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2012 JSONovich Team. All Rights Reserved.
 * @copyright Portions (C) 2010 the Mozilla Foundation.
 * @description Helper for localisation.
 */

'use strict';

var userLocale;

XPCOMUtils.defineLazyGetter(this, 'browserLocale', function() {
    var branch = require('prefs').branch('general.useragent');
    return function() {
        return branch.get('locale', 'string-locale');
    };
});

exports.register = function register(listenPref) {
    listenPref = listenPref || require('prefs').branch(ADDON_PREFROOT).listen;
    listenPref('locale', function(branch, pref) {
        userLocale = branch.get(pref, 'string-locale');
        if(!userLocale) {
            userLocale = browserLocale();
        }
    });
    require('unload').unload(function() {
        Services.strings.flushBundles();
    });
};

exports.bundle = function getBundle(name) {
    if(!name || typeof name != 'string' || !name.length) {
        return null;
    }
    var file;
    if(userLocale) {
        file = getResourceURI('locale/' + userLocale + '/' + name + '.properties');
    }
    if(!file || !file.exists()) {
        file = getResourceURI('locale/en-GB/' + name + '.properties');
    }
    var bundle = Services.strings.createBundle(file.spec);

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
            require('log').debug(key + ' not found in ' + name + ' (' + file.spec + ')');
            return '»' + key + '«';
        }
    };
}
