"use strict";
var fs = require('fs');

function trim(s) {
	return s.replace(/^\s*/, '').replace(/\s*$/, '');
}

function clear(_, path) {
	try {
		var stat = fs.stat(path, _);
		if (stat.isDirectory()) {
			fs.readdir(path, _).forEach_(_, function(_, name) {
				clear(_, path + '/' + name);
			});
			fs.rmdir(path, _);
		} else {
			fs.unlink(path, _);
		}
	} catch (ex) {
		console.log(path + ": " + ex.message);
	}
}

function asciify(name) {
	return name.replace(/\W/g, function(ch) {
		switch (ch) {
		case 'à':
		case 'â':
			return 'a';
		case 'é':
		case 'è':
		case 'ê':
			return 'e';
		case 'ô':
			return 'o';
		case 'ù':
			return 'u';
		case 'ç':
			return 'c';
		default:
			return ' ';
		}
	}).replace(/  +/g, ' ');
}

function pathify(name) {
	return name.replace(/ /g, '-');
}

function teamName(t) {
	switch (t) {
	case 'YYSYB':
		return 'Boost';
	case 'YYSYC':
		return 'Core';
	case 'YYSYF':
		return 'Fusion';
	default:
		throw new Error('bad team: ' + t);
	}
}

function exists(cb, path) {
	fs.stat(path, function(err, stat) {
		if (err && err.code !== 'ENOENT') cb(err);
		else cb(null, err == null);
	});
}

function patchFile(_, path, text, skip) {
	var oldpath = path.replace('/SAM/', '/SAM.old/');
	var old = exists(_, oldpath) ? fs.readFile(oldpath, "utf8", _).split('##') : [];
	if (old.length > skip) text = text + '\n##' + old.slice(skip).join('##');
	fs.writeFile(path, text, "utf8", _);
}

function samToWiki(_, path) {
	var data = fs.readFile(path, "binary", _).substring(1).split('\n"').map(function(line) {
		return ('"' + line).split('\t').map(function(val) {
			return trim(val[0] === '"' && val[val.length - 1] === '"' ? val.substring(1, val.length - 1) : val);
		})
	});
	// ["Team","","Expression","Number","Description","Phase no.","","Expression","Expression","Expression","Expected time","Actual time","Remaining time","\r"]
	//["YYSYB","  0.00","=\"\"","81806","Transfert compétence Setups Web Windows","   1","Transfert compétences Setups Web Windows","=\"\"","=\"\"","Transfert de compétence","  0.50","  0.50","  0.00","\r"]
	var root = __dirname + "/../../../syrawiki/SAM";
	if (exists(_, root)) fs.rename(root, root + ".old", _);
	var teams = [];
	data.slice(1).forEach(function(line) {
		var tid = line[0],
			fid = line[3],
			sid = fid + '-' + line[5];
		if (!fid) return;
		if (tid === '"') return; // investigate later why we get this one
		var team = teams[tid] || (teams[tid] = {
			features: {},
			sprints: {},
		});
		var feature = team.features[fid] || (team.features[fid] = {
			stories: {}
		});
		var story = feature.stories[sid] || (feature.stories[sid] = {});
		feature.title = line[4];
		story.title = line[6];
		story.synopsis = line[7] === '=""' ? "TODO" : line[7];
		story.sprint = line[9] || 'S999';
	});
	fs.mkdir(root, _);
	Object.keys(teams).forEach_(_, function(_, t) {
		var team = teams[t];
		var ttext = '[[Syracuse ' + teamName(t) + ' Team]]\n';
		ttext += '## Features\n\n';
		var tname = asciify('SAM ' + teamName(t) + ' Features');
		Object.keys(team.features).forEach_(_, function(_, f) {
			var feature = team.features[f];
			var ftext = '[[' + tname + ']]\n';
			ftext += '## Synopsis\n\nNot available in wiki. See SAM.\n\n';
			ftext += '## Stories\n\n';
			var fname = 'Feature ' + f + ' ' + asciify(feature.title);
			ttext += '* [[' + fname + ']]\n';
			Object.keys(feature.stories).forEach_(_, function(_, s) {
				var story = feature.stories[s];
				var stext = '[[' + tname + ']] / [[' + fname + ']]\n';
				stext += '## Synopsis\n\n' + story.synopsis;
				var sname = 'Story ' + s + ' ' + asciify(story.title)
				ftext += '* [[' + sname + ']]\n';
				patchFile(_, root + '/' + pathify(sname) + '.md', stext + '\n', 2);
				(team.sprints[story.sprint] || (team.sprints[story.sprint] = {
					stories: []
				})).stories.push(sname);
			})
			patchFile(_, root + '/' + pathify(fname) + '.md', ftext, 3);
		});
		Object.keys(team.sprints).forEach_(_, function(_, sp) {
			var sprint = team.sprints[sp];
			var ftext = '[[Syracuse ' + teamName(t) + ' Team]]\n';
			ftext += '## Stories\n\n';
			sprint.stories.forEach(function(sname) {
				ftext += '* [[' + sname + ']]\n';
			});
			patchFile(_, root + '/Sprint-' + sp.substring(1) + '-' + teamName(t) + '.md', ftext, 2);
		});
		fs.writeFile(root + '/' + pathify(tname) + '.md', ttext, "utf8", _);
	});
	clear(_, root + ".old");
	//console.log(JSON.stringify(data[1]));
}

samToWiki(_, __dirname + '/csvs/YYSYWIKI.csv')