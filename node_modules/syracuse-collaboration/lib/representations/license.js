"use strict";
exports.representation = {
	$entityName: "license",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "upload"
						}, {
							$bind: "content",
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
											$bind: "content"
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