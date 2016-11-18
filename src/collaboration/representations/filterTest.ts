"use strict";

exports.representation = {
	$entityName: "filterTest",
	$facets: {
		$edit: {
			$layout: {
				$items: [{
					$bind: "endpoint"
				}, {
					$bind: "entity"
				}, {
					$bind: "filter"
				}, {
					$bind: "someDate"
				}, {
					$bind: "title"
				}, {
					$bind: "someDecimalValue"
				}]
			}
		},
		$details: {
			$layout: {
				$items: [{
					$bind: "endpoint"
				}, {
					$bind: "entity"
				}, {
					$bind: "filter"
				}, {
					$bind: "someDate"
				}, {
					$bind: "title"
				}, {
					$bind: "someDecimalValue"
				}]
			}
		}
	}
};