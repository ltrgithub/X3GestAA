"use strict";
var child_process = require("child_process");
var ez = require("ez-streams");
var time = require('@sage/syracuse-core').types.time;
var elasticVersion = require('syracuse-search/lib/elasticVersion');
var httpClient = require("../../../../src/http-client/httpClient");
var fs = require("streamline-fs");
var path = require("path");

function sh(_, cmd, args) {
	try {
		var child = child_process.spawn(cmd, args);
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		var resF = ez.devices.node.reader(child.stdout).readAll(!_);
		var errF = ez.devices.node.reader(child.stderr).readAll(!_);
		return (resF(_) || '') + (errF(_) || '');
	} catch (ex) {
		return ex.message;
	}
}

function gitInfo(_) {
	var gitDir = path.resolve(__dirname, "../../../../.git/"),
		file = path.resolve(gitDir, "HEAD"),
		info = {
			branch: "",
			sha1: ""
		};
	console.log("gitInfo: " + gitDir + ", " + file);
	if (fs.exists(file, _)) {
		var data = fs.readFile(file, "utf8", _);
		console.log(file + ": " + data);
		var m = /ref:\s*(refs\/heads\/(.*))/.exec(data);
		console.log("match: " + m);
		file = m && path.resolve(gitDir, m[1]);
		info.branch = m && m[2];
		if (file && fs.exists(file, _)) {
			data = fs.readFile(file, "utf8", _);
			console.log(file + ": " + data);
			info.sha1 = data;
		}
	}
	return info;
}

var entity = exports.entity = {
	$titleTemplate: "System Information",
	$key: "1",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$keyPager: true,
	$isProxyClass: true,
	$properties: {
		syracuse_version: {
			$title: "version",
			$compute: function(_, instance) {
				return require("syracuse-main/package.json").version;
			},
		},
		syracuse_branch: {},
		syracuse_sha1: {},
		syracuse_git_url: {
			$title: "git url",
			$format: "$url",
			$compute: function(_, instance) {
				return "https://github.com/Sage-ERP-X3/Syracuse/commit/" + instance.syracuse_sha1(_);
			},
		},
	},
	$relations: {},
	$functions: {
		$setId: function(_, context, id) {

		}
	},
};

['version', 'arch', 'platform', 'pid'].forEach(function(key) {
	entity.$properties["node_" + key] = {
		$title: key,
		$compute: function(_, instance) {
			return process[key];
		}
	};
});

entity.$properties.node_uptime = {
	$title: "up time",
	$compute: function(_, instance) {
		return time.fromSeconds(Math.floor(process.uptime())).toString();
	}
};

Object.keys(process.memoryUsage()).forEach(function(key) {
	entity.$properties["node_" + key] = {
		$title: key,
		$type: 'integer',
		$compute: function(_, instance) {
			return process.memoryUsage()[key];
		}
	};
});

['branch', 'sha1'].forEach(function(key) {
	entity.$properties["syracuse_" + key] = {
		$title: key,
		$compute: function(_, instance) {
			if (!instance.gitInfo || instance.gitTime < Date.now() - 1000) {
				instance.gitInfo = gitInfo(_);
				instance.gitTime = Date.now();
			}
			return instance.gitInfo[key];
		}
	};
});

// We should enumerate these keys dynamically but we don't have a connection to mongo
// So let's do it statically for now
['version', 'gitVersion', 'sysInfo', 'bits', 'debug', 'maxBsonObjectSize', 'ok'].forEach(function(key) {
	entity.$properties["mongo_" + key] = {
		$title: key,
		$compute: function(_, instance) {
			if (!instance.mongoInfo || instance.mongoTime < Date.now() - 1000) {
				instance.mongoInfo = instance._db.db.admin().serverInfo(_);
				instance.mongoTime = Date.now();
			}
			return instance.mongoInfo[key];
		}
	};
});

// We should enumerate these keys dynamically but we don't have a connection to mongo
// So let's do it statically for now
['version', 'name', 'tagline', 'status', 'ok'].forEach(function(key) {
	entity.$properties["elastic_" + key] = {
		$title: key,
		$compute: function(_, instance) {
			if (!instance.elasticInfo || instance.elasticTime < Date.now() - 1000) {
				instance.elasticInfo = elasticVersion.getAboutInfo(_);
				instance.elasticTime = Date.now();
			}
			var val = instance.elasticInfo[key];
			if (key === 'version') val = val.number;
			return val;
		}
	};
});

// We could enumerate all the env variables with Object.keys(process.env)
// but this may expose things that we don't want to expose. Be safe.
// Windows and Linux differ (of course). So we have key variants
['HOME', 'LANG', 'SHELL', 'PATH', 'PWD', 'TEMP', 'TMPDIR', 'OS', 'USER', 'USERNAME', 'USERDOMAIN'].filter(function(key) {
	return process.env[key] !== undefined;
}).forEach(function(key) {
	entity.$properties["env_" + key] = {
		$title: key,
		$compute: function(_, instance) {
			return process.env[key];
		}
	};
});