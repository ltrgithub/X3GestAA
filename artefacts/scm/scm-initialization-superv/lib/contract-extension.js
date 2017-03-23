"use strict";

var path = require("path");

function _hackAutomaticImports(refContract) {
	// remove homepages from automatic import
	if (refContract && refContract.dbMeta && refContract.dbMeta.automaticImport) {
		var idx = refContract.dbMeta.automaticImport.indexOf("x3-erp-homepages.json");
		if (idx >= 0) refContract.dbMeta.automaticImport.splice(idx, 1);
	}
}

module.exports = {
	application: "syracuse",
	extends: "collaboration",
	dbMeta: {
	    automaticImport: [path.join(__dirname, "scripts", "SCM_Settings.json")]
	},
	onContractLoad: _hackAutomaticImports
};