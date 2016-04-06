"use strict";

/**
 * @alias monitor_cpu
 * @member {Object} monitor_cpu
 * @description A monitoring hook definition example
 * @memberOf hooks/examples
 */

const config = require('../../code/config');

const Promise = require('promise');
const os = require("os");

module.exports = {
  interval: 30000,
  check: function (hook, api) {
    return new Promise(function (resolve, reject) {
      let cpus = os.cpus();
      let out = "";
      let total = 0;
      let used = 0;
      for (var i = 0, len = cpus.length; i < len; i++) {
        var cpu = cpus[i]
        for (let type in cpu.times) {
          total += cpu.times[type];
        }
        used += cpu.times["user"] + cpu.times["nice"] + cpu.times["sys"]
      }
      let total_percent = Math.round(100 * used / total);
      if (total_percent >= (config.get("hooks:config:monitor_cpu:percent_limit") || 60) * 1) {
        resolve(`Watch out: cpu is at ${total_percent}%`);
      } else {
        resolve(null);
      }
      used = total = out = cpu = null;
    });
  },
  description: "Example of monitoring hook. Read config too."
};
