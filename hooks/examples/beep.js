"use strict";

/**
 * @alias beep
 * @member {Object} beep
 * @description Local hook example with regex capture
 * @memberOf hooks/examples
 */

const Promise = require('promise');

module.exports = {
  match: /beep(?:\s+(\d+)\s+times)*/i,
  action: function (message, service, matches) {
    return new Promise(function (resolve, reject) {
      let times = (matches[1] || 1) * 1;
      for (let i = 0; i < times; i++) {
        console.log('\u0007');
      }
      resolve();
    });
  },
  description: "Example of regex matching hook. This hook will simply beep on the server/device",
  error: "Something wrong happened: @error@",
  response: "What was that? Did you hear it?"
};
