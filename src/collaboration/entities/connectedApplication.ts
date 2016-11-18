"use strict";
const locale = require('streamline-locale');
const globals = require('streamline-runtime').globals;
const helpers = require('@sage/syracuse-core').helpers;
const datetime = require('@sage/syracuse-core').types.datetime;
const uuid = require('@sage/syracuse-core').helpers.uuid;
const yaml = require('js-yaml');
const url = require('url');
const jwt = require('jsonwebtoken');

const reserved = {
	iss: 1,
	sub: 1,
	aud: 1,
	exp: 1,
	nbf: 1,
	iat: 1,
	jti: 1,
	locale: 1
};

exports.entity = {
	$titleTemplate: "Connected applications",
	$descriptionTemplate: "Connected application",
	$helpPage: "Administration-reference_Connected-Applications",
	$valueTemplate: "{name}",
	$createActionTitle: "New connected application",
	$listTitle: "List of connected applications",
	$properties: {
		name: {
			$title: "Name",
			$linksToDetails: true,
			$isMandatory: true,
			$isUnique: true
		},
		url: {
			$title: "Url",
			$format: "$url",
			$isMandatory: true
		},
		clientId: {
			$title: "Client ID",
			$isReadOnly: true
		},
		secret: {
			$title: "Secret",
			$type: "password",
			$salt: "",
			$encrypt: true,
			$isReadOnly: true,
			$isHidden: true
		},
		secretCreated: {
			$title: "Secret to keep",
			$description: "Please store your secret somewhere safe because it will never be displayed again !",
			$compute: function(_, instance, value) {
				return getSecretInSession(instance.$uuid);
			},
			$isDefined: function(_, instance) {
				return getSecretInSession(instance.$uuid) != null;

			},
			$isHidden: function(_, instance) {
				return !getSecretInSession(instance.$uuid);
			}
		},
		active: {
			$title: "Active",
			$default: true,
			$type: "boolean"
		},
		expiration: {
			$title: "Tokens validity",
			$description: 'expressed in seconds"',
			$isMandatory: true,
			$type: "integer",
			$minimum: 0,
			$maximum: 30000, // 5mn max
			$default: "60"
		}
	},
	$relations: {
		tokenInfos: {
			$type: "tokenInfos",
			$inv: "app",
			$isComputed: true,
			$cascadeDelete: true
		},
		payloads: {
			$type: "tokenPayloads",
			$isChild: true,
			$isComputed: true
		}
	},
	$functions: {
		$serialize: function(_) {
			let res = this._internalSerialize(_);
			if (!this._showSecret && getSecretInSession(this.$uuid) != null) {
				delete globals.context.session.connectedAppSecrets[this.$uuid];
			}

			this.tokenInfos(_).toArray(_).forEach_(_, function(_, ti) {
				res.payloads = res.payloads || [];
				let info = ti.info(_);
				if (info) {
					let tmp = {};
					for (let k in info) {
						if (!(k in reserved)) tmp[k] = info[k];
					}
					let curr = {
						jti: info.jti,
						iat: new Date(info.iat * 1000),
						exp: new Date(info.exp * 1000),
						sub: info.sub,
						info: JSON.stringify(tmp)
					};
					res.payloads.push(curr);
				}
			});

			return res;
		},
		generateSecret: function(_) {
			this._showSecret = true;
			this.secret(_, generateSecret(32, '#Aa'));
			setSecretInSession(this.$uuid, this.secret(_));
			// fetch instances is necessary because the relation is computed
			let entity = this._db.model.getEntity(_, "tokenInfo");
			this._db.fetchInstances(_, entity, {
				sdataWhere: "app.clientId eq '" + this.clientId(_) + "'"
			}).forEach_(_, function(_, ti) {
				ti.deleteSelf(_);
			});
			this.tokenInfos(_).reset(_);
		},
		generateToken: function(_, params) {
			var up = globals.context && globals.context.session && globals.context.session.getUserProfile(_);
			//
			params = params || "";
			let info = yaml.safeLoad(params) || {};
			let tokenEntity = this._db.model.getEntity(_, "tokenInfo");
			let tokenInst = tokenEntity.createInstance(_, this._db);

			tokenInst.jti(_, uuid.generate(''));

			tokenInst.app(_, this);
			//
			let now = Math.floor(Date.now() / 1000);
			let exp = this.expiration(_) + now;
			tokenInst.expiration(_, datetime.fromJsDate(new Date(exp * 1000)));
			info.iss = this.clientId(_);
			info.sub = up && up.user(_).login(_);
			info.aud = globals.context && globals.context.session && globals.context.session.host;
			info.iat = now; // convert in seconds
			info.exp = exp; // already in seconds
			info.jti = tokenInst.jti(_);
			info.locale = up && up.selectedLocale(_) && up.selectedLocale(_).code(_);
			tokenInst.info(_, info);
			tokenInst.save(_);
			// for deletion by ttl
			tokenInst.schedule(_);
			// create and return the token
			return jwt.sign(info, this.secret(_));
		},
		generateFormattedUrl: function(_, path, params) {
			let hostUrl = this.url(_) || "";
			let sep = path && path.indexOf("?") != -1 ? "&" : "?";
			if (hostUrl.substr(-1) != "/") hostUrl += "/";
			return `${url.resolve(hostUrl, path)}${sep}token=${this.generateToken(_, params)}`;
		}
	},
	$services: {
		generateSecret: {
			$method: "get",
			$title: "Regenerate secret",
			$isMethod: true,
			$facets: ["$details"],
			$execute: function(_, context, instance, parameters) {
				instance.generateSecret(_);
				return instance.save(_);
			}
		},
	},
	$events: {
		$beforeSave: [

			function(_, instance, params) {
				if (instance.$created) {
					instance.clientId(_, uuid.generate(''));
					instance.generateSecret(_);
				}
			}
		]
	},
	$searchIndex: {
		$fields: ["name"]
	}
};

exports.entityPayload = {
	$titleTemplate: "Token informations",
	$descriptionTemplate: "Token information",
	$valueTemplate: "{description}",
	$listTitle: "List of Token informations",
	$isPersistent: false,
	$properties: {
		jti: {
			$title: "Token ID"
		},
		iat: {
			$title: "Issued at",
			$type: "datetime"
		},
		exp: {
			$title: "Expires in",
			$type: "datetime"
		},
		sub: {
			$title: "Subject"
		},
		info: {
			$title: "Information"
		}
	}
};

function generateSecret(length, chars) {
	let mask = '';
	if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
	if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	if (chars.indexOf('#') > -1) mask += '0123456789';
	if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
	let result = '';
	for (let i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
	return result;
}

function setSecretInSession(uuid, secret) {
	globals.context.session.connectedAppSecrets = globals.context.session.connectedAppSecrets || {};
	globals.context.session.connectedAppSecrets[uuid] = secret;
}

function getSecretInSession(uuid) {
	return globals.context.session.connectedAppSecrets && globals.context.session.connectedAppSecrets[uuid];
}