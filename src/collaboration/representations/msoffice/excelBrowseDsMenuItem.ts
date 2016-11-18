"use strict";

exports.representation = {
	$entityName: "excelBrowseDatasource",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					$bind: "endpoint"
				}, {
					$bind: "menuItem"
				}, {
					$bind: "title"
				}, {
					$bind: "filter"
				}, {
					$bind: "forceQueryMode"
				}, {
					$bind: "fetchAll"
				}, {
					$bind: "fetchLimit"
				}, {
					$bind: "orderBys"
				}]
			}
		}
	}
};