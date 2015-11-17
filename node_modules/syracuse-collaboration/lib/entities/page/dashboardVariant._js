"use strict";

var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;
var sys = require("util");

function _addDiag(diags, severity, message) {
	diags && diags.push({
		severity: severity,
		message: message
	});
}

exports.entity = {
	$allowFactory: true,
	$factoryExcludes: ["description", "roles", "users", "vignettes", "endpoints"],
	$properties: {
		code: {
			$title: "Code",
			$displayLength: 15
		},
		title: {
			$title: "Title",
			$isLocalized: true
		},
		description: {
			$title: "Description",
			$isLocalized: true
		},
		allApplications: {
			$title: "Applies to all applications",
			$type: "boolean",
			$isNullable: true,
			$propagate: function(_, instance, val) {
				if (val) instance.application(_, null);
			}
		}
	},
	$relations: {
		roles: {
			$title: "Applies to roles",
			$type: "roles",
		},
		users: {
			$title: "Applies to users",
			$type: "users",
		},
		vignettes: {
			$title: "Vignettes",
			$type: "dashboardVignettes",
			$capabilities: "sort,reorder,append,delete",
			isChild: true,
			$select: {
				$title: "Vignettes",
				$type: "portlet",
				$fieldMap: {
					portlet: "$uuid"
				},
				$lookupFilter: {
					$or: [{
						application: "{application}"
					}, {
						application: null
					}]
				}
			},
			$propagate: function(_, instance, val) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("dashboardPrototype");
			}
		},
		application: {
			$title: "Application",
			$type: "application",
			$isMandatory: function(_, instance) {
				return !instance.allApplications(_);
			},
			$isDefined: function(_, instance) {
				return !instance.allApplications(_);
			},
			$propagate: function(_, instance, val) {
				val && instance.vignettes(_).toArray(_).forEach_(_, function(_, pagePortlet) {
					if (pagePortlet.endpoint(_) && (pagePortlet.endpoint(_).applicationRef(_).$uuid !== val.$uuid)) instance.vignettes(_).deleteInstance(_, pagePortlet.$uuid);
				});
			},
			$displayLength: 15
		},
		endpoints: {
			$title: "Applies to endpoints",
			$type: "endPoints"
		},
		pageData: {
			$title: "Content",
			$type: "pageData",
			$cascadeDelete: true
		}
	},
	$functions: {
		_isGlobal: function(_) {
			return (this.roles(_).getLength() === 0) && (this.users(_).getLength() === 0) && (this.endpoints(_).getLength() === 0);
		},
		replaceVignette: function(_, oldVignette, newVignette) {

		},
		getPrototype: function(_, profile, options) {
			function addPortletEndpoint(_, portlet, endpoint, isMultiEP, pagePortlet, options) {
				var compl = pagePortlet.allEndpoints(_) ? "" : "-" + endpoint.dataset(_);
				options.vignetteComplement = compl;
				var p = portlet.getContent(_, endpoint, options);
				if (!p) return;
				if (p) {
					if (!pagePortlet.allEndpoints(_) && isMultiEP) {
						p.$title = p.$title + " - " + endpoint.description(_);
						p.$description = p.$description + " - " + endpoint.description(_);
					}
					p.$isTOC = pagePortlet.isTOC(_);
				}
				var portletId = portlet.code(_) || portlet.$uuid;
				var section = null;
				$[portletId + compl] = p;
				if (p && (p.$format === "$menu")) {
					// make $links at root level
					proto.$links = Object.keys(p.$links || {}).reduce(function(prev, lName) {
						var lks = (prev || {});
						if (lks[lName + compl]) {
							lks[lName + compl].$vignettes = lks[lName + compl].$vignettes || [];
							(p.$links[lName].$vignettes || []).forEach(function(v) {
								lks[lName + compl].$vignettes.push(v + compl);
							});
						} else lks[lName + compl] = p.$links[lName];
						return lks;
					}, proto.$links);
					// generate $article
					if (!p.$isTOC && opt.withArticle) {
						section = {
							"$category": "section",
							"$title": p && p.$title,
							"$layout": {
								"$items": [{
									"$category": "menus",
									"$vignette": portletId + compl,
									"$layout": {
										"$layoutType": "row",
										"$items": [{
											"$layoutType": "stack",
											"$items": []
										}, {
											"$layoutType": "stack",
											"$items": []
										}, {
											"$layoutType": "stack",
											"$items": []
										}]
									}
								}]
							}
						};
						// make binds
						var its = section.$layout.$items[0].$layout.$items;
						var binds = Object.keys((p && p.$links) || {}).map(function(lName) {
							return {
								$bind: lName + compl
							};
						});
						if (binds.length) {
							var cnt = Math.ceil(binds.length / 3);
							for (var i = 0; i < 2; i++)
								its[i].$items = binds.slice(i * cnt, (i + 1) * cnt);
							its[2].$items = binds.slice(2 * cnt);
						}
					}
					delete p.$links;
				} else {
					if (opt.withArticle) {
						// generate $article
						section = {
							"$category": "section",
							//"$title": p && p.$title,
							"$layout": {
								"$items": [{
									"$bind": portletId + compl
								}]
							}
						};
					}
				}
				//
				section && sections.push(section);
			}

			function isIgnored(_, portlet) {
				ignoredCount++;
				return false;
			}
			//
			var ignoredCount = 0;
			var opt = options || {};
			opt.itemIgnoredCount = 0;
			var pageData = this;
			//			var endpoint = opt.selectedEndpoint || (profile && profile.selectedEndpoint(_));
			var endpoint = opt.selectedEndpoint;
			var admEP = adminHelper.getCollaborationEndpoint(_);
			var portlets = pageData.vignettes(_).toArray(_);
			var proto = {
				$title: pageData.title(_) || pageData._parent.title(_),
				$description: pageData.description(_) || pageData._parent.description(_),
				$properties: {}
			};
			var sections = [];
			var $ = proto.$properties;
			portlets.filter_(_, function(_, pagePortlet) {
				// DEBUG
				if (!pagePortlet.portlet || (typeof pagePortlet.portlet !== "function")) {
					console.error("FATAL (186) INST:" + sys.inspect(pagePortlet));
					console.error("FATAL (187) PROTO:" + sys.inspect(Object.getPrototypeOf(pagePortlet), null, 4));
					console.error("FATAL (188) META:" + sys.inspect(pagePortlet._meta, null, 4));
					console.error("FATAL (190) RELMETA:" + sys.inspect(pageData.vignettes(_)._relMeta));
					console.error("FATAL (192) TARGETENTITY:" + sys.inspect(pageData.vignettes(_)._relMeta.targetEntity));
					console.error("FATAL (194) FACTORY META:" + sys.inspect(pageData.vignettes(_)._relMeta.targetEntity.factory._meta));
				}
				// DEBUG
				var portlet = pagePortlet.portlet(_);
				if (!portlet) return false;
				var crtEndpoint = (pagePortlet.allEndpoints(_) ? null : pagePortlet.endpoint(_));
				//
				var isCollPortlet = portlet.application(_) && (portlet.application(_).$uuid === admEP.applicationRef(_).$uuid);
				if (isCollPortlet && profile && profile.endpoints(_).get(_, admEP.$uuid)) return true;
				//
				if (endpoint) {
					if (pagePortlet.allEndpoints(_) && portlet.application(_) && (endpoint.applicationRef(_).$uuid !== portlet.application(_).$uuid)) return false || isIgnored(_, portlet);
					if (crtEndpoint && (endpoint.$uuid !== crtEndpoint.$uuid)) return false || isIgnored(_, portlet);
				} else {
					// all endpoints portlet is displayed only if selected endpoint
					if (pagePortlet.allEndpoints(_)) return false || isIgnored(_, portlet);
					//
					if (crtEndpoint && profile && !profile.endpoints(_).get(_, crtEndpoint.$uuid)) return false || isIgnored(_, portlet);
				}
				return true;
			}).forEach_(_, function(_, pagePortlet) {
				var portlet = pagePortlet.portlet(_);
				var crtEndpoint = (pagePortlet.allEndpoints(_) ? null : pagePortlet.endpoint(_));
				//
				var isCollPortlet = portlet.application(_) && (portlet.application(_).$uuid === admEP.applicationRef(_).$uuid);
				if (isCollPortlet) addPortletEndpoint(_, portlet, admEP, true, pagePortlet, opt);
				else {
					if (pagePortlet.allEndpoints(_)) {
						endpoint && addPortletEndpoint(_, portlet, endpoint, false, pagePortlet, opt);
					} else crtEndpoint && addPortletEndpoint(_, portlet, crtEndpoint, true, pagePortlet, opt);
				}
			});
			//
			if (opt.withArticle) {
				proto.$article = {
					"$category": "dashboard",
					"$title": proto.$title,
					"$layout": {
						"$layoutType": "row",
						"$items": [{
							"$layoutType": "stack",
							"$items": []
						}, {
							"$layoutType": "stack",
							"$items": []
						}]
					}
				};
				var its = proto.$article.$layout.$items;
				if (sections.length) {
					var cnt = Math.ceil(sections.length / 2);
					its[0].$items = sections.slice(0, cnt);
					its[1].$items = sections.slice(cnt);
				}
				if (!endpoint) {
					ignoredCount && opt.$diagnoses && _addDiag(opt.$diagnoses, "warning", locale.format(module, "portletsIgnored", ignoredCount));
					opt.itemIgnoredCount && opt.$diagnoses && _addDiag(opt.$diagnoses, "warning", locale.format(module, "entriesIgnored", opt.itemIgnoredCount++));
				}
			}
			//
			return proto;
		}
	}
};