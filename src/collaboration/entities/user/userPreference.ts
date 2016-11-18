"use strict";

var adminHelper = require("../../../collaboration/helpers").AdminHelper;
var helpers = require('@sage/syracuse-core').helpers;
var globals = require('streamline-runtime').globals;
var forEachKey = helpers.object.forEachKey;

var trace; // = console.log;

exports.entity = {
	$properties: {
		lastLocaleCode: {
			$title: "Last locale code"
		},
		sitePreferences: {
			$title: "Site preferences",
			$type: "json"
		},
		lastLandingPageName: {
			$title: "Last landing page name"
		}
	},
	$relations: {
		lastRole: {
			$type: "role",
			$title: "Last selected role",
			$nullOnDelete: true
		},
		lastEndpoint: {
			$type: "endPoint",
			$title: "Last selected endpoint",
			$nullOnDelete: true
		},
		lastTheme: {
			$type: "theme",
			$title: "Last selected theme",
			$nullOnDelete: true
		},
		applicationConnections: {
			$type: "applicationConnectionItems",
			$title: "Application connections",
			$isChild: true
		}
	},
	$functions: {
		getAppConnection: function(_, ep) {
			trace && trace("====================== Get app conn for endpoint: ", ep.dataset(_));
			if (!ep) return null;
			var dataset = ep.dataset(_);
			var storedItems = this.applicationConnections(_).toArray(_).filter_(_, function(_, ac) {
				var acEp = ac.endpoint(_);
				return acEp && acEp.$uuid && acEp.$uuid === ep.$uuid;
			});
			if (storedItems && storedItems.length) {
				return storedItems[0];
			}

			trace && trace("Application connection not found --> create new instance");
			var inst = this._db.getEntity(_, "applicationConnectionItem").createInstance(_, this._db)
			inst.endpoint(_, ep);
			inst.data(_, "{}");
			this.applicationConnections(_).set(_, inst);
			this.save(_);

			return inst;
		},
		setAppConnection: function(_, selEp, inst) {

			function cleanData(_, _data) {
				var dataset = selEp.dataset(_);
				globals.context.session.appConnection = globals.context.session.appConnection || {};
				globals.context.session.appConnection[dataset] = globals.context.session.appConnection[dataset] || {};
				// manage metadata to handle session persistence
				if (_data && _data.$properties) {
					var mustResetConn = false;
					forEachKey(_data.$properties, function(k, val) {
						// if property's metadata contains $isPersistent, we store it into session instead of in mongo
						if (_data[k] !== undefined && val.$isPersistent === false) {
							trace && trace("Store app connection property '" + k + "' with value '" + _data[k] + "' into session")
							globals.context.session.appConnection[dataset].data = globals.context.session.appConnection[dataset].data || {};
							if (_data[k] === null) {
								delete globals.context.session.appConnection[dataset].data[k];
							} else {
								globals.context.session.appConnection[dataset].data[k] = _data[k];
							}
							delete _data[k];
						}
						// if at least one property's metadata contains $resetConnection
						if (!mustResetConn && _data[k] !== undefined && val.$resetConnection === true) {
							trace && trace("Connection need to be restarted !")
							mustResetConn = true;
						}
					});

					delete _data.$properties;
					if (mustResetConn) {
						globals.context.session.appConnection[dataset].$actions = {
							$resetConnection: true
						};
					}
				}
				return _data;
			}

			trace && trace("===================== Set app conn for endpoint: ", selEp.dataset(_));

			var snapshot = inst.$snapshot;

			//						if (selEp) console.log("EP: ",selEp.$uuid);
			//						if (snapshot) console.log("snapshot:"+JSON.stringify(snapshot.serializeInstance(_),null,2));
			//						if (inst) console.log("inst:"+JSON.stringify(inst.serializeInstance(_),null,2));

			if (!snapshot || (selEp && snapshot && snapshot.endpoint(_) && selEp.$uuid !== snapshot.endpoint(_).$uuid)) {
				return this.getAppConnection(_, selEp);
			}

			var newData = inst.data(_);
			if (newData) newData = JSON.parse(newData);

			var data;
			if (snapshot) {
				data = snapshot.data(_);
				if (data) data = JSON.parse(data);
			}
			// compare stored and current instances
			if (inst) {
				if (data && newData) {
					Object.keys(newData).forEach(function(key) {
						data[key] = newData[key];
					});
				} else if (newData) {
					data = newData;
				}
				data = cleanData(_, data);
				data = JSON.stringify(data);
				trace && trace("Existing app connection data stored into mongo:", data);


				var stored = this.getAppConnection(_, selEp);

				stored.data(_, data);
				trace && trace("Stored updated with stored: ", stored.serializeInstance(_));
				return stored;
			} else {
				trace && trace("No data");
				return null;
			}
		}
	}
};