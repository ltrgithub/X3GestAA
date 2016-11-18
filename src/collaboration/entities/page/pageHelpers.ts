"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var getFactoryOwner = require("../../../..//src/orm/serializer").getFactoryOwner;
var adminHelper = require("../../../collaboration/helpers").AdminHelper;
var sys = require("util");

function AuthoringHelper() {

}

exports.AuthoringHelper = helpers.defineClass(AuthoringHelper, null, {
	$setId: function(_, context, id) {

	},
	$setParameters: function(_, context) {
		// this._authorVariantId is the id of the variant loaded in authoring
		// this.variantId(_) is the id of the variant to be used as reference in the savAs dialog (to condition the options)
		// this._authorVariantId may be different of this.variantId(_) in case of model represenation in fusion pages
		// in this case the "save" operation saves _authorVariant and " save as" should create a variant of the "normal"
		// representation. So this.variantId(_) should be any variant of the "normal" page
		//
		this._initialize(_, context);
		//
		this._authorVariantId = context.instanceId;
		this._pageContext = context.parameters && context.parameters.pageContext;
		this.pageContext(_, this._pageContext);
		this._device = (context.parameters && context.parameters.device) || "desktop";
		this.device(_, this._device);
		this._baseUrl = context.baseUrl;
		this.variantId(_, this._authorVariantId);
		if (this.modelRepresentation) this.modelRepresentation(_, context.parameters && context.parameters.modelRepresentation);
	},
	$save: function(_, saveRes, parameters) {
		function _setRel(_, variant, relName) {
			var r = variant[relName](_);
			r.reset(_);
			(parameters[relName] || []).forEach_(_, function(_, item) {
				r.setUuid(_, item.$uuid);
			});
		}
		var pageData;
		var pageDef;
		var variant;
		var saveAsModel = parameters && parameters.isModelRepresentation;
		var saveAsOption = parameters && parameters.saveAsOption;
		//
		variant = this.getSaveVariant(_, saveAsOption, saveAsModel && this.modelRepresentation && this.modelRepresentation(_));
		if (!variant) return;
		pageDef = variant._parent;
		// apply params
		if (parameters && saveAsOption) {
			variant.code(_, parameters.variantCode);
			variant.title(_, parameters.variantTitle);
			variant.description(_, parameters.variantDescription);
			variant.$factory = parameters.isFactory;
			//
			if (!variant.$factory) {
				_setRel(_, variant, "roles");
				_setRel(_, variant, "users");
				_setRel(_, variant, "endpoints");
			} else {
				variant.roles(_).reset(_);
				variant.users(_).reset(_);
				variant.endpoints(_).reset(_);
			}
		}
		// check authorizations
		var v = variant;
		if (v.$factory) {
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			if (sp && (!sp.factoryOwner(_) || sp.factoryOwner(_) === "")) throw new Error(locale.format(module, "notAuthorizedFactory"));
			if (!sp.canUpdateFactoryInstance(_, v)) throw new Error(locale.format(module, "notAuthorizedFactoryNotOwned", v.$factoryOwner));
		}
		if (v._isGlobal(_)) {
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			if (sp && sp.authoringLevel(_) && (sp.authoringLevel(_) === "user")) throw new Error(locale.format(module, "notAuthorizedGlobal"));
		}
		//
		pageData = variant.pageData(_);
		if (!pageData) {
			// create
			pageData = variant.createChild(_, "pageData");
			variant.pageData(_, pageData);
		}
		var c = this.content(_);
		if (c && c.$article) delete c.$article.$isModel;
		pageData.content(_, JSON.stringify(c));
		pageDef.addRelatedInstance(pageData);
		//
		variant.$updDate = new Date();
		variant.$updUser = (globals.context && globals.context.session && globals.context.session.sessionInfo && globals.context.session.sessionInfo.userName(_));
		//
		var res = pageDef.save(_, null, {
			shallowSerialize: true
		});
		// let diagnoses be on the right node (action node)
		/*		var thisDiags = this.$diagnoses = this.$diagnoses || [];
		var diags = (res.$actions && res.$actions.$save && res.$actions.$save.$diagnoses) || [];
		diags.forEach(function(d) {
			thisDiags.push(d);
		});
		pageDef.getAllDiagnoses(_, this.$diagnoses, {
			addEntityName: true,
			addPropName: true
		});
		*/
		//
		this.$authorUrl(_, this.makeAuthorUrl(_, variant));
		this._authorVariantId = variant.$uuid;
		//
		this.variantId(_, this._authorVariantId);
		// no need of save parameters any more
		saveRes.$parameters = null;
		if (variant && variant.$factory) saveRes.$confirm = locale.format(module, "modifyFactory");
		else saveRes.$confirm = null;
	},
	getSaveVariant: function(_, saveAsOption, modelRepresentation) {
		var pageDef;
		// save, return current variant
		if (!saveAsOption) return this.getVariant(_);
		// save as, return a new variant for a page according to pageContext
		var c = this._pageContext;
		if (modelRepresentation && (saveAsOption === "model_variant")) {
			var parts = this._pageContext.split(".");
			parts[parts.length - 2] = modelRepresentation + "$MODEL";
			c = parts.join(".");
		}
		//
		pageDef = this.getPageFromContext(_, c, this._device);
		if (!pageDef) pageDef = this.createPageDef(_, this._pageContext, this._device, modelRepresentation);
		if (!pageDef) return null;
		// create a variant
		return this.addVariant(_, pageDef, this._authorVariantId);
	},
	getVariant: function(_) {
		var pageDef;
		var variant;
		var pageEntity;
		//
		if (this._authorVariantId) {
			pageEntity = this.getPageEntity(_);
			var where = {};
			where["variants"] = this._authorVariantId;
			pageDef = this._db.fetchInstance(_, pageEntity, {
				jsonWhere: where
			});
			if (!pageDef) return null;
			//
			return pageDef.variants(_).get(_, this._authorVariantId);
		}
		return null;
	}
});

function PageHelper() {

}

exports.PageHelper = helpers.defineClass(PageHelper, null, {
	hasFactoryVariant: function(_) {
		return this.variants(_).toArray(_).some_(_, function(_, v) {
			return v.$factory && v.$factoryOwner === getFactoryOwner(_);
		});
	},
	selectVariant: function(_, userProfile, application) {
		var variants = this.selectAllVariants(_, userProfile, application);
		return variants && variants[0];
	}
});

exports.Factory = {
	getPageFromContext: function(_, db, pageType, pageContext, device) {
		var parts = pageContext && pageContext.split(".");
		var facetName = parts.pop();
		var reprName = parts.pop();
		if (!parts) return null;
		if (pageType === "page") {
			//
			var app = adminHelper.getApplication(_, parts[0], parts[1]);
			if (!app) return null;
			//
			var pageEntity = db.getEntity(_, "pageDef");
			return db.fetchInstance(_, pageEntity, {
				jsonWhere: {
					application: app.$uuid,
					representation: reprName,
					facet: facetName,
					device: device || "desktop"
				}
			});
		} else {
			var pageEntity = db.getEntity(_, "dashboardDef");
			return db.fetchInstance(_, pageEntity, {
				jsonWhere: {
					dashboardName: reprName
				}
			});
		}
	}
};