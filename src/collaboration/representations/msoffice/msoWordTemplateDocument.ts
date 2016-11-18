"use strict";
var httpHelpers = require('@sage/syracuse-core').http;
var locale = require('streamline-locale');
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "msoWordTemplateDocument",
	$facets: {
		$details: {
			$prototype: {
				$links: {
					$tpldownload: {
						"$title": locale.format(module, "exportAction"),
						"$url": "{$baseUrl}/msoWordTemplateDocuments('{$uuid}')/content?reportMode=tpl_download&doc_uuid={$uuid}&fileName={fileName}",
						"$type": httpHelpers.mediaTypes.word_report,
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
									$bind: "content"
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
								}, {
									$bind: "localeCode"
								}]
							}
						}]
					}]
				}, {
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@DocumentInfoSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$bind: "documentType"
								}, {
									$bind: "documentDate"
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
			}
		},
		$edit: {
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
									},
									/* { content modification not directly allowed
									$bind: "content"
								},*/
									{
										$bind: "owner"
									}
								]
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
								}, {
									$bind: "localeCode"
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
		},
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
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$bind: "$resources",
							$layout: {
								$items: [{
									$bind: "code"
								}, {
									$bind: "description"
								}, {
									$bind: "documentDate"
								}, {
									$bind: "templatePurpose"
								}, {
									$bind: "endpoint"
								}, {
									$bind: "cpy"
								}, {
									$bind: "leg"
								}, {
									$bind: "activ"
								}, {
									$bind: "templateType"
								}, {
									$bind: "templateClass"
								}, {
									$bind: "localeCode"
								}, {
									$bind: "documentType"
								}, {
									$bind: "isReadOnly"
								}, {
									$bind: "content"
								}, {
									$bind: "owner"
								}]
							}
						}]
					}
				}]
			}
		},
		$lookup: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$bind: "$resources",
							$layout: {
								$items: [{
									$bind: "code"
								}, {
									$bind: "description"
								}, {
									$bind: "localeCode"
								}, {
									$bind: "templatePurpose"
								}, {
									$bind: "cpy"
								}, {
									$bind: "leg"
								}, {
									$bind: "activ"
								}, {
									$bind: "endpoint"
								}, {
									$bind: "fileName"
								}, {
									$bind: "documentDate"
								}, {
									$bind: "owner"
								}]
							}
						}]
					}
				}]
			}
		}
	}
};