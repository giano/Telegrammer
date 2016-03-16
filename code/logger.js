"use strict";

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const logger = _.extend({}, console, {
  verbose: function () {
    console.log.apply(console, _.toArray(arguments));
  }
});

module.exports = logger;
