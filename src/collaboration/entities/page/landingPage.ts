"use strict";

var globals = require('streamline-runtime').globals;
var sys = require("util");

exports.entity = {
	$titleTemplate: "Landing page",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Home-pages",
	$allowFactory: true,
	$factoryExcludes: ["title", "description", "useCurrentEndpoint"],
	$properties: {
		pageName: {
			$title: "Page name",
			$isMandatory: true,
			$pattern: "^[a-zA-Z0-9_]*$",
			$patternMessage: "Page name can only contain a to z, A to Z, 0 to 9 and _ caracters",
			$linksToDetails: true,
			$isUnique: true
		},
		pageId: {
			$title: "Page id",
			$compute: function(_, instance) {
				return instance.$uuid;
			},
			$isHidden: true
		},
		title: {
			$title: "Title",
			$isMandatory: true,
			$linksToDetails: true,
			$isLocalized: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		},
		useCurrentEndpoint: {
			$title: "Use current endpoint",
			$type: "boolean",
			$isNullable: true
		}
	},
	$relations: {
		vignettes: {
			$type: "landingPageVignettes",
			$title: "Vignettes",
			$isChild: true,
			$factoryRelationKey: "vignette"
		},
		roles: {
			$type: "roles",
			$title: "Roles",
			$inv: "landingPages",
			$isComputed: true,
			$propagate: function(_, instance) {
				// a landing page attached to a role shouldn't be attached to a user because he shouldn't be able to modify it anymore
				instance.owner(_, null);
			}
		},
		owner: {
			$type: "user",
			$title: "Owner",
			$inv: "landingPages"
		},
		stdLayout: {
			$type: "pageLayout",
			$title: "Standard layout",
			$isHidden: true,
			$compute: function(_, instance) {
				var plEnt = instance._db.getEntity(_, "pageLayoutProxy");
				return plEnt.getLayoutFromId(_, instance._db, "landingPage." + instance.$uuid);
			}
		}
	},
	$links: {
		admin: {
			"$title": "Edit page content",
			"$url": "?representation={pageName}.$landing_edit",
			"$method": "GET"
		},
		display: {
			"$title": "Preview",
			"$url": "?representation={pageName}.$landing",
			"$method": "GET"
		}
	},
	$functions: {
		$onDelete: function(_) {
			globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("landingPage");
		}
	},
	$events: {
		$beforeSave: [

			function(_, instance, params) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("landingPage");
				// add module to origin page
				if (params && params.originUser) {
					var user = instance._db.fetchInstance(_, instance._db.getEntity(_, "user"), params.originUser);
					if (user) {
						instance.owner(_, user);
					}
				}
			}
		]
	},
	$exportProfile: {
		$key: "pageName",
		$properties: ["title", "description", "useCurrentEndpoint"],
		$relations: {
			roles: {
				$key: "code"
			},
			vignettes: {
				$key: "bind",
				$properties: [],
				$relations: {
					vignette: {
						$key: "code",
						$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
							"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
							"dashboard", "target", "processName", "processMenu", "processLeg",
							"statName", "requestName", "requestLevel"
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
								$key: "code"
							},
							parameters: {
								$key: "name",
								$properties: ["name", "title", "prompt", "value"]
							}
						}
					},
					endpoint: {
						$key: "dataset"
					}
				}
			}
		},
		$related: {
			stdLayout: {
				$type: "pageLayout",
				$filter: "(page eq '{$uuid}') and (binding eq null)",
				$key: "code",
				$properties: ["code", "content"],
				$relations: {
					page: {
						$variants: {
							landingPage: {
								$key: "pageName"
							}
						}
					}
				}
			}
		}
	}
};