"use strict";
exports.representation = {
	$entityName: "document",
	$facets: {
		$details: {
			$prototype: {
				$links: {
					$query: {
						$isHidden: true
					},
					$delete: {
						$isHidden: true
					}
				},
				$actions: {
					$saveDocument: {
						$title: "{@SaveActionTitle}"
					}
				}
			},
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$bind: "description"
						}, {
							$bind: "documentDate"
						}]
					}, {
						$items: [{
							$bind: "owner"
						}, {
							$bind: "isReadOnly"
						}]
					}]
				}, {
					$layoutType: "stack",
					$items: [{
						$bind: "teams"
					}, {
						$bind: "tags"
					}]
				}]
			}
		},
		$edit: {
			$prototype: {
				$links: {
					$query: {
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
				$copy: "$details"
			}
		},
		$query: {
			$prototype: {
				$links: {
					$create: {
						$title: "{@PublishActionTitle}"
					},
					$print: {
						$isHidden: true
					},
					$excel: {
						$isHidden: true
					}
				}
			},
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$bind: "$resources",
							//                            $format: "excelDocumentCardList",
							$format: "cards",
							$layout: {
								$items: [{
									"$category": "section",
									"$expression": "{@ResourceExpression}"
								}]
							}
						}]
					}
				}]
			}
		}
	}
};