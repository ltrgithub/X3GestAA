"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "menuItem",
	$facets: {
		$details: {
			$layout: {
				$layoutType: "row",
				$items: [{
					$items: [{
						$category: "section",
						$title: "{@InformationsSectionTitle}",
						$layout: {
							$items: [{
								$bind: "code"
							}, {
								$bind: "title"
							}, {
								$bind: "description"
							}, {
								$bind: "linkType"
							}, {
								$bind: "dependency"
							}, {
								$bind: "icon"
							}, {
								$bind: "applicationMenu"
							}, {
								$bind: "$factory"
							}, {
								$bind: "$factoryOwner"
							}]
						}
					}, {
						$category: "section",
						$title: "{@ContentSectionTitle}",
						$layout: {
							$items: [{
								$bind: "application"
							}, {
								$bind: "endpoint"
							}, {
								$bind: "representationRef"
							}, {
								$bind: "facet"
							}, {
								$bind: "hrmSite"
							}, {
								$bind: "dashboard"
							}, {
								$bind: "fusionFunction"
							}, {
								$bind: "fusionKey"
							}, {
								$bind: "externalUrl"
							}, {
								$bind: "requestName"
							}, {
								$bind: "requestLevel"
							}, {
								$bind: "statName"
							}, {
								$bind: "processName"
							}, {
								$bind: "processMenu"
							}, {
								$bind: "processLeg"
							}]
						}
					}]
				}, {
					$items: [{
						$category: "section",
						$title: "{@ParametersSectionTitle}",
						$layout: {
							$items: [{
								$bind: "keyParameter"
							}, {
								$bind: "keyIsWhere"
							}, {
								$bind: "parameters"
							}]
						}
					}, {
						$category: "section",
						$title: "{@DisplaySectionTitle}",
						$layout: {
							$items: [{
								$bind: "target"
							}]
						}
					}, {
						$category: "section",
						$title: "{@ClassificationSectionTitle}",
						$layout: {
							$items: [{
								$bind: "module"
							}, {
								$bind: "categories"
							}]
						}
					}]
				}]

			}
		},
		$edit: {
			$copy: "$details"
		},
		$query: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$layout: {
								$items: [{
									$bind: "$resources",
									$layout: {
										$items: [{
											$bind: "code",
										}, {
											$bind: "title",
										}, {
											$bind: "description"
										}, {
											$bind: "linkType"
										}, {
											$bind: "entity"
										}, {
											$bind: "representation"
										}, {
											$bind: "fusionFunction"
										}, {
											$bind: "requestName"
										}, {
											$bind: "requestLevel"
										}, {
											$bind: "statName"
										}, {
											$bind: "processName"
										}, {
											$bind: "processMenu"
										}, {
											$bind: "processLeg"
										}, {
											$bind: "dashboard"
										}, {
											$bind: "module"
										}, {
											$bind: "application"
										}, {
											$bind: "endpoint"
										}, {
											$bind: "$factory"
										}, {
											$bind: "$factoryOwner"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$lookup: {
			$copy: "$query"
		},
		$select: {
			$copy: "$query"
		}
	}
};