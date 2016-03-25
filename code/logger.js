"use strict";

/**
 * Logger
 * @namespace Logger
 * @description Manages logging. Extends console
 */

const config = require('./config');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

/**
 * @class
 * @classdesc Manages logging. Extends console
 * @extends console
 */

const Logger = _.extend({}, console, {
  /**
   * @function notify
   * @description Logger will only write those messages if verbose is on
   * @static
   * @memberof Logger
   * @public
   */
  notify: function () {
    if (config.get("verbose")) {
      console.log.apply(console, _.toArray(arguments));
    }
  },
  /**
   * @function notify
   * @description Error logging override
   * @static
   * @memberof Logger
   * @param {Error} error Exception to be traced
   * @public
   */
  error: function (error) {
    console.error.apply(console, [error.message || error]);
  }
});

module.exports = Logger;
