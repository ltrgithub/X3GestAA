"use strict";

var zip = require("streamline-zip");
var ez = require('ez-streams');

exports.entity = {
	$titleTemplate: "Resources pack",
	$valueTemplate: "{code}",
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			$isUnique: true,
			$linksToDetails: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		}
	},
	$relations: {
		locales: {
			$title: "Locales",
			$type: "localePreferences"
		},
		items: {
			$title: "Items",
			$type: "resourcePackItems",
			$isChild: true
		}
	},
	$functions: {
		generatePack: function(_, context, options) {
			var self = this;
			var wbs = ez.devices.buffer.writer();
			var zp = new zip.Zip(wbs);
			self.items(_).toArray(_).forEach_(_, function(_, it) {
				if (!it.fileName(_)) return;
				var tg = it.target(_).toArray(_)[0];
				if (!tg || !tg.generateContent) return;
				options.path = it.fileName(_);
				if (self.locales(_).getLength()) options.locales = self.locales(_).toArray(_).map_(_, function(_, it) {
					return it.code(_);
				});
				var dd = JSON.stringify(tg.generateContent(_, options), null, 2);

				zp.add(_, {
					name: it.fileName(_),
					data: new Buffer(dd, "utf8")
				});
			});
			zp.finish(_);
			return wbs.toBuffer();
		}
	},
	$services: {
		downloadContent: {
			$title: "Download content",
			$method: "GET",
			$isMethod: true,
			$type: "application/x-export",
			$invocationMode: "async",
			$execute: function(_, context, instance) {
				var opt = {
					targetType: "download",
					beautify: true
				};
				var t = context.tracker;
				if (t) {
					t.$diagnoses = t.$diagnoses || [];
					opt.$diagnoses = t.$diagnoses;
					opt.tracker = t;
					t.replyLink = "$download";
				} else {
					opt.$diagnoses = instance.$diagnoses = instance.$diagnoses || [];
				}

				var pack = instance.generatePack(_, context, opt);

				if (t) {
					t.$links = t.$links || {};
					t.$links.$download = {
						$title: "Download",
						$url: t.location + "?reply=true",
						$method: "GET",
						$type: "application/zip",
						$filename: instance.code(_) + ".zip"
					};
				}
				return pack;
			}
		}
	},
	$exportProfile: {
		$key: "code",
		$properties: ["description"],
		$relations: {
			locales: {
				$key: "code"
			},
			items: {
				$key: "fileName",
				$relations: {
					target: {
						$variants: {
							genericExport: {
								$type: "exportProfile",
								$key: "code",
								$properties: ["description", "applicationName", "contractName", "endpointName"],
								$relations: {
									application: {
										$key: ["application", "contract"]
									},
									locales: {
										$key: "code",
									},
									endpoint: {
										$key: "dataset"
									},
									exportProfileItem: {
										$key: "className",
										$properties: ["className", "title", "contract", "application", "endpointName", "standardProfile", "filter", "exportAll"],
										$relations: {
											exportedObjects: {
												$key: ["key", "title"]
											},
											entityKeyAttribute: {
												$key: "name",
											},
											entityAttribute: {
												$key: "name"
											},
										}
									}
								}
							},
							persManagement: {
								$type: "personalizationManagement",
								$key: "code",
								$properties: ["description", "dashboardsExport", "dashboardFilter", "dashboardVignetteFilter", "dashboardInnerJoin", "pagesExport", "pageFilter", "pageVignetteFilter", "pageInnerJoin", "navPagesExport", "navPageFilter", "navPageModulesFilter", "navPageSubmodulesFilter", "navPageInnerJoin", "navPageCleanupScript", "navPageFactoryOwner", "homepagesExport", "homepageFilter", "menusExport", "menuFilter"],
								$relations: {
									locales: {
										$key: "code"
									}
								}
							}
						}
					}
				}
			}
		}
	}
};