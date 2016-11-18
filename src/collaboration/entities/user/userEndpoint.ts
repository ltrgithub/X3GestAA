"use strict";

var locale = require('streamline-locale');
var adminHelper = require("../../../../src/collaboration/helpers").AdminHelper;
var config = require('config');

function _disabled(_, instance) {
	var endp = instance.endpoint(_);
	if (!endp) return true;
	return (endp.protocol(_) !== "x3");
}

/// Get a 5 digit random code for X3 user code
function _getRandomCode(_) {
	var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	var randomString = '';
	for (var i = 0; i < 5; i++) {
		var randomPoz = Math.floor(Math.random() * charSet.length);
		randomString += charSet[randomPoz];
	}
	return randomString;
}



exports.entity = {
	//	$signed: ["login", "endpoint"],
	$properties: {
		code: {
			$title: "X3 User code",
			$isHidden: true
		},
		login: {
			$title: "User Login",
			$isMandatory: true,
			$displayLength: 10,
			$pattern: function(_, instance) {
				var db = adminHelper.getCollaborationOrm(_);
				var entity = db.model.getEntity(_, "user");
				var users = entity.fetchInstances(_, db, {
					jsonWhere: {
						"$factory": true,
						"$factoryOwner": "SAGE"
					}
				});
				var regexParts = [];
				users.forEach_(_, function(_, u) {
					regexParts.push(u.login(_));
				});
				return config.adminUserRestrict ? "^((?!" + regexParts.join('|') + "$).)(\\S)*$" : "^\\S*$";
			},
			$patternModifiers: "i",
			// $patternMessage: !config.adminUserRestrict ? locale.format(module, "loginName") : locale.format(module, "factoryLoginName")
		}
	},
	$titleTemplate: "{user.login}",
	$relations: {
		user: {
			$type: "user",
			$inv: "endpoints"
		},
		endpoint: {
			$type: "endPoint",
			$title: "Endpoint",
			$isMandatory: true,
			$displayLength: 15
		}
	},
	$links: function(_, instance) {
		var endpoint = instance.endpoint(_);
		if (_disabled(_, instance)) {
			return {};
		}
		var code = instance.code(_);
		if (code) code = code.toUpperCase();
		var url = endpoint.getBaseUrl(_).replace("/sdata/", "/trans/") + "/$sessions?f=GESAUS/2//M/" + code;
		var result = {
			"x3user": {
				"$url": url,
				"$method": "GET",
				"$target": "blank",
				"$title": locale.format(module, "x3user")
			}
		};
		return result;
	},
	$events: {
		$beforeSave: [

			function(_, instance) {
				// convert user login to upper case
				var login = instance.login(_);
				if (login) instance.login(_, login.toUpperCase());



			}
		],
		$afterSave: [

			function(_, instance) {
				var user0 = instance.$isDeleted ? instance.$snapshot.user(_) : instance.user(_);
				var endpoint0 = instance.$isDeleted ? instance.$snapshot.endpoint(_) : instance.endpoint(_);
				if (user0 && endpoint0) {
					var db = instance._db;
					var cacheEnt = db.getEntity(_, "x3RightsCache");
					var cache = db.fetchInstance(_, cacheEnt, {
						jsonWhere: {
							user: user0.$uuid,
							endpoint: endpoint0.$uuid
						}
					});
					if (cache) db.deleteInstance(_, cache);
				}
			}
		],

	},

	$functions: {
		$onDelete: function(_) {
			//Delete x3 user when user endpoint is deleted 
			//Not finished yet !!! To review !!!
			/*
			var self = this;
			var login = self.login(_);
			var code = self.code(_);
			if (login.search(code)) {
			    var x3user = self.getX3User(_);
			    if (x3user) {
					x3user.deleteSelf(_);	
					var diagnoses;
			  		x3user.getAllDiagnoses(_,diagnoses);
					  console.log(diagnoses);
				}		
			} */
		},

		_getNewX3UserCode: function(_) {
			var self = this;
			var x3user, code;
			do {
				var code = _getRandomCode(_);
				x3user = self.getX3User(_, code);
			}
			while (x3user);
			return code;
		},
		getX3User: function(_, code) {
			var self = this;
			var x3user;
			code = code || self.code(_);
			if (code) {
				var endpoint = self.endpoint(_);
				var orm = endpoint.getOrm(_);
				var ent = orm.getEntity(_, "ASYRAUS");
				x3user = orm.fetchInstance(_, ent, {
					jsonWhere: {
						USR: code
					}
				});
			}
			return x3user;
		},
		computeLogin: function(_) {
			var self = this;
			return self.user(_).login(_).replace(/[^A-Za-z0-9]+/g, '')
				.substr(0, 14)
				.concat('-', self.code(_)).toUpperCase();
		},
		updateX3User: function(_, professionCode) {
			var self = this;
			var endpoint = self.endpoint(_);
			var orm = endpoint.getOrm(_);
			var ent = orm.getEntity(_, "ASYRAUS");

			var x3user;
			if (self.code(_)) x3user = self.getX3User(_, self.code(_));


			if (!professionCode) {
				var pc = require("../../../../src/collaboration/entities/user/professionCode");
				var pcs = pc.getProfessionCodesForUser(_, self.user(_), self.endpoint(_));
				if (pcs.length > 0) professionCode = pcs[0].codmet(_);
			}


			if (!self.code(_)) {
				self.code(_, self._getNewX3UserCode(_));
				//self._parent.save(_);
			}

			var login = self.login(_) || self.computeLogin(_);

			//console.log("Create user", self.code(_), login, self.user(_).login(_));

			if (!/^[A-Z0-9\-]{1,20}$/.test(login)) {
				self.$addError(locale.format(module, "loginName"));
				return;
			}
			// selection of the profession code is done in $fetchInstances of professionCode entity
			if (!professionCode) {
				self.$addError(locale.format(module, "noFitRoles"));
				return;
			}


			/* Change the condition for a syracuse protocol (unit test) */
			//if (_disabled(_, self)) {
			if (!ent) {
				self.$addError(locale.format(module, "noX3Endpoint"));
				return;
			}

			self.$diagnoses = self.$diagnoses || [];


			if (login) login = login.toUpperCase();

			var newUser = null;
			try {
				newUser = x3user || ent.createInstance(_, orm, null);
				newUser.USR(_, self.code(_));
				newUser.LOGIN(_, login);
				newUser.ENAFLG(_, self.user(_).active(_));
				newUser.ADDEML(_, self.user(_).email(_));
				newUser.FIRSTNAME(_, self.user(_).firstName(_).substr(0, 20));
				newUser.LASTNAME(_, self.user(_).lastName(_).substr(0, 20));
				newUser.USRCONNECT(_, true);
				newUser.CODMET(_, professionCode);
				newUser.save(_);
				newUser.getAllDiagnoses(_, self.$diagnoses);
			} catch (error) {
				//console.log("Error",error);
				self.$addDiagnose("error", locale.format(module, "msgErrorCreateX3User", login));
			}
			if (self.hasErrors(_)) return null;
			return newUser;
		}
	},
	$services: {
		createUser: {
			// $isDisabled: _disabled(_, instance),
			$method: "POST",
			$isMethod: true,
			"$parameters": {
				"$actions": {
					"$lookup": {
						"$url": "{$baseUrl}/professionCodes?representation=professionCode.$lookup&data={endpoint}~{$parent_uuid}~{$trackingId}"
					}
				},
				$properties: {
					$select: {}
				}
			},
			$title: "Create X3 user",
			$execute: function(_, context, instance, parameters) {
				instance.updateX3User(_, parameters.$select);
			}
		}
	}
};