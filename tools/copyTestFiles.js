"use strict";

var cp = require('glob-cp');
var path = require('path');
 
// async 
var src = path.join(__dirname, '../node_modules/:module/test');
var dest = '/syracuse/node_modules/:module/test';
var options = {recursive: true, force: true};
cp(src, dest, options, function(err) {
    if (err) console.error(err);
});
