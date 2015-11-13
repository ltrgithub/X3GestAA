"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "ediProcess",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$title: "{@ediProcessTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "idProcess"
						}]
					}
				}, {
					$title: "{@contextTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$title: "{@messageMappingTitle}",
							"$category": "section",
							$layout: {
								$items: [{
									$bind: "idMessageMapping"
								}, {
									$bind: "x3MessageMapping"
								}]
							}
						}, {
							$title: "{@sequentialFileTitle}",
							"$category": "section",
							$layout: {
								$items: [{
									$bind: "idSequentialFile"
								}, {
									$bind: "x3SequentialFile"
								}]
							}
						}, {
							$title: "{@protocolTitle}",
							"$category": "section",
							$layout: {
								$items: [{
									$bind: "idProtocol"
								}, {
									$bind: "x3Protocol"
								}]
							}
						}, {
							$title: "{@flowTitle}",
							"$category": "section",
							$layout: {
								$items: [{
									$bind: "idFlow"
								}, {
									$bind: "x3Flow"
								}]
							}
						}]
					}
				}, {
					$title: "{@expirationTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "expiration"
						}]
					}
				}, {
					$title: "{@statusTitle}",
					"$category": "section",
					$layout: {
						$items: [{
							$bind: "status"
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
											$bind: "idProcess"
										}, {
											$bind: "expiration"
										}, {
											$bind: "status"
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