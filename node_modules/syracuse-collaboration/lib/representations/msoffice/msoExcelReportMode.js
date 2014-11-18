"use strict";

exports.representation = {
	$entityName: "msoExcelReportMode",
	$facets: {
		$edit: {
			$prototype: {
				$links: {
					$query: {
						$isHidden: true
					},
					$delete: {
						$isHidden: true
					},
					$edit: {
						$isHidden: true
					},
					$print: {
						$isHidden: true
					},
					$excel: {
						$isHidden: true
					},
					$wordmailmerge: {
						$isHidden: true
					},
					$excelreport: {
						$isHidden: true
					},
				},
			},
			$layout: {
				$items: [{
					$bind: "excelReportMode"
				}, {
					$bind: "document"
				}, {
					$bind: "msoCurrentRepresentation"
				}, {
					$bind: "msoLocaleCode"
				}, {
					$bind: "cpy"
				}, {
					$bind: "leg"
				}, {
					$bind: "activ"
				}, {
					$bind: "endpoint"
				}]
			}
		}
	}
};