"use strict";
var Site = require('syracuse-ui/lib/site/site').Site;
exports.main = function(){
    var site = new Site();
    site.$isLicenceTool = true;
    site.$userProfileUrl = "/action/user-profile";
    site.load();
};

if (require.main == module) 
    exports.main();
