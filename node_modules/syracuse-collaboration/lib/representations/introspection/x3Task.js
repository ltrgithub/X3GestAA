"use strict";
exports.representation = {
	$entityName: "x3Task",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "endpoint"
						}, {
							$bind: "className"
						}, {
							$bind: "representation"
						}, {
							$bind: "actionName"
						}, {
							$bind: "parameters"
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
											$bind: "endpoint"
										}, {
											$bind: "className"
										}, {
											$bind: "representation"
										}, {
											$bind: "actionName"
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