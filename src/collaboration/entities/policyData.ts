"use strict";

var check = require('../../..//src/license/check');
var adminHelper = require("../../collaboration/helpers").AdminHelper;

//synchronize badge entity contents with data from policy file
exports.updatePolicyData = function(_) {
	// read badges
	var db = adminHelper.getCollaborationOrm(_);
	var entity = db.model.getEntity(_, "policyData");
	var dbData = {};
	var data = entity.fetchInstances(_, db, {
		jsonWhere: {}
	});
	for (var i = 0; i < data.length; i++) {
		dbData[data[i].partnerId(_) + "~" + data[i].productCode(_) + "~" + data[i].policyCode(_)] = data[i];
	}
	var data = check.getParsedLicense(_);
	if (data === null || !data.validLicenses) return;
	for (var i = data.validLicenses.length - 1; i >= 0; i--) {
		console.log("IN");
		var lic = data.validLicenses[i];
		var key = lic.partnerId + "~" + lic.productCode + "~" + lic.policyCode;
		if (!(key in dbData)) { // not yet available
			console.log("cr");
			var newData = entity.createInstance(_, db, null);
			newData.partnerId(_, lic.partnerId);
			newData.productCode(_, lic.productCode);
			newData.policyCode(_, lic.policyCode);
			newData.productTitle(_, lic.productTitle);
			newData.policyTitle(_, lic.policyTitle);
			newData.save(_);
		} else {
			delete dbData[key];
		}
	}
	// remove entries for old license files
	for (var key in dbData) {
		console.log("DEL ");
		var data = dbData[key];
		if (data) { // not yet handled
			if (!data.endpoints(_).toArray(_).length) { // no endpoints: delete it
				data.deleteSelf(_);
			}
		}
	}
	return;

};


exports.entity = {
	$titleTemplate: "Policy data",
	$isPersistent: true,
	$canCreate: false,
	$canEdit: false,
	$descriptionTemplate: "Selection of policies for a given endpoint",
	$valueTemplate: "{productTitle}/{policyTitle}",
	$properties: {
		partnerId: {
			$title: "Partner ID",
			$linksToDetails: true,
		},
		productCode: {
			$title: "Product code",
			$linksToDetails: true,
			$isMandatory: true
		},
		productTitle: {
			$title: "Product title",
			$isLocalized: true
		},
		policyCode: {
			$title: "Policy code",
			$isMandatory: true
		},
		policyTitle: {
			$title: "Policy title",
			$isLocalized: true
		}
	},
	$relations: {
		endpoints: {
			$title: "Endpoints",
			$type: "endPoints",
			$inv: "policyData",
			$isComputed: true,
			$nullOnDelete: true
		}
	}
};