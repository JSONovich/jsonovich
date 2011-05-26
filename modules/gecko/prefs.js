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
 * The Original Code is JSONovich Gecko preferences module.
 *
 * The Initial Developer of the Original Code is
 * William Elwood <we9@kent.ac.uk>.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  - Gecko 2 emulation from mozilla-central.
 *    Portions Copyright (C) 2010 the Mozilla Foundation.
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
 * This file contains utilities for managing addon preferences specific to Gecko environments.
 *
 * Changelog:
 * [2011-05] - Created preferences manager
 *
 * TODO: when dropping Gecko 1.9.2/Firefox 3.6 support, remove emulation of Services.jsm.
 */

'use strict';

if(!Services.prefs) { // emulate Services.jsm (introduced in Gecko 2/FF4)
    // see http://hg.mozilla.org/mozilla-central/diff/78e5543c0bc4/toolkit/content/Services.jsm
    XPCOMUtils.defineLazyGetter(Services, "prefs", function () {
        return Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch2);
    });
}
if(!Services.contentPrefs) {
    // see http://hg.mozilla.org/mozilla-central/diff/3ccadf603301/toolkit/content/Services.jsm
    XPCOMUtils.defineLazyServiceGetter(Services, "contentPrefs", "@mozilla.org/content-pref/service;1", "nsIContentPrefService");
}
const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = "nsPref:changed";

function normaliseBranch(branch) {
    if(typeof branch == 'string') {
        if(branch.length && branch.charAt(branch.length-1)!='.') {
            branch += '.';
        }
        return Services.prefs.getBranch(branch);
    }
    return branch.QueryInterface(Ci.nsIPrefBranch2);
}

/**
 * @param callback <function>  A 2-parameter function to execute whenever any preference in
 *                             the specified branch is changed, parameters will be the
 *                             appropriate branch as an instance of nsIPrefBranch and
 *                             the name of the changed preference relative to the branch.
 * @param branch <string|nsIPrefBranch>  The optional branch in the preferences tree, default root.
 * @return <function>  A 0-parameter function that stops this listener.
 */
function listenPref(callback, branch) {
    if(branch) {
        branch = normaliseBranch(branch);
    } else {
        branch = Services.prefs; // assume root
    }
    branch = normaliseBranch(branch);
    let listener = {
        observe: function(subject, topic, data) {
            if(topic == NS_PREFBRANCH_PREFCHANGE_TOPIC_ID) {
                callback(subject, data);
            }
        }
    };

    branch.addObserver('', listener, false);
    branch.getChildList('', {}).forEach(function(name) {
        listener.observe(branch, NS_PREFBRANCH_PREFCHANGE_TOPIC_ID, name);
    });

    function removeListener() {
        if(branch) {
            branch.removeObserver('', listener);
        }
    }
    return removeListener;
}

/**
 * @param pref <string>  The preference to get relative to the branch.
 * @param type <string>  The type of value to get (boolean, integer, string-ascii,
 *                       string-unicode, string-locale, file-abs, file-rel)
 * @param branch <string|nsIPrefBranch>  The optional branch in the preferences tree, default root.
 */
function getPref(pref, type, branch) {
    if(branch) {
        branch = normaliseBranch(branch);
    } else {
        branch = Services.prefs; // assume root
    }
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
            log('Unexpected pref type "' + type + '" in getPref.');
            return null;
    }
}

/**
 * @param pref <string>  The preference to be set relative to the branch.
 * @param type <string>  The type of value to set (boolean, integer, string-ascii,
 *                       string-unicode, string-locale, file-abs, file-rel)
 * @param value <bool|int|string|nsISupportsString|nsIPrefLocalizedString
 *              |nsILocalFile|nsIRelativeFilePref>
 *                       The value to set.
 * @param branch <string|nsIPrefBranch>  The optional branch in the preferences tree, default root.
 */
function setPref(pref, type, value, branch) {
    if(branch) {
        branch = normaliseBranch(branch);
    } else {
        branch = Services.prefs; // assume root
    }
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
            log('Unexpected pref type "' + type + '" in setPref.');
            break;
    }
}

var exports = {
    listen: listenPref,
    get: getPref,
    set: setPref
};
