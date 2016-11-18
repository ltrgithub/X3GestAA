"use strict";

exports.representation = {
	$entityName: "excelBrowseDatasource",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					$bind: "endpoint"
				}, {
					$bind: "representationRef"
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