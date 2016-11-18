"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var testData = require("./x3HandleTestData");
var prototypes = testData.prototypes;
var data = testData.data;

function Client() {}

helpers.defineClass(Client, null, {
	jsonSend: function(_, params) {
		var p = params.head.url.match(/.*\x24prototypes\x28'(.*)'\x29.*/);
		//		console.log("url: " + params.head.url + "; p=" + (p && p[1]));
		if (p && p[1]) return {
			head: {},
			body: prototypes[p[1]]
		};
		// request one object ?
		//		console.log("url (21): " + params.head.url);
		var key = params.head.url.match(/.*\/(.*)\x28'(.*)'\x29.*/);
		if (key && key[1] && key[2]) return {
			head: {},
			body: data[key[1]][key[2]]
		};
		// query ?
		var className = params.head.url.split("?")[0].split("/").pop();
		//		console.log("className (30) : " + className);
		if (className) {
			return {
				head: {},
				body: data[className].$query
			};
		}
		return {};
	}
});

exports.getClient = function(_, session, endpoint, wcId) {
	return new Client();
};