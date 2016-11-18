"use strict";

var jsurl = require("jsurl");
var globals = require('streamline-runtime').globals;
var locale = require('streamline-locale');
var pageHelpers = require("./pageHelpers");
var getFactoryOwner = require("../../../..//src/orm/serializer").getFactoryOwner;

exports.entity = {
	$titleTemplate: "Save as",
	$valueTemplate: " ",
	$isPersistent: false,
	$canSave: false,
	$capabilities: "",
	$properties: {
		saveAsOption: {
			$title: "Save as",
			$enum: function(_, instance) {
				var values = [];
				values.push({
					$title: locale.format(module, "personalVariantEnumTitle"),
					$value: "personal_copy"
				});
				values.push({
					$title: locale.format(module, "sharedVariantEnumTitle"),
					$value: "shared_copy"
				});
				if (instance._canCreateGlobal(_)) values.push({
					$title: locale.format(module, "globalVariantEnumTitle"),
					$value: "global_variant"
				});
				if (instance._canCreateFactory(_)) values.push({
					$title: locale.format(module, "factoryVariantEnumTitle"),
					$value: "factory_variant"
				});
				if (instance._canCreateModel(_)) values.push({
					$title: locale.format(module, "modelVariantEnumTitle"),
					$value: "model_variant"
				});
				//
				return values;
			},
			$propagate: function(_, instance, val) {
				instance.roles(_).reset(_);
				instance.users(_).reset(_);
				instance.endpoints(_).reset(_);
				instance.personalCopy(_, false);
				instance.isFactory(_, false);
				instance.isModelRepresentation(_, false);
				switch (val) {
					case "personal_copy":
						instance.personalCopy(_, true);
						break;
					case "shared_copy":
						break;
					case "global_variant":
						break;
					case "factory_variant":
						instance.isFactory(_, true);
						instance.variantCode(_, getFactoryOwner(_));
						instance.variantTitle(_, getFactoryOwner(_));
						instance.variantDescription(_, getFactoryOwner(_));
						break;
					case "model_variant":
						instance.isFactory(_, true);
						instance.isModelRepresentation(_, true);
						instance.variantCode(_, locale.format(module, "modelCode"));
						instance.variantTitle(_, locale.format(module, "modelTitle"));
						instance.variantDescription(_, locale.format(module, "modelDescription"));
						break;
				}
			},
			$isDefined: function(_, instance) {
				return true;
			}
		},
		isFactory: {
			$title: "Factory variant",
			$type: "boolean",
			$isExcluded: true
		},
		isModelRepresentation: {
			$title: "Model for all transactions",
			$type: "boolean",
			$isExcluded: true
		},
		personalCopy: {
			$title: "Personal copy",
			$type: "boolean",
			$propagate: function(_, instance, val) {
				var up = globals.context.session.getUserProfile(_);
				var user = up && up.user(_);
				if (!user) return;
				if (val) {
					instance.users(_).set(_, user);
				} else {
					instance.users(_).deleteInstance(_, user.$uuid);
				}
			},
			$isExcluded: true
		},
		variantCode: {
			$title: "Code",
			$isMandatory: true
		},
		variantTitle: {
			$title: "Title",
			$isMandatory: true
		},
		variantDescription: {
			$title: "Description"
		}
	},
	$relations: {
		roles: {
			$title: "Applies to roles",
			$type: "roles",
			$isDefined: function(_, instance) {
				return instance.saveAsOption(_) === "shared_copy";
			}
		},
		users: {
			$title: "Applies to users",
			$type: "users",
			$isDefined: function(_, instance) {
				return instance.saveAsOption(_) === "shared_copy";
			}
		},
		endpoints: {
			$title: "Applies to endpoints",
			$type: "endPoints",
			$isDefined: function(_, instance) {
				return instance.saveAsOption(_) === "shared_copy";
			}
		}
	},
	$functions: {
		$setParameters: function(_, context) {
			this._initialize(_, context);
			//
			if (context.parameters) {
				this._pageType = context.parameters.pageType;
				this._modelRepresentation = context.parameters.modelRepresentation;
				this._pageContext = context.parameters.pageContext;
				this._device = context.parameters.device;
			}
			//
			var p = this._getPageDef(_);
			if (p) {
				this._existsFactoryVariant = p.hasFactoryVariant(_);
			}
			// check model representation
			if (this._modelRepresentation) {
				var p = this._getPageDef(_, this._modelRepresentation + "$MODEL");
				this._existsModelVariant = (p != null);
			}
			//
			this.saveAsOption(_, "shared_copy");
		},
		_getPageDef: function(_, representation) {
			var c = this._pageContext;
			if (!c) return null;
			//
			if (representation) {
				var parts = c.split(".");
				parts[3] = representation;
				c = parts.join(".");
			}
			return pageHelpers.Factory.getPageFromContext(_, this._db, this._pageType, c, this._device);
		},
		_canCreateFactory: function(_) {
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			return !this._existsFactoryVariant && (!sp || !sp.authoringLevel(_) || sp.hasFactoryRights(_));
		},
		_canCreateModel: function(_) {
			if (!this._modelRepresentation) return false;
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			return !this._existsModelVariant && (!sp || !sp.authoringLevel(_) || sp.hasFactoryRights(_));
		},
		_canCreateGlobal: function(_) {
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			return !sp || !sp.authoringLevel(_) || sp.authoringLevel(_) === "admin";
		},
		_isPersonal: function(_) {
			return this.saveAsOption(_) === "personal_copy";
		}
	}
};