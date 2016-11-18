# Http API  
```javascript
var httpApi = require('syracuse/src/http-client/httpApi')  
```
This module is exported to be able to be call from X3
-------------
## callRestWebService function :
``` javascript
var response = httpApi.callRestWebService(_, name, httpMethod, subUrl, parameters, headers, data); 
```
Call REST web services configured in `restWebService` entity.  

* The `name` parameter represents the name of the web service configuration.  
* The `httpMethod` parameter represents the Http method that will be used by the request. It can be `GET`, `POST`, `PUT` or `DELETE`.  
* The `subUrl` parameter represents the path of the service that will be called in the web service.  
* The `parameters` parameter is a JSON object that contains the parameters that will be embedded in the URL.  
* The `headers` parameter is a JSON object that contains the parameters that will be included in the header of the request.  
* The `data` parameter correspond to the data that will be sent with the request. It's used only by `POST` and `PUT` methods.  

Returns a JSON object that contains the status code and the content of the Http response.   

