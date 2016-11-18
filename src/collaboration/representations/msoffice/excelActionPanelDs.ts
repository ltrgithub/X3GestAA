"use strict";

exports.representation = {
	$entityName: "excelDatasource",
	$details: {
		$prototype: {
			$links: {
				$edit: {
					$isHidden: true
				}
			}
		},
		$layout: {
			$items: [{
				$bind: "title"
			}, {
				$bind: "entity"
			}, {
				$bind: "filter",
			}, {
				"$bind": "fetchAll"
			}, {
				"$bind": "fetchLimit"
			}]
		}
	},
	$edit: {
		$layout: {
			$items: [{
				$bind: "description",
				$isEditMode: false,
				$isTopAlignement: true
			}, {
				$bind: "title"
			}, {
				$bind: "filter"
			}, {
				$bind: "fetchAll"
			}, {
				$bind: "fetchLimit"
			}, {
				$bind: "orderBys"
			}]
		}
	}
};