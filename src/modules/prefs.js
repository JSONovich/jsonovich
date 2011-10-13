/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @copyright Portions (C) 2010 the Mozilla Foundation.
 * @description This file contains utilities for managing addon preferences specific to Gecko environments.
 *
 * Changelog:
 * [2011-05] - Created preferences manager
 */

'use strict';

const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = "nsPref:changed";

/**
 * Preferences wrapped in a closure per branch
 */
exports.branch = function selectBranch(name, defaults) {
    if(!name || typeof name != 'string' || !name.length) {
        return null; // disallow root branch
    }
    if(name.charAt(name.length-1)!='.') {
        name += '.';
    }
    var branch = defaults ? Services.prefs.getDefaultBranch(name) : Services.prefs.getBranch(name),
    returnObj = {};

    if(defaults) {
        /**
         * Deletes the selected default branch and the user branch of the same name, please
         * use responsibly to handle uninstallation of the addon's own preferences only.
         */
        returnObj.uninstall = function deleteBranch() {
            branch.deleteBranch('');
        };
    } else {
        (function() {
            var listener = {
                callbacks: {},
                listening: false,
                observe: function(subject, topic, data) {
                    if(subject == branch && topic == NS_PREFBRANCH_PREFCHANGE_TOPIC_ID) {
                        if(listener.callbacks.hasOwnProperty(data)) {
                            listener.callbacks[data](returnObj, data);
                        }
                        if(listener.callbacks.hasOwnProperty('')) {
                            listener.callbacks[''](returnObj, data);
                        }
                    }
                },
                start: function() {
                    listener.listening = true;
                    branch.QueryInterface(Ci.nsIPrefBranch2);
                    branch.addObserver('', listener, false);
                    require('unload').unload(listener.stop);
                },
                stop: function() {
                    if(branch) {
                        branch.removeObserver('', listener);
                    }
                    listener.callbacks = {};
                    listener.listening = false;
                }
            };

            /**
             * This function efficiently handles observing several preferences with their own
             * callbacks using a single preference listener on the branch.
             *
             * @usage listenPref(pref, callback): Execute callback whenever pref changes.
             * @param pref <string>  The preference to observe for changes.
             * @param callback <function>  A 2-parameter function to execute whenever the specified preference
             *                             in this branch is changed, parameters will be 1) the closure returned
             *                             from the original selectBranch call containing this preferences API
             *                             and 2) the name of the changed preference relative to the branch.
             *                             Any previous callback for this pref will be overwritten, if multiple
             *                             callbacks needed use another instance of the outer branch object or
             *                             combine them for efficiency into a single callback.
             *
             * @usage listenPref(pref): Remove callback stored for pref.
             * @param pref <string>  The preference to stop observing for changes.
             */
            returnObj.listen = function listenPref(pref, callback) {
                if(callback) {
                    if(pref === '' || pref[pref.length-1] === '.') {
                        let prefs = branch.getChildList(pref, {});
                        for(let i = 0; i < prefs.length; i++) {
                            if(prefs[i].indexOf(pref) != 0) {
                                break;
                            }
                            callback(returnObj, prefs[i]);
                        }
                    } else {
                        callback(returnObj, pref);
                    }
                    listener.callbacks[pref] = callback;
                    if(!listener.listening) {
                        listener.start();
                    }
                } else {
                    delete listener.callbacks[pref];
                    if(isEmpty(listener.callbacks)) {
                        listener.stop();
                    }
                }
            };
        })();

        /**
         * @param pref <string>  The preference to get relative to the branch.
         * @param type <string>  The type of value to get (boolean, integer, string-ascii,
         *                       string-unicode, string-locale, file-abs, file-rel)
         * @return <bool|int|string|nsISupportsString|nsIPrefLocalizedString
         *              |nsILocalFile|nsIRelativeFilePref>
         *                       The requested value, or the default if not set, or null if default not set.
         */
        returnObj.get = function getPref(pref, type) {
            try {
                switch(type) {
                    case 'boolean':
                        return branch.getBoolPref(pref);
                    case 'integer':
                        return branch.getIntPref(pref);
                    case 'string-ascii':
                        return branch.getCharPref(pref);
                    case 'string-unicode':
                        return branch.getComplexType(pref, Ci.nsISupportsString).data;
                    case 'string-locale':
                        return branch.getComplexType(pref, Ci.nsIPrefLocalizedString).data;
                    case 'file-abs':
                        return branch.getComplexType(pref, Ci.nsILocalFile).data;
                    case 'file-rel':
                        return branch.getComplexType(pref, Ci.nsIRelativeFilePref).data;
                    default:
                        require('log').error('Unexpected pref type "' + type + '" in getPref.');
                }
            } catch(e) {
                if(e.name != 'NS_ERROR_UNEXPECTED') {
                    require('log').debug(e);
                }
            }
            return null;
        };

        returnObj.getChildList = function getChildPrefsList() {
            return branch.getChildList('', {});
        };

        returnObj.unset = function clearPref(pref) {
            try {
                branch.clearUserPref(pref);
            } catch(e) { // throws if pref non-existant in Gecko<6
            }
        };
    }

    /**
     * @param pref <string>  The preference to be set relative to the branch.
     * @param type <string>  The type of value to set (boolean, integer, string-ascii,
     *                       string-unicode, string-locale, file-abs, file-rel)
     * @param value <bool|int|string|nsISupportsString|nsIPrefLocalizedString
     *              |nsILocalFile|nsIRelativeFilePref>
     *                       The value to set.
     */
    returnObj.set = function setPref(pref, type, value) {
        switch(type) {
            case 'boolean':
                branch.setBoolPref(pref, value);
                break;
            case 'integer':
                branch.setIntPref(pref, value);
                break;
            case 'string-ascii':
                branch.setCharPref(pref, value);
                break;
            case 'string-unicode':
                if(typeof value == 'string') {
                    let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
                    str.data = value;
                    value = str;
                }
                prefs.setComplexValue(pref, Ci.nsISupportsString, value);
                break;
            case 'string-locale':
                if(typeof value == 'string') {
                    let pls = Cc["@mozilla.org/pref-localizedstring;1"].createInstance(Ci.nsIPrefLocalizedString);
                    pls.data = value;
                    value = pls;
                }
                prefs.setComplexValue(pref, Ci.nsIPrefLocalizedString, value);
                break;
            case 'file-abs':
                if(typeof value == 'string') {
                    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
                    file.initWithPath(value);
                    value = file;
                }
                prefs.setComplexValue(pref, Ci.nsILocalFile, value);
                break;
            case 'file-rel':
                // see https://developer.mozilla.org/en/Code_snippets/File_I%2f%2fO#Relative_path_(nsIRelativeFilePref)
                prefs.setComplexValue(pref, Ci.nsIRelativeFilePref, value);
                break;
            default:
                require('log').error('Unexpected pref type "' + type + '" in setPref.');
                break;
        }
    };

    return returnObj;
}
