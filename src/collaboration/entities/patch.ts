"use strict";

var util = require("util");
var integrate = require("syracuse-patch/lib/integrate");
var fs = require('streamline-fs');
var os = require('os');
var locale = require('streamline-locale');
var defaultPatchFile = os.tmpDir() + "/patch.dat";
var adminHelper = require("../../../src/collaboration/helpers").AdminHelper;
var patchtools = require('syracuse-patch/lib/patchtools');
var localhostname = os.hostname();
var config = require('config');
var tracer = require('@sage/syracuse-core').getTracer('patch');

//sets the lock attribute in the settings singleton. 
function setLock(_, lock, setting) {
	if (!setting) {
		var db = adminHelper.getCollaborationOrm(_);
		var setting = db.fetchInstance(_, db.model.getEntity(_, "setting"), {
			sdataWhere: ""
		});
	}
	if (!setting) {
		throw locale.format(module, "noSetting");
	} else {
		if (lock && setting.patchLock(_)) {
			tracer.error && tracer.error("Parallel invocation: system locked");
			throw locale.format(module, "locked");
		} else {
			var result = null;
			setting.patchLock(_, lock); // set or release semaphore lock
			setting.save(_);
		}
	}
	return setting;
}
exports.setLock = setLock;

exports.batchIntegration = function(file, _) {
	var settings;
	var result = null;
	settings = setLock(_, true);
	try {
		result = integrate.clusterPatch(file, null, {
			tryagain: true,
		}, _);
		if (result === "") {
			setLock(_, false, settings);
			return "10;" + locale.format(module, "patchApplied");
		}
		return "0;" + locale.format(module, "intStarted");
	} catch (e) {
		setLock(_, false, settings);
		tracer.error && tracer.error("Error in patch integration", e);
		return "1;" + (e instanceof Error ? e.message : e);
	}
};


exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$autoRecreateWorkingCopy: true,
	$helpPage: "Administration-reference_Patch-integration",
	$properties: {
		localhost: {
			$title: "Local host name",
			$default: localhostname,
			$isReadOnly: true
		},
		patchFile: {
			$title: "Server patch file",
			$default: defaultPatchFile,
		},
		clientFile: {
			$title: "Client patch file",
			$type: "binary",
			$storage: "db_file"
		}
	},
	$titleTemplate: "Patch integration",
	$valueTemplate: "Patch integration",
	$descriptionTemplate: "Patch integration",
	$functions: {},
	$services: {
		$integratePatch: {
			$method: "PUT",
			$isMethod: true,
			$title: "Integrate patch",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				var settings;
				try {
					var result = null;
					settings = setLock(_, true);
					var cl = instance.clientFile(_);
					if (cl.fileExists(_)) {
						var content = cl.createReadableStream(_).read(_, -1).toString();
						if (!content) {
							instance.$diagnoses.push({
								severity: "warning",
								message: locale.format(module, "emptyPatchFile")
							});
							setLock(_, false, settings);
							return;
						}
						var ind = content.indexOf('\n');
						if (ind < 0) ind = content.indexOf('\r');
						if (ind < 0 || !integrate.testPatchHeader(content.substr(0, ind))) {
							instance.$diagnoses.push({
								severity: "error",
								message: locale.format(module, "noSyraPatch")
							});
							setLock(_, false, settings);
							return;
						}
						result = integrate.clusterPatch("-", content, {
							tryagain: true
						}, _);
					} else {
						if (instance.patchFile(_)) {
							result = integrate.clusterPatch(instance.patchFile(_), null, {
								tryagain: true
							}, _);
						} else {
							instance.$diagnoses.push({
								severity: "warning",
								message: locale.format(module, "noPatchFile")
							});
							setLock(_, false, settings);
							return;
						}
					}
					if (result === "") {
						instance.$diagnoses.push({
							severity: "info",
							message: locale.format(module, "patchApplied")
						});
						setLock(_, false, settings);
						return;
					}
					instance.$diagnoses.push({
						severity: "info",
						message: locale.format(module, "stopSession")
					});
				} catch (e) {
					tracer.error && tracer.error("Error in patch integration", e);
					instance.$diagnoses.push({
						severity: "error",
						message: "" + e
					});
					setLock(_, false, settings);
				}
			}
		},
		$integrityCheck: {
			$method: "PUT",
			$isMethod: true,
			$title: "Check integrity",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				var setting;
				try {
					setting = setLock(_, true);
					var ownStatusFuture = patchtools.checkChecksumsAll(!_);
					var foreignStatus;
					var statusValues = [];
					if (config.mockServer) {
						// get status of other servers
						var options = {
							path: "/nannyCommand/notifyOtherNannies/notifyOne/patch/consistency",
							method: "POST"
						};
						foreignStatus = config.mockServer.mockClient.simpleRequest(options, null, _);
						var lines = foreignStatus.split(/[\r\n]+/);
						lines.forEach(function(line) {
							var index = line.indexOf('{');
							if (index >= 0) {
								try {
									statusValues.push(JSON.parse(line.substr(index)));
								} catch (e) {
									instance.$addError(locale.format(module, "errorForeign", e));
									tracer.error && tracer.error("Error in integrity check", e);
								}
							}
						});
					}
					statusValues.push({
						message: ownStatusFuture(_)
					});
					statusValues.forEach(function(statusValue) {
						var hostname = statusValue.hostname || localhostname;
						var message = statusValue.message;
						if (!(message instanceof Object)) { // messages from other servers are just strings and no objects
							try {
								message = JSON.parse(message);
							} catch (e) {
								instance.$addError(locale.format(module, "errorFormat", hostname, message, e));
								errorOccurred = true;
							}
						}
						var errorOccurred = false;
						if (message.work) { // check work directory
							message.work.forEach(function(text) {
								instance.$addError(locale.format(module, "errorWork", hostname, text));
								errorOccurred = true;
							});
						}
						if (message.rel) { // check release directory
							message.rel.forEach(function(text) {
								instance.$addError(locale.format(module, "errorRelease", hostname, text));
								errorOccurred = true;
							});
						}
						if (message.temp) { // check temp directory
							message.temp.forEach(function(text) {
								instance.$addError(locale.format(module, "errorTemp", hostname, text));
								errorOccurred = true;
							});
						}
						if (!errorOccurred) {
							instance.$addDiagnose("info", locale.format(module, "hostOK", hostname));
						}
					});
				} catch (e) {
					tracer.error && tracer.error("Error 2 in integrity check", e);
					instance.$diagnoses.push({
						severity: "error",
						message: e
					});
				} finally {
					if (setting) setLock(_, false, setting);
				}
			}
		},
		$metaData: {
			$method: "PUT",
			$isMethod: true,
			$title: "Get version metadata",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				var setting;
				try {
					setting = setLock(_, true);
					try {
						var version = patchtools.readVersionFile(patchtools.BASE_DIRECTORY, _);
					} catch (e) {
						throw locale.format(module, "noVersion", "" + e);
					}
					for (var key in version) {
						var value = version[key];
						instance.$diagnoses.push({
							severity: "info",
							message: key + ": " + ((value && value instanceof Object) ? JSON.stringify(value) : value)
						});
					}
					if (patchtools.exists(patchtools.RELEASE_DIRECTORY, _)) {
						var relVersion = patchtools.readVersionFile(patchtools.BASE_DIRECTORY + "/" + patchtools.RELEASE_DIRECTORY, _);
						instance.$diagnoses.push({
							severity: "info",
							message: locale.format(module, "relVersion", relVersion["relNumber"])
						});
					} else {
						instance.$diagnoses.push({
							severity: "info",
							message: locale.format(module, "dirNoRelease")
						});
					}
				} catch (e) {
					instance.$diagnoses.push({
						severity: "error",
						message: e
					});
				} finally {
					if (setting) setLock(_, false, setting);
				}
			}
		},
		$deleteSemaphore: {
			$method: "PUT",
			$isMethod: true,
			$title: "Unlock system",
			$execute: function(_, context, instance) {
				instance.$diagnoses = instance.$diagnoses || [];
				try {
					setLock(_, false);
				} catch (e) {
					instance.$diagnoses.push({
						severity: "error",
						message: locale.format(module, "errorUnlock", "" + e)
					});
				}
				tracer.info && tracer.info("Deleted semaphore");
				instance.$diagnoses.push({
					severity: "info",
					message: "OK"
				});
			}
		}
	},
};