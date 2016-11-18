"use strict";

var PageHelper = require("./pageHelpers").PageHelper;

var nativeVariantScore = 256;
var userScore = 128;
var roleScore = 64;
var unaffUserScore = 32;
var unaffRoleScore = 32;
var endpointScore = 16;
var unaffEPScore = 8;
var companyScore = 4;
var partnerScore = 2;
var factoryScore = 1;

var tracer; // = console.log;

exports.entity = {
	$titleTemplate: "Page",
	$descriptionTemplate: "Page content",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_pages",
	$showMeta: "$creUser,$updUser,$creDate,$updDate",
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$isUnique: true
		},
		title: {
			$title: "Title",
			$linksToDetails: true,
			$isLocalized: true,
			$isMandatory: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		},
		representation: {
			$title: "Representation",
			$isMandatory: true
		},
		facet: {
			$title: "Facet",
			$enum: [{
				$value: "$query",
				$title: "Query"
			}, {
				$value: "$details",
				$title: "Details"
			}, {
				$value: "$edit",
				$title: "Edit"
			}, {
				$value: "$create",
				$title: "Create"
			}, {
				$value: "$lookup",
				$title: "Lookup"
			}, {
				$value: "$select",
				$title: "Select"
			}, {
				$value: "$fusion",
				$title: "Convergence"
			}, {
				$value: "$mobileDashboard",
				$title: "Mobile dashboard"
			}],
			$isMandatory: true
		},
		device: {
			$title: "Device",
			$enum: [{
				$value: "desktop",
				$title: "Desktop"
			}, {
				$value: "phone",
				$title: "Phone"
			}, {
				$value: "mobile",
				$title: "Mobile"
			}],
			$default: "desktop",
			$isReadOnly: true
		}
	},
	$relations: {
		application: {
			$title: "Application",
			$type: "application",
			$isMandatory: true
		},
		variants: {
			$type: "pageVariants",
			$title: "Variants",
			$isChild: true,
			$factoryProtect: true
		}
	},
	$functions: {
		selectAllVariants: function(_, preferedVariantId, options) {
			if (!options) return null;
			//
			var self = this;
			//
			var userId = options.userId;
			var roleId = options.roleId;
			var epId = options.endpointId;
			//
			var variants = self.variants(_).toArray(_);
			// model representation's variants if not already model
			if (options.modelRepresentation && ((options.modelRepresentation + "$MODEL") !== self.representation(_))) {
				var modelPage = this._db.fetchInstance(_, this._db.getEntity(_, "pageDef"), {
					jsonWhere: {
						representation: options.modelRepresentation + "$MODEL",
						facet: self.facet(_),
						application: self.application(_).$uuid
					}
				});
				modelPage && modelPage.variants(_).toArray(_).forEach_(_, function(_, v) {
					v._isModel = true;
					variants.push(v);
				});
			}
			//
			var scores = [];
			variants.forEach_(_, function(_, v) {
				var score = 0;
				if (v.$factory) {
					if (v.$factoryOwner && v.$factoryOwner === "SAGE") {
						score += factoryScore;
					} else {
						score += partnerScore;
					}
				} else {
					score += companyScore;
				}
				//
				if (v.users(_).isEmpty()) score += unaffUserScore;
				else {
					if (v.users(_).get(_, userId)) score += userScore;
					else return;
				}
				//
				if (v.roles(_).isEmpty()) score += unaffRoleScore;
				else {
					if (roleId && v.roles(_).get(_, roleId)) score += roleScore;
					else return;
				}
				//
				if (v.endpoints(_).isEmpty()) score += unaffEPScore;
				else {
					if (epId && v.endpoints(_).get(_, epId)) score += endpointScore;
					else return;
				}
				//
				if (!v._isModel) score += nativeVariantScore;
				//
				scores.push({
					$uuid: v.$uuid,
					score: score,
					variant: v
				});
			});
			//
			return scores.sort(function(a, b) {
				if (a.$uuid === preferedVariantId) return -1;
				if (b.$uuid === preferedVariantId) return 1;
				return b.score - a.score;
			}).map_(_, function(_, e) {
				return e.variant;
			});
		},
		selectVariant: function(_, userProfile, application) {
			return PageHelper.prototype.selectVariant.call(this, _, userProfile, application);
		},
		hasFactoryVariant: function(_) {
			return PageHelper.prototype.hasFactoryVariant.call(this, _);
		}
	},
	$indexes: {
		params: {
			representation: "asc",
			facet: "asc",
			device: "asc"
		}
	},
	$searchIndex: {
		$fields: ["title", "description", "representation", "facet", "application"]
	},
	$defaultOrder: [
		["title", true]
	],
	$exportProfile: {
		$key: ["code"],
		$properties: ["code", "title", "description", "representation", "facet", "device"],
		$relations: {
			application: {
				$key: ["application", "contract"]
			},
			variants: {
				$key: "code",
				$properties: ["code", "title", "description"],
				$relations: {
					roles: {
						$key: "code"
					},
					users: {
						$key: "login"
					},
					/*					endpoints: {
						$key: "dataset"
					},*/
					pageData: {
						$key: "code",
						$properties: ["content"]
					}
				}
			}
		}
	}
};