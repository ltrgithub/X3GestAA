"use strict";
exports.representation = {
	$entityName: "userProfile",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "user"
						}, {
							$bind: "selectedRole"
						}, {
							$bind: "selectedEndpoint"
						}, {
							$bind: "selectedLocale"
						}]
					}
				}]
			}
		}
	}
};