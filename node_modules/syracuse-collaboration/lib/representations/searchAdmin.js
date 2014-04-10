"use strict";

exports.representation = {
	$entityName: "searchAdmin",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$layout: {
								$items: [{
									$bind: "endpoint"
								}, {
									$bind: "entities"
								}, {
									$bind: "locales"
								}, {
									$bind: "deleteBeforeUpdate"
								}, {
									$bind: "differentialUpdate"
								}, {
									$bind: "debugMode"
								}]
							}
						}]
					}
				}]
			}
		}
	}
};