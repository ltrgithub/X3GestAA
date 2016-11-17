"use strict";
var crypto = require('crypto');
var util = require('util');

// compute signature from object structure. Handles circular references. Does not consider attributes contained in the optional array 'excludes'
// and does not consider the hard coded excluded attributes in the 'excl' variable.
function _computeSignature(obj, excludes) {
	var objects = [];
	var excl = {
		"$updDate": "",
		"$creDate": ""
	};
	if (excludes) {
		for (var i = excludes.length - 1; i >= 0; i--)
		excl[excludes[i]] = "";
	}
	var hash = crypto.createHash('sha1');

	function intern(obj) {
		hash.update("\x02");
		if (obj instanceof Object) {
			// avoid infinite recursions
			for (var i = objects.length - 1; i >= 0; i--) {
				if (objects[i] === obj) {
					hash.update("\x05" + i + "\x05");
					return;
				}
			}
			objects.push(obj);
			// process object
			if (Array.isArray(obj)) {
				hash.update("\x01");
			}
			var keys = Object.keys(obj).sort();
			var i = keys.length;
			if (i > 0) {
				while (--i >= 0) {
					var key = keys[i];
					if (!(key in excl)) {
						hash.update(key + "\x03");
						intern(obj[key]);
					}
				}
			} else {
				hash.update("\x06" + obj.valueOf());
			}
		} else if (obj == null) { // non-strict comparison: matches null and undefined
			hash.update("\x04");
		} else {
			hash.update(obj.toString());
		}
	}
	intern(obj);
	return hash.digest('base64');
}

// computes the signature of an object and writes it into the $signature field
// exclude attributes contained in the array 'excludes' from computing the signature (in addition to hard coded attributes: $creDate, $updDate)
function sign(obj, excludes) {
	if (!(obj instanceof Object)) throw new TypeError("No object");
	obj.$signature = "";
	var signature = _computeSignature(obj, excludes);
	obj.$signature = signature;
}

exports.sign = sign;

// checks the signature of an object (taken from the $signature field).
// returns true when the signature field is available and the computed signature equals the already given signature
// exclude attributes contained in the array 'excludes' from computing the signature (in addition to hard coded attributes: $creDate, $updDate)
function verify(obj, excludes) {
	if (!(obj instanceof Object)) throw new TypeError("No object");
	var signature = obj.$signature;
	if (!signature) return false;
	obj.$signature = "";
	var ok = (signature === _computeSignature(obj, excludes));
	obj.$signature = signature;
	return ok;
}

exports.verify = verify;