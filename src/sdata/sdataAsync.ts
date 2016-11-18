"use strict";
/* @flow */
/*:: 
import { SDataDiagnose, SDataLink } from "./types"; 
*/

var globals = require('streamline-runtime').globals;
var helpers = require('@sage/syracuse-core').helpers;
var locale = require('streamline-locale');
var config = require('config');
var EventEmitter = require('events').EventEmitter;
var httpClient = require('../../src/httpclient/httpClient');

var asyncRepliesTimeout = config && config.session && config.session.asyncTimeout;

function _finishNotify(_, statusCode, callbackUrl, err) {
	var resp = {};
	if (err) {
		resp.statusCode = statusCode;
		resp.error = err.message ? err.message : err;
	} else {
		resp.statusCode = 200;
		resp.ok = true;
	}
	var res = httpClient.httpRequest(_, {
		method: 'POST',
		url: callbackUrl,
		headers: {
			"content-type": "application/json",
		}
	}).end(JSON.stringify(resp)).response(_).readAll(_);
}

// TrackerResponse can get extra parameters when the result should not be computed again whenever a page is requested.
// This requires that the tracker is explicitly deleted using a DELETE request when it is not used any more.  
// managePaging: object (will be filled with internal data of the tracker). Optional attribute: "resources": contains the name of the element of the original response which contains the array of data. Default: "$resources".
// trackingId: ID of the tracker
class TrackerResponse {
	/*
	status: number;
	statusCode: ? number; // TODO: investigate status vs. statusCode;
	head : any;
	encoding: ? string;
	chunks : (string | Buffer)[];
	managePaging: any;
	keepReply: boolean;
	*/
	constructor(managePaging, trackingId) {
		this.status = 202;
		this.head = null;
		this.encoding = null;
		this.chunks = [];
		this.managePaging = managePaging;
		this.keepReply = false;
		if (managePaging) {
			managePaging.resources = managePaging.resource || "$resources";
			managePaging.trackngId = managePaging.trackngId || trackingId;
		}
	}
	writeHead(status, head) {
		this.status = status;
		this.head = head;
	}
	write(_, data, encoding) {
		this.encoding = encoding;
		this.chunks.push(data);
	}
	end(data, encoding) {
		this.encoding = encoding;
		if (data) this.chunks.push(data);
	}
	finish(err) {
		if (err) {
			console.log("ERR: " + err.stack);
			this.status = 500, this.head = {
				"content-type": "application/json"
			};
			this.encoding = "utf8";
			this.chunks = [JSON.stringify({
				$diagnoses: [{
					$severity: "error",
					$message: err.message ? err.message : err,
					$stackTrace: err.safeStack,
				}]
			})];
		} else {
			if (this.status === 202) { // only set status when it has not been explicitly set in writeHead function
				this.status = 200;
			}
		}
	}
	flush(_, response) {
		// headers["content-length"] = Buffer.byteLength(result, encoding);
		// transform contents back into object
		if (this.managePaging) {
			if (!this.managePaging.contentsObject) {
				var together = this.chunks.join('');
				this.managePaging.contentsObject = JSON.parse(together);
				// console.log("CONTENTS "+util.format(this.managePaging.contentsObject))
				this.managePaging.resourcesObject = this.managePaging.contentsObject[this.managePaging.resources];
				// console.log("C2223 "+util.format(this.managePaging.resourcesObject))
			}
			var url, count, startIndex, length = this.managePaging.resourcesObject.length;
			if (this.managePaging.parameters) {
				startIndex = this.managePaging.parameters.startIndex;
				count = this.managePaging.parameters.count;
				url = "/sdata/$trackers('" + this.managePaging.trackngId + "')";
			} else {
				startIndex = 1;
				count = this.managePaging.count || 20;
				url = "--";
			}
			if (length > count) {
				// create links and slices
				var links = {};
				if (startIndex > 1) {
					links.$first = _makeLink(url, 1, count);
				}
				if (startIndex + count <= length) {
					links.$next = _makeLink(url, startIndex + count, count);
				}
				this.managePaging.contentsObject.$links = links;
				this.managePaging.contentsObject[this.managePaging.resources] = this.managePaging.resourcesObject.slice(startIndex - 1, startIndex - 1 + count);
				// console.log("LINKS12 "+util.format(this.managePaging.contentsObject));
			} else {
				if ("$links" in this.managePaging.contentsObject) {
					delete this.managePaging.contentsObject.$links;
					this.managePaging.contentsObject[this.managePaging.resources] = this.managePaging.resourcesObject;
				}
			}
			var encoding = this.encoding || "utf8";
			var obj = JSON.stringify(this.managePaging.contentsObject);
			this.head["content-length"] = Buffer.byteLength(obj, encoding);
			response.writeHead(this.status, this.head);
			response.write(_, obj, encoding);
		}
		// content 
		else if (this.keepReply && this.status !== 500) {
			var head = JSON.parse(JSON.stringify(this.head));
			var content = this.chunks.join('');
			response.writeHead(this.status, head);
			response.write(_, content, this.encoding);
		} else {

			response.writeHead(this.status, this.head);
			for (var i = 0; i < this.chunks.length; i++) {
				response.write(_, this.chunks[i], this.encoding);
			}
		}
		response.end();
	}
}

function _makeLink(url, startIndex, count) {
	return {
		"$url": url + "?reply=true&startIndex=" + startIndex + "&count=" + count,
		"$type": "application/json; vnd-sage=syracuse"
	};
}

function _serialize(tracker) {
	var t = {
		uuid: tracker.trackngId,
		location: tracker.location,
		phase: tracker.phase,
		phaseDetail: tracker.phaseDetail,
		progress: tracker.progress && Math.round(tracker.progress),
		elapsedSeconds: tracker.elapsedSeconds,
		remainingSeconds: tracker.remainingSeconds,
		pollingMillis: tracker.pollingMillis,
		$diagnoses: tracker.$diagnoses,
		$links: tracker.$links,
		startDate: tracker.startTime
	};

	// add standard suspend / resume links
	if (!tracker.done) {
		t.$links = t.$links || {};
		/*		if(tracker.suspended) 
			t.$links.$resume = {
				$title: locale.format(module, "resumeTitle"),
				$url: tracker.location + "?resume=true",
				$method: "PUT"
			};
		else {
			t.$links.$suspend = {
				$title: locale.format(module, "suspendTitle"),
				$url: tracker.location + "?suspend=true",
				$method: "PUT"
			};
		}*/
		if (tracker.canAbort) {
			t.$links.$abort = {
				$title: locale.format(module, "abortTitle"),
				$url: (tracker.location || '') + "?abort=true",
				$method: "PUT"
			};
		}
	}
	return t;
}

class Tracker extends EventEmitter {
	/*
	trackngId: string;
	response: ? TrackerResponse;
	originResponse : ? TrackerResponse;
	status : number;
	done: boolean;
	suspended: boolean;
	abortRequested: boolean;
	method: string;
	replyLink: any;
	context: any;
	phase: string;
	phaseDetail: ? string;
	progress : ? number;
	elapsedSeconds : ? number;
	remainingSeconds : ? number;
	pollingMillis : number;
	startTime: number;
	dispatch: (_: _, context: any) => void;
	location: ? string;
	$diagnoses : SDataDiagnose[];
	$links: {
		[key: string]: SDataLink
	};
	callbackUrl: ? string;
	*/

	constructor(context, trackerResponse, trackngId, dispatch) {
		super();
		this.trackngId = trackngId;
		this.response = trackerResponse;
		this.status = 202;
		this.done = false;
		this.suspended = false;
		this.abortRequested = false;
		this.method = context.request.method;
		this.replyLink = null;
		this.context = context;
		this.phase = locale.format(module, "starting");
		this.phaseDetail = null;
		this.progress = null;
		this.elapsedSeconds = null;
		this.remainingSeconds = null;
		this.pollingMillis = 1000;
		this.startTime = new Date().getTime();
		this.dispatch = dispatch;
		// setup event handlers
		var self = this;
		this.on('phase', function(str) {
			self.phase = str;
		});
		this.on('detail', function(str) {
			self.phaseDetail = str;
		});

	}
	reply(_, response) {

		if (this.response && this.response.status >= 400) {
			this.response.head["content-type"] = "application/json";
			/* $FlowIssue - TODO */
			this.response.flush(_, response);
		} else {


			var headers /*:any*/ = {
				"content-type": "application/json",
				location: this.location,
			};
			var body, currentTime;
			if (this.done) {
				if (this.abortRequested) {
					this.phase = locale.format(module, "aborted");
				} else {
					this.phase = locale.format(module, "completed");
					this.progress = 100;
					this.remainingSeconds = 0;
				}
				this.status = 200;
				if (this.replyLink != null) {
					headers['$do-not-delete'] = true;
					var self = this;
					// Delete tracker after 20 minutes by default for GET operations.
					// This is to ensure the tracker deletion because client may do not ask for it.
					setTimeout(function() {
						this.response = null;
						delete trackers[self.trackngId];
					}, asyncRepliesTimeout ? (asyncRepliesTimeout * 60000) : 1200000);
				}
			}
			currentTime = new Date().getTime();
			this.elapsedSeconds = Math.floor((currentTime - this.startTime) / 1000);
			response.writeHead(this.status, headers);
			body = _serialize(this);
			response.write(_, JSON.stringify(body), "utf8");
			response.end();
		}
	}
	flush(_, response) {
		if (this.response) {
			// We keep reply for GET operations
			if (this.replyLink != null) {
				this.response.keepReply = true;
			}
			this.response.flush(_, response);
			if (this.response && !this.response.managePaging && !this.replyLink) {
				this.response = null;
			}
		} else {
			var headers = {
					"content-type": "application/json",
					location: this.location
				},
				body;
			response.writeHead(200, headers);
			body = _serialize(this);
			response.write(_, JSON.stringify(body), "utf8");
			response.end();
		}
	}
	requestAbort() {
		this.abortRequested = true;
	}
	acceptAbort() {
		this.phase = locale.format(module, "aborted");
	}
	start(_) {
		var self = this;
		// we must read complete body before sending 202 response. So we read and unread it.
		const body = this.context.request.reader.readAll(_);
		this.context.request.reader = this.context.request.reader.peekable();
		this.context.request.reader.unread(body);

		this.dispatch(function(err) {
			self.done = true;
			self.response && self.response.finish(err);
			//
			if (self.callbackUrl) {
				_finishNotify(function(notifyErr) {},
					self.response && self.response.statusCode, self.callbackUrl, err);
			}
		}, this.context);

		this.originResponse && this.reply(_, this.originResponse);
	}
	addError(message, stackTrace) {
		this.$diagnoses = this.$diagnoses || [];
		this.$diagnoses.push({
			$severity: "error",
			$message: message,
			$stackTrace: stackTrace
		});
	}
	addDiagnose(severity, message, stackTrace) {
		this.$diagnoses = this.$diagnoses || [];
		this.$diagnoses.push({
			$severity: severity,
			$message: message,
			$stackTrace: stackTrace
		});
	}
}

var trackers = exports.trackers = {};

exports.track = function(_, context, id) {
	var tracker = id && trackers[id];
	switch (context.request.method.toLowerCase()) {
		case 'get':
			if (tracker) {
				if (tracker.response && tracker.response.managePaging) {
					tracker.response.managePaging.parameters = context.parameters;
					tracker.response.managePaging.location = context.location;
				}
				if (tracker.response && context.parameters && context.parameters.reply) {
					if (tracker.replyLink && tracker.$links && tracker.$links[tracker.replyLink]) {
						if (tracker.$links[tracker.replyLink].$type)
							tracker.response.head["content-type"] = tracker.$links[tracker.replyLink].$type;
						if (tracker.$links[tracker.replyLink].$filename)
							tracker.response.head["content-disposition"] = "attachment; filename=" + tracker.$links[tracker.replyLink].$filename;
					}
					tracker.flush(_, context.response);
				} else {
					tracker.reply(_, context.response);
				}
			} else {
				var headers = {
					"content-type": "application/json"
				};
				context.response.writeHead(200, headers);
				var res = {
					$resources: Object.keys(trackers).map_(_, function(_, ttId) {
						var tt = trackers[ttId];
						if (!tt.done) {
							var currentTime = new Date().getTime();
							tt.elapsedSeconds = Math.floor((currentTime - tt.startTime) / 1000);
						}
						return _serialize(tt);
					})
				};
				context.response.write(_, JSON.stringify(res), "utf8");
				context.response.end();
			}
			break;
		case 'delete':
			if (!tracker) return context.reply(_, 404, "tracker not found: " + id);
			delete trackers[id];
			context.reply(_, 204);
			break;
		case "put":
			if (!tracker) return context.reply(_, 404, "tracker not found: " + id);
			if (context.parameters && context.parameters.abort) {
				tracker.requestAbort();
			}
			tracker.reply(_, context.response);
			//context.reply(_, 202, _serialize(tracker));
			break;
		default:
			throw new Error("Bad method: " + context.request.method);
	}
};

// keepOriginalResponse: DO NOT substitute original response with TrackerResponse
// managePaging: When parameter contains an object, the result is computed only once, the data is kept by the tracker, and 
//               the tracker automatically computes the correct data of the pages.
//               This requires that the tracker is explicitly deleted using a DELETE request when it is not used any more.  
//               Tracker automatically creates links to first and next page (currently only $first, $next link supported). 
//               When 'managePaging' is not set, the $first, $next etc. links just contain invocations of the original URL with
//               special parameters, when 'managePaging' is set, the links will directly invoke the tracker so that the result is not computed again.
//               of the data. This optional parameter must contain a new object optionally with 'resources': the name of the property which should be sliced/paged.
//               The object will be used internally, and other properties will be added which must not be changed from outside.
exports.create = function(context,
	dispatch,
	keepOriginalResponse,
	managePaging) {
	var trackngId = context.parameters.trackngId;
	var response = null;
	var tracker = trackers[trackngId];
	if (tracker) {
		throw new Error("Tracker already exists.");
	}
	if (!keepOriginalResponse) {
		response = context.response;
		context.response = new TrackerResponse(managePaging, trackngId);
	}
	trackers[trackngId] = tracker = new Tracker(context, (keepOriginalResponse ? null : context.response), trackngId, dispatch);
	tracker.originResponse = response;
	context.tracker = tracker;
	if (context.parameters.callbackUrl) tracker.callbackUrl = context.parameters.callbackUrl;
	globals.context.tracker = tracker;
	return tracker;
};