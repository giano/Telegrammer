"use strict";

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
  description: "Example of GPIO signalink. Would blink a LED connected to 14 GPIO pin three times",
  error: "Something wrong happened: @error@",
  response: "What was that? Did you saw it?"
};
