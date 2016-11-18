"use strict";
var locale = require('streamline-locale');
var patchtools = require('syracuse-patch/lib/patchtools');

function _noVersion(_, instance) {
	return !instance.sourceCommit(_);
}

// REMARK: UNIT TEST FOR THIS IN test/sdata/server/sdataTest.ts!
exports.entity = {
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$titleTemplate: "Technical information",
	$properties: {
		version: {
			$title: "Platform version"
		},
		comment: {
			$title: "Build information",
		},
		sourceCommit: {
			$title: "Source version",
			$isHidden: _noVersion
		},
		streamline: {
			$title: "Streamline data",
			$isHidden: _noVersion
		}
	},
	$relations: {
		endpoints: {
			$title: "X3 endpoints",
			$type: "aboutEndpoints",
			$isChild: true
		}
	},
	$functions: {
		$setId: function(_, context, id) {
			var self = this;
			var db = self._db; // already admin database
			// dummy 
			try {
				var version = patchtools.readVersionFile(patchtools.BASE_DIRECTORY, _);
				self.version(_, version.relNumber + "-" + version.patchNumber);
				self.sourceCommit(_, version.src);
				self.comment(_, version.comment);
				self.streamline(_, JSON.stringify(version.streamline));
				// if (version.commit) {
				//	self.rolloutCommit(_, version.commit);
				// }
			} catch (e) {
				self.version(_, locale.format(module, "noVersion"));
			}

			db.fetchInstances(_, db.getEntity(_, "endPoint"), {}).forEach_(_, function(_, ep) {
				// keep only X3 protocol endpoints for now to avoid test endpoints
				if (ep.protocol(_) === "x3") {
					var a_ep = self.endpoints(_).add(_);
					a_ep.dataset(_, ep.dataset(_));
					a_ep.description(_, ep.description(_));
					a_ep.epBaseUrl(_, ep.getBaseUrl(_));
				}
			});
		}
	}
};