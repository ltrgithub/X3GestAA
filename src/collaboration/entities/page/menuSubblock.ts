"use strict";

var globals = require('streamline-runtime').globals;

function _getRootBlock(_, instance) {
	if (!instance) return null;
	if (!instance._parent || (instance.getEntity(_).name !== "menuSubblock")) return instance;
	return _getRootBlock(_, instance._parent);
}

exports.entity = {
	$titleTemplate: "Menu block",
	$valueTemplate: "{title}",
	$allowFactory: true,
	$factoryExcludes: ["items"],
	$properties: {
		code: {
			$title: "Code",
			$isMandatory: true,
			defaultValue: function(_, instance) {
				return instance.$uuid;
			},
			$isHidden: true
		},
		title: {
			$title: "Title",
			$isLocalized: true
		}
	},
	$relations: {
		items: {
			$isPlural: true,
			$title: "Items",
			$variants: {
				menuItem: {
					$capabilities: "sort,reorder,delete",
					$title: "Menu items",
					$type: "menuItem",
					$lookupFilter: {
						$or: [{
							application: "{application}"
						}, {
							application: null
						}]
					}
				},
				menuBlock: {
					$capabilities: "append,sort,reorder,delete",
					$title: "Blocks",
					$type: "menuSubblock",
					$isChild: true
				}
			}
		},
		application: {
			$title: "Application",
			$type: "application",
			$isHidden: true,
			$compute: function(_, instance) {
				var root = _getRootBlock(_, instance);
				return root && (root.getEntity(_).name === "menuBlock") && root.application(_);
			}
		}
	},
	$functions: {
		$onSerializeReference: function(_, result) {
			//result.$shortUrl = "{$shortUrl}";
			if (this._parent && this._parent.getEntity(_).name === this.getEntity(_).name) {
				result.$parent_url = "{$r_url}";
			} else {
				result.$parent_url = "{$shortUrl}";
			}

			result.$r_url = "{$parent_url}/items('" + this.$uuid + "')";
		},
		getNavigationPageResource: function(_, baseUrlProp, filters, adminMode) {
			function _keep(_, item) {
				if (!item.$loaded) return;
				if (ff.applicationId && item.application(_) && (item.application(_).$uuid !== ff.applicationId)) return false;
				if (ff.endpointId && item.endpoint && item.endpoint(_) && (item.endpoint(_).$uuid !== ff.endpointId)) return false;
				return true;
			}
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			var ff = filters || {};
			var auth = ff.auth;
			var sm = this;
			var res = {
				$uuid: sm.$uuid,
				title: sm.title(_),
				$shortUrl: "{$r_url}",
				$r_url: "{$r_url}/items('" + sm.$uuid + "')",
				items: []
			};
			var items = sm.items(_).toArray(_);
			items.forEach_(_, function(_, it) {
				if (!adminMode && !_keep(_, it)) return;
				if (!adminMode && auth && it.authorized && !it.authorized(_, auth)) return;
				var res_it = it.getNavigationPageResource(_, baseUrlProp, filters, adminMode);
				if (!adminMode && res_it.menuBlock && res_it.menuBlock.items && !res_it.menuBlock.items.length) return;
				var sous_res = res_it.menuBlock || res_it.menuItem;
				if (sous_res) {
					sous_res.$links = sous_res.$links || {};
					sous_res.$links.$edit = sous_res.$links.$edit || {};
					if (it.$factory && sp && !sp.hasFactoryRights(_)) {
						if (!adminMode) sous_res.$links.$edit.$isHidden = true;
						if (sm.$factory) {
							var itEnt = it.getEntity(_);
							if (itEnt.$factoryExcludes && itEnt.$factoryExcludes.indexOf("items") === -1) {
								sous_res.$capabilities = "";
							}
						}
					}
				}
				res.items.push(res_it);
			});
			return {
				menuBlock: res
			};
		},
		fullLoad: function(_, menus) {
			// load items
			var self = this;
			// use _array directly to avoir repeated calls to orm to load every menu entry
			(self.items(_)._array || []).forEach_(_, function(_, it, pos) {
				if (it.$variantType === "menuItem") {
					var mm = menus[it.$uuid];
					if (mm) {
						mm.$variantType = "menuItem";
						mm._parent = self;
						mm._relation = self.items(_)._relMeta;
						self.items(_)._array[pos] = mm;
					}
				} else {
					it.ensureLoaded(_);
					it.fullLoad(_, menus);
				}
			});
		}
	},
	$events: {
		$afterSave: [

			function(_, instance, params) {
				globals.context.session && globals.context.session.resetCache && globals.context.session.resetCache("navigationPage");
			}
		]
	}
};