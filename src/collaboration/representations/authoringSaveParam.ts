"use strict";
exports.representation = {
	$entityName: "authoringSaveParam",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$bind: "variantCode"
						}, {
							$bind: "variantTitle"
						}, {
							$bind: "variantDescription"
						}, {
							$bind: "saveAsOption"
						}, {
							$bind: "roles"
						}, {
							$bind: "users"
						}, {
							$bind: "endpoints"
						}]
					}
				}]
			}
		}
	}
};