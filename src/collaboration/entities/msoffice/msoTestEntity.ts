"use strict";

var bigint = require('@sage/syracuse-core').types.bigint;
var decimal = require('@sage/syracuse-core').types.decimal;
var datetime = require('@sage/syracuse-core').types.datetime;
var date = require('@sage/syracuse-core').types.date;

exports.entity = {
	$titleTemplate: "Test datatypes",
	$descriptionTemplate: " ",
	$valueTemplate: " ",
	$capabilities: "wordReport,mailMerge,pdfReport,excelReport",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$canCreate: false,

	$properties: {
		p_boolean: {
			$title: "Boolean",
			$type: "boolean"
		},
		p_integer: {
			$title: "Integer",
			$type: "integer"
		},
		p_string: {
			$title: "String",
			$type: "string"
		},
		p_datetime: {
			$title: "Datetime",
			$type: "datetime"
		},
		p_date: {
			$title: "Date",
			$type: "date"
		},
		p_decimal: {
			$title: "Decimal (Scale 2)",
			$type: "decimal",
			$scale: 2
		},
		p_decimal2: {
			$title: "Decimal (Scale 4)",
			$type: "decimal",
			$scale: 4
		},
		p_decimal3: {
			$title: "Decimal (Scale 0)",
			$type: "decimal",
			$scale: 0
		},
		p_decimal4: {
			$title: "Decimal (No scale = default 2)",
			$type: "decimal"
		},
		p_enum: {
			$title: "Enum",
			$enum: [{
				$value: "a",
				$title: "Label a"
			}, {
				$value: "b",
				$title: "Label b"
			}, {
				$value: "c",
				$title: "Label c"
			}]
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		var list = [];
		var i;
		var enumVals = ["a", "b", "c"];
		for (i = 1; i <= 12; i++) {
			var e = self.factory.createInstance(_, null, context.db, context);
			e.p_string(_, "Test data row " + i);
			e.p_decimal(_, decimal.make(i * 1.2345));
			e.p_decimal2(_, decimal.make(i * 1.2345));
			e.p_decimal3(_, decimal.make(i * 1.2345));
			e.p_decimal4(_, decimal.make(i * 1.2345));
			e.p_integer(_, i * 3);
			e.p_boolean(_, true);
			e.p_enum(_, enumVals[(i - 1) % 3]);
			e.p_datetime(_, datetime.make(2012, i % 12, (i * 3) % 28, ((i - 1) * 2) % 24, (i * 3) % 60, (i * 4) % 60));
			e.p_date(_, date.make(2012, i, (i * 3) % 28));
			list.push(e);
		}
		return list;
	},
};