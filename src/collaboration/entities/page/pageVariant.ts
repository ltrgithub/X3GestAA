"use strict";

exports.entity = {
	$allowFactory: true,
	$factoryExcludes: ["description", "roles", "users", "endpoints"],
	$showMeta: "$creUser,$updUser,$creDate,$updDate",
	$properties: {
		code: {
			$title: "Code"
		},
		title: {
			$title: "Title",
			$isLocalized: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		}
	},
	$relations: {
		roles: {
			$title: "Applies to roles",
			$type: "roles",
		},
		users: {
			$title: "Applies to users",
			$type: "users",
		},
		endpoints: {
			$title: "Applies to endpoints",
			$type: "endPoints"
		},
		pageData: {
			$title: "Content",
			$type: "pageData",
			$cascadeDelete: true
		}
	},
	$functions: {
		_isGlobal: function(_) {
			return (this.roles(_).getLength() === 0) && (this.users(_).getLength() === 0) && (this.endpoints(_).getLength() === 0);
		}
	}
};