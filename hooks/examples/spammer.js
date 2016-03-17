"use strict";

const Promise = require('promise');

module.exports = {
  exec: function (params, service) {
    if (params.what) {
      return service.send(params.what);
    } else {
      return Promise.reject(new Error("Hey, why so silent?"));
    }
  },
  commandline: [{
    name: 'what',
    alias: 'w',
    type: String
  }],
  description: "Just send received string"
};
