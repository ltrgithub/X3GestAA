"use strict";

var globals = require('streamline-runtime').globals;
var locale = require('streamline-locale');

var tracer; // = console.log;

function _normalizeDiag(diag) {
	return {
		$severity: diag.$severity || diag.severity,
		$message: diag.$message || diag.message,
		$stackTrace: diag.$stackTrace || diag.stackTrace
	};
}


function _getParameter(_, menu, paramName, noCreate) {
	var par = menu.parameters(_).toArray(_).filter_(_, function(_, it) {
		return it.name(_) === paramName;
	})[0];
	if (!par && !noCreate) {
		par = menu.parameters(_).add(_);
		par.name(_, paramName);
		par.title(_, par.name(_));
	}
	return par;
}

function getX3FolderLangs(_, db) {
	var x3folderIsoLangs = [];
	var tablanQuery = db.getEntity(_, "TABLAN", "$query");
	var tablan = db.fetchInstances(_, tablanQuery, {
		sdataWhere: "LANISO ne '' and LANCON eq true"
	});
	tablan && tablan.forEach_(_, function(_, f) {
		x3folderIsoLangs.push(f.LANISO(_));
	});
	return x3folderIsoLangs;
}


exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "Import of menu profile",
	$valueTemplate: "",
	$helpPage: "Administration-reference_Menu-profile-import",
	$properties: {
		profileCode: {
			$title: "Profile code",
			$default: "ADMIN",
			$isMandatory: function(_, instance) {
				return instance.importMenu(_);
			},
			$isHidden: function(_, instance) {
				return !instance.importMenu(_);
			},
			$isDisabled: true
		},
		importMode: {
			$title: "Import mode",
			$enum: [{
				$title: "Insert only",
				$value: "insert",
				$description: "Create new elements and associate them. Doesn't modify existing elements"
			}, {
				$title: "Insert and update menus only",
				$value: "insertUpdateMenu",
				$description: "Create new menus only. Will associate them if a block can de identified"
			}, {
				$title: "Insert and update",
				$value: "insertUpdate",
				$description: "Create new elements and associate them. Can modify existing elements"
			}, {
				$title: "Update only",
				$value: "update",
				$description: "Modify existing elements. Doesn't create new elements"
			}],
			$default: "insertUpdate"
		},
		baseMenuName: {
			$title: "Base menu name",
			$isMandatory: true,
			$default: "GENE",
			$isHidden: true
		},
		pageName: {
			$title: "Navigation page name",
			$default: "home",
			$isHidden: function(_, instance) {
				return !instance.importMenu(_);
			},
			$isDisabled: true
		},
		allLocales: {
			$title: "Import all actives locales",
			$type: "boolean"
		},
		setAsFactory: {
			$title: "Set imported elements as Factory",
			$type: "boolean",
			$isHidden: function(_, instance) {
				var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
				return !sp || !sp.hasFactoryRights(_);
			}
		},
		importMenu: {
			$title: "Import menu profile",
			$type: "boolean"
		},
		importVignettes: {
			$title: "Import vignettes",
			$type: "boolean"
		}
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val) {
					instance.locales(_).reset(_);
				}
			}
		},
		locales: {
			$title: "Locales",
			$type: "localePreferences",
			$isMandatory: function(_, instance) {
				return !instance.allLocales(_);
			},
			$isDefined: function(_, instance) {
				return !instance.allLocales(_);
			},
			$lookupFilter: function(_, instance) {
				// $in doesn't work !!! TODO Fix in sdataContext (processFilter function)
				var ep = instance.endpoint(_);
				var filter;
				var x3IsoLangs = [];
				if (ep) {
					var db = ep.getOrm(_);
					try {
						x3IsoLangs = getX3FolderLangs(_, db);
						x3IsoLangs.forEach_(_, function(_, l) {
							filter = filter || {
								$or: []
							};
							filter.$or.push({
								"code": l
							});
						});
					} catch (e) {
						console.error(locale.format(module, "repAdossierMissing", ep.dataset(_), e.message));
					}
				} else {
					filter = {
						code: {
							$in: []
						}
					};
				}
				return filter;
			}
		}
	},
	$functions: {
		importMenuProfile: function(_, diags, tracker) {

			function _getMenuItem(_, vg, admDb, menuItemEnt, application, filter, options) {
				var ft = filter || {};
				ft.jsonWhere = ft.jsonWhere || {};

				if (application) ft.jsonWhere.application = application.$uuid;
				//
				var men = admDb.fetchInstance(_, menuItemEnt, ft);
				if (!men) {
					if (options.canCreate.menu) {
						// Still not found - create it
						men = menuItemEnt.createInstance(_, admDb);
						men.code(_, options.prefix + vg.CODVI(_));
						men.application(_, application);
						men.title(_, vg.LABEL(_) || men.code(_));
						men._isCreated = true;
						justCreatedElts.push(men.$uuid);
					}
				} else {
					// Check that we have rights to update the description on this item
					if ((options.canUpdate.menu || (men._isCreated && options.canCreate.menu) || justCreated(men.$uuid)) &&
						(!men.factoryOwner || men.factoryOwner === "" ||
							options.$factoryOwner === "SAGE" ||
							options.$factoryOwner === men.factoryOwner)) {
						men.title(_, vg.LABEL(_) || men.code(_));
						men._isModified = true;
					}
				}

				return men;
			}

			var _menuTypesMap = {
				"PROCESS": function(_, vg, admDb, menuItemEnt, application, filter, options) {
					var ft = filter || {};
					ft.jsonWhere = ft.jsonWhere || {};
					ft.jsonWhere.processName = vg.SOURCE(_);
					ft.jsonWhere.processMenu = vg.MENUPROC(_);
					ft.jsonWhere.linkType = "$process";
					//
					var men = _getMenuItem(_, vg, admDb, menuItemEnt, application, ft, options);
					if (men && men._isCreated) {
						men.linkType(_, "$process");
						men.processName(_, vg.SOURCE(_));
						men.processMenu(_, vg.MENUPROC(_));
					}
					return men;
				},
				"REQUEST": function(_, vg, admDb, menuItemEnt, application, filter, options) {
					//
					var compl = JSON.parse(vg.COMPLEMENT(_) || "{}");
					//
					var ft = filter || {};
					ft.jsonWhere = ft.jsonWhere || {};
					ft.jsonWhere.requestName = vg.SOURCE(_);
					if (compl.level) ft.jsonWhere.requestLevel = "" + compl.level;
					ft.jsonWhere.linkType = "$request";
					//
					var men = _getMenuItem(_, vg, admDb, menuItemEnt, application, ft, options);
					if (men && men._isCreated) {
						men.linkType(_, "$request");
						men.requestName(_, vg.SOURCE(_));
						if (compl.level) men.requestLevel(_, "" + compl.level);
					}
					if (men && (options.canUpdate.menu || men._isCreated)) {
						// forced execution must be deleted
						//if (compl.hasOwnProperty("forcedExecution")) {
						var pp = _getParameter(_, men, "forcedExecution", true);
						if (pp) men.parameters(_).deleteInstance(_, pp.$uuid);
						//pp.value(_, compl.forcedExecution ? "true" : "false");
						men._isModified = true;
						//}
						pp = _getParameter(_, men, "portview");
						if (pp.value(_) !== vg.PORTVIEW(_)) {
							pp.value(_, vg.PORTVIEW(_));
							men._isModified = true;
						}
						pp = _getParameter(_, men, "cube");
						if (pp.value(_) !== "false") {
							pp.value(_, "false");
							men._isModified = true;
						}
					}
					return men;
				},
				"WEBPAGE": function(_, vg, admDb, menuItemEnt, application, filter, options) {
					//
					//var compl = JSON.parse(vg.COMPLEMENT(_) || "{}");
					//
					var ft = filter || {};
					ft.jsonWhere = ft.jsonWhere || {};
					ft.jsonWhere.externalUrl = vg.SOURCE(_);
					ft.jsonWhere.linkType = "$external";
					//
					var men = _getMenuItem(_, vg, admDb, menuItemEnt, null, ft, options);
					if (men && men._isCreated) {
						men.linkType(_, "$external");
						men.externalUrl(_, vg.SOURCE(_));
					}
					return men;
				},
				"STAT": function(_, vg, admDb, menuItemEnt, application, filter, options) {
					var ft = filter || {};
					ft.jsonWhere = ft.jsonWhere || {};
					ft.jsonWhere.statName = vg.SOURCE(_);
					ft.jsonWhere.linkType = "$stats";
					//
					var men = _getMenuItem(_, vg, admDb, menuItemEnt, application, ft, options);
					if (men && men._isCreated) {
						men.linkType(_, "$stats");
						men.statName(_, vg.SOURCE(_));
					}
					if (men && (options.canUpdate.menu || men._isCreated)) {
						var pp = _getParameter(_, men, "portview");
						if (pp.value(_) !== vg.PORTVIEW(_)) {
							pp.value(_, vg.PORTVIEW(_));
							men._isModified = true;
						}
					}
					return men;
				}
			};


			function _updateFactory(_, inst, authProp) {
				if (inst && (canUpdate[authProp] || (inst._isCreated && canCreate[authProp])) && (inst.$factory !== true)) {
					inst.$factory = true;
					inst.$factoryOwner = factoryOwner;
					inst._isModified = true;
				}
			}

			function _processDiagsOk(allDiags) {
				var isOk = true;
				(allDiags || []).forEach(function(dd) {
					if (dd.$severity !== "success" && dd.$severity !== "ok") diags.push(dd);
					if (dd.$severity === "error") isOk = false;
				});
				return isOk;
			}

			function _track(phase, detail, progress) {
				if (!tracker) return;
				tracker.phase = phase;
				tracker.phaseDetail = detail;
				tracker.progress = progress;
			}

			function _addDiag(severity, message) {
				diags.push({
					$severity: severity,
					$message: message
				});
				return false;
			}

			function _fillAllBlocks(_, block, blockMap) {
				if (!block) return;
				block.items(_).toArray(_).forEach_(_, function(_, it) {
					// it is subblock if supports items property
					if (it.items) {
						blockMap[it.code(_)] = it;
						_fillAllBlocks(_, it, blockMap);
					}
				});
			}

			function _getProperty(_, obj, prop) {
				var val = obj.getPropAllLocales(_, prop);
				return val && val[locale.current.toLowerCase()];
			}

			var justCreatedElts = [];

			function justCreated(_uuid) {
				return justCreatedElts.indexOf(_uuid) !== -1;
			}

			//
			function _makeModule(_, pp, menu) {
				var codeFilter = prefix + menu.CODMEN(_);
				var mods = admDb.fetchInstances(_, modEnt, {
					jsonWhere: {
						code: {
							$regex: codeFilter + "$"
						}
					}
				});
				var mod;
				if (mods.length === 1) {
					mod = mods[0];
				} else if (mods.length > 1) {
					throw new Error(locale.formatLocale(currentLoc, module, "severalModules", codeFilter));
				}

				var mCode = modPrefix + menu.CODMEN(_);
				var isCreated = false;
				if (!mod && canCreate.module) {
					mod = modEnt.createInstance(_, admDb);
					// Create new modules with the correct prefix according to factory settings
					mod.code(_, codePrefix + menu.CODMEN(_));
					mod.application(_, self.endpoint(_).applicationRef(_));
					mod._isCreated = true;
					isCreated = true;
					justCreatedElts.push(mod.$uuid);
				}
				if (mod && (canUpdate.module || (isCreated && canCreate.module) || justCreated(mod.$uuid)) && (_getProperty(_, mod, 'title') !== menu.LIBMENU(_))) {
					mod.title(_, menu.LIBMENU(_));
					mod._isModified = true;
				}
				if (self.setAsFactory(_)) _updateFactory(_, mod, "module");
				_track(locale.formatLocale(currentLoc, module, "importPhase"), menu.CODMEN(_), 0);
				var miscBlock = null;
				(menu._children || []).some_(_, function(_, submen) {
					if (submen.FONCTION(_) === "MENU") _makeSubmodule(_, mod, submen);
					else {
						var miscBlocks = admDb.fetchInstances(_, blockEnt, {
							jsonWhere: {
								code: {
									$regex: codeFilter + "_MISC$"
								}
							}
						});
						if (miscBlocks.length === 1) {
							miscBlock = miscBlocks[0];
						} else if (miscBlocks.length > 1) {
							throw new Error(locale.formatLocale(currentLoc, module, "severalBlocks", codeFilter + "_MISC"));
						}

						var miscCode = mCode + "_MISC";
						if (!miscBlock && canCreate.submodule) {
							miscBlock = blockEnt.createInstance(_, admDb);
							miscBlock.code(_, miscCode);
							miscBlock.application(_, self.endpoint(_).applicationRef(_));
							miscBlock._isCreated = true;
							justCreatedElts.push(miscBlock.$uuid);
						}
						if (miscBlock && mod && (canUpdate.submodule || (miscBlock._isCreated && canCreate.submodule) || justCreated(miscBlock.$uuid)) && (_getProperty(_, miscBlock, 'title') !== mod.title(_))) {
							miscBlock.title(_, mod.title(_));
							miscBlock._isModified = true;
						}
						if (self.setAsFactory(_)) _updateFactory(_, miscBlock, "submodule");
						miscBlock && _makeMenuEntry(_, miscBlock, submen, mod);
					}
					return tracker && tracker.abortRequested;
				});
				var res, dd;
				if (miscBlock && (miscBlock._isModified || miscBlock._isCreated)) {
					miscBlock.$updUser = userName;
					res = miscBlock.save(_, null, {
						shallowSerialize: true
					});
					dd = [];
					miscBlock.getAllDiagnoses(_, dd, {
						addPropName: true,
						addEntityName: true
					});
					if (_processDiagsOk(dd)) {
						diags.push({
							$severity: "success",
							$message: locale.formatLocale(currentLoc, module, "submoduleModified", miscBlock.title(_))
						});
					} else {
						dd.forEach(function(diag) {
							diags.push(diag);
						});
						miscBlock = null;
					}
				}
				if (mod) {
					if (miscBlock && miscBlock._isCreated && mod) {
						mod.submodules(_).set(_, miscBlock);
						mod._isModified = true;
					}
					// save AFTER children creation
					if (mod._isModified || isCreated) {
						mod.$updUser = userName;
						res = mod.save(_, null, {
							shallowSerialize: true
						});
						dd = [];
						mod.getAllDiagnoses(_, dd, {
							addPropName: true,
							addEntityName: true
						});
						if (_processDiagsOk(dd)) {
							diags.push({
								$severity: "success",
								$message: isCreated ? locale.formatLocale(currentLoc, module, "moduleCreated", mod.title(_)) : locale.formatLocale(currentLoc, module, "moduleModified", mod.title(_))
							});
						} else {
							dd.forEach(function(diag) {
								diags.push(diag);
							});
							mod = null;
						}
					}
					//
					if (mod && mod._isCreated && pp && !pp.modules(_).get(_, mod.$uuid)) {
						pp.modules(_).set(_, mod);
						pp._isModified = true;
					}
				}
			}

			function _makeSubmodule(_, mod, menu) {
				var codeFilter = prefix + menu.CODMEN(_);
				var blocks = admDb.fetchInstances(_, blockEnt, {
					jsonWhere: {
						code: {
							$regex: codeFilter + "$"
						}
					}
				});
				var block;
				if (blocks.length === 1) {
					block = blocks[0];
				} else if (blocks.length > 1) {
					throw new Error(locale.formatLocale(currentLoc, module, "severalBlocks", codeFilter));
				}

				var sCode = blockPrefix + menu.CODMEN(_);
				var isCreated = false;
				var _allBlocks = {};
				if (!block) {
					if (canCreate.submodule) {
						block = blockEnt.createInstance(_, admDb);
						block.code(_, sCode);
						block.application(_, self.endpoint(_).applicationRef(_));
						block._isCreated = true;
						isCreated = true;
						justCreatedElts.push(block.$uuid);
					}
				} else _fillAllBlocks(_, block, _allBlocks);
				if (block) {
					if ((canUpdate.submodule || (isCreated && canCreate.submodule) || justCreated(block.$uuid)) && (_getProperty(_, block, 'title') !== menu.LIBMENU(_))) {
						block.title(_, menu.LIBMENU(_));
						block._isModified = true;
					}
					if (self.setAsFactory(_)) _updateFactory(_, block, "submodule");
				}
				//
				(menu._children || []).some_(_, function(_, submen) {
					if (submen.FONCTION(_) === "MENU") _makeBlock(_, block, _allBlocks, submen, mod);
					else _makeMenuEntry(_, block, submen, mod);
					return tracker && tracker.abortRequested;
				});
				//
				if (block && (block._isModified || isCreated)) {
					block.$updUser = userName;
					block.save(_, null, {
						shallowSerialize: true
					});
					var dd = [];
					block.getAllDiagnoses(_, dd, {
						addPropName: true,
						addEntityName: true
					});
					if (_processDiagsOk(dd)) {
						diags.push({
							$severity: "success",
							$message: isCreated ? locale.formatLocale(currentLoc, module, "submoduleCreated", block.title(_)) : locale.formatLocale(currentLoc, module, "submoduleModified", block.title(_))
						});
					} else {
						dd.forEach(function(diag) {
							diags.push(diag);
						});
						block = null;
					}
				}
				if (block && block._isCreated && mod && !mod.submodules(_).get(_, block.$uuid)) {
					mod.submodules(_).set(_, block);
					mod._isModified = true;
				}
			}

			function _makeBlock(_, parentBlock, _submoduleBlocks, menu, mod) {
				var codeFilter = prefix + menu.CODMEN(_);
				var blocksKeys = _submoduleBlocks && Object.keys(_submoduleBlocks).filter_(_, function(_, key) {
					return _submoduleBlocks[key].code(_).search(codeFilter + "$") !== -1;
				});
				var block;
				if (blocksKeys.length === 1) {
					block = _submoduleBlocks[blocksKeys[0]];
				} else if (blocksKeys.length > 1) {
					throw new Error(locale.formatLocale(currentLoc, module, "severalSubBlocks", codeFilter, parentBlock.code(_)));
				}
				var bCode = blockPrefix + menu.CODMEN(_);
				var isCreated = false;
				if (!block && canCreate.block) {
					block = subBlockEnt.createInstance(_, admDb);
					block.code(_, bCode);
					block.application(_, self.endpoint(_).applicationRef(_));
					block._isCreated = true;
					justCreatedElts.push(block.$uuid);
					//
					if (_submoduleBlocks) _submoduleBlocks[bCode] = block;
					//
					isCreated = true;
				}
				if (block) {
					if ((canUpdate.block || (isCreated && canCreate.block) || justCreated(block.$uuid)) && (_getProperty(_, block, 'title') !== menu.LIBMENU(_))) {
						block.title(_, menu.LIBMENU(_));
						block._isModified = true;
					}
					if (self.setAsFactory(_)) _updateFactory(_, block, "block");
					if (parentBlock && block._isCreated && !parentBlock.items(_).get(_, block.$uuid)) {
						parentBlock.items(_).set(_, block);
						parentBlock._isModified = true;
					}
				}
				//
				(menu._children || []).some_(_, function(_, submen) {
					if (submen.FONCTION(_) === "MENU") _makeBlock(_, block, _submoduleBlocks, submen, mod);
					else _makeMenuEntry(_, block, submen, mod);
					return tracker && tracker.abortRequested;
				});
				if (block) {
					if (block._isModified || isCreated) parentBlock._isModified = true;
					//
					var dd = [];
					block.getAllDiagnoses(_, dd, {
						addPropName: true,
						addEntityName: true
					});
					_processDiagsOk(dd);
				}
			}

			function _makeMenuEntry(_, parentBlock, menu, mod) {
				// TODO: should change this code also but we need an update script first !!!
				var mCode = codePrefix + menu.FONCTION(_);
				var mi = admDb.fetchInstance(_, menuItemEnt, {
					jsonWhere: {
						linkType: "$function",
						fusionFunction: menu.FONCTION(_),
						application: self.endpoint(_).applicationRef(_).$uuid
					}
				});
				var isCreated = false;
				var updateMessage = null,
					moduleMessage = null;
				if (!mi && canCreate.menu) {
					if (self.importMode(_) === "update") return;
					mi = menuItemEnt.createInstance(_, admDb);
					mi.code(_, mCode);
					mi.application(_, self.endpoint(_).applicationRef(_));
					mi.description(_, menu.FONCTION(_));
					mi.linkType(_, "$function");
					mi.fusionFunction(_, menu.FONCTION(_));
					mi._isCreated = true;
					isCreated = true;
					justCreatedElts.push(mi.$uuid);
				}

				if (mi) {
					if (canUpdate.menu || (isCreated && canCreate.menu) || justCreated(mi.$uuid)) {
						var miTitle = menu.LIBMENU(_);
						if (!miTitle) {
							miTitle = menu.FONCTION(_);
							diags.push({
								$severity: "warning",
								$message: locale.formatLocale(currentLoc, module, "codeInsteadTitle", menu.FONCTION(_))
							});
						}
						if (_getProperty(_, mi, 'title') !== miTitle) {
							//tracer && tracer("getProperty '" + _getProperty(_, mi, 'title') + "' different of '" + miTitle);
							updateMessage = locale.formatLocale(currentLoc, module, "menuModified", mi.code(_), mi.title(_), miTitle);
							mi.title(_, miTitle);
							mi._isModified = true;
						}
						if (mod && (!mi.module(_) || (mi.module(_).$uuid !== mod.$uuid))) {
							moduleMessage = locale.formatLocale(currentLoc, module, "menuModuleModified", mi.code(_));
							mi.module(_, mod);
							mi._isModified = true;
						}
						if (self.setAsFactory(_)) _updateFactory(_, mi, "menu");
					}
					//
					if (mi._isModified || isCreated) {
						mi.$updUser = userName;
						mi.save(_, null, {
							shallowSerialize: true
						});
						var dd = [];
						mi.getAllDiagnoses(_, dd, {
							addPropName: true,
							addEntityName: true
						});
						if (_processDiagsOk(dd)) {
							if (isCreated) {
								diags.push({
									$severity: "success",
									$message: locale.formatLocale(currentLoc, module, "menuCreated", mi.title(_), mi.code(_))
								});
							} else {
								updateMessage && diags.push({
									$severity: "success",
									$message: updateMessage
								});
								moduleMessage && diags.push({
									$severity: "success",
									$message: moduleMessage
								});
							}
						} else {
							dd.forEach(function(diag) {
								diags.push(diag);
							});
							mi = null;
						}
					}
					if (mi && isCreated && parentBlock && !parentBlock.items(_).get(_, mi.$uuid)) {
						parentBlock.items(_).set(_, mi);
						parentBlock._isModified = true;
					}
				}
			}
			var currentLoc = locale.current;
			// initialize
			var self = this;
			var sp = globals.context.session && globals.context.session.getSecurityProfile(_);
			var userName = (globals.context && globals.context.session && globals.context.session.sessionInfo && globals.context.session.sessionInfo.userName(_));
			var hasFactoryRights = sp.hasFactoryRights(_);
			var factoryOwner = sp.factoryOwner(_);
			var admDb = self._db;
			var modEnt = admDb.getEntity(_, "menuModule");
			var blockEnt = admDb.getEntity(_, "menuBlock");
			var subBlockEnt = admDb.getEntity(_, "menuSubblock");
			var menuItemEnt = admDb.getEntity(_, "menuItem");
			var navPageEnt = admDb.getEntity(_, "navigationPage");


			var x3folderIsoLangs = [];
			var db = self.endpoint(_).getOrm(_);

			try {
				x3folderIsoLangs = getX3FolderLangs(_, db);
			} catch (e) {
				console.error(e.stack);
				diags.push({
					$severity: "warning",
					$message: locale.formatLocale(currentLoc, module, "repAdossierMissing", self.endpoint(_).dataset(_), e.message)
				});
			}

			var allLocalesFilter = {
				jsonWhere: {
					enabled: true
				}
			};
			if (x3folderIsoLangs.length > 0) {
				allLocalesFilter.jsonWhere.code = {
					$in: x3folderIsoLangs
				};
			}
			var locales = self.allLocales(_) ? admDb.fetchInstances(_, admDb.getEntity(_, "localePreference"), allLocalesFilter) : self.locales(_).toArray(_, true);
			var canCreate = {};
			var canUpdate = {};
			switch (self.importMode(_)) {
				case "insert":
				case "insertUpdate":
					canCreate.module = true;
					canCreate.submodule = true;
					canCreate.block = true;
					canCreate.menu = true;
					break;
				case "insertUpdateMenu":
					canCreate.menu = true;
					break;
			}
			switch (self.importMode(_)) {
				case "update":
				case "insertUpdate":
					canUpdate.module = true;
					canUpdate.submodule = true;
					canUpdate.block = true;
					canUpdate.menu = true;
					break;
				case "insertUpdateMenu":
					canUpdate.menu = true;
					break;
			}

			// Rather complex setting of code/block prefix due to inconsistencies in naming
			var app = self.endpoint(_).applicationRef(_);
			var codePrefix = null;
			var modPrefix = null;
			var blockPrefix = null;
			var prefix = app.application(_).toUpperCase() + "_" + app.contract(_).toUpperCase() + "_";
			if (self.setAsFactory(_)) {
				if (factoryOwner === "SAGE") {
					codePrefix = "STD_" + prefix;
					modPrefix = "STD_" + prefix;
					blockPrefix = "STD_" + prefix;
				} else {
					codePrefix = "VER_" + prefix;
					modPrefix = "VER_" + prefix;
					blockPrefix = "VER_" + prefix;
				}
			} else {
				codePrefix = "SPE_" + prefix;
				modPrefix = "SPE_" + prefix;
				blockPrefix = "SPE_" + prefix;
			}
			// start
			//			var profileEnt = db.getEntity(_, "ALISTMENUS", "$details");
			var profileEnt = db.getEntity(_, "ALISTMENUSL", "$bulk");
			var vignEnt = db.getEntity(_, "AVIGLIST", "$query");
			//
			var page = null;
			if (self.pageName(_)) {
				page = admDb.fetchInstance(_, navPageEnt, {
					jsonWhere: {
						pageName: self.pageName(_)
					}
				});
				if (!page) {
					page = navPageEnt.createInstance(_, admDb);
					page.pageName(_, self.pageName(_));
					page.title(_, self.pageName(_));
					if (self.setAsFactory(_)) {
						page.$factory = true;
						page.$factoryOwner = factoryOwner;
					}
				}
			}

			locales.sort_(_, function(_, prev, curr) {
				// Sort locales alphabetically, always pushing en-us to the top
				var a = prev.code(_).toLowerCase();
				var b = curr.code(_).toLowerCase();
				if (a === "en-us") return -1;
				if (b === "en-us") return 1;
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			}).some_(_, function(_, loc) {
				//
				var menus = {};
				//var functions = {};
				//
				locale.setCurrent(_, loc.code(_));
				tracer && tracer("ImportMenuProfile: Importing locale: " + loc.code(_) + "; locale.current is : " + locale.current);
				_track(locale.formatLocale(currentLoc, module, "extractLocale", loc.code(_)), "", 0);
				diags.push({
					$severity: "info",
					$message: locale.formatLocale(currentLoc, module, "extractLocale", loc.code(_))
				});
				var crs;
				//
				// extract menus ====================
				if (self.importMenu(_)) {
					//
					/*				var profile = db.fetchInstance(_, profileEnt, "0~" + self.profileCode(_));
					// make tree first pass: menus map
					var allMenus = profile.APFMENUS(_).toArray(_);*/
					var allMenus = [];
					var men;
					crs = db.createCursor(_, profileEnt, {
						sdataWhere: "(CODPRF eq '" + self.profileCode(_) + "')"
					});
					while ((men = crs.next(_))) allMenus.push(men);
					//
					allMenus.some_(_, function(_, men) {
						var fct = men.FONCTION(_);
						var menuCode = men.CODMEN(_);
						if (!fct) return _addDiag("warning", locale.formatLocale(currentLoc, module, "noFunction", men.LIBMENU(_)));
						if (fct === "MENU") {
							if (!menuCode) return _addDiag("warning", locale.formatLocale(currentLoc, module, "noMenuCode", men.LIBMENU(_)));
							menus[menuCode] = men;
						}
						//else entries[fct] = men;
						//
						return tracker && tracker.abortRequested;
					});
					// generate tree structure
					allMenus.some_(_, function(_, men) {
						var parent = men.MENU(_);
						if (parent && menus[parent])(menus[parent]._children = menus[parent]._children || []).push(men);
						return tracker && tracker.abortRequested;
					});
					// import
					Object.keys(menus).some_(_, function(_, menKey) {
						var men = menus[menKey];
						// if no parent - module
						if (men.MENU(_) !== self.baseMenuName(_)) return;
						_makeModule(_, page, men);
						//
						return tracker && tracker.abortRequested;
					});
					if (page && page._isModified) {
						page.$updUser = userName;
						page.save(_, null, {
							shallowSerialize: true
						});
						var dd = [];
						page.getAllDiagnoses(_, dd, {
							addPropName: true,
							addEntityName: true
						});
						if (_processDiagsOk(dd)) {
							diags.push({
								$severity: "success",
								$message: locale.formatLocale(currentLoc, module, "pageModified", page.title(_))
							});
						}
					}
				}
				//
				// extract vignettes =======================
				if (self.importVignettes(_)) {
					// allVignettes array add for easier debugging
					var vignette, allVignettes = [];
					crs = db.createCursor(_, vignEnt, {});
					while ((vignette = crs.next(_))) {
						allVignettes.push(vignette);
					}
					//while (vg = crs.next(_)) {
					allVignettes.forEach_(_, function(_, vg) {
						if (vg.TYP(_) && _menuTypesMap[vg.TYP(_)]) {
							var filter = {};
							var mi = _menuTypesMap[vg.TYP(_)](_, vg, admDb, menuItemEnt, self.endpoint(_).applicationRef(_), filter, {
								diags: diags,
								prefix: codePrefix,
								canCreate: canCreate,
								canUpdate: canUpdate,
								hasFactoryRights: hasFactoryRights,
								factoryOwner: factoryOwner
							});
							if (self.setAsFactory(_)) _updateFactory(_, mi, "menu");
							//
							if (mi && (mi._isModified || mi._isCreated)) {
								mi.$updUser = userName;
								mi.save(_, null, {
									shallowSerialize: true
								});
								var dd = [];
								mi.getAllDiagnoses(_, dd, {
									addPropName: true,
									addEntityName: true
								});
								if (_processDiagsOk(dd)) {
									diags.push({
										$severity: "success",
										$message: mi._isCreated ? locale.formatLocale(currentLoc, module, "menuCreated", mi.title(_), mi.code(_)) : locale.formatLocale(currentLoc, module, "menuModified", mi.code(_), mi.title(_), mi.title(_))
									});
								} else {
									diags.push({
										$severity: "error",
										$message: locale.formatLocale(currentLoc, module, "menuImportFailure", mi.title(_), mi.code(_))
									});
								}
							}
						}
					});
				}
				//
				diags.push({
					$severity: "info",
					$message: locale.formatLocale(currentLoc, module, "extractLocaleFinished", loc.code(_))
				});
				//
				return tracker && tracker.abortRequested;
			});
		},

		scheduledExecute: function(_, diags) {
			this.importMenuProfile(_, diags);
		}
	},
	$services: {
		import: {
			$title: "Import",
			$method: "POST",
			$isMethod: true,
			$permanent: true,
			$invocationMode: "async",
			$capabilities: "abort",
			$execute: function(_, context, instance, params) {
				var tt = context && context.tracker;
				var diags = tt ? (tt.$diagnoses = tt.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				instance.importMenuProfile(_, diags, tt);
			}
		},
		schedule: {
			$method: "POST",
			$title: "Schedule Import",
			$isMethod: true,
			$parameters: {
				$actions: {
					$select: {
						$url: "{$baseUrl}/automates?representation=automate.$select"
					}
				}
			},
			//			$urlParameters: "scheduler={schedulerId}",
			$execute: function(_, context, instance, parameters) {
				if (!parameters || !parameters.$select) {
					return;
				}
				parameters.$select.forEach_(_, function(_, s) {
					var a = instance._db.fetchInstance(_, instance._db.getEntity(_, "automate"), s.$uuid);
					if (!a) {
						return;
					}
					var diag = a.defineNewTask(_, locale.format(module, "menuProfileImportLabel"), instance);
					if (diag.some(function(d) {
							d = _normalizeDiag(d);
							return d.$severity === "error";
						})) {
						diag.forEach(function(d) {
							d = _normalizeDiag(d);
							instance.$addDiagnose(d.$severity, d.$message);
						});
					} else {
						instance.$addDiagnose("success", locale.format(module, "taskCreated", a.description(_)));
					}
				});
			}
		}

	}
};