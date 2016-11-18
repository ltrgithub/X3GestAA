"use strict";

/// !doc
/// 
/// # PDF Writer
/// ```javascript
/// var pdfWriter = require('syracuse/src/pdf/writer')  
/// ```
/// 

var pdfUtils = require('./utils'),
	pdfObject = require('./object'),
	x509 = require("jsx509").x509,
	fs = require('streamline-fs'),
	zlib = require('zlib'),
	EOL = '\n';

var locale = require('streamline-locale');
var adminHelper = require("../collaboration/helpers").AdminHelper;

/// -------------
/// ## create function :
/// ``` javascript
/// var writer = pdfWriter.create(_, reader); 
/// ```
/// Create PDF Writer for a PDF File.  
/// 
/// * The `reader` parameter must be a PDF Reader object.  
/// 
/// Returns the writer object  
/// 
exports.create = function(_, reader) {

	var toc = reader.getTOC(_),
		initSize = toc.size,
		previousSize = initSize,
		countObjAdded = 0,
		outStream,
		rootId = toc.trailer.Root.split(' ')[0],
		rootObj = reader.getObj(_, rootId);
	outStream = {
		fd: fs.open(reader.file, 'a', _),
		write: function(_, buf) {
			fs.write(this.fd, buf, 0, buf.length, null, _);
		},
		close: function(_) {
			fs.close(this.fd, _);
		}
	};

	function init(_) {
		toc = reader.getTOC(_);
		countObjAdded = 0;
		rootId = toc.trailer.Root.split(' ')[0];
		rootObj = reader.getObj(_, rootId);
	}

	/// -------------
	/// ## attach function :
	/// ``` javascript
	/// var obj = writer.attach(_, filename, description, data); 
	/// ```
	/// Create attachment on PDF file  
	/// 
	/// * The `filename` parameter represents the attachment name.    
	/// * The `description` parameter represents the attachment description.  
	/// * The `data` parameter represents the attachment file data to deflate.  
	/// 
	/// Returns the stream object attached reference id and the data original length  
	/// 
	function attach(_, filename, description, data) {
		try {
			writeStr(_, EOL);
			var sizeId = addObj(_, "<</Size " + data.length + "/ModDate " + pdfUtils.formatDate(new Date()) + ">>");

			var compressed = zlib.deflate(data, _);

			var streamId = addObjStream(_, "<</Type/EmbeddedFile/Params " + sizeId + " 0 R /Length " + compressed.length + "/Filter/FlateDecode>>", compressed);

			var embedId = addObj(_, "<</F(" + filename + ")/Type/Filespec/Desc(" + description + ")/EF<</F " + streamId + " 0 R/UF " + streamId + " 0 R>>/UF(" + filename + ")>>");

			var rootObjStruct = pdfObject.parse(rootObj.content);

			var refsId;
			var namesEntry = rootObjStruct.getEntry('Names');
			if (namesEntry == null) {
				refsId = addObj(_, "<</Names[(" + filename + ") " + embedId + " 0 R]>>");
				namesEntry = rootObjStruct.addName("/Names");
			}

			var embeddedFilesEntry = namesEntry.getEntry('EmbeddedFiles');
			if (embeddedFilesEntry != null) {
				var oldRefId = parseInt(embeddedFilesEntry.value, 10);
				var refObj = pdfObject.parse(reader.getObj(_, oldRefId).content);
				var attachmentRefs = refObj.getEntry("Names").value.split('[')[1].split(']')[0];
				refObj.getEntry("Names").value = "[(" + filename + ") " + embedId + " 0 R" + attachmentRefs + "]";
				refsId = updateObj(_, oldRefId, refObj.stringify());
				embeddedFilesEntry.value = " " + refsId + " R";
			} else {
				embeddedFilesEntry = namesEntry.addDictionary("/EmbeddedFiles " + refsId + " 0 R");
			}

			var rootIdx = updateObj(_, rootId, rootObjStruct.stringify());
			writeTOC(_, rootIdx);

			return {
				id: streamId,
				length: data.length
			};
		} catch (e) {
			rollback(_, false);
			throw pdfUtils.error(locale.format(module, 'errAttach', e.safeStack));

		}
	}

	/// -------------
	/// ## sign function :
	/// ``` javascript
	/// var obj = writer.sign(_, certName); 
	/// ```
	/// Sign PDF document with given cetificate.   
	/// 
	/// * The `certName` parameter represents the name of the public certificate that has been put in collaboration database.    
	/// 
	/// Returns the generated signature in hexadecimal format.  
	/// 
	function sign(_, certName) {
		function createSigAppearance(_, certInstance, sigLen) {

			function overwrite(_, value, offset) {
				var fd;
				try {
					var buf = new Buffer(value.toString(), 'utf8');
					var len = buf.length;
					fd = fs.open(reader.file, 'r+', _);
					fs.write(fd, buf, 0, len, offset, _);

				} finally {
					fs.close(fd, _);
				}
			}

			try {
				writeStr(_, EOL);
				var rootObjStruct = pdfObject.parse(rootObj.content);

				var sigDictId = startObj(_, "<</Contents ");
				var sigBeginOffset = toc.size;

				var tempSignature = "";
				for (var i = 0; i < sigLen; i++) {
					tempSignature += '0';
				}
				writeStr(_, "<" + tempSignature + ">");
				var subject = certInst.subject(_);
				var sigEndOffset = toc.size;
				writeStr(_, "/Type/Sig/Filter/Adobe.PPKMS/SubFilter/adbe.pkcs7.sha1/Reason(" + subject.organizationName + ")/Location(" + subject.countryName + ")/Name(" + subject.commonName + ")/M" + pdfUtils.formatDate(new Date()) + "");

				var byteRangeStr = "/ByteRange [0 " + sigBeginOffset + " " + sigEndOffset + " ";
				var endOffsetPosition = toc.size + byteRangeStr.length;
				writeStr(_, byteRangeStr + 0 + "         ]>>");
				endObj(_);

				// Add XObject
				var xObjectId = addObjStream(_, "<</Type/XObject/Resources<</ProcSet[/PDF /Text /ImageB /ImageC /ImageI]>>/Subtype/Form/BBox[0 0 0 0]/Matrix [1 0 0 1 0 0]/Length 8/FormType 1/Filter/FlateDecode>>", zlib.deflate("", _));

				// Find Pages Object Infos
				var pagesObjRef = rootObjStruct.getEntry('Pages').value;
				var pagesObjRefId = parseInt(pagesObjRef, 10);
				parseInt(pdfUtils.removeUnnecessaryBlank(pagesObjRef).split(' ')[1], 10);
				var pagesObj = pdfObject.parse(reader.getObj(_, pagesObjRefId).content);

				// Find First Page Object Infos
				var firstPageRef = pagesObj.getEntry('Kids').value.split('[')[1].split(']')[0];
				var firstPageRefId = parseInt(firstPageRef, 10);
				parseInt(pdfUtils.removeUnnecessaryBlank(firstPageRef).split(' ')[1], 10);
				var firstPageObj = pdfObject.parse(reader.getObj(_, firstPageRefId).content);

				// Update first page with /annots
				firstPageObj.addNames('/Annots[' + (xObjectId + 1) + ' 0 R]');
				// Simplier to overwrite than update because of pages count
				var newFirstPageId = overwriteObj(_, firstPageRefId, firstPageObj.stringify());

				// Add Signature field
				var fieldDictId = addObj(_, "<</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(Signature1)/V " + sigDictId + " 0 R/P " + newFirstPageId + " R/AP<</N " + xObjectId + " 0 R>>>>");

				var fontHelvId = addObj(_, "<</Type/Font/Subtype/Type1/Name/Helv/Encoding/WinAnsiEncoding/BaseFont/Helvetica>>");

				var fontZaDBId = addObj(_, "<</Type/Font/Subtype/Type1/Name/ZaDb/BaseFont/ZapfDingbats>>");

				var acroFormEntry = rootObjStruct.getEntry('AcroForm');
				var refsId;
				if (acroFormEntry == null) {
					// first interactive form
					refsId = addObj(_, "<</Fields[" + fieldDictId + " 0 R]/SigFlags 3/DR<</Font<</Helv " + fontHelvId + " 0 R/ZaDb " + fontZaDBId + " 0 R>>/Encoding/WinAnsiEncoding>>>>");
					// merge root object
					rootObjStruct.addName("/AcroForm " + refsId + " 0 R");

				} else {

					var oldRefId = parseInt(acroFormEntry.value, 10);
					var refObj = pdfObject.parse(reader.getObj(_, oldRefId).content);

					var fieldsEntry = refObj.getEntry('Fields');
					var fieldsRefs = "";
					if (fieldsEntry != null) {
						fieldsRefs = fieldsEntry.value.split('[')[1].split(']')[0];
						fieldsEntry.value = "[" + fieldDictId + " 0 R " + fieldsRefs + "]";
					} else {
						fieldsEntry = refObj.children[0].addName("/Fields[" + fieldDictId + " 0 R]");
					}

					var sigFlagEntry = refObj.getEntry('SigFlags');
					if (sigFlagEntry == null) {
						sigFlagEntry = refObj.children[0].addName("/SigFlags 3");
					}

					refsId = updateObj(_, oldRefId, refObj.stringify());
					acroFormEntry.value = " " + refsId + " R";

				}

				var rootIdx = updateObj(_, rootId, rootObjStruct.stringify());
				writeTOC(_, rootIdx);

				overwrite(_, (toc.size - sigEndOffset), endOffsetPosition);

				return {
					sigBeginOffset: sigBeginOffset,
					sigEndOffset: sigEndOffset,
					overwrite: overwrite
				};
			} catch (e1) {
				throw pdfUtils.error(locale.format(module, 'errSigApp') + e1.safeStack);
			}
		}

		try {
			// Retrieve certificate from collaboration
			var db = adminHelper.getCollaborationOrm(_);
			var model = db.model;
			var entity = model.getEntity(_, "certificate");
			var filter = {
				jsonWhere: {
					name: certName
				}
			};

			var certInst = db.fetchInstance(_, entity, filter);
			if (!certInst) throw pdfUtils.error(locale.format(module, 'errCertInstNotFound', certName));

			var certContent = pdfUtils.extractCertificateContent(certInst.getPEMCertificate(_));
			var guessSigSize = x509.guessSignatureSize(new Buffer(certContent, "base64"));
			//			console.log("Expected length :"+util.inspect(guessSigSize));

			var sig, valid = false;
			// CREATE SIGNATURE APPEARENCE
			var sigApp = createSigAppearance(_, certInst, guessSigSize + 5000);
			// GET DOCUMENT HASH WITHOUT SIGNATURE BYTE RANGE
			var documentHash = reader.getDocumentHash(_, sigApp.sigBeginOffset, sigApp.sigEndOffset);
			// SIGN DOCUMENT HASH WITH SHA1 ALGORITHM (only for console use)
			var signature = certInst.sign(_, 'sha1', documentHash, {
				output_encoding: "hex"
			});
			try {
				// VERIFY SIGNATURE
				valid = certInst.verify(_, 'sha1', documentHash, signature, {
					signature_encoding: "hex"
				});
				if (!valid) throw pdfUtils.error(locale.format(module, 'errSigNotValid', reader.file, certName));
			} catch (e3) {
				throw pdfUtils.error(locale.format(module, 'errSigVerif'), e3.safeStack);
			}

			// BUILD SIGNATURE IN DER FORMAT
			var hashHex = new Buffer(documentHash, "binary").toString("hex");
			var pdfSignature = x509.buildSignature(new Buffer(certContent, "base64"), new Buffer(hashHex, "hex"), new Buffer(signature, "hex"));
			//			console.log("Longueur obtenue :"+util.inspect(pdfSignature.toString("hex").length));

			if (pdfSignature.toString("hex").length > guessSigSize) {
				// WRITE SIGNATURE TO PDF
				sigApp.overwrite(_, pdfSignature.toString("hex"), sigApp.sigBeginOffset + 1);
				sig = pdfSignature.toString("hex");
			} else {
				throw pdfUtils.error(locale.format(module, 'errSigTooShert'));
			}

			return {
				sig: sig,
				valid: valid
			};
		} catch (ex) {
			rollback(_, false);
			throw pdfUtils.error(locale.format(module, 'errSign', ex.safeStack));
		}
	}

	/// -------------
	/// ## rollback function :
	/// ``` javascript
	/// writer.rollback(_,complete); 
	/// ```
	/// Revert modifications on PDF file.   
	/// 
	/// * The `complete` boolean parameter define if all modifications have to been revert.  
	/// 
	function rollback(_, complete) {
		var fd,
			size = complete ? initSize : previousSize;
		try {
			fd = fs.open(reader.file, 'r+', _);
			fs.ftruncate(fd, size, _);
		} catch (e) {
			console.error(e);
		} finally {
			fs.close(fd, _);
		}
	}

	function writeStr(_, str) {
		var buf = new Buffer(str, 'utf8');
		outStream.write(_, buf);
		toc.size += buf.length;
	}

	function writeBuf(_, buf) {
		outStream.write(_, buf);
		toc.size += buf.length;
	}

	function startObj(_, str, id, gen) {
		id = id != null ? id : parseInt(toc.trailer.Size, 10) + countObjAdded;
		gen = gen != null ? gen : 0;
		var tocSection = reader.getTOCSection(id);
		tocSection.count++;
		tocSection.xref.push({
			offset: toc.size,
			gen: gen,
			letter: 'n'
		});
		writeStr(_, id + " " + gen + " obj" + EOL + str);
		return id;
	}

	function endObj(_) {
		writeStr(_, EOL + "endobj" + EOL);
		countObjAdded++;
	}

	function updateObj(_, id, str) {
		var obj = reader.getObj(_, id);
		startObj(_, str, id, obj.gen + 1);
		endObj(_);
		countObjAdded--;
		return id + " " + (obj.gen + 1);
	}

	function overwriteObj(_, id, str) {
		var obj = reader.getObj(_, id);
		startObj(_, str, id);
		endObj(_);
		countObjAdded--;
		return id + " " + (obj.gen);
	}

	function addObj(_, str) {
		var id = startObj(_, str);
		endObj(_);
		return id;
	}

	function addObjStream(_, str, stream) {
		var id = startObj(_, str);
		writeStr(_, "stream" + EOL);
		writeBuf(_, stream);
		writeStr(_, "endstream");
		endObj(_);
		return id;
	}

	function writeTOC(_, rootObj) {

		try {
			var offset = toc.size;
			var size = parseInt(toc.trailer.Size, 10);
			var xrefsToWrite = '';
			toc.xrefs.forEach(function(element) {
				if (!element.readOnly) {
					xrefsToWrite = element.number + " " + element.count + EOL + element.xref.map(function(entry) {
						return ("0000000000" + entry.offset).slice(-10) + " " + ("00000" + entry.gen).slice(-5) + " " + entry.letter + " " + EOL;
					}).join('') + xrefsToWrite;
				}
			});
			writeStr(_, 'xref' + EOL + xrefsToWrite);
			toc.trailer.Size = (size + countObjAdded);
			if (rootObj != null) {
				toc.trailer.Root = rootObj + " R";
			}
			toc.trailer.Prev = toc.oldStartXRefOffset;
			writeStr(_, "trailer " + EOL + "<<" + Object.keys(toc.trailer).map(function(key) {
				return "/" + key + " " + toc.trailer[key];
			}).join('') + ">>" + EOL + "startxref " + EOL + offset + EOL + "%%EOF" + EOL);

			toc.xrefs.forEach(function(xrefs) {
				xrefs.readOnly = true;
			});
			previousSize = toc.size;

			init(_);

		} catch (e) {
			throw pdfUtils.error(locale.format(module, 'errWriteTOC') + e.safeStack);
		}
	}

	function close(_) {
		outStream.close(_);
	}

	return {
		attach: attach,
		sign: sign,
		rollback: rollback,
		close: close
	};
};