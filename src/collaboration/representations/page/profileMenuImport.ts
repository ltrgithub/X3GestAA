"use strict";

exports.representation = {
	$entityName: "profileMenuImport",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "endpoint"
						}, {
							$bind: "allLocales"
						}, {
							$bind: "locales"
						}, {
							$bind: "importMenu"
						}, {
							$bind: "profileCode"
						}, {
							$bind: "baseMenuName"
						}, {
							$bind: "pageName"
						}, {
							$bind: "importVignettes"
						}, {
							$bind: "setAsFactory"
						}, {
							$bind: "importMode"
						}]
					}
				}]
			}
		}
	}
};