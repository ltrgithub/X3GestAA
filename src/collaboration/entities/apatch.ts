"use strict";

var sys = require("util");
var patchcreate = require("syracuse-patch/lib/patchcreate");
var patchtools = require("syracuse-patch/lib/patchtools");
var fs = require('streamline-fs');
var os = require('os');
var config = require('config');
var setLock = require('./patch').setLock;
var rolloutRepoValue = config.patch ? config.patch.rolloutRepo : "";
var customerImageValue = config.patch ? config.patch.customerImage : "";
var defaultPatchFile = os.tmpDir() + "/patch.dat";

function _getSha1(version, _) {
	return version ? version.rollout(_) : "";
}

exports.entity = {
	$isPersistent: false,
	$canDelete: false,
	$canSave: false,
	$autoRecreateWorkingCopy: true,
	$properties: {
		newPatch: {
			$type: "boolean",
			$title: "Make new patch",
			$default: true,
			$isDisabled: function(_, instance) {
				return instance.newRelease(_);
			}
		},
		rolloutRepo: {
			$title: "Roll-out repository",
			$default: rolloutRepoValue,
			$isReadOnly: true
		},
		customerImage: {
			$title: "CustomerImage",
			$default: customerImageValue,
			$isReadOnly: true
		},
		newRelease: {
			$type: "boolean",
			$title: "Create new branch",
			$default: false
		},
		startFromRelease: {
			$type: "boolean",
			$title: "Start from branch",
			$default: false
		},
		x3Information: {
			$type: "boolean",
			$title: "Include X3 patch information",
			$default: true
		},
		newReleaseNumber: {
			$title: "New branch",
			$default: "1", // ""
			$isDisabled: function(_, instance) {
				return !instance.newRelease(_);
			},
			$isMandatory: function(_, instance) {
				return instance.newRelease(_);
			}
		},
		comment: {
			$title: "Description",
			$default: "",
			$isDisabled: function(_, instance) {
				return !instance.newRelease(_) && !instance.newPatch(_);
			},
			$isLocalized: true
		},
		baseRelease: {
			$title: "Base branch",
			$isDisabled: function(_, instance) {
				return instance.newRelease(_);
			}
		},
		patchFile: {
			$title: "Patch file name",
			$default: defaultPatchFile,
		},
		checkSource: {
			$title: "Check source repository",
			$type: "boolean",
			$default: true,
			$isDisabled: function(_, instance) {
				return !instance.newRelease(_) && !instance.newPatch(_);
			}
		}
	},
	$titleTemplate: "Patch creation",
	$valueTemplate: "Patch creation",
	$descriptionTemplate: "Patch creation",
	$relations: {
		versionOld: {
			$title: "Start version",
			$isDisabled: function(_, instance) {
				return (!instance.newRelease(_) && instance.newPatch(_)) || instance.baseRelease(_) || instance.startFromRelease(_);
			},
			$type: "patchLevel",
			$inv: "patches"
		},
		versionNew: {
			$title: "End version",
			$isDisabled: function(_, instance) {
				return instance.newRelease(_) || instance.newPatch(_);
			},
			$type: "patchLevel",
			$inv: "patches"
		}
	},
	$functions: {},
	$services: {
		$createPatch: {
			$method: "POST",
			$isMethod: true,
			$title: "Create patch",
			$permanent: true,
			$invocationMode: "async",
			$execute: function(_, context, instance) {
				function _track(phase, detail, progress) {
					if (!context.tracker) return;
					context.tracker.phase = phase;
					context.tracker.phaseDetail = detail;
					context.tracker.progress = progress;
				}
				var t = context && context.tracker;
				var diags = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);

				var setting = setLock(_, true);
				try {
					console.log("Before");
					var sha1Old = _getSha1(instance.versionOld(_), _);
					var sha1New = _getSha1(instance.versionNew(_), _);
					patchcreate.createPatch(_track, instance.newPatch(_), instance.startFromRelease(_), instance.newRelease(_), instance.newReleaseNumber(_), instance.comment(_), instance.baseRelease(_), instance.patchFile(_), sha1Old, sha1New, instance.x3Information(_), instance.checkSource(_), _);
					console.log("After");
					_track("Finished", "OK", 100);
				} finally {
					if (setting) setLock(_, false, setting);
				}
				return instance;
				console.log("End");
			}
		},
		$customerDir: {
			$method: "POST",
			$isMethod: true,
			$title: "Create customer image",
			$permanent: true,
			$invocationMode: "async",
			$execute: function(_, context, instance, parameters) {
				function _track(phase, detail, progress) {
					if (!context.tracker) return;
					context.tracker.phase = phase;
					context.tracker.phaseDetail = detail;
					context.tracker.progress = progress;
				}
				var t = context && context.tracker;
				var diags = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				var setting = setLock(_, true);
				try {
					patchcreate.createCustomerImage(_track, config.patch, _, instance.baseRelease(_));
					_track("Finished", "OK", 100);
				} finally {
					if (setting) setLock(_, false, setting);
				}
				return instance;
			}
		},
		$deleteSemaphore: {
			$method: "POST",
			$isMethod: true,
			$title: "Unlock system",
			$execute: function(_, context, instance) {
				setLock(_, false);
				console.log("Unlocked");
				instance.$addDiagnose("success", "OK");
			}
		}
	},
};