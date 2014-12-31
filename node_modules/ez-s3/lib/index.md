# ez-s3
Ez-streams for Amazon S3 services.
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
```
