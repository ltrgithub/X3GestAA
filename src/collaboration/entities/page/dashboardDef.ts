"use strict";

var PageHelper = require("./pageHelpers").PageHelper;
var sys = require("util");

var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var userScore = 100000;
var roleScore = 10000;
var unaffUserScore = 1000;
var unaffRoleScore = 1000;
var endpointScore = 100;
var unaffEPScore = 10;
var applicationScore = 1;

exports.entity = {
	$titleTemplate: "Dashboard",
	$descriptionTemplate: "Dashboard definition",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Dashboards",
	$properties: {
		title: {
			$title: "Title",
			$linksToDetails: true,
			$isLocalized: true,
			$isMandatory: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		},
		dashboardName: {
			$title: "Dashboard name",
			$isMandatory: true,
			$isUnique: true,
			$propagate: function(_, instance, val) {
				// modify related menu items
				if (!val) return;
				var old = instance.$snapshot && instance.$snapshot.dashboardName(_);
				if (!old || (old === val)) return;
				var items = instance._db.fetchInstances(_, instance._db.getEntity(_, "menuItem"), {
					jsonWhere: {
						linkType: "$dashboard",
						dashboard: old
					}
				});
				items.forEach_(_, function(_, i) {
					i.dashboard(_, val);
					instance.addRelatedInstance(i);
				});
			},
			$control: function(_, instance) {
				if (instance.dashboardName(_).indexOf(".") >= 0) instance.$addError(locale.format(module, "invalidCaracter", "."), "dashboardName");
			}
		},
		mobile: {
			$title: "Mobile dashboard",
			$type: "boolean",
			$default: false,
			$isNullable: true
		}
	},
	$services: {
		mobilePortlets: {
			$isHidden: true,
			$method: "GET",
			$isMethod: false,
			$title: "Mobile Applications",
			$overridesReply: true,
			$execute: function(_, context, instance) {
				var res = {
					$resources: []
				};
				var dashboards = context.db.fetchInstances(_, context.model.getEntity(_, "dashboardDef"), {
					jsonWhere: {
						mobile: true
					},
					orderBy: [{
						binding: "title",
						descending: false
					}]

				});
				var up = null,
					uendpoints = [];
				if (globals.context && globals.context.session) up = globals.context.session.getUserProfile(_);
				if (up) {
					var eps = up.endpoints(_).toArray(_);
					eps.forEach_(_, function(_, endpoint) {
						uendpoints.push(endpoint.dataset(_));
					});
				}
				if (uendpoints.length) {
					// a dashboard "mobile" has only one application
					dashboards.forEach_(_, function(_, dashboard) {
						var variants = dashboard.variants(_).toArray(_);
						var application = null;
						variants.forEach_(_, function(_, variant) {
							// portlets for all applications are ignored
							if (!variant.allApplications(_)) {
								var ca = variant.application(_);
								var appName = "",
									appDesc = "",
									contract = "",
									datasets = [];
								if (!application) {
									application = ca;
									if (application) {
										appName = application.application(_);
										appDesc = application.description(_);
										contract = application.contract(_);
										// get endpoints for application

										/* If the variant is asigned to specific endpoints, use only the ones asigned and not all 
										 * If there is an endpoint asignment, try to use all endpoints available to the user
										 */
										var endpoints = variant.endpoints(_).toArray(_);
										if (!endpoints || endpoints.length < 1) {
											endpoints = application.endpoints(_).toArray(_);
										}

										endpoints.forEach_(_, function(_, endpoint) {
											var ep = {};
											ep.dataset = endpoint.dataset(_);
											if (uendpoints.indexOf(ep.dataset) >= 0) {
												ep.description = endpoint.description(_);
												datasets.push(ep);
											}
										});

									}
								}
								console.log(dashboard.title(_));
								console.log(datasets);
								if (ca && application && datasets.length && (appName === ca.application(_))) {
									var vignettes = variant.vignettes(_).toArray(_);
									vignettes.forEach_(_, function(_, vignette) {
										var portlet = vignette.portlet(_);
										if (portlet && (portlet.type(_) === "$menu")) {
											var mobApp = {};
											var epV = null; // FDB - Darina Todo - Set with vignette's endpoint -
											epV = vignette.endpoint(_);
											var epP = null; // FDB - Darina Todo - Set with portlet's endpoint -
											epP = portlet.endpoint(_);

											mobApp.endpoints = epV ? [{
												dataset: epV.dataset(_),
												description: epV.description(_)
											}] : epP ? [{
												dataset: epP.dataset(_),
												description: epP.description(_)
											}] : datasets;

											mobApp.icon = portlet.code(_);
											mobApp.title = portlet.title(_);
											mobApp.contract = contract;
											mobApp.description = portlet.description(_);
											mobApp.applicationName = appName;
											mobApp.applicationDescription = appDesc;
											mobApp.installUrl = portlet.getUrl(_) + "/$service/representation";
											res.$resources.push(mobApp);
										}
									});
								}
							}
						});
					});
				} else {
					res.$diagnoses = [{
						"$message": locale.format(module, "noEndpointForUser"),
						"$severity": "warning"
					}];

				}
				if (!res.$resources.length && !res.$diagnoses) {
					res.$diagnoses = [{
						"$message": locale.format(module, "noMobileApplicationToInstall"),
						"$severity": "warning"
					}];
				}
				context.reply(_, 200, res);
			}
		}
	},
	$relations: {
		variants: {
			$type: "dashboardVariants",
			$title: "Variants",
			$capabilities: "sort,reorder,append,delete",
			$isChild: true
		}
	},
	$functions: {
		selectAllVariants: function(_, preferedVariantId, options) {
			if (!options) return null;
			//
			var self = this;
			//
			var userId = options.userId;
			var roleId = options.roleId;
			var epId = options.endpointId;
			var appId = options.applicationId;
			//
			var variants = self.variants(_).toArray(_);
			var scores = [];
			variants.forEach_(_, function(_, v) {
				// DEBUG
				if (!v.application || (typeof v.application !== "function")) {
					console.error("FATAL (170) INST:" + sys.inspect(v._data, null, 4));
					console.error("FATAL (171) PROTO:" + sys.inspect(Object.getPrototypeOf(v), null, 4));
					console.error("FATAL (172) META:" + sys.inspect(v._meta, null, 4));
					console.error("FATAL (173) RELMETA FROM DASH:" + sys.inspect(self._meta.$relations["variants"], null, 4));
					console.error("FATAL (174) VARIANT FACTORY META: " + v._meta.factory._meta.name);
				}
				// DEBUG
				var score = 0;
				// application:
				//   if no endpoint selected, best score if "allApplications", no bonus otherwise
				//   if an endpoint is selected best score if application fits, second best if "allApplications", ignore if different
				if (appId) {
					if (v.application(_)) {
						if (v.application(_).$uuid === appId) score += 2 * applicationScore;
						else return;
					} else score += applicationScore;
				} else if (v.allApplications(_)) score += applicationScore;
				//
				if (v.users(_).isEmpty()) score += unaffUserScore;
				else {
					if (v.users(_).get(_, userId)) score += userScore;
					else return;
				}
				//
				if (v.roles(_).isEmpty()) score += unaffRoleScore;
				else {
					if (roleId && v.roles(_).get(_, roleId)) score += roleScore;
					else return;
				}
				//
				if (v.endpoints(_).isEmpty()) score += unaffEPScore;
				else {
					if (epId && v.endpoints(_).get(_, epId)) score += endpointScore;
					else return;
				}
				//
				scores.push({
					$uuid: v.$uuid,
					score: score,
					variant: v
				});
			});
			//
			return scores.sort(function(a, b) {
				if (a.$uuid === preferedVariantId) return -1;
				if (b.$uuid === preferedVariantId) return 1;
				return b.score - a.score;
			}).map_(_, function(_, e) {
				return e.variant;
			});
		},
		selectVariant: function(_, userProfile, application) {
			return PageHelper.prototype.selectVariant.call(this, _, userProfile, application);
		},
		hasFactoryVariant: function(_) {
			return PageHelper.prototype.hasFactoryVariant.call(this, _);
		}
	},
	$exportProfile: {
		$key: "dashboardName",
		$properties: ["title", "description", "dashboardName", "mobile"],
		$relations: {
			variants: {
				$key: "code",
				$properties: ["code", "title", "description", "allApplications"],
				$relations: {
					application: {
						$key: ["application", "contract"]
					},
					vignettes: {
						$key: ["portlet", "endpoint"],
						$properties: ["allEndpoints", "isTOC"],
						$relations: {
							portlet: {
								$key: "code",
								$properties: ["code", "title", "description", "type"],
								$relations: {
									application: {
										$key: ["application", "contract"]
									},
									endpoint: {
										$key: "dataset"
									},
									items: {
										$key: "code",
										$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
											"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
											"dashboard", "target"
										],
										$relations: {
											application: {
												$key: ["application", "contract"]
											},
											endpoint: {
												$key: "dataset"
											},
											representationRef: {
												$properties: ["entity", "representation"]
											},
											module: {
												$key: "code",
												$properties: ["code", "title"],
												$relations: {
													application: {
														$key: ["application", "contract"]
													}
												}
											}
										}
									},
									pageItem: {
										$key: "code",
										$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
											"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
											"dashboard", "target"
										],
										$relations: {
											application: {
												$key: ["application", "contract"]
											},
											endpoint: {
												$key: "dataset"
											},
											representationRef: {
												$properties: ["entity", "representation"]
											},
											module: {
												$key: "code",
												$properties: ["code", "title"],
												$relations: {
													application: {
														$key: ["application", "contract"]
													}
												}
											}
										}
									}
								}
							},
							endpoint: {
								$key: "dataset"
							}
						}
					},
					roles: {
						$key: "code"
					},
					users: {
						$key: "login"
					},
					/*					endpoints: {
						$key: "dataset"
					},*/
					pageData: {
						$key: "code",
						$properties: ["code", "content", "localization"]
					}
				}
			}
		}
	},
	$searchIndex: {
		$fields: ["title", "description", "dashboardName"]
	}
};