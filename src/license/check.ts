"use strict";
var util = require('util');
var adminHelpers = require('syracuse-collaboration/lib/helpers');
var fs = require('streamline-fs');
var http = require('http');
var fsp = require('path');
var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;
var checkFunnel = require('streamline/lib/util/flows').funnel(1);
var lic = require('../index');
var l = lic.load('license');
var date = require('@sage/syracuse-core').types.date;
var datetime = require('@sage/syracuse-core').types.datetime;
var config = require('config');
var mock = require('syracuse-load/lib/mock');
var hostEntity = require('syracuse-collaboration/lib/entities/host');
var tracer = require('@sage/syracuse-core').getTracer('license'); //= console.log;
var localhost = require('os').hostname().replace(/\./g, ","); // no dots, because they will be interpreted as object properties when stored in a MongoDB counter
var sessionManager = require('../../../src/session/sessionManager').sessionManager;
var globals = require('streamline-runtime').globals;

// var mongodb = require('mongodb')
var POLICY_FOLDER = fsp.join(config.system.root, 'policies');
var PARTNER_FILE = fsp.join(config.system.root, 'partner.json');

var GRACEDEFAULT = 100; // default value for grace limit for Web services

// number of days before license expiry that a notification will be sent
var NOTIFICATION_INTERVAL = 10;
/// updateFromDB: read license data from database (because database data may have changed) before first session is started
/// also check badge count for named users from database information

function updateFromDB(_) {
	try {
		var licenses = lic.readLicenses(_, globals.context.tenantId);
		_manageLicenseData(_, licenses, true, null, true); // force named users badge count
	} catch (e) {
		if (e instanceof Error) // do not log the message which tells that there is no database configuration
		{
			console.error(e.stack);
		}
	}
}

exports.updateFromDB = updateFromDB;

function validLicenses() {
	var data = l.license(undefined, globals.context.tenantId);
	if (data && data[1] && data[1].validLicenses) return data[1].validLicenses;
	return [];
}

exports.validLicenses = validLicenses;

/// getParsedLicense: get parsed license data

function getParsedLicense(_) {
	var data = _manageLicenseData(_);
	if (data) return data[1];
	return null;
}
exports.getParsedLicense = getParsedLicense;

/// getFullLicense: get parsed and raw license data
function getFullLicense(_) {
	var data = _manageLicenseData(_);
	if (data) return data;
	return null;
}
exports.getFullLicense = getFullLicense;

function deleteLicense(partnerId, productCode, productVersion, policyCode, policyVersion, diagnoses, _) {
	_manageLicenseData(_, [], false, diagnoses, false, {
		partnerId: partnerId,
		productCode: productCode,
		productVersion: productVersion,
		policyCode: policyCode,
		policyVersion: policyVersion
	});
	propagateChange(_);
}
exports.deleteLicense = deleteLicense;

/// getRawLicense: get list of license strings exactly in the format in which they have been provided to the license system

function getRawLicense(_) {
	var data = _manageLicenseData(_);
	if (data) return data[0];
	return null;
}
exports.getRawLicense = getRawLicense;

// convert error messages from native module to better readable, localized messages
function _convertError(e, rawData) {
	if (e instanceof Error) {
		var text = e.message;
		var errmess;
		var index = text.indexOf("\n");
		if (index >= 0) {
			errmess = text.substr(index + 1);
			text = text.substr(0, index);
		}
		var parts = text.split(";");
		switch (parts[0]) {
			case 'no json':
				return locale.format(module, "noJson", errmess);
			case 'no signature':
				return locale.format(module, "noSignature");
			case 'wrong public keys in partner file':
				return locale.format(module, "wrongPublicKeys", parts[1]);
			case 'wrong partner file format':
				return locale.format(module, "wrongPartnerFormat", parts[1], errmess);
			case 'unknown partner':
				return locale.format(module, "unknownPartner", parts[1]);
			case 'wrong signature':
				try {
					if (parts[4] && rawData) { // translate product and policy code
						rawData.forEach(function(item) {
							var content = JSON.parse(item);
							if (content.fileType === 'Policy' && content.policy.code === parts[5] && content.policy.version === parts[6] && content.product.code === parts[3] && content.product.version === parts[4] && content.partnerId === parts[2]) {
								parts[3] = _translateTitle(content.product.title);
								parts[5] = _translateTitle(content.policy.title);
							}
						});
					}
				} catch (e) {
					console.log("Error when translating message " + e);
				}
				switch (parts[1]) {
					case 'License':
						return (parts[2] ? locale.format(module, "wrongSignatureLicenseP", parts[2], parts[3], parts[4], parts[5], parts[6]) : locale.format(module, "wrongSignatureLicense", parts[3], parts[4], parts[5], parts[6]));
					case 'Policy':
						return (parts[2] ? locale.format(module, "wrongSignaturePolicyP", parts[2], parts[3], parts[4], parts[5], parts[6]) : locale.format(module, "wrongSignaturePolicy", parts[3], parts[4], parts[5], parts[6]));
					case 'Partner':
						return locale.format(module, "wrongSignaturePartner", (parts[2] || "SAGE"));
					default:
						return locale.format(module, "wrongFileType", parts[1]);
				}
			default:
				return locale.format(module, "licError", e.toString());
		}
	} else return locale.format(module, "licError", e.toString());

}

// _manageLicenseData: retrieve and store license data
//  newLicenses: optional array of licenses or policy files which will be added to the existing data and will overwrite existing data of the same kind
//  doNotStore: optional parameter which indicates that the license data should not be stored in the database
// checkNamed: check count of badges of named users even if it is not the first invocation
// deleteProfile: Data for license which should be deleted

function _manageLicenseData(_, newLicenses, doNotStore, diagnoses, checkNamed, deleteProfile) {
	if (!l) return null;
	var tenantId = globals.context.tenantId;
	try {
		var data = l.license(undefined, tenantId);
	} catch (e) {
		throw new Error(locale.format(module, "licError", e.toString()));
	}
	if (!data) {
		if (tenantId) {
			// first time for this tenant - read data from database
			if (!l.license()) throw new Error(locale.format(module, "noBaseLic"));
			data = [lic.readLicenses(_, tenantId), null];
			if (config.licensetest) console.log("###Read licenses " + tenantId + " " + JSON.stringify(data));
		} else return null;
	}
	var firstTime = !data[1];
	if (config.licensetest && data[1] && data[1].products && !data[1].products["1"]) console.log("###No products " + util.format(data));
	if (firstTime) { // first invocation: read policy and partner file
		newLicenses = newLicenses || [];
		try {
			var policies = fs.readdir(POLICY_FOLDER, _);
			var content = false;
			policies.forEach_(_, function(_, policy) {
				if (/\.json$/.test(policy)) {
					tracer.debug && tracer.debug("Policy file " + policy);
					try {
						newLicenses.push(fs.readFile(POLICY_FOLDER + "/" + policy, "utf8", _));
					} catch (e) {
						if (e.code !== "ENOENT") {
							tracer.error && tracer.error("Error when reading policy " + policy, e);
						}
					}
				}
			});
		} catch (e) {
			if (e.code !== "ENOENT") {
				tracer.error && tracer.error("Error when reading policies", e);
			}
		}
		try {
			newLicenses.push(fs.readFile(PARTNER_FILE, "utf8", _));
		} catch (e) {
			if (e.code !== "ENOENT") {
				tracer.error && tracer.error("Error when reading partner file", e);
			}
		}
	}
	for (var cnt = 0; cnt < 2; cnt++) {
		try {
			var result = _parseLicenses(data, newLicenses, diagnoses, deleteProfile, firstTime);
		} catch (e) {
			// console.error(e.stack);
			throw e;
		}
		// named users
		if (firstTime || result !== data || checkNamed) { // change in licenses or first time or explicitly required
			var ok = _checkNamedInt(_, result[1], null, diagnoses);
			if (!ok && !firstTime) // too many named users
				throw new Error(locale.format(module, "tooManyUsers"));
			result[1].namedUsers = ok;
		}
		if (result === data && diagnoses && !diagnoses.length) diagnoses.push({
			$severity: "warning",
			$message: locale.format(module, "NoNewLicense")
		});
		// store new content - only if there have been changes
		if (result !== data) {
			try {
				tracer.debug && tracer.debug("licenses to store " + result[0].join("---"));
				if (config.licensetest) console.log("###Store license data " + tenantId + " " + util.format(result[1]));
				l.license(result, tenantId);
			} catch (e) {
				if (firstTime && cnt === 0) {
					l.license([result[0], null], tenantId); // remove licenses which have wrong signature etc.
					data = l.license(undefined, tenantId); // get new data
					if (config.licensetest) console.log("###Read license data again " + tenantId + " " + util.format(data));
					tracer.debug && tracer.debug("Continue");
					continue; // try once more with new data
				}
				throw new Error(_convertError(e, result[0]));
			}
		}
		break;
	}

	var firstTimeLicenseFile = (firstTime && fs.existsSync(lic.LICENSE_FILE));
	if (!doNotStore && (firstTimeLicenseFile || result !== data)) { // change in licenses: update contents in database
		if (result[0].length === 0) {
			// bad situation: log many data
			try {
				console.log("Delete all license " + globals.context.tenantId + " " + new Error().stack + " " + util.format(newLicenses) + doNotStore + " " + util.format(diagnoses) + " " + checkNamed + " " + util.format(deleteProfile));
			} catch (e) {
				console.log("Error during logging" + e);
			};
		}
		_storeDB(result[0], _);
		/*if (require.extensions['.jsc'] && result && result[1] && result[1].validLicenses && !result[1].validLicenses.length && fs.exists(__dirname + '/../../syracuse-main/lib/syracuse.jsc', _)) {
			console.error("No license with corresponding policy");
			process.exit(5);
		}*/
		var db;
		try {
			db = adminHelpers.AdminHelper.getCollaborationOrm(_);
		} catch (e) {
			console.log("Cannot obtain ORM " + e);
		}
		if (db) {
			// search for license notification event
			var whereClause = '(code eq "license")';
			var event = db.fetchInstance(_, db.model.getEntity(_, "notificationEvent"), {
				sdataWhere: whereClause
			});
			if (event && process.argv[2] !== "STOP") {
				// schedule license expiries
				try {
					var scheduleData = result[1].validLicenses.map(function(entry) {
						var executionTime = new Date(entry.expiryDate).getTime();
						executionTime -= 86400000 * NOTIFICATION_INTERVAL; // multiply number of days with milliseconds per day
						entry.daysBefore = NOTIFICATION_INTERVAL;
						return [entry.partnerId + "_" + entry.productCode + "_" + entry.productVersion + "_" + entry.policyCode + "_" + entry.policyVersion, executionTime, entry];
					});
					tracer.debug && tracer.debug("Schedule data " + util.format(scheduleData));
					// update scheduler and database. Notification of other servers works already via license notification mechanism.
					event.scheduleAll(_, scheduleData, 1);
				} catch (e) {
					console.error("Error during scheduling license termination notifications " + e.stack);
				}
			}
		}
	}
	if (firstTimeLicenseFile && config.noDevLic && !tenantId) {
		var renamed = lic.LICENSE_FILE.replace(/\w+$/, "bbb");
		try { // remove renamed file if existent
			fs.unlink(renamed, _);
		} catch (e) {}
		fs.rename(lic.LICENSE_FILE, renamed, _);
	}
	return result;
}

// converts keys from underscore to dash, e. g. en_US to en-US

function convertTitle(title) {
	if (title && (title instanceof Object)) {
		Object.keys(title).forEach(function(key) {
			var keyOrig = key;
			if (/^[a-z][a-z]_[A-Z][A-Z]$/.test(key)) {
				key = key.substr(0, 2) + "-" + key.substr(3);
			}
			key = key.toLowerCase();
			if (keyOrig !== key) {
				title[key] = title[keyOrig];
				delete title[keyOrig];
			}
		});
		if (!("default" in title)) {
			title["default"] = title["en-us"];
		}
	}
	return title;
}
exports.convertTitle = convertTitle;

// update raw license data in database (replace old list of licenses with new list)

function _storeDB(licenses, _) {
	tracer.debug && tracer.debug("STORE DB");
	//	var db = lic.getDatabase(globals.context.tenantId);

	// Establish connection to db
	var db;
	try {
		//		db = db.open(_);
		var db = lic.connectDatabase(_, globals.context.tenantId);
		var collection = db.createCollection('license', _);
		if (!licenses.length) {
			collection.remove({}, {
				safe: true,
				fsync: true
			}, _);
		} else {
			var licenses0 = collection.find().toArray(_);
			// find out what to delete and what to insert
			for (var i = licenses0.length - 1; i >= 0; i--) {
				var index = licenses.indexOf(licenses0[i].text);
				if (index >= 0) { // license unchanged
					licenses0.splice(i, 1);
					licenses.splice(index, 1);
				}
			}
			while (licenses0.length && licenses.length) {
				// update data
				var l0 = licenses0.pop();
				var l = licenses.pop();
				if (config.logLicChange)
					console.log("License system replace", l0.text, l);
				l0.text = l;
				collection.update({
					_id: l0._id
				}, {
					$set: l0
				}, {
					safe: true
				}, _);
				if (config.logLicChange)
					console.log("License system replaced");
			}
			if (licenses0.length) {
				var ids = licenses0.map(function(lic) {
					return lic._id;
				});
				if (config.logLicChange)
					console.log("License system remove", licenses0);
				collection.remove({
					_id: {
						$in: ids
					}
				}, {
					safe: true,
					fsync: true
				}, _);
				if (config.logLicChange)
					console.log("License system removed");
			}
			if (licenses.length > 0) {
				var ins = licenses.map(function(item) {
					return {
						text: item
					};
				});
				if (config.logLicChange)
					console.log("License system insert", licenses);
				collection.insert(ins, {
					safe: true
				}, _);
				if (config.logLicChange)
					console.log("License system inserted");
			}
		}
	} finally {
		if (db) db.close();
	}
	// update badge information
	tracer.debug && tracer.debug("STORE BADGES");
	require('syracuse-collaboration/lib/entities/badge').updateBadges(_);
}

// distributes the input data into a newly created object:
// keys are the file types, values objects with keys being the full key for license and policy files and the partnerId for partner file.
// allows just one license for each product and partner. When there are multiple licenses/policies, the one with the newest stamp will be taken
// deleteProfile: if set, the license file with the corresponding data will be deleted

function _preParseLicenses(contents) {
	var policies = {};
	var licenses = {};
	var partnerContents = {};
	var licenseContents = {};
	var policyContents = {};
	var licenseProducts = {}; // only one license per product: keys consist of partnerId and product, values are the full keys
	var result = {
		'policies': policies,
		'licenses': licenses,
		'partnerContents': partnerContents,
		'policyContents': policyContents,
		'licenseContents': licenseContents
	};
	var fullKey;
	if (contents) {
		contents.forEach(function(content) {
			content = content.trim();
			try {
				var parsed = JSON.parse(content);
			} catch (e) {
				throw new Error(locale.format(module, "noJson", e.message));
			}
			if (parsed.fileType !== "Partner") {
				if (!parsed.product || !parsed.policy) throw new Error(locale.format(module, "noProductPolicy"));
				if (!parsed.generationStamp) throw new Error(locale.format(module, "noGenerationStamp"));
				try {
					datetime.parse(parsed.generationStamp);
				} catch (e) {
					throw new Error(locale.format(module, "wrongStampFormat", parsed.generationStamp));
				}
				fullKey = parsed.partnerId + "\0" + parsed.product.code + "\0" + parsed.product.version + "\0" + parsed.policy.code + "\0" + parsed.policy.version;
			}
			switch (parsed.fileType) {
				case "Partner":
					parsed.partnerId = parsed.partnerId || "";
					if (parsed.partnerId && parsed.partners && (parsed.partners.length !== 1 || parsed.partners[0].partnerId !== parsed.partnerId))
						throw new Error(locale.format(module, "wrongPublicKeys", parsed.partnerId));
					result.partnerContents[parsed.partnerId] = content;
					break;
				case "Policy":
					if (parsed.partnerId && !parsed.baseProduct) throw new Error(locale.format(module, "noBaseProduct", _translateTitle(parsed.product.title), parsed.partnerId));
					if (parsed.sessionTypes) {
						var devices = {};
						parsed.sessionTypes.forEach(function(type) {
							if (type && type.devices) {
								type.devices.forEach(function(device) {
									if (device in devices) {
										throw new Error(locale.format(module, "duplicateDevice", device, _translateTitle(parsed.product.title)));
									}
									devices[device] = 0;
								});
							}
						});
					}
					if (fullKey in policies && (policies[fullKey].generationStamp >= parsed.generationStamp)) {
						return;
					}
					policies[fullKey] = parsed;
					policyContents[fullKey] = content;
					break;
				case "License":
					_checkFormat(parsed.validity, parsed, true);
					if (fullKey in licenses && (licenses[fullKey].generationStamp >= parsed.generationStamp)) {
						return;
					}
					licenses[fullKey] = parsed;
					licenseContents[fullKey] = content;
					break;
				default:
					throw new Error(locale.format(module, "invalidType", parsed.fileType));
			}
		});
	}
	return result;
}

// for unit tests
exports._preParseLicenses = _preParseLicenses;

/* central function for parsing license data and putting them together
 * parameters: data: return value from license() function of native module
 *             newLicenses: new license, policy, partner data (may be equal to already existing data)
 *             diagnoses: optional parameter: add diagnostic warning messages about ignored modules and badges
 *             deleteProfile: product code, version, policy code, version of a license which should be deleted
 *             firstTime: first time invocation: remove all existing policies for Sage products (will be replaced with new policies)
 * structure of parsed license data:
 * - nextCheck: new computation of data necessary after this date (e. g. "2012-01-31")
 * - previousCheck: new computation of data necessary before this date (e. g. "2012-01-31")
 * - keyFunctions: list of all license protected X3 functions of all modules
 * - badges: object with keys being badge code and values being objects with keys max:
 *    maximal number of allowed badges, func: functions released by badge, title: badge.title};
 *    for each badge code the maximum number and the functions which are released by this badge
 * - expires: list of all expiring modules: module code, expire date, partnerId, sorted ascending by expire date
 * - concurrent: licensing model: concurrent (true) or named user (false)
 * - licensedTo: to whom the license has been issued
 * - maxSessions: maximum number of sessions
 * - namedUsers: true: licenses are sufficient for named users, false: licenses are not sufficient for named users
 * - validLicenses: array of data for valid licenses, for each license an object with attributes:
 *	 expiryDate (end of validity in ISO date format), partnerId, productCode, productTitle, productVersion, policyCode, policyTitle, policyVersion.
 */

function _parseLicenses(data, newLicenses, diagnoses, deleteProfile, firstTime) {
	if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
	var licenses = data[0];
	var currentDate = date.today();
	var currentDateString = currentDate.toString();
	if (!deleteProfile && (!newLicenses || newLicenses.length === 0) && data[1] && (data[1].nextCheck >= currentDateString && data[1].previousCheck <= currentDateString)) return data;
	var licenseData = {};
	var policyData = {};
	var grouped = {};
	var products = {};
	var newLic = false; // real changes with new licenses
	var oldData = _preParseLicenses(licenses);
	var newData = _preParseLicenses(newLicenses);
	// find out whether there are changes due to the new data
	if (deleteProfile) {
		var key = deleteProfile.partnerId + "\0" + deleteProfile.productCode + "\0" + deleteProfile.productVersion + "\0" + deleteProfile.policyCode + "\0" + deleteProfile.policyVersion;
		delete oldData.licenses[key];
		delete oldData.licenseContents[key];
		if (deleteProfile.partnerId) { // for partner licenses also delete partner policy
			delete oldData.policies[key];
			delete oldData.policyContents[key];
		}
	}
	// merge old and new data
	// Partner file
	var contNew = newData.partnerContents;
	var contOld = oldData.partnerContents;
	for (var key in contNew) {
		if (contNew[key] !== contOld[key]) {
			newLic = true;
			contOld[key] = contNew[key];
			tracer.debug && tracer.debug("Changed partner " + key);
		}
	}

	// Policy files
	var contNew = newData.policyContents;
	var contOld = oldData.policyContents;
	var objNew = newData.policies;
	var objOld = oldData.policies;
	for (var key in contNew) {
		if (contNew[key] !== contOld[key]) {
			newLic = true;
			contOld[key] = contNew[key];
			objOld[key] = objNew[key];
			tracer.debug && tracer.debug("Changed policy " + key);
		}
	}
	// delete Sage policy files which do not exist any more in "policies" directory
	if (firstTime) {
		for (var key in objOld) {
			if (!objOld[key].partnerId && !(key in objNew)) {
				delete objOld[key];
				delete contOld[key];
				newLic = true;
			}
		}
	}
	// merge licenses and compute list of valid licenses
	var prodLicenses = {};
	var contNew = newData.licenseContents;
	var contOld = oldData.licenseContents;
	var objNew = newData.licenses;
	var objOld = oldData.licenses;
	for (var i = 0; i < 2; i++) { // merge Sage licenses first, then partner licenses
		for (var key in objOld) {
			var lic = objOld[key];
			if (i == 0 ^ !lic.partnerId) continue;
			if (!(key in oldData.policies)) {
				tracer.debug && tracer.debug("No policy " + key);
				continue; // license without policy is not valid
			}
			if (lic.partnerId) { // check whether base product is OK for partner licenses
				var pol = oldData.policies[key];
				var baseLicense = prodLicenses["\0" + pol.baseProduct];
				if (!baseLicense) {
					// no base product
					tracer.warn && tracer.warn("No base product " + key);
					continue;
				}
				baseLicense = objOld[baseLicense]
				if (lic.serialControl) {
					if (lic.serial !== baseLicense.serial) {
						tracer.warn && tracer.warn("Wrong serial number");
						continue;
					}
				}
			}
			var prodKey = lic.partnerId + "\0" + lic.product.code;
			if (!(prodKey in prodLicenses) || objOld[prodLicenses[prodKey]].generationStamp < lic.generationStamp) {
				prodLicenses[prodKey] = key;
			}
		}
		// merge new data: new licenses will always replace old licenses for the same product
		for (var key in objNew) {
			var lic = objNew[key];
			if (i == 0 ^ !lic.partnerId) continue;
			if (!(key in oldData.policies)) {
				if (diagnoses) diagnoses.push({
					$severity: "warning",
					$message: lic.partnerId ? locale.format(module, "noCorrespondingPolicyP", lic.partnerId, lic.product.code, lic.product.version, lic.policy.code, lic.policy.version) : locale.format(module, "noCorrespondingPolicy", lic.product.code, lic.product.version, lic.policy.code, lic.policy.version)
				});
				tracer.warn && tracer.warn("No policy2 " + key);
				continue; // license without policy is not valid
			}
			// check whether license is currently valid
			if (diagnoses) {
				if (currentDateString > lic.validity[1]) {
					var pol = oldData.policies[key];
					if (lic.partnerId) {
						diagnoses.push({
							$severity: "warning",
							$message: locale.format(module, "licNotValidAnyMoreP", lic.partnerId, _translateTitle(pol.product.title), lic.product.version, _translateTitle(pol.policy.title), lic.policy.version)
						})
					} else {
						diagnoses.push({
							$severity: "warning",
							$message: locale.format(module, "licNotValidAnyMore", _translateTitle(pol.product.title), lic.product.version, _translateTitle(pol.policy.title), lic.policy.version)
						})
					}
				}
				if (currentDateString < lic.validity[0]) {
					var pol = oldData.policies[key];
					if (lic.partnerId) {
						diagnoses.push({
							$severity: "warning",
							$message: locale.format(module, "licNotYetValidP", lic.partnerId, _translateTitle(pol.product.title), lic.product.version, _translateTitle(pol.policy.title), lic.policy.version)
						})
					} else {
						diagnoses.push({
							$severity: "warning",
							$message: locale.format(module, "licNotYetValid", _translateTitle(pol.product.title), lic.product.version, _translateTitle(pol.policy.title), lic.policy.version)
						})
					}
				}
			}
			if (lic.partnerId) { // check whether base product is OK
				var pol = oldData.policies[key];
				var baseLicense = prodLicenses["\0" + pol.baseProduct];
				if (!baseLicense) {
					// no base product
					if (diagnoses) diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "noCorrespondingBaseProduct", lic.partnerId, _translateTitle(pol.product.title), lic.product.version, _translateTitle(pol.policy.title), lic.policy.version, pol.baseProduct)
					});
					tracer.warn && tracer.warn("No base product2 " + key);
					continue;
				}
				baseLicense = objOld[baseLicense]
				if (lic.serialControl) {
					if (lic.serial !== baseLicense.serial) {
						tracer.warn && tracer.warn("Wrong serial number");
						if (diagnoses)
							diagnoses.push({
								$severity: "error",
								$message: locale.format(module, "wrongSerial", lic.serial, baseLicense.serial)
							});
						continue;
					}
				}
			}
			var prodKey = lic.partnerId + "\0" + lic.product.code;
			var availableKey = prodLicenses[prodKey];
			if (availableKey) {
				if (availableKey !== key) {
					tracer.info && tracer.info("delete license for key " + availableKey);
					delete objOld[availableKey];
					delete contOld[availableKey];
					newLic = true;
				}
			}
			prodLicenses[prodKey] = key;
			if (contOld[availableKey] !== contNew[key]) {
				objOld[key] = lic;
				contOld[key] = contNew[key];
				newLic = true;
			}
		}

	}

	if (!deleteProfile && !newLic && data[1] && (data[1].nextCheck >= currentDateString && data[1].previousCheck <= currentDateString)) return data;
	// compute new parsed data
	if (newLic || deleteProfile || !data[1]) {
		var k = []; // list of all available contents
		var cont = oldData.partnerContents;
		Object.keys(cont).forEach(function(key) {
			k.push(cont[key]);
		});
		var cont = oldData.policyContents;
		Object.keys(cont).forEach(function(key) {
			k.push(cont[key]);
		});
		var cont = oldData.licenseContents;
		Object.keys(cont).forEach(function(key) {
			k.push(cont[key]);
		});
		data = [k, {}];
	} else {
		data[1] = {};
	}
	var infos = data[1];
	var keyFunctions = {}; // object with product versions as keys and objects as values, which have key functions as keys. Find out about duplicate function names within same product 
	var policyItems = {}; // object with licensed types in policy files (modules, activity codes etc.) plus product code as keys and objects as values
	// parse the licenses
	var keys = Object.keys(prodLicenses).sort(); // Sage licenses should come first
	var nextCheck = date.today().addYears(1000);
	var previousCheck = date.today().addYears(-1000);
	var expires = [];
	infos.badges = {};
	infos.products = {};
	infos.validLicenses = [];
	// loop over all licensed products
	keys.forEach(function(key) {
		var fullKey = prodLicenses[key];
		var parsedPolicy = oldData.policies[fullKey];
		var productName = (parsedPolicy.partnerId ? parsedPolicy.baseProduct : parsedPolicy.product.code);
		var keyFunctions0 = keyFunctions[productName] = keyFunctions[productName] || {};
		infos.products[productName] = infos.products[productName] || {
			modules: {},
			activityCodes: {},
			languages: {},
			parameterKits: {},
			legislations: {},
			parameters: {},
			keyFunctions: [],
			licenses: [],
			sessionTypes: {},
			deviceMapping: {}
		};
		if (!parsedPolicy.partnerId) infos.products[productName].productTitle = parsedPolicy.product.title;
		var productData = infos.products[productName];
		var parsedLicense = oldData.licenses[fullKey]; // there may be a license for this policy
		var validFrom = date.parse(parsedLicense.validity[0]);
		var validTo = date.parse(parsedLicense.validity[1]);
		var licenseValid = true;
		// check validity of license
		if (validFrom.compare(currentDate) > 0) {
			// license not yet valid
			if (validFrom.compare(nextCheck) <= 0) {
				nextCheck = validFrom.addDays(-1);
			}
			licenseValid = false;
		} else {
			if (validFrom.compare(previousCheck) > 0) previousCheck = validFrom;
		}
		if (validTo.compare(currentDate) < 0) {
			// license not valid any more
			if (validTo.compare(previousCheck) >= 0) {
				previousCheck = validTo.addDays(1);
			}
			licenseValid = false;
		} else {
			if (validTo.compare(nextCheck) < 0) {
				nextCheck = validTo;
			}
		}
		// take license model and counters of Sage license for this product
		if (!parsedLicense.partnerId) {
			productData.concurrent = (parsedLicense.sessionControl === "concurrent");
			productData.productVersion = parsedLicense.product.version;
			if (!infos.sessionControl) {
				infos.sessionControl = productData.concurrent ? "concurrent" : "named";
			} else {
				if (infos.sessionControl === "concurrent" && !productData.concurrent || infos.sessionControl === "named" && productData.concurrent) {
					infos.sessionControl = "mixed";
				}
			}
			productData.sessionTypes = {};
			if (parsedLicense.sessionTypes && parsedPolicy.sessionTypes) {
				parsedLicense.sessionTypes.forEach(function(type) {
					productData.sessionTypes[type.code] = type.max;
				});
				parsedPolicy.sessionTypes.forEach(function(type) {
					if (type && type.devices) {
						var sessionType = type.code;
						type.devices.forEach(function(device) {
							productData.deviceMapping[device] = sessionType;
						});
					}
				});
			}
		}
		productData.licenses.push({
			partnerId: parsedPolicy.partnerId,
			productCode: parsedPolicy.product.code,
			productVersion: parsedPolicy.product.version,
			policyCode: parsedPolicy.policy.code,
			policyVersion: parsedPolicy.policy.version,
			licenseExpired: !licenseValid,
			serial: parsedLicense.serial || ""
		});
		var licenseInfos = {
			serial: parsedLicense.serial,
			licensedTo: parsedLicense.licensedTo,
			reseller: parsedLicense.reseller,
			expiryDate: parsedLicense.validity[1],
			validFrom: parsedLicense.validity[0],
			partnerId: parsedPolicy.partnerId,
			productCode: parsedPolicy.product.code,
			productTitle: convertTitle(parsedPolicy.product.title),
			productVersion: parsedPolicy.product.version,
			policyCode: parsedPolicy.policy.code,
			policyTitle: convertTitle(parsedPolicy.policy.title),
			policyVersion: parsedPolicy.policy.version
		};
		if (licenseValid) infos.validLicenses.push(licenseInfos);
		["parameters", "modules", "activityCodes", "languages", "legislations", "parameterKits", "badges"].forEach(function(item) {
			if (parsedPolicy.partnerId && item === "modules" || !parsedPolicy.partnerId && item === "badges") return; // ignore modules of partner licenses and badges of Sage licenses
			var item2 = item + productName; // allow the same parameter etc. in different products
			var policyItems0 = policyItems[item2] = policyItems[item2] || {};
			var productData0 = productData[item];
			if (!parsedPolicy[item]) return; // nothing to iterate
			var licensedItems = {};
			if (parsedLicense[item]) {
				parsedLicense[item].forEach(function(item0) {
					_checkFormat(item0.validity, parsedLicense, false);
					licensedItems["$$" + item0.code] = item0; // "$$" avoids conflicts with reserved object properties
				});
			}
			parsedPolicy[item].forEach(function(item0) {
				if (!item0 || !item0.code) {
					if (diagnoses) diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "emptyItem", item)
					});
					tracer.info && tracer.info("Ignore empty policy entry for " + item);
					return;
				}
				var code = item0.code;
				if (code in policyItems0) { // does this item occur in another policy file?
					if (diagnoses) diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "ignored" + item, code, _translateTitle(parsedPolicy.product.title), parsedPolicy.partnerId)
					});
					return;
				} else {
					policyItems0[code] = 0; // set some value so that duplicates will be recognized
				}
				if (item === "parameters") { // just take values
					var item1 = licensedItems["$$" + code];
					if (!item1) return; // nothing in license
					productData0[code] = item1.value;
					return;
				}
				if (item !== "badges") {
					productData0[code] = false; // default value
					if (item0.condition === "always") {
						productData0[code] = true; // always allowed
					} else if (item0.condition !== "license" && item0.condition !== "never") {
						throw new Error(locale.format(module, "invalidCondition", item0.condition, code));
					} else if (item0.condition === "license" && parsedLicense[item] && licenseValid) {
						// consult license for licensed items
						var item1 = licensedItems["$$" + code];
						if (item1) {
							// corresponding item found in license
							var valid = true;
							if (item1.validity) {
								_checkFormat(item1.validity, parsedLicense, false);
								if (item1.validity[0]) {
									var validFrom = date.parse(item1.validity[0]);
									if (validFrom.compare(currentDate) > 0) {
										// item not yet valid
										if (validFrom.compare(nextCheck) <= 0) {
											nextCheck = validFrom.addDays(-1);
										}
										valid = false;
									} else {
										if (validFrom.compare(previousCheck) > 0) previousCheck = validFrom;
									}
								}
								if (item1.validity[1]) {
									var validTo = date.parse(item1.validity[1]);
									if (validTo.compare(currentDate) < 0) {
										// item not valid any more
										if (validTo.compare(previousCheck) >= 0) {
											previousCheck = validTo.addDays(1);
										}
										valid = false;
									} else {
										if (validTo.compare(nextCheck) < 0) {
											nextCheck = validTo;
										}
									}
									if (item === "modules" && valid) expires.push({
										module: item1.code,
										type: item,
										code: item1.code,
										expire: item1.validity[1],
										partner: parsedLicense.partnerId
									});
								}
							}
							// module is licensed
							if (valid) productData0[code] = true;
						}
					};
				}
				// special treatment for modules: mark key functions
				var keyFunctions2 = undefined;
				if (item === "modules") {
					keyFunctions2 = item0.keyFunctions;
					var licensed = productData0[code]; // mark key functions for modules
				} else if (item === "badges") {
					keyFunctions2 = item0.functions;
					var licensed = true;
				}
				if (keyFunctions2) {
					keyFunctions2.forEach(function(fkt) {
						if (!(fkt in keyFunctions0)) {
							keyFunctions0[fkt] = licensed;
							productData.keyFunctions.push(fkt);
						} else {
							// double key function
							if (diagnoses) diagnoses.push({
								$severity: "warning",
								$message: locale.format(module, "ignoredKeyFunction", fkt, parsedLicense.partnerId)
							});
						}
					});
				}
			});
		});
		// devices/sessionTypes (always possible)
		if (parsedPolicy.sessionTypes && parsedLicense.sessionTypes) {
			var licensedItems = {};
			parsedLicense.sessionTypes.forEach(function(item0) {
				licensedItems["$$" + item0.code] = item0;
			});
			parsedPolicy.sessionTypes.forEach(function(item0) {
				var lic = licensedItems["$$" + item0.code];
				productData.sessionTypes[item0.code] = (lic ? lic.max : 0);
			});
		}

		// badges should only unlock licensed key functions
		var licensedItems = {};
		if (parsedPolicy.badges) {
			if (parsedLicense.badges) {
				parsedLicense.badges.forEach(function(badge1) {
					licensedItems["$$" + badge1.code] = badge1;
				});
			}
			parsedPolicy.badges.forEach(function(badge) {
				if (!badge || !badge.code || !badge.functions) {
					if (diagnoses) diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "emptyBadge")
					});
					tracer.warn && tracer.warn("Ignore empty policy badge");
					return;
				}
				var code = badge.code;
				if (code in infos.badges) {
					if (diagnoses) diagnoses.push({
						$severity: "warning",
						$message: locale.format(module, "ignoredB", code, parsedPolicy.partnerId)
					});
					return;
				}
				var max = 0;
				var licenseBadge = licensedItems["$$" + code];
				if (licenseBadge) {
					max = licenseBadge.max;
				}
				var funcs = [];
				infos.badges[code] = {
					max: max,
					func: funcs,
					allFunc: badge.functions.join(","),
					title: convertTitle(badge.title),
					product: productName
				};
				if (licenseValid) badge.functions.forEach(function(fkt) {
					if (keyFunctions0[fkt]) { // function belongs to licensed module
						funcs.push(fkt);
					}
				});
			});
		}
	});
	infos.expires = expires.sort(function(a, b) {
		return (a.expire > b.expire ? 1 : (a.expire === b.expire ? 0 : -1));
	});
	infos.nextCheck = nextCheck.toString();
	infos.previousCheck = previousCheck.toString();
	return data;
}

// Checks format of date strings

function _checkISODate(text) {
	try {
		return (text.length === 10 && new Date(text + "T00:00:00Z").toISOString().indexOf(text) === 0);
	} catch (e) {
		return false;
	}
}
exports._ci = _checkISODate; // for unit tests

function _checkFormat(validity, parsed, errorNull) {
	if (!validity) {
		if (!errorNull) return;
		throw new Error(locale.format(module, "noValidityGiven", parsed.fileType, parsed.product.code, parsed.product.version));
	}
	if (!validity[0]) {
		if (errorNull) throw new Error(locale.format(module, "noValidityFromGiven", parsed.fileType, parsed.product.code, parsed.product.version));
	} else {
		if (!_checkISODate(validity[0])) throw new Error(locale.format(module, "validityFromFormat", validity[0], parsed.fileType, parsed.product.code, parsed.product.version));
	}
	if (!validity[1]) {
		if (errorNull) throw new Error(locale.format(module, "noValidityToGiven", parsed.fileType, parsed.product.code, parsed.product.version));
	} else {
		if (!_checkISODate(validity[1])) throw new Error(locale.format(module, "validityToFormat", validity[1], parsed.fileType, parsed.product.code, parsed.product.version));
	}
}

exports._p = _parseLicenses;

// localization of title (pick the current language)
function _translateTitle(title) {
	title = convertTitle(title);
	var local = locale.current;
	local = local.toLowerCase();
	if (local in title) return title[local];
	return title["default"];
}



// internal function which computes X3 license info (can be tested using unit tests

function _getX3LicenseInfoInt(productCode, productVersion, badges, parsedData, diagnoses) {
	// find license information for corresponding product
	if (!("1" in parsedData.products) && !("3" in parsedData.products)) {
		console.log(new Date().toISOString(), "###No product 1 " + globals.context.tenantId + " " + util.format(parsedData))
	}
	for (var code in parsedData.products) {
		var product = parsedData.products[code];
		if (code !== productCode) continue; // wrong product
		if (helpers.relNumberCmp(productVersion, product.productVersion) > 0) {
			var title = product.productTitle ? _translateTitle(product.productTitle) : productCode;
			// licensed version not sufficient
			if (diagnoses) diagnoses.push({
				$severity: "error",
				$message: locale.format(module, "lowVersion", title, product.productVersion, productVersion)
			});
			return undefined;
		}
		// compute list of licensed functions
		var result = {
			licenses: product.licenses,
			activityCodes: product.activityCodes,
			languages: product.languages,
			parameterKits: product.parameterKits,
			legislations: product.legislations,
			modules: product.modules,
			keyFunctions: {},
			parameters: product.parameters
		};
		var resKeyFunctions = result.keyFunctions;
		product.keyFunctions.forEach(function(key) {
			resKeyFunctions[key] = false;
		});
		var badgesArray = badges && badges.split(",") || [];
		var correctProduct = false;
		badgesArray.forEach(function(badge) {
			var cont = parsedData.badges[badge];
			if (cont) {
				if (cont.product === productCode) correctProduct = true;
				cont.func.forEach(function(fkt) {
					if (fkt in resKeyFunctions) {
						resKeyFunctions[fkt] = true;
					}
				});
			}
		});
		if (!correctProduct) { // no badge for correct product
			var title = product.productTitle ? _translateTitle(product.productTitle) : productCode;
			if (diagnoses) diagnoses.push({
				$severity: "error",
				$message: locale.format(module, "noBadgeAvail", title)
			});
			// temporary message for SAM 115316
			console.log("Badges: " + badgesArray.join(";") + "; " + productCode + ". " + Object.keys(parsedData.badges).map(function(x) {
				return (parsedData.badges[x] ? x + " " + parsedData.badges[x].product : x + "-")
			}))
			return undefined;
		}
		return result;
	}
	if (diagnoses) diagnoses.push({
		$severity: "error",
		$message: locale.format(module, "noProdAvail", productCode, Object.keys(parsedData.products).join(", "))
	});
	return undefined;
}

exports._getX3LicenseInfoInt = _getX3LicenseInfoInt;

/// getX3LicenseInfo
/// returns an object which contains the X3 supervisor information which is specified in "License information for Supervisor"
///
/// Parameters:
/// - productCode is the product code for which an X3 session is requested (information comes from supervisor)
/// - productVersion is the version of the product for which an X3 session is requested (information comes from supervisor)
/// - session is the current session (if necessary, the value of globals.context.session)
/// - diagnoses: array of diagnostic messages (optional parameter). Diagnostic messages will be appended
///
/// when there is no licensing (e. g. for development), an empty object will be returned
/// when the product code does not match or the requested product version is higher than the licensed version, `undefined` will be returned
/// this means that the X3 session must not be started.
/// Remark: version comparison "7.0" < "10", "7.1.15.30" < "7.2", "7.0" < "7.0.0"

function getX3LicenseInfo(_, productCode, productVersion, session, diagnoses) {
	// read license content
	var data = getParsedLicense(_);
	if (!data) return {};
	var badgeString = "";
	if (!session) {
		console.error("No session. Here is globals.context: " + util.format(globals.context) + " and stack " + new Error().stack);
	} else {
		// avoid using sessioninfo directly
		badgeString = session.getData("badge"); //session.sessionInfo.badge(_);
	}
	return _getX3LicenseInfoInt(productCode, productVersion, badgeString, data, diagnoses);
}

exports.getX3LicenseInfo = getX3LicenseInfo;

// get parameters of license
exports.getLicenseParameters = function(_, productCode) {
	// read license content
	var data = getParsedLicense(_);
	var product = (data && data.products[productCode]);
	if (product) return product.parameters;
	return {};
}


// counts the badges of all users (only important for named users)

function _checkNamedInt(_, parsed, inst, diagnoses) {
	if (!parsed || parsed.sessionControl === "concurrent") return true;
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);

	var cursor = db.createCursor(_, db.model.getEntity(_, "user"), null);
	var user;
	var usedBadges = {};
	while (user = cursor.next(_)) {
		var badgeObject = {};
		if (inst && user.getEntity(_) === inst.getEntity(_) && user.$uuid === inst.$uuid) user = inst;
		if (!user.active(_)) continue;
		var groups = user.groups(_).toArray(_, true); // do not consider instances which have been marked for deletion
		var j = groups.length;
		while (--j >= 0) {
			var group = groups[j];
			if (inst && group.getEntity(_) === inst.getEntity(_) && group.$uuid === inst.$uuid) group = inst;
			var role = group.role(_);
			if (inst && role.getEntity(_) === inst.getEntity(_) && role.$uuid === inst.$uuid) role = inst;
			if (role) {
				var badges = role.badges(_).toArray(_, true);
				var l = badges.length;
				while (--l >= 0) {
					badgeObject[badges[l].code(_)] = "";
				}
			}
		}
		// console.log(user.login(_)+" "+util.format(badgeObject))
		Object.keys(badgeObject).forEach(function(badge) {
			if (badge in usedBadges) usedBadges[badge]++;
			else usedBadges[badge] = 1;
		});
	}
	// console.error("CHECK NAMED INT "+util.format(usedBadges))
	var ok = true;
	var badgeInfo = {};
	var productInfo = {};
	// no diagnoses (because unlicensed badges will be detected below)
	if (!_evaluateBadges(Object.keys(usedBadges), parsed, badgeInfo, productInfo, false, null)) {
		return true;
	}
	// console.error("CHECK NAMED INT2 "+util.format(badgeInfo))
	// compare numbers of badges in license and for users
	Object.keys(usedBadges).forEach(function(badge) {
		if (badge in badgeInfo) {
			if (badgeInfo[badge]) {
				var diff = usedBadges[badge] - badgeInfo[badge][0];
				if (diff > 0) {
					if (diagnoses) {
						diagnoses.push({
							$severity: "error",
							$message: locale.format(module, "namedTooMuch", badge, diff)
						});
					}
					ok = false;
					tracer.warn && tracer.warn(badge + " more " + usedBadges[badge] + " " + parsed.badges[badge].max);
				} else {
					tracer.debug && tracer.debug(badge + " OK " + usedBadges[badge] + " " + parsed.badges[badge].max);
				}
			} else {
				tracer.debug && tracer.debug("uninteresting " + badge);
			}
		} else {
			if (diagnoses) {
				diagnoses.push({
					$severity: "warning",
					$message: locale.format(module, "unlicensedBadge", badge)
				});
			}
			tracer.warn && tracer.warn(badge + " more2 " + usedBadges[badge]);
		}
	});
	tracer.info && tracer.info("NAMED OK? " + ok);
	return ok;

}

// check number of named user licenses
// inst: optional instance of an entity (which is about to be stored).
//       When it is provided, data will be taken from this instance rather than from the database instance
// messages: optional message array: stores information whether
// return code: true iff there has been a change in the information that named user licenses are sufficent.

function checkNamed(_, inst, messages) {
	var data = _manageLicenseData(_);
	// no licensing or only concurrent licenses: no check
	if (!data || data[1].sessionControl === "concurrent") return false;
	var ok = _checkNamedInt(_, data[1], inst, messages);
	if (ok != data[1].namedUsers) {
		data[1].namedUsers = ok;
		// store changed parsed content in license module
		try {
			l.license(data, globals.context.tenantId);
		} catch (e) {
			throw new Error(locale.format(module, "licError", e.toString()));
		}
		return true;
	}
	return false;
}

exports.checkNamed = checkNamed;

function findUsedBadges(_, device, instance) {
	// read license content
	var data = getParsedLicense(_);
	// no licensing or just named licenses: no concurrent check
	// assume that all products use concurrent licensing for their maximal number of users
	// if (!data || data.sessionControl === "named") return true;
	if (!data) return undefined;
	var badgeInfo = {}; // badge codes as keys and [max,product_code] as values
	var productInfo = {}; // product_code as keys and max as values
	var otherBadges = {}; // badges which are for the product but are not in the current session
	var badges = Object.keys(data.badges);
	_evaluateBadges(badges, data, badgeInfo, productInfo, true, device, null, otherBadges);
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var badgeCounts = {};
	var productCounts = {};
	var details = {
		badgeCounts: {},
		productCounts: {}
	}; // totalBadges: badgeInfo, totalProducts: productInfo};
	_usedLicenses(_, db, badgeInfo, productInfo, otherBadges, null, null, null, badgeCounts, productCounts, details);
	for (var key in details.badgeCounts) {
		var target = details.badgeCounts[key];
		target.allowed = badgeInfo[key][0];
		target.used = badgeCounts[key];
		target.product = (badgeInfo[key] || {})[1];
	}
	var currentLocale = locale.current.toLowerCase();
	for (var key in details.productCounts) {
		var target = details.productCounts[key];
		target.allowed = productInfo[key];
		target.used = productCounts[key];
		var title = data.products[key].productTitle;
		target.productTitle = title[currentLocale] || title['default'] || key;
	}
	if (instance) {
		try {
			var ws = _WSstatus(_);
		} catch (e) {
			instance.$addError("" + e);
			return details;
		}
	} else
		var ws = _WSstatus(_);
	if (ws && Object.keys(ws).length > 0) {
		details.webServices = ws;
	}
	return details;
}
exports.findUsedBadges = findUsedBadges;

// check number of concurrent licenses, considering the data from the session table together with the data of the
// current session and the intended (new)
// newSession: after login, create new session (in contrary to just changing role)
function checkConcurrent(_, session, role, userName, device, diagnoses, newSession) {
	// read license content
	var data = getParsedLicense(_);
	// no licensing or just named licenses: no concurrent check
	// assume that all products use concurrent licensing for their maximal number of users
	// if (!data || data.sessionControl === "named") return true;
	if (!data) return true;
	var badgeInfo = {}; // badge codes as keys and [max,product_code] as values
	var productInfo = {}; // product_code as keys and max as values
	var otherBadges = {}; // badges which are for the product but are not in the current session
	var badges = role.badges(_).toArray(_).map_(_, function(_, badge) {
		return badge.code(_);
	});
	// ignore badges for which there are no licenses at all
	for (var i = badges.length - 1; i >= 0; i--) {
		if (!(badges[i] in data.badges)) badges.splice(i, 1);
	}
	// no check if there are no products with concurrent users for these badges
	if (!_evaluateBadges(badges, data, badgeInfo, productInfo, true, device, diagnoses, otherBadges)) {
		// session info might not have been created here yet
		session.setData("badge", badges.join(","));
		if (session.sessionInfo) {
			try {
				session.sessionInfo.badge(_, badges.join(","));
				session.sessionInfo.save(_);
			} catch (e) {
				tracer.error && tracer.error("Error during saving session2", e);
			}
		}
		return true;
	}
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var unlicensedBadges = [];

	var serverNames = {};
	var sessionInfos = _remainingLicenses(_, db, badgeInfo, productInfo, session, userName, serverNames, newSession ? undefined : unlicensedBadges, !newSession, otherBadges);
	if (sessionInfos != null) { // maybe old sessions have been counted
		if (config.mockServer) {
			// ask nanny process for up-to-date information
			var data = hostEntity.collectClusterData(_);
			if (!data) serverNames = {};
			else {
				data.forEach(function(host) {
					var hostName = host.hostname;
					if (+host.status === 3) {
						for (var i = host.children - 1; i >= 0; i--) {
							delete serverNames[hostName + ":N" + i];
							tracer.info && tracer.info("Delete " + hostName + ":N" + i);
						}
					}
				});
			}
			var i = sessionInfos.length;
			while (--i >= 0) {
				// server cannot be reached
				var server = sessionInfos[i].serverName(_);
				if (server in serverNames) {
					tracer.debug && tracer.debug("del 1 " + sessionInfos[i].sid(_));
					sessionInfos[i].deleteSelf(_);
					sessionInfos.splice(i, 1);
					continue;
				}
			}
		}
		var i = sessionInfos.length;
		// delete sessions of servers which cannot be reached any more
		// no additional database search for deletion, because outdated sessions cannot have changed
		var pids = {};
		var timeout = 1000 * 60 * (((config.session && config.session.timeout) ? config.session.timeout : 20));
		var now = Date.now();
		while (--i >= 0) {
			// outdated sessions
			var server = sessionInfos[i].serverName(_);
			if (server.substr(0, server.indexOf(':')) === localhost) {
				if (now - sessionInfos[i].lastAccess(_).value > timeout) {
					if (server === session.serverName) {
						sessionManager.deleteSession(_, sessionInfos[i].sid(_));
						tracer.debug && tracer.debug("del21 " + sessionInfos[i].sid(_));
					} else {
						sessionInfos[i].deleteSelf(_);
						tracer.debug && tracer.debug("del22 " + sessionInfos[i].sid(_));
					}
					continue;
				}

				// process ID does not exist any more?
				var pid = sessionInfos[i].pid(_);
				if (pid) {
					if (!(pid in pids)) {
						try {
							process.kill(+pid, 0);
							pids[pid] = true;
						} catch (e) {
							// process does not exist any more
							pids[pid] = false;
						}
					}
					if (pid && !pids[pid]) {
						tracer.debug && tracer.debug("del 3 " + sessionInfos[i].sid(_));
						sessionInfos[i].deleteSelf(_);
						continue;
					}
				}
			} else {
				// allow another 10 minutes because of time difference between servers
				if (now - sessionInfos[i].lastAccess(_).value > timeout) {
					sessionInfos[i].deleteSelf(_);
					tracer.debug && tracer.debug("del 4 " + sessionInfos[i].sid(_));
					continue;
				}
			}
		}
		// sessions have been deleted - therefore get session infos again
		sessionInfos = _remainingLicenses(_, db, badgeInfo, productInfo, session, userName, serverNames, unlicensedBadges, false, otherBadges);
		if (sessionInfos != null) { // second attempt: try to delete oldest session of same user with same client ID
			var clientId = session.clientId; //session.sessionInfo.clientId(_);
			var oldestTime;
			var oldestSession;
			var currentSid = session.id // session.sessionInfo.sid(_);
			var i = sessionInfos.length;
			while (--i >= 0) {
				if (sessionInfos[i].sid(_) === currentSid) continue; // do not delete current session
				if (sessionInfos[i].clientId(_) === clientId && sessionInfos[i].userName(_) === userName) {
					var lastAccess = sessionInfos[i].lastAccess(_).value;
					if (oldestTime && oldestTime < lastAccess)
						oldestTime = lastAccess;
					oldestSession = sessionInfos[i];
				}
			}
			if (oldestSession) {
				if (server === session.serverName) {
					tracer.debug && tracer.debug("del 51 " + sessionInfos[i].sid(_));
					sessionManager.deleteSession(_, oldestSession.sid(_));
				} else {
					tracer.debug && tracer.debug("del 52 " + sessionInfos[i].sid(_));
					oldestSession.deleteSelf(_);
				}
			}
			unlicensedBadges.length = 0; // clear contents
			sessionInfos = _remainingLicenses(_, db, badgeInfo, productInfo, session, userName, serverNames, unlicensedBadges, true, otherBadges);
		}
	}
	if (sessionInfos == null && unlicensedBadges.length > 0) {
		if (session.getData("badge")) {
			if (diagnoses) diagnoses.push({
				$severity: "warning",
				$message: locale.format(module, "limited", unlicensedBadges.join(" "))
			});
		} else {
			if (diagnoses) diagnoses.push({
				$severity: "warning",
				$message: locale.format(module, "noBadgesLeft")
			});

		}
	}
	return sessionInfos === null;
}

exports.checkConcurrent = checkConcurrent;

function propagateChange(_) {
	_propagate(_, "GET", "/license/check");
}
exports.propagateChange = propagateChange;


// uses the parsed license data and an array of badge names to find out which badges are
// under the desired session control and to find out maximum user counters
// parameters:
// availableBadges: array with badge codes
// parsedData: result of getParsedLicense()
// badgeInfo: must be an object, will be populated with badge codes as keys and
//      if the corresponding product matches the session control type: array of max user number and product code (when max user number is -1, there is no restriction)
// otherwise: undefined
// productInfo: must be an object, will be populated with product codes as keys and maximum user numbers as values
// concurrent: boolean: gives desired session control type
// device: name of user device
// diagnoses: array; diagnostic messages will be appended
// otherBadges: badges for same product, which do not occur in current session: must be an object, will be populated with badges as keys and product code as value
// result: true: when there is at least one badge with desired session control type
function _evaluateBadges(availableBadges, parsedData, badgeInfo, productInfo, concurrent, device, diagnoses, otherBadges) {
	tracer.debug && tracer.debug("Evaluate badges " + util.format(availableBadges) + " " + concurrent);
	var otherProducts = {}; // products with different session control type
	var found = false;
	availableBadges.forEach(function(code) {
		var databadge = parsedData.badges[code];
		tracer.debug && tracer.debug("Badge " + code + " " + util.format(databadge));
		if (!databadge) {
			if (diagnoses) diagnoses.push({
				$severity: "warning",
				$message: locale.format(module, "noBadge", code)
			});
			return;
		}
		var productCode = databadge.product;
		tracer.debug && tracer.debug("product code " + util.format(productCode));
		if (!productCode) throw new Error(locale.format(module, "noProduct", code));
		if (!productInfo[productCode] && !otherProducts[productCode]) {
			var product = parsedData.products[productCode];
			tracer.debug && tracer.debug("Product " + util.format(product) + " " + concurrent);
			if (!product) throw new Error(locale.format(module, "noProduct", code));
			// assume that products always have concurrent licensing even if the badges have named licensing
			if (!product.concurrent || concurrent) {
				var sessionType = product.deviceMapping[device];
				tracer.debug && tracer.debug("syssion type " + util.format(sessionType));
				if (device && !sessionType)
					throw new Error(locale.format(module, "noSessionType", device, productCode));
				productInfo[productCode] = product.sessionTypes[sessionType] || 0; // maximum user number
				found = true;
			} else {
				tracer.debug && tracer.debug("product code2 " + productCode);
				otherProducts[productCode] = "";
			}
		}
		if (productCode in productInfo) {
			badgeInfo[code] = [databadge.max, productCode];
		} else {
			badgeInfo[code] = undefined;
		}
	});
	// find out totally unlicensed badges
	if (otherBadges) {
		for (var code in parsedData.badges) {
			if (code in badgeInfo) continue;
			var databadge = parsedData.badges[code];
			if (parsedData.products[databadge.product].concurrent === concurrent) {
				otherBadges[code] = databadge.product;
			}
		}
		tracer.debug && tracer.debug("Totally unlicensed: " + util.format(otherBadges));
	}
	return found;
}

// for unit tests
exports._evaluateBadges = _evaluateBadges;

/// remainingLicenses
/// computes the number of used badges from sessionInfo entity and checks whether the badges in the badgeCodes are still licensed
/// session: current session
/// serverNames: optional parameter, which must be an object; its keys will be filled with the distinct server names from the
/// sessionInfo instances (the key for the current session is not set).
/// userName: if not null, take user name from here and not from session
/// totalProducts: maximal numbers of users per product
/// unlicensedBadges: optional array; will be filled with currently unlicensed badges (because of user counters). When at least one badge is licensed, allow user to start session.
/// allowNoBadges: when true, allow that a user does not have any badges
/// otherBadges: badges which are for this product but are not in the current session: this is for product count 
/// If the licenses are enough, the function saves the currently used badges into the session context and returns null, 
/// otherwise it returns the list of sessionInfos for further investigations.
function _remainingLicenses(_, db, totalBadges, totalProducts, session, userName, serverNames, unlicensedBadges, allowNoBadges, otherBadges) {
	var badgeCounts = {}; // remaining licenses for badges: object with badge name as key and object as values which have session peer address and 
	// user login as keys and number of sessions as values
	var productCounts = {}; // remaining licenses for products: object with product code as key and object as values which have session peer address and 
	// user login as keys and number of sessions as values
	tracer.debug && tracer.debug("Remaining licenses " + util.format(totalProducts) + util.format(totalBadges))
		// check remaining licenses for current session
	var allowedBadges = [];
	var allLicensed = true;
	// find number of effective sessions
	var sessionInfos = _usedLicenses(_, db, totalBadges, totalProducts, otherBadges, session, userName, serverNames, badgeCounts, productCounts);
	tracer.debug && tracer.debug("Used licenses " + util.format(productCounts) + util.format(badgeCounts))
		// check remaining licenses for current session
	var allowedBadges = [];
	var allLicensed = true;
	Object.keys(totalBadges).forEach(function(badge) {
		var data = totalBadges[badge];
		var product = (data ? data[1] : otherBadges[badge]);
		tracer.debug && tracer.debug("BADGE local " + badge + " product " + product);
		// is product of badge allowed?
		tracer.debug && tracer.debug("product comparison " + productCounts[product] + " <= " + totalProducts[product]);
		if (totalProducts[product] && (!(product in productCounts) || productCounts[product] <= totalProducts[product])) {
			// is badge itself allowed?
			tracer.debug && tracer.debug("BADGE local " + badge + " product allowed " + product);
			tracer.debug && tracer.debug("badge comparison " + badgeCounts[badge] + " <= " + (data && data[0]));
			if (!data || data[0] < 0 || !(badge in badgeCounts) || badgeCounts[badge] <= data[0]) {
				allowedBadges.push(badge);
				tracer.debug && tracer.debug("badge allowed " + badge);
				return;
			}
		}
		allLicensed = false;
		tracer.info && tracer.info("badge not allowed " + badge);
		if (unlicensedBadges) {
			unlicensedBadges.push(badge);
			tracer.debug && tracer.debug("push to unlicensed badges " + badge);
			return;
		}
	});
	if (allLicensed || (unlicensedBadges && (allowNoBadges || allowedBadges.length > 0))) { // allow login in any case, even if no badges are left
		tracer.info && tracer.info("OK - " + allowedBadges.join(","));
		session.setData("badge", allowedBadges.join(","));
		if (session.sessionInfo) {
			try {
				session.sessionInfo.badge(_, allowedBadges.join(","));
				session.sessionInfo.save(_);
			} catch (e) {
				tracer.error && tracer.error("Error during saving session2", e);
			}
		}
		return null;
	} else {
		tracer.info && tracer.info("NOT OK");
		return sessionInfos;
	}
}


//find the current usage count of concurrent licenses
//the sessions will be grouped: up to 5 sessions for the same peer address and login name will count as 1 effective session
//the function will read all sessionInfos from database and find out the number of sessions.
//Parameters: badgeCounts, productCounts must be objects; will be filled with effective numbers of sessions: keys: badge/product codes, values: effective sessions
// other parameters: see _remainingLicenses
//if session is set, sessions with SID session.id will not be taken from database but an extra session with all badges in 'totalBadges' will be taken
//where peer address will be taken from globals.context.request and login name will be taken from userName parameter.
function _usedLicenses(_, db, totalBadges, totalProducts, otherBadges, session, userName, serverNames, badgeCounts, productCounts, details) {
	// for grouping the sessions by sessionKeys, the number of sessions for each sessionKey must be known.
	// This function adds a sub-key for this sessionKey and item if it does not exist yet and increases the number of sessions of that sessionKey
	function addSession(sessionKey, item, counts, sid, product) {
		counts[item] = counts[item] || {};
		var currInfo = counts[item];
		if (sessionKey in currInfo) currInfo[sessionKey]++
			else currInfo[sessionKey] = 1;
		if (details) {
			var target = product ? details.productCounts : details.badgeCounts;
			target[item] = target[item] || {};
			var target2 = target[item];
			if (sessionKey in target2) target2[sessionKey].push(sid);
			else target2[sessionKey] = [sid]
		}
		tracer.debug && tracer.debug("ADD " + item + " " + util.format(counts));
	}
	// add sessionKey to badge counts and product counts
	function addSessionBadges(sessionKey, badges, sid) {
		var currentProducts = {};
		badges.forEach(function(badge) {
			addSession(sessionKey, badge, badgeCounts, sid);
			var data = totalBadges[badge];
			var product = (data ? data[1] : otherBadges[badge]);
			// badge is interesting for session count
			if (product) currentProducts[product] = 0;
		});
		// add session to all products of these badges
		Object.keys(currentProducts).forEach(function(product) {
			addSession(sessionKey, product, productCounts, sid, true);
		})
	}
	// compute total number of effective sessions after grouping
	function reduceSessions(obj) {
		for (var key in obj) {
			var count = 0;
			var currInfo = obj[key];
			Object.keys(currInfo).forEach(function(item) {
				count += Math.floor(1 + (currInfo[item] - 1) / 5); // 5 sessions per badge
			});
			obj[key] = count;
		}
	}
	var sessionInfos = db.fetchInstances(_, db.model.getEntity(_, "sessionInfo"), null);
	sessionInfos.forEach_(_, function(_, sessionInfo) {
		if (sessionInfo.sessionType(_) !== "standard") {
			tracer.debug && tracer.debug("Omit Session " + sessionInfo.sid(_) + " of type " + sessionInfo.sessionType(_));
			return;
		}
		var sessionKey = (sessionInfo.peerAddress(_) || "") + "_" + sessionInfo.userName(_);
		var sid = sessionInfo.sid(_);
		tracer.debug && tracer.debug("Session " + sid + " Badges " + sessionInfo.badge(_));
		if (session && sid === session.id || !sessionInfo.badge(_)) return;
		var badges = sessionInfo.badge(_).split(',');
		if (serverNames) serverNames[sessionInfo.serverName(_)] = "";
		addSessionBadges(sessionKey, badges, sid);
	});
	// add badges of current session
	if (session) {
		var req = globals.context.request;
		var url = req ? req.url : "--"; // batch sessions
		var sessionKey = (req && req.connection ? (req.connection.remoteAddress || "") : "-") + "_" + userName;
		// SESSIONTYPE: When you change the next line, please also change the code in syracuse-collaboration/lib/entities/sessionInfo marked with SESSIONTYPE
		if (!url || (!/^\/(?:api\d+|soap-generic)\//.test(url)))
			addSessionBadges(sessionKey, Object.keys(totalBadges)); // Object.keys(totalBadges).forEach(function(badge) { addBadge(sessionKey, badge)});
		else
			tracer.debug && tracer.debug("Ignore new session with URL " + req.url);
	}
	// find effective sessions
	reduceSessions(badgeCounts);
	reduceSessions(productCounts);
	return sessionInfos;
}


// exports.psi = _putServerInt;
var _putServer = function(callback, name, method, path, content) {
	var parts = name.split(':');
	var options = {
		hostname: parts[0],
		port: parts[1] || 80,
		path: path,
		method: method
	};
	var req = http.request(options, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(chunk) {});
		res.on("end", function(chunk) {
			return callback(null, 1 * res.statusCode == 200);
		});
	});
	req.on("error", function(e, d) {
		console.log("REQUESTERROR" + e + " " + name + " " + path + " " + content);
		return callback(null, false);
	});
	if (content) req.end(content);
	else req.end();
	// return callback(null, 1*res.statusCode == 200);
};

exports.pS = _putServer; // !!!! TODO

function _propagate(_, method, path, content, extra) { // propagation only when load balancer is available!
	if ("mockServer" in config) {
		if (globals.context.tenantId) {
			path += ((path.indexOf('?') >= 0 ? '&' : '?') + 'tenantId=' + globals.context.tenantId);
		}

		var options = {
			path: "/nannyCommand/notifyAll" + path,
			method: method,
			hostname: "",
			port: 0,
			headers: {
				host: (globals.context.tenantId || "")
			}
		};
		options.headers[mock.BALANCER_HEADER] = config.port;
		try {
			var answer = mock.simpleRequest(config.mockServer.mockClient, options, content, _);
			if (extra) extra.answer = answer
		} catch (e) {
			if (extra) extra.error = e;
			console.log("Error " + e);
		}
	}
}

/// splits license data from input into license files and removes unnecessary data around them
// Redundant code: this also appears in syracuse-load/lib/balancer._js
exports._s = function(content) {
	// remove beginning and end
	content = content.replace(/^[^\{\}]*\{/, "").replace(/\}[^\{\}]*$/, "");
	// split into parts and add curly braces
	var parts = content.split(/\}[^\{\},]*[\n\r][^\{\},]*\{/).map(function(part) {
		return "{" + part + "}";
	});
	return parts;
};

exports.licenseChange = function(content, diagnoses, _, extra) {
	// verify license and store it
	var data = _manageLicenseData(_, exports._s(content), false, diagnoses);
	_clearWebserviceLicense();
	if (!data && !globals.context.tenantId) throw new Error(locale.format(module, "notInit"));
	// inform other servers
	_propagate(_, "PUT", "/license/update", content, extra);
};

/// updateLicense
/// update license in native module, but do not store it in database
/// returns a true value when licenses are valid
exports.updateLicense = function(license, _) {
	tracer.debug && tracer.debug("Update license");
	try {
		_manageLicenseData(_, exports._s(license), true);
		_clearWebserviceLicense();
		// just update the scheduler without database changes
		require('syracuse-event/lib/scheduler').scheduleAll(_);
		return true;
	} catch (e) {
		return false;
	}
};

// Web service licensing 
var multiTenant = (config.hosting && config.hosting.multiTenant);

//in single tenant mode:
//- counter
//- object with all changes
//- parameters object
var data = {};

function _clearWebserviceLicense(data1) {
	var d = data1 || data;
	if (multiTenant) {
		var tenantId = globals.context.tenantId;
		d = d[tenantId]
	}
	if (d) {
		for (var key in d) {
			if (key !== "object" && key !== "percentage") d[key].licenseStart = undefined;
		}

	}

}

// Usage of Web service licenses
function _WSstatus(_) {
	var d = data;
	if (multiTenant) {
		var tenantId = globals.context.tenantId;
		d = data[tenantId];
		if (!d) d = {};
	}
	var orm = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var cnt = orm.getCounterValue(_, "ws", "cnt");
	var result = {};
	if (cnt) {
		var connectionKey = localhost + ":" + config.port
		var products = {};
		for (var key in cnt.data) {
			products[key.substr(key.lastIndexOf('/') + 1)] = null;
		}
		for (var product in products) {
			_step(_, 0, product, d, connectionKey, null, null, true);
		};
		for (var key in d) {

			if (key !== "object" && key !== "percentage") {
				result[key] = d[key];
			}
		}
	}
	return result;
}

// Parameters: length: number of bytes
// poolMetadata: object with some data of the web service pool, in particular product code (in attribute poolMetadata.product.code)
//return values: 0 OK, >0: slow down factor, -1: prohibit use
exports.step = function(_, length, poolMetadata) {
	return _step(_, length, poolMetadata && poolMetadata.product && poolMetadata.product.code, data, localhost + ":" + config.port);
};

// Update WS license information for at most 36 periods in the past
// Parameters:
// data: web service usage data for this tenant but for all servers
// pd: web service usage data only for this product
// timeString: first 15 characters of time in ISO format
// key: local host name and port
// productCode: code of current product
// test: special parameter for unit tests
function _updateOldInfo(_, data, pd, timeString, key, productCode, test) {
	var db;
	var entity;
	var key0 = key + "/" + productCode;
	for (var k in data.object) {
		var counter;
		var stamp;
		if (k === key0 && timeString.indexOf(pd.timeString.substr(0, pd.length)) !== 0) { // known exact local data
			counter = +pd.counter;
			stamp = pd.timeString.substr(0, pd.length);
		} else {
			var value = data.object[k] || "";
			var parts = value.split(";");
			// format for the parts: value;timestamp;hash;period_string_length, e. g. 25;2015-04-22T12:36:17.926Z;a0b1c2a0;7 for period 2015-04.
			counter = +parts[0];
			stamp = parts[1].substr(0, parts[3]);
		}
		// do not count values for current period
		if (timeString.indexOf(stamp) !== 0) {
			// real database
			tracer.debug && tracer.debug("Update history of WS data");
			db = db || adminHelpers.AdminHelper.getCollaborationOrm(_);
			entity = entity || db.model.getEntity(_, "licenseWsOld");
			// clear old entries
			var cursor = db.createCursor(_, entity, {
				orderBy: [{
					binding: "period",
					descending: true
				}]
			})
			var inst;
			var period; // stores latest period string
			var count = 0; // number of different periods
			var period_tmp; // temporary variable for period
			while (inst = cursor.next(_)) {
				if (count > 36) { // keep latest 36 times
					inst.deleteSelf(_);
					continue;
				}
				if ((period_tmp = inst.period(_)) != period) {
					// since results are ordered, results with same period are together
					tracer.debug && tracer.debug("New period " + period_tmp);
					period = period_tmp;
					count++;
				}
			}
			// search for license notification event

			var inst = db.fetchInstance(_, entity, {
				jsonWhere: {
					period: stamp,
					product: productCode,
					server: key
				}
			});
			if (inst) {
				if (inst.counter(_) < counter) {
					inst.counter(_, counter);
					inst.save(_);
				}
			} else {
				var inst = entity.createInstance(_, db, null);
				inst.counter(_, counter);
				inst.period(_, stamp);
				inst.product(_, productCode);
				inst.server(_, key);
				inst.save(_);
			}
			var diags = [];
			inst.getAllDiagnoses(_, diags, {
				addEntityName: true,
				addPropName: true
			});
			if (diags.length > 0)
				console.error("DIAGS " + util.format(diags));
		}
	}
}



function _step(_, length, productCode, data, key, licenseData, timeString, noupdate) {
	var d = data;
	if (multiTenant && !noupdate) {
		var tenantId = globals.context.tenantId;
		if (tenantId) d = d[tenantId];
		if (!d) {
			d = data[tenantId] = {};
		}
	}
	timeString = timeString || new Date().toISOString();
	if (!productCode) return 0;
	var changed = false; // has counter already been changed/set?
	var pd = d[productCode]; // data for specific product
	if (!pd) d[productCode] = pd = {};
	if (!pd.licenseStart) {
		checkFunnel(_, function(_) {
			if (!pd.licenseStart) { // double check
				if (!productCode) throw new Error("No product code");
				try {
					var params = licenseData || exports.getLicenseParameters(_, productCode);
					pd.licenseStart = timeString;
					pd.size = (params.WSSIZELIMIT || params.MAXWEBSERVICES || 0) * (1 << 20);
					pd.graceLimit = pd.size * (1 + (params.WSGRACELIMIT || GRACEDEFAULT) / 100);
					pd.graceSlowdown = params.WSGRACESLOWDOWN || 2;
					// WSSIZE_LIMIT (in GB)
					// WSPERIOD (a string: DAY, MONTH or YEAR).
					// WSGRACESLOWDOWN (slowdown factor when limit is exceeded, 5 for 5 times slower)
					// WSGRACELIMIT (as a percentage that we add to WSSIZELIMIT)
					var lengthOld = pd.length;
					var period = params.WSPERIOD || "MONTH";
					period = period.toUpperCase();
					switch (period) {
						case 'DAY':
							pd.length = 10;
							break;
						case 'MONTH':
							pd.length = 7;
							break;
						case 'YEAR':
							pd.length = 4;
							break;
						default:
							throw new Error("Illegal period: " + params.WSPERIOD);
					}
					// maybe clear counter (only necessary if period gets smaller)
					if (lengthOld && pd.length > lengthOld) pd.counter = 0;
					// get data from database (maybe server has been restarted today and there are already some counts
					pd.timeString = pd.timeString || timeString.substr(0, 15);
					if (!d.object) checkObject(_, d, productCode, timeString, key, licenseData, noupdate)
					if (pd.counter) {
						pd.counter += +length;
					} else {
						pd.counter = +length;
						_updateOldInfo(_, d, pd, timeString, key, productCode, licenseData, noupdate);
					}
					changed = true;
					pd.other = pd.other || 0;
					pd.status = 0; // 0: OK, 1: exceeds warning size, 2: exceeds grace limit, 3: exceeds total limit

					if (!noupdate) checkObject(_, d, productCode, timeString, key, licenseData);
				} catch (e) {
					console.error("Error in ws lic initialisation: " + e.stack);
					pd.licenseStart = undefined;
					throw e;
				}
			}
		})
	} else {
		if (noupdate) {
			checkObject(_, d, productCode, timeString, key, licenseData, noupdate);
			return 0;
		}
		// at least new 10 minutes interval
		if (timeString.indexOf(pd.timeString) !== 0) {
			if (timeString.indexOf(pd.timeString.substr(0, pd.length)) !== 0) {
				// update information of old environments
				_updateOldInfo(_, d, pd, timeString, key, productCode, licenseData, noupdate);
				// 	new period
				if (!changed) {
					pd.counter = +length;
					changed = true;
				}

				pd.status = 0;
			} else {
				if (pd.status < 3 && !changed) {
					pd.counter += +length;
					changed = true;
				}
			}
			pd.timeString = timeString.substr(0, 15);
			// 	10 minutes over - check again
			checkObject(_, d, productCode, timeString, key, licenseData);
		} else {
			if (pd.status < 3) {
				if (!changed) {
					pd.counter += +length;
					changed = true;
				}
			}
		}
	}
	// console.log("PERC " + d.percentage + " " + pd.status + " " + (pd.counter + pd.other) + " " + pd.size);
	if ((pd.counter + pd.other) > pd.size) {
		if ((pd.counter + pd.other) > pd.graceLimit) {
			if (pd.status < 3 && !licenseData) {
				_fireEvent(_, "license_web_max", pd, productCode);
				pd.status = 3;
			}
			return -1; // over grace limit: forbid use
		} else
		// slow down
		if (pd.status < 2 && !licenseData) {
			_fireEvent(_, "license_web_grace", pd, productCode);
			pd.status = 2;
		}
		return pd.graceSlowdown;
	} else {
		if (pd.status === 0) {
			if ((pd.counter + pd.other) * 100 > d.percentage * pd.size) {
				_fireEvent(_, "license_web_warn", pd, productCode, d.percentage)
				pd.status = 1;
			}
		}

	}
	return 0;
};
//for unit tests!
exports._st = _step;
exports._nl = _clearWebserviceLicense;

function _fireEvent(_, limitType, data, productCode, percentage) {

	var whereClause = {
		code: limitType
	};
	var db = adminHelpers.AdminHelper.getCollaborationOrm(_);
	var event = db.fetchInstance(_, db.model.getEntity(_, "notificationEvent"), {
		jsonWhere: whereClause
	});
	if (event) {
		var parsed = getParsedLicense(_);
		var product = (parsed && parsed.products[productCode]);
		event.schedule(_, productCode, Date.now(), {
			productTitle: product ? product.productTitle : "",
			graceSlowdown: data.graceSlowdown,
			percentage: percentage,
			totalPercentage: 100 + ((product && product.parameters && product.parameters.WSGRACELIMIT) ? product.parameters.WSGRACELIMIT : GRACEDEFAULT)
		}, "");
	}
}

//hash function from RFC2617
function _h(v1, v2, v3) {
	var hash = require('crypto').createHash('MD5');
	hash.update(v2 + "/" + v3 + "%" + v1, "utf8");
	return hash.digest("hex");
}

//updates content in database and compares data of other servers
function checkObject(_, data0, productCode, timestamp, key, test, noupdate) {
	var obj = data0.object;
	var pd = data0[productCode];
	var key0 = key + "/" + productCode
	var options = {
		data: {},
		value: 1
	};
	if (obj && !noupdate) {
		var hash = _h(pd.counter, timestamp, pd.length);
		options.data[key0] = pd.counter + ";" + timestamp + ";" + hash + ";" + pd.length;
	};
	if (test) {
		// mock: simulate database access
		var cnt = data0.$ = (data0.$ || {
			data: {}
		});
		if (obj) {
			for (var b in options.data) {
				cnt.data[b] = options.data[b];
			}
		}
	} else {
		var orm = adminHelpers.AdminHelper.getCollaborationOrm(_);
		var cnt = orm.getCounterValue(_, "ws", "cnt", options);
		if (!obj) {
			var setting = orm.fetchInstance(_, orm.model.getEntity(_, "setting"), {});
			data0.percentage = setting.webServiceWarnThreshold(_);
		}
	}
	pd.other = 0;
	if (!cnt.data) {
		data0.object = data0.object || {};
		return;
	}
	var period = pd.timeString.substr(0, pd.length);
	for (var k in cnt.data) {
		var value = cnt.data[k] || "";
		try {
			var parts = value.split(";");
		} catch (e) {
			throw new Error("Invalid structure of database table for counters. Please let customer support fix the structure.")
		}
		// format for the parts: value;timestamp;hash;period_string_length, e. g. 25;2015-04-22T12:36:17.926Z;a0b1c2a0;7 for period 2015-04.
		// consistency check
		if (parts[2] !== _h(parts[0], parts[1], parts[3])) {
			var server = k.replace(/\/.*/, "");
			throw new Error(locale.format(module, "wrongChecksum", productCode, server));
		}
		if (period === parts[1].substr(0, pd.length) && pd.length <= +parts[3]) { // timestring belongs to correct period
			if (k === key0) {
				if (!obj) {
					pd.counter = +parts[0]; // get data only when there is no local object. Reason: restart server during period should not clear data
				}
			} else {
				if (obj) {
					var value_old = obj[k];
					if (value_old) {
						var parts_old = value_old.split(";");
						var oldStamp = parts_old[1];
						if (oldStamp > parts[1]) {
							var server = k.replace(/\/.*/, "");
							throw new Error(locale.format(module, "olderTimestamp", productCode, server));
						}
						// counter is decreased. This may only happen if 
						// - old timestamp is before start time of current license (because there may have been different WSPERIOD in old license)
						// - old timestamp is before start time of current period
						if (+parts_old[0] > +parts[0] && oldStamp >= pd.licenseStart && oldStamp.indexOf(pd.timeString.substr(0, pd.length)) === 0) {
							var server = k.replace(/\/.*/, "");
							throw new Error(locale.format(module, "lowerCounter", productCode, server));
						}
					}
				}
				pd.other += +parts[0];
			}
		}
	}
	data0.object = cnt.data;
}