/*  Preference handling for JSONovich
**
** Uses the tabulator add-on's prefs.js nearly verbatim.
** Chiefly used to add an Accept header for application/json
*/
var prefManager = Cc["@mozilla.org/preferences-service;1"]
		    .getService(Components.interfaces.nsIPrefBranch);
try {
    var value = prefManager.getBoolPref("extensions.jsonovich.setheader");
}
catch(e) {
    prefManager.setBoolPref("extensions.jsonovich.setheader", true);
}

var jsonovichPrefObserver = {
  register: function () {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService);
    this._branch = prefService.getBranch("extensions.jsonovich.");
    this._branch.QueryInterface(Ci.nsIPrefBranch2);
    this._branch.addObserver("", this, false);
  },

  unregister: function () {
    if (!this._branch)
      return;
    this._branch.removeObserver("", this);
  },

  observe: function (aSubject, aTopic, aData) {
    if (aTopic != "nsPref:changed")
      return;
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)
    switch (aData) {
      case "setheader":
        var prefManager = Cc["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefBranch);
        var acceptheader = prefManager.getCharPref('network.http.accept.default');
        var value = prefManager.getBoolPref("extensions.jsonovich.setheader");
        if (value) {
          if (acceptheader.indexOf("application/json") == -1) {
            acceptheader += ",application/json;q=0.95";
          }
        }
	else {
          acceptheader = acceptheader.replace(/,application\/json;q=0\.95/, "");
        }
        prefManager.setCharPref('network.http.accept.default',acceptheader);
        break;
    }
  }
}

jsonovichPrefObserver.register();
