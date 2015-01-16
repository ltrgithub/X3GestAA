# ez-s3
Ez-streams for Amazon S3 services.
---
Both the reader and the writer must be provided by an already configured S3 connector.  
To enable such a connector, you have to use the 'aws-sdk' module (https://www.npmjs.com/package/aws-sdk):
``` javascript
var AWS = require('aws-sdk');
AWS.config.update({
	region: 'xxxx',  // 'eu-central-1' for instance
	accessKeyId: 'xxxxxxxxxxxxxx',
	secretAccessKey: 'xxxxxxxxxxxxxxx',
});
var s3 = new AWS.S3();
```
When needed, a proxy can be set, using, for instance, the 'tunnel' module (https://www.npmjs.com/package/tunnel):
``` javascript
var tunnelingAgent = require('tunnel').httpsOverHttp({
	proxy: {
		host: 'x.x.x.x',
		port: xxxx,
		}
});

AWS.config.update({
	httpOptions: {
		agent: tunnelingAgent
	}
});
```
### reader(_, s3, params)
Creates a reader that can be used to read the content of an object stored in a S3 bucket
- 's3' : a S3 connector - created by sth like AWS.S3()
- 'params' describes the S3 object. Must, at least, include the following properties:
	- 'bucket'  : the name of the bucket
	- 'key' : the key of the object, in the bucket.
 
```
// Initialize a S3 connector
s3 = new require('aws-sdk').S3(...)
// create the reader
reader = ezS3.reader(_, s3, {bucket:'xxx', key:'yyy'})
line = reader.read(_);
```
### writer(_, s3, params)
Creates a writer that can be used to upload an object into a S3 bucket
- 's3' : a S3 connector - created by sth like AWS.S3()
- 'params' describes the S3 object. Must, at least, include the following properties:
	- 'bucket'  : the name of the bucket
	- 'key' : the key of the object, in the bucket.
 
```
// Initialize a S3 connector
s3 = new require('aws-sdk').S3(...)
// create the writer
writer = ezS3.writer(_, s3, {bucket:'xxx', key:'yyy'})
writer.write(_, 'zzzzz');
// always write 'undefined' and the end to close the stream
writer.write(_);
```
