"use strict";

exports.representation = {
	$entityName: "menuModule",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "code"
						}, {
							$bind: "title"
						}, {
							$bind: "application"
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