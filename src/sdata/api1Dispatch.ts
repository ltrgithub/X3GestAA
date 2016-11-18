"use strict";

var sdata = require('../sdata/sdataDispatch');

function fixRequest(request) {
	// set $stateless flag to be routed through mobile1 stateless dispatcher
	request.$stateless = true;
	request.session.apiPrefix = 'api1';
	// X3 sends a 200 response with no data if we don't set the accept header, even on bad URLs!
	request.headers.accept = request.headers.accept || 'application/json';
}

exports.dispatcher = function(options) {
	options = options || {};

	var sdataDispatch = sdata.dispatcher(options);
	return function(_, request, response) {
		fixRequest(request);
		try {
			return sdataDispatch(_, request, response);
		} catch (ex) {
			console.error(ex.stack);
		}
	};
};