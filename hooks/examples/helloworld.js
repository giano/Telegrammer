"use strict";

const Promise = require('promise');

module.exports = {
  match: "hello",
  action: function (message, service, matches) {
    return Promise.resolve("...world");
  },
  description: "Can't miss in any dev project",
  error: "Oh, darn..."
};
