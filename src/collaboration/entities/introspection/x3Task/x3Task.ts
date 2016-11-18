"use strict";

var globals = require('streamline-runtime').globals;
var config = require('config'); // must be first syracuse require
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
var locale = require('streamline-locale');
var SYRACUSRMNG = "SYRACUSRMNG";

exports.entity = {
	$isPersistent: false,
	$canSave: false,
	$titleTemplate: "X3 Schedule action",
	$descriptionTemplate: "Administration task to schedule X3 action",
	$properties: {
		className: {
			$title: "Entity",
			$description: "name of X3 class",
			$type: "string",
			$isMandatory: true,
			$propagate: function(_, instance, val) {
				if (val) {
					try {
						//We remove the previous diagnoses because these are from an non-existant entity which cause
						//the user to change to this new entity maybe existent, and old diagnoses could be misleading
						instance.$diagnoses = [];
						if (!(instance.className(_) && instance.getX3Entity(_))) {
							throw new Error(locale.format(module, "badX3Class", val, instance.endpoint(_).description(_)));
						}
					} catch (e) {
						console.error(e.stack);
						instance.$diagnoses = instance.$diagnoses || [];
						if (instance.className(_) === SYRACUSRMNG) {
							instance.$diagnoses.push({
								$severity: "warning",
								$message: locale.format(module, "syracusrmng", SYRACUSRMNG)
							});
						} else {
							instance.$diagnoses.push({
								$severity: "error",
								$message: locale.format(module, "badX3Class", val, instance.endpoint(_).description(_)),
								$stackTrace: e.stack
							});
						}
					}
				}
			}
		},

		representation: {
			$title: "Representation",
			$description: "name of x3 representation (if different from X3 class)",
			$type: "string",
			$isDisabled: false,
			$isHidden: false
		},
		facet: {
			$title: "facet",
			$description: "facet of the entity",
			$enum: [{
				$value: "$edit",
				$title: "edit"
			}, {
				$value: "$detail",
				$title: "detail"
			}, {
				$value: "$query",
				$title: "query"
			}],
			$default: "$edit",
			$isHidden: true, //TODO check if we can call method to non edit facet
			$isDisabled: function(_, instance) {
				return !instance.className(_) || !instance._x3Entity;
			}
		},
	},
	$relations: {
		endpoint: {
			$title: "Endpoint",
			$type: "endPoint",
			$isMandatory: true,
			$lookupFilter: function(_, instance) {
				var userProf = globals.context.session.data.userProfile;
				var items = [];
				userProf.user(_).getUserEndpointsList(_, userProf.selectedRole(_) && userProf.selectedRole(_).$uuid).forEach_(_, function(_, ep) {
					if (ep.protocol(_) === "x3")
						items.push({
							$uuid: ep.$uuid
						});
				});
				if (items.length) return {
					$or: items
				};
				else return {
					$uuid: {
						$in: []
					}
				};
			},
			$propagate: function(_, instance, val) {
				try {
					instance.className(_) && instance.getX3Entity(_);
					instance.$diagnoses = [];
				} catch (e) {
					instance.resetField(_);
				}
			}

		},
		actionName: {
			$title: "X3 Action Name",
			$type: "x3ClassAction",
			$isChild: true,
			$isMandatory: true,
			$lookup: {
				entity: "x3ClassAction",
				field: "action",
				parameters: "class={className}&rep={representation}&facet={facet}&ep={endpoint}"
			},

			$isDisabled: function(_, instance) {
				return !instance.className(_) || !instance._x3Entity;
			},
			$propagate: function(_, instance, val) {
				if (val) {
					var params = instance.parameters(_);
					params.reset(_);
					var dbAdmin = adminHelper.getCollaborationOrm(_);

					var model = dbAdmin.model;
					var entityParamAction = model.getEntity(_, "x3ClassActionParam");
					var entityParamActionDate = model.getEntity(_, "x3ClassActionDateParam");
					var template = instance.actionName(_).parameters(_);
					if (template) {
						template = JSON.parse(template);
						for (var k in template) {
							// create param date or normal param
							var inst;
							if (template[k] !== "application/x-date") {
								inst = entityParamAction.factory.createInstance(_, null, dbAdmin);
							} else {
								inst = entityParamActionDate.factory.createInstance(_, null, dbAdmin);
							}
							inst.name(_, k);
							inst.type(_, template[k]);
							params.set(_, inst);

						}
					}
				}
			}
		},
		parameters: {
			$title: "Parameters",
			$isPlural: true,

			$variants: {
				x3ClassActionParam: {
					$title: "parameter",
					$type: "x3ClassActionParam",
					$isChild: true
				},
				x3ClassActionDateParam: {
					$title: "parameter",
					$type: "x3ClassActionDateParam",
					$isChild: true
				}
			},
			$isHidden: function(_, instance) {
				return instance.parameters(_).toArray(_).length === 0;
			}
		}

	},
	$init: function(_, instance) {
		instance.runInProgress = false;

		var userProf = globals.context.session.getUserProfile(_);
		var endpointSelected = userProf && userProf.selectedEndpoint(_);
		instance.endpoint(_, endpointSelected);

		// Populate the list of available endpoints according to teh currently selected role
		//		instance.endpoints(_).reset(_);
		//		userProf.user(_).getUserEndpointsList(_, userProf.selectedRole(_) && userProf.selectedRole(_).$uuid).forEach_(_, function(_, ep) {
		//			instance.endpoints(_).set(_, ep);
		//		});
	},
	$functions: {
		resetField: function(_) {
			this.className(_, "");
			this.representation(_, "");
			this.actionName(_) && this.actionName(_).deleteSelf(_);
			this.actionName(_, null);
			this.parameters(_).reset(_);

		},
		getX3Entity: function(_, notCompute) {
			if (!notCompute || !this._x3Entity) {
				var db = this.endpoint(_).getOrm(_);
				this._x3Entity = db.getEntity(_, this.className(_), this.facet(_));
			}
			return this._x3Entity;

		},
		execTask: function(_, diags) {
			// call the X3 function link ot a endpoint
			if (this.endpoint(_)) {
				var db = this.endpoint(_).getOrm(_);
				// grab parameters
				var params = this.parameters(_).toArray(_);


				var paramObject = undefined;
				if (params.length) {
					paramObject = {};
					params.forEach_(_, function(_, param) {
						//console.log("P " + param.name(_) + " " + param.value(_) + " " + param.type(_));
						paramObject[param.name(_)] = param.value(_);
					});
				}

				try {
					var entity = this.getX3Entity(_, true);

					var r = db.postAction(_, this.actionName(_), entity, this.facet(_), paramObject, this.representation(_));
					if (r && r.body && r.body.$diagnoses) {
						r.body.$diagnoses.forEach(function(diag) {
							diags.push(diag);
						});
					}
				} catch (e) {
					console.error("Error " + e);
					diags.push({
						$severity: "error",
						$message: "" + e,
						$stackTrace: e.stack
					});
				}
			}

		},
		scheduledExecute: function(_, diags) {
			this.execTask(_, diags);
		}
	},

	$services: {
		run: {
			$method: "POST",
			$title: "Execute now",
			$isMethod: true,
			$isDisabled: function(_, instance) {
				return instance.runInProgress;
			},
			$parameters: {},
			//			$urlParameters: "scheduler={schedulerId}",
			$execute: function(_, context, instance, parameters) {
				instance.runInProgress = true;
				instance.$diagnoses = instance.$diagnoses || [];
				instance.execTask(_, instance.$diagnoses);
				instance.runInProgress = false;
			}
		},
		schedule: {
			$method: "POST",
			$title: "Schedule action",
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
					function existsError(d) {
						return d.$severity === "error";
					}

					var a = instance._db.fetchInstance(_, instance._db.getEntity(_, "automate"), s.$uuid);
					if (!a) {
						return;
					}

					var diag = a.defineNewTask(_, locale.format(module, "taskLabel"), instance);
					diag.forEach(function(d) {
						instance.$addDiagnose(d.$severity, d.$message);
					});
					if (!diag.some(existsError)) {
						instance.$addDiagnose("success", locale.format(module, "taskCreated", a.description(_)));
					}
				});
			}
		}
	}
};