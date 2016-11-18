"use strict";

var globals = require('streamline/lib/globals');
var mongodb = require('ez-mongodb');
var zip = require('streamline-zip');
var unzip = require('streamline-zip');
var ez = require('ez-streams');
var fs = require('streamline-fs');
var fsp = require("path");

var locale = require("streamline-locale");
var date = require("@sage/syracuse-core").types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var scheduler = require("syracuse-event/lib/scheduler");
var uuid = require('@sage/syracuse-core').uuid;

var x3client = require('syracuse-x3/lib/client');
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;

var sadFsq = require('syracuse-x3/lib/clients/sadfsq/sadfsqClient');
var SadFsqClient = sadFsq.SadFsqClient;

var scheduler = require("syracuse-event/lib/scheduler");
var sessionManager = require('../../..//src/session/sessionManager').sessionManager;
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;

var importTool = require("syracuse-import/lib/jsonImport");

var tracer = require('syracuse-trace/lib/helper').getTracer('patch');

var config = require('config'); // must be first syracuse require

exports.$exported = true;

function trackMessage(context, severity, message) {
	switch (severity) {
		case "error":
			tracer.error && tracer.error(message);
			break;
		case "info":
			tracer.info && tracer.info(message);
			break;
		default:
			tracer.debug && tracer.debug(message);
			break;
	}

	var t = context && context.tracker;
	if (t) {
		//t.phaseDetail = t.phaseDetail;
		t.$diagnoses = t.$diagnoses || [];
		t.$diagnoses.push({
			$severity: severity,
			$message: message
		});
	}
}

function copyPatch(_, context, update, endpoint, patch) {
	var path = "PATCH/" + patch.path(_);
	trackMessage(context, "info", locale.format(module, "copyPatchTo", path));

	var sadfs = new SadFsqClient(_, endpoint, null, null, false);
	var x3Files = [];
	var refFiles = [];
	try {
		var lsadx = sadfs.readdir(_, {
			folder: endpoint.x3ServerFolder(_),
			path: path,
		});

		lsadx.forEach(function(file) {
			if (!/Error 20$/.test(file)) x3Files.push(file);
		});
	} catch (e) {

	}

	var store = update.file(_);

	if (store.fileExists(_)) {
		var props = store.getProperties(_);
		var patchFolder = "/" + patch.path(_).toUpperCase() + "/";

		var zip = store.createReadableStream(_).readAll(_);
		var total = 0;

		var firstMaintenance = 0;
		var lastMaintenance = 0;
		var nbKept = 0;

		var patchFiles = new unzip.Unzip(
			zip,
			function(filename, filecontent, headers, _) {
				var fname = filename.substring(filename.lastIndexOf('/') + 1);
				var fileOptions = {
					folder: endpoint.x3ServerFolder(_),
					path: options.path + fname
				};
				trackMessage(context, "info", locale.format(module, "copyFile", fname));

				for (var i = 0; i < 3; i++) {
					try {
						sadfs.writeFile(_, fileOptions, filecontent, {
							flag: "w+"
						});
						if (sadfs.stat(_, fileOptions, ["size"]).size > 0) break;
						// Retry a copy if the previous ended with a o size file:
						setTimeout(_, 1000);
						tracer.error && tracer.error("sadfs.writeFile(" + fileOptions.path + ") failed");
					} catch (e) {
						tracer.error && tracer.error("exception in sadfs.writeFile:" + e.stack);
					}
					try {
						sadfs.unlink(_, fileOptions);
					} catch (e) {
						tracer.error && tracer.error("exception in sadfs.unlink:" + e.stack);
					}
				}
			}, {
				filter: function(filename, headers, _) {
					var li = filename.toUpperCase().lastIndexOf(patchFolder);
					var keep = li >= 0 && (li + patchFolder.length) < filename.length;
					if (keep) {
						nbKept++;
						var file = filename.toUpperCase().substring(1 + filename.lastIndexOf('/'));
						if (file.length) {
							var match = file.match(/[A-Z]*_(\d*)_[\w\d]*\.\w{3}/);
							if (match) {
								var maintenance = parseInt(match[1]);
								firstMaintenance = (firstMaintenance) ? Math.min(maintenance, firstMaintenance) : maintenance;
								lastMaintenance = (lastMaintenance) ? Math.max(maintenance, lastMaintenance) : maintenance;
							}

							// Doesn't copy file present on the X3 folder :
							refFiles.push(file);
							keep = !x3Files.some(function(x3File) {
								return x3File.toUpperCase() === file;
							});
						} else {
							keep = false;
						}
					}
					return keep;
				}
			});

		var zipFiles = patchFiles.list(_);
		total = zipFiles.length;
		if (!nbKept) trackMessage(context, "error", locale.format(module, "noPatchFiles", patch.path(_)));


		// Remove files which aren't supposed to be there :
		trackMessage(context, "info", locale.format(module, "cleanUp"));
		x3Files
			.filter(function(file) {
				var uFile = file.toUpperCase();
				return !refFiles.some(function(refFile) {
					return refFile === uFile;
				});
			})
			.forEach_(_, function(_, file) {
				try {
					trackMessage(context, "info", locale.format(module, "unlinkFile", path, file));
					sadfs.unlink(_, {
						folder: endpoint.x3ServerFolder(_),
						path: path,
						name: file,
					});
				} catch (e) {}
			});


		trackMessage(context, "info", locale.format(module, "copyFilesTo", path));
		var options = {
			folder: endpoint.x3ServerFolder(_),
			path: "",
		};
		path.split('/').forEach_(_, function(_, subdir) {
			options.path += subdir;
			trackMessage(context, "info", locale.format(module, "mkdir", options.path));
			var rep = sadfs.mkdir(_, options);
			options.path += "/";
		});

		patchFiles.unzip(_);

		patch.firstMaintenance(_, firstMaintenance);
		patch.lastMaintenance(_, lastMaintenance);
		return path;
	}
}

function applyUpdate(integrate) {
	return function(_, context) {
		tracer.debug && tracer.debug("applyUpdate(" + integrate + ")");

		var instance = this;
		instance.updateInProgress = true;
		var endpoints = instance.endpoints(_);
		var patches = instance.patches(_).toArray(_, true);
		var fcts = [];

		if (context && context.tracker) context.tracker.phaseDetail = locale.format(module, "phase" + (integrate ? "Apply" : "Test"));

		instance.status(_, "");
		instance.detailedStatus(_, "");
		instance.applicationDateTime(_, datetime.now());
		instance.applied(_, true);


		// is there a patch for syracuse ?
		var patch;
		for (var i = 0; i < patches.length; i++) {
			if (patches[i].type(_).toUpperCase() === "SYRACUSE") {
				// YES : apply the patch to the collaboration endpoint
				patchSyracuse(_, context, integrate, instance, adminHelper.getCollaborationEndpoint(_), patches[i]);

				// remove instance patch from the list of 'X3' patches: 
				patches.splice(i, 1);
			}
		}

		endpoints.toArray(_, true).forEach_(_, function(_, epToUpdate) {
			fcts.push(updateEndpoint(!_, context, integrate, instance, epToUpdate, patches));
		});

		// Wait for the execution of all futures :
		fcts.forEach_(_, function(_, fct) {
			fct(_);
		});

		// Set a global status:
		var statuses = {
			error: 0,
			warning: 0,
			success: 0
		};
		endpoints.toArray(_, true).forEach_(_, function(_, epToUpdate) {
			var folders = epToUpdate.folders(_).toArray(_, true);
			folders.forEach_(_, function(_, folder) {
				var folderStatus = folder.status(_);
				statuses[folderStatus] = (statuses[folderStatus] || 0) + 1;
			});
		});

		if (!Object.keys(statuses).some_(_, function(_, status) {
				if (statuses[status]) {
					instance.status(_, status);
					instance.detailedStatus(_, locale.format(module, "update" + status[0].toUpperCase() + status.slice(1)));
					return true;
				}
				return false;
			})) {
			instance.status(_, "error");
			instance.detailedStatus(_, locale.format(module, "noFolderToUpdate"));
		}

		trackMessage(context, instance.status(_), instance.detailedStatus(_));
		instance.save(_);

		instance.updateInProgress = false;
		tracer.debug && tracer.debug("applyUpdate(" + integrate + ") end");
	};
}

var htmlMap = {
	"&": "amp",
	"<": "lt",
	">": "gt",
	'"': 'quot',
	"'": '#39',
	"/": '#x2F',
	"à": "agrave",
	"â": "acirc",
	"é": "eacute",
	"è": "egrave",
	"ê": "ecirc",
	"ë": "euml",
	"î": "icirc",
	"ï": "iuml",
	"ô": "ocirc",
	"ù": "ugrave",
	"û": "ucirc",
	"ç": "ccedil",
	"€": "euro"
};

var regHtmlChars = new RegExp("[" + Object.keys(htmlMap).join('') + "]", "g");


function escapeHtml(string) {
	return String(string.replace(/\s+$/, "").replace(/^\s+/, "")).replace(regHtmlChars, function(s) {
		return '&' + htmlMap[s] + ';';
	});
}


function log2Html(_, title, log, html, diagnoses) {
	var src = ez.devices.buffer.reader(log);
	var lines = ez.transforms.lines;
	var errors = [];

	var nextError = "";
	var errorsSummary = "";

	if (html) {
		html = html.substring(0, html.lastIndexOf("</body>"));
	} else {
		html = '<!doctype html>' + '\n';
		html += '<html>';
		html += '<meta http-equiv="X-UA-Compatible" content="IE=9"/>';
		html += '<head>';
		html += '<title>log</title>';
		html += '<meta charset="utf-8"/>';
		html += '<meta http-equiv="X-UA-Compatible" content="IE=9"/>';
		html += '<link rel="icon" href="/syracuse-ui/themes/desktop/images/site/favicon.ico"/>';
		html += '<link href="/syracuse-ui/themes/desktop/trace.css" rel="stylesheet"/>';
		html += '</head>';
		html += '<body>';
	}
	var isFile = (log.indexOf('\n') !== -1);

	var body = src.transform(lines.parser())
		.map(function() {
			var table;
			return function(_, log) {
				var html = "";
				if (/^#\<AdxVL\>@\(#\)%I%/.test(log) || /^=1000/.test(log)) {
					html = "";
				} else if (/^=0000 /.test(log)) {
					html = "<p>" + escapeHtml(log.substring(6)) + "</p>";
				} else if (/^>/.test(log)) {
					html = '<p class="t-p-G' + log.substring(1, 5) + '">' + escapeHtml(log.substring(6)) + '</p>';
					var error = log.substring(6);
					diagnoses.push({
						$severity: "warning",
						$message: error
					});
				} else if (/^</.test(log)) {
					var error = log.substring(6);
					if (!/^Error in Process Validation QLFAR_COMPILE/.test(error)) {
						diagnoses.push({
							$severity: "error",
							$message: error
						});
						errors.push(escapeHtml(error));

						if (isFile) html = '<a id="error' + nextError + '">';
						html += '<p class="t-p-L' + log.substring(1, 5) + '">' + error;
						if (isFile) {
							html += '</a>';
							errorsSummary += '<p><a href="#error' + nextError + '">' + locale.format(module, "errorNo", (errorsSummary.length + 1), error) + '</a></p>\n';

							nextError = uuid.generate('').toString();
							html += '<a href="#error' + nextError + '">' + locale.format(module, "nextError") + '</a>';
						}
						html += '</p><br/>';
					}
				} else if (/^\+-\w+/.test(log)) {
					var match = log.match(/^\+-(\w+)/);
					if (match && match[1]) html = "<b>" + match[1] + "</b><br/>";

					html += table ? "</table>\n<br/>\n" : "";
					table = "<table>";
					html += table;
				} else if (/^\+-/.test(log)) {
					html = table ? "</table>\n<br/>\n" : "";
					table = undefined;
				} else if (/^[!\-\s]+$/.test(log)) {
					html = "";
				} else if (/^!/.test(log)) {
					html = "";
					if (!table) {
						table = "<table>";
						html = table;
					}
					log = log.substring(1, log.length - 2);
					var lastI = log.lastIndexOf('!');
					if (lastI > 0) log = log.substring(0, lastI);
					html += "<tr>" + log.replace(/-/g, '').split('!').map(function(td) {
						return "<td>" + escapeHtml(td) + "</td>";
					}).join('') + "</tr>";
				} else {
					if (table) {
						html += "</table>\n";
						table = undefined;
					}
					var paragraph = escapeHtml(log);
					html += (paragraph.length) ? '<p>' + paragraph + '</p>' : '<br/>';
				}
				return html;
			};
		}()).toArray(_).join('\n');

	//html += '<p><h1>' + locale.format(module, "summary") + '</h1></p>' + '\n';
	html += '<p><h1>' + title + ' - ' + (new Date()).toLocaleString() + '</h1></p>' + '\n';
	html += errorsSummary;

	if (isFile) {
		var eof = uuid.generate('').toString();
		html += '<p><a href="#' + eof + '">' + locale.format(module, "eof") + '</a></p>\n';
	}

	html += body;
	if (isFile) {
		html += '<a id="' + eof + '">' + locale.format(module, "eof") + '</a><br/>\n';
	}
	html += '\n</body>\n</html>\n';
	return html;
}

function createClient(_, endpoint) {
	tracer.debug && tracer.debug("createClient");
	var context = globals.context;

	try {
		tracer.debug && tracer.debug("locale:" + context.locale);

		var up = globals.context.session && globals.context.session.getUserProfile(_);
		if (up) {
			var user = up.user(_);
			var userName = user.getEndpointLogin(_, endpoint.$uuid).toLowerCase();
			tracer.debug && tracer.debug("user:" + userName);

			var config = {
				tracer: tracer,
				x3solution: endpoint.x3solution(_),
				x3serverTags: "",
				certificate: endpoint.x3solution(_).certificate(_)
			};
			tracer.debug && tracer.debug("client.create");
			var client = x3client.create(config);

			tracer.debug && tracer.debug("client.connect");
			var _x3 = client.connect(_, {
				server: endpoint.x3solution(_).serverHost(_),
				folder: endpoint.x3ServerFolder(_),
				locale: context.locale,
				runtimeLog: "",
				runtimeLogDir: ""
			});

			client.pid = _x3.pid;
			tracer.debug && tracer.debug("baseUrl:", endpoint.getBaseUrl(_));
			client.baseUrl = endpoint.getBaseUrl(_);

			var session = context && (context.httpSession || context.session);
			var peer = session && (session.getData("requestInfo") || {}).peerAddress;

			var adminEP = adminHelper.getCollaborationEndpoint(_);
			tracer.debug && tracer.debug("client.createSession");
			var sid = client.createSession(_, {
				locale: context.locale,
				userName: userName,
				adxtyp: 34, // adxtyp = 34 for rpc calls
				localePreferences: context.localePreferences,
				baseUrl: context && context.baseUrl,
				collaborationBaseUrl: adminEP && session ? session.host + adminHelper.getCollaborationEndpoint(_).getBaseUrl(_) : "",
				peerAddress: peer,
				noCheckLicense: true
			});

			tracer.debug && tracer.debug("client created");
			return client;
		}
	} catch (e) {
		console.error(e.stack);
	}
}

function updateTrace(_, context, folder, title, contents, diagnoses) {
	var htmlContents = "";
	var trace = folder.trace(_);
	if (trace.fileExists(_)) {
		htmlContents = trace.createReadableStream(_).readAll(_).toString("utf8");
	}
	diagnoses = diagnoses || [];
	htmlContents = log2Html(_, title, contents, htmlContents, diagnoses);

	diagnoses.forEach_(_, function(_, diagnose) {
		trackMessage(context, diagnose.$severity, diagnose.$message);
	});

	var writer = folder.trace(_).createWritableStream(_, {
		contentType: "text/html",
		fileName: title,
	});

	// tracer.debug && tracer.debug("write htmlContents:'"+htmlContents+"'");
	writer.write(_, htmlContents, "binary");
	writer.write(_, null);
}

function updateFolder(_, context, integrate, update, epToUpdate, patch, path, folder) {
	var updateChildren = true;
	var traceTitle = patch.name(_);
	var dependency = update.dependency(_);

	var legislation = patch.legislation(_);
	var legislations = folder.legislations(_);
	if (legislations) legislations = legislations.split(',');
	var applyPatch = false;

	if (legislation && (!legislations || legislations.indexOf(legislation) < 0)) {
		updateChildren = true;
		var warning = locale.format(module, "legislationWarning", patch.legislation(_), folder.name(_));
		trackMessage(context, "warning", warning);
		updateTrace(_, context, folder, traceTitle, "<0003>" + warning);

	} else if (!dependency) {
		applyPatch = {
			version: update.version(_),
			folder: folder.name(_),
			directory: path,
			name: patch.name(_),
			integrate: integrate,
			fullmode: true
		};
	} else if (dependency === folder.release(_)) {
		applyPatch = {
			version: update.version(_),
			folder: folder.name(_),
			directory: path,
			name: patch.name(_),
			integrate: integrate
		};
	} else if ((update.version(_) === folder.release(_)) && patch.mandatory(_) && (folder.patch(_) < patch.lastMaintenance(_))) {
		applyPatch = {
			version: update.version(_),
			folder: folder.name(_),
			directory: path,
			name: patch.name(_),
			integrate: integrate,
			statusMaintenance: 3,
			maintenance: folder.patch(_)
		};
	} else if ((update.version(_) === folder.release(_)) && !patch.mandatory(_)) {
		applyPatch = {
			version: update.version(_),
			folder: folder.name(_),
			directory: path,
			name: patch.name(_),
			integrate: integrate
		};
	} else {
		var warning = locale.format(module, "dependencyWarning", update.version(_), folder.name(_), folder.release(_));
		trackMessage(context, "warning", warning);
		updateTrace(_, context, folder, traceTitle, "<0003>" + warning);
	}

	if (applyPatch) {
		updateChildren = false;

		trackMessage(context, "info", locale.format(module, "createClient", folder.name(_), epToUpdate.endpoint(_).description(_)));

		var client = createClient(_, epToUpdate.endpoint(_));
		if (client) {
			trackMessage(context, "info", locale.format(module, "applyX3PatchTo", folder.name(_)));
			// console.log("jsonSend "+epToUpdate.endpoint(_).getBaseUrl(_) + "/$service/rpc?module=ASYRPATCH&name=PATCH");
			var r = client.jsonSend(_, {
				head: {
					"accept": "application/json;vnd.sage=syracuse",
					"accept-language": "en-US",
					"content-type": "application/json",
					method: "POST",
					url: epToUpdate.endpoint(_).getBaseUrl(_) + "/$service/rpc?module=ASYRPATCH&name=PATCH"
				},
				body: applyPatch
			});
			// console.log("response:"+JSON.stringify(r));

			if (r.head.status === 200 && r.body.$diagnoses) {
				updateChildren = true;

				var done;
				r.body.$diagnoses.forEach(function(diag) {
					if (["success", "error"].indexOf(diag.$severity) >= 0) {
						done = diag;
					}
				});
				if (done) {
					try {
						//let's try to get the trace :

						var endpoint = epToUpdate.endpoint(_);
						var sadfs = new SadFsqClient(_, endpoint, null, null, false);
						var fileOptions = {
							folder: endpoint.x3ServerFolder(_),
							path: r.body.trace
						};

						var traceNotFound = true;
						for (var i = 0; i < 3; i++) {
							// Check that the file exist before to read it
							tracer.debug && tracer.debug("? exists " + fileOptions.path);
							if (sadfs.stat(_, fileOptions, ["size"]).size > 0) {
								tracer.debug && tracer.debug("read file " + fileOptions.path);

								var traceContents = sadfs.readFile(_, fileOptions, {
									flag: "r",
									encoding: "utf-8"
								});
								var diagnoses = [];
								updateTrace(_, context, folder, traceTitle, traceContents, diagnoses);
								if (diagnoses.length) {
									// Analyze diagnoses generated by updateTrace:
									// 1°: first sort on severity
									var so = ["error", "warning", "success"];
									var diagnoses = diagnoses.sort(function(a, b) {
										return so.indexOf(a.$severity) - so.indexOf(b.$severity);
									});
									// 2°: get the first element
									if (diagnoses[0].$severity !== "success") {
										// The log contains an error:
										done.$severity = diagnoses[0].$severity;
										done.$message = diagnoses[0].$message;
									}
								}
								traceNotFound = false;
								break;
							}
							// Wait before the next try
							setTimeout(_, 1000);
						}
					} catch (e) {
						// trackMessage(context, "error", e.message);
						// Notify the abort:
						done.$severity = "error";
						done.$message = locale.format(module, "abortPatch");
						trackMessage(context, done.$severity, done.$message);
					}
					if (traceNotFound) {
						done.$severity = "error";
						done.$message = locale.format(module, "traceNotFound", fileOptions.path);
						trackMessage(context, done.$severity, done.$message);
					}

					updateChildren = done.$severity !== "error";
					if (updateChildren) {
						trackMessage(context, done.$severity, done.$message);
						folder.release(_, update.version(_));
						folder.updated(_, date.today());
					}
					folder.status(_, done.$severity);
					folder.detailedStatus(_, done.$message);

				}
			}
			if (client.isAlive()) {
				try {
					client.disconnect(_);
				} catch (e) {
					// Prevent a crash in disconnect to crash the whole function 
					tracer.error && tracer.error(e.message);
				}
			}
		}
	}
	if (updateChildren) {
		tracer.debug && tracer.debug("updateChildren");
		updateFolders(_, context, integrate, update, epToUpdate, patch, path, folder.name(_));
	}
}

function updateFolders(_, context, integrate, update, epToUpdate, patch, path, parent) {
	parent = parent || "";
	tracer.debug && tracer.debug("updateFolders");
	var folders = epToUpdate.folders(_).toArray(_, true);

	var fcts = [];
	folders.forEach_(_, function(_, folder) {
		if (!folder.history(_) && parent === folder.parent(_)) {
			// Execute the update as a future
			fcts.push(updateFolder(!_, context, integrate, update, epToUpdate, patch, path, folder));
		}
	});
	// Wait for the execution of all futures :
	fcts.forEach_(_, function(_, fct) {
		fct(_);
	});
}

function patchStandard(_, context, integrate, update, epToUpdate, patch) {
	var patchName = patch.name(_).toUpperCase();

	trackMessage(context, "info", locale.format(module, "applyX3Patch", patchName));

	// First copy the patch on the server :
	var path = copyPatch(_, context, update, epToUpdate.endpoint(_), patch);
	//var path = "PATCH/X3V7_P3/FILPATCH";

	// Apply the patch
	updateFolders(_, context, integrate, update, epToUpdate, patch, path);

	// Save changes :
	update.save(_);
	//tracer.debug &&  tracer.debug(JSON.stringify(res));  
}

function patchNothing(_, context, integrate, update, epToUpdate, patch) {
	var patchName = patch.name(_).toUpperCase();

	trackMessage(context, "info", locale.format(module, "applyX3Patch", patchName));

}

function patchSyracuse(_, context, integrate, update, epToUpdate, patch) {
	var patchName = patch.name(_).toUpperCase();
	if (!integrate) return;

	trackMessage(context, "info", locale.format(module, "applySyracusePatch", patchName));

	var store = update.file(_);

	if (store.fileExists(_)) {
		var props = store.getProperties(_);
		var root = (props.fileName.substring(0, props.fileName.lastIndexOf('.')) + "/" + patch.path(_) + "/").toUpperCase();

		var zip = store.createReadableStream(_).readAll(_);

		var t = context && context.tracker;

		var options = {
			importMode: "update",
			$diagnoses: t.$diagnoses,
			tracker: t,
			createSession: false
		};

		var patchFiles = new unzip.Unzip(
			zip,
			function(filename, filecontent, headers, _) {
				var fname = filename.substring(filename.lastIndexOf('/'));
				trackMessage(context, "info", locale.format(module, "fileImport", fname));

				if (filename.substring(filename.lastIndexOf('.')).toLowerCase() === ".zip") {
					// First unzip the file 
					var jsonFile = new unzip.Unzip(
						filecontent,
						function(jsonName, jsonContent, headers, _) {
							importTool.jsonImportFromJson(_, null, jsonContent.toString('utf8'), options);
						});
					jsonFile.unzip(_);
				} else {
					importTool.jsonImportFromJson(_, null, filecontent.toString('utf8'), options);
				}
			}, {
				filter: function(filename, headers, _) {
					return (filename.toUpperCase().substring(0, root.length) === root) && (filename.length > root.length);
				}
			});
		patchFiles.unzip(_);
	}
}

function patchSCM(_, context, integrate, update, epToUpdate, patch) {
	var patchName = patch.name(_).toUpperCase();

	trackMessage(context, "info", locale.format(module, "applySCMPatch", patchName));

	// Apply the patch
	var fromFile = patch.path(_);
	var filecontent = fs.readFileSync(fromFile);
	var toFile = "PATCH/" + fsp.basename(fromFile);

	trackMessage(context, "info", locale.format(module, "copyFile", toFile));

	var endpoint = epToUpdate.endpoint(_);
	var sadfs = new SadFsqClient(_, endpoint, null, null, false);
	sadfs.writeFile(_, {
		folder: endpoint.x3ServerFolder(_),
		path: toFile
	}, filecontent, {
		flag: "w+"
	});

	trackMessage(context, "info", locale.format(module, "applyMaintenance", toFile));
	updateFolders(_, context, integrate, update, epToUpdate, patch, toFile);

	// Save changes :
	update.save(_);
	//tracer.debug &&  tracer.debug(JSON.stringify(res));  
}
var patchTypes = {
	X3: patchStandard,
	HR: patchStandard,
	GX: patchStandard,
	IND: patchStandard,
	DIV: patchStandard,
	HRH: patchStandard,
	HRO: patchStandard,
	DOC: patchNothing,
	SCM: patchSCM
};

function findFolder(folder, name) {
	if (folder.name === name) return folder;
	if (folder.folders) {
		for (var i = 0; i < folder.folders.length; i++) {
			var found = findFolder(folder.folders[i], name);
			if (found) return found;
		}
	}
}

// Update folders' information : 
function updateFoldersDesc(_, update, epToUpdate) {
	tracer.debug && tracer.debug("updateFoldersDesc");
	var foldersTree = epToUpdate.endpoint(_).getService(_, "foldersTree");
	epToUpdate.folders(_).toArray(_, true).forEach_(_, function(_, folder) {
		var found = findFolder(foldersTree, folder.name(_));
		if (found) {
			if (found.nump !== folder.patch(_)) {
				var folderDate = (found.dat === "00/00/0000") ? "01/01/1970" : found.dat;
				folder.updated(_, date.parse(folderDate, "dd/MM/yyyy"));
				folder.patch(_, found.nump);
				folder.legislations(_, found.legislations || "");
				update.save(_);
			}
		}
	});
}


function updateEndpoint(_, context, integrate, update, epToUpdate, patches) {
	trackMessage(context, "info", locale.format(module, "updateEndpoint", epToUpdate.endpoint(_).description(_)));
	if (epToUpdate.folders(_).isEmpty()) return;

	// Get folders' descriptions before update
	updateFoldersDesc(_, update, epToUpdate);

	var folders = epToUpdate.folders(_).toArray(_, true);
	folders.forEach_(_, function(_, folder) {
		// Reset folder's status:
		folder.status(_, "error");
		folder.detailedStatus(_, locale.format(module, "notUpdated"));

		// Reset folder's trace:
		var trace = folder.trace(_);
		if (trace.fileExists(_)) trace.deleteFile(_);
	});

	patches.forEach_(_, function(_, patch) {
		if (patch.apply(_)) {
			var type = patch.type(_).toUpperCase();
			type && patchTypes[type] && patchTypes[type](_, context, integrate, update, epToUpdate, patch);
		} else {
			trackMessage(context, "info", locale.format(module, "doesntApplyPatch", patch.name(_).toUpperCase()));
		}
	});

	// Get folders' descriptions after update
	updateFoldersDesc(_, update, epToUpdate);
}

function scheduled(_, instance) {
	var db = adminHelper.getCollaborationOrm(_);
	return db.fetchInstances(_, db.getEntity(_, "eventTime"), {
		jsonWhere: {
			"parameters.update": instance.$uuid
		}
	});
}

function unschedule(_, instance) {
	var db = adminHelper.getCollaborationOrm(_);
	scheduled(_, instance).forEach_(_, function(_, evt) {
		db.deleteInstance(_, evt);
	});
	instance.isScheduled(_, false);
	instance.save(_);
}

exports.entity = {
	$isPersistent: true,
	$canSave: true,
	$titleTemplate: "Update management",
	$descriptionTemplate: "Update management",
	$helpPage: "Administration-reference_Updates",
	$valueTemplate: "{name}",
	$properties: {
		name: {
			$title: "Name",
			$linksToDetails: true,
			$isDisabled: true
		},
		description: {
			$title: "description",
			$isDisabled: true
		},
		file: {
			$title: "Update",
			$type: "binary",
			$storage: "db_file",
			$propagate: function(_, instance, file) {
				instance.fsName(_, file.fsName);
			},
			$uploadDone: function(_, instance) {
				instance.$diagnoses = [];

				var uploaded = false;
				var store = instance.file(_);

				if (store.fileExists(_)) {
					var props = store.getProperties(_);

					var root = props.fileName.substring(0, props.fileName.lastIndexOf('.')) + "/";

					var releaseNote = "";
					var zip = store.createReadableStream(_).readAll(_);
					new unzip.Unzip(
						zip,
						function(filename, filecontent, headers, _) {
							try {
								var contents = JSON.parse(filecontent.toString('utf8'));
								instance.name(_, contents.name);
								instance.version(_, contents.version);
								instance.dependency(_, contents.dependency || "");
								instance.description(_, contents.description);
								instance.releaseNote(_, contents.releaseNote);
								instance.patches(_).reset(_);
								instance.applied(_, false);
								contents.patches.forEach_(_, function(_, p) {
									var patch = instance.patches(_).add(_);
									patch.name(_, p.name);
									patch.type(_, p.type);
									patch.description(_, p.description);
									patch.path(_, p.path);
									patch.mandatory(_, p.mandatory || false);
									patch.firstMaintenance(_, 0);
									patch.lastMaintenance(_, 0);
									patch.legislation(_, p.legislation || "");
									patch.apply(_, true);
								});
								uploaded = true;
							} catch (e) {
								console.error("Error " + e);
							}
						}, {
							filter: function(filename, headers, _) {
								// allow zip file name different of main "in-zip" folder
								return (filename.split("/")[1] || "").toLowerCase() === "update.json";
								//return filename.toLowerCase().substring(root.length) == "update.json";
							}
						}).unzip(_);
					if (releaseNote) {
						new unzip.Unzip(
							zip,
							function(filename, filecontent, headers, _) {
								try {
									var writer = instance.releaseNote(_).createWritableStream(_, {
										contentType: "application/pdf",
										fileName: releaseNote,
									});
									writer.write(_, filecontent, "binary");
									writer.write(_, null);
								} catch (e) {}
							}, {
								filter: function(filename, headers, _) {
									return filename.toLowerCase().substring(root.length) === releaseNote;
								}
							}).unzip(_);
					}
				}
				if (!uploaded) instance.$addError(locale.format(module, "invalidUpdate"));
			}
		},
		version: {
			$title: "Version",
			$isDisabled: true
		},
		dependency: {
			$title: "Dependency",
			$isDisabled: true
		},
		detailedStatus: {
			$title: "Status",
			$isDisabled: true
		},
		applied: {
			$title: "Applied",
			$isDisabled: true,
			$type: "boolean"
		},
		applicationDateTime: {
			$title: "Application Datetime",
			$isDisabled: true,
			$type: "datetime",
			$isNullable: true
		},
		isScheduled: {
			$title: "Scheduled",
			$isDisabled: true,
			$type: "boolean",
			$isNullable: true,
			$propagate: function(_, instance) {
				if (!instance.isScheduled(_)) instance.scheduleDateTime(_, null);
			}
		},
		scheduleDateTime: {
			$title: "Schedule date / time",
			$isDisabled: true,
			$type: "datetime",
			$isNullable: true
		},
		releaseNote: {
			$title: "releaseNote",
			$type: "binary",
			$storage: "db_file"
		},
		status: {
			$title: "Status",
			$isDisabled: true,
			$isHidden: true
		},
		fsName: {
			$title: "fsName",
			$isDisabled: true,
			$isHidden: true,
		}
		/*scheduled: {
			$title: "Scheduled",
			$isDisabled: true
		},*/
	},
	$links: function(_, instance) {
		return {
			releaseNote: {
				$title: "Release Note",
				$method: "GET",
				$url: "/help/new-features",
				$type: "text/html",
				$target: "help"
			}
		};
	},

	$relations: {
		patches: {
			$title: "Patches",
			$type: "updatePatches",
			$inv: "update",
			$isChild: true,
			$isDisabled: true,
			$capabilities: ""
		},
		endpoints: {
			$title: "Apply to endpoints",
			$type: "epToUpdates",
			$inv: "update",
			$isChild: true,
			$isDisabled: false,
			$capabilities: "delete",
			$select: {
				$title: "Endpoints",
				$type: "endPoint", // "lookupRepresentation",
				$fieldMap: {
					endpoint: "$uuid"
				}
			},

		}
	},
	$functions: {
		isDisabled: function(_) {
			if (this.name(_) === undefined || this.endpoints(_).isEmpty()) {
				// is there a patch for Syracuse
				var patches = this.patches(_).toArray(_, true);

				for (var i = 0; i < patches.length; i++) {
					if (patches[i].type(_).toUpperCase() === "SYRACUSE")
						return false;
				}
				return true;
			}
			return false;
		},
		testUpdate: applyUpdate(false),
		applyUpdate: applyUpdate(true),
		fire: function(_, key, parameters) {
			tracer.debug && tracer.debug("event start");

			var session = globals.context.session;
			if (!session) {
				var db = adminHelper.getCollaborationOrm(_);
				var user = db.fetchInstance(_, db.getEntity(_, "user"), parameters.user);
				var role = db.fetchInstance(_, db.getEntity(_, "role"), parameters.role);
				var locale = db.fetchInstance(_, db.getEntity(_, "localePreference"), parameters.locale);

				if (user && role && locale) {
					var diagnoses = [];
					tracer.debug && tracer.debug("createBatchSession");
					session = sessionManager.createBatchSession(_, user, role, locale, diagnoses);
				}
			}
			// Resset the scheduled property
			this.isScheduled(_, false);

			if (session) this.applyUpdate(_, null);
			tracer.debug && tracer.debug("event end");
		},
		getDiagnoses: function(_) {
			var diagnoses = [{
				$severity: this.status(_),
				$message: this.detailedStatus(_)
			}];

			this.endpoints(_).toArray(_, true).forEach_(_, function(_, ep) {
				ep.folders(_).toArray(_, true).forEach_(_, function(_, folder) {
					diagnoses.push({
						$severity: folder.status(_),
						$message: folder.name(_) + ':' + folder.detailedStatus(_)
					});
				});
			});
			return diagnoses;
		},
		scheduleUpdate: function(_, scheduleDateTime, withSave) {
			var instance = this;
			var dtm = scheduleDateTime;
			if (!dtm) throw new Error(locale.format(module, "noScheduleDateTime"));
			var up = globals.context.session && globals.context.session.getUserProfile(_);
			if (up) {
				// First delete any task that could have been scheduled for this update
				unschedule(_, instance);

				//instance.scheduled(_, locale.format(module, "scheduleLabelDate", dtm.toJsDate().toLocaleString()));
				instance.isScheduled(_, true);
				instance.scheduleDateTime(_, dtm);
				if (withSave) instance.$persist(_);

				scheduler.schedule(_, instance, instance.$uuid, dtm, {
					"user": up.user(_) && up.user(_).$uuid,
					"role": up.selectedRole(_) && up.selectedRole(_).$uuid,
					"locale": up.selectedLocale(_) && up.selectedLocale(_).$uuid,
					"update": instance.$uuid
				}, "db");
			}
		}

	},
	$services: {
		test: {
			$method: "POST",
			$title: "Test update",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$facets: ["$details"],
			$isDisabled: function(_, instance) {
				return instance.isDisabled(_);
			},
			$execute: function(_, context, instance) {
				return instance.testUpdate(_, context);
			}
		},
		apply: {
			$method: "POST",
			$title: "Apply update",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$facets: ["$details"],
			$isDisabled: function(_, instance) {
				return instance.isDisabled(_);
			},
			$execute: function(_, context, instance) {
				return instance.applyUpdate(_, context);
			}
		},
		refresh: {
			$method: "POST",
			$isMethod: true,
			$title: "refresh",
			$execute: function(_, context, instance) {}
		},
		schedule: {
			$title: "Schedule update",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details"],
			$parameters: {
				executionDate: null, //new Date(),
				executionTime: null,
				$properties: {
					/*executionDate: {
						$title: "Execution date",
						$description: "Desired patch application date",
						$type: "application/x-date"
					},
					executionTime: {
						$title: "Execution time",
						$description: "Desired patch application time",
						$type: "application/x-time"
					},*/
					executionDateTime: {
						$title: "Execution date time",
						$description: "Desired patch application time",
						$type: "application/x-datetime"
					}
				}
			},
			$execute: function(_, context, instance, parameters) {
				instance.scheduleUpdate(_, datetime.parse(parameters.executionDateTime), true);
			}
		},
		unschedule: {
			$method: "POST",
			$isMethod: true,
			$title: "Unschedule update",

			$isDisabled: function(_, instance) {
				return !scheduled(_, instance).length;
			},

			$execute: function(_, context, instance) {
				unschedule(_, instance);
			}
		},
		remoteApply: {
			$method: "POST",
			$isMethod: false,
			$title: "Service for remote patching",
			$isVisible: false,
			$invocationMode: "async",
			$execute: function(_, context, instance, parameters) {
				// expected parameters :
				// - patch_url : url of the patch zip
				// - solution : solution code
				// - folder : folder code
				// - schedule : date time in ISO format || immediate
				function _error(msg, statusCode) {
					var err = new Error(msg);
					err.$httpStatus = statusCode || 400;
					throw err;
				}
				// remote update creation with parameters
				var pars = parameters || {};
				var url = pars.patch_url;
				if (!url) _error(locale.format(module, "errNoUrl"));
				//
				var db = adminHelper.getCollaborationOrm(_);
				var update = db.getEntity(_, "update").createInstance(_, db);
				// name : patch file name
				var name = (url.split("?")[0] || "").split("/").pop();
				// get the zip file
				var reader = ez.factory(url).reader(_);
				var store = update.file(_);
				var writer = store.createWritableStream(_, {
					contentType: "application/x-zip-compressed",
					fileName: name
				});
				var chunk;
				while (chunk = reader.read(_)) writer.write(_, chunk);
				writer.write(_);
				// uploadDone not required anymore as automatically managed now
				// store.uploadDone(_);
				// manage endpoints
				var opt = pars.solution ? {
					jsonWhere: {
						code: pars.solution
					}
				} : {};
				var solutions = db.fetchInstances(_, db.getEntity(_, "x3solution"), opt);
				if (solutions.length === 0) _error(locale.format(module, "noSolutionFound"));
				if (solutions.length > 1) _error(locale.format(module, "tooManySolutionFound"));
				//
				var folder = pars.folder;
				if (!folder) {
					// get the root folder
					var ffs = solutions[0].getFoldersJson(_);
					(ffs || []).some_(_, function(_, ff) {
						if (!ff.mother || (Array.isArray(ff.mother) && ff.mother.length === 0)) {
							folder = ff.name;
							return true;
						} else return false;
					});
					if (!folder) _error(locale.format(module, "noRootFolderFound", solutions[0].solutionName(_)));
				}
				var opt = {
					jsonWhere: {
						x3solution: solutions[0].$uuid
					}
				};
				if (folder) opt.jsonWhere.x3ServerFolder = folder;
				var folders = db.fetchInstances(_, db.getEntity(_, "endPoint"), opt);
				if (folders.length === 0) _error(locale.format(module, "noFolderFound"));
				if (folders.length > 1) _error(locale.format(module, "tooManyFolderFound"));
				//
				update.endpoints(_).add(_).endpoint(_, folders[0]);
				//
				update.$persist(_);
				// schedule after persist and with save to avoid creating a schedule if there is a save error
				if (pars.schedule) {
					if (pars.schedule === "immediate") update.applyUpdate(_, context);
					else update.scheduleUpdate(_, datetime.parse(pars.schedule), true);
				}
				//
				return {
					$url: update.computeUrl()
				};
			}
		}
		/*,
		testSCM: {
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$title: "testSCM",
			$execute: function(_, context, instance) {
				var result = exports.applyPatches(_,context,"SCM","SCM description","SUPERV",[{
						name:"SCM Patch",
						type:"SCM",
						description:"SCM Patch description",
						path:"C:\\temp\\Update\\SCM\\DOCKER\\TEST_SCM.dat"
					}]);
				console.log("testSCM:",result);
			}
		}*/
	},
	$defaultOrder: [
		["applied", true],
		["applicationDateTime", false]
	],

};

function _getEndpoint(_, context, endPointName) {
	var db = context.db;
	var endPoint = db.fetchInstance(_, db.getEntity(_, "endPoint"), {
		jsonWhere: {
			dataset: endPointName
		}
	});

	if (!endPoint) throw new Error("Invalid endPoint name " + endPointName);
	return endPoint;
}


exports.applyPatches = function(_, context, name, description, endpointId, patches) {
	var result = {};
	try {
		// Create an update

		tracer.debug && tracer.debug("applyPatch " + name + " on endpoint " + endpointId);

		var db = adminHelper.getCollaborationOrm(_);
		var updateEntity = db.getEntity(_, "update");
		var update = updateEntity.createInstance(_, db, null);
		result.update = {
			uuid: update.$uuid
		};

		update.name(_, name);
		update.description(_, description);
		update.dependency(_, "");
		update.version(_, "10.0.0");

		var endPoint = _getEndpoint(_, context, endpointId);

		// Associate this endpoint to the update :
		update.endpoints(_).reset(_);
		var epToUpdate = update.endpoints(_).add(_);
		epToUpdate.endpoint(_, endPoint);

		// Add the main folder of this endpoint to update: 
		epToUpdate.folders(_).reset(_);
		var folder = epToUpdate.folders(_).add(_);
		folder.name(_, endPoint.x3ServerFolder(_));
		tracer.debug && tracer.debug("applyPatch " + name + " on folder " + folder.name(_));
		folder.parent(_, "");
		folder.updated(_, "");

		// Add a patch to the update
		update.patches(_).reset(_);

		patches.forEach_(_, function(_, patchData) {
			var patch = update.patches(_).add(_);
			patch.name(_, patchData.name);
			patch.type(_, patchData.type);
			patch.description(_, patchData.description);
			patch.path(_, patchData.path);

			// Default values:
			patch.mandatory(_, true);
			patch.firstMaintenance(_, 0);
			patch.lastMaintenance(_, 0);
			patch.apply(_, true);
		});

		update.save(_);

		tracer.debug && tracer.debug("update.applyUpdate");
		update.applyUpdate(_, context);
		result.$diagnoses = update.getDiagnoses(_);
	} catch (err) {
		tracer.error("applyPatch :" + err.message);

		result.errorMessage = err.message;
		result.$diagnoses = [{
			severity: "error",
			message: err.message
		}];
	}
	return result;
};