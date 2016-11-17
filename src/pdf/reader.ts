"use strict";

/// !doc
/// 
/// # PDF Reader
/// ```javascript
/// var pdfReader = require('syracuse/src/pdf/reader')  
/// ```
/// 

var fs = require('streamline-fs'),
	path = require('path'),
	config = require('config'),
	zlib = require('zlib'),
	util = require('util'),
	crypto = require('crypto'),
	pdfUtils = require('./utils'),
	pdfObject = require('./object'),
	fd;

var locale = require('streamline-locale');

exports.createFromBuffer = function(_, fname, buffer) {
	var dir = (config.system && config.system.tmpDir) || process.env.TMPDIR || process.env.TEMP || process.env.TMP || process.env.HOME + "/tmp";
	if (!fs.exists(dir, _)) {
		fs.mkdir(dir, _);
	}
	var fpath = path.join(dir, fname);
	fs.writeFile(fpath, buffer, _);
	var reader = exports.create(_, fpath);
	reader.close = function(_, returnData, encoding) {
		var data;
		if (returnData) {
			data = fs.readFile(fpath, _);
			if (encoding) data = data.toString(encoding);
		}
		fs.unlink(fpath, _);
		return data;
	};
	return reader;
};


/// -------------
/// ## create function :
/// ``` javascript
/// var reader = pdfReader.create(_, pdfFile); 
/// ```
/// Create PDF Reader from a PDF File.  
/// 
/// * The `pdfFile` parameter must be the PDF file path.  
/// 
/// Returns the reader object  
/// 
exports.create = function(_, fname) {
	var size,
		toc = getTOC(_),
		isValidEOF;

	function getLastXRefOffset(_) {
		var len = Math.min(size, 256);
		var buf = new Buffer(len);
		len = fs.read(fd, buf, 0, len, size - len, _);
		var str = buf.toString('utf8');
		var i = str.lastIndexOf('%%EOF');
		isValidEOF = str.substring(i + 5).length !== 0;
		i = str.lastIndexOf('startxref');
		return parseInt(str.substring(i).split('\n')[1], 10);
	}

	function getDefinedTOC(_, pos) {

		function getXRefs() {
			var i = 0,
				range,
				number,
				count,
				xref,
				xrefs = [];

			var xrefsTable = lines.slice(1, trailerIndex);

			function parseXrefTable(line) {
				var comps = line.split(' ');
				return {
					offset: parseInt(comps[0], 10),
					gen: parseInt(comps[1], 10),
					letter: comps[2][0]
				};
			}
			while (i < xrefsTable.length) {
				range = xrefsTable[i].split(' ');
				number = parseInt(range[0], 10);
				count = parseInt(range[1], 10);
				xref = xrefsTable.slice(i + 1, i + 1 + count).map(parseXrefTable);
				xrefs.push({
					readOnly: true,
					number: number,
					count: count,
					xref: xref
				});
				i = i + 1 + count;
			}
			return xrefs;
		}

		function getTrailer() {
			var trailerTable = lines.slice(trailerIndex + 1, startxrefIndex);
			return trailerTable.join(' ').split('<<')[1].split('>>')[0].split('/').slice(1).reduce(function(r, entry) {
				var i = entry.indexOf(' ');
				r[entry.substring(0, i)] = entry.substring(i + 1);
				return r;
			}, {});
		}

		try {
			size = fs.stat(fname, _).size;
			fd = fs.open(fname, 'r+', _);
			var offset = pos == null ? getLastXRefOffset(_) : pos,
				len = size - offset,
				buf = new Buffer(len),
				str;
			if (!isValidEOF) offset = offset + 1;
			len = fs.read(fd, buf, 0, len, offset, _);
			str = buf.toString('utf8');
			var lines = str.split(/ *\r?\n/);
			//console.log("lines0: "+util.inspect(lines[0].substr(0,4)));
			if (lines[0].substr(0, 4) !== 'xref') throw pdfUtils.error(locale.format(module, 'badXRef', util.inspect(lines[0])));

			lines = lines.slice(0, lines.indexOf('%%EOF'));
			var trailerIndex = lines.indexOf('trailer');
			if (trailerIndex === -1) throw pdfUtils.error(locale.format(module, 'badTrailer'));

			var startxrefIndex = lines.indexOf('startxref');
			if (startxrefIndex === -1) throw pdfUtils.error(locale.format(module, 'badStartXRef'));

			var xrefs = getXRefs();
			var trailer = getTrailer();

			return {
				xrefs: xrefs,
				trailer: trailer,
				size: size,
				oldStartXRefOffset: offset
			};
		} finally {
			fs.close(fd, _);
		}
	}

	/// -------------
	/// ## getTOC function :
	/// ``` javascript
	/// var toc = reader.getTOC(_); 
	/// ```
	/// Inspect PDF File and put xrefs table in memory.    
	/// 
	/// Returns xrefs entries information
	/// 
	function getTOC(_) {
		toc = getDefinedTOC(_);
		var prev = toc.trailer.Prev;
		while (prev != null) {

			var previousToc = getDefinedTOC(_, parseInt(prev, 10));
			toc.xrefs = toc.xrefs.concat(previousToc.xrefs);
			prev = previousToc.trailer.Prev;
		}
		return toc;
	}

	function getTOCSection(id) {
		var xref = toc.xrefs.filter(function(xrefs) {
			return (!xrefs.readOnly && xrefs.number + xrefs.count === id);
		})[0];
		if (!xref) {
			toc.xrefs.push(xref = {
				readOnly: false,
				number: id,
				count: 0,
				xref: []
			});
		}
		return xref;
	}

	function getObjProperties(id) {
		var obj;
		if (toc.xrefs.some(function(xref) {
				var result = id >= xref.number && id < xref.number + xref.count;
				if (result) {
					obj = xref;
				}
				return result;
			})) {
			return {
				offset: obj.xref[id - obj.number].offset,
				gen: obj.xref[id - obj.number].gen,
				letter: obj.xref[id - obj.number].letter
			};
		} else {

			throw pdfUtils.error(locale.format(module, 'objectNotFound', id));
		}

	}

	function getObjLen(offset) {
		var nextOffset = toc.size;
		toc.xrefs.forEach(function(xrefs) {
			if (xrefs.xref != null) {
				xrefs.xref.forEach(function(xref) {
					if (xref != null && xref.offset > offset) nextOffset = Math.min(nextOffset, xref.offset);
				});
			}
		});
		return nextOffset - offset;
	}

	/// -------------
	/// ## getObj function :
	/// ``` javascript
	/// var obj = reader.getObj(_,id); 
	/// ```
	/// Get pdf object properties.  
	/// 
	/// * The `id` parameter represents the object reference id.  
	/// 
	/// Returns object information (offset, generation number, letter, length, content, stream)  
	/// 
	function getObj(_, id) {
		//console.log("getObj = "+id);

		var props = getObjProperties(id);
		var len = getObjLen(props.offset);
		try {
			fd = fs.open(fname, 'r+', _);
			var buf = new Buffer(len);
			len = fs.read(fd, buf, 0, len, props.offset, _);

			var content, stream = {
				buffer: null,
				offset: null,
				len: 0
			};

			var binStr = buf.toString('binary');
			var beg = binStr.indexOf('stream');
			if (beg >= 0) {
				var beg0 = beg;
				var match = /\/Length\s+(\d+)/.exec(binStr.substring(0, beg));
				if (!match) throw pdfUtils.error(locale.format(module, 'badStream1', id));
				var dataLen = parseInt(match[1], 10);

				beg += 'stream'.length;
				if (binStr[beg] === '\r') beg++;
				// EM: I have replaced 'badStream1' with 'badStream2' in the following message
				if (binStr[beg] !== '\n') throw pdfUtils.error(locale.format(module, 'badStream2', id, binStr[beg]));
				beg++;

				stream.buffer = new Buffer(binStr.substring(beg, beg + dataLen), 'binary');
				stream.offset = beg;
				stream.len = dataLen;

				var end = binStr.indexOf('endstream', beg + dataLen) + 'endstream'.length;
				content = buf.slice(0, beg0).toString('utf8') + buf.slice(end).toString('utf8');
			} else {
				content = buf.toString('utf8');
			}

			content = content.split(' obj')[1].split('endobj')[0];

			return {
				offset: props.offset,
				gen: props.gen,
				letter: props.letter,
				length: len,
				content: pdfUtils.removeUnnecessaryBlank(content),
				stream: stream
			};
		} finally {
			fs.close(fd, _);
		}
	}

	/// -------------
	/// ## getObjStream function :
	/// ``` javascript
	/// var obj = reader.getObj(_,id); 
	/// ```
	/// Get pdf object stream in original format.  
	/// 
	/// * The `id` parameter represents the object reference id.  
	/// 
	/// Returns object stream inflated  
	/// 
	function getObjStream(_, id) {
		var obj = getObj(_, id);
		if (obj.stream != null) {
			var data = zlib.inflate(obj.stream.buffer, _);
			return data;
		} else {
			return null;
		}
	}

	function checkObjectsIntegrity(_) {
		var integrityOk = true;
		for (var i = 1; i < toc.trailer.Size; i++) {
			try {
				var origin = getObj(_, i).content;

				var transformed = pdfObject.parse(origin);

				if (origin !== transformed.stringify()) {
					integrityOk = false;
					console.error("Error on object [" + i + "]");
					//						console.error("origin      : "+origin);
					//						console.error("transformed : "+transformed.stringify());
					//						console.log("obj transformed : "+JSON.stringify(transformed,null,3));
				}
			} catch (e) {
				console.error(locale.format(module, 'errCheckObj') + i + " : " + e.stack);
				integrityOk = false;
			}
		}

		return integrityOk;
	}

	/// -------------
	/// ## getDocumentHash function :
	/// ``` javascript
	/// var hash = reader.getDocumentHash(_, excludeOffsetBegin, excludeOffsetEnd); 
	/// ```
	/// Get pdf document hash without signature content.  
	/// 
	/// * The `excludeOffsetBegin` parameter represents the begin offset of signature.  
	/// * The `excludeOffsetEnd` parameter represents the end offset of signature.  
	/// 
	/// Returns document hash required to sign PDF document  
	/// 
	function getDocumentHash(_, excludeOffsetBegin, excludeOffsetEnd) {
		excludeOffsetBegin = excludeOffsetBegin != null ? excludeOffsetBegin : 0;
		excludeOffsetEnd = excludeOffsetEnd != null ? excludeOffsetEnd : 0;
		try {
			fd = fs.open(fname, 'r+', _);
			var size = fs.stat(fname, _).size;

			var shabin = crypto.createHash('RSA-SHA1');

			var buf = new Buffer(1024);
			var update = function(_, pos, end) {
				while (pos < end) {
					var l = fs.read(fd, buf, 0, Math.min(buf.length, end - pos), pos, _);
					shabin.update(l === buf.length ? buf : buf.slice(0, l));
					pos += buf.length;
				}
			};
			update(_, 0, excludeOffsetBegin);
			update(_, excludeOffsetEnd, size);

			return shabin.digest('binary');
		} finally {
			fs.close(fd, _);
		}
	}

	return {
		file: fname,
		size: size,
		getTOC: getTOC,
		getTOCSection: getTOCSection,
		checkObjectsIntegrity: checkObjectsIntegrity,
		getObj: getObj,
		getObjStream: getObjStream,
		getDocumentHash: getDocumentHash
	};
};