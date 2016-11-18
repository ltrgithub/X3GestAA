"use strict";

var tracer; // = console.log

exports.entity = {
	$titleTemplate: "Event time",
	$lockType: "pessimist",
	$valueTemplate: "{key}",
	$properties: {
		timestamp: {
			$title: "TS",
			$isMandatory: true,
			$type: "integer"
		},
		key: {
			$title: "Key"
		},
		parameters: {
			$title: "Parameters",
			$type: "json"
		}
	},
	$relations: {
		event: {
			$title: "Event",
			$variants: {
				notificationEvent: {
					$type: "notificationEvent"
				},
				printDocument: {
					$type: "printDocument"
				},
				serverLog: {
					$type: "serverLog"
				},
				objectActionsRunner: {
					$type: "objectActionsRunner"
				},
				update: {
					$type: "update"
						//				},
						//				aws_instance: {
						//					$type: "aws_instance"
				},
				tokenInfo: {
					$type: "tokenInfo"
				}
			},
			//$isDynamicType: true // TODO: remove, should be replaced by $variants
			//$type: "notificationEvent"
		}
	}
};