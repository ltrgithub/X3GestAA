"use strict";
var config = require('./config');
var proxy=require('syracuse-studio/lib/dbgpProxy');

proxy.startServer(function(err, res) {
	if (err) return console.error(err);
}, config);