"use strict";

exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "team",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@InformationsSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "description"
										}, {
											$bind: "isPublic"
										}]
									}
								}]
							}
						}, {
							$title: "{@AdministrationSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "administrator"
										}, {
											$bind: "authors"
										}, {
											$bind: "members"
										}]
									}
								}]
							}
						}, {
							$title: "{@ContentSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "documents"
										}, {
											$bind: "templateDocuments"
										}, {
											$bind: "excelTemplateDocuments"
										}]
									}
								}]
							}
						}, {
							$title: "{@TagsSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "tags",
											$isTitleHidden: true
										}]
									}
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@ExplorerSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "explorer",
											$isTitleHidden: true
										}]
									}
								}]
							}
						}]
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
											$bind: "description"
										}, {
											$bind: "isPublic"
										}, {
											$bind: "administrator"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$select: {
			$copy: "$query"
		},
		$lookup: {
			$copy: "$query"
		}
	}
};