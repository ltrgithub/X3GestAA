"use strict";

var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var locale = require('streamline-locale');
var globals = require('streamline-runtime').globals;

function _makeWhere(linkType, appId) {
	var parts = ["(application.$key eq '" + appId + "' or application eq null)"];
	parts.push("(linkType eq '" + linkType + "')");
	if (linkType === "$representation") parts.push("(facet eq '$query')");
	return "where=" + encodeURIComponent("(" + parts.join(" and ") + ")");
}

exports.entity = {
	$titleTemplate: "Select vignette",
	$valueTemplate: "{endpoint}",
	$isPersistent: false,
	$canSave: false,
	$properties: {
		applicationId: {
			$title: "Application",
			$isHidden: true
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$propagate: function(_, instance) {
				instance.applicationId(_, instance.endpoint(_) && instance.endpoint(_).applicationRef(_) && instance.endpoint(_).applicationRef(_).$uuid);
			},
			defaultValue: function(_, instance) {
				var up = globals.context.session && globals.context.session.getUserProfile(_);
				return up.selectedEndpoint(_);
			},
			$lookup: function(_, instance) {
				var up = globals.context.session && globals.context.session.getUserProfile(_);
				var filter = up.endpoints(_).toArray(_).map(function(ep) {
					return "'" + ep.$uuid + "'";
				}).join(',');
				var adminEp = adminHelper.getCollaborationEndpoint(_);
				return (adminEp && {
					$type: "application/json",
					$url: adminEp.getBaseUrl(_) + "/endPoints?representation=endPoint.$lookup&binding=selectedEndpoint&count=50&where=($uuid in (" + filter + "))"
				}) || {};

			}
		}
	},
	$links: function(_, instance) {
		function _makeLink(title, where) {
			var searchUrl = lkUrl + "&" + where;
			return {
				$title: title,
				$url: searchUrl.replace("application.%24key", "application"),
				$searchUrl: searchUrl,
				$method: "GET",
				$isDisabled: !enabled
			};
		}
		var lks = {};
		var admEp = adminHelper.getCollaborationEndpoint(_);
		var lkUrl = admEp.getBaseUrl(_) + "/menuItems?representation=menuItem.$query&count=2000";
		lkUrl += "&select=" + encodeURIComponent("code,title,module.code,module.title,categories");
		var enabled = instance.endpoint(_) != null;
		lks.requests = _makeLink(locale.format(module, "requestsTitle"), _makeWhere("$request", instance.applicationId(_)));
		lks.processes = _makeLink(locale.format(module, "processesTitle"), _makeWhere("$process", instance.applicationId(_)));
		lks.stats = _makeLink(locale.format(module, "statsTitle"), _makeWhere("$stats", instance.applicationId(_)));
		lks.representation = _makeLink(locale.format(module, "representationTitle"), _makeWhere("$representation", instance.applicationId(_)));
		lks.extLink = _makeLink(locale.format(module, "extLinkTitle"), _makeWhere("$external", instance.applicationId(_)));
		lks.calendar = _makeLink(locale.format(module, "calendarTitle"), _makeWhere("$calendar", instance.applicationId(_)));
		//
		return lks;
	}
};