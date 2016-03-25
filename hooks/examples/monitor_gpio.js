"use strict";

/**
 * @alias monitor_gpio
 * @member {Object} monitor_gpio
 * @description A GPIO monitoring hook definition example. Would react to a button connected to GPIO pin 4.
 * @memberOf hooks/examples
 */

const Promise = require('promise');
const os = require("os");

module.exports = {
  gpio: {
    pin: 4,
    handler: function (err, value, hook, api) {
      return new Promise(function (resolve, reject) {
        if (err) {
          return reject(err);
        }
        if (value == 1) {
          resolve("Button has been pressed. Ouch!");
        } else {
          resolve("Button has been depressed. What a relief!");
        }
      });
    }
  },
  description: "Example of GPIO monitoring hook. Would react to a button connected to GPIO pin 4."
};
