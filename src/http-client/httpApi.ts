"use strict";

var adminHelper = require("../../src/collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');

/// !doc
/// # Http API  
/// ```javascript
/// var httpApi = require('../../src/http-client/httpApi')  
/// ```
/// This module is exported to be able to be call from X3

exports.$exported = true;

/// -------------
/// ## callRestWebService function :
/// ``` javascript
/// var response = httpApi.callRestWebService(_, name, httpMethod, subUrl, parameters, headers, data); 
/// ```
/// Call REST web services configured in `restWebService` entity.  
/// 
/// * The `name` parameter represents the name of the web service configuration.  
/// * The `httpMethod` parameter represents the Http method that will be used by the request. It can be `GET`, `POST`, `PUT` or `DELETE`.  
/// * The `subUrl` parameter represents the path of the service that will be called in the web service.  
/// * The `parameters` parameter is a JSON object that contains the parameters that will be embedded in the URL.  
/// * The `headers` parameter is a JSON object that contains the parameters that will be included in the header of the request.  
/// * The `data` parameter correspond to the data that will be sent with the request. It's used only by `POST` and `PUT` methods.  
/// 
/// Returns a JSON object that contains the status code and the content of the Http response.   
/// 
exports.callRestWebService = function(_, name, httpMethod, subUrl, parameters, headers, data, options) {

	var db = adminHelper.getCollaborationOrm(_);
	var model = db.model;
	var entity = model.getEntity(_, "restWebService");
	var filter = {
		sdataWhere: "name eq '" + name + "'"
	};
	var instance = db.fetchInstances(_, entity, filter)[0];
	if (!instance) throw new Error(locale.format(module, "webSNotFound", name));
	return instance.execRequest(_, httpMethod, subUrl, parameters, headers, data, options);
};