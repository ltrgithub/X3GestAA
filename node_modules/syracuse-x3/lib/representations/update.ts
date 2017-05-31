"use strict";
exports.representation = {
	$entityName: "update",
	$facets: {
		$query: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$bind: "name"
						}, {
							$bind: "description"
						}, {
							$bind: "version"
						}, {
							$bind: "detailedStatus"
						}, {
							$bind: "applied"
						}, {
							$bind: "applicationDateTime"
						}]
					}
				}]
			}
		}
	}
};