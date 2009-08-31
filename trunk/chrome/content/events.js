const EXTENSION_ID = "jsonovich@lackoftalent.org";

var UninstallObserver = {
  _uninstall : false,

  observe: function (aSubject, aTopic, aData) {
    if (aTopic == "em-action-requested") {
      aSubject.QueryInterface(Ci.nsIUpdateItem);
      if (aSubject.id == EXTENSION_ID) {
	if (aData == "item-uninstalled") {
	  this._uninstall = true;
	}
	else if (data == "item-cancel-action") {
	  this._uninstall = false;
	}
      }
    }
    else if (aTopic == "quit-application-granted") {
      if (this._uninstall) {
	var prefManager = Cc["@mozilla.org/preferences-service;1"]
			    .getService(Ci.nsIPrefBranch);
	var acceptHeader = prefManager.getCharPref("network.http.accept.default");
	if (acceptHeader.indexOf("application/json") != -1) {
	  acceptHeader = acceptHeader.replace(/,application\/json;q=0\.95/, "");
	  prefManager.setCharPref("network.http.accept.default", acceptHeader);
	}
	prefManager.setBoolPref("extensions.jsonovich.installed", false);
      }
      this.unregister();
    }
  },

  register: function () {
    var observerService = Cc["@mozilla.org/observer-service;1"]
			    .getService(Ci.nsIObserverService);
    observerService.addObserver(this, "em-action-requested", false);
    observerService.addObserver(this, "quit-application-granted", false);
  },

  unregister: function () {
    var observerService = Cc["@mozilla.org/observer-service;1"]
			    .getService(Ci.nsIObserverService);
    observerService.removeObserver(this,"em-action-requested");
    observerService.removeObserver(this,"quit-application-granted");
  }
}

var jsonovich_init = function () {
  var prefManager = Cc["@mozilla.org/preferences-service;1"]
		      .getService(Ci.nsIPrefBranch);
  var acceptHeader = prefManager.getCharPref("network.http.accept.default");
  if (acceptHeader.indexOf("application/json") == -1) {
    acceptHeader += ",application/json;q=0.95";
    prefManager.setCharPref("network.http.accept.default", acceptHeader);
  }
  prefManager.setBoolPref("extensions.jsonovich.installed", true);

  UninstallObserver.register();
}

window.addEventListener("load", jsonovich_init, false);

