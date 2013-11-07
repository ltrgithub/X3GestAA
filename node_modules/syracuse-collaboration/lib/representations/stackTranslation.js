"use strict";
exports.representation = {
	$entityName: "stackTranslation",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "sha1"
						}, {
							$bind: "originalTrace",
							$rows: 10
						}, {
							$bind: "translatedTrace",
							$rows: 10
						}]
					}
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
											$bind: "sha1"
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