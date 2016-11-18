"use strict";

var adminHelper = require("../../collaboration/helpers").AdminHelper;
var config = require('config');

exports.entity = {
	$titleTemplate: "SagePay session",
	$properties: {
		sid: {
			$title: "Session id"
		},
		host: {
			$title: "Host"
		},
		vpsTxId: {
			$title: "Sage Pay ID"
		},
		vendorName: {
			$title: "Vendor Name"
		},
		securityKey: {
			$title: "Security Key"
		},
		nextURL: {
			$title: "Next URL"
		},

		waitStatus: {
			$title: "Wait Status"
		},
		vpsProtocol: {
			$title: "VPS Protocol"
		},
		status: {
			$title: "Status"
		},
		securityStatus: {
			$title: "Security Status"
		},
		notificationPostData: {
			$title: "Notification Post Data"
		}
	},
	$relations: {},
	$expire: function(_, instance) {
		// set in hard the value, it will be configured after
		return 300000; //5 minutes
	}
};