"use strict";

var config = require('../../nodelocal.js').config;
config.streamline.fast = false;
require('streamline').register(config.streamline);

require('./lib/main');