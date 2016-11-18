"use strict";
exports.representation = {
	resources: function() {
		var locale = require('streamline-locale');
		var globals = require('streamline-runtime').globals;
		return locale.resources(module, globals.context && globals.context.sessionLocale)();
	},
	$entityName: "user",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$layoutType: "row",
					$items: [{
						$items: [{
							$title: "{@LoginSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "login"
										}, {
											$bind: "active",
										}, {
											$bind: "authentication",
										}, {
											$bind: "oldPassword"
										}, {
											$bind: "password"
										}, {
											$bind: "changePassword"
										}, {
											$bind: "authenticationName"
										}, {
											$bind: "ldap"
										}, {
											$bind: "oauth2"
										}, {
											$bind: "saml2"
										}, {
											$bind: "oldSignature"
										}, {
											$bind: "signature"
										}, {
											$bind: "$factory"
										}, {
											$bind: "$factoryOwner"
										}, {
											$bind: "sync_ldap"
										}]
									}
								}]
							}
						}, {
							$title: "{@InformationsSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "title"
										}, {
											$bind: "firstName"
										}, {
											$bind: "lastName"
										}, {
											$bind: "email"
										}, {
											$bind: "ctiId"
										}, {
											$bind: "photo"
										}]
									}
								}]
							}
						}]
					}, {
						$items: [{
							$title: "{@ExplorerSectionTitle}",
							$category: "section",
							$layout: {
								$items: [{
									$category: "section",
									$layout: {
										$items: [{
											$bind: "explorer",
											$isTitleHidden: true
										}]
									}
								}]
							}
						}]
					}]
				}, {
					$layoutType: "stack",
					$items: [{
						$title: "{@AdministrationSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$category: "section",
								$layout: {
									$layoutType: "row",
									$items: [{
										$items: [{
											$bind: "groups"
										}, {
											$bind: "endpoints"
										}, {
											$bind: "userOAuth2s"
										}, {
											$bind: "boProfiles"
										}, {
											$bind: "infov6"
										}, {
											$bind: "userv6"
										}, {
											$bind: "passwordv6"
										}]
									}, {
										$items: [{
											$bind: "adminTeams"
										}, {
											$bind: "authorTeams"
										}, {
											$bind: "memberTeams"
										}]
									}]
								}
							}]
						}
					}, {
						$title: "{@LocalesSectionTitle}",
						$category: "section",
						$layout: {
							$items: [{
								$category: "section",
								$layout: {
									$items: [{
										$bind: "locales",
										$isTitleHidden: true,
										$format: "cards",
										$layout: {
											$items: [{
												$category: "section",
												$layout: {
													$layoutType: "row",
													$items: [{
														"$layoutType": "stack",
														$items: [{
															$bind: "code"
														}, {
															$bind: "description"
														}, {
															$bind: "enabled"
														}, {
															$bind: "shortDate"
														}, {
															$bind: "shortTime"
														}, {
															$bind: "shortDatetime"
														}]
													}, {
														"$layoutType": "stack",
														$items: [{
															$bind: "longDate"
														}, {
															$bind: "longTime"
														}, {
															$bind: "longDatetime"
														}, {
															$bind: "firstDayOfWeek"
														}, {
															$bind: "firstWeekOfYear"
														}]
													}, {
														"$layoutType": "stack",
														$items: [{
															$bind: "numberDecimalSeparator"
														}, {
															$bind: "numberGroupSeparator"
														}, {
															$bind: "numberGroupSize"
														}]
													}]
												}
											}]
										}
									}]
								}
							}]
						}
					}]

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
											$bind: "photo"
										}, {
											$bind: "login"
										}, {
											$bind: "title"
										}, {
											$bind: "firstName"
										}, {
											$bind: "lastName"
										}, {
											$bind: "email"
										}, {
											$bind: "active"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$lookup: {
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
											$bind: "photo"
										}, {
											$bind: "login"
										}, {
											$bind: "lastName"
										}, {
											$bind: "firstName"
										}, {
											$bind: "active"
										}, {
											$bind: "email"
										}]
									}
								}]
							}
						}]
					}
				}]
			}
		},
		$select: {
			$copy: "$lookup"
		}
	}
};