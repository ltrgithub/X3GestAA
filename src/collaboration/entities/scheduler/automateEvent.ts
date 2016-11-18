"use strict";

var time = require('@sage/syracuse-core').types.time;
var datetime = require('@sage/syracuse-core').types.datetime;

// only time events for now, extrapolate later
exports.entity = {
	$titleTemplate: "Event",
	$descriptionTemplate: "{description}",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true
		},
		eventType: {
			$title: "Event type",
			$enum: [{
				$value: "time",
				$title: "Time"
			}],
			$isMandatory: true,
			$default: "time"
		},
		everyDay: {
			$title: "Every day",
			$type: "boolean",
			$default: false
		},
		days: {
			$title: "Week days",
			$enum: [{
				$value: "monday",
				$title: "Monday"
			}, {
				$value: "tuesday",
				$title: "Tuesday"
			}, {
				$value: "wednesday",
				$title: "Wednesday"
			}, {
				$value: "thursday",
				$title: "Thursday"
			}, {
				$value: "friday",
				$title: "Friday"
			}, {
				$value: "saturday",
				$title: "Saturday"
			}, {
				$value: "sunday",
				$title: "Sunday"
			}, ],
			$isArray: true,
			$type: "string",
			$isDefined: function(_, instance) {
				return !instance.everyDay(_);
			},
			$default: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
			$sorted: true,
			$sort: function(a, b) {
				return datetime[a] - datetime[b];
			},
			$propagate: function(_, instance, val) {
				instance.nextRun(_, instance.getNextRun(_));
				// clear automate timer
				//instance._parent.scheduleNextRun(_);
			}
		},
		times: {
			$title: "Times",
			$isArray: true,
			$type: "time",
			defaultValue: function(_) {
				return [time.now()];
			},
			$sorted: true,
			$propagate: function(_, instance, val) {
				instance.nextRun(_, instance.getNextRun(_));
				// clear automate timer
				//instance._parent.scheduleNextRun(_);
			}
		},
		nextRun: {
			$title: "Next run",
			$type: "datetime",

			$isNullable: true,
			$isDisabled: true
		},
		suspended: {
			$title: "Suspended",
			$type: "boolean",
			$default: false
		}
	},
	$functions: {
		getNextRun: function(_, last) {
			if (!last) last = datetime.now().addSeconds(1);
			var l_time = last.time;
			var res;
			//
			var times = this.times(_);
			// day names to index conversion
			var days = this.days(_).map(function(d) {
				return datetime[d];
			});
			if (!times || !times.length || !days || !days.length) return null;
			//
			var nextTime;
			var i = 0;
			while (((nextTime = times[i++]).compare(l_time) <= 0) && (i < times.length)) {};
			if (nextTime.compare(l_time) <= 0) nextTime = times[0];
			//			console.log("getnextrun: (87): "+nextTime.toString()+"; "+l_time.toString());
			//
			var diff = nextTime.secondsDiff(l_time);
			//			console.log("diff: "+diff);
			if (diff < 0) res = last.addDays(1).addSeconds(diff);
			else res = last.addSeconds(diff);
			// check days list
			while (days.indexOf(res.weekDay) < 0)
				res = res.addDays(1);

			return res;
		}
	}
};