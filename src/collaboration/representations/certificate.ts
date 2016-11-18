"use strict";
exports.representation = {
	$entityName: "certificate",
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
							$bind: "keyExists"
						}, {
							$bind: "key"
						}, {
							$bind: "pass"
						}, {
							$bind: "subjectDn"
						}, {
							$bind: "issuerDn"
						}, {
							$bind: "notBefore"
						}, {
							$bind: "notAfter"
						}, {
							$bind: "caCertificates"
						}, {
							$bind: "server"
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
											$bind: "keyExists"
										}, {
											$bind: "subjectDn"
										}, {
											$bind: "issuerDn"
										}, {
											$bind: "notBefore"
										}, {
											$bind: "notAfter"
										}, {
											$bind: "caCertificates"
										}, {
											$bind: "server"
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