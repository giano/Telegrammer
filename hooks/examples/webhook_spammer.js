"use strict";

const Promise = require('promise');

module.exports = {
  route: function (params, service, req, res) {
    let promise = new Promise(function (resolve, reject) {
      if (params.what || params.w) {
        return service.send(params.what || api.w).then(resolve).catch(reject);
      } else {
        return reject(new Error("Hey, why so silent?"));
      }
    });
    return promise;
  },
  response: "Ok, sent.",
  params: [{
    name: 'what',
    alias: 'w',
    type: String
  }],
  description: "Example of web hook. Just send passed string to chat."
};
