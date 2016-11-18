"use strict";
var config = require('config');
var ez = require('ez-streams');
var htmlTransforms = require('@sage/html-sanitizer/src/transforms');

var allowedTypes = config.upload && config.upload.allowedTypes;
if (!allowedTypes) {
	if (config.hosting && config.hosting.multiTenant) throw new Error("config.upload.allowedTypes not configured");
	else allowedTypes = /./;
}
if (!Array.isArray(allowedTypes)) allowedTypes = [allowedTypes];

exports.allowContentType = function(contentType) {
	// Get rid of options
	contentType = contentType && contentType.split(";")[0];
	return allowedTypes.some(function(re) {
		return re.test(contentType);
	});
};

function MediaTypeError(_, reader, contentType) {
	Error.call(this);
	// // consume stream to prevent hanging on client side, it would be better to abort request but need further investigation
	while (reader.read(_)); //nop
	console.error("upload rejected: contentType=" + contentType);
	this.message = "unauthorized media type";
	this.$httpStatus = 415;
}

var mmm = require('mmmagic');
var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

function detectMediaType(buf, _) {
	if (typeof(buf) === "string") {
		buf = new Buffer(buf, "binary");
	}
	return magic.detect(buf, _);
}
exports.detectMediaType = detectMediaType;

exports.sanitizeReader = function(_, reader, contentType) {
	// if application/octet-stream skip content-type check to find a better one with mmmagic
	if (contentType && contentType !== "application/octet-stream" && !exports.allowContentType(contentType)) throw new MediaTypeError(_, reader, contentType);
	reader.setEncoding(null);
	reader = reader.peekable();
	var buf = reader.peek(_);
	if (buf == null)
		return reader;
	var detected = detectMediaType(buf, _);
	if (!exports.allowContentType(detected)) throw new MediaTypeError(_, reader, detected);
	if (/html/i.test(contentType) || /html/i.test(detected)) {
		reader = reader.map(function(_, buf) {
			return buf.toString('binary');
		}).transform(htmlTransforms.escaper({
			preserve: true,
		}));
	}
	return reader;
};
