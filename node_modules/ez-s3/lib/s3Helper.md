# s3Helper
This helper wraps a bunch of operations.  
All the functions of this helper accept a parameter named 's3'. The caller is in charge
to initialize a valid s3 connector, with the valid accessKey/secretKey.  
For more details on how to create a valid connector, please refer to the following link :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property  
If needed, this connector must also be provided with a proxy agent (to face firewall problems).  
### bucketExists(_, s3, bucket)	
Indicates whether a bucket exists from its name.
- s3 : a s3 connector
- bucket : the name of the bucket
 
### deleteBucket(_, s3, bucket)
Tries to delete a bucket (from its name) and indicates whether the deletion succeeded.
- s3 : a s3 connector
- bucket : the name of the bucket
 
### createBucket(_, s3, params)
Tries to create a bucket and indicates whether the creation succeeded.
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
 
### listBuckets(_, s3)
Returns the list of existing buckets.  
- s3 : a s3 connector
 
For a description of the output format, please refer to the following link :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listBuckets-property
### bucketExists(_, s3, bucket)
Indicates whether a bucket exists from its name.  
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- key : the key of the object, in the bucket.
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property		
 
### getObject(s3, params)
Returns a pointer to a 'get' request for a S3 object.
WARNING : this function does not return the body of the object but only a request : if you need the 
body, use getObject(_, xxx).send(function(err, data)) or use the S3 dedicated streamline device.
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- key : the key of the object, in the bucket.
	- some extra parameters can be provided, please refer to the following link to have the full list :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
 
### getObjectContent(_, params)
Returns the content (including Body, LastModified, ContentLength, ...) of a S3 object.
 
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- key : the key of the object, in the bucket.
	- some extra parameters can be provided, please refer to the following link to have the full list :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
 
For a description of the output format, please refer to the following link :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
### deleteObject(_, s3, params)
Tries to delete an object and returns whether the deletion succeeded.
 
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- key : the key of the object, in the bucket.
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
 
### listObjects(_, s3, params)
Returns the list of all (1000 max by default) the objects that belongs to a bucket.
 
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- some extra parameters can be provided, please refer to the following link to have the full list :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property
 
For a description of the output format, please refer to the following link :
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property  
### upload(s3, params)
Returns a pointer to a 'upload' request for a S3 object.  
WARNING : this function does not launch the upload but only a request : if you wand to execute the
upload process, you will have to use upload(xxxx).send(function(err)) or use ez-s3, the S3 dedicated ez-streams device.
- s3 : a s3 connector
- params : must, at least, include : 
	- bucket  : the name of the bucket
	- key : the key of the object, in the bucket.
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
 
