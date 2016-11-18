"use strict";

var util = require('util');
var check = require('../../..//src/license/check');
var locale = require('streamline-locale');
var syracuseTypes = require('@sage/syracuse-core').types;
var db;
var badgeEntity;

var tracer; //= console.log;

exports.entity = {
	$titleTemplate: "Available licenses",
	$valueTemplate: "{partnerId}-{product}-{productVersion}",
	$descriptionTemplate: "{partnerId}-{product}-{productVersion}",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: true,
	$canCreate: false,
	$helpPage: "Administration-reference_License-data",
	$listTitle: "List of licenses",
	$key: "{partnerId}~{productCode}~{productVersion}~{policyCode}~{policyVersion}",
	$properties: {
		valid: {
			$title: "Valid",
			$isReadOnly: true,
			$type: "boolean"
		},
		partnerId: {
			$title: "Partner ID",
			$isReadOnly: true,
			$linksToDetails: true
		},
		product: {
			$title: "Product",
			$isReadOnly: true,
			$linksToDetails: true,
			$isLocalized: true
		},
		productCode: {
			$title: "Product code",
			$isReadOnly: true,
			$linksToDetails: true
		},
		productIddn: {
			$title: "IDDN Number",
			$isReadOnly: true
		},
		productVersion: {
			$title: "Product version",
			$isReadOnly: true
		},
		baseProduct: {
			$title: "Base product",
			$isReadOnly: true
		},
		sessionControl: {
			$title: "Session control",
			$isReadOnly: true,
			$enum: [{
				$value: "concurrent",
				$title: "Concurrent sessions"
			}, {
				$value: "named",
				$title: "Named users"
			}]
		},
		serial: {
			$title: "Serial number",
			$isReadOnly: true
		},
		serialControl: {
			$title: "Serial number check",
			$isReadOnly: true,
			$type: "boolean"
		},
		generationStamp: {
			$titel: "Generation timestamp",
			$isReadOnly: true,
			$type: "datetime"
		},
		policy: {
			$title: "Policy",
			$isReadOnly: true,
			$isLocalized: true
		},
		policyCode: {
			$title: "Policy code",
			$isReadOnly: true
		},
		policyVersion: {
			$title: "Policy version",
			$isReadOnly: true
		},
		licenseeName: {
			$title: "Name of licensee",
			$isReadOnly: true
		},
		licenseeReference: {
			$title: "Reference",
			$isReadOnly: true
		},
		licenseeRegistrationNumber: {
			$title: "Registration number",
			$isReadOnly: true
		},
		licenseeAddress1: {
			$title: "Street",
			$isReadOnly: true
		},
		licenseeAddress2: {
			$title: "Complement",
			$isReadOnly: true
		},
		licenseeCity: {
			$title: "City",
			$isReadOnly: true
		},
		licenseeZip: {
			$title: "ZIP code",
			$isReadOnly: true
		},
		licenseeState: {
			$title: "State",
			$isReadOnly: true
		},
		licenseeCountry: {
			$title: "Country",
			$isReadOnly: true
		},
		resellerName: {
			$title: "Name of reseller",
			$isReadOnly: true
		},
		resellerReference: {
			$title: "Reference",
			$isReadOnly: true
		},
		resellerRegistrationNumber: {
			$title: "Registration number",
			$isReadOnly: true
		},
		resellerAddress1: {
			$title: "Street",
			$isReadOnly: true
		},
		resellerAddress2: {
			$title: "Complement",
			$isReadOnly: true
		},
		resellerCity: {
			$title: "City",
			$isReadOnly: true
		},
		resellerZip: {
			$title: "ZIP code",
			$isReadOnly: true
		},
		resellerState: {
			$title: "State",
			$isReadOnly: true
		},
		resellerCountry: {
			$title: "Country",
			$isReadOnly: true
		},
		valStart: {
			$title: "Start of validity",
			$isReadOnly: true,
			$type: "date"
		},
		valEnd: {
			$title: "End of validity",
			$isReadOnly: true,
			$type: "date"
		},
		licenseType: {
			$title: "License type",
			$isReadOnly: true,
			$enum: [{
				$value: "NFR",
				$title: "Not for resale"
			}, {
				$value: "DEMO",
				$title: "Demo license"
			}, {
				$value: "STANDARD",
				$title: "Standard license"
			}]
		}
	},
	$relations: {
		sessionTypes: {
			$title: "Session types",
			$type: "licenseSessionTypeDatas",
			$isChild: true

		},
		modules: {
			$title: "Modules",
			$type: "licenseModuleDatas",
			$isChild: true
		},
		badges: {
			$title: "Badges",
			$type: "licenseBadgeDatas",
			$isChild: true
		},
		activityCodes: {
			$title: "Activity codes",
			$type: "licensePartDatas",
			$isChild: true
		},
		languages: {
			$title: "Languages",
			$type: "licensePartDatas",
			$isChild: true

		},
		legislations: {
			$title: "Legislations",
			$type: "licensePartDatas",
			$isChild: true

		},
		parameterKits: {
			$title: "Parameter kits",
			$type: "licensePartDatas",
			$isChild: true

		},
		parameters: {
			$title: "Parameters",
			$type: "licenseParameterDatas",
			$isChild: true

		}

	},
	$fetchInstances: function(_, context, parameters) {
		var result = _fillData(_, context, null, null);
		return result;
	},
	$functions: {
		$setId: function(_, context, id) {
			_fillData(_, context, this, id);
		},
		$onDelete: function(_) {
			this.$diagnoses = this.$diagnoses || [];
			// if (this.valid(_)) throw new Error(locale.format(module, "validDelete"));
			var rawLicenses = check.getRawLicense(_);

			// collect data of this license
			var productCode = this.productCode(_);
			var productVersion = this.productVersion(_);
			var policyCode = this.policyCode(_);
			var policyVersion = this.policyVersion(_);
			var partnerId = this.partnerId(_);
			check.deleteLicense(partnerId, productCode, productVersion, policyCode, policyVersion, this.$diagnoses, _);
		}
	},
	$links: {},
	$defaultOrder: [
		["partnerId", true]
	]
};

function _fillData(_, context, instanceValue, keyValue) {
	var data = check.getFullLicense(_);
	var raw = data && data[0];
	// fetch badges from badge entity
	db = db || require('../../collaboration/helpers').AdminHelper.getCollaborationOrm(_);
	badgeEntity = badgeEntity || db.model.getEntity(_, "badge");
	var appEntity = db.model.getEntity(_, "application");
	var result = [];
	if (!raw) return result;
	var validLicenseData = data[1].validLicenses;
	var contents = {};
	raw.forEach(function(lic) {
		try {
			var item = JSON.parse(lic);
		} catch (e) {
			if (instanceValue)
				instanceValue.$addError("License parse error: " + e);
			else
				throw new Error("License parse error: " + e);
			return;
		}
		var index;
		switch (item.fileType) {
			case "Policy":
				index = 0;
				break;
			case "License":
				index = 1;
				break;
			case "Partner":
				return;
			default:
				throw new Error(locale.format(module, "wrongType", item.fileType));
				return;
		}
		if (!item.product || !item.policy) {
			throw new Error(locale.format(module, "noProdPolicy"));
			return;
		}
		var key = item.partnerId + "~" + item.product.code + "~" + item.product.version + "~" + item.policy.code + "~" + item.policy.version;
		if (keyValue && key !== keyValue) return;
		if (!(key in contents)) contents[key] = [];
		contents[key][index] = item;
	});
	var keys = Object.keys(contents).sort();
	if (!instanceValue) {
		var entity = context.db.model.getEntity(_, "licenseData");
	}
	var today = syracuseTypes.date.today().toString();
	for (var key in contents) {

		var pair = contents[key];
		var license = pair[1];
		var policy = pair[0];
		if (!license) continue; // no license or policy file
		if (!license.licensedTo) {
			throw new Error(locale.format(module, "noLicensee", key));
			continue;
		}
		if (!license.validity || !license.validity[0] || !license.validity[1]) {
			throw new Error(locale.format(module, "noValidity", key));
			continue;
		}
		var inst = instanceValue ? instanceValue : entity.factory.createInstance(_, null, context.db);
		var app = db.fetchInstance(_, appEntity, {
			jsonWhere: {
				productCode: license.product.code
			}
		});
		inst.partnerId(_, license.partnerId);
		inst.productVersion(_, license.product.version);
		inst.productCode(_, license.product.code);
		inst.productIddn(_, app && app.iddn && app.iddn(_) || "");
		inst.policyCode(_, license.policy.code);
		inst.policyVersion(_, license.policy.version);
		inst.licenseeName(_, license.licensedTo.name);
		inst.licenseeReference(_, license.licensedTo.reference);
		inst.licenseeRegistrationNumber(_, license.licensedTo.registrationNumber);
		inst.licenseeAddress1(_, license.licensedTo.address.address1);
		inst.licenseeAddress2(_, license.licensedTo.address.address2);
		inst.licenseeCity(_, license.licensedTo.address.city);
		inst.licenseeZip(_, license.licensedTo.address.zip);
		inst.licenseeState(_, license.licensedTo.address.state);
		inst.licenseeCountry(_, license.licensedTo.address.country);
		if (license.reseller) {
			inst.resellerName(_, license.reseller.name);
			inst.resellerReference(_, license.reseller.reference);
			inst.resellerRegistrationNumber(_, license.reseller.registrationNumber);
			inst.resellerAddress1(_, license.reseller.address.address1);
			inst.resellerAddress2(_, license.reseller.address.address2);
			inst.resellerCity(_, license.reseller.address.city);
			inst.resellerZip(_, license.reseller.address.zip);
			inst.resellerState(_, license.reseller.address.state);
			inst.resellerCountry(_, license.reseller.address.country);
		}

		inst.valStart(_, syracuseTypes.date.parse(license.validity[0]));
		inst.valEnd(_, syracuseTypes.date.parse(license.validity[1]));
		inst.sessionControl(_, license.sessionControl);
		// inst.maxSessions(_, license.maxSessions);
		inst.licenseType(_, license.licenseType);
		inst.serial(_, "" + (license.serial || ""));
		inst.serialControl(_, !!license.serialControl);
		inst.generationStamp(_, syracuseTypes.datetime.parse(license.generationStamp));
		if (policy) {
			inst.baseProduct(_, license.partnerId ? policy.baseProduct : "");
			inst.product(_, check.convertTitle(policy.product.title));
			inst.policy(_, check.convertTitle(policy.policy.title));
		}
		inst.valid(_, validLicenseData.some(function(item) {
			return (item.partnerId === license.partnerId && item.policyVersion === license.policy.version && item.policyCode === license.policy.code && item.productVersion === license.product.version && item.productCode === license.product.code);
		})); // !! policy && (today <= license.validity[1] && today >= license.validity[0]));
		["modules", "badges", "activityCodes", "languages", "legislations", "parameterKits"].forEach_(_, function(_, item) {
			if (policy) {
				var policyParts = policy[item];
				if (!policyParts) return; // nothing to check  				
			}
			var children = inst[item](_);
			var licenseParts = license[item];
			if (!policy && !licenseParts) return;
			var allowed = ""; // allowed parts
			(policyParts || licenseParts).forEach_(_, function(_, part) {
				if (!part || !part.code) {
					tracer && tracer("Ignore policy item " + item);
					return;
				}
				var from = "";
				var to = "";
				var max = "0";
				var child = children.add(_);
				switch (part.condition) {
					case "never":
						// cannot be for badges
						child.availability(_, "never");
						break;
					case "license":
						// cannot be for badges
						child.availability(_, "unlicensed");
						// no break!
					case undefined:
						// also badges 
						if (!licenseParts) break;
						licenseParts.forEach_(_, function(_, lpart) {
							if (lpart.code === part.code) {
								if (item === "badges") {
									child.max(_, lpart.max);
									var badg = db.fetchInstance(_, badgeEntity, {
										jsonWhere: {
											code: part.code
										}
									});
									if (badg) {
										child.badge(_, badg);
									}
									if (policy) child.functions(_, part.functions.join(" "));
								} else {
									if (lpart.validity && lpart.validity[0] > license.validity[0]) from = lpart.validity[0];
									else from = license.validity[0];
									child.valStart(_, syracuseTypes.date.parse(from));
									if (lpart.validity && lpart.validity[1] && lpart.validity[1] < license.validity[1]) to = lpart.validity[1];
									else to = license.validity[1];
									child.valEnd(_, syracuseTypes.date.parse(to));
									if (policy) child.availability(_, "licensed");
								}
							}
						});
						break;
					case "always":
						// cannot be for badges
						child.availability(_, "always");
						child.valStart(_, syracuseTypes.date.parse(license.validity[0]));
						child.valEnd(_, syracuseTypes.date.parse(license.validity[1]));
						break;
					default:
						throw new Error("Wrong condition " + part.condition);
				};
				if (policy) {
					child.title(_, check.convertTitle(part.title));
					if (item === "modules" && part.keyFunctions) child.keyFunctions(_, part.keyFunctions.join(" "));
				}
				child.code(_, part.code);
			});
		});
		// Session types
		var policyParts = policy ? policy.sessionTypes : license.sessionTypes;
		var licenseParts = license.sessionTypes;
		if (policyParts && licenseParts) {
			var values = {};
			licenseParts.forEach(function(part) {
				values[part.code] = part.max;
			});
			var children = inst.sessionTypes(_);
			policyParts.forEach_(_, function(_, param) {
				var value = values[param.code];
				if (value !== undefined) {
					var child = children.add(_);
					if (policy) {
						child.title(_, check.convertTitle(param.title));
						child.devices(_, param.devices.join(" "));
					}
					child.code(_, param.code);
					child.max(_, value);
				};
			});
		}
		// Parameters
		var policyParts = policy ? policy.parameters : license.parameters;
		var licenseParts = license.parameters;
		if (policyParts && licenseParts) {
			var values = {};
			licenseParts.forEach(function(part) {
				values[part.code] = part.value;
			});
			var children = inst.parameters(_);
			policyParts.forEach_(_, function(_, param) {
				var value = values[param.code];
				if (value !== undefined) {
					var child = children.add(_);
					if (policy) child.title(_, check.convertTitle(param.title));
					child.code(_, param.code);
					child.type(_, param.type);
					child.value(_, "" + value);
				};
			});
		}
		result.push(inst);
	}
	return result;
}