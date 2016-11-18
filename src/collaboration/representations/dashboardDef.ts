"use strict";

exports.representation = {
	$entityName: "dashboardDef",
	$facets: {
		$details: {
			$layout: {
				"$layoutType": "stack",
				"$items": [{
					"$category": "section",
					"$title": "Information",
					"$layout": {
						"$items": [{
							"$bind": "title"
						}, {
							"$bind": "description"
						}, {
							"$bind": "dashboardName"
						}, {
							"$bind": "mobile"
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
									"$bind": "allApplications"
								}, {
									"$bind": "application"
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
										"$title": "Vignettes",
										"$layout": {
											"$items": [{
												"$bind": "vignettes",
												"$isTitleHidden": true,
												"$format": "cards",
												"$cardsByRowCount": 3,
												"$layout": {
													"$items": [{
														"$category": "section",
														"$layout": {
															"$items": [{
																"$bind": "portlet"
															}, {
																"$bind": "isTOC"
															}, {
																"$bind": "allEndpoints"
															}, {
																"$bind": "endpoint"
															}]
														}
													}]
												}
											}]
										}
									}, {
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
										},
										"$opened": true
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