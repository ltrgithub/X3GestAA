"use strict";

var Template = require('@sage/syracuse-core').resource.proxy.Template;
var fsp = require("path");
var fs = require('streamline-fs');

function _resolvePath(_, context, volume) {
	var path = volume.path(_).replace(/\\/g, "/");
	path = (new Template(path)).resolve({
		syracuse: "../../../..",
		user: (context.getUser(_) && context.getUser(_).login(_))
	});
	//
	return fsp.join(__dirname, path);
}

var _listSolverMap = {
	syracuse_file: function(_, context, entity, volume) {
		//
		var res = [];
		//		var path = _resolvePath(_, context, volume);
		var p = context.parameters.path || "";
		// create "up" item
		if (p) {
			var inst = entity.factory.createInstance(_, null, volume._db);
			inst.fileId(_, "..");
			inst.fileName(_, "..");
			inst._folderPath = p.split("/").slice(0, -1).join("/");
			inst.folderPath(_, inst._folderPath);
			inst.fileType(_, "folder");
			inst.volume(_, volume);
			//
			res.push(inst);
		}
		//
		var path = fsp.join(volume.resolvePath(_), p);
		var fileList = fs.readdir(path, _);
		fileList.forEach_(_, function(_, file) {
			var stat = fs.stat(fsp.join(path, file), _);
			var inst = entity.factory.createInstance(_, null, volume._db);
			inst.fileId(_, file);
			inst.fileName(_, file);
			inst.fileType(_, stat.isDirectory() ? "folder" : "file");
			inst.folderPath(_, p);
			inst.volume(_, volume);
			if (inst.fileType(_) === "folder") inst._folderPath = fsp.join(p, file);
			else inst.content(_)._store.fileName = fsp.join(path, file);
			//
			res.push(inst);
		});
		return res;
	}
};

exports.entity = {
	$titleTemplate: "Storage volume details",
	$isPersistent: false,
	$canEdit: false,
	$canDelete: false,
	$listTitle: "List of volume items",
	$key: "{volume.$uuid}~{fileId}",
	$properties: {
		fileId: {
			$isHidden: true
		},
		fileName: {
			$title: "File name"
		},
		folderPath: {
			$title: "Folder path"
		},
		fileType: {
			$title: "File type",
			$enum: [{
				$value: "file",
				$title: "File"
			}, {
				$value: "folder",
				$title: "Folder"
			}, ]
		},
		content: {
			$title: "Content",
			$type: "binary",
			$storage: function(_, instance) {
				return ((instance.volume(_) && instance.volume(_).storageType(_)) || "db_file");
			},
			$isDefined: function(_, instance) {
				return (instance.fileType(_) === "file");
			}
		}
	},
	$relations: {
		volume: {
			$title: "Volume",
			$type: "storageVolume"
		}
	},
	$fetchInstances: function(_, context, parameters) {
		var self = this;
		//
		if (!context.parameters.volume) return [];
		//
		var volume = context.db.fetchInstance(_, context.db.model.getEntity(_, "storageVolume"), context.parameters.volume);
		if (!volume) return [];
		//
		var solver = _listSolverMap["syracuse_" + volume.storageType(_)];
		return (solver && solver(_, context, self, volume)) || [];
	},
	$functions: {
		$setId: function(_, context, id) {
			var ids = id.split("~");
			var volumeId = ids.shift();
			var fileId = ids.join("~");
			//
			this.volume(_, this.createChild(_, "volume", volumeId));
			this.fileId(_, fileId);
			this.content(_).init(_, this.volume(_).resolvePath(_, fileId));
			this.fileName(_, this.content(_).getProperties(_).fileName);
			//
		}
	},
	$links: {
		$details: function(_, instance) {
			return (instance.fileType(_) === "folder") ? {
				$title: "Details",
				$url: "{$baseUrl}/storageVolumeItems?representation=storageVolumeItem.$query&volume=" + instance.volume(_).$uuid + "&path=" + instance._folderPath,
				$target: "self"
			} : null;
		}
	},
	$defaultOrder: [
		["fileName", true]
	]
};