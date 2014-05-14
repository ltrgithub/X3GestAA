"use strict";
exports.representation = {
	$entityName: "caCertificate",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "name"
						}, {
							$bind: "description"
						}, {
							$bind: "internal"
						}, {
							$bind: "certificate"
						}, {
							$bind: "subjectDn"
						}, {
							$bind: "issuerDn"
						}, {
							$bind: "notBefore"
						}, {
							$bind: "notAfter"
						}]
					}
				}]
			}
		},
		$edit: {
			$copy: "$details"
		},
		$query: {
			$layout: {
				$items: [{
					$category: "section",
					$layout: {
						$items: [{
							$category: "section",
							$layout: {
								$items: [{
									$bind: "$resources",
									$layout: {
										$items: [{
											$bind: "name"
										}, {
											$bind: "description"
										}, {
											$bind: "internal"
										}, {
											$bind: "subjectDn"
										}, {
											$bind: "issuerDn"
										}, {
											$bind: "notBefore"
										}, {
											$bind: "notAfter"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		}
	}
};