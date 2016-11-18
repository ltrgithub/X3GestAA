"use strict";

var locale = require('streamline-locale');

function _track(tracker, phase, detail, progress) {
	if (!tracker) return;
	tracker.phase = phase;
	tracker.phaseDetail = detail;
	tracker.progress = progress;
}

function _walkPages(_, db, taskName, tracker, diags, cb) {
	var pEnt = db.getEntity(_, "pageDef");
	var dbPar = {
		jsonWhere: {
			facet: "$fusion"
		}
	};
	var total = db.count(_, pEnt, dbPar);
	var c = db.createCursor(_, pEnt, dbPar);
	var p;
	var t = tracker;
	var aborted = false;
	var idx = 0;
	while (!aborted && (p = c.next(_))) {
		var pageLabel = p.description(_) || p.title(_) || p.code(_);
		_track(t, locale.format(module, taskName), pageLabel, Math.ceil(idx++ * 100 / total));
		aborted = t && t.abortRequested;
		p.variants(_).toArray(_).forEach_(_, function(_, v) {
			cb(_, p, v);
		});
	}
}

exports.entity = {
	$isPersistent: false,
	$titleTemplate: "Convergence pages converter",
	$properties: {
		diagMenuBar: {
			$type: "boolean",
			$title: "Diagnose article's $menu and $fusionBar",
			$description: "Include into diagnoses article's $menu and $fusionBar fields"
		},
		diagModels: {
			$type: "boolean",
			$title: "Diagnose model personalizations"
		},
		diagArticleNotInProto: {
			$type: "boolean",
			$title: "Show \"field in article but not in prototype\" diag"
		}
	},
	$relations: {
		endpoint: {
			$type: "endPoint",
			$title: "Reference endpoint",
			$description: "Reference endpoint for convergence prototypes",
			$isMandatory: true
		}
	},
	$services: {
		convert: {
			$title: "Convert to V1",
			$description: "Convert to generator version 1",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$execute: function(_, context, instance, params) {
				if (!instance.endpoint(_)) return instance.$addError(locale.format(module, "endpointRequired"));
				var t = context && context.tracker;
				var d = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				_walkPages(_, instance._db, "convertPhase", context && context.tracker, d, function(_, p, v) { //
					if (v.pageData(_)) {
						var ds = [];
						v.pageData(_).convertFusionArticle(_, p, instance.endpoint(_), 1, {
							$diagnoses: ds,
							withSave: true
						});
						var r = p.representation(_).replace("$MODEL", "");
						var vdesc = v.description(_) || v.title(_) || v.code(_);
						ds.forEach(function(di) {
							if (di.$severity === "success") {
								d.push({
									$severity: "success",
									$message: locale.format(module, "pageSaved", r, vdesc)
								});
							} else d.push(di);
						});
					}
				});
			}
		},
		convertV2: {
			$title: "Convert Localization",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$execute: function(_, context, instance, params) {
				if (!instance.endpoint(_)) return instance.$addError(locale.format(module, "endpointRequired"));
				var t = context && context.tracker;
				var d = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				_walkPages(_, instance._db, "convertPhase", context && context.tracker, d, function(_, p, v) { //
					if (v.pageData(_)) {
						var ds = [];
						v.pageData(_).convertLocalization(_, p, instance.endpoint(_), 1, {
							$diagnoses: ds,
							withSave: true
						});
						var r = p.representation(_).replace("$MODEL", "");
						var vdesc = v.description(_) || v.title(_) || v.code(_);
						ds.forEach(function(di) {
							if (di.$severity === "success") {
								d.push({
									$severity: "success",
									$message: locale.format(module, "pageSaved", r, vdesc)
								});
							} else d.push(di);
						});
					}
				});
			}
		},
		diagnosePages: {
			$title: "Diagnose convergence pages",
			$description: "Performs an audit of stored pages against their prototypes",
			$method: "POST",
			$isMethod: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$execute: function(_, context, instance, params) {
				if (!instance.endpoint(_)) return instance.$addError(locale.format(module, "endpointRequired"));
				var t = context && context.tracker;
				var d = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				_walkPages(_, instance._db, "diagnosePhase", t, d, function(_, p, v) { //
					if (v.pageData(_)) {
						var ds = [];
						v.pageData(_).diagnoseFusionArticle(_, p, v, instance.endpoint(_), 1, {
							$diagnoses: d,
							diagMenuBar: instance.diagMenuBar(_),
							diagModels: instance.diagModels(_),
							diagArtNotInProto: instance.diagArticleNotInProto(_)
						});
					}
				});
			}
		}
	}
};