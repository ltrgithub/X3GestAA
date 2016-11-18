"use strict";

var index = require("syracuse-search/lib/elasticIndex");
var IndexHelper = index.IndexHelper;
var globals = require('streamline-runtime').globals;
var locale = require('streamline-locale');
var config = require('config'); // must be first syracuse require
var elasticVersion = require("syracuse-search/lib/elasticVersion");
var elasticHelpers = require("syracuse-search/lib/helpers");


function _normalizeDiag(diag) {
	return {
		$severity: diag.$severity || diag.severity,
		$message: diag.$message || diag.message,
		$stackTrace: diag.$stackTrace
	};
}

function _getUrlSearchEngine() {
	var searchConf = config.searchEngine || {};
	return "http://" + (searchConf.hostname || "localhost") + ":" + (searchConf.port || 9200);

}

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Search index management",
	$descriptionTemplate: "Administration interface for full text search indexes",
	$helpPage: "Administration-reference_search-indexes-administration",
	$properties: {
		differentialUpdate: {
			$title: "Update modified records only",
			$type: "boolean",
			$default: true,
			$isReadOnly: function(_, instance) {
				return instance.deleteBeforeUpdate(_) === true;
			}
		},
		deleteBeforeUpdate: {
			$title: "Delete before update",
			$type: "boolean",
			$default: false,
			$propagate: function(_, instance, val) {
				instance.deleteBeforeUpdate(_, val);
				if (instance.deleteBeforeUpdate(_) === true) {
					instance.differentialUpdate(_, false);
				}
			}
		},
		dataset: {
			$title: "Dataset",
			$isExcluded: true
		}
	},
	$relations: {
		entities: {
			$title: "Entities",
			$description: "Entities to be indexed. Leave empty for all entities",
			$type: "entityProxies",
			$inlineStore: true,
			$select: {
				parameters: "dataset={dataset}"
			},
			$isDisabled: function(_, instance) {
				return instance.dataset(_) == null || instance.deleteBeforeUpdate(_) === true;
			},
			$lookupFilter: {
				canSearch: true
			}
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$lookupFilter: {
				"$uuid": {
					"$in": "{endpoints}"
				}
			},
			$serializeAll: true,
			$propagate: function(_, instance, val) {
				if (val) {
					instance.dataset(_, val.dataset(_));
				} else {
					instance.dataset(_, "");
				}
				instance.entities(_).reset(_);
			}
		},
		endpoints: {
			$title: "Endpoints",
			$type: "endPoints"
		},
		locales: {
			$title: "Locales",
			$type: "localePreferences"
		}
	},
	$init: function(_, instance) {
		var crt = instance._db.fetchInstance(_, instance._db.getEntity(_, "localePreference"), {
			jsonWhere: {
				code: locale.current
			}
		});
		instance.indexationInProgress = false;
		var locs = instance.locales(_);
		if (crt && !locs.get(_, crt.$uuid)) {
			locs.set(_, crt);
		}

		var userProf = globals.context.session.data.userProfile;
		var endpointSelected = userProf.selectedEndpoint(_);
		instance.endpoint(_, endpointSelected);

		// Populate the list of available endpoints according to teh currently selected role
		instance.endpoints(_).reset(_);
		userProf.user(_).getUserEndpointsList(_, userProf.selectedRole(_) && userProf.selectedRole(_).$uuid).forEach_(_, function(_, ep) {
			instance.endpoints(_).set(_, ep);
		});

		// check elastic search version
		instance.$diagnoses = instance.$diagnoses || [];

		elasticHelpers.checkStartSearchEngine(_, _getUrlSearchEngine(), instance.$diagnoses, true, true);

		if (instance.$diagnoses.length === 0) {

			try {

				elasticVersion.checkVersion(_, _getUrlSearchEngine());
				var version = elasticVersion.getElasticVersion(_, _getUrlSearchEngine());

			} catch (e) {
				instance.$diagnoses.push({
					$severity: "error",
					$message: e.message
				});
			}
		}
	},
	$functions: {
		updateIndex: function(_, diags, tracker) {

			var nbLaunch = 1;

			var l_idx = 1;
			var instance = this;
			var config = require('config');
			instance.$diagnoses = instance.$diagnoses || [];
			var ep = instance.endpoint(_);

			// launch first on syracuse administration endpoint
			var endpoint = instance._db.fetchInstance(_, instance._db.getEntity(_, "endPoint"), {
				jsonWhere: {
					description: "Syracuse administration"
				}
			});
			var locArray = instance.locales(_).toArray(_);
			var result = {
				continu: true,
				curStep: 1,
				nbStep: locArray.length
			};

			function _update(_, helper, localeCode, isSyracuse) {
				var entis = (isSyracuse ? null : instance.entities(_).toArray(_).map_(_, function(_, r) {
					return r.entity(_);
				}));

				// data
				result = helper.updateIndex(_, instance.differentialUpdate(_), {
					diagnoses: diags || instance.$diagnoses,
					tracer: config && config.searchEngine && config.searchEngine.tracer,
					entities: entis,
					locale: localeCode,
					tracker: tracker,
					progressSlices: locArray.length * nbLaunch,
					progressCurrentSlice: l_idx,
					result: result
				});
				// function
				result.curStep++;
				result = result.continu && helper.updateFunctionIndex(_, instance.differentialUpdate(_), {
					diagnoses: diags || instance.$diagnoses,
					tracer: config && config.searchEngine && config.searchEngine.tracer,
					entities: entis,
					locale: localeCode,
					tracker: tracker,
					progressSlices: locArray.length * nbLaunch,
					progressCurrentSlice: l_idx++,
					result: result
				});
				result.curStep++;

			}
			//

			function _launchUpdate(_, ep, isSyracuse) {
				l_idx = 1;
				locArray.forEach_(_, function(_, loc) {
					var h = new IndexHelper(ep, loc.code(_));
					result.continu && _update(_, h, loc.code(_), isSyracuse);
				});
			}
			if (ep.dataset(_) !== "syracuse")
				result.nbStep = 2 * locArray.length;

			// launch update for syracuse endpoint
			if (ep.dataset(_) !== "syracuse")
				_launchUpdate(_, endpoint, true);

			// Delete before update if we have chosen it
			if (instance.deleteBeforeUpdate(_) === true) {
				locArray.forEach_(_, function(_, loc) {
					index.deleteEndpointIndex(_, ep, loc.code(_), diags || instance.$diagnoses);
				});
			}
			// endpoint choice
			_launchUpdate(_, ep);
			//

		},

		scheduledExecute: function(_, diags) {
			this.updateIndex(_, diags);
		}
	},
	$services: {

		updateDataIndex: {
			$method: "POST",
			$title: "Update index",
			$isMethod: true,
			$invocationMode: "async",
			$permanent: true,
			$capabilities: "abort",
			$isDisabled: function(_, instance) {
				return !instance.endpoint(_) || instance.indexationInProgress;
			},
			$execute: function(_, context, instance) {

				instance.indexationInProgress = true;
				elasticVersion.checkVersion(_, _getUrlSearchEngine());

				var t = context && context.tracker;
				if (t) t.$diagnoses = t.$diagnoses || [];
				var d = t ? t.$diagnoses : (instance.$diagnoses = instance.$diagnoses || []);

				instance.updateIndex(_, d, t);
				instance.indexationInProgress = false;
			}
		},
		deleteDataIndex: {
			$method: "DELETE",
			$title: "Delete index",
			$confirm: "this operation will delete data index for selected endpoint, are you sure ?",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return !instance.endpoint(_) || instance.indexationInProgress || instance.deleteBeforeUpdate(_) === true;
			},
			$execute: function(_, context, instance) {

				elasticVersion.checkVersion(_, _getUrlSearchEngine());

				if (!instance.endpoint(_)) {
					instance.$addError(locale.format(module, "endpointMandatory"), "endpoint");
					return;
				}
				//
				var ep = instance.endpoint(_);
				instance.$diagnoses = instance.$diagnoses || [];
				// index.deleteEndpointIndex(_, ep, "", instance.$diagnoses);
				instance.locales(_).toArray(_).forEach_(_, function(_, loc) {
					index.deleteEndpointIndex(_, ep, loc.code(_), instance.$diagnoses);
				});

			}
		},
		deleteAllIndex: {
			$method: "DELETE",
			$title: "Delete all indexes",
			$confirm: "this operation will delete all indexes for all endpoint, are you sure ?",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return instance.indexationInProgress;
			},
			$execute: function(_, context, instance) {
				elasticVersion.checkVersion(_, _getUrlSearchEngine());

				instance.$diagnoses = instance.$diagnoses || [];
				// index.deleteIndex(_, null, "sage.x3.functions", instance.$diagnoses);
				index.deleteAllIndex(_, null, instance.$diagnoses);

			}
		},
		schedule: {
			$method: "POST",
			$title: "Schedule index update",
			$isMethod: true,
			$parameters: {
				$actions: {
					$select: {
						$url: "{$baseUrl}/automates?representation=automate.$select"
					}
				}
			},
			//			$urlParameters: "scheduler={schedulerId}",
			$execute: function(_, context, instance, parameters) {
				if (!parameters || !parameters.$select) {
					return;
				}
				parameters.$select.forEach_(_, function(_, s) {
					var a = instance._db.fetchInstance(_, instance._db.getEntity(_, "automate"), s.$uuid);
					if (!a) {
						return;
					}
					instance.endpoints(_).reset(_);
					var diag = a.defineNewTask(_, locale.format(module, "indexUpdateTaskLabel"), instance);
					if (diag.some(function(d) {
							d = _normalizeDiag(d);
							return d.$severity === "error";
						})) {
						diag.forEach(function(d) {
							d = _normalizeDiag(d);
							instance.$addDiagnose(d.$severity, d.$message);
						});
					} else {
						instance.$addDiagnose("success", locale.format(module, "taskCreated", a.description(_)));
					}
				});
			}
		}
	}
};