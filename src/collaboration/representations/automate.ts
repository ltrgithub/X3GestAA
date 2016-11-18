"use strict";

exports.representation = {
	$entityName: "automate",
	$facets: {
		$details: {
			$layout: {
				"$layoutType": "stack",
				"$items": [{
					"$category": "section",
					"$title": "Information",
					"$layout": {
						"$items": [{
							"$bind": "description"
						}, {
							"$bind": "lastStart"
						}, {
							"$bind": "lastEnd"
						}, {
							"$bind": "status"
						}],
						"$layoutType": "stack"
					}
				}, {
					"$category": "section",
					"$title": "Events",
					"$layout": {
						"$items": [{
							"$bind": "automateEvents",
							"$isQuickFilter": true,
							"$layout": {
								"$items": [{
									"$bind": "description"
								}, {
									"$bind": "eventType"
								}, {
									"$bind": "everyDay"
								}, {
									"$bind": "nextRun"
								}, {
									"$bind": "suspended"
								}]
							},
							"$cardItem": {
								"$position": "row",
								"$layout": {
									"$layoutType": "row",
									"$items": [{
										"$items": [{
											"$category": "section",
											"$title": "Week days",
											"$layout": {
												"$items": [{
													"$bind": "days",
													"$isTitleHidden": true,
													"$isQuickDesignerDisabled": true,
													"$isPagerHidden": true,
													"$layout": {
														"$items": []
													}
												}],
												"$layoutType": "stack"
											}
										}]
									}, {
										"$items": [{
											"$category": "section",
											"$title": "Times",
											"$layout": {
												"$items": [{
													"$bind": "times",
													"$isTitleHidden": true
												}]
											}
										}]
									}]
								},
								"$category": "section"
							}
						}],
						"$layoutType": "stack"
					}
				}, {
					"$category": "section",
					"$title": "Tasks",
					"$layout": {
						"$items": [{
							"$bind": "automateTasks",
							"$isQuickFilter": true,
							"$layout": {
								"$items": [{
									"$bind": "description"
								}, {
									"$bind": "suspended"
								}, {
									"$bind": "logLevel"
								}, {
									"$bind": "processSummary"
								}]
							}
						}]
					}
				}]
			}
		},
		$edit: {
			$copy: "$details"
		}
	}
};