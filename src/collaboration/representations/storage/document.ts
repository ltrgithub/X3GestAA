"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "document",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@DocumentMainSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "description"
								}, {
									$bind: "isReadOnly"
								}, {
									$bind: "volume"
								}, {
									$bind: "content"
								}, {
									$bind: "owner"
								}]
							}
						}, {
							$title: "{@DocumentInfoSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "documentType"
								}, {
									$bind: "documentDate"
								}, {
									$bind: "fileName"
								}]
							}
						}]
					}, {
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
			},
			$garbageFields: ["className", "x3Keys", "representationName", "endpoint"]
		},
		$edit: {
			$layout: {
				$copy: "$details"
			},
			$garbageFields: {
				$copy: "$details"
			}
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
											$bind: "description"
										}, {
											$bind: "documentType"
										}, {
											$bind: "documentDate"
										}, {
											$bind: "fileName"
										}, {
											$bind: "isReadOnly"
										}, {
											$bind: "content"
										}, {
											$bind: "volume"
										}, {
											$bind: "owner"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		}
	}
};