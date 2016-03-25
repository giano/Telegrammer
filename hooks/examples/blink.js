"use strict";

/**
 * @alias blink
 * @member {Object} blink
 * @description Local hook example with GPIO signaling. Would blink a LED connected to 14 GPIO pin three times
 * @memberOf hooks/examples
 */

const Promise = require('promise');

module.exports = {
  command: "blink",
  signal: [{
    gpio: 14,
    value: 1,
    time: 3000
  }, {
    gpio: 14,
    value: 0,
    time: 3000
  }, {
    gpio: 14,
    value: 1,
    time: 3000
  }, {
    gpio: 14,
    value: 0,
    time: 3000
  }, {
    gpio: 14,
    value: 1,
    time: 3000
  }, {
    gpio: 14,
    value: 0,
    time: 3000
  }],
  description: "Example of GPIO signaling. Would blink a LED connected to 14 GPIO pin three time, with a duration of 3 seconds for every blinks",
  error: "Something wrong happened: @error@",
  response: "What was that? Did you saw it?"
};
