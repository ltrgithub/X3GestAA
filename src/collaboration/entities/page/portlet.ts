"use strict";

var locale = require('streamline-locale');
var helpers = require('@sage/syracuse-core').helpers;
var forEachKey = helpers.object.forEachKey;
var globals = require('streamline-runtime').globals;

var _contentSolverMap = {
	$menu: function(_, portlet, endpoint, options) {
		var links = {};
		var hasLinks = false;
		var items = portlet.items(_).toArray(_);
		items.forEach_(_, function(_, item) {
			if (item.application(_) && (endpoint.applicationRef(_).$uuid !== item.application(_).$uuid)) {
				if (options && (options.itemIgnoredCount != null)) options.itemIgnoredCount++;
				return;
			}
			//
			var itemKey = item.code(_) || item.$uuid;
			var link = links[itemKey] = item.getLink(_, endpoint);
			var compl = (options && options.vignetteComplement) || "";
			link.$vignettes = [(portlet.code(_) || portlet.$uuid) + compl];
			hasLinks = true;
		});
		//
		return hasLinks ? {
			$format: "$menu",
			$links: links,
			//$article: portlet.article(_)
		} : null;
	},
	$page: function(_, portlet, endpoint) {
		if (endpoint && portlet.pageItem(_)) {
			return {
				$location: portlet.pageItem(_).getLink(_, endpoint)
			};
		}
		return null;
	}
};

// #3605 add $details link in details facets for x-reference fields in addition to $lookup for edit/create facets
function _addxRefRepresentations(ci, proto, list, added, from, facet) {
	ci = ci.$item || ci;
	if (ci == null || ci.$links == null) return;
	var rep = "representation=";
	var linkid;
	if (facet == "$details") {
		linkid = ci.$links.$details ? "$details" : "$summary";
	} else {
		linkid = "$lookup";
	}
	var link = ci.$links[linkid];
	if (link) {
		var ir = link.$url.indexOf(rep);
		if (ir >= 0) {
			var representation = link.$url.substring(ir + rep.length);
			ir = representation.indexOf("&");
			if (ir > 0) representation = representation.substring(0, ir);
			representation = representation && representation.replace(/\{(.*?)\}/g, function(match, prop) {
				var value = proto[prop];
				return value || "";
			});
			if (!_listFind(list, representation) && !_listFind(added, representation)) {
				_listAdd(list, representation, from + "." + linkid + "." + link.$title);
			}
		}
	}
}

function _checkExternalLinks(props) {
	forEachKey(props, function(propName, propValue) {
		if (propValue.$links) {
			forEachKey(propValue.$links, function(linkName, linkValue) {
				if (linkValue && linkValue.$url && linkValue.$url.indexOf("http") === 0) {
					props[propName].$externalLinks = props[propName].$externalLinks || {};
					props[propName].$externalLinks[linkName] = linkValue;
				}
			});
		}
		if (propValue.$type === 'application/x-reference' && propValue.$item && propValue.$item.$links) {
			forEachKey(propValue.$item.$links, function(linkName, linkValue) {
				if (linkValue && linkValue.$url && linkValue.$url.indexOf("http") === 0) {
					props[propName].$externalLinks = props[propName].$externalLinks || {};
					props[propName].$externalLinks[linkName] = linkValue;
				}
			});
		}
		if (propValue.$item && propValue.$item.$properties) {
			_checkExternalLinks(propValue.$item.$properties);
		}
	});
}

function _listAdd(l, rep, from) {
	l.push({
		rep: rep,
		from: from
	});
}

function _listFind(lst, rep) {
	for (var i = 0, l = lst.length; i < l; i++) {
		if (rep == lst[i].rep) return true;
	}
	return false;
}
// add links and lookups
function _scanPageForRepresentations(facet, proto, list, added, badLinks, from) {
	//#3568 - We scan lookup representations because there could be $links.$lookup in these representations - if (facet === "$lookup") return;
	var prototypes = [];
	if (!proto || (typeof proto != "object") || !proto.$properties) return;
	prototypes.push({
		proto: proto
	});
	if (proto.$properties.$resources) prototypes.push({
		proto: proto.$properties.$resources.$item
	});
	var rep = "representation=";
	prototypes.forEach(function(protodata) {
		//add links 
		var proto = protodata.proto;
		if (proto.$links) {
			forEachKey(proto.$links, function(linkName, link) {
				var url = link.$url;
				if (link.$isHidden) return;
				var ir = url.indexOf(rep);
				if (url.indexOf("{$baseUrl}") != 0 || ir < 0) {
					var msg = null;
					if (url.indexOf("/trans/") == 0) {
						msg = from + ".$links." + linkName + " :  unexpected convergence url\n[" + url + "]";
					}
					if (msg && badLinks.indexOf(msg) < 0) badLinks.push(msg);
				} else {
					var representation = url.substring(ir + rep.length);
					ir = representation.indexOf("&");
					if (ir > 0) representation = representation.substring(0, ir);
					representation = representation && representation.replace(/\{(.*?)\}/g, function(match, prop) {
						var value = proto[prop];
						return value || "";
					});
					if (!_listFind(list, representation) && !_listFind(added, representation)) _listAdd(list, representation, from + ".$links." + linkName);
				}
			});
		}
	});
	if (facet === "$details") {
		if (proto.$properties) {
			_checkExternalLinks(proto.$properties);
		}
	}
	// #3568 - We seek for lookup in queries and lookups - Use by filters dialog
	if ((facet === "$details") || (facet === "$query") || (facet === "$lookup") || (facet === "$edit") || (facet === "$create")) {
		//scan for lookups
		var cl = [{
			proto: proto
		}];
		while (cl.length) {
			var cp = cl.shift();
			forEachKey(cp.proto.$properties, function(propName, propValue) {
				var ci;
				switch (propValue.$type) {
					case "application/x-array":
						if (propValue.$item.$type === "application/x-reference") {
							ci = propValue.$item;
							_addxRefRepresentations(ci, propValue.$item, list, added, from + ".$properties.x-array." + propName, facet);
						} else cl.push({
							proto: propValue.$item
						});
						break;
					case "application/x-reference":
						ci = propValue;
						_addxRefRepresentations(ci, cp.proto, list, added, from + ".$properties.x-ref." + propName, facet);
						break;
					case "applcation/x-object":
						break;
					case "application/json":
						break;
					default:
						break;
				}
			});
		}
	}
};

exports.entity = {
	$titleTemplate: "Vignette",
	$descriptionTemplate: "{description}",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Vignettes",
	$listTitle: "List of vignettes",
	$properties: {
		code: {
			$title: "Code"
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
		type: {
			$title: "Type",
			$enum: [{
				$value: "$menu",
				$title: "Menu"
			}, {
				$value: "$page",
				$title: "Page"
			}, ],
			$isMandatory: true,
			$default: "$menu"
		},
		linkType: {
			$title: "Link type",
			$isHidden: true
		}
	},
	$relations: {
		application: {
			$title: "Application",
			$type: "application",
			$inv: "portlets"
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$lookupFilter: {
				applicationRef: "{application}"
			}
		},
		items: {
			$title: "Items",
			$type: "menuItems",
			//$inv: "menus",
			$nullOnDelete: true,
			$capabilities: "append,delete,insert,filter,reorder",
			$lookupFilter: {
				application: "{application}",
				endpoint: "{endpoint}"
			},
			$isDefined: function(_, instance) {
				return (instance.type(_) === "$menu");
			},
			$propagate: function(_, instance, val) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("dashboardPrototype");
			}
		},
		pageItem: {
			$title: "Page content",
			$type: "menuItem",
			$lookupFilter: {
				application: "{application}",
				endpoint: "{endpoint}"
			},
			$isDefined: function(_, instance) {
				return (instance.type(_) === "$page");
			},
			$propagate: function(_, instance, val) {
				instance.linkType(_, val && val.linkType(_));
				instance.application(_, val && val.application(_));
				instance.endpoint(_, val && val.endpoint(_));
				instance.module(_, val && val.module(_));
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("dashboardPrototype");
			}
		},
		categories: {
			$title: "Categories",
			$type: "menuCategories"
		},
		module: {
			$title: "Module",
			$type: "menuModule",
			$lookupFilter: {
				application: "{application}"
			}
		}
	},
	$services: {
		representation: {
			// get mobile application structure (list of representations used by this portlet)
			$method: "POST",
			$isHidden: true,
			$isMethod: true,
			$title: "Mobile Application Structure",
			$overridesReply: true,
			$execute: function(_, context, instance) {
				var params = JSON.parse(context.request.readAll(_)),
					res, key;
				var _sendError = function(_, status, msg, stack, diagnoses) {
					var stackTrace = ["Application: " + params.applicationName.toUpperCase() + " - Contract: " + params.contractName.toUpperCase() + " - Endpoint: " + params.endpointName.toUpperCase()];
					stackTrace.push(locale.format(module, "checkRep"));
					if (stack) {
						stackTrace.push("");
						stackTrace = stackTrace.concat(stack);
					}
					var diags = [{
						"$severity": "error",
						"$message": msg,
						"$stackTrace": stackTrace.join('\n')
					}];
					if (diagnoses) diags.push.apply(diags, diagnoses);
					context.reply(_, status, {
						"$diagnoses": diags
					});
				};
				if (!instance) {
					_sendError(_, 400, locale.format(module, "noInstance"));
					return;
				}
				key = instance.computeKey();
				res = {
					home: instance.computeKey(), // home dashboard 
					entities: {}, // list of entities used by this application
					representations: [], // list of representations used by this application
					pages: {}, // pages used by this mobile application
					dashboards: {}, // dashboards used by this mobile application
					footer: [], // footer items
					title: instance.title(_),
					code: instance.code(_),
					icon: instance.code(_),
					description: instance.description(_)
				};
				// add default page home 
				res.dashboards[key] = [];
				instance.getMobileStruct(_, context, params, res);
				var pageEntity = context.model.getEntity(_, "page");
				var list = res.representations;
				delete res.representations;
				res.pages = {};
				var diagnoses = res.$diagnoses;
				if (!diagnoses) diagnoses = res.$diagnoses = [];
				var badLinks = [];
				while (list.length) {
					var cl = [];
					list.forEach_(_, function(_, repInfo) {
						var representation = repInfo.rep,
							from = repInfo.from;
						if (!res.pages[representation]) {
							var rep = representation.split(".");
							var opts = {
								application: params.applicationName,
								contract: params.contractName,
								endpoint: params.endpointName,
								representation: rep[0],
								facet: (rep[1] !== "$create" ? rep[1] : "$edit"), // there is no $create facet, but it's required by the mobile client for now to directly create records from menu items
								device: (context && context.query && context.query.device) ? context.query.device : "desktop",
								protoInPage: true
							};
							var page = pageEntity.pageContent(_, context, opts),
								proto = page && page.$prototype,
								ok = true;
							if (proto && proto.$diagnoses) {
								var diag = {
									"$message": locale.format(module, "badRep", representation),
									"$severity": "warning",
									"$stackTrace": "From : " + from
								};
								proto.$diagnoses.forEach_(_, function(_, d) {
									diag.$stackTrace += "\n------------------------------------";
									if (d.$message) diag.$stackTrace += "\n" + d.$message;
									if (d.$stackTrace) diag.$stackTrace += "\n" + d.$stackTrace;
									ok = false;
								});
								diagnoses.push(diag);
							}
							if (!params.ignoreErrors && ok && (proto == null || typeof proto != 'object' || Object.keys(proto).length == 0 || !proto.$properties)) {
								// Force Error 
								diagnoses.push({
									"$message": locale.format(module, "badProto", representation),
									"$severity": "warning",
									"$stackTrace": "From : " + from
								});
								ok = false;
							} else {
								res.pages[representation] = page;
								if (rep[1] === "$create") { // clone the fake $create facet to the real $edit facet. This is required is only a create action of an entitiy is used and not edit action/facet.
									var editRep = rep[0] + ".$edit";
									if (!res.pages[editRep]) {
										res.pages[editRep] = page;
									}
								}
								_scanPageForRepresentations(opts.facet, page.$prototype, cl, list, badLinks, from + "." + representation);
							}
						}
					});
					list = cl;
				}
				if (badLinks && badLinks.length > 0) {
					// Force warning 
					var diag = {
						"$message": locale.format(module, "badLink"),
						"$severity": "warning"
					};
					diag.$stackTrace = "";
					badLinks.forEach_(_, function(_, msg) {
						if (diag.$stackTrace.length > 0) diag.$stackTrace += "\n";
						diag.$stackTrace += "------------------------------------\n";
						diag.$stackTrace += msg;
					});
					diagnoses.push(diag);
				}

				res.entities = {};
				Object.keys(res.pages).forEach(function(page) {
					var o = res.pages[page];
					if (o.$prototype && o.$prototype.$url) {
						var i = page.indexOf(".");
						if (i > 0) {
							var rep = page.substr(0, i);
							if (!res.entities[rep]) {
								var pn = o.$prototype.$pluralType;
								if (!pn) {
									i = o.$prototype.$url.lastIndexOf("/");
									pn = o.$prototype.$url.substring(i + 1);
									i = pn.indexOf("(");
									if (i > 0) pn = pn.substr(0, i);
									i = pn.indexOf("?");
									if (i > 0) pn = pn.substr(0, i);
								}
								var ce = {
									sync: false,
									cache: false,
									pluralType: pn
								};
								res.entities[rep] = ce;
							}
						}
					}
				});
				if (res.dashboards) {
					var dashboards = res.dashboards;
					for (var p in dashboards) {
						var dash = dashboards[p];
						var newDash = [];
						dash.forEach(function(d) {
							if (!d.linkType || !d.representation) newDash.push(d); // add 
							else if ((d.linkType === "$representation") && res.entities[d.representation]) newDash.push(d);
						});
						if (newDash.length > 0) dashboards[p] = newDash;
						else delete dashboards[p];
					}
				}
				var _empty = function(o) {
					return o == null || Object.keys(o).length == 0;
				};
				if (_empty(res.entities) || _empty(res.pages) || _empty(res.dashboards)) {
					var stack = [];
					if (_empty(res.entities)) stack.push("No entity");
					if (_empty(res.pages)) stack.push("No page");
					if (_empty(res.dashboards)) stack.push("No dashboard");
					_sendError(_, 400, locale.format(module, "badApp", instance.title(_)), "Bad representations\n->  " + stack.join('\n->  '), diagnoses);
				} else {
					delete res.representations;
					context.reply(_, 200, res);
				}
			}
		}
	},
	$functions: {
		$onDelete: function(_) {
			// fetch dashboards
			var self = this;
			var db = self._db;
			var dList = db.fetchInstances(_, db.getEntity(_, "dashboardDef"), {
				jsonWhere: {
					"variants.vignettes.portlet": self.$uuid
				}
			});
			// delete vignette from variant
			dList.forEach_(_, function(_, d) {
				d.variants(_).toArray(_, true).forEach_(_, function(_, vr) {
					var vigns = vr.vignettes(_);
					vigns.toArray(_, true).forEach_(_, function(_, v) {
						if (v.portlet(_) && (v.portlet(_).$uuid === self.$uuid)) {
							vigns.deleteInstance(_, v.$uuid);
							self.addRelatedInstance(d);
						}
					});
				});
			});
		},
		getContent: function(_, endpoints, options) {
			var p = _contentSolverMap[this.type(_)] && _contentSolverMap[this.type(_)](_, this, endpoints, options);
			if (p) {
				p.$type = "application/x-vignette";
				p.$title = this.title(_);
				p.$description = this.description(_);
				p.$properties = {};
			}
			//
			return p;
		},
		getMobileStruct: function(_, context, params, res) {
			var instance = this;
			if (instance.type(_) === "$menu") {
				var key = instance.computeKey();
				var items = instance.items(_).toArray(_);
				items.forEach_(_, function(_, item) {
					if (item.linkType(_) === "$representation") {
						var app = item.applicationName(_),
							contract = item.contractName(_),
							endpoint = item.endpointName(_);
						if ((!app || (app == params.applicationName)) && (!contract || (contract == params.contractName)) && (!endpoint || (endpoint == params.endpointName))) {
							var data = {};
							data.title = item.title(_);
							data.description = item.description(_);
							data.icon = item.icon(_);
							data.linkType = "$representation";
							data.entity = item.entity(_);
							data.representation = item.representation(_);

							/* facet it not a representations facet but the action $query, $edit, $create
                               originally, $create fake facet was used to directly create new items by
                               clicking a menu item with $create action.
                               Since this behaviour is still requested, but there is not <repr>.$create prototype,
                               the name of the facet remains $create (which is wrong but required by mobile client).
                               When getting the prototypes, $create will be replaced by $edit.
                             */
							data.facet = item.facet(_);
							data.params = item.getItemParams(_);
							res.dashboards[key] = res.dashboards[key] || [];
							if (!res.entities[data.entity]) {
								res.entities[data.entity] = {
									cache: false,
									sync: false
								};
							}
							var entity = res.entities[data.entity];
							var id = data.representation + "." + data.facet;
							if (!res.pages[id]) {
								_listAdd(res.representations, id, "MenuItem(" + (data.title || data.description) + ")");
								res.pages[id] = true;
							}
							if (item.applicationMenu(_)) res.footer.push(data);
							else res.dashboards[key].push(data);
						}
					} else if (item.linkType(_) === "$dashboard") {
						var dn = item.dashboard(_);
						if (dn) {
							var dashboardEntity = context.model.getEntity(_, "dashboardDef");
							var dashboard = context.db.fetchInstance(_, dashboardEntity, {
								jsonWhere: {
									dashboardName: dn
								}
							});
							var variants = dashboard.variants(_).toArray(_);
							variants.forEach_(_, function(_, variant) {
								if (!variant.allApplications(_)) {
									var ca = variant.application(_);
									if (ca.application(_) === params.applicationName) {
										var vignettes = variant.vignettes(_).toArray(_);
										vignettes.forEach_(_, function(_, vignette) {
											var portlet = vignette.portlet(_);
											if (portlet.type(_) === "$menu") {
												var nk = portlet.computeKey();
												if (!res.dashboards[nk]) {
													res.dashboards[key] = res.dashboards[key] || [];
													portlet.getMobileStruct(_, context, params, res);
													if (res.dashboards[nk]) {
														var cd = {
															linkType: "$dashboard"
														};
														cd.title = item.title(_);
														cd.description = item.description(_);
														cd.icon = item.icon(_);
														cd.facet = "$dashboard";
														cd.dashboard = nk;
														res.dashboards[key].push(cd);
													}
												}
											}

										});
									}

								}
							});
						}
					}
				});
			}
			return res;
		}
	},
	/*	$links: {
		regroup: {
			$title: "Fusion with similar vignettes",
			$url: "{$baseUrl}/vignetteRegroups/$template/$workingCopies?representation=vignetteRegroup.$edit&vignette={$uuid}",
			$method: "POST"
		}
	},*/
	$searchIndex: {
		$fields: ["code", "title", "description", "application", "endpoint", "type", "items", "pageItem", "categories", "module", "linkType"]
	},
	$defaultOrder: [
		["title", true]
	]
};