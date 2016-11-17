"use strict";

exports.removeUnnecessaryBlank = function(str) {
	return str.replace(/\s*(\<\<|\>\>|\/|\[|\]|\(|\))\s*/g, function(s, sub) {
		return sub;
	});
};

exports.formatDate = function(date) {
	//return a string like (D:20120320170324)
	var year = date.getUTCFullYear(),
		month = ("00" + (date.getUTCMonth() + 1)).slice(-2),
		day = ("00" + date.getUTCDate()).slice(-2),
		hours = ("00" + date.getUTCHours()).slice(-2),
		minutes = ("00" + date.getUTCMinutes()).slice(-2),
		seconds = ("00" + date.getUTCSeconds()).slice(-2);
	return "(D:" + year + month + day + hours + minutes + seconds + "Z)";
};

exports.startsWith = function(str, pattern) {
	return str.substring(0, pattern.length) === pattern;
};

exports.endsWith = function(str, pattern) {
	return str.substring(str.length - pattern.length) === pattern;
};

exports.extractCertificateContent = function(str) {
	var begin = '-----BEGIN CERTIFICATE-----';
	var end = '-----END CERTIFICATE-----';
	return str.substring(str.indexOf(begin) + begin.length, str.indexOf(end)).replace(/\s/g, '');
};

exports.error = function(msg) {
	return new Error(msg);
};