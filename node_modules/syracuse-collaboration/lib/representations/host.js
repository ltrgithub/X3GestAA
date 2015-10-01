"use strict";
exports.representation = {
	$entityName: "host",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "hostname"
						}, {
							$bind: "connectionData"
						}, {
							$bind: "children"
						}, {
							$bind: "wsChildren"
						}, {
							$bind: "deactivated"
						}, {
							$bind: "started"
						}, {
							$bind: "status"
						}, {
							$bind: "version"
						}, {
							$bind: "tcpHostName"
						}, {
							$bind: "pid"
						}, {
							$bind: "respawnCount"
						}, {
							$bind: "returnRequestTimeout"
						}, {
							$bind: "missingCert"
						}, {
							$bind: "missingCA"
						}, {
							$bind: "untrusted"
						}, {
							$bind: "childInformation",
							$rows: 20
						}, {
							$bind: "security"
						}, {
							$bind: "respawnTime"
						}, {
							$bind: "patchStatus"
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
											$bind: "hostname"
										}, {
											$bind: "children"
										}, {
											$bind: "deactivated"
										}, {
											$bind: "started"
										}, {
											$bind: "status"
										}, {
											$bind: "security"
										}, {
											$bind: "version"
										}, {
											$bind: "tcpHostName"
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