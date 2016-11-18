"use strict";

const globals = require('streamline-runtime').globals;
const helpers = require('@sage/syracuse-core').helpers;
const adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
const authHelper = require('../../src/auth/helpers');
const jwt = require('jsonwebtoken');

const excludes = {
	jti: 1,
	iat: 1,
	exp: 1,
	iss: 1,
	aud: 1
};

function verifyToken(_, token) {
	// decode the token to get jti
	let decoded = jwt.decode(token);

	let jti = decoded.jti;
	// check if jti is provided
	if (!jti) throw authHelper.error(401, "Error 10: Invalid token");

	// check if iat is in the future
	if (!decoded.iat || (Date.now() - (decoded.iat * 1000) < 0)) throw authHelper.error(401, "Error 20: Invalid token");

	let db = adminHelper.getCollaborationOrm(_);
	let tokenInfo = db.fetchInstance(_, db.model.getEntity(_, "tokenInfo"), {
		jsonWhere: {
			jti: jti,
		}
	});
	// check if tokenInfo exists
	if (!tokenInfo) throw authHelper.error(401, "Error 30: Invalid token");

	let appConn = tokenInfo.app(_);
	if (!appConn || !appConn.active(_)) throw authHelper.error(401, "Error 40: Invalid token");

	// the issuer is not the client Id
	if (appConn.clientId(_) != decoded.iss) throw authHelper.error(401, "Error 41: Invalid token");

	try {
		// check signature and expiration
		jwt.verify(token, appConn.secret(_));
	} catch (e) {
		let err = authHelper.error(401, `Error 50: Invalid token: ${e.name}: ${e.message}`);
		err.expiredAt = e.expiredAt;
		throw err;
	}

	// check if login is provided
	if (!decoded.sub) throw authHelper.error(401, "Error 60: Invalid token");
	let user = db.fetchInstance(_, db.model.getEntity(_, "user"), {
		jsonWhere: {
			login: decoded.sub
		}
	});
	// check if user exists and is active
	if (!user || !user.active(_)) throw authHelper.error(401, "Error 70: Invalid token");

	// build response data
	let tmp = {},
		data = tokenInfo.info(_);
	if (data) {
		for (let k in data) {
			if (!(k in excludes)) tmp[k] = data[k];
		}
		tmp.name = `${user.firstName(_) ? user.firstName(_) + " " : ""}${user.lastName(_)}`;
	}

	return tmp;
}

exports.dispatcher = function(config) {
	return function(_, request, response) {
		let status, data;
		try {
			if (/^\/[^\/]*\/[^\/]*\/[^\/]*\//.test(request.url)) throw authHelper.error(500, "internal error: bad url: " + request.url);
			let method = request.method.toUpperCase();
			if (method !== "GET" && method !== "POST") throw authHelper.error(500, "invalid http method: " + method);

			let header = request.headers && (request.headers.Authorization || request.headers.authorization);
			if (!header) {
				throw authHelper.error(401, "Authorization header is missing");
			}

			if (header.indexOf('Bearer ') !== 0) throw authHelper.error(401, "Invalid Authorization header");

			let token = header.substring(7);
			data = verifyToken(_, token);
			status = 200;
		} catch (e) {
			status = e.$httpStatus || 500;
			data = {
				$diagnoses: [{
					$severity: "error",
					$message: e.message,
					$stackTrace: e.safeStack,
					$expiredAt: e.expiredAt
				}]
			};
		} finally {
			response.writeHead(status, {
				"content-type": "application/json"
			});
			return response.end(JSON.stringify(data));
		}
	};
};

exports.dispatch = exports.dispatcher(require('config'));