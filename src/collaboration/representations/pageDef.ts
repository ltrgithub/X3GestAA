"use strict";

exports.representation = {
	$entityName: "pageDef",
	$facets: {
		$details: {
			$layout: {
				"$layoutType": "tabs",
				"$items": [{
					"$category": "section",
					"$title": "Information",
					"$layout": {
						"$items": [{
							"$bind": "code"
						}, {
							"$bind": "title"
						}, {
							"$bind": "description"
						}, {
							"$bind": "representation"
						}, {
							"$bind": "facet"
						}, {
							"$bind": "device"
						}, {
							"$bind": "application"
						}, {
							"$bind": "$creUser"
						}, {
							"$bind": "$updUser"
						}, {
							"$bind": "$creDate"
						}, {
							"$bind": "$updDate"
						}],
						"$layoutType": "stack"
					}
				}, {
					"$category": "section",
					"$title": "Variants",
					"$layout": {
						"$items": [{
							"$bind": "variants",
							"$isQuickFilter": true,
							"$isTitleHidden": true,
							"$layout": {
								"$items": [{
									"$bind": "code"
								}, {
									"$bind": "title"
								}, {
									"$bind": "description"
								}, {
									"$bind": "$factory"
								}, {
									"$bind": "$factoryOwner"
								}, {
									"$bind": "$creUser"
								}, {
									"$bind": "$updUser"
								}, {
									"$bind": "$creDate"
								}, {
									"$bind": "$updDate"
								}]
							},
							"$cardItem": {
								"$position": "row",
								"$layout": {
									"$layoutType": "tabs",
									"$items": [{
										"$category": "section",
										"$title": "Applies to roles",
										"$layout": {
											"$items": [{
												"$bind": "roles",
												"$isTitleHidden": true,
												"$isQuickDesignerDisabled": true,
												"$isPagerHidden": true,
												"$selectMode": "multi",
												"$layout": {
													"$items": [{
														"$bind": "description"
													}]
												}
											}],
											"$layoutType": "stack"
										}
									}, {
										"$category": "section",
										"$title": "Applies to users",
										"$layout": {
											"$items": [{
												"$bind": "users",
												"$isTitleHidden": true
											}]
										}
									}, {
										"$category": "section",
										"$title": "Applies to endpoints",
										"$layout": {
											"$items": [{
												"$bind": "endpoints",
												"$isTitleHidden": true
											}]
										}
									}]
								},
								"$category": "section"
							}
						}],
						"$layoutType": "stack"
					}
				}]
			}
		},
		$edit: {
			$copy: "$details"
		}
	}
};