"use strict";
var locale = require('streamline-locale');
var check = require("../../../../src/license/check");
var globals = require('streamline-runtime').globals;
var multiTenant;


// remove IP addresses from license data, replace each IP address of same user (user=everything which
//  follows the first underscore) by a number
// only for multitenant mode.
// intermediate data will be stored in obj
exports.simplify = function(key, obj) {
	obj.users = obj.users || {};
	obj.trans = obj.trans || {};
	if (key in obj.trans) return obj.trans[key];
	var index = key.indexOf("_");
	if (index < 0) return key;
	var key1 = key.substr(index + 1);
	var number;
	if (key1 in obj.users) {
		number = ++(obj.users[key1]);
	} else {
		number = obj.users[key1] = 0;
	}
	obj.trans[key] = number + "_" + key1;
	return obj.trans[key];
};


// round up to number of megabytes
function mb(a) {
	return Math.ceil(a / 1048576);
}

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$canEdit: false,
	$canDelete: false,
	$titleTemplate: "License usage information",
	$helpPage: "Administration-reference_Licenseview",
	$properties: {},
	$relations: {
		items: {
			$title: "Badges",
			$type: "licenseViewItems",
			$isChild: true,
			$isPlural: true,
			$treeview: {
				$mode: "parentKey",
				$bindings: {
					$id: "prod",
					$parent: "warn",
					$open: "openfield"
				}
			}

		},
		wsItems: {
			$title: "Web services consumption",
			$type: "licenseViewItems",
			$isChild: true,
			$isPlural: true,
		},
		licenseCountOld: {
			$title: "History of web services consumption",
			$isChild: true,
			$isPlural: true,
			$type: "licenseWsOlds"
		}

	},
	$links: {
		webSessions: {
			$title: "Web sessions",
			"$url": "{$baseUrl}/sessionInfos?representation=sessionInfo.$query",
			"$method": "GET"
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			var self = this;
			var obj = {}; // for calling the simplify function
			var res = check.findUsedBadges(_, globals.context.session && globals.context.session.device, this);
			if (multiTenant === undefined) {
				var config = require('config');
				multiTenant = !!(config.hosting && config.hosting.multiTenant);
			}
			var productTitles = {};
			var counts = res.productCounts;
			for (var key in counts) {
				var a = counts[key];
				var item = self.items(_).add(_);
				productTitles[key] = a.productTitle;
				item.warn(_, "");
				item.prod(_, productTitles[key]);
				item.count(_, a.used + "/" + a.allowed);
				item.openfield(_, true);
			}
			var counts = res.badgeCounts;
			for (var key in counts) {
				var a = counts[key];
				var item = self.items(_).add(_);
				item.warn(_, productTitles[a.product]);
				var title = key;
				item.prod(_, title);
				item.count(_, a.used + "/" + a.allowed);
				item.openfield(_, false);
				for (var key2 in a) {
					if (key2.indexOf("_") < 0) continue;
					var item2 = self.items(_).add(_);
					item2.warn(_, title);
					item2.prod(_, multiTenant ? exports.simplify(key2, obj) : key2);
					item2.count(_, "" + Math.ceil(a[key2].length / 5));
				}
			}

			var counts = res.webServices;
			if (counts) {
				for (var product in counts) {
					var item = self.wsItems(_).add(_);
					item.prod(_, productTitles[product]);
					var val = counts[product];
					var sum = val.counter + val.other;
					var text;
					switch (val.length) {
						case 4:
							text = locale.format(module, "year", Math.ceil(sum / val.size * 100), mb(sum), mb(val.size));
							break;
						case 7:
							text = locale.format(module, "month", Math.ceil(sum / val.size * 100), mb(sum), mb(val.size));
							break;
						case 10:
							text = locale.format(module, "day", Math.ceil(sum / val.size * 100), mb(sum), mb(val.size));
							break;
						default:
							text = "Internal error: wrong length " + val.length;
							break;
					}
					item.count(_, text);
					if (sum > val.size) {
						item.warn(_, locale.format(module, "much", mb(val.graceLimit)));
					}

				}
			}
			var oldData = context.db.fetchInstances(_, context.db.model.getEntity(_, "licenseWsOld"));
			var counts = {};
			try {
				oldData.forEach_(_, function(_, inst) {
					var key = inst.product(_) + "\0" + inst.period(_);
					if (key in counts) {
						counts[key] += inst.counter(_);
					} else {
						counts[key] = inst.counter(_) || 0;
					}
				});
				for (var b in counts) {
					var items = b.split(/\0/);
					var newInst = self.licenseCountOld(_).add(_);
					newInst.product(_, productTitles[items[0]] || items[0]);
					newInst.server(_, "-");
					newInst.counter(_, mb(counts[b]));
					newInst.period(_, items[1]);
				}
			} catch (e) {
				console.error(e);
			}
		}
	}
};