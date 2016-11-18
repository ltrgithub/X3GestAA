"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var AuthoringHelper = require("./pageHelpers").AuthoringHelper;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var sys = require("util");

var tracer; // = console.log;

// TODO: inherit
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
		modelRepresentation: {
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
		createPageDef: function(_, pageContext, device, modelRepresentation) {
			var pageEntity = this.getPageEntity(_);
			//
			var pageDef = pageEntity.factory.createInstance(_, null, this._db);
			// pageContext is application.contract[.dataset].representation.facet[.variant]
			var parts = pageContext.split(".");
			var facetName = parts.pop();
			var reprName = parts.pop();
			if (modelRepresentation) reprName = modelRepresentation + '$MODEL';
			// normalize parts for title: remove dataset
			if (parts.length > 2) parts.pop();
			parts.push(reprName);
			parts.push(facetName);
			//
			parts.push(device || "desktop");
			var title = parts.join(".");
			pageDef.facet(_, facetName);
			pageDef.application(_, adminHelper.getApplication(_, parts[0], parts[1]));
			pageDef.representation(_, reprName);
			pageDef.title(_, title);
			pageDef.code(_, title);
			pageDef.device(_, device || "desktop");
			return pageDef;
		},
		getPageFromContext: function(_, pageContext, device) {
			if (!pageContext) return null;
			//
			var pageEntity = this.getPageEntity(_);
			var parts = pageContext.split(".");
			//
			var app = adminHelper.getApplication(_, parts[0], parts[1]);
			if (!app) return null;
			//
			var facetName = parts.pop();
			var reprName = parts.pop();
			return this._db.fetchInstance(_, pageEntity, {
				jsonWhere: {
					application: app.$uuid,
					representation: reprName,
					facet: facetName,
					device: device || "desktop"
				}
			});
		},
		getPageEntity: function(_) {
			return this._db.model.getEntity(_, "pageDef");
		},
		makeAuthorUrl: function(_, variant) {
			return [this._baseUrl, "pageAuths('" + variant.$uuid + "')/$workingCopies?representation=pageAuth.$edit"].join("/");
		},
		makeVariantUrl: function(_, variant) {
			var pageContext = this.pageContext(_);
			var url_pars = [];
			url_pars.push("fetchPrototype=false");
			if (this.modelRepresentation(_)) url_pars.push("modelRepresentation=" + this.modelRepresentation(_));
			if (this.device(_)) url_pars.push("device=" + this.device(_));
			return [this._baseUrl, "pages('" + pageContext + ",$page," + variant.$uuid + "')?" + url_pars.join("&")].join("/");
		},
		addVariant: function(_, pageDef, orgId) {
			return pageDef.variants(_).add(_);
		}
	},
	$actions: {
		$save: function(_, instance) {
			var r = {};
			var v = instance.getVariant(_);
			if (v && v.$factory) r.$confirm = locale.format(module, "modifyFactory");
			if (!v) {
				r.$parameters = {
					$url: "{$baseUrl}/authoringSaveParams/$template/$workingCopies?representation=authoringSaveParam.$edit&role={$role}&pageType=page&pageContext={pageContext}&device={device}",
					$method: "POST",
					$properties: {
						parameters: {
							$type: "application/x-string"
						}
					}
				};
				if (instance.modelRepresentation(_)) r.$parameters.$url += "&modelRepresentation=" + instance.modelRepresentation(_);
			} else {
				r.$parameters = null;
				if (v.$factory) {
					var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
					r.$isDisabled = sp && (!sp.factoryOwner(_) || sp.factoryOwner(_) === "");
				}
				if (v._isGlobal(_) && !r.$isDisabled) {
					var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
					r.$isDisabled = sp && sp.authoringLevel(_) && (sp.authoringLevel(_) === "user");
				}
				if (!r.$isDisabled) r.$isDisabled = false;
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
				$url: "{$baseUrl}/authoringSaveParams/$template/$workingCopies?representation=authoringSaveParam.$edit&role={$role}&pageType=page&pageContext={pageContext}&modelRepresentation={modelRepresentation}&device={device}",
				$method: "POST",
				$properties: {
					parameters: {
						$type: "application/x-string"
					}
				}
			},
			$execute: function(_, context, instance, params) {
				var res = instance.save(_, params, {
					shallowSerialize: true
				});
				var vv = instance.getVariant(_);
				var diag = ((res.$actions || {}).$save || {}).$diagnoses;
				var ret = {
					$diagnoses: diag
				};
				if (vv) {
					ret.$links = {
						$view: {
							$title: vv.title(_),
							$description: vv.description(_),
							$isFactory: vv.$isFactory,
							$url: instance.makeVariantUrl(_, vv),
							$isHidden: true
						}
					};
				}
				return ret;
			}
		},
		$delete: {
			$title: "Delete",
			$method: "POST",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				var r = {
					$isDisabled: false
				};
				var v = instance.getVariant(_);
				var sp;
				if (v) {
					if (v.$factory) {
						sp = globals.context.session && globals.context.session.getSecurityProfile(_);
						r.$isDisabled = sp && (!sp.factoryOwner(_) || sp.factoryOwner(_) === "");
					}
					if (v._isGlobal(_) && !r.$isDisabled) {
						sp = sp || globals.context.session && globals.context.session.getSecurityProfile(_);
						r.$isDisabled = sp && sp.authoringLevel(_) && (sp.authoringLevel(_) === "user");
					}
				}
				return r.$isDisabled;
			},
			$execute: function(_, context, instance, params) {
				instance.$diagnoses = instance.$diagnoses || [];
				try {
					var v = instance.getVariant(_);
					if (v) {
						var page = v._parent;
						if (page.variants(_).deleteInstance(_, v.$uuid)) {
							if (page.variants(_).toArray(_, true).length === 0) page.deleteSelf(_);
							else page.save(_);
						}
						instance.$diagnoses = instance.$diagnoses || [];
						page.getAllDiagnoses(_, instance.$diagnoses, {
							addEntityName: true,
							addPropName: true
						});
					}
				} catch (e) {
					instance.$diagnoses.push({
						$severity: "error",
						$message: e.message
					});
				} finally {
					return instance;
				}
			}
		}
	}
};