"use strict";

/**
 * @alias helloworld
 * @member {Object} helloworld
 * @description Can't miss in any dev project
 * @memberOf hooks/examples
 */

const Promise = require('promise');

module.exports = {
  match: "hello",
  action: function (message, service, matches) {
    return Promise.resolve("...world");
  },
  description: "Can't miss in any dev project",
  error: "Oh, darn..."
};
