"use strict";

// Entity containing deleted instances of synchronizable entities

exports.entity = {
	$canCreate: false,
	$canDelete: false,
	$canEdit: false,
	$properties: {
		entname: {
			$title: "Entity name",
			$isMandatory: true,
		},
		tick: {
			$title: "Tick",
			$type: "integer",
			$default: 0
		},
		endpoint: {
			$title: "Endpoint",
		},
		// need own property (is not equal to update time)
		deletionTime: {
			$title: "Deletion time",
			$type: "datetime"
		},
		syncUuid: {
			$title: "Synchronization UUID"
		}
	}
};