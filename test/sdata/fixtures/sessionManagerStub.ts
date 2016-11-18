"use strict";
var _data = {};
var _session = {
	setData: function(name, value) {
		var old = _data[name];
		if (old == value) return;

		if (old && old.onDestroy) {
			old.onDestroy();
		}
		if (typeof value == "undefined") delete _data[name];
		else _data[name] = value;
	},
	getData: function(name) {
		return _data[name];
	},
	_reset: function() {
		_data = {};
	}
};

exports.sessionManager = {
	sessionByCookie: function(cookie) {
		return _session;
	},
	setup: function() {},
	setHost: function(value) {
		_session.host = value;
	}
};