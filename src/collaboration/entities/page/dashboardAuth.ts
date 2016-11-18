"use strict";

var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var AuthoringHelper = require("./pageHelpers").AuthoringHelper;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;

var tracer; // = console.log;

exports.entity = {
	$isPersistent: false,
	$properties: {
		content: {
			$title: "Content",
			$type: "json"
		},
		$authorUrl: {
			$title: "Personalization url",
			$isHidden: true
		},
		variantId: {
			$isHidden: true
		},
		pageContext: {
			$isHidden: true
		},
		device: {
			$isHidden: true
		}
	},
	$functions: {
		$setId: function(_, context, id) {

		},
		$setParameters: function(_, context) {
			AuthoringHelper.prototype.$setParameters.call(this, _, context);
		},
		$save: function(_, saveRes, parameters) {
			AuthoringHelper.prototype.$save.call(this, _, saveRes, parameters);
		},
		getVariant: function(_) {
			return AuthoringHelper.prototype.getVariant.call(this, _);
		},
		getSaveVariant: function(_, saveAsOption, modelRepr) {
			return AuthoringHelper.prototype.getSaveVariant.call(this, _, saveAsOption, modelRepr);
		},
		createPageDef: function(_, pageContext, device) {
			// dahsboard must exist to author
			return null;
		},
		getPageEntity: function(_) {
			return this._db.model.getEntity(_, "dashboardDef");
		},
		makeAuthorUrl: function(_, variant) {
			return [this._baseUrl, "dashboardAuths('" + variant.$uuid + "')/$workingCopies?representation=dashboardAuth.$edit"].join("/");
		},
		getPageFromContext: function(_, pageContext, device) {
			if (!pageContext) return null;
			//
			var parts = pageContext.split(".");
			var facet = parts.pop();
			var dashboardName = parts.pop();
			var pageEntity = this.getPageEntity(_);
			return this._db.fetchInstance(_, pageEntity, {
				jsonWhere: {
					dashboardName: dashboardName
				}
			});
		},
		addVariant: function(_, pageDef, orgId) {
			var v = pageDef.variants(_).add(_);
			var org = pageDef.variants(_).get(_, orgId);
			// copy
			v.allApplications(_, org.allApplications(_));
			v.application(_, org.application(_));
			org.vignettes(_).toArray(_).forEach_(_, function(_, it) {
				var dv = v.vignettes(_).add(_);
				dv.allEndpoints(_, it.allEndpoints(_));
				dv.portlet(_, it.portlet(_));
				dv.endpoint(_, it.endpoint(_));
			});
			//
			return v;
		}
	},
	$actions: {
		$save: function(_, instance) {
			var r = {};
			var v = instance.getVariant(_);
			if (v && v.$factory) r.$confirm = locale.format(module, "modifyFactory");
			if (!v) {
				r.$parameters = {
					$url: "{$baseUrl}/authoringSaveParams/$template/$workingCopies?representation=authoringSaveParam.$edit&role={$role}&pageType=dashboard&variantId={variantId}&pageContext={pageContext}&device={device}",
					$method: "POST",
					$properties: {
						parameters: {
							$type: "application/x-string"
						}
					}
				};
			} else {
				if (v.$factory) {
					var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
					r.$isDisabled = sp && (!sp.factoryOwner(_) || sp.factoryOwner(_) === "");
				}
				if (v._isGlobal(_) && !r.$isDisabled) {
					var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
					r.$isDisabled = sp && sp.authoringLevel(_) && (sp.authoringLevel(_) === "user");
				}
			}

			return r;
		}
	},
	$services: {
		saveAs: {
			$title: "Save as",
			$method: "POST",
			$isMethod: true,
			$facets: ["$edit"],
			$parameters: {
				$url: "{$baseUrl}/authoringSaveParams/$template/$workingCopies?representation=authoringSaveParam.$edit&role={$role}&pageType=dashboard&variantId={variantId}&pageContext={pageContext}&device={device}",
				$method: "POST",
				$properties: {
					parameters: {
						$type: "application/x-string"
					}
				}
			},
			$execute: function(_, context, instance, params) {
				var res = instance.save(_, params);
				var diag = ((res.$actions || {}).$save || {}).$diagnoses;
				return {
					$diagnoses: diag
				};
			}
		},
		$delete: {
			$title: "Delete",
			$method: "POST",
			$isMethod: true,
			$execute: function(_, context, instance, params) {
				var v = instance.getVariant(_);
				var p = v.pageData(_);
				instance.$diagnoses = instance.$diagnoses || [];
				if (p) {
					p.deleteSelf(_);
					p.getAllDiagnoses(_, instance.$diagnoses, {
						addEntityName: true,
						addPropName: true
					});
				}
				v.pageData(_, null);
				v.save(_);
				v.getAllDiagnoses(_, instance.$diagnoses, {
					addEntityName: true,
					addPropName: true
				});
			}
		}
	}
};