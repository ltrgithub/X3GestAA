"use strict";
exports.representation = {
	$entityName: "cvgSession",
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
											$bind: "remoteaddr"
										}, {
											$bind: "syralogin"
										}, {
											$bind: "x3host"
										}, {
											$bind: "x3port"
										}, {
											$bind: "x3solution"
										}, {
											$bind: "x3folder"
										}, {
											$bind: "x3user"
										}, {
											$bind: "x3lang"
										}, {
											$bind: "x3pid"
										}, {
											$bind: "lastAccess"
										}, {
											$bind: "timeout"
										}, {
											$bind: "reused"
										}, {
											$bind: "open"
										}, {
											$bind: "httpreferer"
										}, {
											$bind: "creationDate"
										}, {
											$bind: "sid"
										}, {
											$bind: "syraid"
										}, {
											$bind: "cid"
										}, {
											$bind: "protocolVersion"
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