"use strict";

/// !doc
/// # SOAP Client API  
/// ```javascript
/// var soap = require('../../src/http-client/soapClient');
/// ```
///  
var soap = require('soap');

//Here is the httpClient to use to override httpClient in soap package (needed for proxy management
var soapClient = {
	request: function(rurl, data, callback, exheaders, exoptions) {
		var options = exoptions || {};
		options.url = rurl;
		options.method = 'POST';
		options.headers = exheaders || {};
		options.headers.connection = 'keep-alive';
		options.headers['content-type'] = 'text/xml';
		if (options.forceSoapEncode == 'windows-1252') {
			data = data.replace('encoding="utf-8"', 'encoding="windows-1252"');
		}
		options.headers['content-length'] = data.length;

		//console.error("Options: ",options);
		(function(_) {
			options.debug && console.log("\n============== sage-pt-at send request ===============");
			options.debug && console.log("Headers: " + JSON.stringify(options.headers, null, 2));
			options.debug && console.log("Body: " + data);

			var request = require('../../src/http-client/httpClient').httpRequest(_, options);
			//request.write(_, data, 'utf8');
			request.write(_, data, options.forceDataEncode || 'utf8');
			var response = request.end().response(_);
			var body = response.readAll(_);

			options.debug && console.log("\n============== sage-pt-at received response ===============");
			options.debug && console.log("Status code: " + response.statusCode);
			options.debug && console.log("Headers: " + JSON.stringify(response.headers, null, 2));
			options.debug && console.log("Body: " + body);

			return [response, body];
		})(function(err, res) {
			if (err) callback(err);
			else callback(null, res[0], res[1]);
		});
		return options;
	}
};

/// -------------
/// ## createClient function :
/// ``` javascript
/// var soapClient = soap.createClient(_, wsdl, options); 
/// ```
/// For more information about parameters and returned result, please see node-soap external package documentation :  
/// (https://github.com/vpulim/node-soap)[https://github.com/vpulim/node-soap]  
/// 
exports.createClient = function(_, wsdl, options) {
	options = options || {};
	options.httpClient = soapClient;
	return soap.createClient(wsdl, options, _);
};

var security = soap.security;
exports.BasicAuthSecurity = security.BasicAuthSecurity;
exports.WSSecurity = security.WSSecurity;
exports.ClientSSLSecurity = security.ClientSSLSecurity;
exports.ClientSSLSecurityPFX = security.ClientSSLSecurityPFX;
exports.BearerSecurity = security.BearerSecurity;
exports.passwordDigest = soap.passwordDigest;