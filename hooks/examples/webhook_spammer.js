"use strict";

/**
 * @alias webhook_spammer
 * @member {Object} webhook_spammer
 * @description Example of web hook. Just send passed string to chat
 * @memberOf hooks/examples
 */

const Promise = require('promise');

module.exports = {
  route: function (params, service, req, res) {
    return new Promise(function (resolve, reject) {
      if (params.what || params.w) {
        return service.send(params.what || api.w).then(resolve).catch(reject);
      } else {
        return reject(new Error("Hey, why so silent?"));
      }
    });
  },
  response: "Ok, sent.",
  params: [{
    name: 'what',
    alias: 'w',
    type: String
  }],
  description: "Example of web hook. Just send passed string to chat."
};
