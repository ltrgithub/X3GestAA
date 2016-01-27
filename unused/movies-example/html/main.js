"use strict";
var _site = require('syracuse-ui/lib/site/site');
exports.main = function(){
    var site = _site.create();
    site.$isLicenceTool = true;
	delete syra_config.$pageTemplateUrl;
    syra_config.$userProfileUrl = "/action/user-profile";
    site.load();
};

if (require.main == module) 
    exports.main();
