"use strict";

var helpers = require('@sage/syracuse-core').helpers;
var registry = require('@sage/syracuse-core').registry;
var adminHelper = require("syracuse-collaboration/lib/helpers");
var locale = require('streamline-locale');
var config = require("config");
var fsp = require("path");
var fs = require("streamline-fs");

var applications = {};

var tracer; // = console.log;

exports.register = function(endpoints) {
	endpoints.forEach(function(endpoint) {
		if (typeof endpoint.contract === "string") endpoint.contract = require(endpoint.contract);
		// temporary hack to cope with contracts modules defined with module.exports = ... or exports.contract = ...
		// will clean up the contract definitions later
		if (!endpoint.contract.application && endpoint.contract) endpoint.contract = endpoint.contract.contract;
		if (!endpoint.contract.application) throw new Error("bad contract: " + endpoint.contract);
		var application = applications[endpoint.contract.application] || (applications[endpoint.contract.application] = {
			name: endpoint.contract.application,
			contracts: {}
		});
		var contract = application.contracts[endpoint.contract.contract] || (application.contracts[endpoint.contract.contract] = helpers.object.extend({
			name: endpoint.contract.contract,
			datasets: endpoint.datasets
		}, endpoint.contract));
		helpers.object.forEachKey(endpoint.datasets, function(name, ds) {
			ds.name = name;
			// nodejs stuff
			ds.hostname = ds.hostname || "localhost";
			ds.database = name;
			ds.port = ds.port || 3306;
			ds.login = ds.login || null; // must pass null rather than undefined
			ds.password = ds.password || null; // must pass null rather than undefined
			ds.dirty = true;
		});
	});
};
exports.applications = applications;

exports.getContract = function(application, contract, failIfNull) {
	var app = helpers.object.get(applications, application, failIfNull);
	return app && helpers.object.get(app.contracts, contract, failIfNull);
};

exports.getDataset = function(_, contract, datasetName) {
	if (contract.datasets && contract.datasets[datasetName]) return contract.datasets[datasetName];
	//
	var ep = adminHelper.AdminHelper.getEndpoint(_, {
		application: contract.application,
		contract: contract.contract,
		dataset: datasetName
	});
	let dataset = null;
	if (ep) {
		if (!ep.applicationRef(_) || (ep.applicationRef(_).protocol(_) !== "syracuse")) {
			if (!contract.endpointType) throw new Error("Request of non Syracuse dataset");
			// todo : 
			// x3js/studio contract - create mongodb dataset from endpoint name
			const dbName = contract.application + '-' + contract.contract + '-' + datasetName;
			dataset = {
				driver: config.collaboration.driver,
				hostname: config.collaboration.hostname,
				port: config.collaboration.port,
				connectionString: config.collaboration.connectionString,
				database: dbName,
				databaseName: dbName,
			};
		} else {
			dataset = ep.makeDataset(_);
		}
	}
	contract.datasets[datasetName] = dataset;
	return dataset;
};

exports.loadAllEndpoints = function(_) {
	var app = adminHelper.AdminHelper.getCollaborationApplication(_);
	if (!app) return;
	tracer && tracer("sdataRegistry.loadAllEndpoints collaboration application loaded");
	var eps = adminHelper.AdminHelper.getEndpoints(_, {
		jsonWhere: {
			applicationRef: app.$uuid
		}
	});
	tracer && tracer("sdataRegistry.loadAllEndpoints " + ((eps && eps.length) || 0) + " endpoints found");
	eps && eps.forEach_(_, function(_, ep) {
		tracer && tracer("sdataRegistry.loadAllEndpoints loading " + ep.dataset(_));
		if (!ep.applicationRef(_)) return;
		var appName = ep.applicationRef(_).application(_);
		var ctrName = ep.applicationRef(_).contract(_);
		var application = applications[appName] || (applications[appName] = {
			name: appName,
			contracts: {}
		});
		var contract = application.contracts[ctrName] || (application.contracts[ctrName] = {
			name: ctrName
		});
		contract.datasets = contract.datasets || {};
		contract.datasets[ep.dataset(_)] = contract.datasets[ep.dataset(_)] || ep.makeDataset(_);
	});
	tracer && tracer("sdataRegistry.loadAllEndpoints: endpoints loaded");
};

function extend(contractRef, contractSec) {
	// an extension can register its own contract
	if (contractSec.contract) {
		exports.register([{
			contract: contractSec,
			datasets: contractSec.datasets || [],
		}]);
		if (contractSec.endpointType) {
			// stop here - separate contract - do not merge into admin model
			return;
		}
	} else if (contractRef.application !== contractSec.application || contractRef.contract !== contractSec.extends) {
		throw new Error("cannot extend, application or contract mismatch: " + contractSec.application + '/' + contractSec.extends);
	}

	function copy(src, dst) {
		Object.keys(src).forEach(function(name) {
			if (src[name].$extends) {
				var d = dst[src[name].$extends];
				if (!d) throw new Error("cannot extend, base entity not found: " + src[name].$extends);
				Object.keys(src[name]).forEach(function(key) {
					if (key === '$extends') return;
					d[key] = d[key] || {};
					if (key === "$links" && typeof(d[key]) === "function") {
						d[key] = _extendFunction(d[key], src[name][key]);
					} else copy(src[name][key], d[key]);
				});
			} else {
				if (dst[name]) throw new Error("cannot extend contract, entity already exists: " + name);
				dst[name] = src[name];
			}
		});
	}
	if (!contractSec) return;

	if (contractSec.resources) contractRef.strings.mods.push(contractSec.resources);
	if (contractSec.entities) copy(contractSec.entities, contractRef.entities);
	if (contractSec.representations) copy(contractSec.representations, contractRef.representations);
	if (contractSec.dbMeta) {
		if (contractSec.dbMeta.initScript) {
			contractSec.dbMeta.initScript.forEach(function(is) {
				contractRef.dbMeta.initScript.push(is);
			});
		}
		if (contractSec.dbMeta.automaticImport) {
			contractSec.dbMeta.automaticImport.forEach(function(is) {
				contractRef.dbMeta.automaticImport.push(is);
			});
		}
		if (contractSec.dbMeta.updateScript) {
			contractSec.dbMeta.updateScript.forEach(function(us) {
				contractRef.dbMeta.updateScript.push(us);
			});
		}
	}
}

function _extendFunction(ref, ext) {
	return function(_, instance) {
		var o1 = ref.call(this, _, instance);
		var o2 = typeof(ext) === "function" ? ext.call(this, _, instance) : ext;
		return helpers.object.extend(o1, o2);
	};
}

function _checkPath(path) {
	var stat = true;
	try {
		fs.statSync(path);
	} catch (e) {
		stat = false;
	}
	return stat;
}

function _copy(srcRoot, dstRoot, name) {
	var srcDir = fsp.join(srcRoot, name);
	if (srcDir.match(/\.git.*/)) return;
	var stSrc = fs.statSync(srcDir);
	if (stSrc.isDirectory()) {
		var destDir = fsp.join(dstRoot, name);
		if (!_checkPath(destDir)) fs.mkdirSync(destDir);
		var files = fs.readdirSync(srcDir);
		files.forEach(function(ff) {
			_copy(srcDir, destDir, ff);
		});
	}
	if (stSrc.isFile()) {
		var destFile = fsp.join(dstRoot, name);
		fs.writeFileSync(destFile, fs.readFileSync(srcDir)); // TODO: Use streams !
	}
}

function requireExtension(path) {
	try {
		return require(path);
	} catch (ex) {
		if (ex.code === 'MODULE_NOT_FOUND') {
			return require(fsp.join(__dirname, '../', path));
		} else {
			throw ex;
		}
	}
}

exports.extendContract = function(contract) {
	function copy(src, dst) {
		Object.keys(src).forEach(function(name) {
			dst[name] = src[name];
		});
	}
	//
	if (config.extensions && config.extensions.modules) {
		var modules_path = fsp.join(__dirname, "..", "..");
		var bin_path = fsp.join(modules_path, "..");
		var rr = config.extensions.root || fsp.join("..", "extensions");
		var root = _checkPath(rr) ? rr : fsp.join(bin_path, rr);
		//
		config.extensions.modules.forEach(function(ee) {
			if (ee.active === false) return;
			if (!ee.path) return console.log(locale.format(module, "extNoPath"));
			var pp = _checkPath(ee.path) ? ee.path : fsp.join(root, ee.path);
			if (!_checkPath(pp)) return console.log(locale.format(module, "extNotFound", pp));
			var pkgPath = fsp.join(pp, "package.json");
			if (!_checkPath(pkgPath)) return console.log(locale.format(module, "pkgNotFound", pkgPath));
			//
			try {
				var pkg = JSON.parse(fs.readFileSync(pkgPath));
				if (!pkg.name) return console.log(locale.format(module, "pkgMissingName", pkgPath));
				// check if extension is present
				var destPath = fsp.join(modules_path, pkg.name);
				if (_checkPath(destPath) && ee.forceUpdate !== true) {
					// extension is there : TODO - check the version then update if more recent
				} else {
					_copy(pp, destPath, "");
				}
			} catch (e) {
				console.log(locale.format(module, "extCopyError", pp, e.message));
			}
		});
	}
	//
	registry.scanExtensions(function(extensions, sub) {
		if (extensions.contracts) extensions.contracts.forEach(function(cont) {
			extend(contract, requireExtension(cont.module));
		});
	});
};