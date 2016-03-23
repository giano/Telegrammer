"use strict";

const Promise = require('promise');
const os = require("os");

module.exports = {
  command: "systat",
  action: function (message, service, matches) {
    let promise = new Promise(function (resolve, reject) {
      let cpus = os.cpus();
      let out = "";
      let total = 0;
      let used = 0;
      for (var i = 0, len = cpus.length; i < len; i++) {
        var cpu = cpus[i]
        for (let type in cpu.times) {
          total += cpu.times[type];
        }
        used += cpu.times["user"] + cpu.times["nice"] + cpu.times["sys"];
      }
      out += "CPUs (" + cpus.length + "): " + Math.round(100 * used / total) + "%\n";
      resolve(out);
    });
    return promise;
  },
  description: "Example of command line hook linked to non regex command \"\/systat\"."
};
