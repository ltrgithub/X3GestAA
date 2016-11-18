"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "msoWordTemplateDocument",
	$facets: {
		$query: {
			$prototype: {
				$links: {
					$query: {
						$isHidden: true
					},
					$create: {
						$isHidden: true
					},
					$delete: {
						$isHidden: true
					},
					$excel: {
						$isHidden: true
					},
					$print: {
						$isHidden: true
					},
					$wordmailmerge: {
						$isHidden: true
					},
					$wordreport: {
						$isHidden: true
					}
				},
			},
			$layout: {
				$items: []
			}
		},
		$edit: {
			$prototype: {
				$links: {
					$query: {
						$isHidden: true
					},
					$print: {
						$isHidden: true
					},
					$wordreport: {
						$isHidden: true
					}
				},
				$actions: {
					$save: {
						$links: {
							$query: {
								$isHidden: true
							},
							$create: {
								$isHidden: true
							}
						}
					}
				}
			},
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@DocumentMainSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "code"
								}, {
									$bind: "description"
								}, {
									$bind: "isReadOnly"
								}, {
									$bind: "owner"
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@DocumentRelationsSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "templatePurpose"
								}, {
									$bind: "endpoint"
								}, {
									$bind: "cpy"
								}, {
									$bind: "leg"
								}, {
									$bind: "activ"
								}]
							}
						}]
					}]
				}, {
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@DocumentOrganizationSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "tags"
								}, {
									$bind: "teams"
								}]
							}
						}]
					}]
				}]
			}
		}
	}
};