"use strict";

var dataModel = require("../../../..//src/orm/dataModel");
var sdataRegistry = require("../../../..//src/sdata/sdataRegistry");
var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var globals = require('streamline-runtime').globals;
var sys = require("util");

// TODO: ordering ?

var _targetNameMap = {
	$representation: function(_, instance) {
		//return instance.representation(_) + "." + instance.facet(_);
		return instance.representationRef(_) && (instance.representationRef(_).representation(_) + "." + instance.facet(_)) || "";
	},
	$function: function(_, instance) {
		return instance.fusionFunction(_);
	},
	$dashboard: function(_, instance) {
		return instance.dashboard(_);
	},
	$external: function(_, instance) {
		return instance.externalUrl(_);
	},
	$calendar: function(_, instance) {
		return instance.requestName(_) + "," + instance.requestLevel(_);
	},
	$request: function(_, instance) {
		return instance.requestName(_) + "," + instance.requestLevel(_);
	},
	$stats: function(_, instance) {
		return instance.statName(_);
	},
	$process: function(_, instance) {
		return [instance.processLeg(_), instance.processName(_), instance.processMenu(_)].join(",");
	}
};

var _computeLinkMap = {
	$representation_$query: function(_, item, baseUrl) {
		return item.representationRef(_) && (baseUrl + "/" + item.representationRef(_).entity(_) + "?representation=" + item.representationRef(_).representation(_) + "." + item.getLinkFacet(_));
	},
	$representation_$create: function(_, item, baseUrl) {
		return baseUrl + "/" + item.representationRef(_).entity(_) + "/$template/$workingCopies?representation=" + item.representationRef(_).representation(_) + "." + item.getLinkFacet(_) + "&$method=POST";
	},
	$representation_$details: function(_, item, baseUrl) {
		// TODO: parameter
		var k = item.keyIsWhere(_) ? "(" + item.keyParameter(_) + ")" : "('" + item.keyParameter(_) + "')";
		return baseUrl + "/" + item.representationRef(_).entity(_) + k + "?representation=" + item.representationRef(_).representation(_) + "." + item.getLinkFacet(_);
	},
	$representation_$edit: function(_, item, baseUrl) {
		// TODO: parameter and test
		var k = item.keyIsWhere(_) ? "(" + item.keyParameter(_) + ")" : "('" + item.keyParameter(_) + "')";
		return baseUrl + "/" + item.representationRef(_).entity(_) + k + "/$workingCopies?representation=" + item.representationRef(_).representation(_) + "." + item.getLinkFacet(_) + "&$method=POST";
	},
	$representation_$cube: function(_, item, baseUrl) {
		var k = item.keyIsWhere(_) ? "(" + item.keyParameter(_) + ")" : "('" + item.keyParameter(_) + "')";
		return baseUrl + "/" + item.representationRef(_).entity(_) + k + "?representation=" + item.representationRef(_).representation(_) + "." + item.getLinkFacet(_);
	},
	$function: function(_, item, baseUrl) {
		return baseUrl.replace("/sdata/", "/trans/") + "/$sessions?f=" + encodeURIComponent(item.fusionFunction(_) + "/2//M/" + (item.fusionKey(_) || ""));
	},
	$dashboard: function(_, item, baseUrl) {
		return "?representation=" + item.dashboard(_) + ".$dashboard";
	},
	$external: function(_, item, baseUrl) {
		var url = item.externalUrl(_);
		return (url && (url.indexOf("http") === 0 || url.indexOf("/") === 0)) ? url : "http://" + url;
	},
	$calendar: function(_, item, baseUrl) {
		var name = item.requestName(_);
		var level = item.requestLevel(_);
		return name && (baseUrl + "/QUERY('" + name + "')?representation=QUERY~" + name + (level ? "~" + level : "") + "." + item.getLinkFacet(_) + "&view=calendar");
	},
	$request: function(_, item, baseUrl) {
		var name = item.requestName(_);
		var level = item.requestLevel(_);
		return name && (baseUrl + "/QUERY('" + name + "')?representation=QUERY~" + name + (level ? "~" + level : "") + "." + item.getLinkFacet(_));
	},
	$stats: function(_, item, baseUrl) {
		var name = item.statName(_);
		return name && (baseUrl + "/STATS('" + name + "')?representation=STATS~" + name + "." + item.getLinkFacet(_));
	},
	$process: function(_, item, baseUrl) {
		var pars = [item.processLeg(_) || "", item.processName(_)];
		if (item.processMenu(_)) pars.push(item.processMenu(_));
		var level = item.requestLevel(_);
		return pars[1] && (baseUrl + "/PROCESS('" + pars[1] + "')?representation=PROCESS~" + pars.join("~") + "." + item.getLinkFacet(_));
	},
	$hrm: function(_, item, baseUrl) {
		var ep = item.endpoint(_);
		var sol = ep && ep.getSolutionName(_);
		var fldr = ep && ep.x3ServerFolder(_);
		var site = item.hrmSite(_);
		return "{$hostUrl}/xtend/page?SOL=" + sol + "&FLDR=" + fldr + "&SITE=" + (site && site.name(_));
	}
};

function _isRequest(_, instance) {
	return (instance.linkType(_) === "$request" || instance.linkType(_) === "$calendar");
}
exports.entity = {
	$titleTemplate: "Menu item",
	$descriptionTemplate: "Menu item",
	$valueTemplate: "{title}",
	$helpPage: "Administration-reference_Menu-items",
	$allowFactory: true,
	$factoryExcludes: ["description", "endpoint", "module", "categories"],
	$properties: {
		code: {
			$title: "Code",
			$isUnique: true,
			$isMandatory: true,
			$linksToDetails: true
		},
		title: {
			$title: "Title",
			$isMandatory: true,
			$linksToDetails: true,
			$isLocalized: true,
			$propagate: function(_, instance, val) {
				if (!instance.code(_) && val) instance.code(_, val);
			}
		},
		description: {
			$title: "Description",
			$isLocalized: true
		},
		linkType: {
			$title: "Link type",
			$enum: [{
				$value: "$representation",
				$title: "Representation"
			}, {
				$value: "$function",
				$title: "Function (convergence)"
			}, {
				$value: "$process",
				$title: "Process"
			}, {
				$value: "$request",
				$title: "Request"
			}, {
				$value: "$stats",
				$title: "Statistics"
			}, {
				$value: "$dashboard",
				$title: "Dashboard page"
			}, {
				$value: "$external",
				$title: "External link"
			}, {
				$value: "$calendar",
				$title: "Calendar"
			}, {
				$value: "$hrm",
				$title: "HRM Site"
			}],
			$default: "$representation",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val === "$function") {
					if (instance.application(_) && (instance.application(_).protocol(_) !== "x3")) instance.application(_, null);
				}
				if (val !== "$representation") {
					instance.representationRef(_, null);
				}
			},
			$isDisabled: function(_, instance) {
				return !instance.$created;
			}
		},
		icon: {
			$title: "Icon",
			$isNullable: true
		},
		applicationMenu: {
			$title: "Application Menu",
			$type: "boolean",
			$default: false,
			$isNullable: true
		},
		entity: {
			$title: "Entity",
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
			$isExcluded: false
		},
		representation: {
			$title: "Representation",
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
			$isExcluded: false
		},
		facet: {
			$title: "Action",
			$enum: [{
				$value: "$query",
				$title: "Query"
			}, {
				$value: "$cube",
				$title: "Statistics"
			}, {
				$value: "$details",
				$title: "Details"
			}, {
				$value: "$edit",
				$title: "Edit"
			}, {
				$value: "$create",
				$title: "Create"
			}],
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
			$default: "$query"
		},
		fusionFunction: {
			$title: "Function",
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$function");
			},
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$function");
			},
			$lookup: function(_, instance) {
				if (!instance.application(_)) return;
				var ep = instance.endpoint(_) || instance.application(_).defaultEndpoint(_);
				if (!ep) return;
				return {
					$type: "application/json",
					$url: ep.getBaseUrl(_) + "/AFCTIDX?representation=AFCTIDX.$lookup",
					$result: "NAME"
				};
			}
		},
		fusionKey: {
			$title: "Key",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$function");
			}
		},
		keyParameter: {
			$title: "Key",
			$isDefined: function(_, instance) {
				return ((instance.linkType(_) === "$representation") && (["$details", "$edit", "$cube"].indexOf(instance.facet(_)) >= 0));
			},
			$isMandatory: function(_, instance) {
				return ((instance.linkType(_) === "$representation") && (["$details", "$edit", "$cube"].indexOf(instance.facet(_)) >= 0));
			}
		},
		keyIsWhere: {
			$title: "Is where",
			$type: "boolean",
			$isDefined: function(_, instance) {
				return ((instance.linkType(_) === "$representation") && (["$details", "$edit", "$cube"].indexOf(instance.facet(_)) >= 0));
			},
			$default: false,
			$isNullable: true
		},
		externalUrl: {
			$title: "Url",
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$external");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$external");
			}
		},
		dashboard: {
			$title: "Dashboard",
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$dashboard");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$dashboard");
			},
			$lookup: {
				entity: "dashboardDef",
				field: "dashboardName"
			},
			$lookupfilter: {
				facet: "$dashboard"
			}
		},

		requestName: {
			$title: "Request name",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return _isRequest(_, instance);
			},
			$isMandatory: function(_, instance) {
				return _isRequest(_, instance);
			}
		},
		requestLevel: {
			$title: "Request level",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return _isRequest(_, instance);
			},
			$default: "1"
		},
		statName: {
			$title: "Stat name",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$stats");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$stats");
			}
		},
		processName: {
			$title: "Process name",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$process");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$process");
			}
		},
		processLeg: {
			$title: "Process legislation",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$process");
			}
		},
		processMenu: {
			$title: "Process menu",
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$process");
			}
		},
		target: {
			$title: "Open in",
			$enum: [{
				$value: "self",
				$title: "Same window"
			}, {
				$value: "blank",
				$title: "New window"
			}],
			$default: "self"
		},
		applicationName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.application(_) && instance.application(_).application(_)) || "";
			},
			$isExcluded: true
		},
		contractName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.application(_) && instance.application(_).contract(_)) || "";
			},
			$isExcluded: true
		},
		endpointName: {
			$isHidden: true,
			$compute: function(_, instance) {
				return (instance.endpoint(_) && instance.endpoint(_).dataset(_)) || "";
			},
			$isExcluded: true
		},
		pageTargetName: {
			$title: "Target name",
			$compute: function(_, instance) {
				return _targetNameMap[instance.linkType(_)] && _targetNameMap[instance.linkType(_)](_, instance);
			},
			$isExcluded: true
		},
		referenceDataset: {
			$title: "Reference dataset",
			$isHidden: true,
			$compute: function(_, instance) {
				var ep = instance.endpoint(_);
				if (!ep && instance.application(_)) {
					// get default endpoint from groups (take the first one)
					if (!ep && (instance.application(_).protocol(_) === "x3")) {
						var up = globals && globals.context && globals.context.session && globals.context.session.getUserProfile(_);
						if (up) {
							var eps = up.getDefaultX3Endpoints(_);
							ep = eps && eps[0];
						}
					}
					// get the application's default endpoint
					if (!ep) ep = instance.application(_).defaultEndpoint(_);
				}
				//
				return ep && ep.dataset(_);
			},
			$isExcluded: true
		}
	},
	$relations: {
		application: {
			$title: "Application",
			$type: "application",
			$inv: "menuItems",
			$isDefined: function(_, instance) {
				return (["$representation", "$function", "$process", "$request", "$calendar", "$stats", "$hrm"].indexOf(instance.linkType(_)) >= 0);
			},
			$isMandatory: function(_, instance) {
				return (["$representation", "$function", "$process", "$request", "$calendar", "$stats", "$hrm"].indexOf(instance.linkType(_)) >= 0);
			},
			$propagate: function(_, instance, val) {
				var r = instance.representationRef(_);
				if (val && r && (r.application(_) && (r.application(_).$uuid !== val.$uuid))) instance.representationRef(_, null);
				instance.endpoint(_, null);
			},
			$lookup: function(_, instance) {
				var ep = adminHelper.getCollaborationEndpoint(_);
				return (ep && {
					$type: "application/json",
					$url: ep.getBaseUrl(_) + "/applications?representation=application.$lookup" + (instance.linkType(_) === "$function" ? "&where=(protocol eq \"x3\")" : "")
				}) || {};
			}
		},
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isDisabled: function(_, instance) {
				return !instance.application(_);
			},
			$isDefined: function(_, instance) {
				return (["$representation", "$function", "$process", "$request", "$calendar", "$stats", "$hrm"].indexOf(instance.linkType(_)) >= 0);
			},
			$description: "Choose an endpoint for an endpoint specific function or representation",
			$lookupFilter: {
				applicationRef: "{application}"
			}
		},
		hrmSite: {
			$title: "Site",
			$type: "hrmSite",
			$isDisabled: function(_, instance) {
				return !instance.endpoint(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$hrm");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$hrm");
			},
			$lookupFilter: {
				endpoint: "{endpoint}"
			}
		},
		representationRef: {
			$title: "Representation",
			$type: "representationProxy",
			$inlineStore: true,
			isChild: true,
			$lookup: {
				parameters: "dataset={referenceDataset}"
			},
			$propagate: function(_, instance, val) {
				if (val) {
					instance.representation(_, val.representation(_));
					instance.entity(_, val.entity(_));
				} else {
					instance.representation(_, "");
					instance.entity(_, "");
				}
			},
			$isDisabled: function(_, instance) {
				return !instance.referenceDataset(_);
			},
			$isDefined: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
			$isMandatory: function(_, instance) {
				return (instance.linkType(_) === "$representation");
			},
		},
		dependency: {
			$title: "Dependency",
			$type: "menuItem",
			$description: "Menu item that will condition displaying of this one",
			$isDefined: function(_, instance) {
				return instance.linkType(_) === "$external";
			},
			$lookup: function(_, instance) {
				var ep = adminHelper.getCollaborationEndpoint(_);
				return (ep && {
					$type: "application/json",
					$url: ep.getBaseUrl(_) + "/menuItems?representation=menuItem.$lookup&where=(linkType in (\"$function\", \"$representation\"))"
				}) || {};
			},
			$propagate: function(_, instance, val) {
				if (["$function", "$representation"].indexOf(val && val.linkType(_)) < 0) {
					instance.dependency(_, null);
				}
			}
		},
		/*		menus: {
			$title: "Display in vignettes",
			$type: "portlets",
			$inv: "items",
			isComputed: true,
			$nullOnDelete: true,
			$lookupFilter: {
				$or: [{
					application: "{application}"
				}, {
					application: null
				}]
			}
		},*/
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
		},
		parameters: {
			$title: "Parameters",
			$type: "menuItemParameters",
			$isChild: true
		}
	},
	$links: function(_, instance) {
		var res = {};
		res["$execute_" + instance.getLinkResourceName(_)] = instance.getExecuteLink(_, instance.getLinkResourceName(_));
		return res;
	},
	$functions: {
		$onSerializeReference: function(_, result) {
			if (!result) return;
			var instance = this;
			result.$links = result.$links || {};
			result.$links["$execute_" + instance.getLinkResourceName(_)] = instance.getExecuteLink(_, instance.getLinkResourceName(_));
		},
		$onDelete: function(_) {
			function _deleteMenu(_, mainBlock, block) {
				block.items(_).toArray(_).forEach_(_, function(_, it) {
					if (it.items) _deleteMenu(_, mainBlock, it); // if it supports items function then it is a block
					else {
						if (it.$uuid === instance.$uuid) {
							block.items(_).deleteInstance(_, it.$uuid);
							mainBlock._isModified = true;
						}
					}
				});
			}
			// look for the entry in every submodule and cascade delete
			var instance = this;
			var db = instance._db;
			db.fetchInstances(_, db.getEntity(_, "menuBlock"), {}).forEach_(_, function(_, sm) {
				_deleteMenu(_, sm, sm);
				if (sm._isModified) sm.save(_, null, {
					shallowSerialize: true
				});
			});
			// look for the entry in every landing page's vignettes and cascade delete
			db.fetchInstances(_, db.getEntity(_, "landingPage"), {
				jsonWhere: {
					"vignettes.vignette": instance.$uuid
				}
			}).forEach_(_, function(_, lp) {
				lp.vignettes(_).toArray(_).forEach_(_, function(_, vv) {
					if (vv.vignette(_).$uuid == instance.$uuid) lp.vignettes(_).deleteInstance(_, vv.$uuid);
				});
				lp.save(_, null, {
					shallowSerialize: true
				});
			});
		},
		needEndpoint: function(_) {
			return ["$dashboard", "$external"].indexOf(this.linkType(_)) < 0;
		},
		getExecuteLink: function(_, linkResName) {
			var instance = this;
			//
			if (!instance.needEndpoint(_)) return instance.getLink(_);
			//
			if (!instance.application(_)) return null;
			var ep = instance.endpoint(_);
			if (!ep) {
				var adminApp = adminHelper.getCollaborationApplication(_);
				if (adminApp.$uuid === instance.application(_).$uuid) {
					ep = adminHelper.getCollaborationEndpoint(_);
				}
			}
			if (!ep) {
				var up = globals && globals.context && globals.context.session && globals.context.session.getUserProfile(_);
				var ep = up && up.selectedEndpoint(_);
				if (ep && (ep.applicationRef(_).$uuid !== instance.application(_).$uuid)) ep = null;
			}
			//if (!ep) return null;
			var res = instance.getLink(_, ep, "{$baseUrl}");
			if (!ep) res.$isDisabled = true;
			return res;
		},
		getLink: function(_, endpoint, baseUrlProp) {
			var link = {
				$type: (["$external", "$hrm"].indexOf(this.linkType(_)) < 0 ? "application/json;vnd.sage=syracuse" : "html"),
				$title: this.title(_),
				$description: this.description(_),
				$url: this.getItemUrl(_, endpoint, baseUrlProp),
				$method: this.getMethod(_),
				$target: (this.target(_) || "self")
			};
			var parts = [];
			this.parameters(_).toArray(_).forEach_(_, function(_, param) {
				if (param.prompt(_)) {
					parts.push(param.name(_) + "={" + param.name(_) + "}");
					link.$parameters = link.$parameters || {};
					link.$parameters.$properties = link.$parameters.$properties || {};
					link.$parameters.$properties[param.name(_)] = {
						$title: param.title(_),
						$type: "application/x-string", // for now, just strings
						$value: param.value(_)
					};
					if (param.value(_)) link.$parameters[param.name(_)] = param.value(_);
				} else parts.push(param.name(_) + "=" + encodeURIComponent(param.value(_)));
			});
			if (parts.length) link.$url += ((link.$url.indexOf("?") >= 0) ? "&" : "?") + parts.join("&");
			return link;
		},
		getLinkFacet: function(_) {
			var self = this;
			var facet;
			switch (self.linkType(_)) {
				case "$representation":
					facet = self.facet(_);
					if (facet === "$create") facet = "$edit";
					break;
				case "$calendar":
				case "$request":
					facet = "$query";
					break;
				case "$stats":
					facet = "$cube";
					break;
				case "$process":
					facet = "$details";
					break;
				default:
					facet = "$edit";
			};
			return facet;
		},
		getLinkResourceName: function(_) {
			return this.getLinkFacet(_);
		},
		getNavigationPageResource: function(_, baseUrlProp) {
			var self = this;
			var res = {
				menuItem: {
					$uuid: self.$uuid,
					title: self.title(_),
					description: self.description(_),
					$links: {}
				}
			};
			switch (self.linkType(_)) {
				case "$representation":
					if (self.representationRef(_)) {
						res.menuItem.entity = self.representationRef(_).entity(_);
						res.menuItem.representation = self.representationRef(_).representation(_);
					}
					break;
				case "$function":
					res.menuItem.convergenceFunction = self.fusionFunction(_);
					break;
				case "$dashboard":
					res.menuItem.representation = self.dashboard(_);
					break;
				case "$external":
					res.menuItem.externalUrl = self.externalUrl(_);
					break;
				case "$calendar":
				case "$request":
					res.menuItem.representation = self.requestName(_);
					break;
				case "$stats":
					res.menuItem.representation = self.statName(_);
					break;
				case "$process":
					res.menuItem.representation = self.processName(_);
					break;
				case "$hrm":
					var site = self.hrmSite(_);
					res.menuItem.representation = site && site.name(_);
					break;
			}
			res.menuItem.$links["$execute_" + self.getLinkResourceName(_)] = self.getLink(_, null, baseUrlProp);
			return res;
		},
		getItemParams: function(_) {
			var parts = [];
			this.parameters(_).toArray(_).forEach_(_, function(_, param) {
				if (!param.prompt(_)) parts.push(param.name(_) + "=" + encodeURIComponent(param.value(_)));
			});
			return parts.join("&");
		},
		getItemUrl: function(_, endpoint, baseUrlProp) {
			var mapLinkEntry = this.linkType(_) + ((this.linkType(_) === "$representation") ? "_" + this.facet(_) : "");
			var params = this.parameters(_).toArray(_).reduce_(_, function(_, previous, param) {
				previous += "&" + encodeURIComponent(param.name(_) + "={" + param.name(_) + "}");
			}, "") || "";
			var bp = baseUrlProp && (typeof baseUrlProp === "object" ? (this.linkType(_) === "$function" ? baseUrlProp["function"] : baseUrlProp.representation) : baseUrlProp);
			return (_computeLinkMap[mapLinkEntry] && _computeLinkMap[mapLinkEntry](_, this, (endpoint && endpoint.getBaseUrl(_)) || bp || "{$baseUrl}")) + params;
		},
		getMethod: function(_) {
			// use $method parameter instead
			// return ((this.linkType(_) === "$representation") && (["$create", "$edit"].indexOf(this.facet(_)) >= 0)) ? "POST" : "GET";
			return "GET";
		},
		getCurrentBaseUrl: function(_) {
			if (this.endpoint(_)) return this.endpoint(_).getBaseUrl(_);
			if (!this.application(_)) return "";
			var adminApp = adminHelper.getCollaborationApplication(_);
			if (adminApp.$uuid === this.application(_).$uuid) {
				var adminEp = adminHelper.getCollaborationEndpoint(_);
				return adminEp.getBaseUrl(_);
			}
			var up = globals && globals.context && globals.context.session && globals.context.session.getUserProfile(_);
			var curEp = up && up.selectedEndpoint(_);
			if (!curEp) return "";
			return curEp.getBaseUrl(_);
		},
		authorized: function(_, fctAuth) {
			if (!fctAuth) return true;
			switch (this.linkType(_)) {
				case "$function":
					// classic function name can be set with ~ to define selected transaction
					var fnc = this.fusionFunction(_).indexOf('~') === -1 ? this.fusionFunction(_) : this.fusionFunction(_).split('~')[0];
					if (fctAuth.$disabledFunctions && (fctAuth.$disabledFunctions[fnc] != null)) return false;
					if (!fctAuth.$functions) return true;
					if (fctAuth.$functions === "*") return true;
					var isThere = fctAuth.$functions && (fctAuth.$functions[fnc] != null);
					return ((fctAuth.$mode === "authorize") && isThere) || ((fctAuth.$mode != "authorize") && !isThere);
				case "$representation":
					if (!fctAuth.$entities && !fctAuth.$representations) return true;
					// !!!!! for syracuse representations this is a list of entity names, is singular !!!!!
					// we should get a list of representations instead. Also, the entity names should be pluralized.
					// for now we test against representation but is not right !!!!
					var rep = this.representationRef(_) && this.representationRef(_).representation(_);
					if (!rep) return false;
					var ent = fctAuth.$entities && fctAuth.$entities[rep];
					var isThere = ent && (!ent.hasOwnProperty("restriction") || (ent.restriction && !ent.condition));
					var rep = fctAuth.$representations && fctAuth.$representations[rep];
					isThere = isThere || (rep && (!rep.hasOwnProperty("restriction") || (rep.restriction && !rep.condition)));
					return ((fctAuth.$mode === "authorize") && isThere) || ((fctAuth.$mode != "authorize") && !isThere);
				default:
					var dep = this.dependency(_);
					if (dep && dep.code && dep.code(_)) {
						// console.error("dependency:", dep && dep.code && dep.code(_));
						if (dep && dep.authorized) return dep.authorized(_, fctAuth);
					}
					return true;
			}
		}
	},
	$indexes: {
		application: {
			application: "asc"
		}
	},
	$searchIndex: {
		$fields: ["code", "title", "description", "linkType", "application", "endpoint", "representationRef", "facet", "fusionFunction", "fusionKey", "dashboard", "categories", "module", "requestName", "processName", "statName"] // add endpoint SAM
	},
	$exportProfile: {
		$variable: ["endpoint"],
		$key: "code",
		$properties: ["code", "title", "description", "linkType", "icon", "applicationMenu",
			"facet", "fusionFunction", "fusionKey", "keyParameter", "keyIsWhere", "externalUrl",
			"dashboard", "target", "$factory", "processName", "processMenu", "processLeg",
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
			categories: {
				$key: "code",
				$properties: ["code", "description"]
			},
			parameters: {
				$key: "name",
				$properties: ["name", "title", "prompt", "value"]
			}
		}
	}
};