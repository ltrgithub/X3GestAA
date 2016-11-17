"use strict";

var locale = require('streamline-locale');
var fs = require('streamline-fs');
var config = require('config');
var authHelper = require('syracuse-auth/lib/helpers');
var querystring = require('querystring');

exports.changePasswordError = function(_, request, response, user) {
	request.session.changePasswordUser = user;
	var err = new Error(locale.format(module, "explanation"));
	err.$httpStatus = 307;
	err.$httpLocation = "/auth/changePassword/page";
	return err;
};

var genPage = function(_, request, response) {
	var user = request.session.changePasswordUser;
	var adminHelper = require("syracuse-collaboration/lib/helpers").AdminHelper;
	var db = adminHelper.getCollaborationOrm(_);
	var up = db.model.getEntity(_, "userProfile").factory.createInstance(_, null, db);
	up.loadUserProfile(_, user, (request.headers["accept-language"] || "").split(",")[0]);
	var loc = up.selectedLocale(_);
	if (loc) {
		var code = loc.code(_);
		console.log("Set locale for password page " + code);
		if (code) locale.setCurrent(_, code);
	}
	var params = {
		changePasswdHeader: locale.format(module, "changePasswdHeader", user.login(_)),
		newPwd: locale.format(module, "newPwd"),
		password: locale.format(module, "pwdPlaceholder"),
		explanation: locale.format(module, "explanation"),
		chgPasswd: locale.format(module, "chgPasswd"),
		newPwdAgain: locale.format(module, "newPwdAgain"),
		different: locale.format(module, "different"),
		empty: locale.format(module, "notEmpty"),
		invalid: locale.format(module, "invalidChar", "XXX"),
		// when you change "XXX", do this also in newPassword.html
		salt: user.nonce(_),
		login: user.login(_),
		realm: config.session.realm,
		action: "/auth/changePassword/submit",
	};
	authHelper.genPage(_, response, __dirname + "/../html/changePassword.html", params);
	return false;
};

var submit = function(_, request, response) {
	var user = request.session.changePasswordUser;
	if (!user) throw authHelper.error(500, "internal error: no user");
	var json = JSON.parse(request.readAll(_));
	if (user.login(_).toLowerCase() !== json.login.toLowerCase()) throw authHelper.error(400, "internal error: login mismatch");
	user.password(_, json.passwordHash);
	user.changePassword(_, false);
	user._oldPwdSet = true; // when the old password has already been entered, pwd change is possible without old password
	user.save(_, undefined, {
		ignoreRestrictions: true
	}); // allow changes even if normally not authorized for them
	request.session.loginError = "";

	// now user is authenticated
	request.session.authData = {
		user: user.login(_),
		authorization: "Basic " + json.passwordHash,
	};
	authHelper.redirect(_, request, response, request.session.authTargetUrl || '/', true);

	return false;
};

exports.dispatch = authHelper.dispatcher(3, {
	page: genPage,
	submit: submit,
});