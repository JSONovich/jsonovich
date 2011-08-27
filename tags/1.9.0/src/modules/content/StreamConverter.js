/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Changes JSON MIME types to Javascript to trigger display in browser.
 *
 * Changelog:
 * [2011-07] - Created new simple stream converter to force me to implement support for Javascript MIME type
 *           - Registration function merged to ease support for Electrolysis
 */

'use strict';

let cid = exports.cid = Components.ID("{dcc31be0-c861-11dd-ad8b-0800200c9a66}"),
prefName = 'mime.conversions';

/**
 * Dynamically register converters
 *
 * @param listenPref <function>  Reference to the listen function for the appropriate preferences
 *                               branch, require('prefs').branch(<branch>).listen
 */
exports.register = function registerConversions(listenPref) {
    let webNavInfo = null,
    aCompMgr = Cm.QueryInterface(Ci.nsIComponentRegistrar),
    factory = require('content/jsonStreamConverter').factory, // TODO: switch to JSON2JSFactory when we can listen to page-load DOM events and handle JSON from there
    unregister = function() {
        try {
            aCompMgr.unregisterFactory(cid, factory);
        } catch(e) {
            if(e.name != 'NS_ERROR_FACTORY_NOT_REGISTERED') {
                require('log').error(e);
            }
        }
    };
    listenPref(prefName, function(branch, pref) {
        let tmpFactory = factory,
        orig = branch.get(pref, 'string-ascii'),
        conversions = orig.split('|');
        if(!conversions.length) {
            return;
        }
        unregister();
        try {
            let validConversions = [];
            for(let i = 0; i < conversions.length; i++) {
                // slow, don't check on 1st pass (assume preference valid on startup)
                if(webNavInfo && webNavInfo.UNSUPPORTED != webNavInfo.isTypeSupported(conversions[i], null)) {
                    require('log').debug('Invalid MIME type conversion: "' + conversions[i] + '" is already handled by the browser, cannot override.')
                    continue;
                }
                try {
                    aCompMgr.registerFactory(cid, ADDON_NAME, '@mozilla.org/streamconv;1?from=' + conversions[i] + '&to=*/*', tmpFactory);
                    validConversions.push(conversions[i]);
                } catch(e) {
                    if(e.name == 'NS_ERROR_FACTORY_EXISTS') { // this only happens in Gecko 2+...
                        tmpFactory = null; // set null to avoid factory exists warning
                        i--; // and try again
                    } else {
                        throw e;
                    }
                }
            }
            validConversions = validConversions.join('|');
            if(orig != validConversions) { // some conversions were invalid, let's remove them from prefs
                branch.set(pref, 'string-ascii', validConversions);
            }
        } catch(e) {
            require('log').error('Uncaught exception in "' + pref + '" listener - ' + e);
        } finally {
            require('unload').unload(unregister);
        }
        webNavInfo = Cc["@mozilla.org/webnavigation-info;1"].getService(Ci.nsIWebNavigationInfo)
    });
}

/*
 * -----------------------------------------------------------------
 * NOT YET IN USE
 * -----------------------------------------------------------------
 *//*
function JSON2JS() {}
JSON2JS.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamConverter, Ci.nsIStreamListener, Ci.nsIRequestObserver]),

    // nsIStreamConverter::convert
    convert: function(aStream, aFromType, aToType, aCtx) {
        return aStream;
    },

    // nsIStreamConverter::asyncConvertData
    asyncConvertData: function(aFromType, aToType, aListener, aCtx) {
        this.listener = aListener; // Store the listener passed to us
    },

    // nsIStreamListener::onDataAvailable
    onDataAvailable: function(aReq, aCtx, aStream, aOffset, aCount) {
        this.listener.onDataAvailable(aReq, aCtx, aStream, aOffset, aCount);
    },

    // nsIRequestObserver::onStartRequest
    onStartRequest: function(aReq, aCtx) {
        aReq.QueryInterface(Ci.nsIChannel).contentType = "application/javascript"; // Browser already takes care of displaying this type, hitch a free ride
        this.listener.onStartRequest(aReq, aCtx);
    },

    // nsIRequestObserver::onStopRequest
    onStopRequest: function(aReq, aCtx, aStatus) {
        this.listener.onStopRequest(aReq, aCtx, aStatus);
    }
};

var JSON2JSFactory = {
    // nsIFactory::createInstance
    createInstance: function(aOuter, aIid) {
        if(aOuter != null) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
        }
        return (new JSON2JS()).QueryInterface(aIid);
    }
};
*/
