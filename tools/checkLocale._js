#!/usr/bin/env _node
"use strict";

/// Usage: _node checkLocale [-s] [-m] [-c] <File or directory>
/// switches: -s treat files within directories in alphabetical order (for unit tests)
///           -c write strings-en.json with data from entities
///           -m change source files which contain strings with marker $#$: The part before $#$ will be regarded as a key, the part
///              behind it as corresponding localized message. The string may be extended with variables and function calls, 
///              e. g. "test$#$A"+foo(2)+"b" will be converted to locale.format(module, "test", foo(2)) with message "A{0}b" in 
///              the resource file.

var fs = require("fs");
var path = require('path');
var util = require('util')
var _module = require('module');
var _compile = _module.prototype._compile;
var options = {}; // -c: correct string resources, -s: sort directories (for unit test), -m make new messages with locale.format 
var RESOURCE_CHANGED = ">>>"; // dummy entry for strings resources to indicate that contents have changed

var strings = {}; // object with contents of all strings.json files with data from entities
var usedStrings = {}; // referenced strings


//formatted output of object in JSON format. All values will be converted to strings unless they are objects
function toJSON(object, indent) {
	var result = "{\n"
		var indentInner = (indent || "")+"\t";
	var init = true;
	Object.keys(object).sort().forEach(function(key) {
		if (key === RESOURCE_CHANGED) return;
		if (init) init = false
		else result += ",\n";
		result += indentInner+'"'+key+'": ';
		var value = object[key];
		if (value instanceof Object) {
			result += toJSON(value, indentInner);
		} else {
			result += '"'+value.toString().replace(/(["\\])/g, "\\$1")+'"';
		}
	});
	// final part
	result += (init ? "" : "\n")+(indent || "")+"}";
	return result;
}

function checkFile(filepath, buf) {
	var stringsResourceContents; // contents of corresponding strings-en.json file.
	var usedStringsResources; // all referenced strings from stringsResourceContents come here
	filepath = filepath.replace(/\\/g, "/"); // normalize path separator

	// traverse all attributes
	function traverse(obj, prefix) {
		var keys = Object.keys(obj);
		var j = keys.length;
		while (--j >= 0) {
			var key = keys[j];
			var val = obj[key];
			var name = prefix+"."+key
			switch (key) {
			case "$title":
			case "$description":
			case "$titleTemplate":
			case "$descriptionTemplate":
			case "$valueTemplate":
			case "$valueTitleTemplate":
			case "$createActionTitle":
			case "$listTitle":
				// test whether there is translatable content
				var val1 = val;
				var temp;
				// remove all placeholders
				while ((temp = val1.replace(/\{\w+\}/g, "")) !== val1) {
					val1 = temp;
				}
				// console.log("1. "+val+" - "+val1);
				// when only whitespace remains, do not put it into strings-en.json
				if (/^\s*$/.test(val1)) continue;
				putStringResource(name, val)
				continue;
			case "$default": 
				if (val && !(val instanceof Object) && !("$enum" in obj) && (!("$type" in obj) || obj.$type === "string")) {
					putStringResource(name, val)
				}
				continue;
			case "$enum": 
				if (Array.isArray(val)) {
					val.forEach(function(enumPart) {
						putStringResource(prefix+"."+enumPart.$value, enumPart.$title)
					})
				}
				continue;
			case "$properties":
			case "$relations":			
				name = prefix;  // do not include "$properties" into key
				break;
			}
			if (val instanceof Object) {
				traverse(val, name);
			}
		}
	}

	function putStringResource(name, value) {
		// console.log("PSR "+name)
		usedStringsResources[name] = 1;
		if (name in stringsResourceContents) {
			if (stringsResourceContents[name] !== value) mess(null, "Entity resource "+name+" differs. Entity value <"+value+"> resource value <"+stringsResourceContents[name]+">");
			usedStringsResources[name] = 1;
		} else {
			if ("-c" in options) {
				stringsResourceContents[RESOURCE_CHANGED] = true; // dummy entry: contents have changed
				stringsResourceContents[name] = value;
			} else mess(null, "Entity resource "+name+" not in resource file");			
		}
	}


	var content = buf.toString('utf8')
	var decl = false;
	var messages = [];
	var dirname = path.dirname(filepath)
	var filename = path.basename(filepath).replace(/\..*$/, ""); // basename without extension
	var resourceContents;
	// console.log("PATH "+filepath)
	function mess(i, message) {
		messages.push((i ? "Line "+(i+1)+": " : "")+message);
	}


	// path of resource file
	var resource = dirname+"/resources/"+filename+"-en.json";
	// console.log("Resource file "+resource)
	try {
		resourceContents = fs.readFileSync(resource, "utf8");		
	} catch (e) {
		// console.log("Read resource exception "+e)
	}
	if (resourceContents) {
		try {
			resourceContents = JSON.parse(resourceContents);		
		} catch (e) {
			resourceContents = {};
			mess(null, "Resource file "+resource+" does not contain valid JSON")
		}
	}

	if (path.basename(filepath) === "strings.js") {
		if (!(dirname in strings)) {
			try {
				resourceContents = JSON.parse(resourceContents);
			} catch (e) {
				resourceContents = {};
				mess(null, "Resource file "+resource+" does not contain valid JSON")
			}
			strings[dirname] = resourceContents
			usedStrings[dirname] = {};
		}
		return;
	}	


	if (dirname.indexOf("/representations") >= 0 || (filepath.substr(filepath.length-4) === "._js" && dirname.indexOf("/entities") >= 0)) {
		var testpath = dirname.replace(/\/(entities|representations).*/, "");
		if (testpath in strings) {
			stringsResourceContents = strings[testpath];
			usedStringsResources = usedStrings[testpath]
		} else {
			// resource not yet loaded
			var stringResource = testpath+"/resources/strings-en.json"
			try {
				var cont = fs.readFileSync(stringResource);
				stringsResourceContents = JSON.parse(cont);
				strings[testpath] = stringsResourceContents;
				usedStrings[testpath] = {};
				usedStringsResources = usedStrings[testpath];

			} catch (e) {			
				stringsResourceContents = {};
				usedStringsResources = {};
				mess(null, "String resource file "+stringResource+" does not contain valid JSON")
			}
		}
	}

	if (stringsResourceContents && dirname.indexOf("/representations") >= 0) {
		// search for "key words" in representations
		// console.error("REP "+filename)
		var entName = filename;
		var re = /\{(\@\w+)\}/g;
		var r

		while ((r = re.exec(content))) {
			var key = entName+"."+r[1];
			usedStringsResources[key] = 1; 
			if (entName in stringsResourceContents && (r[1] in (stringsResourceContents[entName]))) {
				// console.error("USR "+key)
			} else {
				mess(null, "Missing representation resource "+r[1]);
			}
		}
	}

	if ("-m" in options) { // convert messages
		var tmpResourceContents = resourceContents || {};

		content = convert(content, tmpResourceContents)
		if (RESOURCE_CHANGED in tmpResourceContents) { // check whether locale is defined
			resourceContents = tmpResourceContents; // maybe no resource contents yet
			if (!/locale\s*\=\s*require\s*\(\s*([\"\'])syracuse-core\/lib\/locale\1/.test(content)) {
				var r;
				var index = 0;
				// is there some block of require definitions before the first function declaration?
				if ((r = /((?:^|\r\n|\n|\r)+)\s*(?:(function)\s*\w?|var\s+\w+\s*\=\s*require)\s*\(/.exec(content)) && !r[2]) {
					index = r.index+r[1].length;
				} else { // no require definitions block found - put it at the beginning of the file
					if (r = /(?:^|\r\n|\n|\r)\"use strict\"\s*[\n\r]*/.exec(content)) { // put it after "use strict"
						index = r.index+r[0].length;
					}
				}
				content = content.substr(0, index) + 'var locale = require("syracuse-core/lib/locale");\n' + content.substr(index);
			}
			fs.writeFileSync(filepath, content);
		}
	}

	var resourceParameters = {};
	if (resourceContents) {
		Object.keys(resourceContents).forEach(function(key) {
			var value = resourceContents[key]
			var re = /\{(\d+)/g;
			var r;
			var max = -1;
			while (r = re.exec(value)) {
				if (max < r[1]) max = r[1];
			}
			resourceParameters[key] = 1*max+3;
		})
	}

	// console.log("resources "+JSON.stringify(resourceContents))
	var missingLocale = false;
	var localizePattern = null;
	var lines = content.split(/\r\n|\r|\n/);
	for (var i = 0; i<lines.length; i++) {
		var line = lines[i];
		if (/^\s*\/\//.test(line)) continue;
		if (line.search(/^\s*(var\s+?)(\w+)\s*\=\s*require\s*\(\s*['"]syracuse-core\/lib\/locale['"]\s*\)/) >= 0) {
			decl = true;
		}
		var r
		if (r = /(\w+)\s*\=\s*locale\.resources\s*\(\s*module\s*\)\s*(\(\s*\))?(?!\()/.exec(line)) {
			localizePattern = new RegExp(r[1]+"\\b"+(r[2] ? "" : "(\\(\\s*\\))?")+"\\.(\\w+)");
			if (r[2]) mess(i, "Static resources access")
		}
		var re = /locale\.format\s*\(/g;
		if (localizePattern && (r = localizePattern.exec(line))) {
			if (r[2]) {
				var keyWord = r[2];
				if (!r[1]) mess(i, "Missing brackets in reference to locale.resources function for "+keyWord)
			} else {
				var keyWord = r[1];				
			}
			// console.log(line+"  KEY "+keyWord+" "+util.format(r))
			if (!resourceParameters || !(keyWord in resourceParameters)) {
				mess(i, "Key not defined in resource file: "+keyWord);
			} else {
				resourceParameters[keyWord] = -Math.abs(resourceParameters[keyWord]);

			}
		}
		while(r = re.exec(line)) {
			var line_remaining = line.substr(r.index+r[0].length);
			if (!decl && !missingLocale) {
				missingLocale = true;
				mess(null, "Missing declaration of locale")
			}
			if (!resourceParameters) {
				mess(null, "No resource file available")
			}
			var closingBracket = -1;
			while (closingBracket < 0 && i < lines.length) {
				// console.log("Remaining after locale format"+line_remaining);
				// replace special characters
				line_remaining = line_remaining.replace(/\\['"\\]/g, "!");
				// replace everything within strings
				line_remaining = line_remaining.replace(/(['"])(.*?)\1/g, function(a0, a1, a2) { return a1+a2.replace(/\W+/,"!")+a1; });;
				// remove all closed brackets
				var tmp = line_remaining
				while ((tmp = line_remaining.replace(/\([^\)]*\)/, "")) !== line_remaining) {
					line_remaining = tmp;
				}
				// console.log("Remaining after removed brackets "+line_remaining);
				var closingBracket = line_remaining.indexOf(")")
				if (closingBracket < 0) { // no closing bracket found: take next line
					i++;
					line_remaining += lines[i]; 
				}				
			}
			line_remaining = line_remaining.substr(0, closingBracket);
			// console.log("Remaining after removed brackets2 "+line_remaining);
			var parts = line_remaining.split(/\s*,\s*/)
			// console.log(i+"parts"+JSON.stringify(parts))
			if (parts.length < 2) {
				mess(i, "Not enough arguments for locale.format: "+line);
				break;
			}
			var keyWord = "";
			var localizeCall = 0; // 1 for locale.format(localize.xxx), 0 for locale.format(module, ...)
			if (!/^(["'])\w+\1$/.test(parts[1])) {
				if (localizePattern && (r = localizePattern.exec(parts[0]))) {
					keyWord = r[2] ? r[2] : r[1];
					localizeCall = 1;
				} else {
					mess(i, "Second argument for locale.format is not simple: "+line);
					break;					
				}
			}
			if (parts[0] !== "module"  && !localizeCall) {
				mess(i, "First argument not 'module' for locale.format: "+line);
				break;
			}		
			// number of arguments...
			keyWord = keyWord || parts[1].replace(/["']/g, "");
			if (!resourceParameters || !(keyWord in resourceParameters)) {
				mess(i, "Key not defined in resource file: "+keyWord);
				break;
			} else {
				var parameterCount = Math.abs(resourceParameters[keyWord]);
				if (parameterCount !== parts.length+localizeCall) {
					mess(i, "Key "+keyWord+": Parameters in message "+(parameterCount-2)+", parameters in invocation "+(parts.length-2))
				}
				resourceParameters[keyWord] = -parameterCount				
			}
		}
	}
	if (resourceParameters) {
		Object.keys(resourceParameters).forEach(function(key) {
			if (resourceParameters[key] > 0 && key !== RESOURCE_CHANGED) {
				mess(null, "Unused key in resource: "+key);
			}
		})
	}
	if (stringsResourceContents && dirname.indexOf("/entities") >= 0) {
		var absolute = path.resolve(filepath)
		var basename = path.basename(filepath);
		basename = basename.replace(/\..*$/, "")
		var r = /(^|\r|\n)\s*exports\.entity\s*\=/.exec(content);
		if (!r) {
			console.error("No exports.entity in "+filepath);
			return;
		} else {
			// get globally defined variables
			var content0 = content.substr(0, r.index);
			var re = /(?:^|\r|\n)var\s+(\w+)\s*\=/g;
			var res
			var content1 = "";
			while (res = (re.exec(content0))) {
				content1 += "var "+res[1]+" = {}\n"
			}
			content1 += content.substr(r.index);
			var modull = { exports: {} };
			var res = _compile.call(modull, content1, filepath);
			traverse(modull.exports.entity, filename)

		}

	}
	if (messages.length > 0) {
		console.error("Messages for "+filepath+"\n"+messages.join("\n")+"\n")
	}
	if (resourceContents && RESOURCE_CHANGED in resourceContents) {
		try {
			fs.mkdirSync(dirname+"/resources");
		} catch (e) { // ignore error - then directory is already there			
		}
		try {
			console.log("FILENAME "+filename)
			fs.writeFileSync(dirname+"/resources/"+filename+"-en.json", toJSON(resourceContents));					
		} catch (e) {
			console.log("write exception "+e)
		}
	}
}



function scan(_, f) {
	if (f.indexOf('socket.io/support/expresso/deps/jscoverage/tests') >= 0 //
			|| f.indexOf('/dotnet/') >= 0 //
			|| f.indexOf('/junk/') >= 0) return;
	var stat = fs.lstat(f, _);
	if (stat.isDirectory()) {
		var files = fs.readdir(f, _);
		if ("-s" in options) files = files.sort();
		files.forEach_(_, function(_, n) {
			if (n !== '.git' && n !== '.svn') scan(_, f + "/" + n);
		});
	} else if (!stat.isSymbolicLink()) {
		var ext = f.substring(f.lastIndexOf('.')).toLowerCase();
		if (ext === '.js' || ext === '._js') {
			var data = fs.readFile(f, _);
			checkFile(f, data);
		}
	}
}

//returns part of name before irst dot, e. g. firstComponent("a.b") === "a", firstComponent("a") === "a";
function firstComponent(name) {
	var index = name.indexOf('.');
	if (index >= 0) return name.substr(0, index)
	else return name;	
}

// do not run this within tests
if (require.main === module) {
	try {
		var directory;
		var index = 2;
		while (process.argv[index].substr(0, 1) === "-") {
			options[process.argv[index]] = 1;
			index++;
		}
		scan(_, process.argv[index] || '.');
		// unused strings in strings resources
		Object.keys(strings).forEach(function(resource) {
			var res = strings[resource]
			var usedRes = usedStrings[resource]
			var beginnings = {};
			Object.keys(usedRes).forEach(function(key) {
				beginnings[firstComponent(key)] = 1;
			})
			console.error("Resource file "+resource+"/resources/strings-en.json")
			Object.keys(res).forEach(function(key) {
				if (key === RESOURCE_CHANGED) { // dummy entry to indicate that file has changed				
					fs.writeFileSync(resource+"/resources/strings-en.json", toJSON(res))
					return;
				}
				var first = firstComponent(key) 
				if (beginnings[first] === 1) { // some keys of this component have been used				
					if (res[key] instanceof Object) {
						var rep = res[key]; // key words of representation
						Object.keys(rep).forEach(function(key1) {
							if (!((key+"."+key1) in usedRes)) console.error("Key word "+key1+" not used for representation "+key)
						})
					}
					if (!(key in usedRes) && !(key in beginnings)) console.error("Key not used "+key)
					// else console.error("--- Key used"+key)
				} else {
					if (!beginnings[first]) {
						beginnings[first] = 2;
						console.error("Entity/representation "+first+" not scanned")
					}
				} 
			})
		})
	} catch (ex) {
		console.error("ERROR: " + ex);
	}	
}


// skip comment part
function _comment(rest, r) {      
	if (r[0] === '//') {
		var rest1 = rest.substr(r.index+2);
		var r1 = /[\r\n]+/.exec(rest1);
		if (r1) {
			return r.index+2+r1.index+r1[0].length;
		} else return rest.length;
	} else if (r[0] === '/*') {
		var index = rest.indexOf("*/", r.index);
		if (index >= 0) return index;
		else throw "Commentary not finished";
	}
	return 0;
}

// convert strings marked with $#$ to a call of a localized message and put the corresponding key and value to the resource object.
// return value: the text with replacements. The function throws an error when the key already exists in the resource object.
function convert(text, resource) {
	var r;
	while((r = /(["'])(\w+)\$\#\$/.exec(text))) {    
		var index = r.index+r[0].length;    
		var globalStartIndex = r.index;
		var startIndex = index;
		var str = r[1];
		var label = r[2];
		if (label in resource) throw "Key "+label+" already in resource file!";
		var brack = "";
		var closeBrack = "";
		var level = 0;
		var parameters = [];
		var message = "";
		var closingBrackets = { '(': ')', '[': ']' };
		while (index < text.length) {
			var rest = text.substr(index);
			if (str) {
				r = /[\\\"\']/.exec(rest);
				if (r) {
					if (r[0] === '\\') { // skip next character
						index += (r.index+2);
						continue;
					} else {
						if (r[0] === str) { // end of string
							str = "";
							index += r.index+1;
							message += text.substring(startIndex, index-1);
						} else {
							index += r.index+1;
						}
						continue;
					}
				} else throw "Unexpected end of input1";
			}
			if (level > 0) {
				switch (brack) {
				case '[': r = /(\[|\]|\/\/|\/\*)/.exec(rest);
				break;
				case '(': r = /(\(|\)|\/\/|\/\*)/.exec(rest);
				break;
				}
				if (r) {
					if (r[0] === brack) {
						level++;
						index += r.index+1;
						continue;
					}
					if (r[0] === closeBrack) {
						level--;
						index += r.index+1;
						if (level === 0) {
							brack = closeBrack = '';
							parameters[parameters.length-1] += text.substring(startIndex, index);
						}
						continue;
					}
					var c = _comment(rest, r);
					if (c > 0) {
						index += c;
						continue;
					}
				} else throw "Bracket level not finished";
			}  

			// outside strings and brackets
			r = /^\s*\+\s*(\"|\'|\(|[\w\.]+)/.exec(rest);
			if (r) {
				if (r[1] === '"' || r[1] === "'") {
					str = r[1];
					index += r.index+r[0].length;
					startIndex = index;
					continue;          
				}   
				// new parameter
				message += "{"+parameters.length+"}";
				parameters[parameters.length] = "";       
				if (r[1] === '(') {
					brack = r[1]; 
					closeBrack = closingBrackets[brack];
					level = 1;
					index += r.index+r[0].length;
					startIndex = index-1;
					continue;
				}
				// just number or variable
				index += r.index+r[0].length;
				parameters[parameters.length-1] += r[1];
				startIndex = index;
				continue;
			} 
			// opening bracket
			r = /^\s*([\(\[])/.exec(rest);
			if (r) {
				brack = r[1]; 
				closeBrack = closingBrackets[brack];
				level = 1;
				index += r.index+r[0].length;
				startIndex = index-1;
				continue;
			} 
			// property of an object
			r = /^\.[\w\.]+/.exec(rest);
			if (r) {
				index += r.index+r[0].length;
				parameters[parameters.length-1] += r[0];
				startIndex = index;
				continue;
			}         
			break; // cannot continue
		}
		text = text.substr(0, globalStartIndex)+'locale.format(module, "'+label+'"'+ (parameters.length ? ", " : "") + parameters.join(", ")+")" + text.substr(index);
		resource[label] = message;
		resource[RESOURCE_CHANGED] = 1;

	}
	return text;
}


exports.convert = convert;