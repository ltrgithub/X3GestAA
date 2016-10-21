"use strict";
require('npm-shadow')();
require('streamline').register();
require('coffee-script').register();
var config =  require('./nodelocal').config;
require('@sage/syracuse-core/streamline-loader')(config.streamline);
/*require('syracuse-license').register(function(err, data) {
    if (err) {
        console.error("LICENSE ERROR", err.stack); 
        process.exit(1);
    }
    //
    //if (options.etna) require('etna/lib/engine/register');

    var globals = require('streamline-runtime').globals;
    if (options.tenantId != null) globals.context.tenantId = options.tenantId;
    require('./qunitWrapper');
    */
require('test-runner/lib/server/init-apis');
