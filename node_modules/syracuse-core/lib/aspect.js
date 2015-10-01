"use strict";

var tracer; // = console.log;

function _isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
}

function _setPointCut(obj, funcs, aspect, pointCut) {
	if (!_isFunction(aspect)) return;
	if (typeof(funcs) === "string") funcs = [funcs];
	_injectIn(obj.prototype, funcs, pointCut);
	_injectIn(obj, funcs, pointCut);
};

function _injectIn(proto, funcs, pointCut) {
	for (var k in proto) {
		if (k === "toString") continue;
		var old = proto[k];
		if (!old) continue;

		var injectIt = funcs.some(function(e) {
			return (k.search(e) != -1);
		});

		if (injectIt) {
			tracer && tracer("Code injection in " + proto.constructor.name + "." + k);
			proto[k] = pointCut(k, old);
		}
	}
};

exports.before = function(obj, funcs, aspect) {
	_setPointCut(obj, funcs, aspect, function(k, old) {
		return function() {
			try {
				aspect.apply(this, [{
						pointCut: "before",
						name: k
					},
					Array.prototype.slice.call(arguments)
				]);
			} catch (ex) {
				tracer && tracer("Error in injected code before: " + this.constructor.name + "." + k + "\n" + ex);
			}
			return old.apply(this, arguments);
		};
	});
};

exports.after = function(obj, funcs, aspect) {
	_setPointCut(obj, funcs, aspect, function(k, old) {
		return function() {
			var res = old.apply(this, arguments);
			try {
				aspect.apply(this, [{
						pointCut: "after",
						name: k
					},
					Array.prototype.slice.call(arguments)
				], res);
			} catch (ex) {
				debug && console.log("Error in injected code after: " + this.constructor.name + "." + k + "\n" + ex);
			}
			return res;
		};
	});
};

exports.around = function(obj, funcs, aspect) {
	_setPointCut(obj, funcs, aspect, function(k, old) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			try {
				aspect.apply(this, [{
						pointCut: "before",
						name: k
					},
					args
				]);
			} catch (ex) {
				debug && console.log("Error in injected code around.before: " + this.constructor.name + "." + k + "\n" + ex);
			}
			var res = old.apply(this, arguments);
			try {
				aspect.apply(this, [{
						pointCut: "after",
						name: k
					},
					args, res
				]);
			} catch (ex) {
				debug && console.log("Error in injected code around.after: " + this.constructor.name + "." + k + "\n" + ex);
			}
			return res;
		};
	});
};