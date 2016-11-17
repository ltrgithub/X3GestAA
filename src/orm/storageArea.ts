"use strict";

/// !doc
/// # Storage Area API  
/// ```javascript
/// var sa = require('../../src/orm/storageArea')  
/// ```
/// This module is exported to be able to be call from X3

exports.$exported = true;

var helpers = require('@sage/syracuse-core').helpers,
	uuid = require('@sage/syracuse-core').uuid,
	globals = require('streamline-runtime').globals,
	adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;


function checkExpirationDocument(_, document) {
	if (new Date(document.expiration(_)._value) !== new Date(0)) {
		document.schedule(_);
	}
}


/// -------------
/// ## getDocumentInstance function :
/// ``` javascript
/// var document = sa.getDocumentInstance(_, filter, volume); 
/// ```
/// Retrieve document instance from storage area.  
/// 
/// * The `filter` parameter represents filter selector :  
/// 
/// ``` javascript
/// var filter = {
///   jsonWhere:{
///     $uuid: uuid
///   }
/// }  
/// ```
/// * The `volume` parameter represents the name of the volume where a new document will be stored.
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// Returns a Document instance  
/// 
exports.getDocumentInstance = function(_, filter, volume, entityName) {
	return new Helper(_, entityName).getDocumentInstance(_, filter, volume);
};

/// -------------
/// ## getDocumentInstanceByDD function :
/// ``` javascript
/// var document = sa.getDocumentInstanceByDD(_, dd); 
/// ```
/// Retrieve document instance from storage area.  
/// 
/// * The `dd` parameter represents an identifier of Document Descriptor in uuid format. 
/// 
/// Returns a Document instance  
/// 
exports.getDocumentInstanceByDD = function(_, dd) {
	return new Helper(_).getDocumentInstanceByDD(_, dd);
};

/// -------------
/// ## readAll function :
/// ``` javascript
/// var document = sa.readAll(_, filter); 
/// ```
/// Read document from storage area.  
/// 
/// * The `filter` parameter represents filter selector :  
/// 
/// ``` javascript
/// var filter = {
///   jsonWhere:{
///     $uuid: uuid
///   }
/// }  
/// ```
/// 
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// Returns a Document entity  
/// 
exports.readAll = function(_, filter, entityName) {
	return new Helper(_, entityName).readAll(_, filter);
};

/// -------------
/// ## writeAll function :
/// ``` javascript
/// var document = sa.writeAll(_, properties, buf, filter, volume);  
/// ```
/// Update document in storage area if filter is valid, else Create it. 
/// 
/// * The `properties` parameter represents the document properties in JSON format :  
/// 
/// ``` javascript
/// var properties = {
///   description: "UPDATE",
///   content: {
///     contentType: "application/pdf",
///     fileName: "update.pdf",
///   }
/// }
/// ```
/// * The `buf` parameter represents the document in binary format.  
/// * The `filter` parameter represents filter selector. It's used only for update.  
/// 
/// ``` javascript
/// var filter = {
///        jsonWhere:{
///           $uuid: uuid
///        }
///    }
/// ```
/// * The `volume` parameter represents the name of the volume where a new document will be stored.  
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// 
/// Returns a Document entity.  
///  
exports.writeAll = function(_, properties, buf, filter, volume, entityName) {
	return new Helper(_, entityName).writeAll(_, properties, buf, filter, volume);
};
/// -------------
/// ## remove function :
/// ``` javascript
/// sa.remove(_, filter);  
/// ```
/// Remove document from storage area.  
/// 
/// * The `filter` parameter represents filter selector :  
/// 
/// ``` javascript
/// var filter = {
///        jsonWhere:{
///           $uuid: uuid
///        }
///    }
/// ```
/// 
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// Returns 1 if operation is successful else throw Error.  
///  
exports.remove = function(_, filter, entityName) {
	return new Helper(_, entityName).remove(_, filter);
};

/// -------------
/// ## open function :
/// ``` javascript
/// var dd = sa.open(_, filter, options);  
/// ``` 
/// Open document from storage area or create a new instance.  
/// 
/// * The `filter` parameter represents filter selector :  
/// 
/// ``` javascript
/// var filter = {  
///      jsonWhere:{
///         $uuid: uuid
///      }
///    }
/// ```
/// 
/// * The `options` parameter represents miscellanous options :  
///    * The `volume` option allow to specify what Syracuse volume will be used to store the document. `STD` is used by default.  
///    * The `recordSep` option MUST be used ONLY for `plain/text` documents. It permit to define records separators.  
/// 
/// ``` javascript
/// var options = {  
///      volume: "STD",
///      recordSep: "\r\n"
///    }
/// ```
/// 
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// Returns a Document Descriptor UUID or null if document was not found. 
///  
exports.open = function(_, filter, options, entityName) {
	return new Helper(_, entityName).open(_, filter, options);
};

/// -------------
/// ## write function :
/// ``` javascript
/// sa.write(_, ddUuid, properties, stream); 
/// ```   
/// Write content of document instance.  
/// This function CAN be called between `open` and `close` functions.  
/// 
/// * The `ddUuid` parameter represents an identifier of Document Descriptor in uuid format.  
/// * The `properties` parameter represents the document properties in JSON format :  
/// 
/// ``` javascript
/// var properties = {
///        description: "STREAM",
///        content: {
///            contentType: "application/pdf",
///            fileName: "stream.pdf",
///        }
///    }
/// ```
/// * The `stream` parameter represents a stream of the document in binary format.  
/// * The `forceSave` parameter is a boolean that decide if the document must be saved.
///  
exports.write = function(_, ddUuid, properties, stream, forceSave) {
	return new Helper(_).write(_, ddUuid, properties, stream, forceSave);
};

/// -------------
/// ## read function :
/// ``` javascript
/// sa.read(_, ddUuid , chunkSize); 
/// ```    
/// Read content of document instance. 
/// This function CAN be called between `open` and `close` functions.  
/// 
/// * The `ddUuid` parameter represents an identifier of Document Descriptor in uuid format.  
/// * The `chunkSize` parameter represents the length to read. If its value is -1, chunkSize is ignored.
/// Returns a Buffer part.  
///  
exports.read = function(_, ddUuid, chunkSize) {
	return new Helper(_).read(_, ddUuid, chunkSize);
};

/// -------------
/// ## close function :
/// ``` javascript
/// sa.close(_, ddUuid, withSave);  
/// ```   
/// Close the document store and persist the content in datastore.  
/// IMPORTANT : this function MUST be called after `open` function !!!!  
/// 
/// * The `ddUuid` parameter represents an identifier of Document Descriptor in uuid format.  
/// * The `withSave` parameter is a boolean that decide if the document must be saved.
/// 
/// Returns a Document entity.  
///  
exports.close = function(_, ddUuid, withSave) {
	return new Helper(_).close(_, ddUuid, withSave);
};

/// -------------
/// ## listDocuments function :
/// ``` javascript
/// var array = sa.listDocuments(_, filter, serialize, expectedProperties);  
/// ``` 
/// Retrieve list of documents from storage area corresponding to the filter.  
/// 
/// * The `filter` parameter represents sdata filter selector :  
/// 
/// ``` javascript
/// var filter = {  
///      sdataWhere: "volume.code eq 'STD' and documentDate gt '2014-01-01'"
///    }
/// ```
/// * The `serialize` boolean parameter defines if the result must be an array of instances of if it must be serialized as JSON array.
/// * The `expectedProperties` parameter allows to define what properties will be returned if `serialize` parameter is set to `true`.
/// 
/// ``` javascript
/// var expectedProperties = [  
///      'description',
///      'fileName',
///      'documentType'
///    ]
/// ```
/// 
/// * The `entityName` parameter allows to define what entity will be used. The entity `document` is used by default.  
/// 
/// Returns an array of Documents as instances or JSON array (depends on `serialize` parameter). 
///  
exports.listDocuments = function(_, filter, serialize, expectedProperties, entityName) {
	return new Helper(_, entityName).listDocuments(_, filter, serialize, expectedProperties);
};

var stack = {};

function getStack() {
	var id = globals.context.tenantId || 0;
	stack[id] = stack[id] || {};
	return stack[id];
}

var Helper = helpers.defineClass(function(_, entityName) {
	// getting the administration ORM
	this.db = adminHelper.getCollaborationOrm(_);
	// the metamodel is associated to the orm
	this.model = this.db.model;
	this.entityName = entityName || "document";
	this.entity = this.model.getEntity(_, this.entityName);
	this.factory = this.entity.factory;
}, null, {
	getVolumeInstance: function(_, volume) {
		// Retrieve volume or STD by default
		return this.db.fetchInstance(_, this.db.model.getEntity(_, "storageVolume"), {
			"jsonWhere": {
				"code": volume && volume.length !== 0 ? volume : "STD"
			}
		});
	},

	getDocumentInstance: function(_, filter, volume) {
		var document;
		if (filter != null && filter.length !== 0) {
			// fetchInstance(callback, entity, filter)
			document = this.db.fetchInstance(_, this.entity, filter);
		} else {
			console.log("create docs");
			// create a new object, createInstance params are : (callback, initialDataJson, ormInstance)
			document = this.factory.createInstance(_, null, this.db);

			// Manage volume only for 'document' entity
			if (this.entityName === "document") {
				// Retrieve volume or STD by default
				var vol = this.getVolumeInstance(_, volume);
				if (!vol) throw new Error("Volume '" + volume + "' doesn't exist");
				document.volume(_, vol);
			}
		}
		return document;
	},

	getDocumentInstanceByDD: function(_, dd) {
		return getStack()[dd] && getStack()[dd].document;
	},

	readAll: function(_, filter) {
		// fetchInstance(callback, entity, filter)
		var document = this.db.fetchInstance(_, this.entity, filter);
		if (document == null) throw new Error("Document not found with filter :\n" + JSON.stringify(filter, null, 2));
		var store = document.content(_);
		// read the binary content
		if (!store.fileExists(_)) throw new Error("File doesn't exist");
		// get file meta
		var res = store.createReadableStream(_).readAll(_);
		return res;
	},

	writeAll: function(_, props, buf, filter, volume) {
		var document = this.getDocumentInstance(_, filter, volume);
		// Manage volume only for 'document' entity
		if (this.entityName === "document") {
			var docVolume = document.volume(_);
			if (docVolume && docVolume.code(_) !== volume) {
				var vol = this.getVolumeInstance(_, volume);
				document.volume(_, vol);
			}
		}
		Object.keys(props).forEach_(_, function(_, elt) {
			if (elt !== 'content' && document[elt]) {
				document[elt](_, props[elt]);
			}
		});

		if (buf != null && buf.length !== 0) {
			var store = document.content(_);
			props = props && props.content != null ? props.content : {};
			var stream = store.createWritableStream(_, props);
			stream.write(_, buf, "binary");
			stream.write(_, null);
		}
		document.save(_);
		checkExpirationDocument(_, document);
		ckeckDiagnoses(document);
		return document;
	},

	remove: function(_, filter) {

		var document = this.db.fetchInstance(_, this.entity, filter);
		if (!document) throw new Error("Document not found.");

		var res = document._db.deleteInstance(_, document);

		if (res !== 1) throw new Error("Document instance has not been deleted.");

		return res;
	},

	open: function(_, filter, options) {
		options = options || {};
		var ddUuid = uuid.generate('-');
		var self = this;
		var StoWriter = helpers.defineClass(function(_, filter) {
			this.document = self.getDocumentInstance(_, filter, options.volume);
			this.store = this.document && this.document.content(_);
			this.first = true;
			if (options.recordSep) this.recordSep = options.recordSep;
		}, null, {});

		var writer = new StoWriter(_, filter);
		if (!writer.document) return null;

		getStack()[ddUuid] = writer;
		return ddUuid;
	},

	write: function(_, ddUuid, props, stream, forceSave) {
		var dd = getStack()[ddUuid];
		if (dd != null) {
			if (stream != null && stream.length !== 0) {
				try {
					if (dd.first) {
						Object.keys(props).forEach_(_, function(_, elt) {
							if (elt !== 'content' && dd.document[elt]) {
								dd.document[elt](_, props[elt]);
							}
						});
						dd._stream = dd.store.createWritableStream(_, props.content);
						dd.first = false;
					}
					dd._stream.write(_, stream, "binary");
					if (dd.recordSep) {
						dd._stream.write(_, dd.recordSep, "binary");
					}
					if (forceSave) {
						dd._stream.write(_, null);
						dd.document.save(_);
					}
				} catch (e) {
					removeFromStack(ddUuid);
					console.log("Removed from stack due to error in write()");
					console.log(e);
					throw e;
				}
			} else {
				throw new Error("Document content must not be empty.");
			}

		} else {
			console.log(ddUuid + " Not found in stack");
			throw new Error("Write - Document descriptor not found");
		}
	},

	read: function(_, ddUuid, chunkSize) {
		var dd = getStack()[ddUuid];
		if (dd != null) {
			try {
				if (dd.first) {
					// read the binary content
					if (!dd.store.fileExists(_)) throw new Error("File doesn't exist");
					// get file meta
					dd._stream = dd.store.createReadableStream(_);
					dd.first = false;
				}
				var stoProps = dd.store.getProperties(_);
				var res = '';
				if (chunkSize && chunkSize !== -1) {
					res = dd._stream.read(_, chunkSize).toString('binary');
				} else if (dd.recordSep) {
					var tmp;
					while (tmp = dd._stream.read(_, 1)) {
						res += tmp.toString('binary');
						if (res.indexOf(dd.recordSep) !== -1) break;
					}
					if (!tmp) return null;
					res = res && res.substring(0, res.length - dd.recordSep.length);
				} else {
					res = dd._stream.read(_, stoProps.chunkSize);
				}
				return res;
			} catch (e) {
				removeFromStack(ddUuid);
				console.log("Removed from stack due to error in read()");
				console.log(e);
				throw e;
			}
		} else {
			throw new Error("Read - Document descriptor not found: " + ddUuid);
		}

	},

	close: function(_, ddUuid, withSave) {
		var dd = getStack()[ddUuid];
		if (dd != null) {
			try {
				// a readable stream doesn't have "write" method
				dd._stream && dd._stream.write && dd._stream.write(_, null);
				if (withSave) {
					dd.document.save(_);
					checkExpirationDocument(_, dd.document);
				}
			} finally {
				console.log("Removed from stack due to close()");
				removeFromStack(ddUuid);
			}
			ckeckDiagnoses(dd.document);
			return dd.document;
		} else {
			throw new Error("Close - Document descriptor not found");
		}
	},

	listDocuments: function(_, filter, serialize, expected) {
		if (expected && !Array.isArray(expected)) throw new Error("'expected' parameter must be an array.");

		//console.log("Filter: " + JSON.stringify(filter, null, 2));
		var docEntity = this.db.getEntity(_, this.entityName);
		var instances = this.db.fetchInstances(_, docEntity, filter);
		if (serialize) {
			var insts = [];
			for (var i in instances) {
				var instance = instances[i];
				var serializedInstance = instance.serializeInstance(_);
				//console.log("INSTANCE="+JSON.stringify(serializedInstance, null,2));
				if (expected && expected.length > 0) {
					var inst = {};
					for (var j in expected) {
						if (serializedInstance[expected[j]] !== null) inst[expected[j]] = serializedInstance[expected[j]];
					}
					serializedInstance = inst;
				}
				insts.push(serializedInstance);
			}
			//console.log("INSTANCES="+JSON.stringify(insts, null,2));
			return insts;
		} else {
			return instances;
		}
	}
});

function removeFromStack(ddUuid) {
	//console.log("removeFromStack: "+ddUuid);
	delete getStack()[ddUuid];
}

function ckeckDiagnoses(doc) {

	var mess = '';
	Object.keys(doc.$properties).forEach(function(elt) {
		if (doc.$properties[elt].$diagnoses != null && doc.$properties[elt].$diagnoses.length !== 0) {
			doc.$properties[elt].$diagnoses.forEach(function(diag) {
				mess += diag.$severity + " : " + elt + " " + diag.$message + "\n";
			});
		}
	});
	if (mess !== '') throw new Error(mess);
}