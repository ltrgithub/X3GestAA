"use strict";

exports.representation = {
	$entityName: "menuBlock",
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