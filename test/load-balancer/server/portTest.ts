"use strict";
var balancer = require('../../../src/load-balancer/balancer');
var util = require('util');
var fs = require('fs');

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('hash', function() {
		strictEqual(balancer._h(""), 0, "Hash of ''");
		strictEqual(balancer._h("a"), 97, "Hash of 'a'");
		strictEqual(balancer._h("ab"), 3105, "Hash of 'ab'");
		strictEqual(balancer._h("abc"), 96354, "Hash of 'abc'");
	});


	it('Compare connecions', function() {
		strictEqual(balancer._cc({
			port: 1
		}, {
			port: 2
		}), false, "Different ports");
		strictEqual(balancer._cc({
			active: true,
			port: 1
		}, {
			active: false,
			port: 1
		}), false, "Active");
		strictEqual(balancer._cc({
			port: 1,
			ssl: false
		}, {
			port: 1,
			ssl: true
		}), false, "SSL1");
		strictEqual(balancer._cc({
			port: 1,
			ssl: true
		}, {
			port: 1,
			ssl: false
		}), false, "SSL2");
		strictEqual(balancer._cc({
			port: 1,
			ssl: true,
			serverCert: {
				name: "s1"
			}
		}, {
			port: 1,
			ssl: true,
			serverCert: {
				name: "s2"
			}
		}), false, "different server certificate");
		strictEqual(balancer._cc({
			port: 1,
			ssl: true,
			serverCert: {
				name: "s1"
			},
			clientAuth: true
		}, {
			port: 1,
			ssl: true,
			serverCert: {
				name: "s1"
			}
		}), false, "different client auth");
		strictEqual(balancer._cc({
			port: 1,
			ssl: true,
			serverCert: {
				name: "s1"
			},
			clientAuth: true,
			clientCert: {
				name: "c1"
			}
		}, {
			port: 1,
			ssl: true,
			serverCert: {
				name: "s1"
			},
			clientAuth: true,
			clientCert: {
				name: "c2"
			}
		}), false, "different client cert");
		strictEqual(balancer._cc({
			port: 1,
			ssl: false,
			serverCert: {
				name: "s1"
			},
			clientAuth: true,
			clientCert: {
				name: "c1"
			}
		}, {
			port: 1,
			ssl: false,
			serverCert: {
				name: "s2"
			}
		}), true, "differences in unused SSL connection data");
		strictEqual(balancer._cc({
			port: 1,
			ssl: false,
			serverCert: {
				name: "s1"
			},
			clientAuth: false,
			clientCert: {
				name: "c1"
			}
		}, {
			port: 1,
			ssl: false,
			serverCert: {
				name: "s2"
			},
			clientAuth: false
		}), true, "differences in unused SSL connection data");
	});


	it('Host update', function() {
		var hosts = [{
			hostname: "A1",
			started: false,
			deactivated: false,
			connectionData: [{
				active: true
			}],
		}, {
			hostname: "A2",
			started: true,
			connectionData: [{
				active: true
			}],
			loaddata: [{
				syratime: 57
			}]
		}];
		var oldHosts = [{
			hostname: "A1",
			started: true,
			connectionData: [{
				active: true
			}],
			loaddata: [{
				syratime: 55
			}]
		}, {
			hostname: "A2",
			started: false,
			connectionData: [{
				active: true
			}],
			loaddata: [{
				syratime: 56
			}]

		}];
		var res = balancer._updateHosts(oldHosts, hosts, "A1");
		strictEqual(res[0].hostname, "A1", "local host name");
		strictEqual(res[0].started, false, "local host started");
		strictEqual(res[1].hostname, "A2", "other host name");
		strictEqual(res[1].started, true, "other host started");
		strictEqual(res[0].status, 1, "status local host (init)");
		strictEqual(res[1].status, -5, "status other host (unknown)");
		strictEqual(res[0].loaddata, hosts[0].loaddata, "copy new load data");
		strictEqual(res[1].loaddata, hosts[1].loaddata, "overwrite existing load data");
		strictEqual(res.length, 2, "number of hosts");

		var hosts = [{
			hostname: "A1",
			deactivated: false,
			started: true,
			connectionData: [{
				active: true
			}],
		}, {
			hostname: "A2",
			deactivated: false,
			started: true,
			connectionData: [{
				active: true
			}],
			loaddata: [{
				syralast: 5,
				syratime: 6
			}]
		}];
		var oldHosts = [{
			hostname: "A1",
			started: false,
			connectionData: [{
				active: true
			}],
		}, {
			hostname: "A2",
			started: false,
			connectionData: [{
				active: true
			}],
			loaddata0: [3, 4]
		}];
		var res = balancer._updateHosts(oldHosts, hosts, "A1");
		strictEqual(res[0].hostname, "A1", "local host name");
		strictEqual(res[1].status, -5, "other host unknown status");
		strictEqual(res[1].loaddata.length, 2, "size of expanded load data");
		strictEqual(res[1].loaddata[0].syralast, 5, "Do not overwrite syralast");
		strictEqual(res[1].loaddata[0].syratime, 3, "overwrite syratime");
		strictEqual(res[1].loaddata[1].syratime, 4, "overwrite syratime 2");
		strictEqual(res[1].loaddata[1].syralast, undefined, "Do not overwrite syralast 2");
		var hosts = [{
			hostname: "A1",
			started: false,
			connectionData: [{
				active: true,
				port: 8112
			}]
		}, {
			hostname: "A2",
			started: true,
			connectionData: [{
				active: true
			}]
		}];
		var oldHosts = [{
			hostname: "A1",
			started: true,
			connectionData: [{
				active: true,
				port: 8111
			}]
		}];
		var res = balancer._updateHosts(oldHosts, hosts, "A1");
		strictEqual(res[0].hostname, "A1", "first host name");
		strictEqual(res[0].stop, true, "stop host");
		strictEqual(res[1].hostname, "A2", "other host name");
		strictEqual(res[1].started, true, "other host started");
		strictEqual(res.length, 2, "number of hosts");
	});
});