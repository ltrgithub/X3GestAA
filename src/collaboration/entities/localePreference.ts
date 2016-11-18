"use strict";

var fs = require('streamline-fs');
var fsp = require('path');
var authHelper = require('../../..//src/auth/helpers');
var locale = require('streamline-locale');
var localeHelpers = require('@sage/syracuse-core').localeHelpers;

exports.entity = {
	$titleTemplate: "Locales",
	$valueTemplate: "{description}",
	$descriptionTemplate: "Localization preferences",
	$helpPage: "Administration-reference_Locales",
	$properties: {
		code: {
			$title: "Locale code",
			$isMandatory: true,
			$linksToDetails: true,
			$isUnique: true,
			$propagate: function(_, instance, val) {
				// get default parameters from locale files
				try {
					// read params from syracuse-core locale
					var localeParams = localeHelpers.loadLocale(_, val);
					if (localeParams.name && (instance.code(_) !== localeParams.name)) instance.code(_, localeParams.name);
					if (localeParams.nativeName != null) instance.description(_, localeParams.nativeName);
					if (localeParams.formatPatterns && localeParams.formatPatterns.shortDate != null) instance.shortDate(_, localeParams.formatPatterns.shortDate);
					if (localeParams.formatPatterns && localeParams.formatPatterns.longDate != null) instance.longDate(_, localeParams.formatPatterns.longDate);
					if (localeParams.formatPatterns && localeParams.formatPatterns.shortTime != null) instance.shortTime(_, localeParams.formatPatterns.shortTime);
					if (localeParams.formatPatterns && localeParams.formatPatterns.longTime != null) instance.longTime(_, localeParams.formatPatterns.longTime);
					if (localeParams.formatPatterns && localeParams.formatPatterns.shortDate != null && localeParams.formatPatterns.shortTime != null) instance.shortDatetime(_, localeParams.formatPatterns.shortDate + " " + localeParams.formatPatterns.shortTime);
					if (localeParams.formatPatterns && localeParams.formatPatterns.fullDateTime != null) instance.longDatetime(_, localeParams.formatPatterns.fullDateTime);
					if (localeParams.firstDayOfWeek != null) instance.firstDayOfWeek(_, localeParams.firstDayOfWeek);
					if (localeParams.firstWeekOfYear != null) instance.firstWeekOfYear(_, localeParams.firstWeekOfYear);
					//instance.twoDigitYearMax(_, localeParams.twoDigitYearMax);
				} catch (e) {
					console.error("LOCALE ERROR val=" + val, e.stack);
					// ignore error for this case. warning later ?
				}
			},
			$lookup: {
				entity: "lookupLocale",
				field: "name"
			}
		},
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true
		},
		enabled: {
			$title: "Enabled",
			$type: "boolean",
			$default: false
		},
		shortDate: {
			$title: "Date format",
			$isMandatory: true
		},
		longDate: {
			$title: "Long date format",
			$isMandatory: true
		},
		shortTime: {
			$title: "Time format",
			$isMandatory: true
		},
		longTime: {
			$title: "Long time format",
			$isMandatory: true
		},
		shortDatetime: {
			$title: "Date/time format",
			$isMandatory: true
		},
		longDatetime: {
			$title: "Long date/time format",
			$isMandatory: true
		},
		firstDayOfWeek: {
			$title: "First day of week",
			$isMandatory: true,
			$type: "integer",
			$enum: [{
				$value: 0,
				$title: "Sunday"
			}, {
				$value: 1,
				$title: "Monday"
			}, {
				$value: 2,
				$title: "Tuesday"
			}, {
				$value: 3,
				$title: "Wednesday"
			}, {
				$value: 4,
				$title: "Thursday"
			}, {
				$value: 5,
				$title: "Friday"
			}, {
				$value: 6,
				$title: "Saturday"
			}],
			$default: 1
		},
		firstWeekOfYear: {
			$title: "First week of year",
			$isMandatory: true,
			$type: "integer",
			// value is the date in January which always belongs to week 1
			$enum: [{
				$value: 1,
				$title: "Starts on Jan 1"
			}, {
				$value: 4,
				$title: "First 4-day week"
			}, {
				$value: 7,
				$title: "First full week"
			}],
			$default: 4
		},
		twoDigitYearMax: {
			$title: "Two digit date's max year",
			$isMandatory: true,
			$type: "integer",
			$compute: function(_, instance) {
				var settings = authHelper.getStandardSetting(_);
				return (settings && settings.twoDigitYearMax) || 2029;
			}
		},
		numberDecimalSeparator: {
			$title: "Number decimal separator",
			$isMandatory: true,
			$format: "$combo",
			$enum: [{
				$value: ".",
				$title: ". (dot)"
			}, {
				$value: ",",
				$title: ", (comma)"
			}]
		},
		numberGroupSeparator: {
			$title: "Number group separator",
			//			$isMandatory: true,
			$format: "$combo",
			$enum: [{
				$value: " ",
				$title: "Space"
			}, {
				$value: ".",
				$title: ". (dot)"
			}, {
				$value: ",",
				$title: ", (comma)"
			}, {
				$value: "",
				$title: "None"
			}, {
				$value: "'",
				$title: "' (hyphen)"
			}]
		},
		numberGroupSize: {
			$title: "Number group size",
			$type: "integer",
			$default: 3
		}
	},
	$functions: {
		toLocaleStructure: function(_) {
			return {
				code: this.code(_),
				shortDate: this.shortDate(_),
				longDate: this.longDate(_),
				shortTime: this.shortTime(_),
				longTime: this.longTime(_),
				shortDatetime: this.shortDatetime(_),
				longDatetime: this.longDatetime(_),
				firstDayOfWeek: this.firstDayOfWeek(_),
				firstWeekOfYear: this.firstWeekOfYear(_),
				twoDigitYearMax: this.twoDigitYearMax(_),
				numberDecimalSeparator: this.numberDecimalSeparator(_),
				numberGroupSeparator: this.numberGroupSeparator(_),
				numberGroupSize: this.numberGroupSize(_)
			};
		}
	},
	$control: function(_, instance) {
		(instance.numberGroupSeparator(_) === instance.numberDecimalSeparator(_)) && instance.$addError(locale.format(module, "numberGroupDecimalIdentical", instance.code(_)));
	},
	$defaultOrder: [
		["code", true]
	]
};