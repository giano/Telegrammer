"use strict";

const config = require('./config');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const logger = _.extend({}, console, {
  notify: function () {
    if(config.get("verbose")){
      console.log.apply(console, _.toArray(arguments));
    }
  },
  error: function(error){
    console.error.apply(console, [error.message || error]);
  }
});

module.exports = logger;
