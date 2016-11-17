"use strict";
var types = require('@sage/syracuse-core').types;
var testDateTime = exports.testDateTime = "2010-08-20T09:30:04.000Z";
var testDate = exports.testDate = "2010-08-20";
var testTime = exports.testTime = "23:30:00";
var testUuid = exports.testUuid = "01234567-89ab-cdef-0123-456789abcdef";
var testJson = exports.testJson = {
	foo: "bar"
};

exports.endpoint = {
	contract: {
		application: "qunit",
		contract: "sdataTest",
		entities: {
			syncEntity: {
				$properties: {
					name: {
						$isMandatory: true,
						$isUnique: true
					}
				}
			},
			syncEntitySync: {
				$allowSync: true,
				$properties: {
					name: {
						$isMandatory: true,
						$isUnique: true
					}
				}
			},
			deleted: {
				$properties: {
					entname: {},
					tick: {
						$type: "integer",
						$default: 0
					},
					endpoint: {},
					deletionTime: {
						$type: "datetime"
					},
					notifiedServers: {
						$type: "json"
					},
					syncUuid: {}
				}
			},
			string: {
				$properties: {
					string: {},
					stringTiny: {
						size: "tiny"
					},
					stringNormal: {
						size: "normal"
					},
					string10: {
						$maxLength: 10
					},
					string100: {
						$maxLength: 100
					},
					string1000: {

						$maxLength: 1000
					},
					stringNullable1: {
						$isNullable: true
					},
					stringNullable2: {
						$isNullable: true
					},
					stringDef1: {
						$default: ""
					},
					stringDef2: {
						$default: "a'b"
					},
					stringDefNull: {
						$isNullable: true,
						$default: null
					}
				},
				$facet: {

				},
				$searchIndex: {
					$fields: ["string", "stringTiny", "stringNormal", "string10"]
				}
				/*,
				$init: function(_, instance) {
					instance.stringDef1(_, "");
					instance.stringDef2(_, "a'b");
				}*/
			},
			bool: {
				$properties: {
					bool1: {
						$type: "boolean"
					},
					bool2: {
						$type: "boolean"
					},
					boolNullable1: {
						$type: "boolean",
						$isNullable: true
					},
					boolNullable2: {
						$type: "boolean",
						$isNullable: true
					},
					boolDef1: {
						$type: "boolean",
						$default: false
					},
					boolDef2: {
						$type: "boolean",
						$default: true
					},
					boolDefNull: {
						$type: "boolean",
						$isNullable: true,
						$default: null
					}
				}
			},
			integer: {
				$properties: {
					int1: {
						$type: "integer"
					},
					int2: {
						$type: "integer"
					},
					intTiny1: {
						$type: "integer",
						size: "tiny"
					},
					intTiny2: {
						$type: "integer",
						size: "tiny"
					},
					intSmall1: {
						$type: "integer",
						size: "small"
					},
					intSmall2: {
						$type: "integer",
						size: "small"
					},
					intMedium1: {
						$type: "integer",
						size: "medium"
					},
					intMedium2: {
						$type: "integer",
						size: "medium"
					},
					intNormal1: {
						$type: "integer",
						size: "normal"
					},
					intNormal2: {
						$type: "integer",
						size: "normal"
					},
					intBig1: {
						$type: "integer",
						size: "big"
					},
					intBig2: {
						$type: "integer",
						size: "big"
					},
					intNullable1: {
						$type: "integer",
						$isNullable: true
					},
					intNullable2: {
						$type: "integer",
						$isNullable: true
					},
					intDef1: {
						$type: "integer",
						$default: 0
					},
					intDef2: {
						$type: "integer",
						$default: 1
					},
					intDefNull: {
						$type: "integer",
						$isNullable: true,
						$default: null
					}
				}
			},
			real: {
				$properties: {
					real1: {
						$type: "real"
					},
					real2: {
						$type: "real"
					},
					realSmall1: {
						$type: "real",
						size: "small"
					},
					realSmall2: {
						$type: "real",
						size: "small"
					},
					realNormal1: {
						$type: "real",
						size: "normal"
					},
					realNormal2: {
						$type: "real",
						size: "normal"
					},
					realNullable1: {
						$type: "real",
						$isNullable: true
					},
					realNullable2: {
						$type: "real",
						$isNullable: true
					},
					realDef1: {
						$type: "real",
						$default: 0
					},
					realDef2: {
						$type: "real",
						$default: 1
					},
					realDefNull: {
						$type: "real",
						$isNullable: true,
						$default: null
					}
				}
			},
			datetime: {
				$properties: {
					datetime1: {
						$type: "datetime"
					},
					datetimeNullable1: {
						$type: "datetime",
						$isNullable: true
					},
					datetimeNullable2: {
						$type: "datetime",
						$isNullable: true
					},
					datetimeDef1: {
						$type: "datetime",
						$default: function(_) {
							return types.datetime.parse(testDateTime);
						}
					},
					datetimeDefNow: {
						$type: "datetime",
						$default: function(_) {
							return types.datetime.now(false);
						}
					},
					datetimeDefNull: {
						$type: "datetime",
						$isNullable: true,
						$default: null
					}
				}
			},
			date: {
				$properties: {
					date1: {
						$type: "date"
					},
					dateNullable1: {
						$type: "date",
						$isNullable: true
					},
					dateNullable2: {
						$type: "date",
						$isNullable: true
					},
					dateDef1: {
						$type: "date",
						$default: function(_) {
							return types.date.parse(testDate);
						}
					},
					dateDefToday: {
						$type: "date",
						$default: function(_) {
							return types.date.today();
						}
					},
					dateDefNull: {
						$type: "date",
						$isNullable: true,
						$default: null
					}
				}
			},
			time: {
				$properties: {
					time1: {
						$type: "time"
					},
					timeNullable1: {
						$type: "time",
						$isNullable: true
					},
					timeNullable2: {
						$type: "time",
						$isNullable: true
					},
					timeDef1: {
						$type: "time",
						$default: function(_) {
							return types.time.parse(testTime);
						}
					},
					timeDefNow: {
						$type: "time",
						$default: function(_) {
							return types.time.now();
						}
					},
					timeDefNull: {
						$type: "time",
						$isNullable: true,
						$default: null
					}
				}
			},
			uuid: {
				$properties: {
					uuid1: {
						$type: "uuid"
					},
					uuidNullable1: {
						$type: "uuid",
						$isNullable: true
					},
					uuidNullable2: {
						$type: "uuid",
						$isNullable: true
					},
					uuidDef1: {
						$type: "uuid",
						$default: testUuid
					},
					uuidDefAuto: {
						$type: "uuid",
						$default: function(_) {
							return testUuid;
						}
					},
					uuidDefNull: {
						$type: "uuid",
						$isNullable: true,
						$default: null
					}
				}
			},
			json: {
				$properties: {
					json1: {
						$type: "json"
					},
					jsonNullable1: {
						$type: "json",
						$isNullable: true
					},
					jsonNullable2: {
						$type: "json",
						$isNullable: true
					},
					jsonDef1: {
						$type: "json",
						$default: testJson
					},
					jsonDefNull: {
						$type: "json",
						$isNullable: true,
						$default: null
					}
				}
			},
			parent: {
				$properties: {
					name: {}
				},
				$relations: {
					children: {
						$type: "children",
						inv: "parent",
						isChild: true,
						defaultOrder: [
							["name"]
						]
					},
					mandatoryChild: {
						$type: "other",
						isChild: true,
						mandatory: true
					},
					optionalChild: {
						$type: "other",
						isChild: true,
						$isNullable: true,
						defaultValue: null
					},
					mandatoryRef: {
						$type: "refer",
						$isMandatory: true
					},
					optionalRef: {
						$type: "refer",
						$isNullable: true,
						defaultValue: null
					},
					associates: {
						$type: "associates",
						inv: "parents",
						$canReorder: true
					}
				},
				defaultOrder: [
					["name"]
				]
			},
			child: {
				plural: "children",
				$properties: {
					name: {}
				},
				$relations: {
					parent: {
						$type: "parent",
						inv: "children"
					}
				},
				defaultOrder: [
					["name"]
				]
			},
			other: {
				$properties: {
					name: {}
				}
			},
			refer: {
				$properties: {
					name: {}
				}
			},
			associate: {
				$properties: {
					name: {}
				},
				$relations: {
					parents: {
						inv: "associates",
						$type: "parents"
					}
				}
			},
			paged: {
				$properties: {
					name: {}
				}
			},
			locked: {
				$lockType: "pessimist",
				$properties: {
					description: {}
				}
			},
			deleteTestParent: {
				$properties: {
					name: {}
				}
			},
			deleteTestRefOne: {
				$properties: {
					name: {}
				},
				$relations: {
					ref: {
						$type: "deleteTestParent"
					}
				}
			},
			deleteTestRefMany: {
				$properties: {
					name: {}
				},
				$relations: {
					refs: {
						$type: "deleteTestParents"
					}
				}
			},
			deleteTestMultiRefe: {
				$properties: {
					name: {}
				},
				$relations: {
					ref1: {
						$type: "deleteTestParent"
					},
					ref2: {
						$type: "deleteTestParent"
					}
				}
			},
			deleteTestCascadeMaster: {
				$properties: {
					name: {}
				},
				$relations: {
					detailsWInv: {
						$type: "deleteTestCascadeDetails",
						$inv: "master",
						$isComputed: true,
						$cascadeDelete: true
					},
					detailsWoInv: {
						$type: "deleteTestCascadeDetails",
						$cascadeDelete: true
					}
				}
			},
			deleteTestCascadeDetail: {
				$properties: {
					name: {}
				},
				$relations: {
					master: {
						$type: "deleteTestCascadeMaster",
						$inv: "detailsWInv"
					}
				}
			},
			deleteTestManyToManyA: {
				$properties: {
					name: {}
				},
				$relations: {
					Blist: {
						$type: "deleteTestManyToManyBs",
						isComputed: true,
						$inv: "Alist"
					}
				}
			},
			deleteTestManyToManyB: {
				$properties: {
					name: {}
				},
				$relations: {
					Alist: {
						$type: "deleteTestManyToManyAs",
						$inv: "Blist"
					}
				}
			},
			proxyClass: {
				$valueTemplate: "{code}",
				$key: "{code}~{description}",
				$isPersistent: false,
				$properties: {
					code: {

					},
					description: {

					}
				},
				$functions: {
					$setId: function(_, context, id) {
						var ids = id.split("~");
						this.code(_, ids[0]);
						this.description(_, ids[1]);
					}
				},
				$defaultOrder: [
					["description", true]
				]
			},
			inlineStoreRefTest: {
				$relations: {
					proxyClass: {
						$type: "proxyClass",
						$inlineStore: ["code", "description"]
					}
				}
			},
			polymorphTest: {
				$properties: {
					code: {}
				},
				$relations: {
					reference: {
						$type: "string"
					},
					child: {
						$type: "string",
						$isChild: true
					},
					references: {
						$type: "strings"
					},
					children: {
						$type: "strings",
						$isChild: true
					},
					polyRef: {
						$variants: {
							string: {
								$type: "string"
							},
							integer: {
								$type: "integer"
							}
						}
					},
					polyChild: {
						$variants: {
							string: {
								$type: "string"
							},
							integer: {
								$type: "integer"
							},
							tree: {
								$type: "polymorphTest"
							}
						},
						$isChild: true
					},
					polyRefs: {
						$variants: {
							string: {
								$type: "string"
							},
							integer: {
								$type: "integer"
							}
						},
						$isPlural: true
					},
					polyChildren: {
						$variants: {
							string: {
								$type: "string"
							},
							integer: {
								$type: "integer"
							}
						},
						$isChild: true,
						$isPlural: true
					},
					polyMixt: {
						$variants: {
							stringRef: {
								$type: "string"
							},
							stringChild: {
								$type: "string",
								$isChild: true
							}
						}
					},
					polyMixts: {
						$variants: {
							stringRef: {
								$type: "string"
							},
							stringChild: {
								$type: "string",
								$isChild: true
							}
						},
						$isPlural: true
					}
				}
			},
			loopTest1: {
				$relations: {
					selfLoopChild: {
						$type: "loopTest1",
						$isChild: true
					},
					selfLoopChildren: {
						$type: "loopTest1s",
						$isChild: true,
						$isPlural: true
					},
					loop2Child: {
						$type: "loopTest2",
						$isChild: true
					},
					loop2Children: {
						$type: "loopTest2s",
						$isChild: true,
						$isPlural: true
					}
				}
			},
			loopTest2: {
				$relations: {
					loop1Child: {
						$type: "loopTest1",
						$isChild: true
					},
					loop1Children: {
						$type: "loopTest1s",
						$isChild: true,
						$isPlural: true
					}
				}
			},
			serviceTest: {
				$relations: {
					serviceChildTest: {
						$type: "serviceChildTest",
						$isChild: true
					}
				}
			},
			serviceChildTest: {
				$properties: {
					sample: {
						$default: "none"
					}
				},
				$services: {
					test: {
						$method: "POST",
						$isMethod: true,
						$execute: function(_, context, instance, params) {
							instance.sample(_, "executed");
							instance._parent.save(_);
						},
						$isDisabled: function(_, instance) {
							return instance.sample(_) === "executed";
						}
					}
				}
			}
		}
	}
};