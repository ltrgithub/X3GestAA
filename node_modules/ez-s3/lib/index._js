"use strict";

var ez = require('ez-streams');
var helper = require('./s3Helper');

/// !doc
/// # ez-s3
/// Ez-streams for Amazon S3 services.
/// ---
/// Both the reader and the writer must be provided by an already configured S3 connector.  
/// To enable such a connector, you have to use the 'aws-sdk' module (https://www.npmjs.com/package/aws-sdk):
/// ``` javascript
/// var AWS = require('aws-sdk');
/// AWS.config.update({
/// 	region: 'xxxx',  // 'eu-central-1' for instance
/// 	accessKeyId: 'xxxxxxxxxxxxxx',
/// 	secretAccessKey: 'xxxxxxxxxxxxxxx',
/// });
/// var s3 = new AWS.S3();
/// ```
/// When needed, a proxy can be set, using, for instance, the 'tunnel' module (https://www.npmjs.com/package/tunnel):
/// ``` javascript
/// var tunnelingAgent = require('tunnel').httpsOverHttp({
/// 	proxy: {
/// 		host: 'x.x.x.x',
/// 		port: xxxx,
/// 		}
/// });
/// 
/// AWS.config.update({
/// 	httpOptions: {
/// 		agent: tunnelingAgent
/// 	}
/// });
/// ```

module.exports = {
	/// ### reader(_, s3, params)
	/// Creates a reader that can be used to read the content of an object stored in a S3 bucket
	/// - 's3' : a S3 connector - created by sth like AWS.S3()
	/// - 'params' describes the S3 object. Must, at least, include the following properties:
	/// 	- 'bucket'  : the name of the bucket
	/// 	- 'key' : the key of the object, in the bucket.
	///  
	/// ```
	/// // Initialize a S3 connector
	/// s3 = new require('aws-sdk').S3(...)
	/// // create the reader
	/// reader = ezS3.reader(_, s3, {bucket:'xxx', key:'yyy'})
	/// line = reader.read(_);
	/// ```

	reader: function(_, s3, params) {
		var request = helper.getObject(s3, params);
		var stream = request.createReadStream();
		var st = ez.devices.node.reader(stream);
		st = st.map(ez.mappers.convert.stringify());
		return st;
	},

	/// ### writer(_, s3, params)
	/// Creates a writer that can be used to upload an object into a S3 bucket
	/// - 's3' : a S3 connector - created by sth like AWS.S3()
	/// - 'params' describes the S3 object. Must, at least, include the following properties:
	/// 	- 'bucket'  : the name of the bucket
	/// 	- 'key' : the key of the object, in the bucket.
	///  
	/// ```
	/// // Initialize a S3 connector
	/// s3 = new require('aws-sdk').S3(...)
	/// // create the writer
	/// writer = ezS3.writer(_, s3, {bucket:'xxx', key:'yyy'})
	/// writer.write(_, 'zzzzz');
	/// // always write 'undefined' and the end to close the stream
	/// writer.write(_);
	/// ```
	writer: function(_, s3, params) {
		if (!helper.bucketExists(_, s3, params.bucket))
			helper.createBucket(_, s3, params);

		// we have to use the magic 'uturn' ez-device because params.body must 
		// be a pointer to a ** Readable ** stream but here, we need a ** Writable **
		// stream in which all the write operations can be done.
		var ut = ez.devices.uturn.create();
		params.body = ut.reader.nodify();
		helper.upload(s3, params).send();
		return ut.writer;
	},
};
