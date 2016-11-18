"use strict";

exports.representation = {
	$entityName: "msoMailMergeDocSel",
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
					$wordreport: {
						$isHidden: true
					},
				},
			},
			$layout: {
				$items: [{
					$bind: "creationMode"
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