"use strict";
exports.representation = {
	$entityName: "sessionInfo",
	$facets: {
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
											$bind: "sid"
										}, {
											$bind: "userName"
										}, {
											$bind: "lastAccess"
										}, {
											$bind: "serverName"
										}, {
											$bind: "dataset"
										}, {
											$bind: "badge"
										}, {
											$bind: "sessionType"
										}, {
											$bind: "clientId"
										}, {
											$bind: "lastUrl"
										}, {
											$bind: "x3Sessions"
										}, {
											$bind: "peerAddress"
										}, {
											$bind: "pid"
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