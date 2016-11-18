"use strict";

var globals = require('streamline-runtime').globals;
var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;

exports.entity = {
	$titleTemplate: "Teams",
	$descriptionTemplate: "Teams management",
	$valueTemplate: "{description}",
	$helpPage: "Administration-reference_Teams",
	$properties: {
		description: {
			$title: "Description",
			$isMandatory: true,
			$isLocalized: true,
			$isUnique: true,
			$linksToDetails: true
		},
		isPublic: {
			$title: "Public access",
			$type: "boolean",
			$default: false
		},
		explorer: {
			$title: "Explorer",
			$type: "graph",
			$format: "force-layout",
			$relations: {
				administrator: {},
				authors: {},
				members: {},
			}
		},
		tags: {
			$title: "Tags",
			$type: "tag-cloud",
			$compute: function(_, instance) {
				// compute tags and tag categories
				var tagsMap = {};
				var tagCategsMap = {};

				function calculateWeights(_, document, urlLeftPart) {
					document.tags(_).toArray(_).forEach_(_, function(_, tag) {
						var tagCategMap = null;
						// tag category
						if (tag.category(_) && !(tagCategMap = tagCategsMap[tag.category(_).$uuid])) {
							tagCategMap = tagCategsMap[tag.category(_).$uuid] = {
								$uuid: tag.category(_).$uuid,
								description: tag.category(_).description(_),
								$weight: 0
							};
						}
						if (tagCategMap)
							tagCategMap.$weight++;
						// tag
						var tagMap = null;
						if (!(tagMap = tagsMap[tag.$uuid])) {
							tagMap = tagsMap[tag.$uuid] = {
								$uuid: tag.$uuid,
								description: tag.description(_),
								categoryMap: tagCategMap,
								$weight: 0,
								$links: {
									$default: {
										$url: urlLeftPart + "&where=(tags eq '" + tag.$uuid + "') and (teams eq '" + instance.$uuid + "')",
										$target: "blank"
									}
								}
							};
						}
						if (tagMap)
							tagMap.$weight++;
					});
				};

				instance.documents(_).toArray(_).forEach_(_, function(_, document) {
					calculateWeights(_, document, "{$baseUrl}/documents?representation=document.$query");
				});
				instance.templateDocuments(_).toArray(_).forEach_(_, function(_, document) {
					calculateWeights(_, document, "{$baseUrl}/msoWordTemplateDocuments?representation=msoWordTemplateDocument.$query");
				});
				instance.excelTemplateDocuments(_).toArray(_).forEach_(_, function(_, document) {
					calculateWeights(_, document, "{$baseUrl}/msoExcelTemplateDocuments?representation=msoExcelTemplateDocument.$query");
				});

				// make arrays of maps
				var nodeCategs = [];
				var i = 0;
				for (var categId in tagCategsMap) {
					var categ = tagCategsMap[categId];
					categ.$index = i++;
					nodeCategs.push(categ);
				}
				var nodes = [];
				for (var tagId in tagsMap) {
					var tag = tagsMap[tagId];
					tag.$category = tag.categoryMap && tag.categoryMap.$index;
					delete tag.categoryMap;
					nodes.push(tag);
				}
				// cleanup $index
				nodeCategs.forEach(function(categ) {
					delete categ.$index;
				});
				//
				return {
					$properties: {
						$nodeCategories: nodeCategs
					},
					$nodes: nodes
				};
			}
		}
	},
	$relations: {
		administrator: {
			$title: "Administrator",
			$type: "user",
			$isMandatory: true,
			$inv: "adminTeams"
		},
		authors: {
			$title: "Authors",
			$type: "users",
			$inv: "authorTeams",
			$nullOnDelete: true,

		},
		members: {
			$title: "Members",
			$type: "users",
			$inv: "memberTeams",
			$nullOnDelete: true
		},
		documents: {
			$title: "Documents",
			$type: "documents",
			$inv: "teams",
			$nullOnDelete: true,
			$isDefined: function(_, instance) {
				return !instance.$created;
			}
		},
		templateDocuments: {
			$title: "Word Template documents",
			$type: "msoWordTemplateDocuments",
			$inv: "teams",
			$isDefined: function(_, instance) {
				return !instance.$created;
			}
		},
		excelTemplateDocuments: {
			$title: "Excel Template documents",
			$type: "msoExcelTemplateDocuments",
			$inv: "teams",
			$isDefined: function(_, instance) {
				return !instance.$created;
			}
		}

	},
	$events: {
		$afterSave: [

			function(_, instance) {
				var up = globals.context.session && globals.context.session.getUserProfile(_);
				if (up) {
					var user = up.user(_);
					user.adminTeams(_).refresh(_);
					user.authorTeams(_).refresh(_);
					user.memberTeams(_).refresh(_);
				}
			}
		]
	},
	$init: function(_, instance) {
		var up = globals.context.session && globals.context.session.getUserProfile(_);
		up && instance.administrator(_, up.user(_));
	},
	$searchIndex: {
		$fields: ["description", "administrator", "authors", "members", "documents"]
	}
};