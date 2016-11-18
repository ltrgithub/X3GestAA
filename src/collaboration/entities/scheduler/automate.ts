"use strict";

var locale = require('streamline-locale');
var datetime = require('@sage/syracuse-core').types.datetime;
var globals = require('streamline-runtime').globals;


// this object has the UUID's of the scheduled instances as keys and the corresponding timers as values. So it is possible to
// detect whether an instance has already been scheduled, and it will not be executed twice. When an automate is saved (and therefore
// scheduled) and it is already in a timer, the first timer will be deleted.
// This is some kind of workaround - the final solution should be to delegate all scheduling to the scheduler and just compute the
// new scheduling times (and not use setTimeout here). This will require also changes in objectActionsRunner and other code.
// This is necessary in spite of _timerId, because when an instance is changed and saved again, it will be a new object, and _timerId
// is not available any more, but it will still be available in the global object scheduledInstances.
var scheduledInstances = {};

// this object has the UUID's of the scheduled instances as keys and the corresponding timers as values. So it is possible to
// detect whether an instance has already been scheduled, and it will not be executed twice. When an automate is saved (and therefore
// scheduled) and it is already in a timer, the first timer will be deleted.
// This is some kind of workaround - the final solution should be to delegate all scheduling to the scheduler and just compute the
// new scheduling times (and not use setTimeout here). This will require also changes in objectActionsRunner and other code.
// This is necessary in spite of _timerId, because when an instance is changed and saved again, it will be a new object, and _timerId
// is not available any more, but it will still be available in the global object scheduledInstances.
var scheduledInstances = {};

function _automateRun(automate, ctx) {
	// I'm here because of the timer event so remove the id
	automate._timerId = null;
	//
	globals.withContext(function() {
		automate.run(!_);
	}, ctx)();
}

exports.entity = {
	//	_tracer: console.log,
	$titleTemplate: "Automate",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Scheduler",
	$properties: {
		description: {
			$title: "Automate",
			$isMandatory: true,
			$linksToDetails: true,
			$isLocalized: true
		},
		lastStart: {
			$title: "Last started",
			$type: "datetime",

			$isNullable: true,
			$isDisabled: true
		},
		lastEnd: {
			$title: "Last ended",
			$type: "datetime",

			$isNullable: true,
			$isDisabled: true
		},
		status: {
			$title: "Status",
			$enum: [{
				$value: "inactive",
				$title: "Planned"
			}, {
				$value: "running",
				$title: "Running"
			}, {
				$value: "error",
				$title: "Error"
			}, ],
			$default: "inactive",
			$isDisabled: true
		}
	},
	$relations: {
		automateEvents: {
			$title: "Events",
			$type: "automateEvents",
			$isChild: true
		},
		automateTasks: {
			$title: "Tasks",
			$type: "automateTasks",
			$capabilities: "sort,reorder,delete",
			$isChild: true
		}
	},
	$links: {
		serverLogs: {
			$title: "Server logs",
			"$url": "{$baseUrl}/serverLogs?representation=serverLog.$query&where=(automate eq '{$uuid}')&orderBy=logDate desc",
			"$method": "GET"
		}
	},
	$functions: {
		// adds a new automate task with given description and instance and fills in the data of the current user
		// optional parameters: array of diagnostic messages and log level (unless "error")
		// returns array of diagnostic messages
		defineNewTask: function(_, description, instance, diag, logLevel) {
			var t = this.automateTasks(_).add(_);
			t.description(_, description);
			t.logLevel(_, logLevel || "all");
			t.process(_, instance);
			var userProfile = globals.context.session.getUserProfile(_);
			t.user(_, userProfile.user(_));
			t.role(_, userProfile.selectedRole(_));
			t.locale(_, userProfile.selectedLocale(_));
			//t.save(_);
			this.save(_);
			var diag = [];
			this.getAllDiagnoses(_, diag, {
				addPropName: true,
				addEntityName: true
			});
			return diag;
		},

		scheduleNextRun: function(_) {
			var tracer = this.getEntity(_)._tracer;
			if (this._timerId) {
				tracer && tracer("automate.scheduleNextRun: clearing timer");
				this.clearTimer();
			}
			// min
			var nextRun = this.automateEvents(_).toArray(_).map_(_, function(_, e) {
				return e.suspended(_) ? null : e.nextRun(_);
			}).reduce_(_, function(_, prev, e) {
				return (!e || (prev && (prev.compare(e) < 0)) ? prev : e);
			}, null);
			//
			tracer && tracer("automate.scheduleNextRun: computed next run: " + (nextRun ? nextRun.toString() : "null"));
			var diff = nextRun && nextRun.millisDiff(datetime.now());
			if (this.$uuid in scheduledInstances) {
				clearTimeout(scheduledInstances[this.$uuid]);
				scheduledInstances[this.$uuid] = this._timerId = undefined; // do not delete key - new value will be assigned very soon
			}
			if (diff) {
				if (diff > 0) this._timerId = setTimeout(_automateRun, diff, this, globals.context);
				else
				// small timer to be sure that the next run won't be computed the same ms
					this._timerId = setTimeout(_automateRun, 100, this, globals.context);
				//this.run(_);
				tracer && tracer("automate.scheduleNextRun: timer delay: " + diff);
			}
			scheduledInstances[this.$uuid] = this._timerId;
		},
		clearTimer: function() {
			this._timerId && clearTimeout(this._timerId);
			delete scheduledInstances[this.$uuid];
			//
			delete this._timerId;
		},
		run: function(_, diagnoses, track, sameSession) { // track: track some information. If there is an error during automate execution, the error is returned
			// var beginning = Date.now();
			// console.log("SCH 1 " + beginning, new Error().stack);
			var tracer = this.getEntity(_)._tracer;
			var error;
			var self = this;
			tracer && tracer("Scheduler running: start");
			self.status(_, "running");
			self.lastStart(_, datetime.now());
			self.save(_);
			// console.log("SCH 1a " + (Date.now() - beginning));
			track && track(locale.format(module, "trackRun"), 1);
			//
			try {
				self.automateTasks(_).toArray(_).forEach_(_, function(_, t) {
					// console.log("SCH 1x " + (Date.now() - beginning));
					if (!t.suspended(_)) t.run(_, diagnoses, !sameSession);
				});
				//
				track && track(locale.format(module, "trackOK"), 99);
				self.status(_, "inactive");
			} catch (e) {
				track && track(locale.format(module, "trackError"), 99);
				// console.log("SCH 1y " + (Date.now() - beginning));
				self.status(_, "error");
				error = e;
				diagnoses && diagnoses.push({
					$severity: "error",
					$message: e.message,
					$stackTrace: e.safeStack
				});
			}
			// console.log("SCH 1b " + (Date.now() - beginning));
			self.lastEnd(_, datetime.now());
			// update next run 
			self.automateEvents(_).toArray(_).forEach_(_, function(_, e) {
				// console.log("SCH 2a " + (Date.now() - beginning));
				e.nextRun(_, e.getNextRun(_));
			});
			self.save(_);
			// console.log("SCH 1c " + (Date.now() - beginning));
			self.getAllDiagnoses(_, diagnoses);
			track && track(locale.format(module, "trackFinished", self.status(_)), 100);
			// aftersave will schedule next run so commented here
			// scheduling at the end of the function will accumulate events for long executions: ok
			//self.scheduleNextRun(_);
			tracer && tracer("Scheduler running: end");
			return error;
		}
	},
	$events: {
		$afterSave: [

			function(_, instance) {
				// reschedule as timer events might have changed
				// don't reschedule running schedulers as next run of timer events might not have been computed yet -> errorneous schedule
				if (instance.status(_) !== "running") instance.scheduleNextRun(_);
			}
		]
	},
	$services: {
		executeNow: {
			$title: "Execute now",
			$method: "POST",
			$isMethod: true,
			$facets: ["$details", "$query"],
			$invocationMode: "async",
			$permanent: true,
			$overridesReply: true,
			$execute: function(_, context, instance) {
				var t = context && context.tracker;

				function _track(phase, progress) {
					if (t) {
						t.phase = phase;
						t.progress = progress;
					}
				}
				if (t) {
					t.phaseDetail = "-";
				}
				var diags = [];
				var diags = t ? (t.$diagnoses = t.$diagnoses || []) : (instance.$diagnoses = instance.$diagnoses || []);
				var diags2 = [];
				_track(locale.format(module, "trackStart"), 0);
				var error = instance.run(_, diags2, _track, true);
				diags2.forEach(function(diag) {
					diags.push(diag);
				});
				if (error) throw error;
				return instance;
			}
		}
	}
};