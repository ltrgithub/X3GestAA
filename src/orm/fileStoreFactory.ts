"use strict";

var locale = require('streamline-locale');
var fs = require('streamline-fs');
var httpHelpers = require('@sage/syracuse-core').http;
var ez = require("ez-streams");

var factoryTracer = require('@sage/syracuse-core').getTracer("orm.factory");

function _exists(_, path) {
	return fs.exists(path, _);
}

// standard file store

function OsFileStore(fileName) {
	this.fileName = fileName;
}

var osFileProto = OsFileStore.prototype;
osFileProto.getProperties = function(_) {
	var stat = fs.stat(this.fileName, _);
	return {
		length: stat.size,
		contentType: "",
		fileName: this.fileName,
		uploadDate: stat.mtime,
		chunkSize: stat.blksize
	};
};
osFileProto.fileExists = function(_) {
	factoryTracer.debug && factoryTracer.debug("OsFileStore.fileExists enter: " + this.fileName);
	return _exists(_, this.fileName);
};
osFileProto.setFile = function(_, fileName) {
	this.fileName = fileName;
};
osFileProto.createReadableStream = function(_) {
	return ez.devices.node.reader(fs.createReadStream(this.fileName));
};
osFileProto.createWritableStream = function(_) {
	factoryTracer.debug && factoryTracer.debug("OsFileStore.createWritableStream for file: " + this.fileName);
	return ez.devices.node.writer(fs.createWriteStream(this.fileName));
};
osFileProto.deleteFile = function(_) {
	this.fileName && fs.unlink(this.fileName, _);
};

//rest file store

function RestFileStore(fileName) {
	this.fileName = fileName;
}

var restFileProto = RestFileStore.prototype;
restFileProto.getProperties = function(_) {};
restFileProto.fileExists = function(_) {};
restFileProto.setFile = function(_, fileName) {};
restFileProto.read = function(_, len) {};
restFileProto.write = function(_, buffer, options) {};
restFileProto.deleteFile = function(_) {};
restFileProto.close = function(_) {};

// X3 file store

function ProxyFileStore(fileName) {
	this.fileName = fileName;
}

var x3ToMimeMap = {
	"V6WORD": httpHelpers.mediaTypes.doc,
	"V6EXCEL": httpHelpers.mediaTypes.xls,
	"V7WORD": httpHelpers.mediaTypes.docx
};

var proxyFileProto = ProxyFileStore.prototype;
proxyFileProto.getProperties = function(_) {
	var p = this._instance._properties || {};
	return {
		contentType: (p.what && x3ToMimeMap[p.what]) || "",
		fileName: p.fileName
	};
};
proxyFileProto.fileExists = function(_) {
	// TODO: check exists against X3. For now just check filename
	return this.fileName != null;
};
proxyFileProto.setFile = function(_, fileName) {
	// fileName is x3 url here
	this.fileName = fileName;
};
proxyFileProto.read = function(_, len) {};
proxyFileProto.write = function(_, buffer, options) {};
proxyFileProto.deleteFile = function(_) {};
proxyFileProto.close = function(_) {};

var _propertyStoreMap = {
	"db_file": function(instance, property) {
		// compat, change of storage type
		if (typeof instance._data[property.name] === "string") return instance._db.getFileStore(instance._data[property.name]);
		else return instance._db.getFileStore((instance._data[property.name] && instance._data[property.name].$uuid) || "");
	},
	"file": function(instance, property) {
		return new OsFileStore((instance._data[property.name] && instance._data[property.name].$uuid) || "");
	},
	"rest": function(instance, property) {
		return new RestFileStore((instance._data[property.name] && instance._data[property.name].$uuid) || "");
	},
	"proxy": function(instance, property) {
		return new ProxyFileStore((instance._data[property.name] && instance._data[property.name].$uuid) || "");
	}
};

exports.createFileStore = function(instance, property, storeType) {
	var s = _propertyStoreMap[storeType] && _propertyStoreMap[storeType](instance, property);
	if (s) s._instance = instance;
	return s;
};