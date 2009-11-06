if (!jsonovich) {
  var jsonovich = {};
}

jsonovich.overlay = {
  init: function () {
    var prefManager = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefBranch);
    var acceptHeader = prefManager.getCharPref("network.http.accept.default");
    if (acceptHeader.indexOf("application/json") == -1) {
      acceptHeader += ",application/json";
      prefManager.setCharPref("network.http.accept.default", acceptHeader);
    }
    prefManager.setBoolPref("extensions.jsonovich.installed", true);
    jsonovich.overlay.UninstallObserver.register();
  },

  UninstallObserver: {
    _uninstall : false,

    observe: function (aSubject, aTopic, aData) {
      if (aTopic == "em-action-requested") {
	aSubject.QueryInterface(Ci.nsIUpdateItem);
	if (aSubject.id == "jsonovich@lackoftalent.org") {
	  if (aData == "item-uninstalled") {
	    jsonovich.overlay.UninstallObserver._uninstall = true;
	  }
	  else if (data == "item-cancel-action") {
	    jsonovich.overlay.UninstallObserver._uninstall = false;
	  }
	}
      }
      else if (aTopic == "quit-application-granted") {
	if (jsonovich.overlay.UninstallObserver._uninstall) {
	  var prefManager = Cc["@mozilla.org/preferences-service;1"]
			      .getService(Ci.nsIPrefBranch);
	  var acceptHeader = prefManager.getCharPref("network.http.accept.default");
	  if (acceptHeader.indexOf("application/json") != -1) {
	    acceptHeader = acceptHeader.replace(/,application\/json/, "");
	    prefManager.setCharPref("network.http.accept.default", acceptHeader);
	  }
	  prefManager.setBoolPref("extensions.jsonovich.installed", false);
	}
	jsonovich.overlay.UninstallObserver.unregister();
      }
    },

    register: function () {
      var observerService = Cc["@mozilla.org/observer-service;1"]
			      .getService(Ci.nsIObserverService);
      observerService.addObserver(jsonovich.overlay.UninstallObserver, "em-action-requested", false);
      observerService.addObserver(jsonovich.overlay.UninstallObserver, "quit-application-granted", false);
    },

    unregister: function () {
      var observerService = Cc["@mozilla.org/observer-service;1"]
			      .getService(Ci.nsIObserverService);
      observerService.removeObserver(jsonovich.overlay.UninstallObserver,"em-action-requested");
      observerService.removeObserver(jsonovich.overlay.UninstallObserver,"quit-application-granted");
    }
  }
};

window.addEventListener("load", jsonovich.overlay.init, false);

