"use strict";

var baseUrl = "http://localhost:3004";
var port = 3004;
var helpers = require('@sage/syracuse-core').helpers;
var types = require('@sage/syracuse-core').types;
var config = require('syracuse-main/lib/nodeconfig').config; // must be first syracuse require
var mongodb = require('mongodb');
var streams = require('streamline-streams');
var testAdmin = require('@sage/syracuse-core').apis.get('test-admin');
var sys = require("util");
var dataModel = require('../../../../src/orm/dataModel');
var forEachKey = helpers.object.forEachKey;
var sdataRegistry = require('syracuse-sdata/lib/sdataRegistry');
var patchtools = require('syracuse-patch/lib/patchtools');

var tracer; // = console.log;

// force basic auth
config.session = config.session || {};
config.session.auth = "basic";
// no integration server
config.integrationServer = null;

var endPoint = testAdmin.modifyCollaborationEndpoint("mongodb_admin_test");

var testData = require('../fixtures/testDB');
var testEndPoint = testData.endpoint;

testEndPoint.datasets = {
	test: {
		driver: "mongodb",
		database: "test",
		hostname: "localhost",
		port: config.collaboration.port || 27017
	}
};

// tracer && tracer("TEST ANFANG......................................");

config.sdata.endpoints.push(testEndPoint);

var requestCount = 0;
var MAX_REQUESTS = 13;
var cookie;

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('test format query calendar', function() {
		// TEST with only calendar
		// TEST with calendar + other type in query
		//
	});
});