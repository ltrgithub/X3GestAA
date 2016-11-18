"use strict";

exports.representation = {
	$entityName: "landingPage",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "pageName"
						}, {
							$bind: "title"
						}, {
							$bind: "useCurrentEndpoint"
						}, {
							$bind: "$factory"
						}, {
							$bind: "$factoryOwner"
						}]
					}
				}]
			}
		}
	}
};