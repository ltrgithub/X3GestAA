## ez-stream factory for mongodb

`var ez = require('ez-streams');
 // relevant url syntax here http://docs.mongodb.org/manual/reference/connection-string/
 var factory = ez.factory("mongodb://server:port/schema/collection?connectOption1=some_opt");`

* `reader = factory.reader(_)`  
* `writer = factory.writer(_)`  
